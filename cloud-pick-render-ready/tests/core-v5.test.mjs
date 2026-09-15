import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import '../src/game.js';
const G=globalThis.CloudGame;
const seeded=seed=>()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
function room(seed=1){const r=new G.Room('TEST',{}, {rng:seeded(seed)});for(let i=0;i<4;i++)r.addHuman('p'+i,'Player'+i,0);r.start('p0',0);return r;}
test('v5 defaults: ten rounds, ten-second choices',()=>{assert.equal(G.VERSION,'5.2.0');assert.deepEqual(G.DEFAULTS,{rounds:10,seconds:10,fillBots:true});});
test('10,000 seeds: reward curve, jackpot rotation, legal cells and hidden schedule',()=>{
 let earlyFive=false,earlySix=false,centerLower=false;
 for(let seed=0;seed<10000;seed++){
  const boards=G.makeMatchBoards(seeded(seed));assert.equal(boards.length,10);
  const max=boards.map(b=>Math.max(...b));
  assert.deepEqual(max.slice(0,2),[4,4]);assert.deepEqual(max.slice(2,5).sort(),[4,5,6]);assert.deepEqual(max.slice(5).sort(),[5,5,6,6,6]);
  earlyFive ||= max[2]===5;earlySix ||= max[2]===6;
  for(const half of [boards.slice(0,5),boards.slice(5)])assert.deepEqual(half.map(b=>b.indexOf(Math.max(...b))).sort((a,b)=>a-b),[0,2,4,6,8]);
  for(const b of boards){assert.ok([1,3,5,7].every(c=>b[c]===0));const m=Math.max(...b);assert.deepEqual(G.REWARD_CELLS.map(c=>b[c]).sort((a,b)=>a-b),G.REWARD_SETS[m===4?'low':m===5?'mid':'high']);centerLower ||= b[4]<m;}
 }
 assert.ok(earlyFive&&earlySix&&centerLower);
});
test('only public board and past outcomes are serialized',()=>{const r=room(),s=r.snapshot('p0',0);assert.ok(!('matchBoards'in s));assert.equal(s.history.length,0);assert.ok(!JSON.stringify(s).includes('jackpotOrder'));});
test('preparation skips only once all humans are ready, or after 20 seconds',()=>{
 const r=room();assert.equal(r.phase,'prepare');r.ready('p0',r.matchId,100);r.ready('p1',r.matchId,101);r.ready('p2',r.matchId,102);assert.equal(r.phase,'prepare');r.ready('p3',r.matchId,103);assert.equal(r.phase,'countdown');assert.equal(r.phaseEndsAt,3103);
 const timeout=room();timeout.advance(20000);assert.equal(timeout.phase,'countdown');assert.equal(timeout.round,1);
});
test('ten rounds: secrecy, collision, score conservation, legal high rewards',()=>{
 const r=room();let t=20000;r.advance(t);
 for(let n=1;n<=10;n++){
  t=r.phaseEndsAt;r.advance(t);assert.equal(r.phase,'choose');
  const actions=n===1?[4,4,4,4]:[6,0,2,8];
  r.select('p0',actions[0],n,r.matchId,false,t+1);
  assert.equal(r.snapshot('p1',t+1).players[0].selected,null);
  for(let i=0;i<4;i++)r.select('p'+i,actions[i],n,r.matchId,true,t+2+i);
  assert.equal(r.phase,'reveal');
  for(const result of r.results)assert.equal(result.gain,n===1?0:r.board[result.cell]);
  t=r.phaseEndsAt;r.advance(t);
 }
 assert.equal(r.phase,'finished');assert.equal(r.history.length,10);
 for(const p of r.players)assert.equal(p.score,r.history.reduce((sum,h)=>sum+h.results.find(x=>x.id===p.id).gain,0));
});
test('last selection applies at deadline; no choice pays zero; previous coins survive collisions',()=>{
 const r=room();r.advance(20000);r.advance(23000);r.players[0].score=7;r.select('p0',6,1,r.matchId,false,23001);r.select('p1',6,1,r.matchId,true,23002);r.advance(33000);
 assert.equal(r.player('p0').score,7);assert.ok(r.results[0].collision);assert.ok(r.results[2].missed);assert.equal(r.results[2].gain,0);
 assert.throws(()=>r.select('p0',8,1,r.matchId,true,33001));
});
test('full-duration game reaches results in 228 seconds; future match resets everything',()=>{
 const r=room();let now=0;while(r.phase!=='finished'){now=r.phaseEndsAt;r.advance(now);}assert.equal(now,228000);assert.equal(now+15000,243000);
 const previous=r.matchBoards;r.start('p0',now);assert.equal(r.phase,'prepare');assert.equal(r.history.length,0);assert.ok(r.players.every(p=>p.score===0));assert.notStrictEqual(r.matchBoards,previous);
});
test('UI strips decorative slogans and renders actual coin numbers',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 for(const forbidden of ['수상한 선택','A QUIET BETRAYAL','WICKER HOLLOW','THE WOODS ARE','오늘 밤의','어느 밤으로','나의 주머니','WAITING FOR FOOTSTEPS','가운데 3코인 구름'])assert.ok(!html.includes(forbidden),forbidden);
 assert.ok(html.includes('ctx.fillText(String(count)'));assert.ok(html.includes('구름 선택'));assert.ok(html.includes('10라운드'));
});
