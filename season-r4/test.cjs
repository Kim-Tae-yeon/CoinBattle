const assert=require('node:assert/strict');const path=require('node:path');
for(const f of ['catalog','model','events-school','events-company','events-career','journey'])require(path.join(__dirname,f+'.js'));
const I=globalThis.ILR;let checks=0;function check(v,msg){assert.ok(v,msg);checks++;}
check(I.events.length===27,'27 event templates');check(new Set(I.events.map(e=>e.id)).size===27,'unique event IDs');
for(const e of I.events){check(e.options.length===3,e.id);check(e.org&&e.speaker&&e.quote&&e.thought,e.id+' context');for(const o of e.options){check(!o.tag||I.tags[o.tag],e.id+' known tag');check(Object.keys(o.effect).every(k=>I.labels[k]),e.id+' metrics');}}
let s=I.newGame('민수',123);I.start(s,'vocal');check(I.callName('하린')==='하린아','받침');check(I.callName('민수')==='민수야','no 받침');check(I.current(s).quote.includes('{call}'),'template before reveal');I.next(s);const old=JSON.stringify(s);check(!I.choose(s,'fake'),'unknown action');check(JSON.stringify(s)===old,'no mutation on invalid action');const choiceIDs=I.current(s).options.map(o=>o.id);for(let j=0;j<10;j++)I.current(s);check(JSON.stringify(s)===old,'reads do not reroll or consume random');
I.choose(s,'v');check(!I.choose(s,'d'),'double commit rejected');check(s.last.rows.some(r=>r.key==='v'&&r.delta===8),'actual delta');check(I.validSave(JSON.parse(JSON.stringify(s))),'serialized result valid');I.next(s);check(s.eventId==='scholarship','causal vocal offer');I.next(s);I.choose(s,'take');check(s.buffs[0].until===2,'two future semesters');I.next(s);check(s.season===1,'half year advanced');check(I.growthRate(s,'v')===1.4,'buff works');
let outcomes={},debut=0,long=0,maxChoices=0,maxSteps=0,covered=new Set();
for(let seed=1;seed<=100;seed++){
 let s=I.newGame('테스트',seed);I.start(s,I.routes[(seed-1)%4].id);let steps=0;
 while(s.screen!=='ending'&&steps++<600){
  covered.add(I.stage(s));
  if(s.screen==='choice'){
   const o=I.current(s).options.find(o=>o.id===I.autoChoice(s));const preview=I.preview(s,o);const before=I.metrics(s);
   const original=JSON.stringify(s);I.preview(s,o);check(JSON.stringify(s)===original,'preview pure');
   I.choose(s,o.id);for(const p of preview){if(o.risk)continue;const actual=I.round(s[p.key]-before[p.key]);check(actual>=p.lo-.21&&actual<=p.hi+.21,`preview fidelity seed${seed} ${s.mode} ${o.id} ${p.key}: ${actual} not [${p.lo},${p.hi}]`);}
  }else I.next(s);
  check(I.statKeys.every(k=>Number.isFinite(s[k])),'finite metrics');check(I.validSave(s),'valid snapshot');
 }
 check(s.screen==='ending','termination');check(steps<600,'no infinite loop');if(s.season>=10)debut++;if(s.season>=74)long++;outcomes[s.ending.title]=(outcomes[s.ending.title]||0)+1;maxChoices=Math.max(maxChoices,s.choicesMade);maxSteps=Math.max(maxSteps,steps);
}
for(const e of I.events)for(const o of e.options){let s=I.newGame('하린',987);I.start(s,'vocal');s.season=50;s.mode='event';s.eventId=e.id;s.screen='choice';const before=JSON.stringify(s);I.choose(s,o.id);check(s.screen==='result'&&before!==JSON.stringify(s),e.id+'/'+o.id);if(o.tag)check(s.tags.includes(o.tag),'tag applied');if(o.buff)check(I.growthRate(s,o.buff.stat)>1,'buff applied');}
let exhausted=I.newGame();I.start(exhausted,'vocal');exhausted.season=12;exhausted.energy=0;exhausted.strain=2;I.closeSeason(exhausted);check(exhausted.screen==='ending','warned exhaustion ending');
console.log(JSON.stringify({checks,seeds:100,debut,long,maxChoices,maxSteps,events:I.events.length,covered:[...covered],outcomes},null,2));
