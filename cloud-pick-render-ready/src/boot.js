  new ResizeObserver(resize).observe($('stage'));
  setInterval(()=>{
    if($('dialog').open||pausedAt)return;
    if(mode==='solo'&&localRoom&&localRoom.advance())applyState(localRoom.snapshot('you'));
    else if(mode==='tutorial'&&tutor?.stage==='timed'&&Date.now()>=tutor.room.phaseEndsAt)tutorialResolve();
    presentReveal();
  },65);
  window.addEventListener('pagehide',disconnect);
  window.addEventListener('pageshow',event=>{if(event.persisted&&mode==='online'&&session)restoreSession();else if(event.persisted&&mode==='queue')restoreMatchmaking();});
  async function restoreSession(){
    let saved;try{saved=JSON.parse(storage.get('cloud-pick:session',true));}catch{}
    if(!saved?.token)return false;
    try{const next=await api('/api/state',undefined,saved.token);connectSession({...saved,state:next});toast('이전 경기로 다시 연결했어요.');return true;}
    catch{storage.remove('cloud-pick:session',true);return false;}
  }
  let healthRetry = 0, healthTimer = 0;
  async function initializeBackend(restore=true){
    clearTimeout(healthTimer);
    if(location.protocol==='http:'||location.protocol==='https:'){
      try{const health=await api('/api/health',undefined,null);serverAvailable=health.ok&&health.app==='cloud-pick';matchInfo={...matchInfo,...health.matchmaking,enabled:serverAvailable&&health.matchmaking?.enabled===true};}catch{serverAvailable=false;matchInfo.enabled=false;}
    }
    backendChecked=true;
    if (!serverAvailable && ['http:', 'https:'].includes(location.protocol) && healthRetry < 8) {
      const delay = Math.min(15000, 2000 * (1 + healthRetry++));
      healthTimer = setTimeout(() => initializeBackend(restore), delay);
    } else if (serverAvailable) healthRetry = 0;
    // A delayed health check must not overwrite a tutorial or practice already started.
    if(restore&&serverAvailable&&mode==='home'&&await restoreSession())return;
    if(restore&&serverAvailable&&mode==='home'&&await restoreMatchmaking())return;
    render();
    const invited=new URLSearchParams(location.search).get('room');
    if(restore&&mode==='home'&&invited&&/^[A-Z2-9]{6}$/i.test(invited)){openSetup('friends');joinDialog(invited.toUpperCase());}
  }
  // Read-only diagnostic view. Never exposes session tokens or unseen opponent choices.
  window.__CLOUD_DEBUG__=Object.freeze({
    getState:()=>JSON.parse(JSON.stringify(state)),getMode:()=>mode,
    getUX:()=>({screen:screenName(),tutorial:tutor?{step:tutor.step,stage:tutor.stage,changed:tutor.changed}:null,paused:!!pausedAt,learned:storage.get(LEARN_KEY)==='done'}),
    getQueue:()=>queue?{status:queue.view?.status||'connecting',count:queue.view?.count||1,joinedAt:queue.view?.joinedAt,error:queue.error}:null,
    getTheme:()=>({version:G.VERSION,design:'v0.37',name:'AFTER DARK · RANDOM MATCH',reducedMotion,muted,embeddedArtwork:true}),
  });
  render();resize();requestAnimationFrame(frame);initializeBackend();
})();
