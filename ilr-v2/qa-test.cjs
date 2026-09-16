'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const root=__dirname+'/';
for(const f of ['catalog','events-school','events-career','events-late','model','progress'])vm.runInThisContext(fs.readFileSync(root+f+'.js','utf8'),{filename:f+'.js'});
const I=globalThis.ILR;let checks=0;
function ok(x,msg){assert.ok(x,msg);checks++;}
const round=I.round;
const stats=Object.keys(I.labels);
function validate(s){for(const k of stats){ok(Number.isFinite(s.stats[k]),k+' finite');ok(s.stats[k]>=0,k+' non-negative');if(I.capped.includes(k))ok(s.stats[k]<=100,k+' cap');}ok(s.season<=74,'season cap');}
function click(s,idx){
 const before=I.clone(s),o=s.scene.options[idx],p=I.preview(s,o);
 ok(I.choose(s,idx)===false,'cannot bypass dialogue');
 s.revealed=true;ok(I.choose(s,idx),'choice advances');
 ok(I.choose(s,idx)===false,'duplicate dispatch rejected');
 if(!before.exam){const d=s.result.changes;
  for(const x of p){const actual=d.find(y=>y.key===x.key)?.delta||0;ok(actual>=x.min-.11&&actual<=x.max+.11,`preview ${x.key}: ${actual}, expected ${x.min}..${x.max}`);}
  for(const x of d)ok(p.some(y=>y.key===x.key),`no unpreviewed choice effect ${x.key}`);
  ok(s.season===before.season+1,'exact half-year');
 }
 validate(s);
}
const eventsCovered=new Set();
for(const event of I.events){for(let i=0;i<3;i++){
 const s=I.newGame('검증', 'vocal',123);
 s.season=event.stages.includes('veteran')?60:event.stages.includes('career')?22:event.stages.includes('squad')?6:event.stages.includes('trainee')?4:1;
 s.stats.cond=43;s.stats.stress=55;s.stats.cash=200;
 if(event.requires)s.tags.push(event.requires);
 s.scene={...I.clone(event),kind:'event',reason:'test'};s.mode='scene';s.revealed=false;
 click(s,i);eventsCovered.add(event.id);
}}
// Fixed offered options, preview purity, replaying a rendered dialogue must not reroll.
let s=I.newGame('<하린>', 'vocal',77),before=JSON.stringify(s);
for(let n=0;n<30;n++)for(const o of s.scene.options)I.preview(s,o);
ok(JSON.stringify(s)===before,'previews do not advance RNG/state');
const buff=I.newGame('하린','vocal',1);buff.season=1;buff.scene={...I.clone(I.events.find(e=>e.id==='mentor')),kind:'event',reason:'test'};click(buff,0);
ok(buff.buffs[0].left===1,'buff decremented after current season');
I.advance(buff);buff.scene={id:'plan',title:'test',reason:'test',options:[I.plans[0]],kind:'plan'};click(buff,0);ok(buff.buffs.length===0,'buff expires after two half-years');
// Triggered follow-up must be causally reachable; no permanent pretend tags.
for(const [tag,event] of [['mainVocal','ost'],['performer','challenge'],['center','ad'],['public','fans'],['indie','indie']]){
 let x=I.newGame('하린','vocal',5);x.season=20;x.tags=[tag];I.prepare(x);ok(x.scene.id===event,`tag unlock ${tag} -> ${x.scene.id}`);
 let y=I.newGame('하린','vocal',5);y.season=20;I.prepare(y);ok(y.scene.id!==event,'locked without tag');
}
let z=I.newGame('하린','vocal',5);z.season=56;z.tags=['live'];z.seen.rookie=10;I.prepare(z);ok(z.scene.id==='dinner','dinner age gate');
const result={runs:0,checks:0,events:I.events.length,optionsTested:I.events.length*3,outcomes:{},manualChoices:[],carryChoices:[]};
for(let seed=1;seed<=800;seed++){
 let x=I.newGame('하린',I.routes[(seed-1)%4].id,seed),actions=0,loop=0;
 const carry=seed%2===0;
 while(x.mode!=='end'&&loop++<450){
  if(x.mode==='result'){
   if(carry&&I.age(x)>=18&&x.result.next==='scene'&&!x.exam)I.carry(x);else I.advance(x);
  }else{
   ok(x.scene.options.length===3,'three options');ok(x.scene.line&&x.scene.hint&&x.scene.org,'narrative context');
   const idx=seed%3===0?Math.floor(I.random(x)*3):I.autoIndex(x);click(x,idx);actions++;
  }
 }
 ok(x.mode==='end','always reaches ending');validate(x);result.runs++;
 result.outcomes[x.ending]=(result.outcomes[x.ending]||0)+1;
 (carry?result.carryChoices:result.manualChoices).push(actions);
}
// Cash conservation for a specific season.
const t=I.newGame('하린','vocal',3);t.season=10;t.stats.brand=40;t.stats.fans=20;t.stats.cash=0;t.stats.debt=900;const y=I.settle(t);
ok(Math.abs(y.distributable-y.paid-y.net)<.11,'settlement distribution conservation');
ok(t.stats.debt===round(900+y.carry-y.paid),'debt is paid once');
result.checks=checks;
for(const k of ['manualChoices','carryChoices']){const a=result[k];result[k]={min:Math.min(...a),max:Math.max(...a),mean:round(a.reduce((n,x)=>n+x,0)/a.length)};}
fs.writeFileSync(__dirname+'/model-results.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
