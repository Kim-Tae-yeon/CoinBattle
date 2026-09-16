'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..');
for(const f of ['data','events-early','events-career','events-longrun','core','season','exam','story'])vm.runInThisContext(fs.readFileSync(path.join(root,'ilr',f+'.js'),'utf8'),{filename:f+'.js'});
const I=globalThis.ILR;let checks=0;function check(v,msg){assert.ok(v,msg);checks++;}
const equal=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
function invariant(s){for(const k of I.stats){check(Number.isFinite(s[k]),'finite '+k);check(s[k]>=0,'positive '+k);if(!['cash','debt','fans'].includes(k))check(s[k]<=100,'cap '+k);}check(s.season<=74,'calendar bounded');check(s.tags.filter(t=>I.tagGrowth[t]).length<=1,'positions exclusive');}
const scenarios=[];
for(let i=0;i<1000;i++){
 const s=I.newGame('하린',i+1);const route=I.routes[i%4];check(I.start(s,route.id),'route starts');let n=0,prevSeason=0;
 while(s.step!=='end'&&n++<260){
  invariant(s);
  if(s.step==='report'){const advance=s.last.advance;const before=s.season;I.next(s);equal(s.season-before,advance?1:0,'exact half year');continue;}
  const rng=s.rng;const opts=I.getOptions(s),opts2=I.getOptions(s);equal(opts,opts2,'no reroll on render');equal(rng,s.rng,'preview does not consume rng');equal(opts.length,3,'three options');const scene=I.scene(s);check(scene.quote.length>5&&scene.org&&scene.speaker&&scene.hint,'context complete');check(!scene.quote.includes('{'),'name substitution');
  const id=i<750?I.autoChoice(s):opts[Math.floor(I.random(s)*opts.length)].id;check(opts.some(o=>o.id===id),'bot uses offered options');check(I.choose(s,id),'choice accepted');equal(s.step,'report','result never skipped');
  for(const x of s.last.changes)check(Math.abs(x.delta-I.round(x.after-x.before))<.01,'delta equals before-after');
 }
 check(s.step==='end','life terminates');scenarios.push({route:route.id,policy:i<750?'survival':'random',age:I.age(s),ending:s.ending,decisions:s.decisions,events:s.seen.length});
}
// Every proposal and every response resolves; no nonexistent tags / buffs.
for(const event of I.events){
 for(const o of event.options){const s=I.newGame('민수',77);I.start(s,'vocal');s.stage=event.min;s.season=event.minAge?Math.max(0,(event.minAge-13)*2):s.stage*3;s.plan='v';s.step='event';s.eventId=event.id;s.fans=Math.max(20,event.minFans||0);s.tags=event.requires?[event.requires]:[];check(I.choose(s,o.id),'event resolves '+event.id);invariant(s);check(s.seen.includes(event.id),'event seen');if(o.tag)check(s.tags.includes(o.tag),'tag stored');if(o.buff){const buff=s.buffs.find(b=>b.id===event.id);if(o.buff.left>1)equal(buff.left,o.buff.left-1,'buff duration includes current half');else check(!buff,'one semester buff expired');}}
}
// Exact season projection against resolution, including caps and expenses.
const oldPick=I.pickEvent;I.pickEvent=()=>null;
for(const key of Object.keys(I.planData))for(const value of [0,12,90,99,100]){
 const s=I.newGame('테스트',42);I.start(s,'vocal');s.v=s.d=s.vi=s.ch=s.cond=s.stress=value;s.hand=[key,'care','v'];s.plan=key;
 const before=I.snapshot(s);const p=I.planOption(s,key);const expected={...s};I.apply(expected,I.planData[key].effect);I.apply(expected,I.growth(expected,key));I.apply(expected,{debt:1.5});I.choose(s,key);equal(I.snapshot(s),I.snapshot(expected),'projection '+key+' '+value);
}
I.pickEvent=oldPick;
// Exam roll stays within the visible range, including exhausted penalties.
for(const cond of [0,5,12,40,100])for(let round=0;round<2;round++)for(const idx of [0,1,2]){
 const s=I.newGame('수아',17);I.start(s,'dance');s.step='exam';I.startExam(s);s.exam.round=round;s.exam.focus=2;s.cond=cond;
 const a=I.getOptions(s)[idx],before=s.exam.score;I.choose(s,a.id);const gain=I.round(s.exam.score-before);check(gain>=a.range[0]-.01&&gain<=a.range[1]+.01,'exam range');const c=a.exact.find(x=>x.key==='cond');equal(s.last.changes.find(x=>x.key==='score').delta,gain,'exam delta');
}
// Specialization changes eligibility; temporary and permanent buffs change the actual growth.
let a=I.newGame();I.start(a,'vocal');a.stage=3;a.season=30;a.plan='v';a.tags=['vocalist'];check(I.eventEligible(a,I.events.find(e=>e.id==='ost')),'OST unlocked');a.tags=[];check(!I.eventEligible(a,I.events.find(e=>e.id==='ost')),'OST locked');const base=I.growth(a,'v').v;a.buffs=[{stat:'v',rate:.4,left:1,label:'테스트'}];check(I.growth(a,'v').v>base,'buff affects growth');
const stats={runs:scenarios.length,checks,byPolicy:{},eventDefinitions:I.events.length};
for(const policy of ['survival','random']){const rows=scenarios.filter(r=>r.policy===policy);const endings={};for(const r of rows)endings[r.ending]=(endings[r.ending]||0)+1;stats.byPolicy[policy]={runs:rows.length,endings,averageDecisions:Math.round(rows.reduce((n,r)=>n+r.decisions,0)/rows.length*10)/10,maxDecisions:Math.max(...rows.map(r=>r.decisions)),averageEvents:Math.round(rows.reduce((n,r)=>n+r.events,0)/rows.length*10)/10};}
fs.writeFileSync(path.resolve(__dirname,'results/simulation.json'),JSON.stringify(stats,null,2));console.log(JSON.stringify(stats,null,2));
