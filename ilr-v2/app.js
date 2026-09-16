(function(I){
'use strict';
const $=id=>document.getElementById(id),V=I.V,KEY='ilr-v2-save';
let s=null,page='home',pendingName='하린',locked=false,auto=false,timer=null,animations=[];
let motion=!matchMedia('(prefers-reduced-motion:reduce)').matches,haptic=false;
function stored(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x?.schema===2&&x.stats&&Array.isArray(x.history)&&Array.isArray(x.tags)&&['scene','result','end'].includes(x.mode)&&Number.isFinite(x.season)&&x.scene?.options?.length===3)return x;}catch(e){}return null;}
function save(){try{if(s)localStorage.setItem(KEY,JSON.stringify(s));}catch(e){}}
function fit(){const vv=window.visualViewport;if(!vv||vv.scale===1)document.documentElement.style.setProperty('--vh',`${Math.round(vv?.height||innerHeight)}px`);$('rotation').hidden=!(innerWidth>innerHeight&&innerHeight<520);if(!$('rotation').hidden)stopAuto();}
function stopAuto(){auto=false;clearTimeout(timer);timer=null;}
function schedule(){clearTimeout(timer);if(!auto||document.hidden||$('info').open||!$('rotation').hidden||!s)return;timer=setTimeout(()=>{if(locked){schedule();return;}if(s.mode==='end'){stopAuto();render();return;}if(s.mode==='result')command('next');else if(!s.revealed)command('reveal');else select(I.autoIndex(s));},s.mode==='result'?1000:850);}
function render(){
 animations.forEach(a=>a.cancel?.());animations=[];
 const screen=$('screen');
 if(page==='home')screen.innerHTML=V.home(!!stored());else if(page==='routes')screen.innerHTML=V.routes();else if(!s)screen.innerHTML=V.home(false);else screen.innerHTML=s.mode==='scene'?V.play(s,auto):s.mode==='result'?V.report(s,auto):V.ending(s);
 screen.dataset.mode=page==='run'?s.mode:page;
 fit();save();schedule();
}
function error(e){stopAuto();locked=false;$('infoTitle').textContent='진행 중 문제가 생겼어요';$('infoBody').innerHTML=`<p class="error">${V.esc(e.message||e)}</p><p>마지막 저장 상태를 유지했습니다. 새로고침으로 다시 불러올 수 있어요.</p>`;if(!$('info').open)$('info').showModal();console.error(e);}
function burst(rect){if(!motion||!rect)return;for(let i=0;i<8;i++){const p=document.createElement('i');p.className='particle';p.style.left=rect.right-25+'px';p.style.top=rect.top+rect.height/2+'px';const a=i/8*Math.PI*2;p.style.setProperty('--x',Math.cos(a)*40+'px');p.style.setProperty('--y',Math.sin(a)*36+'px');$('fx').append(p);setTimeout(()=>p.remove(),650);}}
function counts(){if(!motion)return;document.querySelectorAll('[data-count-key]').forEach(el=>{const from=+el.dataset.from,to=+el.dataset.to,k=el.dataset.countKey,start=performance.now();function frame(now){if(!el.isConnected)return;const t=Math.min(1,(now-start)/420);el.textContent=I.value(k,from+(to-from)*(1-(1-t)**3));if(t<1)requestAnimationFrame(frame);}requestAnimationFrame(frame);});}
function select(index){if(locked||!s||s.mode!=='scene'||!s.revealed)return;const b=document.querySelector(`[data-choice="${index}"]`),r=b?.getBoundingClientRect();locked=true;try{if(!I.choose(s,index)){locked=false;return;}if(haptic&&navigator.vibrate)navigator.vibrate(10);render();burst(r);counts();$('announce').textContent=s.result.changes.map(x=>`${I.labels[x.key]} ${I.value(x.key,x.before)}에서 ${I.value(x.key,x.after)}`).join(', ');document.querySelectorAll('.report-nav button').forEach(x=>x.disabled=true);setTimeout(()=>{locked=false;document.querySelectorAll('.report-nav button').forEach(x=>x.disabled=false);schedule();},motion?480:120);}catch(e){error(e);}}
function info(title,body){stopAuto();$('infoTitle').textContent=title;$('infoBody').innerHTML=body;$('info').showModal();}
function settings(){info('설정 · v'+I.VERSION,`<p>선택은 한 화면, 보고서는 스크롤로 확인합니다.</p><label class="setting-row">선택·수치 모션<input type="checkbox" id="motionToggle" ${motion?'checked':''}></label><label class="setting-row">짧은 진동<input type="checkbox" id="hapticToggle" ${haptic?'checked':''}></label><button class="secondary" data-command="help">플레이 안내</button><p class="setting-row"><button class="secondary" data-command="resetAsk">새 인생 준비</button></p><small>저장은 이 브라우저에만 남습니다. 예전 빌드의 저장 데이터는 호환되지 않습니다.</small>`);}
function command(id){
 if(locked&&id!=='auto')return;
 if(id==='home'){stopAuto();page='home';}
 else if(id==='routes'){pendingName=$('playerName')?.value.trim().slice(0,8)||'하린';document.activeElement?.blur();page='routes';}
 else if(id==='resume'){s=stored();if(!s)return;page='run';}
 else if(id==='reveal'){if(s?.mode==='scene')s.revealed=true;}
 else if(id==='dialogue'){s.revealed=false;}
 else if(id==='next'){if(!I.advance(s))return;}
 else if(id==='carry'){stopAuto();I.carry(s);}
 else if(id==='auto'){if(auto)stopAuto();else auto=true;}
 else if(id==='stats'){return info('상태와 버프',`<div class="info-grid">${Object.entries(I.labels).filter(([k])=>!['score','focus'].includes(k)).map(([k,l])=>`<div class="info-cell"><small>${l}</small><b>${I.value(k,s.stats[k])}</b></div>`).join('')}</div><h3>현재 방향 · ${I.labels[s.focus]||s.focus==='rest'&&'회복'||'균형'}</h3>${s.tags.map(t=>`<p><b>${I.tags[t].name}</b><br>${I.tags[t].desc}</p>`).join('')}${s.buffs.map(b=>`<p class="future">${b.name} ×${b.factor} · 앞으로 ${b.left}시즌</p>`).join('')||'<p>진행 중인 기간제 버프 없음</p>'}`);}
 else if(id==='history'){return info('커리어 기록',s.decisions.slice().reverse().map(d=>`<p class="log-item"><b>${d.term} · ${V.esc(d.choice)}${d.automatic?' (계획 유지)':''}</b>${V.esc(d.org||'평가위원회')} · ${V.esc(d.title)}<br>${V.esc(d.reason)}<br>${V.esc(d.future||'')}</p>`).join('')||'<p>첫 선택을 기다리고 있어요.</p>');}
 else if(id==='help'){if($('info').open)$('info').close();return info('플레이 안내','<p>① 이름과 진입 루트를 정합니다.</p><p>② 조직의 제안과 내 속마음을 읽고, 제안을 살펴봅니다.</p><p>③ 선택지의 수치는 기본 훈련·현재 버프·정산을 포함한 반년 전체 변화입니다. 공통 효과는 위에 한 번 표시하며, ~는 변동 범위입니다. 정산의 상세 계산은 결과에서 확인합니다.</p><p>④ 반년을 마칠 때 실력과 회사 평가가 쌓입니다. 입사·데뷔조·데뷔 관문만 2턴 카드 평가를 합니다.</p><p>⑤ 성인 활동기에는 같은 계획을 다음 제안까지 유지할 수 있습니다. 최대 4년이며 반년마다 계산하고, 제안·관문·위험에서는 멈춥니다.</p><p>자동 시연은 현재 선택지를 대신 골라 엔딩까지 진행합니다. 언제든 자동 정지를 누를 수 있습니다.</p>');}
 else if(id==='notes'){return info('v2.0.0 변경 내용','<p>중간에서 잘린 실행 코드를 완성된 모듈로 교체했습니다.</p><p>반년 시즌, 조직 대사와 속마음, 포지션별 후속 제안, 기간제 버프, 실수령 정산을 연결했습니다.</p><p>모든 선택 결과는 실제 전후 수치로 남습니다. 주기적 사건과 유지할 계획을 분리했습니다.</p>');}
 else if(id==='resetAsk'){return void($('infoBody').innerHTML='<p>현재 진행을 지우고 새 인생을 시작할까요?</p><button class="primary" data-command="resetYes">새 인생 준비</button><p>취소하려면 닫기를 눌러주세요.</p>');}
 else if(id==='resetYes'){stopAuto();s=null;try{localStorage.removeItem(KEY);}catch(e){}$('info').close();page='home';}
 else return;
 render();
}
$('screen').addEventListener('click',ev=>{try{const b=ev.target.closest('button');if(!b||b.disabled)return;if(b.dataset.route){if(locked)return;s=I.newGame(pendingName,b.dataset.route);page='run';render();}else if(b.dataset.choice!==undefined)select(Number(b.dataset.choice));else if(b.dataset.command)command(b.dataset.command);}catch(e){error(e);}});
$('screen').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='playerName')command('routes');});
$('settings').addEventListener('click',settings);$('closeInfo').addEventListener('click',()=>$('info').close());
$('info').addEventListener('click',e=>{const b=e.target.closest('[data-command]');if(b)command(b.dataset.command);});
$('info').addEventListener('change',e=>{if(e.target.id==='motionToggle')motion=e.target.checked;if(e.target.id==='hapticToggle')haptic=e.target.checked;});
$('info').addEventListener('close',()=>render());
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAuto();});
window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);
I.app={get state(){return s;},get auto(){return auto;},render,command,load(state){s=I.clone(state);page='run';render();}};
render();window.ILR_READY=true;
})(globalThis.ILR);
