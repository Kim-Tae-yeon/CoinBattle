(function(I){
'use strict';
I.settle=s=>{
 const a=s.stats,stage=I.stage(s);let y=null;
 if(s.season<8)I.apply(s,{debt:stage==='squad'?220:stage==='trainee'?120:60});
 else{
  const solo=s.tags.includes('indie'),members=solo?1:5;
  const gross=I.round((700+a.brand*32+a.fans*60)*(s.tags.includes('live')?1.25:1));
  const company=solo?0:I.round(gross*.5),cost=solo?650:850;
  const distributable=I.round(Math.max(0,gross-company-cost)/members);
  const carry=I.round(Math.max(0,cost-(gross-company))/members);
  I.apply(s,{debt:carry});const paid=I.round(Math.min(a.debt,distributable));
  I.apply(s,{debt:-paid,cash:distributable-paid,fans:I.round((.2+a.ch/160)*(s.tags.includes('live')?1.25:1)*I.factor(s,'fans'))});
  y={gross,company,cost,members,carry,distributable,paid,net:I.round(distributable-paid)};
  s.rank=Math.max(1,Math.round(120-a.brand*.7-a.fans*.6));s.bestRank=Math.min(s.bestRank||999,s.rank);
 }
 s.buffs=s.buffs.map(b=>({...b,left:b.left-1})).filter(b=>b.left>0);
 s.exhausted=a.cond<12?s.exhausted+1:0;
 s.weakSeasons=s.season>=18&&a.brand<12&&a.fans<12?s.weakSeasons+1:0;
 s.season++;return y;
};
I.choose=(s,index)=>{
 if(s.mode!=='scene'||!s.revealed)return false;
 const opt=s.scene.options[index];if(!opt)return false;
 if(s.exam)return I.chooseExam(s,opt);
 const before=I.clone(s.stats),oldScene=I.clone(s.scene),oldTerm=I.term(s);
 const draft=I.effectDraft(s,opt,()=>I.random(s));
 s.stats=draft.stats;s.tags=draft.tags;s.buffs=draft.buffs;s.focus=draft.focus;
 const choiceAfter=I.clone(s.stats);
 if(oldScene.kind==='event'){s.seen[oldScene.id]=s.season||.001;s.lastEvents.push(oldScene.id);}
 const decision={term:oldTerm,season:s.season,title:oldScene.title,org:oldScene.org,choice:opt.name,reason:oldScene.reason,future:opt.future,tag:opt.tag||null};
 s.decisions.push(decision);
 const money=I.settle(s);
 let next='scene',milestone='';
 if(s.season===2)milestone='기초 준비를 마치고 기획사 연습 대기생 단계로 이동';
 if([4,6,8].includes(s.season)){next='exam';milestone='관문 평가가 기다리고 있어요. 준비한 실력을 보여주세요.';}
 if(s.season>=74){s.ending=s.tags.includes('dinner')&&s.stats.v>=65&&s.stats.ch>=70&&s.stats.fans>=35?'디너쇼 레전드':'50세 현역 가수';next='end';}
 else if(s.exhausted>=3){s.ending='건강을 위한 활동 마무리';next='end';}
 else if(s.weakSeasons>=4){s.ending='다음 삶을 위한 은퇴';next='end';}
 s.result={title:opt.name,term:oldTerm,changes:I.delta(before,s.stats),choiceChanges:I.delta(before,choiceAfter),future:opt.future,reason:oldScene.reason,money,milestone,next};
 s.history.push(I.clone(s.result));s.mode='result';s.revealed=false;return true;
};
I.advance=s=>{
 if(s.mode!=='result')return false;
 const next=s.result.next;
 if(next==='resume'){s.scene=s.resumeScene;delete s.resumeScene;s.mode='scene';s.revealed=false;return true;}
 if(next==='end'){s.mode='end';return true;}
 if(next==='exam')I.startExam(s);
 I.prepare(s);return true;
};
I.startExam=s=>{
 const n=s.season===4?0:s.season===6?1:2;
 s.exam={kind:n,turn:0,score:0,focus:0,target:[75,92,112][n],title:['기획사 입사 평가','데뷔조 선발 평가','데뷔 확정 무대'][n]};
 s.stats.score=0;s.stats.focus=0;
};
I.examScene=s=>{
 const best=['v','d','vi'].sort((a,b)=>s.stats[b]-s.stats[a])[0];
 const opts=[{name:`${I.labels[best]} 어필`,icon:'♪',stat:best,mult:.82,cost:7,future:'이번 턴 점수 확보'},
 {name:'호흡·집중',icon:'◎',stat:best,mult:.22,cost:-8,focus:2,future:s.exam.turn===0?'다음 카드 점수 배율 +70%':'마지막 턴 · 다음 집중 보너스 없음'},
 {name:'하이라이트',icon:'★',stat:best,mult:1.12,cost:13,future:'큰 점수 · 체력 부족 시 점수 40% 감소'}];
 return {id:'exam',kind:'exam',title:s.exam.title,org:'기획사 평가위원회',speaker:'평가 디렉터',line:s.exam.turn===0?'{name}, 두 번의 무대로 준비한 매력을 보여줘. 호흡을 정리한 뒤 결정적인 장면을 만들어도 좋아.':'마지막 무대야. 현재 점수와 남은 컨디션을 보고 끝맺어보자.',hint:s.exam.turn===0?'지금 점수를 낼까, 마지막 무대를 위해 집중할까?':'목표를 넘겼다면 체력을 남기는 것도 선택이겠지.',reason:`${s.exam.turn+1}/2턴 · 목표 ${s.exam.target}점`,options:opts};
};
I.examPreview=(s,o)=>{
 const e=s.exam,base=s.stats[o.stat]*o.mult*(1+e.focus*.35)*(o.cost>s.stats.cond?.6:1);
 const out=[{key:'score',min:I.round(base*.95),max:I.round(base*1.05)},{key:'cond',min:I.round(I.clamp(s.stats.cond-o.cost)-s.stats.cond),max:I.round(I.clamp(s.stats.cond-o.cost)-s.stats.cond)}];
 if(o.focus)out.push({key:'focus',min:o.focus,max:o.focus});
 if(o.cost>s.stats.cond)out.push({key:'stress',min:Math.min(3,100-s.stats.stress),max:Math.min(3,100-s.stats.stress)});
 return out;
};
I.chooseExam=(s,o)=>{
 const b=I.clone(s.stats),p=I.examPreview(s,o),e=s.exam;
 const gain=I.round(p[0].min+I.random(s)*(p[0].max-p[0].min));
 I.apply(s,{cond:p[1].min,stress:o.cost>b.cond?3:0});
 e.score=I.round(e.score+gain);e.focus+=o.focus||0;e.turn++;
 s.stats.score=e.score;s.stats.focus=e.focus;
 let milestone='',next='scene';
 if(e.turn===2){
  const bonus=I.round(s.stats.ch*.07+s.stats.team*.05+(e.kind===2?s.stats.song*.15:0));
  const final=I.round(e.score+bonus);s.stats.score=final;
  const pass=final>=e.target;milestone=`${e.title}: ${final} / ${e.target}점 · 기본 적합도 보너스 +${bonus} · ${pass?'통과':'탈락'}`;
  if(pass){s.gates++;if(e.kind===2){I.apply(s,{fans:2,brand:12,debt:1500});milestone+=' · NEON:DAY로 데뷔';}s.exam=null;}
  else{s.ending=['오디션 탈락','데뷔조 탈락','데뷔 무산'][e.kind];next='end';s.exam=null;}
 }
 s.result={title:o.name,term:I.term(s),changes:I.delta(b,s.stats),choiceChanges:I.delta(b,s.stats),future:o.future,reason:'훈련을 무대 점수로 전환',milestone,next};
 s.decisions.push({term:I.term(s),title:s.scene.title,choice:o.name,reason:'관문 평가'});
 s.history.push(I.clone(s.result));s.mode='result';s.revealed=false;return true;
};
I.autoIndex=s=>{
 const opts=s.scene.options;
 if(s.exam){if(s.exam.turn===0&&s.exam.score<s.exam.target)return 1;if(s.exam.score>=s.exam.target)return 1;return 2;}
 let scores=opts.map(o=>I.preview(s,o).reduce((sum,x)=>{const v=(x.min+x.max)/2;let w={v:.7,d:.6,vi:.5,ch:1,cond:s.stats.cond<45?2:.12,stress:s.stats.stress>60?-1.2:-.2,team:.25,brand:.25,fans:1,debt:-.0008,cash:.0008,song:.7}[x.key]||0;return sum+v*w;},0)+(o.tag?4:0)+(o.buff?2:0));
 return scores.indexOf(Math.max(...scores));
};
I.carry=s=>{
 if(s.mode!=='result'||s.result.next!=='scene'||s.exam||I.age(s)<18)return false;
 const before=I.clone(s.stats);let count=0;
 for(let i=0;i<8;i++){
  I.advance(s);
  if(s.mode!=='scene'||s.exam||s.scene.kind!=='plan'||s.stats.cond<35||s.stats.stress>70)break;
  const idx=s.scene.options.findIndex(o=>o.focus===s.focus);if(idx<0)break;
  s.revealed=true;I.choose(s,idx);s.decisions[s.decisions.length-1].automatic=true;count++;
  if(s.result.next!=='scene')break;
 }
 if(s.mode==='result'&&s.result.next!=='scene')return true;
 if(s.mode==='result')I.advance(s);
 if(count>0&&s.mode==='scene'){
  s.resumeScene=I.clone(s.scene);
  s.result={title:'같은 계획을 유지했어요',term:`${count}개 반년 · ${count/2}년 자동 진행`,changes:I.delta(before,s.stats),choiceChanges:[],future:'새 제안·관문·위험 상태에서는 자동 진행 중단',reason:'플레이어가 계획 유지 선택',milestone:'반년마다 성장·비용·버프 만료를 개별 계산했어요.',next:'resume'};
  s.mode='result';s.revealed=false;
 }
 return true;
};
})(globalThis.ILR);
