import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/game.js';
const G=globalThis.CloudGame;
const seedRng = seed => () => ((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function game(humans=4, config={}) {
  const r=new G.Room('LATEST',config,{rng:seedRng(123)});
  for(let i=0;i<humans;i++)r.addHuman('p'+i,'P'+i,0);
  r.start('p0',0);return r;
}
function finish(r){while(r.phase!=='finished')r.advance(r.phaseEndsAt);return r;}
function extension(){const r=finish(game());const now=r.phaseStartedAt;for(let i=0;i<4;i++)r.voteRematch('p'+i,'bait',r.matchId,now+1+i);return r;}
function until(r,phase,round){let guard=0;while(!(r.phase===phase&&r.round===round)){if(++guard>100)throw Error('unreachable '+phase+round);r.advance(r.phaseEndsAt);}return r;}

test('all four exact slots and identities survive the unanimous expansion vote',()=>{
 const r=finish(game()), before=r.players.map(p=>[p.id,p.slot]), id=r.matchId,t=r.phaseStartedAt;
 for(let i=0;i<3;i++)r.voteRematch('p'+i,'bait',id,t+1+i);
 assert.equal(r.phase,'finished');assert.equal(r.expansion,'none');
 r.voteRematch('p3','bait',id,t+4);
 assert.equal(r.phase,'prepare');assert.equal(r.expansion,'bait');assert.equal(r.matchId,id+1);
 assert.equal(r.tableMatch,2);assert.deepEqual(r.players.map(p=>[p.id,p.slot]),before);
 assert.ok(r.players.every(p=>p.score===0&&!p.baitUsed));assert.deepEqual(r.history,[]);
});
test('one basic vote vetoes expansion without cancelling the basic replay',()=>{
 const r=finish(game()),id=r.matchId,t=r.phaseStartedAt;
 for(let i=0;i<4;i++)r.voteRematch('p'+i,i===2?'base':'bait',id,t+i+1);
 assert.equal(r.phase,'prepare');assert.equal(r.expansion,'none');assert.equal(r.tableMatch,2);
});
test('non-response, explicit decline and leaving never force a replay',()=>{
 for(const cause of ['timeout','decline','leave']){
  const r=finish(game()),id=r.matchId,t=r.phaseStartedAt;
  r.voteRematch('p0','bait',id,t+1);
  if(cause==='timeout')r.advance(r.rematch.endsAt);
  if(cause==='decline')r.voteRematch('p1','decline',id,t+2);
  if(cause==='leave')r.leave('p1',t+2);
  assert.equal(r.phase,'finished');assert.equal(r.rematch.status,'cancelled');assert.equal(r.matchId,id);
 }
});
test('disconnected voter must reconnect before the 12-second deadline',()=>{
 const r=finish(game()),id=r.matchId,t=r.phaseStartedAt;
 for(let i=0;i<3;i++)r.voteRematch('p'+i,'bait',id,t+i+1);
 r.setConnected('p1',false,t+5);r.voteRematch('p3','bait',id,t+6);
 assert.equal(r.phase,'finished');r.setConnected('p1',true,t+7);
 assert.equal(r.phase,'prepare');assert.equal(r.expansion,'bait');
});
test('bots and short private games cannot unlock bait; no personal unlock state',()=>{
 for(const r of [finish(game(2)),finish(game(4,{rounds:3}))]){
  assert.equal(r.rematch.allowBait,false);
  assert.throws(()=>r.voteRematch('p0','bait',r.matchId,r.phaseStartedAt+1));
 }
 assert.equal(game().expansion,'none');assert.equal(game().rematch,null);
});
test('second game does not reopen an endless same-table chain',()=>{
 const r=finish(extension());assert.equal(r.tableMatch,2);assert.equal(r.rematch,null);
});
test('bait opens for R6 and R9 only, with 6s input, 2s attribution, and 10s movement',()=>{
 const r=extension(),seen=[];
 while(r.phase!=='finished'){
  if(r.phase==='bait_choose'){seen.push(r.round);assert.equal(r.phaseEndsAt-r.phaseStartedAt,6000);}
  if(r.phase==='bait_reveal')assert.equal(r.phaseEndsAt-r.phaseStartedAt,2000);
  if(r.phase==='choose')assert.equal(r.phaseEndsAt-r.phaseStartedAt,10000);
  r.advance(r.phaseEndsAt);
 }
 assert.deepEqual(seen,[6,9]);
});
test('secret placement stays private; stacked tokens all spend but bonus is capped at one',()=>{
 const r=until(extension(),'bait_choose',6),t=r.phaseStartedAt,id=r.matchId,base=r.board[4];
 r.placeBait('p0',4,6,id,t+1);const rev=r.revision;
 r.placeBait('p0',4,6,id,t+2);assert.equal(r.revision,rev);
 assert.throws(()=>r.placeBait('p0',6,6,id,t+3));
 for(const viewer of ['p1','p2','p3']){
  const s=r.snapshot(viewer,t+3);assert.deepEqual(s.bait.placements,[]);assert.deepEqual(s.bait.cells,[]);
  assert.equal(s.board[4],base);assert.equal('baitUsed' in s.players[0],false);
 }
 r.placeBait('p1',4,6,id,t+4);r.placeBait('p2',null,6,id,t+5);
 r.advance(r.phaseEndsAt);assert.equal(r.board[4],base+1);assert.deepEqual(r.baitCells,[4]);
 assert.equal(r.baitPlacements.length,2);assert.ok(r.players[0].baitUsed&&r.players[1].baitUsed);
 assert.equal(r.snapshot('p2').bait.placements.length,2);
 r.advance(r.phaseEndsAt);assert.deepEqual(r.snapshot('p2').bait.placements,[]);
 const c=r.phaseStartedAt;
 for(let i=0;i<4;i++)r.select('p'+i,[6,0,4,8][i],6,id,true,c+i+1);
 assert.equal(r.results[2].gain,base+1); // not the bait owner
 r.advance(r.phaseEndsAt);assert.deepEqual(r.baitCells,[]);assert.deepEqual(r.baitPlacements,[]);
 assert.deepEqual(r.board,r.matchBoards[6]);
});
test('bait collision still awards zero; automatic movement uses the same rule',()=>{
 const r=until(extension(),'bait_choose',6),t=r.phaseStartedAt;
 r.placeBait('p0',4,6,r.matchId,t+1);r.advance(r.phaseEndsAt);r.advance(r.phaseEndsAt);
 const n=r.phaseStartedAt;
 for(let i=0;i<4;i++)r.select('p'+i,4,6,r.matchId,true,n+i+1);
 assert.ok(r.results.every(p=>p.gain===0&&p.collision));
});
test('all tokens spent at first window skips the second; spent tokens cannot be reused',()=>{
 const r=until(extension(),'bait_choose',6),id=r.matchId,t=r.phaseStartedAt;
 for(let i=0;i<4;i++)r.placeBait('p'+i,4,6,id,t+1+i);
 until(r,'choose',9);assert.deepEqual(r.baitCells,[]);
 assert.throws(()=>r.placeBait('p0',4,9,id,r.phaseStartedAt));
});
test('holding or timing out a bait window does not spend the token',()=>{
 const r=until(extension(),'bait_choose',6);
 r.placeBait('p0',null,6,r.matchId,r.phaseStartedAt+1);r.advance(r.phaseEndsAt);
 assert.deepEqual(r.baitCells,[]);assert.ok(r.players.every(p=>!p.baitUsed));
 until(r,'bait_choose',9);r.placeBait('p0',6,9,r.matchId,r.phaseStartedAt+1);
 r.advance(r.phaseEndsAt);assert.deepEqual(r.baitCells,[6]);until(r,'choose',10);
 assert.equal(r.snapshot('p1').bait.own.remaining,0);
});
test('invalid, late, stale-match and premature movement requests cannot mutate bait',()=>{
 const r=until(extension(),'bait_choose',6),t=r.phaseStartedAt,id=r.matchId;
 assert.throws(()=>r.placeBait('p0',0,6,id,t+1));
 assert.throws(()=>r.placeBait('p0',4,6,id-1,t+1));
 assert.throws(()=>r.placeBait('p0',4,5,id,t+1));
 assert.throws(()=>r.placeBait('p0',4,6,id,r.phaseEndsAt));
 assert.throws(()=>r.select('p0',4,6,id,true,t+1));assert.ok(!r.players[0].baitUsed);
});
test('uniform fallback draws once per missing active seat and never changes a chosen cell',()=>{
 const r=until(game(),'choose',1),t=r.phaseStartedAt;let calls=0;
 r.rng=()=>{calls++;return .9;};r.select('p0',6,1,r.matchId,false,t+1);r.leave('p3',t+2);
 r.advance(r.phaseEndsAt);assert.equal(calls,2);assert.equal(r.results[0].cell,6);
 assert.equal(r.results[1].cell,6);assert.equal(r.results[2].cell,2);
 assert.equal(r.results[3].missed,true);r.resolve(t+30000);assert.equal(calls,2);
 assert.equal(r.snapshot('p0').results[1].automatic,undefined);
});
test('fallback sampling is legal and near-uniform across all seats',()=>{
 const counts=Array.from({length:4},()=>[0,0,0]), rng=seedRng(985);
 for(let n=0;n<6000;n++){
  const r=until(game(),'choose',1);r.rng=rng;
  r.advance(r.phaseEndsAt);
  for(let s=0;s<4;s++)counts[s][G.TARGETS[s].indexOf(r.results[s].cell)]++;
 }
 for(const row of counts)for(const n of row)assert.ok(n>1750&&n<2250,JSON.stringify(counts));
});
test('bots ignore past history and unseen opponent inputs exactly',()=>{
 for(let n=1;n<=100;n++)for(let s=0;s<4;s++){
  const b=G.makeBoard(seedRng(n),'high');
  assert.equal(G.botChoice(s,b,[],seedRng(n)),G.botChoice(s,b,[{results:[{cell:4},{cell:4}]}],seedRng(n)));
 }
});
test('full timer budgets are 220s to base result / 230s to expansion result',()=>{
 const basic=finish(game());assert.equal(basic.phaseStartedAt,220000);
 const r=extension(),start=r.phaseStartedAt;finish(r);assert.equal(r.phaseStartedAt-start,230000);
 assert.equal(220+15,235);assert.equal(230+15,245);
});
test('neither forced collisions nor previous-game history are added',()=>{
 const r=extension();assert.deepEqual(r.history,[]);assert.deepEqual(r.snapshot('p0').history,[]);
 assert.ok(!('matchBoards' in r.snapshot('p0')));assert.ok(!('bridgeHistory' in r.snapshot('p0')));
});
