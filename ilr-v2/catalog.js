/* ILR 2.0.0: content is data; previews and execution share the same rules. */
(function(I){
'use strict';
I.VERSION='2.0.0';
I.labels={v:'보컬',d:'댄스',vi:'비주얼',ch:'인성',cond:'컨디션',stress:'스트레스',team:'팀워크',brand:'브랜드',fans:'팬덤',debt:'미정산 비용',cash:'내 정산',song:'곡 완성도',score:'평가점수',focus:'집중'};
I.capped=['v','d','vi','ch','cond','stress','team','brand','song'];
I.routes=[
{id:'vocal',name:'보컬 학원',icon:'♪',org:'MUSE 보컬 아카데미',speaker:'원장 선생님',line:'우리 보컬학원에 온 걸 환영한단다, {call}. 네 목소리의 매력부터 찾아보자.',hint:'나는 어떤 매력을 먼저 키워야 할까?',effect:{v:12,ch:2,debt:700}},
{id:'dance',name:'댄스 학원',icon:'↗',org:'STEPUP 댄스 스튜디오',speaker:'전담 강사',line:'반가워, {call}. 반년 뒤 쇼케이스에서 네 움직임을 보여주자.',hint:'잘하는 걸 밀까, 부족한 기본기를 채울까?',effect:{d:12,vi:2,debt:700}},
{id:'audition',name:'공개 오디션',icon:'◎',org:'공개 오디션 운영팀',speaker:'오디션 디렉터',line:'{name} 씨, 짧은 무대에 가장 자신 있는 한 가지를 준비해주세요.',hint:'심사위원에게 무엇으로 기억되고 싶을까?',effect:{v:4,d:4,vi:4,debt:100}},
{id:'casting',name:'길거리 캐스팅',icon:'◇',org:'NOVA 캐스팅팀',speaker:'캐스팅 매니저',line:'{name} 씨, 분위기가 눈에 들어왔어요. 이제 실력도 함께 확인해보고 싶어요.',hint:'첫인상을 키울까, 무대 기본기를 먼저 갖출까?',effect:{vi:14,d:1,fans:.5,debt:100}}
];
I.plans=[
{id:'voice',name:'보컬에 집중',icon:'♪',effect:{v:6,cond:-4,stress:3},focus:'v',future:'보컬 제안 확률↑ · 다음 반년의 기본 훈련도 보컬'},
{id:'dance',name:'퍼포먼스에 집중',icon:'↗',effect:{d:6,cond:-5,stress:3},focus:'d',future:'퍼포먼스 제안 확률↑ · 다음 기본 훈련은 댄스'},
{id:'visual',name:'카메라·표현력',icon:'◇',effect:{vi:6,cond:-3,stress:2},focus:'vi',future:'센터·광고 제안 확률↑ · 다음 기본 훈련은 비주얼'},
{id:'balance',name:'기본기를 고르게',icon:'◈',effect:{v:3,d:3,vi:2,cond:-2},focus:'balance',future:'고른 성장 · 특정 포지션 제안은 적어짐'},
{id:'rest',name:'회복·태도 관리',icon:'+',effect:{cond:20,stress:-18,ch:3},focus:'rest',future:'체력 보존 · 이번 반년 실력 성장은 쉬어감'}
];
I.tags={
mainVocal:{name:'메인보컬',desc:'보컬 성장 ×1.2 · OST 제안 해금',stat:'v',factor:1.2},
performer:{name:'퍼포먼스 멤버',desc:'댄스 성장 ×1.2 · 챌린지 제안 해금',stat:'d',factor:1.2},
center:{name:'센터 후보',desc:'비주얼 성장 ×1.2 · 광고 테스트 해금',stat:'vi',factor:1.2},
public:{name:'공개 연습생',desc:'시즌 팬 유입 +0.8만 · 응대 사건 가중치↑'},
leader:{name:'팀의 버팀목',desc:'시즌 스트레스 -2 · 리더 제안 해금'},
live:{name:'공연형 가수',desc:'시즌 공연 매출 ×1.25 · 디너쇼 제안 해금'},
longrun:{name:'장기관리 계약',desc:'시즌 컨디션 +3 · 나이로 인한 소모 완화'},
indie:{name:'독립 레이블',desc:'개인 매출·비용 구조 · 제작 제안 해금'},
dinner:{name:'디너쇼 전환',desc:'팬 유지 +1만/시즌 · 50세 레전드 조건'}
};
I.buffDefs={vocal:{name:'보컬 멘토링',stat:'v',factor:1.4,turns:2},dance:{name:'안무 집중반',stat:'d',factor:1.4,turns:2},camera:{name:'카메라 특강',stat:'vi',factor:1.4,turns:2},push:{name:'회사 집중 지원',stat:'fans',factor:1.4,turns:2},recovery:{name:'회복 프로그램',stat:'cond',factor:1.4,turns:2}};
I.events=[];
I.option=(name,effect,future='',extra={})=>({name,effect,future,...extra});
I.event=(id,stages,title,org,speaker,line,hint,options,extra={})=>I.events.push({id,stages,title,org,speaker,line,hint,options,once:true,...extra});
})(globalThis.ILR=globalThis.ILR||{});
