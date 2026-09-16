import '../src/game.js';
const G=globalThis.CloudGame;
let seed=9231;
const r=new G.Room('FIXTURE',{}, {rng:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)});
for(let i=0;i<4;i++)r.addHuman('p'+i,['나','긴이름의상대플레이어','단풍','달빛'][i],0);
r.matchmaking={kind:'random',humans:4,bots:0};r.start('p0',0);
function snapshot(){return {...r.snapshot('p0',r.phaseStartedAt),matchmaking:r.matchmaking};}
function until(phase,round){let n=0;while(!(r.phase===phase&&r.round===round)){r.advance(r.phaseEndsAt);if(++n>100)throw Error('fixture loop');}}
while(r.phase!=='finished')r.advance(r.phaseEndsAt);
const result=snapshot();
const now=r.phaseStartedAt,id=r.matchId;
for(let i=0;i<4;i++)r.voteRematch('p'+i,'bait',id,now+1+i);
const prepare=snapshot();until('bait_choose',6);
const input=snapshot();
const t=r.phaseStartedAt;
for(let i=0;i<4;i++)r.placeBait('p'+i,i<2?4:[0,2,2,8][i],6,r.matchId,t+1+i);
const confirmed=snapshot();r.advance(r.phaseEndsAt);const attributed=snapshot();
r.advance(r.phaseEndsAt);const move=snapshot();
console.log(JSON.stringify({result,prepare,input,confirmed,attributed,move}));
