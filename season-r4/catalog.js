/* Idol Long Run 0.4.0 — game data; all companies and contracts are fictional. */
(function(g){'use strict';
const I=g.ILR={version:'0.4.0',events:[]};
I.labels={v:'보컬',d:'댄스',look:'비주얼',rep:'인성',energy:'컨디션',stress:'스트레스',team:'팀워크',song:'곡 완성도',fans:'팬덤',brand:'브랜드',debt:'남은 빚',cash:'내 정산',score:'평가 점수',focus:'집중'};
I.statKeys=Object.keys(I.labels);
I.roles=['vocal','dancer','center'];
I.tags={vocal:{name:'메인보컬 후보',stat:'v',rate:.15,desc:'보컬 성장 +15% · 라이브/OST 제안 해금'},dancer:{name:'퍼포먼스 리더',stat:'d',rate:.15,desc:'댄스 성장 +15% · 안무 제작 제안 해금'},center:{name:'센터 후보',stat:'look',rate:.15,desc:'비주얼 성장 +15% · 화보 제안 해금'},public:{name:'공개 연습생',stat:'fans',rate:.2,desc:'팬 증가량 +20% · 공개 무대 제안 해금'},trusted:{name:'팀의 신뢰',stat:'team',rate:.2,desc:'팀워크 성장 +20% · 유닛 제안 해금'},live:{name:'라이브 아티스트',stat:'fans',rate:.15,desc:'팬 증가량 +15% · 라이브 음원 제안 해금'},selfcare:{name:'장기관리 루틴',stat:'energy',rate:.2,desc:'컨디션 회복 +20% · 장기 활동에 유리'},loyal:{name:'코어 팬덤',stat:'fans',rate:.15,desc:'팬 증가량 +15% · 팬 투어 제안 해금'},renewal:{name:'수익 재계약',desc:'향후 아티스트 매출 몫 50% → 60%'},solo:{name:'솔로 전환',desc:'향후 정산 인원 5명 → 1명 · 솔로 앨범 제안'},dinner:{name:'디너쇼 전환',desc:'공연 매출 +25% · 레전드 엔딩 조건 중 하나'}};
I.routes=[
{id:'vocal',name:'보컬 학원',icon:'♪',sub:'목소리로 시작하는 인생',org:'MUSE 보컬 아카데미',speaker:'원장 선생님',quote:'우리 보컬학원에 온 걸 환영한단다, {call}. 네 목소리에서 어떤 매력을 키울지 함께 찾아보자.',thought:'나는 어떤 매력을 먼저 키워야 할까?',effect:{v:12,rep:2,debt:7}},
{id:'dance',name:'댄스 학원',icon:'↗',sub:'무대 위 존재감으로 시작',org:'STEPUP 댄스 스튜디오',speaker:'담당 강사',quote:'반가워, {call}. 이번 반년은 기본기와 네 스타일을 함께 찾을 거야. 어떤 무대를 만들고 싶니?',thought:'잘하는 춤을 더 밀까, 부족한 부분을 채울까?',effect:{d:12,look:2,debt:7}},
{id:'audition',name:'공개 오디션',icon:'◎',sub:'비용은 적게, 직접 도전',org:'신인개발팀',speaker:'오디션 담당자',quote:'{name} 씨, 심사위원이 기억할 장점 하나를 준비해주세요. 다음 모집까지 반년 남았습니다.',thought:'짧은 무대에서 나를 기억하게 할 무기는 뭘까?',effect:{v:4,d:4,look:4,debt:1}},
{id:'casting',name:'길거리 캐스팅',icon:'◇',sub:'첫인상을 실력으로 증명',org:'NOVA 캐스팅팀',speaker:'캐스팅 매니저',quote:'{name} 씨, 분위기가 좋아서 명함을 드렸어요. 회사 테스트에서는 그 첫인상을 실력으로 증명해야 해요.',thought:'눈에 띄는 매력을 밀까, 기본기부터 다질까?',effect:{look:14,d:1,fans:.5,debt:1}}
];
I.option=(id,name,effect={},extra={})=>({id,name,effect,...extra});
I.event=(id,stages,org,speaker,title,quote,thought,options,extra={})=>I.events.push({id,stages,org,speaker,title,quote,thought,options,...extra});
I.plans={
v:{id:'v',name:'보컬에 집중',icon:'♪',effect:{v:8,energy:-5,stress:3},future:'보컬 수업·포지션 제안에 영향'},
d:{id:'d',name:'퍼포먼스에 집중',icon:'↗',effect:{d:8,energy:-6,stress:3},future:'안무·리더 제안에 영향'},
look:{id:'look',name:'비주얼·카메라 집중',icon:'◇',effect:{look:7,energy:-3,stress:2},future:'센터·공개 제안에 영향'},
balance:{id:'balance',name:'기본기 균형 잡기',icon:'⊕',effect:{v:3,d:3,look:2,team:3,energy:-3},future:'주력 대신 약점을 줄이는 반년'},
rest:{id:'rest',name:'회복·태도 관리',icon:'+',effect:{energy:18,stress:-14,rep:4,team:3},future:'성장 속도 대신 다음 평가 컨디션 확보'},
album:{id:'album',name:'앨범·라이브 중심',icon:'♪',effect:{v:2,brand:6,fans:[3,5],energy:-7,stress:4},business:'album',future:'방송·앨범 노출로 팬을 확장'},
fans:{id:'fans',name:'팬싸·소통 중심',icon:'♡',effect:{fans:[4,6],rep:2,brand:2,energy:-4,stress:1},business:'fans',future:'유행보다 오래 남는 관객 만들기'},
concert:{id:'concert',name:'콘서트 중심',icon:'◎',effect:{fans:[1,3],brand:3,energy:-12,stress:5},business:'concert',future:'팬덤을 공연 수익으로 전환'},
ads:{id:'ads',name:'행사·광고 중심',icon:'₩',effect:{look:1,brand:3,energy:-6,stress:3},business:'ads',future:'다음 반년에는 팬과 컨디션도 점검'},
care:{id:'care',name:'재정비·보컬 관리',icon:'+',effect:{energy:18,stress:-12,v:3,rep:3,brand:-2},future:'수익 활동을 쉬고 커리어 수명 확보'}
};
I.gateCards=[{id:'sing',name:'보컬 어필',icon:'♪',stat:'v',mult:.88,cost:6},{id:'dance',name:'댄스 어필',icon:'↗',stat:'d',mult:.88,cost:6},{id:'pose',name:'비주얼 어필',icon:'◇',stat:'look',mult:.88,cost:6},{id:'focus',name:'집중',icon:'◎',stat:'best',mult:.25,cost:3,focus:2},{id:'burst',name:'하이라이트',icon:'★',stat:'best',mult:1.2,cost:12},{id:'breath',name:'호흡 정리',icon:'+',stat:'rep',mult:.25,cost:-10,focus:1}];
I.gates={1:{id:'audition',title:'기획사 입사 오디션',target:90,org:'NOVA 신인개발팀',speaker:'오디션 심사위원'},7:{id:'squad',title:'데뷔조 선발 무대',target:130,org:'NOVA 트레이닝팀',speaker:'평가 디렉터'},9:{id:'debut',title:'데뷔 확정 무대',target:150,org:'NOVA A&R',speaker:'제작 총괄'}};
})(globalThis);
