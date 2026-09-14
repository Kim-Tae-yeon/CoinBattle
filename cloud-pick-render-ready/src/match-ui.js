  // Queue credentials stay in this tab's sessionStorage, never in URLs or the debug view.
  const QUEUE_KEY = 'cloud-pick:public-queue:v1';
  let matchInfo = { enabled: false, fallbackMs: 20000, rounds: 5, seconds: 10 };
  let queue = null, queueTimer = 0, queueEpoch = 0, queuePending = false, queueCancelling = false, recovering = false;
  function isRandom() { return mode === 'online' && state.matchmaking?.kind === 'random'; }
  function randomSetupHTML() {
    const random = ux.kind === 'random', online = ux.kind === 'friends';
    const choices = `<details class="alternate-modes"><summary>다른 방식으로 플레이</summary><div class="alternate-buttons">${!random ? '<button class="text-button" data-action="kindRandom">랜덤 매칭 →</button>' : ''}${ux.kind !== 'solo' ? '<button class="text-button" data-action="kindSolo">혼자 봇과 연습 →</button>' : ''}${!online ? '<button class="text-button" data-action="kindFriends">친구끼리 플레이 →</button>' : ''}</div></details>`;
    let content;
    if (random) {
      content = `<div class="setup-meta"><span>5라운드 · 선택 10초 · 최대 4명</span><span class="fixed-rule">공통 규칙</span></div>${!matchInfo.enabled ? `<div class="server-offline" role="status">${!backendChecked ? '매칭 서버를 확인하고 있어요…' : serverAvailable ? '기존 서버는 연결됐지만 랜덤 매칭 업데이트가 필요해요. 전체 프로젝트의 서버도 함께 교체해 주세요.' : '튜토리얼과 봇 연습은 바로 가능해요. 랜덤 매칭은 서버가 실행 중인 웹 주소에서 이용해 주세요.'}</div>` : ''}<button class="btn btn-primary" data-action="match" ${busy || !matchInfo.enabled ? 'disabled' : ''}>${busy ? '대기열에 연결하는 중…' : '상대 찾기'} <span class="arrow">↗</span></button><p class="match-policy">4명이 모이면 즉시 시작.<br>${Math.round(matchInfo.fallbackMs / 1000)}초 대기 후 2명 이상이면 빈자리를 봇으로 채워요.<br>혼자라면 다른 사람이 올 때까지 기다려요.</p>${!matchInfo.enabled && backendChecked ? '<button class="text-button setup-secondary" data-action="connectionHelp">서버 연결 안내 →</button>' : ''}`;
    } else if (online) {
      content = `${!serverAvailable ? '<div class="server-offline">친구끼리 플레이하려면 같은 멀티플레이 서버 주소에서 열어 주세요.</div>' : ''}<button class="btn btn-primary" data-action="create" ${busy || !serverAvailable ? 'disabled' : ''}>방 만들기 →</button><button class="text-button setup-secondary" data-action="joinDialog" ${busy || !serverAvailable ? 'disabled' : ''}>초대 코드로 참가하기</button>`;
    } else {
      content = `<div class="setup-meta"><span>${config.rounds}라운드 · 선택 ${config.seconds}초</span><button class="text-button" data-action="settings">규칙 변경</button></div><button class="btn btn-primary" data-action="solo">연습 시작 →</button>`;
    }
    return `<section class="setup-panel"><button class="back-button" data-action="backHome">← 처음으로</button><div class="eyebrow">${random ? 'A STRANGER IN THE NIGHT.' : online ? 'BRING YOUR FRIENDS.' : 'A QUIET REHEARSAL.'}</div><h1 id="screenHeading" class="screen-title" tabindex="-1">${random ? '낯선 밤, 새로운 상대.' : online ? '오늘은, 아는 얼굴들.' : '혼자, 가볍게 한 판.'}</h1><p class="panel-desc">${random ? '방 코드 없이 만나, 서로의 마음을 읽어요.' : online ? '친구에게만 초대 링크를 보내세요.' : '나와 봇 3명. 연습 점수는 따로 쌓이지 않아요.'}</p>${nameHTML()}<div class="match-start">${content}</div><p id="setupError" class="inline-error" role="alert">${escapeHTML(ux.error)}</p>${choices}</section>`;
  }
  function queueHTML() {
    const q = queue?.view || {}, found = q.status === 'ready', count = q.count || 1;
    return `<section class="queue-panel"><div class="eyebrow hero-kicker">${found ? 'FOOTSTEPS AT THE DOOR.' : 'SOMEONE IS OUT THERE.'}</div><h1 id="screenHeading" class="screen-title" tabindex="-1">${found ? '발소리가 가까워졌다.' : '누군가의 밤과,<br>연결하는 중.'}</h1><p class="panel-desc">${found ? `사람 ${count}명${q.bots ? ` + 봇 ${q.bots}명` : ''}. 접속을 확인한 뒤 함께 출발해요.` : '같은 서버에서 상대를 찾고 있어요.<br>준비된 사람들이 모이면 자동으로 시작해요.'}</p><div class="queue-card"><div class="queue-card-top"><span>${found ? '매칭 준비' : '함께 기다리는 사람'}</span><strong id="queueCount" aria-live="polite">${count}<small> / 4</small></strong></div><div class="queue-seats" aria-label="사람 ${count}명${found && q.bots ? `, 봇 ${q.bots}명` : ''}">${[0,1,2,3].map(i => `<div class="queue-seat ${i < count ? 'occupied' : found ? 'bot-seat' : 'empty'}">${i === 0 ? avatar(0) : `<span class="unknown-seat" aria-hidden="true">${i < count ? '☾' : found ? '◇' : '·'}</span>`}<small>${i === 0 ? '나' : i < count ? '다른 사람' : found ? '봇' : '빈자리'}</small></div>`).join('')}</div><div class="queue-clock"><span>내 대기 시간</span><b id="queueElapsed" aria-live="off">00:00</b></div></div><p class="queue-status" id="queueStatus" role="status">${escapeHTML(queue?.error || q.notice || (found ? '접속을 확인하는 중…' : '아직은 고요해. 조금만 더.'))}</p><p class="queue-hint" id="queueHint"></p><button class="btn btn-line" data-action="cancelMatch" ${queueCancelling ? 'disabled' : ''}>${queueCancelling ? '취소를 확인하는 중…' : '매칭 취소'}</button><p class="queue-fine">${found ? '선택은 비밀. 공개는 동시에.' : '실제 접속자만 세고 있어요. 혼자면 경기가 시작되지 않아요.'}</p></section>`;
  }
  function updateQueueClock() {
    if (mode !== 'queue' || !queue) return;
    const q = queue.view || {}, elapsed = Math.max(0, Date.now() + queue.offset - (q.joinedAt || queue.startedAt));
    const time = $('queueElapsed');
    if (time) time.textContent = `${fmt(Math.floor(elapsed / 60000))}:${fmt(Math.floor(elapsed / 1000) % 60)}`;
    const hint = $('queueHint'); if (!hint) return;
    let text = '';
    if (q.status === 'ready') text = '매칭된 사람 모두의 연결을 확인하고 있어요.';
    else if ((q.count || 1) >= 2) {
      const seconds = Math.max(0, Math.ceil(((q.fallbackAt || 0) - Date.now() - queue.offset) / 1000));
      text = seconds ? `${seconds}초 안에 4명이 안 모이면, 빈자리를 봇으로 채워 출발해요.` : '지금 모인 사람들과 출발할 준비를 하고 있어요.';
    } else text = elapsed >= (q.fallbackMs || 20000) ? '지금은 상대가 없어요. 계속 기다리거나, 취소 후 봇과 연습해 보세요.' : '4명이 모이면 즉시 시작 · 2명 이상이면 잠시 뒤 봇과 함께 시작';
    if (hint.textContent !== text) hint.textContent = text;
  }
  function newQueueKey() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function stopQueuePolling() { queueEpoch++; clearTimeout(queueTimer); queueTimer = 0; queuePending = false; }
  function enterQueue(key, savedName = name) {
    closeDialog();disconnect();localRoom=null;tutor=null;tutorSerial++;optimisticCell=null;particles=[];
    stopQueuePolling(); queueCancelling=false; mode='queue'; connection='matching'; state={...demoState,phase:'home'};
    queue={ key, name:savedName, startedAt:Date.now(), offset:0, view:null, error:'' };render();focusHeading();window.scrollTo({top:0,behavior:'instant'});
  }
  function readQueueReply(reply, epoch) {
    if (mode !== 'queue' || !queue || epoch !== queueEpoch || queueCancelling) return;
    if (reply.status === 'matched') {
      stopQueuePolling(); storage.remove(QUEUE_KEY,true); queue=null;
      connectSession(reply.session); announce('매칭 완료. 잠시 뒤 게임이 시작돼요.');
      const m=reply.session.state.matchmaking;toast(`매칭 완료 · 사람 ${m.humans}명${m.bots ? ` + 봇 ${m.bots}명` : ''}`);return;
    }
    if (reply.status === 'expired' || reply.status === 'cancelled') {
      stopQueuePolling();storage.remove(QUEUE_KEY,true);queue=null;mode='home';connection='home';ux.page='setup';ux.kind='random';
      ux.error=reply.status==='expired'?'대기 연결이 만료됐어요. 상대 찾기를 다시 눌러 주세요.':'';render();focusHeading();return;
    }
    const previous = queue.view;
    queue.offset = reply.serverNow - Date.now(); queue.view=reply; queue.error='';
    if (!previous || previous.status!==reply.status || previous.count!==reply.count || previous.notice!==reply.notice) {render();if(previous?.status!==reply.status && reply.status==='ready')announce('상대를 찾았어요. 연결을 확인하는 중이에요.');}
    else if ($('queueStatus')) $('queueStatus').textContent=reply.notice || (reply.status==='ready'?'접속을 확인하는 중…':'서로의 연결을 기다리고 있어요.');
    updateQueueClock();
  }
  async function pollMatchmaking() {
    if (mode!=='queue'||!queue||queuePending||queueCancelling)return;
    const epoch=queueEpoch,key=queue.key;queuePending=true;
    try {readQueueReply(await api('/api/matchmake',undefined,key),epoch);}
    catch(e){if(mode==='queue'&&queue&&epoch===queueEpoch){queue.error='연결을 다시 확인하고 있어요. 대기 자리가 유지되는지 확인 중이에요.';if($('queueStatus'))$('queueStatus').textContent=queue.error;}}
    finally{if(epoch===queueEpoch){queuePending=false;if(mode==='queue'&&!queueCancelling)queueTimer=setTimeout(pollMatchmaking,queue?.view?.status==='ready'?450:1200);}}
  }
  async function startMatchmaking() {
    if (busy || !matchInfo.enabled) {if(!matchInfo.enabled)connectionHelp();return;}
    if (mode === 'online') {
      if (!isRandom() || state.phase !== 'finished') return;
      busy=true;
      try { await api('/api/action',{action:'leave'}); }
      catch {busy=false;toast('이전 경기에서 나가지 못했어요. 연결을 확인하고 다시 눌러 주세요.');return;}
      disconnect();storage.remove('cloud-pick:session',true);session=null;busy=false;
    }
    readName();busy=true;ux.error='';
    const key=newQueueKey();storage.set(QUEUE_KEY,JSON.stringify({key,name}),true);enterQueue(key);
    const epoch=queueEpoch;
    try {readQueueReply(await api('/api/matchmake',{name},key),epoch);}
    catch(e){if(mode==='queue'&&epoch===queueEpoch){queue.error='대기열 등록을 확인하지 못했어요. 연결을 확인하며 다시 확인할게요.';render();}}
    finally{busy=false;if(mode==='queue'&&epoch===queueEpoch)queueTimer=setTimeout(pollMatchmaking,500);}
  }
  async function cancelMatchmaking() {
    if(mode!=='queue'||!queue||queueCancelling)return;
    closeDialog();const key=queue.key;stopQueuePolling();queueCancelling=true;render();
    try {
      await api('/api/matchmake/cancel',{},key);
      storage.remove(QUEUE_KEY,true);queue=null;queueCancelling=false;mode='home';connection='home';ux.page='home';ux.error='';state={...demoState,config:{...config}};render();focusHeading();announce('매칭을 취소했어요.');
    } catch(e) {
      queueCancelling=false;queue.error='취소를 서버에 전달하지 못했어요. 연결을 확인한 뒤 매칭 취소를 다시 눌러 주세요.';render();
      // Do not acknowledge a ready match while cancellation is pending. The lease expires on the server.
    }
  }
  async function restoreMatchmaking() {
    let saved;try{saved=JSON.parse(storage.get(QUEUE_KEY,true));}catch{}
    if(!saved?.key||!matchInfo.enabled)return false;
    enterQueue(saved.key,saved.name);const epoch=queueEpoch;
    try{readQueueReply(await api('/api/matchmake',undefined,saved.key),epoch);}
    catch{queue.error='대기 연결을 다시 확인하고 있어요.';render();}
    if(mode==='queue'&&epoch===queueEpoch)queueTimer=setTimeout(pollMatchmaking,600);
    return true;
  }
  async function recoverOnlineSession(activeSession) {
    if(recovering||mode!=='online'||session!==activeSession)return;
    recovering=true;
    try{
      const next=await api('/api/state',undefined,activeSession.token);
      if(mode==='online'&&session===activeSession)connectSession({...activeSession,state:next});
    }catch(e){
      if(e.status===401&&mode==='online'&&session===activeSession){
        disconnect();storage.remove('cloud-pick:session',true);session=null;mode='home';state={...demoState,config:{...config}};ux.page='setup';ux.kind='random';ux.error='서버가 재시작되었거나 경기가 만료됐어요. 다시 매칭해 주세요.';render();focusHeading();
      }
    }finally{recovering=false;}
  }
  setInterval(updateQueueClock,250);
  setInterval(()=>{if(mode==='online'&&connection==='reconnecting'&&session)recoverOnlineSession(session);},5000);
