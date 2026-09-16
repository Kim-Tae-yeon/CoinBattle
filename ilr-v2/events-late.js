(function(I){
'use strict';
const e=I.event,o=I.option;
e('renew',['career','veteran'],'재계약 조건 제안','기획사 경영지원팀','계약 담당자','{name} 씨, 다음 계약은 단기 성과와 오래 활동할 여건 중 어디에 무게를 둘지 이야기하고 싶어요.','계약금보다 오래 남을 조건은 무엇일까?',[
o('장기 관리 우선',{cond:10,ch:3,cash:-200},'컨디션 +3/시즌 · 노화 소모 완화',{tag:'longrun'}),o('대형 홍보 지원',{brand:8,stress:6,debt:400},'팬 성장 ×1.4 · 2시즌',{buff:'push'}),o('독립 레이블 준비',{cash:-600,team:-6,brand:3},'개인 매출·비용 구조로 전환',{tag:'indie'})],{minAge:24});
e('rookie',['veteran'],'신인에게 옮겨가는 지원','기획사 전략팀','활동 총괄','신인 팀에 홍보 예산이 더 배정됐어. 네 활동은 이제 다른 방식으로 설득해야 해.','유행과 경쟁할까, 나를 찾는 관객을 지킬까?',[
o('공연 중심으로 전환',{v:4,fans:3,brand:-3},'공연형 가수 · 공연 매출 ×1.25',{tag:'live'}),o('새 콘셉트로 경쟁',{vi:4,brand:7,cond:-8},'카메라 성장 ×1.4 · 2시즌',{buff:'camera'}),o('장기 관리 협상',{cond:10,stress:-8,cash:-200},'컨디션 +3/시즌',{tag:'longrun'})],{priority:true});
e('indie',['career','veteran'],'독립 후 첫 제작','독립 레이블 제작실','협력 프로듀서','이제 제작비도 우리가 책임져야 해. 큰 앨범과 작은 공연 중 먼저 굴릴 바퀴를 정하자.','자유를 얻은 만큼 위험도 내 몫이겠지.',[
o('정규 앨범 제작',{cash:-700,brand:8,fans:[3,6]},'팬 성장 ×1.4 · 2시즌',{buff:'push'}),o('소극장 라이브',{cash:200,v:4,fans:2,cond:-4},'공연 매출 ×1.25',{tag:'live'}),o('보컬 레슨 병행',{cash:150,v:3,brand:-2},'노출보다 안정적 수입')],{requires:'indie',priority:true});
e('voicecare',['veteran'],'목소리를 오래 지키는 법','기획사 아티스트케어팀','보컬 코치','예전 키로 모든 곡을 부를 필요는 없어. 지금 목소리에 맞는 편곡을 해보자.','기량을 유지하는 것과 무리하는 것은 다르겠지.',[
o('새 편곡과 발성',{v:5,cond:8,cash:-300},'장기관리 · 컨디션 +3/시즌',{tag:'longrun'}),o('기존 무대를 유지',{brand:4,fans:2,cond:-8},'익숙한 무대 · 몸의 부담'),o('반년 재정비',{cond:20,stress:-12,brand:-5},'회복 성장 ×1.4 · 2시즌',{buff:'recovery'})]);
e('dinner',['veteran'],'디너쇼로의 초대','기획사 공연사업팀','공연 기획자','오래 함께한 관객이 편하게 머무는 공연을 원해. 이제 이름 자체로 티켓을 팔아보자.','새로운 팬보다 평생 관객을 남길 수 있을까?',[
o('디너쇼 전환',{fans:5,v:3,brand:-3},'팬 유지 +1만/시즌 · 레전드 조건',{tag:'dinner'}),o('투어를 더 확대',{cash:500,fans:4,cond:-10},'당장의 규모와 수익'),o('작은 공연부터',{fans:3,cond:6,cash:100},'무리하지 않고 관객 유지')],{requires:'live',minAge:40,priority:true});
e('recovery',['academy','candidate','trainee','squad','career','veteran'],'일정을 줄일 때','아티스트케어팀','전담 관리자','지금 컨디션으로는 훈련 효율도 떨어져. 이번 반년의 일정을 다시 잡아야겠어.','잠시 쉬는 것이 다음 기회를 지킬 수도 있겠지.',[
o('회복을 최우선',{cond:24,stress:-18,brand:-2},'다음 기본 훈련도 회복',{focus:'rest',buff:'recovery'}),o('반일 훈련으로 조정',{cond:12,v:3,stress:-7},'회복과 보컬을 병행',{focus:'v'}),o('멘탈·팀 대화',{cond:8,ch:6,team:6},'팀의 버팀목 · 스트레스 -2/시즌',{tag:'leader'})],{recovery:true,once:false});
})(globalThis.ILR);
