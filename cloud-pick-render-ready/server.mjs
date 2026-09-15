/** Cloud Pick multiplayer server. Node.js 22+, zero npm dependencies. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomInt } from 'node:crypto';
import { Matchmaker } from './src/matchmaker.mjs';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import './src/game.js';
const { Room, DEFAULTS, VERSION } = globalThis.CloudGame;
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const MAX_ROOMS = 500;
const rooms = new Map();
const sessions = new Map();
const streams = new Map();
const limits = new Map();
const root = new URL('./public/', import.meta.url);
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let lan = [];
try { lan = Object.values(networkInterfaces()).flat().filter(n => n && n.family === 'IPv4' && !n.internal).map(n => `http://${n.address}:${PORT}`); }
catch { /* Optional LAN hints must not prevent a container deployment from starting. */ }
const secureId = () => randomBytes(18).toString('base64url');
const code = () => Array.from(randomBytes(6), x => alphabet[x % alphabet.length]).join('');
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
async function body(req) {
  let bytes = 0, text = '';
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 8192) throw new Error('요청이 너무 커요.');
    text += chunk;
  }
  try { const value = JSON.parse(text || '{}'); if (!value || typeof value !== 'object' || Array.isArray(value)) throw 0; return value; }
  catch { throw new Error('올바르지 않은 요청이에요.'); }
}
function authenticate(req, url, eventStream = false) {
  const token = eventStream ? url.searchParams.get('token') : req.headers.authorization?.replace(/^Bearer /, '');
  const session = sessions.get(token);
  if (!session) throw Object.assign(new Error('참가 정보가 만료됐어요. 다시 참가해 주세요.'), { status: 401 });
  const room = rooms.get(session.code);
  if (!room || !room.player(session.id) || room.player(session.id).departed) throw Object.assign(new Error('방을 찾을 수 없어요.'), { status: 401 });
  return { token, session, room };
}
function sendState(token, room, id) {
  const res = streams.get(token);
  if (!res || res.destroyed) return;
  // Disconnect slow consumers instead of retaining unbounded buffers.
  if (res.writableLength > 256 * 1024) { res.destroy(); return; }
  res.write(`event: state\ndata: ${JSON.stringify(snapshot(room, id))}\n\n`);
}
function broadcast(room) {
  for (const [token, session] of sessions) if (session.code === room.code) sendState(token, room, session.id);
}
function openStream(req, res, auth) {
  const { token, session, room } = auth;
  const old = streams.get(token);
  streams.set(token, res);
  if (old && old !== res && !old.destroyed) {
    old.write('event: replaced\ndata: {}\n\n');
    old.end();
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive', 'X-Accel-Buffering': 'no',
  });
  res.write('retry: 1500\n\n');
  if (session.ticketKey) matchmaker.claim(session.ticketKey);
  room.setConnected(session.id, true);
  broadcast(room);
  req.on('close', () => {
    if (streams.get(token) === res) {
      streams.delete(token); room.setConnected(session.id, false); broadcast(room);
    }
  });
}
function issueSession(room, name) {
  const token = secureId(), id = secureId();
  room.addHuman(id, name);
  sessions.set(token, { code: room.code, id });
  return { token, id, code: room.code, state: snapshot(room, id) };
}
function snapshot(room, id) {
  return { ...room.snapshot(id), ...(room.matchmaking ? { matchmaking: { ...room.matchmaking } } : {}) };
}
function abandonSession(result) {
  if (!result) return;
  const session = sessions.get(result.token), room = rooms.get(session?.code);
  if (room && session && !room.player(session.id)?.departed) room.leave(session.id);
  sessions.delete(result.token);
  const stream = streams.get(result.token); streams.delete(result.token); if (stream) stream.end();
  if (room) broadcast(room);
}
const fallbackMs = Number(process.env.MATCH_FALLBACK_MS || 20000);
if (!Number.isFinite(fallbackMs) || fallbackMs < 0 || fallbackMs > 120000) throw new Error('Invalid MATCH_FALLBACK_MS');
const matchmaker = new Matchmaker({
  fallbackMs,
  onMatch(tickets, now) {
    if (rooms.size >= MAX_ROOMS) throw new Error('Server full');
    let c; do { c = code(); } while (rooms.has(c));
    const room = new Room(c, DEFAULTS);
    room.matchmaking = { kind: 'random', humans: tickets.length, bots: 4 - tickets.length };
    rooms.set(c, room);
    const seats = tickets.slice();
    for (let i = seats.length - 1; i > 0; i--) { const j = randomInt(i + 1); [seats[i], seats[j]] = [seats[j], seats[i]]; }
    const out = new Map();
    for (const t of seats) {
      const result = issueSession(room, t.name);
      sessions.get(result.token).ticketKey = t.key;
      out.set(t.key, { token: result.token, id: result.id, code: c });
    }
    room.start(room.hostId, now);
    return out;
  },
  onAbandon: abandonSession,
});
function queueKey(req) { return req.headers.authorization?.replace(/^Bearer /, '') || ''; }
function queuePayload(view) {
  if (view.status !== 'matched') return view;
  const info = view.session, room = rooms.get(info.code), session = sessions.get(info.token);
  if (!room || !session || room.player(info.id)?.departed) return { status: 'expired', serverNow: Date.now() };
  return { ...view, session: { ...info, state: snapshot(room, info.id) } };
}
function checkLimit(req) {
  const ip = req.socket.remoteAddress || 'unknown', now = Date.now();
  let item = limits.get(ip);
  if (!item || now - item.at > 10000) { item = { at: now, count: 0 }; limits.set(ip, item); }
  if (++item.count > 180) throw new Error('요청이 너무 빨라요. 잠시 뒤 다시 시도해 주세요.');
}
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // index.html is self-contained; no third-party requests or remote scripts.
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/api/health' && req.method === 'GET') {
      return json(res, 200, { ok: true, app: 'cloud-pick', version: VERSION, revision: process.env.RENDER_GIT_COMMIT || 'local', protocol: 2, transport: 'SSE + HTTP', matchmaking: { enabled: true, target: 4, minimumHumans: 2, fallbackMs, rounds: DEFAULTS.rounds, seconds: DEFAULTS.seconds }, lanUrls: lan });
    }
    if (url.pathname === '/api/matchmake' && req.method === 'GET') {
      checkLimit(req); return json(res, 200, queuePayload(matchmaker.poll(queueKey(req))));
    }
    if (url.pathname === '/api/events' && req.method === 'GET') {
      checkLimit(req); return openStream(req, res, authenticate(req, url, true));
    }
    if (url.pathname === '/api/state' && req.method === 'GET') {
      checkLimit(req); const { session, room } = authenticate(req, url); return json(res, 200, snapshot(room, session.id));
    }
    if (url.pathname.startsWith('/api/') && req.method === 'POST') {
      checkLimit(req);
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: '다른 사이트에서는 요청할 수 없어요.' });
      if (!req.headers['content-type']?.includes('application/json')) return json(res, 415, { error: 'JSON 요청이 필요해요.' });
      const data = await body(req);
      if (url.pathname === '/api/matchmake') {
        return json(res, 200, queuePayload(matchmaker.join(queueKey(req), data.name)));
      }
      if (url.pathname === '/api/matchmake/cancel') {
        return json(res, 200, matchmaker.cancel(queueKey(req)));
      }
      if (url.pathname === '/api/create') {
        if (rooms.size >= MAX_ROOMS) throw new Error('지금은 방이 너무 많아요. 잠시 뒤 다시 시도해 주세요.');
        let c; do { c = code(); } while (rooms.has(c));
        const room = new Room(c, data.config); rooms.set(c, room);
        return json(res, 200, issueSession(room, data.name));
      }
      if (url.pathname === '/api/join') {
        const room = rooms.get(String(data.code || '').trim().toUpperCase());
        if (!room || room.matchmaking) throw new Error('참가할 수 없는 방이에요. 랜덤 매칭으로 만나 주세요.');
        const result = issueSession(room, data.name); broadcast(room); return json(res, 200, result);
      }
      if (url.pathname === '/api/action') {
        const { token, session, room } = authenticate(req, url);
        if (room.advance()) broadcast(room);
        if (room.matchmaking && !['select', 'lock', 'leave', 'ready'].includes(data.action)) throw new Error('랜덤 매칭은 공통 규칙으로 진행해요. 끝나면 다시 매칭해 주세요.');
        switch (data.action) {
          case 'ready': room.ready(session.id, data.matchId); break;
          case 'select': room.select(session.id, data.cell, data.round, data.matchId, false); break;
          case 'lock': room.select(session.id, data.cell, data.round, data.matchId, true); break;
          case 'start': room.start(session.id); break;
          case 'configure': room.configure(session.id, data.config); break;
          case 'addBot': room.addBot(session.id); break;
          case 'removeBot': room.removeBot(session.id, data.id); break;
          case 'lobby': room.returnToLobby(session.id); break;
          case 'leave': {
            room.leave(session.id); sessions.delete(token);
            const stream = streams.get(token); streams.delete(token); if (stream) stream.end();
            broadcast(room); return json(res, 200, { ok: true });
          }
          default: throw new Error('알 수 없는 명령이에요.');
        }
        // Selection and lock acknowledgements are private until a round resolves.
        if ((data.action === 'select' || data.action === 'lock') && room.phase === 'choose') sendState(token, room, session.id);
        else broadcast(room);
        return json(res, 200, { ok: true, state: snapshot(room, session.id) });
      }
      return json(res, 404, { error: '없는 API 주소예요.' });
    }
    if ((url.pathname === '/' || url.pathname === '/index.html') && ['GET', 'HEAD'].includes(req.method)) {
      const html = await readFile(new URL('index.html', root));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(req.method === 'HEAD' ? undefined : html);
    }
    if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
    return json(res, 404, { error: '페이지를 찾을 수 없어요.' });
  } catch (error) {
    if (!res.headersSent) json(res, error.status || 400, { error: error.message || '요청을 처리하지 못했어요.' });
    else res.end();
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.on('clientError', (_error, socket) => { if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); });
const tick = setInterval(() => {
  const now = Date.now();
  matchmaker.tick(now);
  for (const room of rooms.values()) {
    if (room.advance(now)) broadcast(room);
    const active = room.players.some(p => !p.bot && p.connected && !p.departed);
    if (!active && now - room.touchedAt > 5 * 60 * 1000 || now - room.createdAt > 24 * 60 * 60 * 1000) {
      rooms.delete(room.code);
      for (const [token, session] of sessions) if (session.code === room.code) {
        const stream = streams.get(token); if (stream) stream.end(); streams.delete(token); sessions.delete(token);
      }
    }
  }
}, 80);
const heartbeat = setInterval(() => {
  for (const stream of streams.values()) if (!stream.destroyed) stream.write(': heartbeat\n\n');
  for (const [ip, item] of limits) if (Date.now() - item.at > 60000) limits.delete(ip);
}, 12000);
server.listen(PORT, HOST, () => {
  console.log(`\n  CLOUD PICK / 코인 고르기 심리전\n  This computer: http://localhost:${PORT}`);
  for (const url of lan) console.log(`  Same Wi-Fi:   ${url}`);
  console.log('  Open the same address and choose Random Match. No room code needed.\n  Press Ctrl+C to stop.\n');
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${PORT} is busy. Set PORT to a different port.` : error); process.exitCode = 1; clearInterval(tick); clearInterval(heartbeat); });
function stop() { clearInterval(tick); clearInterval(heartbeat); for (const stream of streams.values()) stream.end(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 2000).unref(); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
