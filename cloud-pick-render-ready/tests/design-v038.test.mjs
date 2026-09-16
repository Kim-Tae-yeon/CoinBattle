import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/game.js';
const G = globalThis.CloudGame;
function room(expand = false) {
  const r = new G.Room('V038', {}, {rng: () => 0.42});
  for (let i = 0; i < 4; i++) r.addHuman(`p${i}`, `P${i}`, 0);
  r.start('p0', 0);
  if (expand) {
    while (r.phase !== 'finished') r.advance(r.phaseEndsAt);
    const id = r.matchId, t = r.phaseStartedAt;
    for (let i = 0; i < 4; i++) r.voteRematch(`p${i}`, 'bait', id, t + i + 1);
  }
  return r;
}
function to(r, phase, round) {
  for (let i = 0; i < 100; i++) {
    if (r.phase === phase && r.round === round) return r;
    r.advance(r.phaseEndsAt);
  }
  throw new Error(`Unreachable ${phase}/${round}`);
}
test('v0.38 bait preview replaces, rather than follows, the R6/R9 countdown', () => {
  const r = room(true);
  for (const round of [6, 9]) {
    to(r, 'reveal', round - 1);
    const end = r.phaseEndsAt;
    r.advance(end);
    assert.equal(r.phase, 'bait_choose');
    assert.equal(r.round, round);
    assert.equal(r.phaseStartedAt, end);
    assert.equal(r.phaseEndsAt, end + 6000);
    assert.deepEqual(r.board, r.matchBoards[round - 1]);
    r.advance(end + 6000);
    assert.equal(r.phase, 'bait_reveal');
    assert.equal(r.phaseEndsAt, end + 8000);
    r.advance(end + 8000);
    assert.equal(r.phase, 'choose');
    assert.equal(r.phaseEndsAt, end + 18000);
  }
});
test('base games retain all ten three-second board previews and ten-second input caps', () => {
  const r = room(), rounds = [];
  while (r.phase !== 'finished') {
    if (r.phase === 'countdown') { rounds.push(r.round); assert.equal(r.phaseEndsAt - r.phaseStartedAt, 3000); }
    if (r.phase === 'choose') assert.equal(r.phaseEndsAt - r.phaseStartedAt, 10000);
    r.advance(r.phaseEndsAt);
  }
  assert.deepEqual(rounds, [1,2,3,4,5,6,7,8,9,10]);
  assert.equal(r.phaseStartedAt, 220000);
});
test('spending every token at R6 restores the ordinary R9 preview, never an empty bait phase', () => {
  const r = to(room(true), 'bait_choose', 6), t = r.phaseStartedAt;
  for (let i = 0; i < 4; i++) r.placeBait(`p${i}`, 4, 6, r.matchId, t + i + 1);
  to(r, 'reveal', 8); const end = r.phaseEndsAt; r.advance(end);
  assert.equal(r.phase, 'countdown'); assert.equal(r.round, 9);
  assert.equal(r.phaseEndsAt, end + 3000);
  r.advance(r.phaseEndsAt); assert.equal(r.phase, 'choose');
  assert.deepEqual(r.baitCells, []);
});
test('reconnecting during preview does not restart or extend the common deadline', () => {
  const r = to(room(true), 'bait_choose', 6), end = r.phaseEndsAt;
  r.setConnected('p0', false, end - 1000); r.setConnected('p0', true, end - 500);
  const s = r.snapshot('p0', end - 499);
  assert.equal(s.phaseEndsAt, end); assert.equal(s.round, 6);
  assert.deepEqual(s.bait.placements, []);
  r.advance(end); assert.equal(r.phaseEndsAt, end + 2000);
});
test('all early confirmations resolve movement immediately without shortening the next reveal', () => {
  const r = to(room(true), 'choose', 6), t = r.phaseStartedAt;
  for (let i = 0; i < 4; i++) r.select(`p${i}`, 4, 6, r.matchId, true, t + i + 1);
  assert.equal(r.phase, 'reveal'); assert.equal(r.phaseStartedAt, t + 4);
  assert.equal(r.phaseEndsAt - r.phaseStartedAt, 7000);
});
test('two complete preview windows add ten net seconds, not sixteen, to the base match', () => {
  const r = room(true), start = r.phaseStartedAt, phases = [];
  while (r.phase !== 'finished') { phases.push([r.phase, r.round]); r.advance(r.phaseEndsAt); }
  assert.equal(r.phaseStartedAt - start, 230000);
  assert.equal(phases.filter(([phase]) => phase === 'countdown').length, 8);
  assert.deepEqual(phases.filter(([phase]) => phase === 'bait_choose').map(([,round]) => round), [6,9]);
  assert.equal(230 + 15, 245);
});
