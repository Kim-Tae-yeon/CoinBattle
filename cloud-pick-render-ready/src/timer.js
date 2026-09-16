  function drawTimerAndBanner(){
    const duration=state.phaseEndsAt-state.phaseStartedAt,remaining=Math.max(0,state.phaseEndsAt-now()),secs=Math.ceil(remaining/1000);
    const lesson=mode==='tutorial',timed=lesson&&tutor?.stage==='timed';
    let value='—',label=lesson?'연습':'',progress=1,banner='';
    if(state.phase==='choose'&&(!lesson||timed)){
      value=fmt(secs);label='초';progress=duration?remaining/duration:0;
      if(secs>0&&secs<=3&&lastBeep!==secs&&!pausedAt){lastBeep=secs;tone(72,0,.16,.052,'sine');tone(63,.19,.14,.032,'sine');announce(`${secs}초 남았습니다.`);}
      if(secs<=3&&!me().locked)banner='<strong>선택 후 확정하세요</strong>';
    }else if(state.phase==='bait_choose'||state.phase==='bait_reveal'){
      value=String(secs);label=state.phase==='bait_choose'?'미끼 배치':'공개';progress=duration?remaining/duration:0;
      banner=state.phase==='bait_choose'?'<strong>미끼 배치 · 이동 선택은 다음</strong>':'<strong>미끼 공개</strong>';
    }else if(state.phase==='prepare'){
      value=String(secs);label='준비';progress=duration?remaining/duration:0;
      banner=`<strong>${state.players.filter(p=>p.ready).length}/${state.players.length}명 준비 완료</strong>`;
    }else if(state.phase==='countdown'){
      value=String(secs||1);label='초 후 시작';progress=duration?remaining/duration:0;
      banner='<strong>구름의 코인 수를 확인하세요</strong>';
    }else if(state.phase==='reveal'){
      value=lesson?'✓':String(Math.max(1,secs));label=lesson?'결과':state.round===state.config.rounds?'종료':'다음';progress=lesson?1:remaining/duration;
      if(!revealVisible())banner='<strong>선택 공개 중</strong>';
    }
    if($('timerValue').textContent!==value)$('timerValue').textContent=value;
    if($('timerLabel').textContent!==label)$('timerLabel').textContent=label;
    $('timerProgress').style.strokeDashoffset=String(175.93*(1-Math.max(0,Math.min(1,progress))));
    const urgent=state.phase==='choose'&&(!lesson||timed)&&secs<=3&&secs>0;
    $('timer').classList.toggle('urgent',urgent);const u=String(urgent);if($('stage').dataset.urgent!==u)$('stage').dataset.urgent=u;
    if($('phaseBanner').innerHTML!==banner)$('phaseBanner').innerHTML=banner;
    drawBaitMarkers();
  }
