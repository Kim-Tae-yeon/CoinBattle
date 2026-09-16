'use strict';
(() => {
const I=ILR;
I.fill=(s,text)=>text.replaceAll('{name}',s.name).replaceAll('{call}',I.callName(s.name)).replaceAll('{company}',s.company).replaceAll('{school}',I.routes.find(r=>r.id===s.route)?.org||'진로 상담팀');
I.scene=s=>{
 const r=I.routes.find(x=>x.id===s.route);
 if(s.step==='event'){const e=I.events.find(e=>e.id===s.eventId);return {title:e.title,org:I.fill(s,e.org),speaker:e.speaker,icon:'✦',quote:I.fill(s,e.quote),hint:e.hint,cause:s.eventCause};}
 if(s.step==='exam')return {title:s.exam.title,org:s.company+' 평가위원회',speaker:'평가 디렉터',icon:'★',quote:`${s.name} 씨, 두 번의 어필로 목표 점수를 넘겨보세요. 먼저 집중하고 다음 어필을 강화하는 방법도 있습니다.`,hint:'남은 어필 횟수와 컨디션을 함께 보자.',cause:`카드 점수 + 역량 보너스 ${I.examBonus(s)}점으로 판정`};
 if(s.season===0)return {title:'첫 반년의 방향',org:r.org,speaker:r.speaker,icon:r.icon,quote:I.fill(s,r.quote),hint:r.hint,cause:'성장 방향 1회 → 관련 제안 → 반년 결과'};
 const choices=[
 ['훈련 방향을 정하자. 잘하는 것을 더 키울 수도, 쉬면서 다음 무대를 준비할 수도 있어.','지금 내 커리어에 부족한 것은 무엇일까?'],
 ['지난 반년의 결과를 확인했어. 같은 방향을 이어갈지, 다른 가능성을 열지 네 생각을 듣고 싶어.','앞선 선택을 이어갈 이유가 아직 남아 있을까?'],
 ['반년 일정을 마련했어. 시간을 어디에 쓰느냐에 따라 다음에 들어올 제안도 달라질 거야.','이번 성장으로 어떤 제안을 받고 싶을까?']
 ][s.season%3];
 return {title:s.stage===3?'다음 반년의 활동':'이번 반년의 성장',org:s.stage===0?r.org:s.company+(s.stage===3?' 매니지먼트':' 트레이닝팀'),speaker:s.stage===0?r.speaker:s.stage===3?'담당 매니저':'트레이닝 팀장',icon:'◎',quote:I.callName(s.name)+', '+choices[0],hint:choices[1],cause:s.stage<3?`이번 반년 공통 비용 ${I.money([1.5,2.4,4.5][s.stage])}`:'반년마다 성장·수익·컨디션을 함께 결산'};
};
})();
