'use strict';
(() => {
const I=ILR,$=id=>document.getElementById(id),KEY='idol-season-041';
let s=null,screen='home',busy=false,auto=false,timer=null;
const valid=x=>x&&x.version===I.version&&Number.isFinite(x.v)&&Number.isFinite(x.season)&&x.season>=0&&x.season<=76&&x.stage>=0&&x.stage<=3&&Array.isArray(x.hand)&&Array.isArray(x.tags)&&Array.isArray(x.buffs)&&Array.isArray(x.reports)&&['plan','event','exam','report','end'].includes(x.step)&&(x.step!=='event'||I.events.some(e=>e.id===x.eventId))&&(x.step!=='exam'||x.exam&&x.exam.round<2);
try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(valid(x)){s=x;screen='game';}}catch{}
const save=()=>{try{if(s&&s.step!=='route')localStorage.setItem(KEY,JSON.stringify(s));}catch{}};
const stop=()=>{auto=false;clearTimeout(timer);timer=null;$('auto').textContent='자동';$('auto').setAttribute('aria-pressed','false');};
function render(){
 const decision=screen==='routes'||screen==='game'&&!['report','end'].includes(s.step);
 document.body.classList.toggle('decision-mode',decision);
 $('boot').hidden=true;$('auto').hidden=screen!=='game'||s.step==='end';
 if(screen==='home')$('view').innerHTML=I.homeHTML();
 else if(screen==='routes')$('view').innerHTML=I.routesHTML();
 else if(s.step==='report')$('view').innerHTML=I.reportHTML(s);
 else if(s.step==='end'){$('view').innerHTML=I.endingHTML(s);stop();}
 else $('view').innerHTML=s.revealed===s.serial?I.choicesHTML(s):I.introHTML(s);
 I.animateBars();save();
}
function reset(){stop();$('info').close();s=null;screen='home';try{localStorage.removeItem(KEY);}catch{}window.scrollTo(0,0);render();}
function askReset(){stop();if(!s||screen==='home'){reset();return;}showPanel('새 인생을 시작할까요?','<p class="report-meta">현재 커리어의 저장 기록을 지우고 다시 시작합니다.</p><div class="confirm-actions"><button class="primary" data-confirm-reset>새 인생 시작</button><button class="secondary" data-cancel>계속 플레이</button></div>');}
function showPanel(title,html){$('info-title').textContent=title;$('info-body').innerHTML=html;if(!$('info').open)$('info').showModal();I.animateBars();}
function reveal(){if(busy||!s)return;s.revealed=s.serial;render();}
function next(){if(busy||!s)return;I.next(s);window.scrollTo(0,0);render();}
function choose(id,button){if(busy||!s||s.revealed!==s.serial||$('info').open||!$('rotate').hidden)return;busy=true;const r=button?.getBoundingClientRect(),point=r?{x:r.left+r.width*.7,y:r.top+r.height*.5}:null;try{if(!I.choose(s,id)){busy=false;return;}window.scrollTo(0,0);render();I.motion(point,s.last.changes);}finally{setTimeout(()=>{busy=false;},matchMedia('(prefers-reduced-motion: reduce)').matches?60:320);}}
function tick(){if(!auto||!s||s.step==='end'){stop();return;}if(!busy&&!$('info').open&&!document.hidden&&$('rotate').hidden){if(s.step==='report')next();else if(s.revealed!==s.serial)reveal();else choose(I.autoChoice(s));}timer=setTimeout(tick,900);}
$('auto').addEventListener('click',()=>{if(auto)stop();else{auto=true;$('auto').textContent='정지';$('auto').setAttribute('aria-pressed','true');timer=setTimeout(tick,900);}});
$('reset').addEventListener('click',askReset);$('close-info').addEventListener('click',()=>$('info').close());
document.addEventListener('submit',ev=>{if(ev.target.id!=='start-form')return;ev.preventDefault();const name=$('player-name').value;$('player-name').blur();s=I.newGame(name);screen='routes';window.scrollTo(0,0);render();});
document.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-route')){if(busy||screen!=='routes')return;if(I.start(s,b.dataset.route)){screen='game';render();}}
 else if(b.hasAttribute('data-reveal'))reveal();
 else if(b.hasAttribute('data-choice'))choose(b.dataset.choice,b);
 else if(b.hasAttribute('data-next'))next();
 else if(b.hasAttribute('data-info')){stop();const p=I.panel(s,b.dataset.info);showPanel(...p);}
 else if(b.hasAttribute('data-reset'))askReset();
 else if(b.hasAttribute('data-confirm-reset'))reset();
 else if(b.hasAttribute('data-cancel'))$('info').close();
 else if(b.hasAttribute('data-home')){screen='home';render();}
});
document.addEventListener('pointerdown',ev=>{const b=ev.target.closest('[data-choice]');if(!b)return;for(const chip of b.querySelectorAll('[data-stat]'))document.querySelector(`[data-hud="${chip.dataset.stat}"]`)?.classList.add('related');});
for(const type of ['pointerup','pointercancel'])document.addEventListener(type,()=>document.querySelectorAll('.related').forEach(x=>x.classList.remove('related')));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.IdolApp={version:I.version,getState:()=>s?I.clone(s):null,getScreen:()=>screen,isBusy:()=>busy,isAuto:()=>auto};
if(globalThis.ILR_TEST===true||new URLSearchParams(location.search).has('test'))window.IdolApp.load=x=>{stop();s=I.clone(x);screen='game';busy=false;render();};
render();
})();
