(function(I){
'use strict';
I.clone=x=>JSON.parse(JSON.stringify(x));
I.round=n=>Math.round(n*10)/10;
I.clamp=n=>Math.max(0,Math.min(100,n));
I.random=s=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;};
I.age=s=>13+Math.floor(s.season/2);
I.term=s=>`${I.age(s)}세 ${s.season%2?'하반기':'상반기'}`;
I.stage=s=>s.season<2?'academy':s.season<4?'candidate':s.season<6?'trainee':s.season<8?'squad':I.age(s)<30?'career':'veteran';
I.stageNames={academy:'학원·입문',candidate:'연습 대기생',trainee:'기획사 연습생',squad:'데뷔조',career:'데뷔 아이돌',veteran:'장기 활동'};
I.value=(k,n)=>['debt','cash'].includes(k)?(Math.abs(n)>=10000?`${I.round(n/10000)}억`:`${I.round(n)}만`):`${I.round(n)}${k==='fans'?'만':''}`;
I.delta=(a,b)=>Object.keys(I.labels).filter(k=>Number.isFinite(a[k])&&Number.isFinite(b[k])&&Math.abs(a[k]-b[k])>.04).map(k=>({key:k,before:a[k],after:b[k],delta:I.round(b[k]-a[k])}));
I.apply=(s,e)=>{for(const [k,d] of Object.entries(e)){let n=(s.stats[k]||0)+d;if(k==='cash'&&n<0){s.stats.debt=I.round(s.stats.debt-n);n=0;}s.stats[k]=I.round(I.capped.includes(k)?I.clamp(n):Math.max(0,n));}};
I.factor=(s,k)=>s.tags.reduce((m,t)=>m*(I.tags[t]?.stat===k?I.tags[t].factor:1),1)*s.buffs.reduce((m,b)=>m*(b.stat===k?b.factor:1),1);
I.newGame=(name,route,seed=Date.now())=>{
 const r=I.routes.find(x=>x.id===route);if(!r)throw Error('시작 루트를 찾을 수 없습니다.');
 const s={schema:2,seed:seed>>>0,name:String(name||'하린').trim().slice(0,8)||'하린',route,season:0,mode:'scene',revealed:false,focus:route==='dance'?'d':route==='casting'?'vi':'v',tags:[],buffs:[],seen:{},lastEvents:[],history:[],decisions:[],strikes:0,weakSeasons:0,exhausted:0,gates:0,stats:{v:28,d:28,vi:32,ch:55,cond:80,stress:15,team:50,song:20,brand:8,fans:0,debt:0,cash:0,score:0,focus:0}};
 I.apply(s,r.effect);I.prepare(s);return s;
};
I.effectDraft=(state,opt,random)=>{
 const s={...state,stats:{...state.stats},tags:[...state.tags],buffs:state.buffs.map(b=>({...b}))};if(opt.focus)s.focus=opt.focus;
 if(opt.exclusive)s.tags=s.tags.filter(t=>!['mainVocal','performer','center'].includes(t));
 if(opt.tag&&!s.tags.includes(opt.tag))s.tags.push(opt.tag);
 if(opt.buff){const b=I.buffDefs[opt.buff];s.buffs=s.buffs.filter(x=>x.id!==opt.buff);s.buffs.push({id:opt.buff,...b,left:b.turns});}
 const e={};for(const [k,x] of Object.entries(opt.effect||{})){let v=Array.isArray(x)?x[0]+random()*(x[1]-x[0]):x;e[k]=v>0?I.round(v*I.factor(s,k)):v;}I.apply(s,e);
 const base=s.focus==='rest'?{cond:5,stress:-4}:s.focus==='balance'?{v:1,d:1,vi:1}:{[s.focus]:2};
 for(const k in base)if(base[k]>0)base[k]=I.round(base[k]*I.factor(s,k));I.apply(s,base);
 if(s.tags.includes('leader'))I.apply(s,{stress:-2});
 if(s.tags.includes('longrun'))I.apply(s,{cond:3});
 if(s.season>=8){I.apply(s,{fans:(s.tags.includes('public')?.8:0)+(s.tags.includes('dinner')?1:0),brand:I.age(s)>=30?-1:-.4});}
 if(I.age(s)>=30)I.apply(s,{cond:s.tags.includes('longrun')?-1:-3,v:-.3,d:-.5,vi:-.3});
 return s;
};
I.preview=(s,opt)=>{
 if(s.exam)return I.examPreview(s,opt);
 const a=I.effectDraft(s,opt,()=>0),b=I.effectDraft(s,opt,()=>1);
 I.settle(a);I.settle(b);const lo=a.stats,hi=b.stats;
 return Object.keys(I.labels).filter(k=>Math.abs(lo[k]-s.stats[k])>.04||Math.abs(hi[k]-s.stats[k])>.04).map(k=>({key:k,min:I.round(Math.min(lo[k],hi[k])-s.stats[k]),max:I.round(Math.max(lo[k],hi[k])-s.stats[k])}));
};
I.prepare=s=>{
 s.mode='scene';s.revealed=false;
 if(s.exam){s.scene=I.examScene(s);return;}
 const stage=I.stage(s),age=I.age(s),r=I.routes.find(x=>x.id===s.route);
 let eligible=I.events.filter(e=>e.stages.includes(stage)&&(!e.requires||s.tags.includes(e.requires))&&(!e.minAge||age>=e.minAge)&&(!e.once||!s.seen[e.id])&&(!s.seen[e.id]||s.season-s.seen[e.id]>3));
 const recovery=eligible.find(e=>e.recovery&&(s.stats.cond<30||s.stats.stress>80));
 let ev=recovery;
 if(!ev&&s.season>0){
  const scheduled=s.season<8?s.season%2===1||s.season===4||s.season===6:s.season%4===0;
  if(scheduled){eligible=eligible.filter(e=>!e.recovery&&(!e.risk||(s.stats.stress>55||s.stats.ch<55)));
   const pri=eligible.filter(e=>e.priority);if(pri.length)eligible=pri;
   if(eligible.length){
    const affinity={mentor:['v','d'],recommend:['v'],scholarship:['vi'],roommate:['v'],public:['vi'],camera:['vi'],comeback:['v','d'],tour:['v'],voicecare:['v']};
    const weights=eligible.map(e=>1+(affinity[e.id]?.includes(s.focus)?3:0)+(e.risk&&s.tags.includes('public')?2:0));
    let roll=I.random(s)*weights.reduce((a,b)=>a+b,0);ev=eligible[eligible.length-1];
    for(let i=0;i<eligible.length;i++){roll-=weights[i];if(roll<0){ev=eligible[i];break;}}
   }
  }
 }
 if(ev){const context=I.clone(ev);if(s.season<4&&!['vocal','dance'].includes(s.route)){context.org=context.org.replace('학원','기획사');context.speaker=context.speaker.replace('원장 선생님','교육 담당자');}s.scene={...context,kind:'event',reason:ev.requires?`${I.tags[ev.requires].name} 선택으로 열린 제안`:ev.recovery?'컨디션·스트레스 경고로 일정 재협의':`${I.stageNames[stage]} 단계의 회사·학원 제안`};return;}
 const desired=I.plans.find(p=>p.focus===s.focus)||I.plans[0];
 const other=I.plans.filter(p=>p.id!==desired.id&&p.id!=='rest');
 const rotate=other[(s.season+Math.floor(I.random(s)*other.length))%other.length];
 const plans=[desired,rotate,I.plans.find(p=>p.id==='rest')];
 if(desired.id==='rest')plans[2]=I.plans.find(p=>p.id==='balance');
 const first=s.season===0;
 s.scene={id:'plan',kind:'plan',title:'이번 반년, 무엇을 키울까?',org:first?r.org:s.season<4&&['vocal','dance'].includes(s.route)?'학원 교육팀':'기획사 트레이닝팀',speaker:first?r.speaker:s.season<4?'담당 강사':'전담 트레이너',line:first?r.line:'{name}, 이번 반년의 계획을 정하자. 장점을 더 키워도 좋고, 회복을 먼저 해도 괜찮아.',hint:first?r.hint:'지금 부족한 것과 다음에 얻고 싶은 기회는 무엇일까?',reason:'6개월 성장 계획 · 반복 레슨은 자동 처리',options:I.clone(plans)};
};
})(globalThis.ILR);
