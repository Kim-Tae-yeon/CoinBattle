  // Second-match expansion UI. No opponent inventory or historical choices are retained.
  let baitDraft = null, baitBusy = false, rematchBusy = false;
  function baitRulesHTML() {
    return '<div class="bait-rules"><strong>미끼 코인 · 1개</strong><span>6·9라운드 전에 내 구름 하나에 +1을 놓을 수 있습니다.</span><span>놓은 사람과 위치가 공개됩니다. 혼자 도착한 사람이 보너스를 얻습니다.</span><span>같은 구름에 여러 개를 놓아도 +1. 사용한 미끼는 모두 소모됩니다.</span></div>';
  }
  function baitControlsHTML() {
    const own = state.bait.own, connected = mode !== 'online' || connection === 'connected';
    if (state.phase === 'bait_reveal') {
      const places = state.bait.placements;
      return `<div class="bait-panel"><strong>미끼 공개</strong><div class="bait-signals" role="status">${places.length ? places.map(v => {
        const p = state.players.find(p => p.id === v.id);
        return `<span>${avatar(v.slot)}<b>${escapeHTML(p?.name || '플레이어')}</b><span>→ ${CELL_NAMES[v.cell]} +1</span></span>`;
      }).join('') : '<span>놓인 미끼 없음</span>'}</div><small>곧 구름을 선택합니다. 구름의 숫자는 +1 보너스가 포함된 총량입니다.</small></div>`;
    }
    if (own.locked || own.remaining === 0) {
      return `<div class="bait-panel"><strong>${own.cell !== null ? `${CELL_NAMES[own.cell]}에 미끼 확정` : own.remaining === 0 ? '미끼 사용 완료' : '이번에는 보류'}</strong><small>미끼 공개를 기다리는 중</small></div>`;
    }
    const canSend = connected && !baitBusy;
    return `<div class="bait-panel"><div class="bait-heading"><strong>미끼를 놓을 구름</strong><span>남은 미끼 1개</span></div><small>혼자 도착한 사람에게 +1. 보류하면 지금 사용하지 않습니다.</small><div class="bait-options" role="group" aria-label="미끼 위치">${options().map((cell, i) => `<button class="pick-btn" data-action="baitPick" data-cell="${cell}" aria-label="${CELL_NAMES[cell]} ${state.board[cell]}코인에 미끼" aria-pressed="${baitDraft === cell}" ${!canSend ? 'disabled' : ''}><kbd>${i + 1}</kbd>${coin}<strong>${state.board[cell]}</strong></button>`).join('')}</div><div class="bait-actions"><button class="btn btn-primary" data-action="baitConfirm" ${!canSend || baitDraft === null ? 'disabled' : ''}>${baitBusy ? '전송 중' : '미끼 확정'}</button><button class="btn btn-line" data-action="baitHold" ${!canSend ? 'disabled' : ''}>보류</button></div></div>`;
  }
  function chooseBait(cell) {
    if (state.phase !== 'bait_choose' || state.bait.own.locked || !state.bait.own.remaining || baitBusy || !options().includes(cell) || $('dialog').open) return;
    baitDraft = cell; sound('select'); renderChoiceBar();
  }
  async function submitBait(hold = false) {
    if (baitBusy || state.phase !== 'bait_choose' || state.bait.own.locked || (mode === 'online' && connection !== 'connected')) return;
    const cell = hold ? null : baitDraft;
    if (!hold && cell === null) return;
    baitBusy = true; renderChoiceBar();
    try { await action('bait', { cell, round: state.round, matchId: state.matchId }); }
    finally { baitBusy = false; renderChoiceBar(); }
  }
  function rematchHTML() {
    const r = state.rematch;
    if (!r || mode !== 'online') return '';
    if (r.status !== 'open') return '<p class="rematch-note" role="status">같은 멤버 재경기가 종료됐습니다. 새 상대를 찾을 수 있습니다.</p>';
    const disabled = r.ownVote || rematchBusy || connection !== 'connected';
    return `<section class="rematch-panel" aria-label="같은 멤버로 재경기"><div class="bait-heading"><h2>같은 멤버로 한 판 더</h2><span id="rematchSeconds" role="timer"></span></div><p>전원 동의하면 시작합니다. 응답이 없거나 누군가 나가면 취소됩니다.</p>${r.allowBait ? `<details><summary>미끼 확장 규칙</summary>${baitRulesHTML()}</details><p>전원 미끼 확장에 동의해야 적용됩니다. 기본판 선택이 있으면 모두 기본판입니다.</p>` : '<p>봇이 있는 방은 기본판만 가능합니다.</p>'}<div class="rematch-actions"><button class="btn btn-line" data-action="rematchVote" data-choice="base" ${disabled ? 'disabled' : ''}>기본판으로</button>${r.allowBait ? `<button class="btn btn-primary" data-action="rematchVote" data-choice="bait" ${disabled ? 'disabled' : ''}>미끼 확장 동의</button>` : ''}</div><p role="status">${r.ownVote ? (r.ownVote === 'bait' ? '미끼 확장에 동의했습니다.' : '기본판 재경기에 동의했습니다.') : '선택은 확정 후 바꿀 수 없습니다.'} ${r.count}/${r.total}명 응답</p></section>`;
  }
  async function voteForRematch(choice) {
    if (rematchBusy || state.rematch?.status !== 'open' || state.rematch.ownVote || connection !== 'connected') return;
    rematchBusy = true; renderFinish();
    try { await action('rematch', { choice, matchId: state.matchId }); }
    finally { rematchBusy = false; renderFinish(); }
  }
  function drawBaitMarkers() {
    const phase = state.phase;
    if (!state.bait?.enabled || !['bait_choose', 'bait_reveal', 'choose', 'reveal'].includes(phase)) return;
    const cells = phase === 'bait_choose' ? (baitDraft === null ? [] : [baitDraft]) : state.bait.cells;
    for (const cell of cells) {
      const c = view.cells[cell]; if (!c) continue;
      tag(phase === 'bait_choose' ? '미끼 선택' : '+1 포함', c.x, c.y + 52 * c.s, '#fff0d8', '#1c2232', 12, '#1c2232');
    }
  }
  document.addEventListener('click', event => {
    const b = event.target.closest('[data-action]'); if (!b || b.disabled) return;
    if (b.dataset.action === 'baitPick') chooseBait(Number(b.dataset.cell));
    else if (b.dataset.action === 'baitConfirm') submitBait();
    else if (b.dataset.action === 'baitHold') submitBait(true);
    else if (b.dataset.action === 'rematchVote') voteForRematch(b.dataset.choice);
  });
  setInterval(() => {
    const timer = $('rematchSeconds');
    if (timer && state.rematch?.status === 'open') timer.textContent = `${Math.max(0, Math.ceil((state.rematch.endsAt - now()) / 1000))}초`;
  }, 250);
