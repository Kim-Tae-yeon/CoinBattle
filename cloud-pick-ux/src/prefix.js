(() => {
  'use strict';
  const G = window.CloudGame;
  const $ = id => document.getElementById(id);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const storage = {
    get(key, session = false) { try { return (session ? sessionStorage : localStorage).getItem(key); } catch { return null; } },
    set(key, value, session = false) { try { (session ? sessionStorage : localStorage).setItem(key, value); } catch {} },
    remove(key, session = false) { try { (session ? sessionStorage : localStorage).removeItem(key); } catch {} },
  };
  const icons = {
    sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>',
    muted: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6m0-6-5 6"/></svg>',
    plus: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 4v12M4 10h12"/></svg>',
    link: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m8 12 4-4M6 10l-2 2a3 3 0 0 0 4 4l3-3m-2-6 3-3a3 3 0 0 1 4 4l-2 2"/></svg>',
    copy: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="7" y="7" width="9" height="10" rx="2"/><path d="M12 7V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    edit: '<svg class="edit-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m12 4 4 4-8 8H4v-4zM11 5l4 4"/></svg>',
  };
  const coin = '<span class="mini-coin" aria-hidden="true"></span>';
  let name = storage.get('cloud-pick:name') || '';
  let config = { ...G.DEFAULTS };
  let mode = 'home', state = null, localRoom = null, stream = null, session = null;
  let serverAvailable = false, backendChecked = false, connection = 'home';
  let clockOffset = 0, optimisticCell = null, actionQueue = Promise.resolve(), busy = false;
  let lastFramePhase = '', toastTimer = 0, audio = null, muted = storage.get('cloud-pick:muted') === '1';
  let reducedMotion = storage.get('cloud-pick:motion') !== null ? storage.get('cloud-pick:motion') === 'reduced' : matchMedia('(prefers-reduced-motion: reduce)').matches;
  let view = { width: 1000, height: 680, cells: [] }, hoverCell = null;
  const canvas = $('gameCanvas'), ctx = canvas.getContext('2d');
  let lastBeep = 0, soundRound = '', particles = [];
  const demo = new G.Room('DEMO');
  demo.addHuman('demo-you', '나');
  while (demo.players.length < 4) demo.addBot('demo-you');
  const demoState = demo.snapshot('demo-you'); demoState.phase = 'home';
  state = demoState;

  // Original, reusable vector puppets. Same paths paint the board and SVG portraits.
  const NIGHT = { paper: '#edddbb', gold: '#ddb16b', rust: '#c17a55', ink: '#161d2c', leaf: '#a5654c' };
  const NIGHT_TIMING = Object.freeze({ anticipation: .34, jump: .66, land: 1.0 });
  const animalCache = new Map();
  const ovalPath = (x,y,rx,ry) => `M${x-rx},${y}a${rx},${ry} 0 1,0 ${rx*2},0a${rx},${ry} 0 1,0 ${-rx*2},0`;
  function animalLayers(slot, expression='idle', blink=false) {
    const key = `${slot}:${expression}:${blink}`;
    if (animalCache.has(key)) return animalCache.get(key);
    const fur = ['#547589','#b7a98d','#847683','#b79268'][slot];
    const shade = ['#3f5b74','#897a73','#645a73','#8e6a59'][slot];
    const shirt = ['#ae6151','#45666c','#97724f','#74806b'][slot];
    const a = [], add = (d,fill,stroke='',width=1) => a.push({d,fill,stroke,width,path:new Path2D(d)});
    const happy=expression==='happy', sad=expression==='sad';
    // Skinny legs, heavy little boots, and angular coats replace round mascot bodies.
    if(slot===0) add('M15-24Q53-13 50-47L46-65 34-62Q48-31 19-34Z',shade);
    if(slot===1) add('M15-27Q71-3 48-48Q43-56 40-49Q54-16 19-36Z','#af7c6d');
    if(slot===2) add('M-13-32L-18-4 0-12 17-3 15-31Z',shade);
    if(slot===3) {add('M18-23Q58-13 47-48L35-59 28-54Q45-28 17-33Z',shade);add('M34-47L44-50 49-40 39-35Z','#323443');}
    add('M-16-25L-12-3-6-3-5-24Z',NIGHT.ink);add('M5-24L8-3 14-3 17-27Z',NIGHT.ink);
    add('M-14-5L-4-5-3 1-21 1-21-2Z','#252537');add('M8-5L15-5 23-1 23 2 7 2Z','#252537');
    add('M-18-76L19-74 25-20 12-14-23-19Z',shirt);
    add('M3-72L4-17 17-16 25-20 20-73Z','#1b223225');
    add(happy?'M-16-65L-31-83-37-77-24-45-15-51Z':'M-16-69L-32-41-31-25-24-24-21-40-10-55Z',shirt);
    add(happy?'M18-65L30-84 38-78 27-46 14-50Z':'M17-67L32-46 33-27 26-25 23-42 11-52Z',shirt);
    add(happy?'M-38-83L-33-88-27-82-33-74Z':'M-32-29L-24-29-23-21-31-19Z',fur);
    add(happy?'M28-82L33-89 39-84 38-76Z':'M26-30L33-30 35-22 29-20Z',fur);
    if(slot===0){
      add('M-40-96L-37-142-17-127Q1-136 19-126L39-143 39-92 27-72-8-70-37-80Z',fur);
      add('M-33-132L-30-112-19-124Z','#30465f');add('M31-132L21-122 32-112Z','#30465f');
      add('M8-128L21-123 36-128 39-92 27-72 6-72 12-97Z',shade);
      add('M-31-84L-16-88-2-81 18-88 31-85 22-70-11-69Z','#73888d');
      add('M-14-60L4-61 12-54 0-49Z','#e0b17b');add('M-3-59L3-56-2-52-7-54Z',shirt);
      add('M-17-23L18-21 19-16-22-18Z','#744951');
    }else if(slot===1){
      add(ovalPath(-36,-114,14,16),shade);add(ovalPath(35,-116,14,16),shade);
      add(ovalPath(-37,-115,8,10),'#b47977');add(ovalPath(36,-117,8,10),'#b47977');
      add('M-39-111Q-33-131-10-130L25-125 39-108 28-86 5-69-23-78-42-97Z',fur);
      add('M7-127L31-121 39-108 28-86 5-69-2-78 15-101Z','#a08e81');
      add('M-30-91L-2-91 23-95 9-71-10-72Z','#d3c1a0');
      add('M-24-76L23-76 22-66-20-63Z','#af7254');add('M7-70L19-70 16-39 7-43Z','#c18a59');
      add('M-11-49L-7-38 5-37 9-45 4-48-3-42Z','#d8c59b');
    }else if(slot===2){
      add('M-40-96L-40-132-19-125Q0-132 17-125L42-133 39-94 23-73-19-73Z',fur);
      add('M-36-115Q-22-126-4-111L-1-86-22-83-38-99Z','#c1b399');
      add('M2-111Q23-127 37-114L38-98 23-83 2-86Z','#a99f95');
      add('M-12-78L-1-68 10-79 12-59-12-59Z','#bba591');
      add('M-4-58L2-58 3-22-3-23Z','#594756');
      add('M-15-37L-8-38-8-30-16-29Z','#b89666');
    }else{
      add(ovalPath(-33,-120,13,13),fur);add(ovalPath(33,-121,13,13),fur);
      add(ovalPath(-34,-121,7,7),'#5e4b53');add(ovalPath(34,-122,7,7),'#5e4b53');
      add('M-40-107Q-42-128-16-130L24-125Q45-123 39-99L29-77 2-71-24-76-39-93Z',fur);
      add('M-20-126L-5-130 10-125 25-75 5-70-6-74Z','#d4c0a0');
      add('M-39-115L-25-122-11-76-25-78-38-94Z','#303442');
      add('M17-128L30-123 38-110 37-92 26-77 15-79 20-100Z','#333646');
      add('M-16-69L14-69 17-58-13-60Z','#566666');
      add('M-11-47L-8-52 0-46-2-37-8-36Z','#d5b17b');
      add('M-18-29L18-29 19-26-20-26Z','#a3aa8d');
    }
    const eyeY=slot===1?-102:slot===2?-103:-101, eyeColor=slot===2?'#dcac60':'#e5c995';
    if(sad){
      [-18,18].forEach(x=>add(`M${x-6} ${eyeY+1}L${x+5} ${eyeY-2}M${x-2} ${eyeY}L${x+4} ${eyeY+4}`,'none',eyeColor,2.6));
    }else if(happy||blink){
      [-18,18].forEach(x=>add(happy?`M${x-7} ${eyeY+1}Q${x} ${eyeY-5} ${x+7} ${eyeY+1}`:`M${x-7} ${eyeY}L${x+7} ${eyeY}`,'none',eyeColor,2.5));
    }else{
      [-18,18].forEach((x,i)=>{
        add(ovalPath(x,eyeY,9.6,8.1),eyeColor);
        add(ovalPath(x+(i===0?2:-1),eyeY+.7,2.7,5.2),NIGHT.ink);
        add(i===0?`M${x-11} ${eyeY-10}L${x+11} ${eyeY-5} ${x+11} ${eyeY-10}Z`:`M${x-11} ${eyeY-5}L${x+11} ${eyeY-10} ${x-11} ${eyeY-11}Z`,slot===2?(i?'#a99f95':'#c1b399'):slot===3?'#333646':fur);
      });
    }
    if(slot===2) add('M-5-94L6-94 0-82Z','#d8a467');
    else add('M-5-87L5-87 0-83Z',slot===1?'#aa796b':NIGHT.ink);
    if(slot!==2) add(happy?'M-7-77Q0-69 7-77':sad?'M-7-74Q0-79 7-75':'M-5-76L6-76','none',NIGHT.ink,1.7);
    if(expression==='sad') add('M39-107Q47-94 40-93Q34-94 39-107Z','#7292a3');
    animalCache.set(key,a);return a;
  }
  function avatar(slot, extra='') {
    const paths=animalLayers(slot).map(p=>`<path d="${p.d}" fill="${p.fill}"${p.stroke?` stroke="${p.stroke}" stroke-width="${p.width}" stroke-linecap="round"`:''}/>`).join('');
    return `<span class="mini-avatar ${extra}" style="background:${['#35374a','#383241','#383446','#39313c'][slot]}"><svg viewBox="-54 -145 108 147" aria-hidden="true">${paths}</svg></span>`;
  }

  function me() { return state.players.find(p => p.id === state.yourId) || state.players[0]; }
  function revealVisible() { return state.phase !== 'reveal' || reducedMotion || now() - state.phaseStartedAt >= NIGHT_TIMING.land * 1000; }
  function currentCell() { return optimisticCell !== null ? optimisticCell : me()?.selected ?? null; }
  function options() { return G.TARGETS[me()?.slot ?? 0]; }
  function now() { return pausedAt || (Date.now() + clockOffset); }
  function toast(message) {
    $('toast').textContent = message; $('toast').classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3300);
  }
  function unlockAudio() {
    if (muted) return;
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); } catch {}
  }
  function tone(freq, delay = 0, duration = .1, volume = .045, type = 'sine') {
    if (muted || !audio) return;
    const osc = audio.createOscillator(), gain = audio.createGain(), start = audio.currentTime + delay;
    osc.type = type; osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(volume, start + .007); gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    osc.connect(gain); gain.connect(audio.destination); osc.start(start); osc.stop(start + duration + .02);
  }
  function sound(type) {
    if (type === 'select') { tone(392,0,.065,.023,'triangle'); tone(196,.015,.065,.012); }
    if (type === 'lock') { tone(147,0,.11,.038,'triangle'); tone(294,.07,.09,.016,'sine'); }
    if (type === 'start') [196,233.08,293.66].forEach((n,i)=>tone(n,i*.14,.23,.023,'triangle'));
    if (type === 'coin') [659.25,783.99,987.77].forEach((n,i)=>tone(n,i*.095,.28,.023));
    if (type === 'collision') {tone(130.81,0,.16,.045,'triangle');tone(98,.13,.27,.038,'triangle');tone(65.4,.05,.22,.025);}
    if (type === 'win') [329.63,392,493.88,659.25].forEach((n,i)=>tone(n,i*.20,.38,.033));
  }
  function updateMotionButton() {
    document.body.classList.toggle('reduce-motion', reducedMotion);
    const b=$('motionButton');if(b){b.setAttribute('aria-pressed',String(reducedMotion));b.innerHTML=`움직임 줄이기 <span>${reducedMotion?'켜짐':'꺼짐'}</span>`;}
  }
  function updateSoundButton() { const b=$('soundButton');if(b){b.setAttribute('aria-pressed',String(!muted));b.innerHTML=`효과음 <span>${muted?'꺼짐':'켜짐'}</span>`;} }

