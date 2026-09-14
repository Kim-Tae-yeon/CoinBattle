/** Protocol regression test. Node 22+, no npm dependencies, real HTTP and SSE. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const pause = ms => new Promise(r => setTimeout(r, ms));
const port = Number(process.env.TEST_PORT || 3138), base = `http://127.0.0.1:${port}`;
async function until(predicate, timeout = 10000) {
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
test('After Dark: original multiplayer protocol, four real clients', { timeout: 45000 }, async t => {
  const server = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url))], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' }, stdio: 'ignore',
  });
  const clients = [];
  try {
    await until(async () => { try { return (await json('/api/health')).ok; } catch { return false; } });
    const first = new Client(await json('/api/create', { name: '유령', config: { rounds: 3, seconds: 5, fillBots: false } }));
    clients.push(first); await first.connect();
    for (const name of ['달빛', '낙엽', '새벽']) { const c = new Client(await json('/api/join', { code: first.code, name })); clients.push(c); await c.connect(); }
    await t.test('same room, four humans, active SSE on every client', async () => {
      await until(() => clients.every(c => c.latest.players.length === 4 && c.events > 0));
      assert.ok(clients.every(c => c.latest.code === first.code && c.latest.players.every(p => !p.bot)));
    });
    await first.send('start');
    await until(() => clients.every(c => c.latest.phase === 'choose' && c.latest.round === 1));
    await t.test('provisional choices stay private until reveal', async () => {
      await first.pick(4, false);
      await until(() => first.latest.players.find(p => p.id === first.id).selected === 4);
      assert.ok(clients.slice(1).every(c => c.latest.players.every(p => p.selected === null)));
      assert.ok(clients.every(c => c.latest.results.length === 0));
    });
    for (const c of clients) await c.pick(4);
    await t.test('four-way center collision is zero for all, identical over SSE', async () => {
      await until(() => clients.every(c => c.latest.phase === 'reveal'));
      for (const c of clients) { assert.equal(c.latest.results.length, 4); assert.ok(c.latest.results.every(r => r.collision && r.gain === 0)); assert.ok(c.latest.players.every(p => p.score === 0)); }
    });
    await until(() => clients.every(c => c.latest.phase === 'choose' && c.latest.round === 2));
    for (const [i, c] of clients.entries()) await c.pick([6, 0, 2, 8][i]);
    let expected;
    await t.test('unique landings award exact values and synchronize totals', async () => {
      await until(() => clients.every(c => c.latest.phase === 'reveal' && c.latest.round === 2));
      expected = first.latest.players.map(p => p.score);
      for (const c of clients) {
        assert.ok(c.latest.results.every(r => !r.collision && r.gain > 0 && r.gain === c.latest.board[r.cell]));
        assert.deepEqual(c.latest.players.map(p => p.score), expected);
      }
    });
    await t.test('authenticated state read and reconnection retain the same seat', async () => {
      const c = clients[2], id = c.id;
      await c.close(); const snap = await json('/api/state', undefined, c.token); assert.equal(snap.yourId, id);
      await c.connect(); await until(() => c.latest.players.find(p => p.id === id)?.connected);
      assert.equal(c.latest.yourId, id);
    });
    await until(() => clients.every(c => c.latest.phase === 'choose' && c.latest.round === 3));
    await t.test('illegal cloud cannot be selected', async () => {
      await assert.rejects(clients[2].pick(8, false), /구름/);
    });
    await t.test('server deadline gives all non-choosing players zero', async () => {
      await until(() => clients.every(c => c.latest.phase === 'reveal' && c.latest.round === 3), 8000);
      assert.ok(clients.every(c => c.latest.results.every(r => r.missed && r.gain === 0)));
    });
    await t.test('whole match finishes with matching score histories', async () => {
      await until(() => clients.every(c => c.latest.phase === 'finished'), 6000);
      for (const c of clients) {
        assert.deepEqual(c.latest.players.map(p => p.score), expected);
        for (const p of c.latest.players) assert.equal(p.score, c.latest.history.reduce((s, h) => s + h.results.find(r => r.id === p.id).gain, 0));
      }
    });
    await t.test('host disconnect transfers authority; new host can replay', async () => {
      await first.close();
      await until(() => clients[1].latest.hostId === clients[1].id);
      await clients[1].send('start');
      await until(() => clients[1].latest.phase === 'countdown' && clients[1].latest.round === 1);
      assert.ok(clients[1].latest.players.every(p => p.score === 0));
    });
    await t.test('random matchmaking pairs two humans and starts with two bots', async () => {
      const strangerA = new Client(await json('/api/matchmake', { name: '랜덤 A' }));
      clients.push(strangerA); await strangerA.connect();
      assert.equal(strangerA.latest.phase, 'lobby');
      const strangerB = new Client(await json('/api/matchmake', { name: '랜덤 B' }));
      clients.push(strangerB); await strangerB.connect();
      await until(() => [strangerA, strangerB].every(c => c.latest.phase === 'countdown' && c.latest.players.length === 4));
      assert.ok([strangerA, strangerB].every(c => c.latest.players.filter(p => !p.bot).length === 2));
      assert.ok([strangerA, strangerB].every(c => c.latest.players.filter(p => p.bot).length === 2));
    });
  } finally {
    await Promise.all(clients.map(c => c.close().catch(() => {})));
    server.kill('SIGTERM');
    await new Promise(resolve => { server.once('exit', resolve); setTimeout(resolve, 2500).unref(); });
  }
});
