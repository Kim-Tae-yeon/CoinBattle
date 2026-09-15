  // Screen flow, input and tutorial. Shared Room rules are authoritative.
  const ux = { page: 'home', kind: 'random', screen: '', error: '' };
  let tutor = null, tutorSerial = 0, pausedAt = 0, dialogReturnFocus = null, presentedReveal = ''; 
  const CELL_NAMES = ['왼쪽 위','','오른쪽 위','','가운데','','왼쪽 아래','','오른쪽 아래'];
  const LEARN_KEY = 'cloud-pick:tutorial:v3';
  const fmt = n => String(n).padStart(2,'0');
  function announce(text) { $('srStatus').textContent = text; }
  function screenName() { return mode === 'queue' ? 'queue' : mode === 'home' ? ux.page : mode === 'tutorial' ? (tutor?.stage === 'done' ? 'result' : 'tutorial') : state.phase === 'lobby' ? 'lobby' : state.phase === 'finished' ? 'result' : 'play'; }
  function focusHeading() { requestAnimationFrame(() => { const el = $('screenHeading'); if (el) el.focus({preventScroll:true}); }); }
  function heroHTML() {
    return `<section class="hero"><h1 id="screenHeading" class="screen-title" tabindex="-1">구름 선택</h1><p class="premise">혼자 고르면 코인 획득.<br>같은 구름을 고르면 0코인.</p><button class="btn btn-primary" data-action="setup">랜덤 매칭</button><button class="text-button tutorial-link" data-action="tutorial">게임 방법 배우기</button><p class="hero-meta"><span>10라운드</span><span>선택 10초</span><span>최대 4명</span></p></section>`;
  }
  function nameHTML() { return `<label class="field-label" for="nameInput">닉네임 <small>선택</small></label><div class="name-field">${avatar(0)}<input id="nameInput" maxlength="12" placeholder="플레이어" value="${escapeHTML(name)}" autocomplete="nickname">${icons.edit}</div>`; }
  function setupHTML() { return randomSetupHTML(); }
  function playerHTML(p, lobby = false) {
    const self = p.id === state.yourId, r = state.results.find(x=>x.id===p.id), presented=revealVisible();
    const score = p.score - (!presented ? (r?.gain || 0) : 0);
    let label = lobby ? '참가 완료' : '곧 시작', cls = '';
    if (state.phase === 'prepare') label = p.ready ? '준비 완료' : '준비 중';
    if (!p.connected && !p.bot) label = p.departed ? '나감' : '연결 대기';
    else if (state.phase === 'choose') {label=p.locked?'확정':'고르는 중';cls=p.locked?'is-locked':'';}
    else if (r && !presented) label='공개 중';
    else if (r) {label=r.missed?'선택 없음':r.collision?'겹침 · +0':`획득 · +${r.gain}`;cls=r.gain?'gained':'collision';}
    const last = lobby ? '' : recentChoicesHTML(p);
    return `<div class="player-row ${p.bot?'is-bot':''} ${self?'is-me':''} ${!p.connected&&!p.bot?'offline':''}">${avatar(p.slot)}<div class="player-meta"><div class="player-name"><span class="text-name" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</span>${self?'<span class="you-tag">나</span>':p.bot?'<span class="bot-tag">봇</span>':''}${p.id===state.hostId&&mode==='online'&&!isRandom()?'<span class="host-crown" title="방장">♛</span>':''}</div><div class="player-status ${cls}">${label}</div>${!lobby?last:''}</div>${!lobby?`<div class="player-score" aria-label="${score}코인">${coin}<span>${score}</span></div>`:p.bot&&state.hostId===state.yourId?`<button class="remove-bot" data-action="removeBot" data-id="${escapeHTML(p.id)}" aria-label="${escapeHTML(p.name)} 봇 빼기">×</button>`:''}</div>`;
  }
  function lobbyHTML() {
    const host = state.hostId === state.yourId, canStart=state.config.fillBots||state.players.length>=2;
    return `<section class="lobby-top"><h1 id="screenHeading" class="screen-title" tabindex="-1">친구 방</h1><div class="panel"><div class="room-label">친구에게 알려줄 방 코드</div><div class="room-code">${escapeHTML(state.code)}</div><div class="room-share"><button class="btn btn-soft" data-action="copyLink">${icons.link} 초대 링크 복사</button><button class="btn btn-line" data-action="copyCode">코드 복사</button></div><div class="room-summary"><span>${state.config.rounds}라운드 · ${state.config.seconds}초</span>${host?'<button class="text-button" data-action="settings">방 설정</button>':'<span>방장이 설정해요</span>'}</div></div></section><section class="panel player-panel"><div class="panel-heading"><h3>참가자</h3><span class="pill-count">${state.players.length} / 4</span></div><div class="player-list">${state.players.map(p=>playerHTML(p,true)).join('')}${Array.from({length:4-state.players.length},()=>host?'<button class="empty-slot" data-action="addBot">＋ 봇 추가</button>':'<div class="empty-slot">친구를 기다리는 중</div>').join('')}</div><button class="btn btn-primary start-match" data-action="start" ${!host||!canStart||busy||connection!=='connected'?'disabled':''}>${host?'게임 시작':'방장 시작 대기'}</button><p class="lobby-note">${state.config.fillBots?'빈자리는 봇이 채워요. 혼자서도 시작할 수 있어요.':canStart?'모두 모였다면 시작하세요.':'2명 이상이 필요해요. 친구를 초대하거나 봇을 추가하세요.'}</p></section><div class="lobby-help"><button class="text-button" data-action="help">게임 방법</button><button class="text-button" data-action="leaveDialog">방 나가기 ↗</button></div>`;
  }
  function choiceButtons(allowed = options(), active = true) {
    const selected=currentCell();
    return `<div class="choice-options" role="group" aria-label="내가 갈 수 있는 구름 세 개">${options().map((cell,i)=>`<button class="pick-btn" data-action="select" data-cell="${cell}" ${!active||!allowed.includes(cell)?'disabled':''} aria-label="${i+1}번, ${CELL_NAMES[cell]} 구름, ${state.board[cell]}코인" aria-pressed="${selected===cell}"><kbd>${i+1}</kbd>${coin}<strong>${state.board[cell]}</strong></button>`).join('')}</div>`;
  }
  function renderChoiceBar() {
    if(mode==='tutorial'){ $('choiceBar').innerHTML=tutorialControls();return; }
    if(state.phase==='prepare') {
      $('choiceBar').innerHTML=`<div class="prepare-rules"><strong>게임 방법</strong><span>1. 세 구름 중 하나 선택</span><span>2. 혼자 도착하면 코인 획득 · 겹치면 0</span><span>3. ${state.config.rounds}라운드 후 코인이 가장 많으면 승리</span></div><button class="btn btn-primary ready-button" data-action="ready" ${me().ready || (mode==='online' && connection!=='connected') ? 'disabled' : ''}>${me().ready?'다른 플레이어 준비 중':'준비 완료'}</button>`;return;
    }
    if(mode==='home'||state.phase==='lobby'||state.phase==='finished'){ $('choiceBar').innerHTML='';return; }
    const p=me(), selected=currentCell(), active=state.phase==='choose'&&!p.locked&&(mode!=='online'||connection==='connected');
    if(state.phase==='choose'){
      if(p.locked){ $('choiceBar').innerHTML=`<div class="choice-intro"><strong>선택 확정됨</strong><small>다른 플레이어의 확정을 기다립니다.</small></div><div class="selected-ticket">✓ ${selected===null?'선택 없음':CELL_NAMES[selected]+' 구름'}<small>${state.players.filter(p=>p.locked).length}/${state.players.length}명 확정</small></div><button class="lock-btn" disabled>확정 완료</button>`;return; }
      $('choiceBar').innerHTML=`<div class="choice-intro"><strong>${selected===null?'구름을 선택하세요':'선택 후 확정하세요'}</strong><small>${selected===null?'아래 세 구름 중 하나를 선택하세요.':'확정 전까지는 다른 구름으로 바꿀 수 있어요.'}</small></div>${choiceButtons(options(),active)}<button class="lock-btn" data-action="lock" ${!active||selected===null?'disabled':''}>선택 확정</button>`;
    }else if(state.phase==='reveal'){
      const r=state.results.find(r=>r.id===state.yourId);
      if(!revealVisible())$('choiceBar').innerHTML='<div class="waiting-note">선택 공개 중</div>';
      else $('choiceBar').innerHTML=`<div class="result-line ${!r?.gain?'bad':''}"><span class="delta">+${r?.gain||0}</span><div><strong>${r?.gain?'코인 획득':r?.missed?'미선택 · 0코인':'같은 구름 · 0코인'}</strong><small>${r?.gain?`혼자 고른 ${CELL_NAMES[r.cell]} 구름에서 ${r.gain}코인을 얻었어요.`:r?.missed?'아무것도 선택하지 않아 이번 라운드는 0코인이에요.':'같은 구름을 고른 모두가 이번 라운드 0코인이에요.'}</small></div></div>`;
    }else $('choiceBar').innerHTML=`<div class="choice-intro"><strong>${state.round===state.config.rounds?'마지막 라운드':'다음 라운드 준비'}</strong><small>곧 선택 시간이 시작돼요.</small></div>${choiceButtons([],false)}<button class="lock-btn" disabled>곧 시작</button>`;
  }
  function historyBody() {
    const hist=revealVisible()?state.history:state.history.filter(h=>h.round!==state.round);
    return `<div class="history-list">${hist.length?hist.slice().reverse().map(h=>{const r=h.results.find(r=>r.id===state.yourId);return `<div class="history-item"><b>R${fmt(h.round)}</b>${!r||r.missed?'선택하지 않음':r.collision?'같은 구름을 선택함':'혼자 고른 구름'}<span class="${r?.gain?'gain':'fail'}">+${r?.gain||0}코인</span></div>`;}).join(''):'<p>아직 공개된 라운드가 없어요.</p>'}</div>`;
  }
  function renderFinish() {
    const el=$('finishOverlay');el.hidden=screenName()!=='result';if(el.hidden)return;
    if(mode==='tutorial'){
      el.innerHTML=`<div class="finish-card tutor-summary"><div class="completion-cast">${[0,1,2,3].map(s=>avatar(s)).join('')}</div><h1 id="screenHeading" tabindex="-1" class="screen-title">튜토리얼 완료</h1><p><strong>10라운드 후 코인이 가장 많으면 승리.</strong><br>동점은 공동 우승입니다.</p><div class="button-row"><button class="btn btn-primary" data-action="learnMatch">랜덤 매칭 →</button><button class="btn btn-line" data-action="learnSolo">봇과 연습</button></div><button class="text-button" data-action="backHome">처음으로</button></div>`;return;
    }
    const order=state.players.slice().sort((a,b)=>b.score-a.score||a.slot-b.slot),best=order[0]?.score||0,winners=order.filter(p=>p.score===best),win=winners.some(p=>p.id===state.yourId),mine=me();
    const title=winners.length>1?'공동 우승':win?'승리':`${escapeHTML(winners[0]?.name||'친구')}의 승리.`;
    el.innerHTML=`<div class="finish-card"><div class="trophy" aria-hidden="true">☾</div><h1 id="screenHeading" tabindex="-1" class="screen-title">${title}</h1><p class="result-summary">${isRandom()?`랜덤 매칭 · 사람 ${state.matchmaking.humans}명${state.matchmaking.bots?' + 봇 '+state.matchmaking.bots+'명':''}<br>`:''}${state.config.rounds}라운드 완료 · 내 점수 <strong>${mine?.score||0}코인</strong><br>${winners.length>1?`${winners.length}명이 ${best}코인으로 공동 우승했어요.`:''}</p><div aria-label="최종 순위">${order.map(p=>`<div class="podium-line ${p.id===state.yourId?'is-me':''}"><span class="rank">${1+order.filter(x=>x.score>p.score).length}</span>${avatar(p.slot)}<strong>${escapeHTML(p.name)} ${p.id===state.yourId?'<span class="you-tag">나</span>':''}</strong>${coin}<span class="score">${p.score}</span></div>`).join('')}</div>${isRandom()?`<div class="button-row"><button class="btn btn-primary" data-action="match" ${busy?'disabled':''}>다시 매칭 →</button><button class="btn btn-line" data-action="leave">처음으로</button></div>`:state.hostId===state.yourId?`<div class="button-row"><button class="btn btn-primary" data-action="start">한 판 더 →</button><button class="btn btn-line" data-action="${mode==='solo'?'leave':'lobby'}">${mode==='solo'?'처음으로':'대기실로'}</button></div>`:'<p class="wait-host">방장이 다음 판을 시작하면 함께 출발해요.</p>'}<button class="text-button" data-action="history">이번 판 기록 보기 →</button></div>`;
  }
  function renderHUD(){
    $('roundChip').innerHTML=state.phase==='prepare'?`<span class="round-label">준비</span><strong>${state.config.rounds}라운드 · ${state.config.seconds}초</strong>`:mode==='tutorial'?`<span class="round-label">게임 방법 배우기</span><strong><em>${tutor?.step||1}</em><span class="total-rounds"> / 4</span></strong>`:`<span class="round-label">${state.round===state.config.rounds?'마지막 라운드':'라운드'}</span><strong><em>${fmt(state.round)}</em><span class="total-rounds"> / ${fmt(state.config.rounds)}</span></strong>`;
    const reconnect=mode==='online'&&connection!=='connected';
    $('networkNotice').hidden=!reconnect;$('networkNotice').textContent=reconnect?'연결이 끊겼어요. 다시 연결하는 중에는 선택을 바꿀 수 없어요. 서버의 제한 시간은 계속 흐릅니다.':'';
    const pill=$('connectionPill');pill.hidden=mode!=='online';pill.className='connection-pill'+(reconnect?' reconnect':'');pill.innerHTML=`<i></i>${reconnect?'연결 중':'함께 플레이 중'}`;
    $('screenLocation').textContent=({home:'',setup:'플레이 방식',lobby:'친구를 기다리는 중',tutorial:'튜토리얼',queue:'랜덤 매칭 · 상대 찾는 중',play:mode==='solo'?'봇과 연습':isRandom()?'랜덤 매칭':'친구와 플레이',result:'경기 결과'})[screenName()];
  }
  function focusKey(el){if(!el||!el.closest('#sidebar,#choiceBar,#roster,#finishOverlay'))return null;if(el.id)return '#'+CSS.escape(el.id);if(el.dataset.action)return `[data-action="${el.dataset.action}"]${el.dataset.cell?`[data-cell="${el.dataset.cell}"]`:el.dataset.id?`[data-id="${CSS.escape(el.dataset.id)}"]`:''}`;return null;}
  function render(){
    const input=$('nameInput');if(input)name=input.value;
    const key=focusKey(document.activeElement),screen=screenName(),changed=ux.screen!==screen;ux.screen=screen;
    document.body.dataset.screen=screen;
    $('sidebar').innerHTML=mode==='queue'?queueHTML():mode==='home'?(ux.page==='setup'?setupHTML():heroHTML()):mode==='tutorial'?(tutor?.stage==='done'?'':tutorialHTML()):state.phase==='lobby'?lobbyHTML():'';
    $('roster').innerHTML=screen==='play'?state.players.map(p=>playerHTML(p)).join(''):'';
    renderChoiceBar();renderHUD();renderFinish();updateSoundButton();updateMotionButton();
    if(key){const target=document.querySelector(key);if(target&&!target.disabled)target.focus({preventScroll:true});else if(document.activeElement===document.body&&screen==='play')$('choiceBar').focus({preventScroll:true});}
    if(changed){requestAnimationFrame(resize);if(screen==='result')focusHeading();}
  }
  function applyState(next){
    if(mode==='online'&&next.code===state.code&&next.revision<state.revision)return;
    const phaseChanged=state.phase!==next.phase||state.round!==next.round||state.matchId!==next.matchId;
    if(state.round!==next.round||state.matchId!==next.matchId||next.phase!=='choose')optimisticCell=null;
    state=next;clockOffset=mode==='online'?next.serverNow-Date.now():0;
    if(me()?.locked)optimisticCell=null;
    if(phaseChanged){lastBeep=0;
      if(state.phase==='choose'){sound('start');announce(`라운드 ${state.round}. 선택을 시작하세요.`);}
      if(state.phase==='reveal'){
        makeParticles();
      }
      if(state.phase==='finished'){sound('win');announce('경기가 끝났어요. 최종 순위를 확인하세요.');}
    }
    render();
  }
  // Present outcomes once the landing is visible, not while a local game is paused.
  function presentReveal(){
    if(state.phase!=='reveal'||!revealVisible()||pausedAt)return;
    const marker=`${mode}:${state.matchId}:${state.round}:${state.phaseStartedAt}`;
    if(presentedReveal===marker)return;
    presentedReveal=marker;
    const r=state.results.find(r=>r.id===state.yourId);
    sound(r?.gain?'coin':'collision');render();
    announce(r?.gain?`${r.gain}코인 획득`:r?.missed?'선택하지 않아 0코인':'같은 구름에서 겹쳐 0코인');
  }
  function readName(){name=($('nameInput')?.value||name||'플레이어').trim().slice(0,12)||'플레이어';storage.set('cloud-pick:name',name);return name;}
  function openSetup(kind='random'){
    if(mode==='queue'){cancelMatchmaking();return;}
    if(mode==='online'||mode==='solo'){leaveDialog();return;}
    if($('nameInput'))name=$('nameInput').value;
    tutor=null;tutorSerial++;mode='home';state={...demoState,config:{...config}};optimisticCell=null;particles=[];ux.page='setup';ux.kind=kind;ux.error='';closeDialog();render();focusHeading();window.scrollTo({top:0,behavior:'instant'});
  }
  function backHome(){
    if(mode==='queue'){cancelMatchmaking();return;}
    if(mode==='online'||mode==='solo'){leaveDialog();return;}
    tutor=null;tutorSerial++;mode='home';ux.page='home';ux.error='';state={...demoState,config:{...config}};optimisticCell=null;particles=[];closeDialog();render();focusHeading();window.scrollTo({top:0,behavior:'instant'});
  }
  function startSolo(){
    readName();closeDialog();disconnect();tutor=null;tutorSerial++;mode='solo';connection='local';clockOffset=0;pausedAt=0;
    localRoom=new G.Room('SOLO',{...config,fillBots:true});localRoom.addHuman('you',name);localRoom.start('you');optimisticCell=null;applyState(localRoom.snapshot('you'));sound('start');
    window.scrollTo({top:0,behavior:'instant'});
  }
  async function api(path,data,token=session?.token){
    const headers={'Content-Type':'application/json'};if(token)headers.Authorization=`Bearer ${token}`;
    const response=await fetch(path,{method:data===undefined?'GET':'POST',headers,body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(9000)});
    const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error||'서버 요청에 실패했어요.'),{status:response.status});return result;
  }
  function disconnect(){if(stream){stream.close();stream=null;}}
  function onlineRequired(){if(serverAvailable)return true;connectionHelp();return false;}
  function connectionHelp(){showDialog(`<h2>서버 연결</h2><p>HTML 파일만 열면 봇 연습과 튜토리얼을 할 수 있어요. 랜덤 매칭과 친구끼리 플레이는 <strong>최신 멀티플레이 서버가 실행 중인 같은 웹 주소</strong>에 접속해야 해요.</p><details class="help-rule"><summary>직접 서버를 실행하는 방법</summary><p>HTML뿐 아니라 서버 파일도 최신 버전으로 교체한 뒤, 전체 프로젝트 폴더에서 <code>node server.mjs</code>를 실행하고 <code>http://localhost:3000</code>을 여세요. 같은 Wi-Fi의 친구는 실행창에 표시되는 네트워크 주소로 접속하세요. 다른 네트워크에서 함께하려면 인터넷 배포가 필요해요.</p></details><button class="btn btn-primary settings-actions" data-action="checkConnection">연결 다시 확인</button><button class="text-button setup-secondary" data-action="closeDialog">돌아가기</button>`);}
  function connectSession(result){
    closeDialog();disconnect();localRoom=null;tutor=null;tutorSerial++;mode='online';pausedAt=0;session={token:result.token,id:result.id,code:result.code};storage.set('cloud-pick:session',JSON.stringify(session),true);connection='connecting';optimisticCell=null;
    state=result.state;clockOffset=result.state.serverNow-Date.now();
    if(state.matchmaking?.kind==='random')storage.remove(QUEUE_KEY,true);
    const activeSession=session;
    stream=new EventSource(`/api/events?token=${encodeURIComponent(session.token)}`);
    stream.addEventListener('state',event=>{if(mode!=='online'||session!==activeSession)return;try{connection='connected';applyState(JSON.parse(event.data));}catch{toast('서버 상태를 읽지 못했어요. 다시 연결할게요.');}});
    stream.addEventListener('replaced',()=>{if(session!==activeSession)return;disconnect();storage.remove('cloud-pick:session',true);session=null;mode='home';connection='home';clockOffset=0;optimisticCell=null;ux.page='setup';state={...demoState,config:{...config}};render();toast('다른 탭에서 이 참가 정보를 사용 중이에요. 이 탭에서는 새로 참가해 주세요.');});
    stream.onopen=()=>{if(mode!=='online'||session!==activeSession)return;connection='connected';render();};stream.onerror=()=>{if(mode!=='online'||session!==activeSession)return;connection='reconnecting';render();};
    render();focusHeading();window.scrollTo({top:0,behavior:'instant'});
  }
  async function createRoom(){
    if(!onlineRequired()||busy)return;readName();busy=true;ux.error='';render();
    try{connectSession(await api('/api/create',{name,config},null));toast('방을 만들었어요. 링크로 친구를 초대하세요.');}
    catch(e){ux.error=e.message||'연결에 실패했어요.';}
    finally{busy=false;render();}
  }
  function joinDialog(prefill=''){
    readName();if(!onlineRequired())return;
    showDialog(`<h2>방 코드 입력</h2><p>친구에게 받은 6자리 방 코드를 입력하세요.</p><form id="joinForm"><label class="field-label" for="joinCode">방 코드</label><input class="join-code" id="joinCode" minlength="6" maxlength="6" pattern="[A-Za-z2-9]{6}" placeholder="ABC234" value="${escapeHTML(prefill)}" aria-describedby="joinError" autocomplete="off" autocapitalize="characters" spellcheck="false" required><p class="inline-error" id="joinError" role="alert"></p><button class="btn btn-primary" type="submit" id="joinSubmit">방에 참가하기 →</button></form>`);setTimeout(()=>$('joinCode')?.focus(),60);
  }
  async function joinRoom(code){
    if(busy)return;busy=true;if($('joinSubmit')){$('joinSubmit').disabled=true;$('joinSubmit').textContent='방에 들어가는 중…';}
    try{connectSession(await api('/api/join',{code:code.trim().toUpperCase(),name:readName()},null));toast('방에 참가했습니다.');}
    catch(e){if($('joinError')){$('joinError').textContent=e.message||'방을 찾지 못했어요.';$('joinCode').setAttribute('aria-invalid','true');$('joinCode').focus();}else toast(e.message);}
    finally{busy=false;if($('joinSubmit')){$('joinSubmit').disabled=false;$('joinSubmit').textContent='방에 참가하기 →';}}
  }
  async function action(actionName,extra={}){
    if(mode==='home'||mode==='tutorial'||mode==='queue')return;
    if(mode==='solo'){
      try{if(actionName==='select'||actionName==='lock')localRoom.select('you',extra.cell,extra.round,extra.matchId,actionName==='lock');else if(actionName==='ready')localRoom.ready('you',extra.matchId);else if(actionName==='start')localRoom.start('you');else if(actionName==='lobby')localRoom.returnToLobby('you');applyState(localRoom.snapshot('you'));}catch(e){optimisticCell=null;toast(e.message);render();}return;
    }
    const actionSession=session;actionQueue=actionQueue.catch(()=>{}).then(async()=>{
      if(mode!=='online'||session!==actionSession)return;
      try{const result=await api('/api/action',{action:actionName,...extra});if(result.state&&mode==='online'&&session===actionSession)applyState(result.state);}
      catch(e){optimisticCell=null;toast(e.message||'네트워크 연결을 확인해 주세요.');render();}
    });return actionQueue;
  }
  function select(cell){
    if(mode==='tutorial'){tutorialSelect(cell);return;}
    if(state.phase!=='choose'||me().locked||mode==='online'&&connection!=='connected'||$('dialog').open)return;
    if(!options().includes(cell)){toast('번호가 표시된 내 옆의 세 구름 중에서 골라 주세요.');return;}
    optimisticCell=cell;sound('select');renderChoiceBar();action('select',{cell,round:state.round,matchId:state.matchId});
  }
  function lock(){
    if(mode==='tutorial'){tutorialLock();return;}
    const cell=currentCell();if(cell===null||state.phase!=='choose'||me().locked||$('dialog').open)return;
    sound('lock');action('lock',{cell,round:state.round,matchId:state.matchId});
  }
  function showDialog(html){
    const open=$('dialog').open;if(!open){dialogReturnFocus=document.activeElement;if((mode==='solo'||mode==='tutorial')&&state.phase!=='finished')pausedAt=Date.now();}
    $('dialogBody').innerHTML=html.replace('<h2>','<h2 id="dialogTitle">');
    if(!open)$('dialog').showModal();
  }
  function closeDialog(){if($('dialog').open){$('dialog').close();resumeLocal();}}
  function resumeLocal(){
    if(pausedAt){const delta=Date.now()-pausedAt,room=mode==='solo'?localRoom:mode==='tutorial'?tutor?.room:null;pausedAt=0;if(room){room.phaseStartedAt+=delta;room.phaseEndsAt+=delta;room.players.forEach(p=>p.botAt+=delta);state=room.snapshot('you');render();}}
    if(dialogReturnFocus?.isConnected)dialogReturnFocus.focus({preventScroll:true});dialogReturnFocus=null;
  }
  $('dialog').addEventListener('close',()=>{if(!$('dialog').open)resumeLocal();});
  $('dialog').addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
  function liveNote(){return mode==='queue'?'<p class="menu-status">상대 찾기는 계속돼요. 연결이 확인되면 게임 화면으로 자동 이동해요.</p>':mode==='online'&&state.phase!=='lobby'&&state.phase!=='finished'?'<p class="menu-status">메뉴를 열어도 <strong>게임과 제한 시간은 계속 진행</strong>돼요.</p>':mode==='solo'||mode==='tutorial'?'<p class="menu-status">잠깐 멈췄어요. 메뉴를 닫으면 이어져요.</p>':'';}
  function showMenu(){
    showDialog(`<h2>메뉴</h2><div class="menu-list"><button class="menu-item" data-action="help">게임 방법 <span>→</span></button>${mode==='home'?'<button class="menu-item" data-action="tutorial">게임 방법 배우기 <span>튜토리얼 →</span></button>':''}<button class="menu-item" id="soundButton" data-action="sound">효과음 <span>${muted?'꺼짐':'켜짐'}</span></button><button class="menu-item" id="motionButton" data-action="motion" aria-pressed="${reducedMotion}">움직임 줄이기 <span>${reducedMotion?'켜짐':'꺼짐'}</span></button>${mode==='online'&&!isRandom()?`<button class="menu-item" data-action="copyCode">방 코드 <span>${escapeHTML(state.code)} · 복사</span></button>`:''}${['solo','online'].includes(mode)&&state.phase==='finished'?'<button class="menu-item" data-action="history">라운드 기록 <span>→</span></button>':''}${mode!=='home'?`<button class="menu-item danger" data-action="leaveDialog">${mode==='queue'?'매칭 취소':isRandom()?'경기 나가기':mode==='online'?'방 나가기':mode==='tutorial'?'튜토리얼 나가기':'연습 마치기'} <span>↗</span></button>`:''}</div>${liveNote()}`);updateSoundButton();updateMotionButton();
  }
  function showHelp(){
    showDialog(`<h2>게임 방법</h2><p class="help-primary">혼자 도착하면 표시된 코인 획득.<br>겹치면 이번 라운드는 0코인.</p><details class="help-rule"><summary>어떤 구름을 고를 수 있나요?</summary><p>내 캐릭터 옆의 <strong>번호가 표시된 세 구름</strong>만 고를 수 있어요. 중앙은 네 명 모두 선택할 수 있습니다. 코인 수는 매번 바뀌며 주변이 더 높을 수 있습니다. 구름을 누르거나 화면 아래 선택 버튼을 사용하세요.</p></details><details class="help-rule"><summary>선택은 언제까지 바꿀 수 있나요?</summary><p><strong>선택 확정 전까지만</strong> 바꿀 수 있어요. 다른 사람에게는 목적지가 아니라 확정 여부만 보여요. 모두 확정하면 시간이 남아도 동시에 공개해요.</p></details><details class="help-rule"><summary>시간이 끝나면 어떻게 되나요?</summary><p><strong>마지막으로 고른 구름</strong>이 적용돼요. 한 번도 고르지 않았다면 그 라운드는 0코인이에요. 겹치더라도 이전에 모은 코인은 잃지 않아요.</p></details><details class="help-rule"><summary>어떻게 이기나요?</summary><p>${mode==='home'?config.rounds:state.config.rounds}라운드가 끝났을 때 누적 코인이 가장 많으면 승리. 동점은 공동 우승이에요. 현재 선택 시간은 ${mode==='home'?config.seconds:state.config.seconds}초예요.</p></details><details class="help-rule"><summary>키보드로 플레이할 수 있나요?</summary><p><kbd>1</kbd>·<kbd>2</kbd>·<kbd>3</kbd>으로 선택하고 <kbd>Enter</kbd>로 확정해요. <kbd>Tab</kbd>으로 버튼을 옮기고 <kbd>Space</kbd>로 누를 수도 있어요. 대화창은 <kbd>Esc</kbd>로 닫아요.</p></details>${mode==='home'?'<button class="btn btn-primary settings-actions" data-action="tutorial">게임 방법 배우기 →</button>':''}${liveNote()}<button class="text-button setup-secondary" data-action="closeDialog">게임으로 돌아가기</button>`);
  }
  function settingsDialog(){
    if(isRandom())return;
    if(mode==='online'&&(state.phase!=='lobby'||state.hostId!==state.yourId))return;
    const c=mode==='online'?state.config:config;
    showDialog(`<h2>게임 설정</h2><p></p><form id="settingsForm"><div class="config-fields"><label for="roundSetting">라운드<select id="roundSetting">${[3,5,8,10].map(n=>`<option value="${n}" ${c.rounds===n?'selected':''}>${n}라운드</option>`).join('')}</select></label><label for="timeSetting">선택 시간<select id="timeSetting">${[5,10,15,20].map(n=>`<option value="${n}" ${c.seconds===n?'selected':''}>${n}초</option>`).join('')}</select></label></div>${mode==='online'?`<label class="check-label"><input id="fillBotsSetting" type="checkbox" ${c.fillBots?'checked':''}>빈자리는 봇으로 채우기</label>`:'<p class="inline-note">혼자 연습할 때는 봇 3명이 함께해요.</p>'}<div class="settings-actions"><button class="btn btn-primary" type="submit">적용하기</button></div></form>`);
  }
  function showHistory(){showDialog(`<h2>라운드 기록</h2>${historyBody()}${liveNote()}<button class="text-button setup-secondary" data-action="closeDialog">돌아가기</button>`);}
  function leaveDialog(){
    if(mode==='queue'){cancelMatchmaking();return;}
    if(mode==='home'){backHome();return;}
    showDialog(`<h2>${mode==='online'?'방을 나갈까요?':mode==='tutorial'?'튜토리얼을 마칠까요?':'연습을 마칠까요?'}</h2><p>${isRandom()?'나가면 남은 라운드에는 참여할 수 없어요. 새로운 상대를 만나려면 처음 화면에서 다시 매칭하세요.':mode==='online'?'진행 중에 나가면 남은 라운드는 0코인이에요. 방장이 나가면 다른 접속자가 방장을 이어받아요.':mode==='tutorial'?'연습 점수는 실전에 영향을 주지 않아요. 처음 화면에서 언제든 다시 배울 수 있어요.':'이번 연습의 점수는 저장되지 않아요.'}</p><div class="button-row"><button class="btn btn-soft" data-action="closeDialog">계속하기</button><button class="btn btn-primary" data-action="leave">${mode==='online'?'방 나가기':'처음으로'}</button></div>`);
  }
  async function leave(){
    if(mode==='queue'){await cancelMatchmaking();return;}
    if(mode==='online'&&session){try{await api('/api/action',{action:'leave'});}catch{}}
    closeDialog();disconnect();storage.remove('cloud-pick:session',true);session=null;localRoom=null;tutor=null;tutorSerial++;pausedAt=0;
    mode='home';ux.page='home';connection='home';clockOffset=0;optimisticCell=null;particles=[];state={...demoState,config:{...config}};render();focusHeading();window.scrollTo({top:0,behavior:'instant'});
  }
  async function copy(text,message){
    try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(text);toast(message);}
    catch{showDialog(`<h2>초대 링크 복사</h2><p>자동 복사가 제한된 환경이에요. 아래 내용을 선택해 복사하세요.</p><label class="field-label" for="copyField">복사할 내용</label><input id="copyField" class="join-code" style="letter-spacing:0;font-size:14px;text-transform:none" readonly value="${escapeHTML(text)}"><button class="btn btn-primary" data-action="closeDialog">확인</button>`);$('copyField').select();}
  }
  function copyInvite(){copy(`${location.origin}${location.pathname}?room=${state.code}`,['localhost','127.0.0.1'].includes(location.hostname)?'복사했어요. 다른 기기에는 localhost 대신 서버 PC의 네트워크 주소를 알려 주세요.':'초대 링크를 복사했어요.');}

  // Tutorial uses a separate local Room. Scripted examples never touch an online room.
  function startTutorial(){
    if(mode==='queue'){cancelMatchmaking();return;}
    if(mode==='online'||mode==='solo'){leaveDialog();return;}
    readName();closeDialog();disconnect();localRoom=null;mode='tutorial';clockOffset=0;pausedAt=0;connection='local';tutorSerial++;
    tutor={step:1,stage:'pick',room:null,changed:false,first:null,resultReady:false,serial:tutorSerial};prepareLesson();window.scrollTo({top:0,behavior:'instant'});focusHeading();
  }
  function prepareLesson(){
    const room=new G.Room('LEARN',{rounds:5,seconds:10,fillBots:true});room.addHuman('you','나');while(room.players.length<4)room.addBot('you');
    room.players[1].name='친구';room.players[2].name='안내자';room.players[3].name='친구 2';room.matchId=tutorSerial;room.round=tutor.step;
    room.board=[1,0,2,0,3,0,2,0,1];room.phase='choose';room.phaseStartedAt=Date.now();room.phaseEndsAt=Date.now()+86400000;
    room.players[0].score=tutor.step>1?2:0;
    tutor.room=room;tutor.stage=tutor.step===4?'ready':'pick';tutor.changed=false;tutor.first=null;tutor.resultReady=false;particles=[];optimisticCell=null;lastBeep=0;
    applyState(room.snapshot('you'));announce(`튜토리얼 ${tutor.step}단계. ${lessonCopy().title}`);
  }
  function tutorialAllowed(){return tutor?.step===1?[6]:tutor?.step===2?[4]:options();}
  function lessonCopy() {
    if(!tutor)return {title:'',body:'',note:''};
    const done=tutor.stage==='reveal',r=state.results.find(r=>r.id==='you');
    if(tutor.step===1)return done
      ? {title:'2코인 획득',body:'혼자 도착하면 표시된 코인을 모두 얻습니다.',note:'번호가 표시된 구름만 선택할 수 있습니다.'}
      : {title:'1번 구름 선택',body:'아래쪽 캐릭터가 나입니다. 왼쪽 1번 구름을 누르세요.',note:'구름이나 아래 버튼을 눌러도 됩니다.'};
    if(tutor.step===2)return done
      ? {title:'같은 구름 · 0코인',body:'두 명이 같은 구름을 골라 이번 라운드는 모두 0코인입니다.',note:'이미 모은 코인은 잃지 않습니다.'}
      : {title:'2번 구름 선택',body:'이번에는 가운데 2번 구름을 누르세요.',note:'실전 코인 수는 매번 바뀝니다. 중앙이 항상 가장 높지는 않습니다.'};
    if(tutor.step===3)return done
      ? {title:'선택 확정됨',body:'모두 확정하거나 시간이 끝나면 함께 공개합니다.',note:'다른 사람에게는 확정 여부만 보입니다.'}
      : tutor.changed
        ? {title:'선택 확정',body:'선택 확정 버튼을 누르세요. 확정한 뒤에는 바꿀 수 없습니다.',note:'숫자 1·2·3으로 선택하고 Enter로 확정할 수 있습니다.'}
        : tutor.first!==null
          ? {title:'선택 변경',body:'다른 구름을 선택하세요. 확정 전에는 바꿀 수 있습니다.',note:'목적지는 공개 전까지 비밀입니다.'}
          : {title:'비밀 선택',body:'세 구름 중 하나를 선택하세요.',note:'이번 단계에서는 선택한 뒤 한 번 바꿔봅니다.'};
    if(done)return {title:r?.missed?'미선택 · 0코인':'선택 시간 종료',body:r?.missed?'한 번도 선택하지 않아 0코인입니다. 다시 연습할 수 있습니다.':`마지막 선택으로 ${r?.gain||0}코인을 얻었습니다.`,note:'확정하지 않아도 시간이 끝나면 마지막 선택이 적용됩니다.'};
    return {title:tutor.stage==='ready'?'10초 선택 연습':'10초 안에 선택',body:tutor.stage==='ready'?'시작 버튼을 누르면 제한 시간이 흐릅니다.':'세 구름 중 하나를 선택하고 확정하세요.',note:'미선택이면 0코인. 연습 점수는 실제 경기에 반영되지 않습니다.'};
  }
  function tutorialHTML(){
    const c=lessonCopy(),labels=['코인 획득','겹침','선택과 확정','제한 시간'];
    return `<section class="lesson-panel"><div class="lesson-meta"><strong>튜토리얼</strong><span>${tutor.step} / 4 · ${labels[tutor.step-1]}</span></div><div class="lesson-progress" aria-label="4단계 중 ${tutor.step}단계">${[1,2,3,4].map(n=>`<i class="${n<tutor.step?'done':n===tutor.step?'active':''}"></i>`).join('')}</div><div id="lessonText" aria-live="polite" aria-atomic="true"><h1 id="screenHeading" class="screen-title" tabindex="-1">${c.title}</h1><p class="lesson-copy">${c.body}</p><p class="lesson-aside">${c.note}</p></div><div class="lesson-exit"><button class="text-button" data-action="leaveDialog">건너뛰기 ↗</button></div></section>`;
  }
  function tutorialControls(){
    if(!tutor||tutor.stage==='done')return'';
    if(tutor.stage==='reveal')return `<div class="lesson-next"><small>${tutor.step===4?'실전 점수에는 반영되지 않아요.':'결과를 확인하고 다음으로 진행하세요.'}</small><button class="btn btn-primary" data-action="lessonNext" ${!tutor.resultReady||!revealVisible()?'disabled':''}>${tutor.step===4?'완료':'다음'}</button></div>${tutor.step===4?'<button class="text-button" data-action="lessonRetry">10초 연습 다시 하기</button>':''}`;
    if(tutor.stage==='ready')return '<div class="lesson-next"><small>시작 버튼을 누르면 10초가 흐릅니다.</small><button class="btn btn-primary" data-action="lessonTimed">10초 연습 시작 →</button></div>';
    const active=tutor.stage==='pick'||tutor.stage==='timed',lockable=tutor.step===3?tutor.changed:tutor.step===4&&currentCell()!==null;
    if(tutor.step<=2)return `<div class="choice-intro"><strong>${tutor.step===1?'1번 구름을 골라봐.':'2번, 가운데 구름을 골라봐.'}</strong><small>시간제한 없는 연습</small></div>${choiceButtons(tutorialAllowed(),active)}<span class="waiting-note" style="grid-column:auto;text-align:right;font-size:11px">선택하면 이동해</span>`;
    return `<div class="choice-intro"><strong>${tutor.step===3?(tutor.changed?'선택을 확정해봐.':tutor.first!==null?'다른 구름으로 바꿔봐.':'구름을 선택하세요'):'10초 안에 선택하세요'}</strong><small>${tutor.step===3?'시간제한 없는 연습':'시간이 끝나면 마지막 선택으로 이동해요.'}</small></div>${choiceButtons(options(),active)}<button class="lock-btn" data-action="lock" ${!lockable?'disabled':''}>선택 확정</button>`;
  }
  function tutorialSelect(cell){
    if(!tutor||!['pick','timed'].includes(tutor.stage)||$('dialog').open)return;
    if(!tutorialAllowed().includes(cell)){toast(tutor.step===1?'먼저 1번, 왼쪽 구름을 골라봐.':tutor.step===2?'이번엔 2번, 가운데 구름을 골라봐.':'번호가 표시된 세 구름 중에서 골라봐.');return;}
    if(tutor.stage==='timed'&&Date.now()>=tutor.room.phaseEndsAt){tutorialResolve();return;}
    sound('select');const p=tutor.room.player('you');p.selected=cell;optimisticCell=null;
    if(tutor.step<=2){tutorialResolve();return;}
    if(tutor.first===null)tutor.first=cell;else if(tutor.first!==cell)tutor.changed=true;
    applyState(tutor.room.snapshot('you'));
  }
  function tutorialLock(){
    if(!tutor||$('dialog').open||!['pick','timed'].includes(tutor.stage)||currentCell()===null)return;
    if(tutor.step===3&&!tutor.changed)return;
    sound('lock');tutor.room.player('you').locked=true;tutorialResolve();
  }
  function tutorialResolve(){
    if(!tutor||tutor.stage==='reveal'||tutor.stage==='done')return;
    const room=tutor.room,used=new Set([room.player('you').selected]);
    // Explicitly staged examples, confined to the tutorial. Real bots still use G.botChoice.
    room.players.filter(p=>p.bot).forEach((p,i)=>{let cell;if(tutor.step===2&&i===0)cell=4;else cell=G.TARGETS[p.slot].find(c=>c!==4&&!used.has(c))??G.TARGETS[p.slot].find(c=>!used.has(c))??null;p.selected=cell;p.locked=true;if(cell!==null)used.add(cell);});
    room.resolve(Date.now());tutor.stage='reveal';tutor.resultReady=false;applyState(room.snapshot('you'));
    const serial=tutor.serial,step=tutor.step;setTimeout(()=>{if(tutor?.serial===serial&&tutor.step===step&&tutor.stage==='reveal'){tutor.resultReady=true;render();}},reducedMotion?120:1250);
  }
  function nextLesson(){if(!tutor||tutor.stage!=='reveal'||!tutor.resultReady||!revealVisible())return;if(tutor.step===4){tutor.stage='done';storage.set(LEARN_KEY,'done');render();focusHeading();window.scrollTo({top:0,behavior:'instant'});}else{tutor.step++;prepareLesson();focusHeading();}}
  function startTimedLesson(){if(!tutor||tutor.step!==4||tutor.stage!=='ready')return;tutor.stage='timed';tutor.room.phaseStartedAt=Date.now();tutor.room.phaseEndsAt=Date.now()+10000;applyState(tutor.room.snapshot('you'));sound('start');}

  document.addEventListener('click',event=>{
    const b=event.target.closest('[data-action]');if(!b||b.disabled)return;event.preventDefault();unlockAudio();const a=b.dataset.action;
    if(a==='ready')action('ready',{matchId:state.matchId});else if(a==='match')startMatchmaking();else if(a==='cancelMatch')cancelMatchmaking();else if(a==='kindRandom'){ux.kind='random';ux.error='';render();}else if(a==='setup')openSetup();else if(a==='backHome')backHome();else if(a==='kindSolo'||a==='kindFriends'){ux.kind=a==='kindSolo'?'solo':'friends';ux.error='';render();}
    else if(a==='solo')startSolo();else if(a==='create')createRoom();else if(a==='joinDialog')joinDialog();
    else if(a==='menu')showMenu();else if(a==='help')showHelp();else if(a==='closeDialog')closeDialog();else if(a==='settings')settingsDialog();
    else if(a==='sound'){muted=!muted;storage.set('cloud-pick:muted',muted?'1':'0');if(!muted){unlockAudio();tone(700);}updateSoundButton();}
    else if(a==='motion'){reducedMotion=!reducedMotion;storage.set('cloud-pick:motion',reducedMotion?'reduced':'full');updateMotionButton();}
    else if(a==='select')select(Number(b.dataset.cell));else if(a==='lock')lock();else if(a==='start'){closeDialog();action('start');window.scrollTo({top:0,behavior:'instant'});}
    else if(a==='addBot')action('addBot');else if(a==='removeBot')action('removeBot',{id:b.dataset.id});else if(a==='lobby')action('lobby');
    else if(a==='leaveDialog')leaveDialog();else if(a==='leave')leave();else if(a==='home'){if(mode==='home')backHome();else leaveDialog();}
    else if(a==='copyCode')copy(state.code,'방 코드를 복사했어요.');else if(a==='copyLink')copyInvite();else if(a==='history')showHistory();
    else if(a==='tutorial')startTutorial();else if(a==='lessonNext')nextLesson();else if(a==='lessonTimed')startTimedLesson();else if(a==='lessonRetry')prepareLesson();
    else if(a==='learnMatch')openSetup('random');else if(a==='learnSolo')startSolo();else if(a==='learnFriends')openSetup('friends');else if(a==='connectionHelp')connectionHelp();
    else if(a==='checkConnection'){closeDialog();initializeBackend(false).then(()=>toast(serverAvailable?'멀티플레이 서버에 연결됐어요.':'서버를 찾지 못했어요. 서버 주소에서 열었는지 확인해 주세요.'));}
  });
  document.addEventListener('submit',event=>{
    if(event.target.id==='joinForm'){event.preventDefault();joinRoom($('joinCode').value);}
    else if(event.target.id==='settingsForm'){event.preventDefault();const c={rounds:Number($('roundSetting').value),seconds:Number($('timeSetting').value),fillBots:mode==='online'?$('fillBotsSetting').checked:true};if(mode==='online')action('configure',{config:c});else{config=c;state.config={...c};}closeDialog();render();}
  });
  document.addEventListener('input',event=>{if(event.target.id==='nameInput'){name=event.target.value;storage.set('cloud-pick:name',name);}if(event.target.id==='joinCode')event.target.removeAttribute('aria-invalid');});
  document.addEventListener('keydown',event=>{
    if(/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||event.target.isContentEditable||$('dialog').open||event.altKey||event.ctrlKey||event.metaKey||event.repeat)return;
    if(['1','2','3'].includes(event.key)){event.preventDefault();unlockAudio();select(options()[Number(event.key)-1]);}
    else if(event.key==='Enter'&&state.phase==='choose'&&(!event.target.closest('button,a')||event.target.closest('[data-action=select],[data-action=lock]'))){event.preventDefault();unlockAudio();lock();}
  });
  $('dialog').addEventListener('click',event=>{if(event.target===$('dialog')){const r=$('dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();}});
  canvas.addEventListener('pointermove',event=>{const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)/r.width*1000,y=(event.clientY-r.top)/r.width*1000;hoverCell=view.cells.findIndex(c=>Math.pow((x-c.x)/(103*c.s),2)+Math.pow((y-c.y+12)/(64*c.s),2)<1);canvas.style.cursor=state.phase==='choose'&&!me().locked&&(mode==='tutorial'?tutorialAllowed():options()).includes(hoverCell)?'pointer':'default';});
  canvas.addEventListener('pointerleave',()=>{hoverCell=null;});
  canvas.addEventListener('pointerdown',event=>{if(mode==='home'||mode==='queue'||state.phase==='lobby')return;const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)/r.width*1000,y=(event.clientY-r.top)/r.width*1000;const cell=view.cells.findIndex(c=>Math.pow((x-c.x)/(108*c.s),2)+Math.pow((y-c.y+12)/(73*c.s),2)<1);if(cell<0)return;unlockAudio();if(state.board[cell]>0)select(cell);});
