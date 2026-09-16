'use strict';
(() => {
const I=ILR;
I.startExam=s=>{s.exam={stage:s.stage,title:['기획사 입사 오디션','데뷔조 선발 무대','데뷔 확정 무대'][s.stage],round:0,score:0,focus:0,target:[100,150,180][s.stage]};};
I.examBonus=s=>I.round(s.ch*.12+s.team*.1+(s.stage===2?s.song*.3:0));
I.examOptions=s=>{
 const best=['v','d','vi'].sort((a,b)=>s[b]-s[a])[0];
 const opts=[{id:'appeal',name:I.labels[best]+' 어필',icon:'♪',stat:best,mult:.95,cost:7,focus:0,future:'현재 강점을 점수로 전환'},
 {id:s.exam.round===0?'focus':'breath',name:s.exam.round===0?'집중해서 빌드업':'호흡 정리',icon:'◎',stat:s.exam.round===0?best:'ch',mult:s.exam.round===0?.35:.2,cost:s.exam.round===0?4:-10,focus:s.exam.round===0?2:1,future:s.exam.round===0?'집중 +2 · 이후 어필 효율 +36%':'컨디션을 회복하며 무대를 마무리'},
 {id:'burst',name:'하이라이트',icon:'★',stat:best,mult:1.3,cost:13,focus:0,future:'큰 점수와 높은 컨디션 소모'}];
 return opts.map(o=>{const tired=o.cost>0&&s.cond<o.cost;const focusMult=o.id==='focus'||o.id==='breath'?1:1+s.exam.focus*.18;const gain=s[o.stat]*o.mult*focusMult*(tired?.55:1);return {...o,range:[I.round(gain*.92),I.round(gain*1.08)],exact:[{key:'cond',before:s.cond,after:I.clamp(s.cond-o.cost),delta:I.round(I.clamp(s.cond-o.cost)-s.cond)},...(o.focus?[{key:'focus',before:s.exam.focus,after:s.exam.focus+o.focus,delta:o.focus}]:[]),...(tired?[{key:'stress',before:s.stress,after:I.clamp(s.stress+6),delta:I.round(I.clamp(s.stress+6)-s.stress)}]:[])],growth:[],future:tired?'컨디션 부족: 점수 효율 55%':o.future};});
};
I.examAuto=s=>{const opts=I.examOptions(s);if(s.cond<13&&s.exam.round>0)return 'breath';if(s.exam.round===0&&s.cond>=17)return 'focus';return opts.sort((a,b)=>(b.range[0]+b.range[1])-(a.range[0]+a.range[1]))[0].id;};
I.chooseExam=(s,o)=>{
 const before=I.snapshot(s);s.decisions++;const gain=I.round(o.range[0]+(o.range[1]-o.range[0])*I.random(s));
 s.exam.score=I.round(s.exam.score+gain);s.exam.focus+=o.focus;
 I.apply(s,Object.fromEntries(o.exact.filter(x=>x.key!=='focus').map(x=>[x.key,x.delta])));s.exam.round++;
 let next='exam',advance=false,note=`${o.name}으로 ${gain}점 획득.`,title=o.name;
 if(s.exam.round>=2){
  const total=I.round(s.exam.score+I.examBonus(s));const pass=total>=s.exam.target;
  note+=` 카드 ${s.exam.score} + 역량 보너스 ${I.examBonus(s)} = ${total} / 목표 ${s.exam.target}.`;
  advance=true;s.stageSeasons=0;
  if(pass){s.stage++;title=['','기획사 입사 확정','데뷔조 합류','데뷔 확정'][s.stage];s.gateFailures=0;next='plan';if(s.stage===3)I.apply(s,{fans:3,brand:15,debt:20});}
  else {s.gateFailures++;title='이번 평가 미달';next=s.gateFailures>=2?'end':'plan';note+=s.gateFailures<2?' 다음 반년 재정비 후 재도전한다.':' 두 번의 재도전 기회를 소진했다.';I.apply(s,{cond:12,stress:-6});if(next==='end'){s.ending='데뷔 전의 또 다른 길';s.endNote='평가 미달이 이어져 새로운 진로를 찾기로 했다.';}}
 }
 I.report(s,before,title,note,next,advance);return true;
};
})();
