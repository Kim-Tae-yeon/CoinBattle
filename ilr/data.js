'use strict';
globalThis.ILR = {};
(() => {
const I = globalThis.ILR;
I.version = '0.4.1';
I.labels = {v:'보컬',d:'댄스',vi:'비주얼',ch:'인성',cond:'컨디션',stress:'스트레스',team:'팀워크',song:'곡 완성도',fans:'팬덤',brand:'브랜드',debt:'미정산 비용',cash:'내 정산',score:'평가 점수',focus:'집중'};
I.stats = ['v','d','vi','ch','cond','stress','team','song','fans','brand','debt','cash'];
I.clamp = (v,lo=0,hi=100) => Math.max(lo,Math.min(hi,v));
I.round = n => Math.round(n*10)/10;
I.clone = x => JSON.parse(JSON.stringify(x));
I.random = s => { s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0; return s.rng/4294967296; };
I.age = s => 13+Math.floor(s.season/2);
I.date = s => `${I.age(s)}세 ${s.season%2?'하반기':'상반기'}`;
I.stages = ['학원·입문','기획사 연습생','데뷔조','데뷔 아이돌'];
I.money = n => n>=100 ? `${I.round(n/100)}억` : `${Math.round(n*100)}만`;
I.value = (k,n) => ['cash','debt'].includes(k)?I.money(n):`${I.round(n)}${k==='fans'?'만':''}`;
I.good = (k,n) => ['debt','stress'].includes(k) ? n<0 : n>0;
I.callName = n => {const c=n.charCodeAt(n.length-1);return n+(c>=44032&&c<=55203?((c-44032)%28?'아':'야'):' 씨');};
I.routes = [
{id:'vocal',name:'보컬 학원',icon:'♪',kind:'기본기형',org:'MUSE 보컬 아카데미',speaker:'원장 선생님',track:'v',effect:{v:12,ch:2,debt:7},quote:'우리 보컬학원에 온 걸 환영한단다, {call}. 첫 반년은 네 목소리의 매력을 찾아보자.',hint:'나는 어떤 매력을 먼저 키워야 할까?'},
{id:'dance',name:'댄스 학원',icon:'↗',kind:'퍼포먼스형',org:'STEPUP 댄스 스튜디오',speaker:'메인 강사',track:'d',effect:{d:12,vi:2,debt:7},quote:'반가워, {call}. 기본기를 다질지, 네 이름을 기억하게 할 무대를 만들지 정해보자.',hint:'완성도와 존재감, 무엇을 먼저 키울까?'},
{id:'audition',name:'공개 오디션',icon:'◎',kind:'직접 도전',org:'공개 오디션 운영팀',speaker:'현장 디렉터',track:'v',effect:{v:4,d:4,vi:4,debt:1},quote:'{name} 씨, 다음 오디션까지 반년입니다. 짧은 무대에 남길 장점을 하나 정해보세요.',hint:'한 가지 무기를 만들까, 약점을 메울까?'},
{id:'casting',name:'길거리 캐스팅',icon:'◇',kind:'비주얼형',org:'NOVA 캐스팅팀',speaker:'캐스팅 매니저',track:'vi',effect:{vi:14,fans:0.5,debt:1},quote:'{name} 씨의 분위기가 눈에 들어왔어요. 다음 테스트에서는 그 첫인상을 실력으로 증명해봐요.',hint:'첫인상을 밀어볼까, 기본기를 보완할까?'}
];
I.tags = {vocalist:'메인보컬 후보',performer:'퍼포먼스 리더',center:'센터 후보',public:'공개연습생',loyal:'팬덤형',longrun:'장기관리',indie:'독립 운영',dinner:'디너쇼 전환'};
I.tagGrowth = {vocalist:'v',performer:'d',center:'vi'};
I.planData = {
v:{name:'보컬에 집중',icon:'♪',effect:{v:4,cond:-4,stress:2},growth:{v:6,d:1},future:'보컬 성장 +40% · 보컬 제안 우선'},
d:{name:'퍼포먼스 강화',icon:'↗',effect:{d:4,cond:-5,stress:3},growth:{d:6,vi:1},future:'댄스 성장 +40% · 안무 제안 우선'},
vi:{name:'카메라·비주얼',icon:'◇',effect:{vi:4,cond:-3,stress:2},growth:{vi:6,v:1},future:'비주얼 성장 +40% · 센터 제안 우선'},
care:{name:'회복·태도 관리',icon:'＋',effect:{cond:12,stress:-8,ch:2},growth:{cond:8,stress:-6,ch:1,v:1},future:'성장은 느리지만 컨디션·인성을 회복'},
fans:{name:'팬과의 반년',icon:'♡',effect:{ch:2,cond:-3},growth:{fans:5,brand:3,stress:2},future:'팬덤을 쌓아 공연·팬클럽 기회를 만든다'},
money:{name:'행사·광고 활동',icon:'₩',effect:{brand:2,cond:-5},growth:{brand:3,stress:4},future:'브랜드에 비례한 수익 · 정산에서 비용 상환'}
};
I.events=[];
I.option=(id,name,effect={},tag=null,buff=null,future='')=>({id,name,effect,tag,buff,future});
})();
