/** In-memory public matchmaking. No bots pose as waiting human players.
 * Waiting -> ready (each browser must acknowledge) -> matched.
 * All mutations are synchronous: no two HTTP requests can reserve the same seat.
 */
import { randomUUID } from 'node:crypto';
export class Matchmaker {
  constructor({ onMatch, onAbandon = () => {}, fallbackMs = 20000, leaseMs = 15000, readyMs = 10000, retentionMs = 120000, maxTickets = 1000 } = {}) {
    if (typeof onMatch !== 'function') throw new TypeError('onMatch callback is required');
    Object.assign(this, { onMatch, onAbandon, fallbackMs, leaseMs, readyMs, retentionMs, maxTickets });
    this.tickets = new Map(); this.groups = new Map(); this.serial = 0; this.retryAt = 0;
  }
  validate(key) {
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(key)) throw new Error('매칭 참가 정보가 올바르지 않아요.');
  }
  join(key, name, now = Date.now()) {
    this.validate(key); this.tick(now);
    const existing = this.tickets.get(key);
    if (existing) {
      if (existing.status === 'cancelled' || existing.status === 'expired') return this.view(key, now);
      existing.lastSeen = now; return this.view(key, now);
    }
    if (this.tickets.size >= this.maxTickets) throw new Error('대기열이 가득 찼어요. 잠시 뒤 다시 시도해 주세요.');
    this.tickets.set(key, { key, name: String(name || '플레이어').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 12) || '플레이어',
      status: 'waiting', joinedAt: now, lastSeen: now, order: ++this.serial, groupId: null, ack: false, result: null, terminalAt: 0, claimed: false, notice: '' });
    this.tick(now); return this.view(key, now);
  }
  poll(key, now = Date.now()) {
    this.validate(key); this.tick(now);
    const t = this.tickets.get(key);
    if (!t) return { status: 'expired', serverNow: now };
    if (t.status === 'waiting' || t.status === 'ready' || t.status === 'matched') {
      t.lastSeen = now;
      if (t.status === 'ready') t.ack = true;
    }
    this.tick(now); return this.view(key, now);
  }
  cancel(key, now = Date.now()) {
    this.validate(key);
    const t = this.tickets.get(key);
    if (!t) { // Tombstone defeats a delayed join request racing a cancellation.
      if (this.tickets.size >= this.maxTickets) throw new Error('요청이 많아요. 잠시 뒤 다시 시도해 주세요.');
      this.tickets.set(key, { key, status: 'cancelled', terminalAt: now, result: null });
      return { status: 'cancelled', serverNow: now };
    }
    if (t.status === 'matched') this.onAbandon(t.result);
    t.status = 'cancelled'; t.terminalAt = now;
    if (t.groupId) this.release(t.groupId, now);
    t.result = null; this.tick(now); return this.view(key, now);
  }
  claim(key) { const t = this.tickets.get(key); if (t?.status === 'matched') t.claimed = true; }
  release(groupId, now) {
    const group = this.groups.get(groupId); if (!group) return;
    this.groups.delete(groupId);
    for (const key of group.keys) {
      const t = this.tickets.get(key); if (!t) continue;
      t.groupId = null; t.ack = false;
      if (t.status !== 'ready') continue;
      if (now - t.lastSeen >= this.leaseMs) { t.status = 'expired'; t.terminalAt = now; }
      else { t.status = 'waiting'; t.notice = '한 명의 연결이 끊겨 다시 찾고 있어요. 대기 순서는 유지돼요.'; }
    }
  }
  waiting(now) {
    return [...this.tickets.values()].filter(t => t.status === 'waiting' && now - t.lastSeen < this.leaseMs).sort((a, b) => a.order - b.order);
  }
  tick(now = Date.now()) {
    for (const [key, t] of this.tickets) {
      if ((t.status === 'waiting' || t.status === 'ready') && now - t.lastSeen >= this.leaseMs) {
        t.status = 'expired'; t.terminalAt = now;
        if (t.groupId) this.release(t.groupId, now);
      }
      if (t.status === 'matched' && now - t.terminalAt >= this.retentionMs) {
        if (!t.claimed) this.onAbandon(t.result);
        this.tickets.delete(key);
      } else if (['cancelled', 'expired'].includes(t.status) && now - t.terminalAt >= this.retentionMs) this.tickets.delete(key);
    }
    for (const [id, group] of this.groups) {
      const ts = group.keys.map(key => this.tickets.get(key));
      if (now >= group.endsAt || ts.some(t => !t || t.status !== 'ready')) { // Unacknowledged browsers are no longer eligible.
        for (const t of ts) if (t?.status === 'ready' && (!t.ack || now - t.lastSeen >= Math.min(4000, this.leaseMs))) { t.status = 'expired'; t.terminalAt = now; }
        this.release(id, now); continue;
      }
      if (ts.every(t => t.ack && now - t.lastSeen < Math.min(4000, this.leaseMs))) {
        try {
          const results = this.onMatch(ts, now);
          for (const t of ts) {
            t.status = 'matched'; t.result = results.get(t.key); t.groupId = null; t.terminalAt = now;
          }
          this.groups.delete(id);
        } catch {
          this.release(id, now); this.retryAt = now + 3000;
          for (const t of ts) t.notice = '게임 서버의 빈자리를 기다리고 있어요. 잠시만 기다려 주세요.';
        }
      }
    }
    if (now < this.retryAt) return;
    let waiting = this.waiting(now);
    while (waiting.length >= 4 || waiting.length >= 2 && now - waiting[0].joinedAt >= this.fallbackMs) {
      const group = waiting.splice(0, 4), id = randomUUID();
      this.groups.set(id, { keys: group.map(t => t.key), endsAt: now + this.readyMs });
      for (const t of group) { t.status = 'ready'; t.groupId = id; t.ack = false; t.notice = ''; }
    }
  }
  view(key, now = Date.now()) {
    const t = this.tickets.get(key);
    if (!t) return { status: 'expired', serverNow: now };
    const out = { status: t.status, serverNow: now, joinedAt: t.joinedAt, fallbackMs: this.fallbackMs, leaseMs: this.leaseMs };
    if (t.status === 'matched') return { ...out, session: { ...t.result } };
    if (t.status === 'waiting') {
      const waiting = this.waiting(now), index = waiting.indexOf(t), start = Math.max(0, Math.floor(index / 4) * 4), batch = waiting.slice(start, start + 4);
      return { ...out, count: batch.length, target: 4, fallbackAt: (batch[0]?.joinedAt ?? now) + this.fallbackMs, notice: t.notice };
    }
    if (t.status === 'ready') {
      const group = this.groups.get(t.groupId);
      return { ...out, count: group?.keys.length ?? 0, target: 4, bots: 4 - (group?.keys.length ?? 4), readyEndsAt: group?.endsAt, notice: '' };
    }
    return out;
  }
}
