'use strict';
(() => {
const I=ILR;
I.settle=(s,before,title,note)=>{
 const g=I.growth(s,s.plan);I.apply(s,g);
 let moneyNote='';
 if(s.stage<3){const cost=[1.5,2.4,4.5][s.stage];I.apply(s,{debt:cost});moneyNote=` 반년 육성 비용 ${I.money(cost)} 누적.`;}
 else {
  let mult={v:1,d:1,vi:1.1,care:.45,fans:.9,money:1.6}[s.plan];
  if(s.tags.includes('public'))mult*=1.1;
  if(s.tags.includes('dinner'))mult*=1.25;
  for(const b of s.buffs)if(b.stat==='revenue'&&b.left>0)mult*=1+b.rate;
  const gross=I.round((14+s.brand*.7+s.fans*.8)*mult);
  const companyRate=s.tags.includes('indie')?.4:.5;
  const company=I.round(gross*companyRate),team=I.round(gross-company);
  const costs=I.round((s.plan==='money'?3:5)+(s.tags.includes('indie')?3:0));
  const personal=I.round((team-costs)/s.members);
  const paid=I.round(Math.min(s.debt,Math.max(0,personal))),net=I.round(Math.max(0,personal)-paid);
  I.apply(s,{debt:personal<0?-personal:-paid,cash:net});
  s.ledger={gross,company,companyRate,team,costs,members:s.members,personal,paid,net};
  I.apply(s,{brand:I.age(s)>=30?-1.4:-.7,cond:s.tags.includes('longrun')?0:I.age(s)>=30?-2:-1});
  if(I.age(s)>=35)I.apply(s,{v:-.4,d:-.5,vi:-.4});
  s.rank=Math.round(I.clamp(120-s.brand*.6-s.fans*.7,1,100));s.best=Math.min(s.best,s.rank);
  s.poorHealth=s.cond<10?s.poorHealth+1:0;s.lowFans=I.age(s)>=25&&s.fans<4?s.lowFans+1:0;
  moneyNote=` 개인 몫 ${I.money(Math.max(0,personal))}: 비용 상환 ${I.money(paid)}, 내 정산 ${I.money(net)}.`;
 }
 const active=s.buffs.map(b=>b.label).join(' · ');
 for(const b of s.buffs)b.left--;s.buffs=s.buffs.filter(b=>b.left>0);
 s.stageSeasons++;
 let next='plan',advance=true;
 if(s.stage<3&&s.stageSeasons>=[2,4,2][s.stage]){next='exam';advance=false;s.exam=null;}
 if(s.poorHealth>=3||s.lowFans>=3){next='end';s.ending=s.poorHealth>=3?'활동 중단':'무대를 떠나며';s.endNote=s.poorHealth>=3?'낮은 컨디션이 3반기 이어져 활동을 멈췄다.':'팬 기반이 약해진 상태가 3반기 이어졌다.';}
 if(s.season>=73){next='end';const legend=s.tags.includes('dinner')&&s.v>=65&&s.ch>=70&&s.fans>=35;s.ending=legend?'디너쇼 레전드':'장수 아이돌';s.endNote=legend?'50세. 노래와 신뢰로 모은 관객이 다음 공연도 기다린다.':'50세까지 현역 활동을 이어갔다. 선택의 기록이 하나의 커리어가 됐다.';}
 if(s.poorHealth||s.lowFans)moneyNote+=` 경고: 컨디션 위기 ${s.poorHealth}/3 · 팬 기반 위기 ${s.lowFans}/3.`;
 I.report(s,before,title,note+` 반년 성장 적용${active?' ('+active+')':''}.`+moneyNote,next,advance);
};
I.choose=(s,id)=>{
 const a=I.getOptions(s).find(o=>o.id===id);if(!a)return false;
 if(s.step==='exam')return I.chooseExam(s,a);
 const before=I.snapshot(s);s.decisions++;
 if(s.step==='plan'){
  s.plan=id;if(['v','d','vi'].includes(id))s.track=id;
  I.apply(s,a.effect);
  const e=I.pickEvent(s);
  if(e){s.eventId=e.id;s.eventCause=e.requires?`${I.tags[e.requires]} 경력 때문에 도착한 제안`:e.track?`${I.labels[s.track]} 중심을 선택해 도착한 제안`:e.minAge?`${I.age(s)}세의 커리어에 맞춘 제안`:'현재 소속에서 보내온 제안';I.report(s,before,a.name,'성장 방향을 정했다. 이어서 관련 제안을 확인한다.','event');}
  else I.settle(s,before,a.name,'중간 선택 없이 반년을 진행했다.');
 }else if(s.step==='event'){
  const e=I.events.find(x=>x.id===s.eventId);I.apply(s,a.effect);I.addTag(s,a.tag);
  if(a.buff)s.buffs.push({...I.clone(a.buff),id:e.id});
  if(e.id==='renewal'&&a.id!=='indie')s.tags=s.tags.filter(t=>t!=='indie');
  let note=`${e.speaker}의 제안에 ‘${a.name}’으로 답했다.`;
  if(e.risk&&a.id==='silence'){const hit=I.random(s)<.55;if(hit)I.apply(s,{ch:-8,brand:-6});note+=hit?' 55% 위험이 발생해 신뢰와 브랜드가 하락했다.':' 이번에는 논란이 더 커지지 않았다.';}
  s.seen.push(e.id);s.history.push({date:I.date(s),text:`[분기] ${e.title} → ${a.name}${a.tag?' → '+I.tags[a.tag]:''}`});
  I.settle(s,before,e.title,note);
 }
 return true;
};
})();
