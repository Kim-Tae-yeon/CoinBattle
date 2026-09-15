import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import '../src/game.js';
const G = globalThis.CloudGame;
const values = b => b.filter(Boolean).sort((a,b) => a-b);
function seeded(seed=123) { return () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }; }
function room(seed=123,config={}) {
  const r=new G.Room('TEST',{fillBots:false,...config},{rng:seeded(seed)});
  for(let i=0;i<4;i++)r.addHuman('p'+i,'player'+i,0);
  r.start('p0',0);return r;
}
function toRound(r,n) { while(r.round<n){r.beginChoice(r.phaseEndsAt);r.resolve(r.phaseEndsAt);r.advance(r.phaseEndsAt);}r.beginChoice(r.phaseEndsAt);return r; }
const pick=(r,id,cell,lock=true)=>r.select(id,cell,r.round,r.matchId,lock,r.phaseStartedAt+1);

test('default match and invalid settings use 10 rounds',()=>{
 assert.equal(G.DEFAULTS.rounds,10);assert.equal(G.clampConfig({rounds:99}).rounds,10);
 for(const rounds of [3,5,8,10])assert.equal(G.clampConfig({rounds}).rounds,rounds);
});
test('R1/R2 are low; R3 onward always includes 5 and 6, never 7 or 8',()=>{
 for(let seed=0;seed<100;seed++){const rng=seeded(seed);for(let round=1;round<=10;round++){
  const b=G.makeBoard(rng,round);assert.deepEqual(values(b),round<3?[1,1,2,2,4]:[1,2,3,5,6]);
  for(const cell of G.HOMES)assert.equal(b[cell],0);
 }}
});
test('every reward position can hold the maximum including all edges',()=>{
 for(const cell of G.REWARD_CELLS){const b=G.makeBoard(seeded(),3,cell);assert.equal(b[cell],6);if(cell!==4)assert.ok(b[cell]>b[4]);}
});
test('each complete high-reward bag visits all five cells without replacement',()=>{
 for(let seed=0;seed<100;seed++){
  const r=room(seed),positions=[];
  for(let n=1;n<=10;n++){toRound(r,n);if(n>=3)positions.push(r.board.indexOf(6));}
  assert.deepEqual([...positions.slice(0,5)].sort((a,b)=>a-b),G.REWARD_CELLS);
  assert.equal(new Set(positions.slice(5)).size,3);
 }
});
test('new reward bag is room-private and does not appear in snapshots',()=>{
 const r=toRound(room(),3),s=r.snapshot('p0');assert.ok(r.jackpotBag.length);
 assert.equal('jackpotBag' in s,false);assert.equal(JSON.stringify(s).includes('jackpotBag'),false);
});
test('provisional and confirmed destinations stay secret for opponents',()=>{
 const r=toRound(room(),3);pick(r,'p0',6,false);
 assert.equal(r.snapshot('p0').players[0].selected,6);assert.equal(r.snapshot('p1').players[0].selected,null);
 pick(r,'p0',6);assert.equal(r.snapshot('p1').players[0].selected,null);assert.deepEqual(r.snapshot('p1').results,[]);
});
test('unique 6-coin landing awards exactly 6',()=>{
 const r=toRound(room(),3);r.board=G.makeBoard(seeded(),3,6);
 pick(r,'p0',6);pick(r,'p1',0);pick(r,'p2',2);pick(r,'p3',8);
 assert.equal(r.phase,'reveal');assert.equal(r.results.find(x=>x.id==='p0').gain,6);assert.equal(r.player('p0').score,6);
});
test('unique 5-coin landing awards exactly 5',()=>{
 const r=toRound(room(),3);r.board=[6,0,3,0,2,0,5,0,1];
 pick(r,'p0',6);pick(r,'p1',0);pick(r,'p2',2);pick(r,'p3',8);
 assert.equal(r.results.find(x=>x.id==='p0').gain,5);
});
test('collision at 6 pays zero and preserves previous accumulated coins',()=>{
 const r=toRound(room(),3);r.board=G.makeBoard(seeded(),3,6);r.player('p0').score=7;r.player('p1').score=9;
 pick(r,'p0',6);pick(r,'p1',6);pick(r,'p2',2);pick(r,'p3',8);
 assert.equal(r.player('p0').score,7);assert.equal(r.player('p1').score,9);
 assert.ok(r.results.slice(0,2).every(x=>x.collision&&x.gain===0));
});
test('timeout uses the last provisional selection and missing input earns zero',()=>{
 const r=toRound(room(),3);pick(r,'p0',6,false);r.advance(r.phaseEndsAt);
 assert.equal(r.results[0].gain,r.board[6]);assert.ok(r.results.slice(1).every(x=>x.missed&&x.gain===0));
});
test('stale and illegal requests cannot alter an early high-reward round',()=>{
 const r=toRound(room(),3);assert.throws(()=>r.select('p0',6,2,r.matchId,true,r.phaseStartedAt+1),/이전/);
 assert.throws(()=>pick(r,'p0',0),/구름/);assert.throws(()=>pick(r,'p0',6.1),/구름/);
});
test('resolving twice cannot duplicate the 6-coin award',()=>{
 const r=toRound(room(),3);r.board=G.makeBoard(seeded(),3,6);pick(r,'p0',6);r.resolve(r.phaseStartedAt+2);
 r.resolve(r.phaseStartedAt+3);assert.equal(r.player('p0').score,6);assert.equal(r.history.filter(h=>h.round===3).length,1);
});
test('reconnect and snapshot reads preserve the current board and remaining bag',()=>{
 const r=toRound(room(),3),b=r.board.slice(),bag=r.jackpotBag.slice();r.setConnected('p0',false);r.setConnected('p0',true);
 r.snapshot('p0');assert.deepEqual(r.board,b);assert.deepEqual(r.jackpotBag,bag);
});
test('a replay starts at low rewards, resets points, and starts a fresh bag',()=>{
 const r=toRound(room(),10);r.resolve(r.phaseEndsAt);r.advance(r.phaseEndsAt);assert.equal(r.phase,'finished');
 const id=r.matchId;r.start('p0',r.phaseStartedAt+1);assert.equal(r.matchId,id+1);assert.equal(r.round,1);
 assert.deepEqual(values(r.board),[1,1,2,2,4]);assert.equal(r.jackpotBag.length,4);assert.ok(r.players.every(p=>p.score===0));
});
test('return to lobby clears future rewards; changing match length still works',()=>{
 const r=toRound(room(),10);r.resolve(r.phaseEndsAt);r.advance(r.phaseEndsAt);r.returnToLobby('p0');
 assert.deepEqual(r.jackpotBag,[]);r.configure('p0',{rounds:3});r.start('p0');toRound(r,3);
 assert.deepEqual(values(r.board),[1,2,3,5,6]);r.resolve(r.phaseEndsAt);r.advance(r.phaseEndsAt);assert.equal(r.phase,'finished');
});
test('offline and server rule copies produce identical seeded boards',async()=>{
 const code=await readFile(new URL('../src/game.js',import.meta.url),'utf8'),sandbox={};vm.runInNewContext(code,sandbox);
 for(let n=1;n<=10;n++)assert.deepEqual(JSON.parse(JSON.stringify(sandbox.CloudGame.makeBoard(seeded(7),n))),G.makeBoard(seeded(7),n));
});
test('gameplay timing has no added phases or forced wait after everyone locks',()=>{
 const r=room();assert.equal(r.timings.countdown,3000);assert.equal(r.timings.between,3000);assert.equal(r.timings.reveal,7000);
 r.beginChoice(r.phaseEndsAt);for(let i=0;i<4;i++)pick(r,'p'+i,4);assert.equal(r.phase,'reveal');
});
test('built HTML contains numeric reward rendering and removes fixed-centre guidance',async()=>{
 const s=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 assert.ok(s.includes('HIGH_REWARD_START = 3'));assert.ok(s.includes('ctx.fillText(String(count)'));
 assert.ok(!s.includes('가운데 3코인 구름은'));assert.ok(!s.includes('5라운드 · 선택 10초'));
});
