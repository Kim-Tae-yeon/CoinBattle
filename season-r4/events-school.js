(function(I){'use strict';const E=I.event,O=I.option;
E('scholarship',['academy','candidate'],'MUSE 보컬 아카데미','원장 선생님','보컬 장학생 제안','{call}, 노래에 시간을 쓴 게 들리는구나. 전문반 자리를 내줄게. 대신 다른 수업 시간은 줄어들 거야.','한 분야의 성장이 빨라지면, 다른 가능성은 늦어질까?',[
O('take','보컬 전문반에 들어간다',{v:3,energy:-4},{buff:{stat:'v',rate:.4,duration:2},future:'다음 2시즌 보컬 성장 +40%'}),O('mix','댄스 수업도 병행한다',{v:3,d:4,debt:2,stress:3},{future:'추가 비용으로 약점도 보완'}),O('pace','지금의 페이스를 지킨다',{rep:3,energy:8},{future:'특강 대신 컨디션 확보'})],{plan:'v'});
E('crew',['academy','candidate'],'STEPUP 댄스 스튜디오','안무 강사','쇼케이스 팀의 앞자리','{call}, 반년 동안 움직임이 좋아졌어. 쇼케이스 앞자리를 맡을래? 혼자 잘 추는 것과 팀을 이끄는 건 다르단다.','눈에 띄는 자리와 팀의 신뢰, 무엇을 먼저 얻을까?',[
O('front','앞자리에 도전한다',{d:4,look:3,energy:-6},{buff:{stat:'d',rate:.4,duration:2},future:'다음 2시즌 댄스 성장 +40%'}),O('together','뒤처진 친구와 맞춘다',{team:7,rep:4,d:2},{tag:'trusted',future:'팀의 신뢰 · 유닛 제안 해금'}),O('record','개인 영상을 준비한다',{look:5,brand:2,debt:2},{future:'공개 무대보다 카메라 경험'})],{plan:'d'});
E('portfolio',['academy','candidate'],'NOVA 캐스팅팀','캐스팅 매니저','테스트 프로필 촬영','{name} 씨, 카메라에서 표정이 좋네요. 프로필을 더 찍을까요, 실기 영상부터 보완할까요?','좋은 첫인상을 지키려면 무엇이 더 필요할까?',[
O('profile','프로필 촬영에 투자한다',{look:5,debt:3},{buff:{stat:'look',rate:.4,duration:2},future:'다음 2시즌 비주얼 성장 +40%'}),O('skill','실기 영상을 다시 찍는다',{v:4,d:4,energy:-5},{future:'인상보다 실력 증명에 투자'}),O('simple','기본 프로필만 준비한다',{look:2,energy:5},{future:'추가 빚 없이 테스트 준비'})],{plan:'look'});
E('referral',['academy','candidate'],'학원 진학상담실','담당 강사','기획사에 보낼 추천서','{call}, 관계자에게 네 자료를 보낼 수 있어. 확실한 장점 한 줄로 소개할까, 고르게 준비된 학생으로 소개할까?','추천서의 한 줄이 회사가 나를 보는 기준이 되겠지.',[
O('voice','목소리를 앞세운다',{v:4,energy:-3},{future:'보컬 포지션 평가를 준비'}),O('stage','무대 영상을 앞세운다',{d:4,look:2,energy:-4},{future:'퍼포먼스로 첫인상 만들기'}),O('trust','꾸준함과 태도를 앞세운다',{rep:5,team:4},{future:'평가 보너스에 인성과 팀워크 반영'})]);
E('mentor',['candidate','trainee'],'NOVA 신인개발팀','담당 트레이너','첫 개인 멘토 배정','{name} 씨, 아직 정식 포지션은 정하지 않았어요. 이번 반년은 누구에게 더 배워보고 싶나요?','좋은 선생님을 만나는 건 다음 반년의 성장까지 바꾼다.',[
O('voice','보컬 멘토를 부탁한다',{energy:-3},{buff:{stat:'v',rate:.4,duration:2},future:'다음 2시즌 보컬 성장 +40%'}),O('dance','안무 멘토를 부탁한다',{energy:-4},{buff:{stat:'d',rate:.4,duration:2},future:'다음 2시즌 댄스 성장 +40%'}),O('mind','생활·팀 적응을 배운다',{rep:4,stress:-8},{tag:'selfcare',future:'회복 +20% · 장기관리 루틴'})]);
E('teampractice',['candidate','trainee'],'NOVA 트레이닝팀','합동 수업 담당','연습 시간을 나누자는 제안','{call}, 다른 반 연습생과 무대를 맞춰볼까? 네 개인 연습 시간은 줄지만 서로의 부족한 부분을 배울 수 있어.','내 실력만큼 함께 무대에 서는 법도 필요할까?',[
O('join','합동 연습에 참여한다',{team:8,d:2,energy:-4},{tag:'trusted',future:'팀의 신뢰 · 유닛 제안 해금'}),O('single','개인 보컬 연습을 지킨다',{v:5,stress:3},{future:'관계보다 개인 성장 우선'}),O('small','짧은 세션만 함께한다',{team:3,rep:3,energy:4},{future:'무리하지 않고 관계 시작'})]);
})(globalThis.ILR);
