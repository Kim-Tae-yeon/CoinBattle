(function(I){'use strict';const E=I.event,O=I.option;
E('role-v',['trainee','squad'],'NOVA A&R','보컬 디렉터','메인보컬 후보 제안','{name} 씨, 꾸준히 키운 목소리가 팀의 색깔이 될 수 있어요. 메인보컬 후보로 밀어볼까요? 센터 연습 시간은 줄어들 거예요.','한 자리를 맡는 건 다른 자리의 가능성을 내려놓는 일일까?',[
O('yes','메인보컬 후보를 맡는다',{v:4,energy:-4},{tag:'vocal',future:'보컬 성장 +15% · OST 제안 해금'}),O('all','아직 포지션을 열어둔다',{v:2,d:3,look:2},{future:'특화 보정 없이 균형 유지'}),O('center','센터 테스트를 요청한다',{look:4,team:-3},{tag:'center',future:'비주얼 성장 +15% · 화보 해금'})],{plan:'v'});
E('role-d',['trainee','squad'],'NOVA 퍼포먼스팀','안무 디렉터','퍼포먼스 리더 제안','{call}, 동작을 이해하는 속도가 좋아. 이제 팀의 안무를 정리해볼래? 네 연습뿐 아니라 다른 멤버도 챙겨야 해.','책임이 늘어도 무대 전체를 만드는 쪽이 나와 맞을까?',[
O('lead','퍼포먼스 리더를 맡는다',{d:4,stress:5},{tag:'dancer',future:'댄스 성장 +15% · 안무 제작 해금'}),O('learn','일단 개인 실력을 쌓는다',{d:5,energy:-3},{future:'책임 없이 기본기 강화'}),O('help','서브 리더로 팀을 돕는다',{team:8,rep:3},{tag:'trusted',future:'팀의 신뢰 · 유닛 제안 해금'})],{plan:'d'});
E('role-c',['trainee','squad'],'NOVA 비주얼팀','크리에이티브 디렉터','센터 카메라 테스트','{name} 씨, 네가 중앙에 서면 화면이 살아나요. 센터 후보 테스트를 해보죠. 같은 자리를 준비한 멤버에게도 설명이 필요해요.','앞에 서는 기회와 동료의 신뢰를 함께 지킬 수 있을까?',[
O('take','센터 경쟁을 수락한다',{look:4,brand:3,team:-5},{tag:'center',future:'비주얼 성장 +15% · 화보 해금'}),O('team','팀 조합을 먼저 맞춘다',{team:8,rep:4},{tag:'trusted',future:'팀의 신뢰 · 유닛 제안 해금'}),O('voice','보컬 파트에 도전한다',{v:4,energy:-4},{tag:'vocal',future:'보컬 성장 +15% · OST 해금'})],{plan:'look'});
E('public',['trainee','squad'],'NOVA 홍보팀','홍보 담당자','공개 연습생 제안','{call}, 데뷔 전에 연습 영상을 공개하자는 얘기가 나왔어. 먼저 팬을 만날 수 있지만 연습실 밖의 행동도 더 많이 보일 거야.','일찍 알려지는 만큼 준비해야 할 책임도 늘겠지.',[
O('open','공개 연습생을 수락한다',{fans:2,brand:4,stress:5},{tag:'public',future:'팬 증가 +20% · 공개 무대 해금'}),O('ready','실력을 먼저 준비한다',{v:4,d:3,energy:-4},{future:'노출보다 다음 평가 준비'}),O('limited','팀 영상으로만 공개한다',{fans:1,team:4,rep:2},{future:'개인 노출 대신 팀 인지도'})]);
E('line-conflict',['trainee','squad'],'NOVA 트레이닝팀','팀 담당 매니저','같은 파트를 원하는 두 사람','{call}, 같은 파트를 원하는 멤버가 있어. 혼자 결정하기보다 이번 평가에서 어떻게 나눌지 먼저 얘기해보자.','내 파트를 지키는 것과 팀에 남는 것은 같은 목표일까?',[
O('duet','듀엣 파트로 바꾸자고 한다',{team:9,rep:3,v:2},{tag:'trusted',future:'팀의 신뢰 · 유닛 제안 해금'}),O('prove','실력 평가로 정하자고 한다',{v:6,team:-4,stress:4},{future:'갈등을 감수하고 파트 경쟁'}),O('yield','이번에는 다른 파트를 맡는다',{team:5,stress:-6},{future:'파트 대신 관계와 멘탈 확보'})]);
E('title',['squad'],'NOVA A&R','데뷔곡 프로듀서','우리 팀의 첫 타이틀곡','{name} 씨, 데뷔곡의 방향을 결정할 때예요. 라이브가 돋보이는 곡과 안무가 강한 곡 중 어떤 무대가 어울릴까요?','지금까지 키운 장점이 데뷔 무대에서 들리고 보였으면 좋겠다.',[
O('live','라이브가 돋보이는 곡',{song:12,v:5,energy:-6},{tag:'live',future:'팬 증가 +15% · 라이브 음원 해금'}),O('stage','안무가 강한 곡',{song:12,d:5,energy:-7},{tag:'dancer',future:'댄스 성장 +15% · 안무 제작 해금'}),O('team','모두 소화 가능한 곡',{song:8,team:8,stress:-4},{future:'완성도보다 팀의 안정성'})],{priority:3});
E('public-stage',['squad','career'],'NOVA 홍보팀','콘텐츠 PD','공개 영상의 다음 무대','먼저 공개한 연습 영상에 반응이 왔어요, {name} 씨. 기다리는 팬에게 어떤 모습을 보여줄까요?','공개 연습생을 선택했던 일이 다음 기회로 이어졌구나.',[
O('live','라이브 영상을 공개한다',{fans:[2,4],v:3,energy:-5},{tag:'live',future:'라이브 음원 제안으로 이어짐'}),O('talk','팬과 이야기하는 영상을 찍는다',{fans:3,rep:4},{tag:'loyal',future:'팬 증가 +15% · 팬 투어 해금'}),O('practice','연습 과정을 공개한다',{fans:2,team:4,stress:-3},{future:'화려함 대신 성장 과정을 공유'})],{need:'public',priority:5});
})(globalThis.ILR);
