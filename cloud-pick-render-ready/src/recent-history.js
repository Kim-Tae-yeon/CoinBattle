  // Memory aid only: completed earlier rounds, never the current destination.
  // Read historical board values even when a collision awarded zero coins.
  function recentOpponentChoices(snapshot, playerId) {
    if (!snapshot || playerId === snapshot.yourId ||
        !['countdown', 'choose', 'reveal'].includes(snapshot.phase) ||
        !Number.isInteger(snapshot.round) || snapshot.round <= 1) return [];
    const rounds = new Map();
    for (const entry of snapshot.history || []) {
      if (!Number.isInteger(entry.round) || entry.round < 1 || entry.round >= snapshot.round) continue;
      const result = entry.results?.find(r => r.id === playerId);
      if (!result) continue;
      if (result.missed || result.cell === null) {
        rounds.set(entry.round, { round: entry.round, cell: null, coins: null, outcome: '미선택' });
      } else if ([0, 2, 4, 6, 8].includes(result.cell) &&
                 Number.isInteger(entry.board?.[result.cell]) && entry.board[result.cell] > 0) {
        rounds.set(entry.round, { round: entry.round, cell: result.cell,
          coins: entry.board[result.cell], outcome: result.collision ? '겹침' : '단독' });
      }
    }
    return [...rounds.values()].sort((a, b) => a.round - b.round).slice(-2);
  }
  function recentChoicesHTML(player) {
    const rows = recentOpponentChoices(state, player.id);
    if (!rows.length) return '';
    const shortNames = { 0: '좌상', 2: '우상', 4: '중앙', 6: '좌하', 8: '우하' };
    return `<ol class="recent-choices" aria-label="최근 공개 선택, 위에서부터 시간순">${rows.map(r => {
      const label = r.cell === null ? `${r.round}라운드, 미선택` :
        `${r.round}라운드, ${CELL_NAMES[r.cell]} 구름, 당시 ${r.coins}코인, ${r.outcome}`;
      return `<li class="recent-choice" data-round="${r.round}" aria-label="${label}">` +
        `<span class="history-round" aria-hidden="true">R${r.round}</span>` +
        (r.cell === null ? '<span class="history-place" aria-hidden="true">—</span>' :
          `<span class="history-place" aria-hidden="true">${shortNames[r.cell]}</span>`) +
        `<span class="history-coins" aria-hidden="true">${r.coins === null ? '—' : r.coins}</span>` +
        `<span class="history-outcome" aria-hidden="true">${r.outcome}</span></li>`;
    }).join('')}</ol>`;
  }
