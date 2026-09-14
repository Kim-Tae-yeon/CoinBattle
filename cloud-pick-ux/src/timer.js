  function drawTimerAndBanner(){
    const duration=state.phaseEndsAt-state.phaseStartedAt,remaining=Math.max(0,state.phaseEndsAt-now()),secs=Math.ceil(remaining/1000);
    const lesson=mode==='tutorial',timed=lesson&&tutor?.stage==='timed';
    let value='☾',label=lesson?'천천히':'',progress=1,banner='';
    if(state.phase==='choose'&&(!lesson||timed)){
      value=fmt(secs);label='초';progress=duration?remaining/duration:0;
      if(secs>0&&secs<=3&&lastBeep!==secs&&!pausedAt){lastBeep=secs;tone(72,0,.16,.052,'sine');tone(63,.19,.14,.032,'sine');tone(690+(3-secs)*70,0,.05,.012,'triangle');announce(`${secs}초 남았어요.`);}
      if(secs<=3&&!me().locked)banner='<span class="banner-eyebrow">DON’T BLINK.</span><strong>지금 결정해.</strong>';
    }else if(state.phase==='countdown'){
      value=String(secs||1);label='준비';progress=remaining/duration;
      banner='<span class="banner-eyebrow">A MOMENT OF SILENCE.</span><strong>욕심낼까, 피해 갈까.</strong>';
    }else if(state.phase==='reveal'){
      value=lesson?'✓':String(Math.max(1,secs));label=lesson?'확인':'다음';progress=lesson?1:remaining/duration;
      if(!revealVisible())banner='<span class="banner-eyebrow">THE MOMENT OF TRUTH.</span><strong>함께, 공개.</strong>';
    }
    if($('timerValue').textContent!==value)$('timerValue').textContent=value;
    if($('timerLabel').textContent!==label)$('timerLabel').textContent=label;
    $('timerProgress').style.strokeDashoffset=String(175.93*(1-Math.max(0,Math.min(1,progress))));
    const urgent=state.phase==='choose'&&(!lesson||timed)&&secs<=3&&secs>0;
    $('timer').classList.toggle('urgent',urgent);const u=String(urgent);if($('stage').dataset.urgent!==u)$('stage').dataset.urgent=u;
    if($('phaseBanner').innerHTML!==banner)$('phaseBanner').innerHTML=banner;
  }
