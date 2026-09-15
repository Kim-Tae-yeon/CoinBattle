import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import '../src/game.js';

const source = await readFile(new URL('../src/recent-history.js', import.meta.url), 'utf8');
const G = globalThis.CloudGame;
const names = ['왼쪽 위', '', '오른쪽 위', '', '가운데', '', '왼쪽 아래', '', '오른쪽 아래'];
function history(round, cell = 4, coins = 6, collision = false, missed = false) {
  const board = Array(9).fill(0); if (cell !== null) board[cell] = coins;
  return { round, board, results: [{ id: 'other', cell, collision, missed, gain: collision || missed ? 0 : coins }] };
}
function view(round = 3, entries = [history(1, 0, 2), history(2)]) {
  return { round, phase: 'choose', yourId: 'me', history: entries, board: [1,0,2,0,1,0,3,0,6] };
}
function load(snapshot) {
  const context = vm.createContext({ state: snapshot, CELL_NAMES: names });
  vm.runInContext(source, context);
  return { read: id => JSON.parse(JSON.stringify(context.recentOpponentChoices(snapshot, id))),
    html: id => context.recentChoicesHTML({ id }) };
}

test('R1 has no memory chips', () => assert.deepEqual(load(view(1)).read('other'), []));
test('R2 has one earlier observation, not current round', () => assert.deepEqual(load(view(2)).read('other').map(r=>r.round), [1]));
test('R3 has two observations in chronological order', () => assert.deepEqual(load(view()).read('other').map(r=>r.round), [1,2]));
test('R10 retains only R8 and R9', () => assert.deepEqual(load(view(10,Array.from({length:9},(_,i)=>history(i+1)))).read('other').map(r=>r.round), [8,9]));
test('own history is not added to the roster', () => assert.equal(load(view()).html('me'), ''));
for (const phase of ['home','lobby','prepare','finished']) test(`no history chips in ${phase}`, () => assert.equal(load({...view(),phase}).html('other'), ''));
test('collision displays the offered six coins, not zero gain or current one coin', () => {
  const model=load(view(3,[history(2,4,6,true)]));
  assert.deepEqual(model.read('other'),[{round:2,cell:4,coins:6,outcome:'겹침'}]);
  assert.match(model.html('other'),/당시 6코인, 겹침/);
  assert.match(model.html('other'),/history-coins[^>]*>6</);
  assert.doesNotMatch(model.html('other'),/당시 [01]코인/);
});
test('solo and missed are distinguished with text, not color-only symbols', () => {
  const model=load(view(3,[history(1,0,2),history(2,null,0,false,true)]));
  assert.match(model.html('other'),/>단독</);assert.match(model.html('other'),/>미선택</);
  assert.equal(model.read('other')[1].coins,null);
});
test('current reveal and future entries never enter the older-round list', () => {
  const snapshot={...view(3,[history(1),history(2),history(3),history(4)]),phase:'reveal'};
  assert.deepEqual(load(snapshot).read('other').map(r=>r.round),[1,2]);
});
test('reconnect with reordered or duplicate records produces no duplicate chips', () => {
  assert.deepEqual(load(view(4,[history(3),history(1),history(2),history(3)])).read('other').map(r=>r.round),[2,3]);
});
test('new match with empty history has no previous-match observations', () => assert.deepEqual(load(view(3,[])).read('other'),[]));
test('absent historical board does not fall back to current board', () => {
  const h=history(2);delete h.board;assert.deepEqual(load(view(3,[h])).read('other'),[]);
});
test('no rendered names, predictions, trends or player classification', () => {
  const html=load(view()).html('other');assert.doesNotMatch(html, /확률|성향|욕심형|연속|추천|<script/);
  assert.equal(load(view()).html('<script>alert(1)</script>'),'');
});
test('reads do not mutate public snapshots', () => {
  const s=view();const before=JSON.stringify(s);load(s).read('other');load(s).html('other');assert.equal(JSON.stringify(s),before);
});
test('real Room: provisional opponent choice remains private and no future boards are serialized', () => {
  const r=new G.Room('TEST');for(let i=0;i<4;i++)r.addHuman('p'+i,'P'+i,0);
  r.start('p0',0);r.advance(20000);r.advance(23000);r.select('p1',4,1,r.matchId,false,23001);
  const s=r.snapshot('p0',23001);assert.equal(s.players[1].selected,null);assert.ok(!('matchBoards'in s));
  assert.deepEqual(load(s).read('p1'),[]);
});
test('build includes recent-history before UI and preserves accessible descriptions', async () => {
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  assert.ok(html.indexOf('function recentOpponentChoices')<html.indexOf('function playerHTML'));
  assert.match(html,/최근 공개 선택, 위에서부터 시간순/);
  assert.match(html,/history-outcome/);assert.doesNotMatch(html,/class="previous-choice"/);
});
