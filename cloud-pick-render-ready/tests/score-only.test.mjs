import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import '../src/game.js';
const { Room } = globalThis.CloudGame;
function active() {
  const room = new Room('SCORE', {}, {rng:()=>0.4});
  for (let i=0;i<4;i++) room.addHuman(`p${i}`,`P${i}`,0);
  room.start('p0',0);room.advance(20000);room.advance(23000);
  return room;
}
test('a lock is visible only to its owner, with no current destinations for others',()=>{
  const r=active();r.select('p1',4,1,r.matchId,true,23001);
  assert.equal(r.snapshot('p1',23002).players[1].locked,true);
  for(const id of ['p0','p2','p3']){
    const s=r.snapshot(id,23002);
    assert.equal(s.players[1].locked,false);assert.equal(s.players[1].selected,null);
    assert.deepEqual(s.results,[]);assert.deepEqual(s.history,[]);
  }
});
test('each viewer receives personal history only, during and after the match',()=>{
  const r=active();
  for(let round=1;round<=10;round++){
    if(round>1){r.advance(r.phaseEndsAt);r.advance(r.phaseEndsAt);}
    const now=r.phaseStartedAt;
    for(let i=0;i<4;i++) r.select(`p${i}`,[6,0,2,8][i],round,r.matchId,true,now+i+1);
    for(let i=0;i<4;i++){
      const s=r.snapshot(`p${i}`,now+10);
      assert.equal(s.results.length,4); // Current round reveal is still simultaneous.
      assert.equal(s.history.length,round);
      assert.ok(s.history.every(h=>h.results.length===1 && h.results[0].id===`p${i}`));
      assert.equal(s.players[i].score,s.history.reduce((sum,h)=>sum+h.results[0].gain,0));
    }
  }
  r.advance(r.phaseEndsAt);assert.equal(r.phase,'finished');
  assert.equal(r.snapshot('p0').history.at(-1).results.length,1);
  assert.ok(r.history.every(h=>h.results.length===4)); // Server bot knowledge is unchanged.
});
test('earlier choices disappear from opponent snapshots when the next round starts',()=>{
  const r=active();for(let i=0;i<4;i++)r.select(`p${i}`,4,1,r.matchId,true,23001+i);
  assert.ok(r.snapshot('p0').results.every(x=>x.cell===4));
  r.advance(r.phaseEndsAt);const s=r.snapshot('p0');
  assert.deepEqual(s.results,[]);assert.ok(s.players.slice(1).every(p=>p.selected===null&&!p.locked));
  assert.ok(s.history.every(h=>h.results.every(x=>x.id==='p0')));
});
test('all locked still ends a round immediately and repeat matches clear history',()=>{
  const r=active();for(let i=0;i<4;i++)r.select(`p${i}`,4,1,r.matchId,true,23001+i);
  assert.equal(r.phase,'reveal');assert.equal(r.phaseStartedAt,23004);
  while(r.phase!=='finished')r.advance(r.phaseEndsAt);
  r.start('p0',r.phaseStartedAt+1);assert.deepEqual(r.snapshot('p0').history,[]);
});
test('offline bots have the same lock privacy as humans',()=>{
  const r=new Room('BOTS');r.addHuman('you','나',0);r.start('you',0);r.advance(20000);r.advance(23000);
  r.players[1].locked=true;r.players[1].selected=4;
  const s=r.snapshot('you');assert.equal(s.players[1].locked,false);assert.equal(s.players[1].selected,null);
});
test('obsolete history renderer and lock counts are absent from the built game',async()=>{
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  for(const stale of ['recentChoicesHTML','recent-choices','history-coins','명 확정','지난 판'])assert.ok(!html.includes(stale),stale);
  assert.ok(html.includes('플레이어별 누적 코인'));
  assert.ok(html.includes('내 기록 보기'));
  assert.ok(html.includes("if(self&&state.phase==='choose'&&p.locked)"));
});
