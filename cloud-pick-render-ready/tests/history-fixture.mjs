// Test-only snapshots generated with the actual scoring rules. Not bundled in the app.
import '../src/game.js';
const G=globalThis.CloudGame,r=new G.Room('TEST',{}, {rng:()=>0.4});
for(let i=0;i<4;i++)r.addHuman('p'+i,['테스트플레이어','긴닉네임플레이어','연결테스트','플레이어네번째'][i]);
r.matchId=7;r.round=1;r.phase='choose';r.phaseStartedAt=Date.now();r.phaseEndsAt=Date.now()+60000;
r.board=[2,0,4,0,1,0,1,0,2];
const first=r.snapshot('p0');
r.players.forEach((p,i)=>p.selected=[6,0,2,2][i]);r.resolve(Date.now());
r.round=2;r.phase='choose';r.board=[1,0,3,0,6,0,2,0,2];r.results=[];
r.players.forEach(p=>{p.locked=false;p.selected=null;});
const second=r.snapshot('p0');
r.players.forEach((p,i)=>p.selected=[4,4,null,8][i]);r.resolve(Date.now());
r.round=3;r.phase='choose';r.board=[2,0,5,0,1,0,1,0,3];r.results=[];
r.phaseStartedAt=Date.now();r.phaseEndsAt=Date.now()+60000;
r.players.forEach(p=>{p.locked=false;p.selected=null;});r.players[2].selected=2;
r.matchmaking={kind:'random',humans:4,bots:0};
const third=r.snapshot('p0');third.matchmaking={kind:'random',humans:4,bots:0};
console.log(JSON.stringify({first,second,third}));
