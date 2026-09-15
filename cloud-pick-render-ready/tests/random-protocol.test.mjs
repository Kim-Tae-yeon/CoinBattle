/** Protocol regression test. Node 22+, no npm dependencies, real HTTP and SSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const pause = ms => new Promise(r => setTimeout(r, ms));
const port = Number(process.env.MATCH_TEST_PORT || 3141), base = `http://127.0.0.1:${port}`;
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
test('public matchmaking over real HTTP and SSE', { timeout: 190000 }, async t => {
  const server = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url))], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', MATCH_FALLBACK_MS: '1800' }, stdio: 'ignore',
  });
  const clients = [];
  async function register(name){const key=ticket();await json('/api/matchmake',{name,config:{rounds:3,seconds:5}},key);return key;}
  async function getMatches(ks){
    let views;
    await until(async()=>{views=await Promise.all(ks.map(k=>json('/api/matchmake',undefined,k)));await pause(120);return views.every(v=>v.status==='matched');},9000);
    return views.map(v=>v.session);
  }
  try {
    await until(async()=>{try{return(await json('/api/health')).ok;}catch{return false;}});
    await t.test('health advertises public-match capability and fixed rules',async()=>{const h=await json('/api/health');assert.equal(h.matchmaking.enabled,true);assert.equal(h.matchmaking.minimumHumans,2);assert.equal(h.matchmaking.rounds,10);});
    const ks=[];for(const n of ['낙엽','다람쥐','야간버스','새벽'])ks.push(await register(n));
    const matches=await getMatches(ks);
    for(const info of matches){const c=new Client(info);clients.push(c);await c.connect();}
    await t.test('four unrelated join requests create exactly one public room',async()=>{await until(()=>clients.every(c=>c.latest.players.length===4));assert.equal(new Set(matches.map(v=>v.code)).size,1);for(const c of clients){assert.equal(c.latest.matchmaking.humans,4);assert.equal(c.latest.matchmaking.bots,0);assert.equal(c.latest.config.rounds,10);assert.equal(c.latest.config.seconds,10);assert.ok(c.latest.players.every(p=>!p.bot));}});
    await t.test('a lost registration response recovers without duplicate seats',async()=>{const v=await json('/api/matchmake',{name:'ignored'},ks[0]);assert.equal(v.session.id,clients[0].id);assert.equal(v.session.state.players.length,4);});
    await t.test('public room rejects manual joins by code',async()=>{await assert.rejects(json('/api/join',{code:clients[0].code,name:'intruder'}),/랜덤/);});
    await t.test('host cannot alter common rules or force a restart',async()=>{const h=clients.find(c=>c.id===c.latest.hostId);for(const action of ['configure','addBot','start','lobby'])await assert.rejects(h.send(action,{config:{rounds:3}}),/공통 규칙/);});
    await until(()=>clients.every(c=>c.latest.phase==='prepare'));
    for(const c of clients) await c.send('ready',{matchId:c.latest.matchId});
    await until(()=>clients.every(c=>c.latest.phase==='choose'));
    await t.test('current destinations stay private through actual SSE',async()=>{await clients[0].pick(4,false);await pause(120);assert.equal(clients[0].latest.players.find(p=>p.id===clients[0].id).selected,4);for(const c of clients.slice(1))assert.equal(c.latest.players.find(p=>p.id===clients[0].id).selected,null);});
    for(const c of clients)await c.pick(4);
    await t.test('four-player collision agrees across clients',async()=>{await until(()=>clients.every(c=>c.latest.phase==='reveal'));for(const c of clients)assert.ok(c.latest.results.every(r=>r.collision&&r.gain===0));});
    await t.test('reconnect returns the same random-match participant',async()=>{const c=clients[2];await c.close();const s=await json('/api/state',undefined,c.token);assert.equal(s.yourId,c.id);assert.equal(s.matchmaking.kind,'random');await c.connect();});
    for(let round=2;round<=10;round++){
      await until(()=>clients.every(c=>c.latest.phase==='choose'&&c.latest.round===round));
      for(const c of clients){const slot=c.latest.players.find(p=>p.id===c.id).slot;await c.pick([6,0,2,8][slot]);}
      await until(()=>clients.every(c=>c.latest.phase==='reveal'&&c.latest.round===round));
      for(const c of clients)assert.ok(c.latest.results.every(r=>r.gain===c.latest.board[r.cell]));
    }
    await t.test('all ten rounds finish with identical correct totals',async()=>{await until(()=>clients.every(c=>c.latest.phase==='finished'));for(const c of clients){assert.deepEqual(c.latest.players.map(p=>p.score),clients[0].latest.players.map(p=>p.score));for(const p of c.latest.players)assert.equal(p.score,c.latest.history.reduce((s,h)=>s+h.results.find(r=>r.id===p.id).gain,0));}});
    await t.test('one participant requeues without restarting everyone',async()=>{await clients[0].send('leave');const k=await register('다음 밤');const v=await json('/api/matchmake',undefined,k);assert.equal(v.status,'waiting');assert.equal(v.count,1);assert.equal(clients[1].latest.phase,'finished');await json('/api/matchmake/cancel',{},k);});
    await t.test('cancel before late registration does not resurrect a ticket',async()=>{const k=ticket();await json('/api/matchmake/cancel',{},k);assert.equal((await json('/api/matchmake',{name:'late'},k)).status,'cancelled');});
    await t.test('two humans get exactly two labelled bots after waiting',async()=>{const pair=[await register('둘이서1'),await register('둘이서2')];assert.equal((await json('/api/matchmake',undefined,pair[0])).status,'waiting');const sessions=await getMatches(pair);for(const s of sessions){assert.equal(s.state.matchmaking.humans,2);assert.equal(s.state.matchmaking.bots,2);assert.equal(s.state.players.filter(p=>p.bot).length,2);}for(const k of pair)await json('/api/matchmake/cancel',{},k);});
    await t.test('left participant session is invalidated',async()=>{await assert.rejects(json('/api/state',undefined,clients[0].token),/만료/);});
  } finally {
    await Promise.all(clients.map(c=>c.close().catch(()=>{})));
    server.kill('SIGTERM');await new Promise(resolve=>{server.once('exit',resolve);setTimeout(resolve,2500).unref();});
  }
});
