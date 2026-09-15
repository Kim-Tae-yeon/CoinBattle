// Test-only real Room snapshots, not bundled with the game.
import '../src/game.js';
const G=globalThis.CloudGame,r=new G.Room('TEST',{}, {rng:()=>0.4});
for(let i=0;i<4;i++)r.addHuman('p'+i,['테스트플레이어','긴닉네임플레이어','연결테스트','플레이어네번째'][i]);
r.start('p0',0);r.advance(20000);r.advance(23000);
const first=r.snapshot('p0');
for(let i=0;i<4;i++)r.select('p'+i,[6,0,2,2][i],1,r.matchId,true,23001+i);
r.advance(r.phaseEndsAt);r.advance(r.phaseEndsAt);
const second=r.snapshot('p0');
for(let i=0;i<4;i++)r.select('p'+i,[4,4,2,8][i],2,r.matchId,true,r.phaseStartedAt+i+1);
r.advance(r.phaseEndsAt);r.advance(r.phaseEndsAt);
r.select('p1',4,3,r.matchId,true,r.phaseStartedAt+1);
const third=r.snapshot('p0');third.matchmaking={kind:'random',humans:4,bots:0};
const ownLocked=r.snapshot('p1');ownLocked.matchmaking=third.matchmaking;
console.log(JSON.stringify({first,second,third,ownLocked}));
