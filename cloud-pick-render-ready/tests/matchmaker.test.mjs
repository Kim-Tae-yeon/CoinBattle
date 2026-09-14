import test from 'node:test';
import assert from 'node:assert/strict';
import { Matchmaker } from '../src/matchmaker.mjs';
const key = n => String(n).padStart(43, 'X');
function fixture(options = {}) {
  const games = [], abandoned = [];
  const q = new Matchmaker({ ...options,
    onMatch: ts => { games.push(ts.map(t=>t.key)); return new Map(ts.map(t=>[t.key,{token:'session-'+t.key,id:t.key,code:'GAME'+games.length}])); },
    onAbandon: value=>abandoned.push(value),
  });
  return {q,games,abandoned};
}
function add(q,n,now=0){for(let i=1;i<=n;i++)q.join(key(i),'친구 '+i,now);}
function ack(q,keys,now=0){keys.forEach(k=>q.poll(k,now));}
test('one human never starts against only bots',()=>{const{q,games}=fixture();add(q,1);for(let t=1000;t<=90000;t+=1000)q.poll(key(1),t);assert.equal(games.length,0);assert.equal(q.view(key(1),90000).count,1);});
test('four humans reserve immediately, but only start after all acknowledge',()=>{const{q,games}=fixture();add(q,4);assert.equal(q.view(key(1),0).status,'ready');ack(q,[1,2,3].map(key),100);assert.equal(games.length,0);q.poll(key(4),100);assert.equal(games.length,1);assert.equal(q.view(key(1),100).status,'matched');});
test('same key is idempotent and cannot consume multiple seats',()=>{const{q}=fixture();for(let i=0;i<20;i++)q.join(key(1),'rename',0);assert.equal(q.tickets.size,1);});
test('no automatic 2-player start before the fallback window',()=>{const{q,games}=fixture();add(q,2);q.poll(key(1),10000);q.poll(key(2),10000);q.tick(19999);assert.equal(q.view(key(1),19999).status,'waiting');assert.equal(games.length,0);});
test('two humans qualify at 20 seconds; explicit bot count is two',()=>{const{q,games}=fixture();add(q,2);ack(q,[key(1),key(2)],10000);q.poll(key(1),20000);assert.equal(q.view(key(2),20000).bots,2);q.poll(key(2),20000);assert.equal(games[0].length,2);});
test('three humans qualify with one bot',()=>{const{q,games}=fixture();add(q,3);ack(q,[1,2,3].map(key),10000);ack(q,[1,2,3].map(key),20000);assert.equal(games[0].length,3);});
test('eight people split into two disjoint groups of four',()=>{const{q,games}=fixture();add(q,8);ack(q,[1,2,3,4,5,6,7,8].map(key),10);assert.equal(games.length,2);assert.equal(new Set(games.flat()).size,8);});
test('a ninth participant waits rather than entering a full game',()=>{const{q,games}=fixture();add(q,9);ack(q,[1,2,3,4,5,6,7,8,9].map(key),10);assert.equal(games.length,2);assert.equal(q.view(key(9),10).count,1);});
test('cancellation removes eligibility and does not resurrect on delayed join',()=>{const{q}=fixture();add(q,1);q.cancel(key(1),10);assert.equal(q.join(key(1),'late',20).status,'cancelled');assert.equal(q.waiting(20).length,0);});
test('cancel before a delayed registration creates a cancellation tombstone',()=>{const{q}=fixture();q.cancel(key(1),0);assert.equal(q.join(key(1),'late',10).status,'cancelled');});
test('cancelled ready group returns remaining players to their original order',()=>{const{q,games}=fixture();add(q,4);q.poll(key(1),10);q.cancel(key(4),20);assert.equal(q.view(key(1),20).status,'waiting');assert.equal(q.tickets.get(key(1)).joinedAt,0);q.join(key(5),'new',30);ack(q,[1,2,3,5].map(key),40);assert.deepEqual(games[0],[1,2,3,5].map(key));});
test('unresponsive browser cannot start the ready group',()=>{const{q,games}=fixture();add(q,4);ack(q,[1,2,3].map(key),500);ack(q,[1,2,3].map(key),8500);q.tick(10000);assert.equal(games.length,0);assert.equal(q.view(key(4),10000).status,'expired');assert.equal(q.view(key(1),10000).status,'waiting');});
test('offline waiting ticket expires after 15 seconds',()=>{const{q}=fixture();add(q,1);q.tick(15000);assert.equal(q.view(key(1),15000).status,'expired');});
test('queue reload within lease retains original wait timestamp',()=>{const{q}=fixture();add(q,1,100);assert.equal(q.poll(key(1),5000).joinedAt,100);});
test('queue status does not reveal names, ticket credentials or user lists',()=>{const{q}=fixture();add(q,2);const v=q.view(key(1),10);assert.equal(v.count,2);assert.ok(!JSON.stringify(v).includes('친구'));assert.ok(!JSON.stringify(v).includes(key(2)));assert.ok(!('session' in v));});
test('late cancellation after match cleans up the assigned game session',()=>{const{q,abandoned}=fixture();add(q,4);ack(q,[1,2,3,4].map(key),10);q.cancel(key(1),20);assert.equal(abandoned.length,1);q.cancel(key(1),30);assert.equal(abandoned.length,1);});
test('unclaimed matches are reclaimed, but claimed live matches are not abandoned',()=>{const{q,abandoned}=fixture();add(q,4);ack(q,[1,2,3,4].map(key),10);q.claim(key(1));q.tick(120010);assert.equal(abandoned.length,3);assert.equal(q.tickets.size,0);});
test('bad or missing bearer ticket cannot be registered',()=>{const{q}=fixture();for(const k of ['',null,'short','x'.repeat(44)])assert.throws(()=>q.join(k,'name',0));});
test('capacity is bounded; duplicate join remains possible at capacity',()=>{const{q}=fixture({maxTickets:1});q.join(key(1),'x',0);assert.throws(()=>q.join(key(2),'y',0));assert.equal(q.join(key(1),'x',0).status,'waiting');});
test('names are sanitized and limited before a public match',()=>{const{q}=fixture();q.join(key(1),'\0abcdefghijklmnop',0);assert.equal(q.tickets.get(key(1)).name,'abcdefghijkl');});

test('an old acknowledgement must become fresh before the room is created',()=>{const{q,games}=fixture();add(q,4);q.poll(key(1),500);ack(q,[2,3,4].map(key),9000);assert.equal(games.length,0);q.poll(key(1),9500);assert.equal(games.length,1);});
