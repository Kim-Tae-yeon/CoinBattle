/** Protocol regression test. Node 22+, no npm dependencies, real HTTP and SSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const pause = ms => new Promise(r => setTimeout(r, ms));
const port = Number(process.env.EXTENSION_TEST_PORT || 3145), base = `http://127.0.0.1:${port}`;
async function until(predicate, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await predicate()) return; await pause(25); }
  throw new Error('Timed out waiting for server state');
}
async function json(path, data, token) {
  const response = await fetch(base + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(9000),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || `HTTP ${response.status}`);
  return value;
}
class Client {
  constructor(session) { Object.assign(this, session); this.latest = session.state; this.events = 0; }
  async connect() {
    this.controller = new AbortController();
    const response = await fetch(`${base}/api/events?token=${encodeURIComponent(this.token)}`, { signal: this.controller.signal });
    assert.equal(response.status, 200);
    this.reading = (async () => {
      const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '';
      try {
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let split;
          while ((split = buffer.indexOf('\n\n')) >= 0) {
            const event = buffer.slice(0, split); buffer = buffer.slice(split + 2);
            if (event.startsWith('event: state\n')) { this.latest = JSON.parse(event.split('\ndata: ')[1]); this.events++; }
          }
        }
      } catch (e) { if (!this.controller.signal.aborted) throw e; }
      finally { reader.releaseLock(); }
    })();
  }
  async close() { this.controller?.abort(); await this.reading; }
  async send(action, extra = {}) {
    const out = await json('/api/action', { action, ...extra }, this.token);
    return out;
  }
  async pick(cell, lock = true) {
    return this.send(lock ? 'lock' : 'select', { cell, round: this.latest.round, matchId: this.latest.matchId });
  }
}
const ticket = () => randomBytes(32).toString('base64url');
test('v6 real HTTP/SSE: random match -> unanimous same-table expansion -> rematch', {timeout:310000}, async t => {
  const server=spawn(process.execPath,[fileURLToPath(new URL('../server.mjs',import.meta.url))],{
    env:{...process.env,HOST:'127.0.0.1',PORT:String(port)},stdio:'ignore'
  });
  const clients=[];
  try {
    await until(async()=>{try{return (await json('/api/health')).version==='6.0.0';}catch{return false;}});
    const keys=[];
    for(let i=0;i<4;i++){
      const k=ticket();keys.push(k);await json('/api/matchmake',{name:'V6-'+i},k);
    }
    let replies=[];
    await until(async()=>{replies=await Promise.all(keys.map(k=>json('/api/matchmake',undefined,k)));return replies.every(v=>v.status==='matched');});
    for(const v of replies){const c=new Client(v.session);clients.push(c);await c.connect();}
    const originalSeats=clients.map(c=>[c.id,c.latest.players.find(p=>p.id===c.id).slot]);
    const code=clients[0].code;
    assert.equal(new Set(clients.map(c=>c.code)).size,1);
    for(const c of clients)await c.send('ready',{matchId:c.latest.matchId});
    await t.test('first public game is always basic and private lock does not broadcast',async()=>{
      await until(()=>clients.every(c=>c.latest.phase==='choose'));
      assert.ok(clients.every(c=>c.latest.expansion==='none'));
      const before=clients[1].events;
      await clients[0].pick(4,true);await pause(150);
      assert.equal(clients[1].events,before);
      const read=await json('/api/state',undefined,clients[1].token);
      assert.equal(read.players.find(p=>p.id===clients[0].id).locked,false);
      assert.equal(read.players.find(p=>p.id===clients[0].id).selected,null);
    });
    for(let round=1;round<=10;round++){
      await until(()=>clients.every(c=>c.latest.phase==='choose'&&c.latest.round===round));
      for(let i=0;i<4;i++){
        if(round===1&&i===0)continue;
        const c=clients[i],slot=c.latest.players.find(p=>p.id===c.id).slot;
        await c.pick(round===1?4:[6,0,2,8][slot]);
      }
      await until(()=>clients.every(c=>c.latest.phase==='reveal'&&c.latest.round===round));
      assert.ok(clients.every(c=>c.latest.phaseEndsAt-c.latest.phaseStartedAt===7000));
    }
    await until(()=>clients.every(c=>c.latest.phase==='finished'));
    await t.test('first result offers 12-second unanimous opt-in, not a personal unlock',async()=>{
      for(const c of clients){assert.equal(c.latest.rematch.status,'open');assert.equal(c.latest.rematch.allowBait,true);}
      const matchId=clients[0].latest.matchId;
      for(let i=0;i<3;i++)await clients[i].send('rematch',{choice:'bait',matchId});
      assert.equal(clients[3].latest.phase,'finished');
      await clients[3].send('rematch',{choice:'bait',matchId});
      await until(()=>clients.every(c=>c.latest.phase==='prepare'&&c.latest.expansion==='bait'));
      assert.deepEqual(clients.map(c=>[c.id,c.latest.players.find(p=>p.id===c.id).slot]),originalSeats);
      for(const c of clients){assert.equal(c.latest.matchId,matchId+1);assert.equal(c.latest.code,code);assert.ok(c.latest.players.every(p=>p.score===0));assert.deepEqual(c.latest.history,[]);}
    });
    for(const c of clients)await c.send('ready',{matchId:c.latest.matchId});
    const seen=[];
    for(let round=1;round<=10;round++){
      if([6,9].includes(round)){
        await until(()=>clients.every(c=>c.latest.phase==='bait_choose'&&c.latest.round===round));seen.push(round);
        const active=round===6?[0,1]:[2,3], c0=clients[active[0]],baseReward=c0.latest.board[4],matchId=c0.latest.matchId;
        for(const i of active)await clients[i].send('bait',{cell:4,round,matchId});
        const other=clients[round===6?2:0];
        const hidden=await json('/api/state',undefined,other.token);
        assert.equal(hidden.board[4],baseReward);assert.deepEqual(hidden.bait.cells,[]);assert.deepEqual(hidden.bait.placements,[]);
        if(round===6){
          await clients[2].send('bait',{cell:null,round,matchId});await clients[3].send('bait',{cell:null,round,matchId});
          await c0.close();const restored=await json('/api/state',undefined,c0.token);
          assert.equal(restored.bait.own.locked,true);assert.equal(restored.bait.own.cell,4);assert.equal(restored.bait.own.remaining,0);
          await c0.connect();await c0.send('bait',{cell:4,round,matchId});
        }else await assert.rejects(clients[0].send('bait',{cell:4,round,matchId}));
        await until(()=>clients.every(c=>c.latest.phase==='bait_reveal'&&c.latest.round===round));
        for(const c of clients){assert.equal(c.latest.bait.placements.length,2);assert.equal(c.latest.board[4],baseReward+1);assert.deepEqual(c.latest.bait.cells,[4]);}
      }
      await until(()=>clients.every(c=>c.latest.phase==='choose'&&c.latest.round===round));
      for(const c of clients)assert.deepEqual(c.latest.bait.placements,[]);
      if(![6,9].includes(round))assert.ok(clients.every(c=>c.latest.bait.cells.length===0));
      const base=clients[0].latest.board;
      for(let i=0;i<4;i++){
        const c=clients[i],slot=c.latest.players.find(p=>p.id===c.id).slot;
        await c.pick((round===6&&i===2)||(round===9&&i===0)?4:[6,0,2,8][slot]);
      }
      await until(()=>clients.every(c=>c.latest.phase==='reveal'&&c.latest.round===round));
      for(const c of clients){
        assert.ok(c.latest.results.every(x=>x.gain===base[x.cell]));
        assert.ok(c.latest.history.every(h=>h.results.length===1&&h.results[0].id===c.id));
      }
    }
    await t.test('exactly two bait windows and second full game ends with synchronized totals',async()=>{
      await until(()=>clients.every(c=>c.latest.phase==='finished'));
      assert.deepEqual(seen,[6,9]);
      for(const c of clients){
        assert.equal(c.latest.rematch,null);assert.equal(c.latest.tableMatch,2);
        assert.deepEqual(c.latest.players.map(p=>p.score),clients[0].latest.players.map(p=>p.score));
        assert.equal(c.latest.players.find(p=>p.id===c.id).score,c.latest.history.reduce((a,h)=>a+h.results[0].gain,0));
      }
    });
    await t.test('new random match returns to basic without restarting other participants',async()=>{
      await clients[0].send('leave');const key=ticket();
      const v=await json('/api/matchmake',{name:'다음 경기'},key);assert.equal(v.status,'waiting');
      assert.equal(clients[1].latest.phase,'finished');await json('/api/matchmake/cancel',{},key);
    });
  }finally{
    await Promise.all(clients.map(c=>c.close().catch(()=>{})));
    server.kill('SIGTERM');await new Promise(resolve=>{server.once('exit',resolve);setTimeout(resolve,2500).unref();});
  }
});
