/* Cloud Pick — shared, dependency-free game rules. Used by server and offline play. */
(function (root) {
  'use strict';
  const HOMES = [7, 3, 1, 5];
  const TARGETS = [[6, 4, 8], [0, 4, 6], [0, 4, 2], [2, 4, 8]];
  const COLORS = ['#fa9775', '#63c6b2', '#af99e8', '#efc35b'];
  const BOT_NAMES = ['피치', '모모', '루루', '콩이'];
  const VERSION = '5.1.0';
  const DEFAULTS = { rounds: 10, seconds: 10, fillBots: true };
  const REWARD_CELLS = [0, 2, 4, 6, 8];
  const REWARD_SETS = { low: [1, 1, 2, 2, 4], mid: [1, 1, 2, 3, 5], high: [1, 2, 2, 3, 6] };
  const fail = (message) => { throw new Error(message); };
  const clampConfig = (config = {}) => ({
    rounds: [3, 5, 8, 10].includes(Number(config.rounds)) ? Number(config.rounds) : DEFAULTS.rounds,
    seconds: [5, 10, 15, 20].includes(Number(config.seconds)) ? Number(config.seconds) : 10,
    fillBots: config.fillBots !== false,
  });
  function shuffle(array, rng) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function makeBoard(rng = Math.random, level = 'low', jackpotCell = null) {
    const rewards = REWARD_SETS[level];
    if (!rewards) fail('Invalid reward level');
    const cells = shuffle(REWARD_CELLS, rng);
    const jackpot = jackpotCell === null ? cells[0] : jackpotCell;
    if (!REWARD_CELLS.includes(jackpot)) fail('Invalid jackpot cell');
    const board = Array(9).fill(0), others = shuffle(rewards.slice(0, -1), rng);
    board[jackpot] = rewards[4];
    REWARD_CELLS.filter(c => c !== jackpot).forEach((c, i) => { board[c] = others[i]; });
    return board;
  }
  // The schedule stays on the authoritative Room; snapshots never include future boards.
  function makeMatchBoards(rng = Math.random) {
    const levels = ['low', 'low', ...shuffle(['low', 'mid', 'high'], rng),
      ...shuffle(['mid', 'mid', 'high', 'high', 'high'], rng)];
    const jackpots = [...shuffle(REWARD_CELLS, rng), ...shuffle(REWARD_CELLS, rng)];
    return levels.map((level, i) => makeBoard(rng, level, jackpots[i]));
  }
  /* Bots only receive public information. Never pass human selections here. */
  function botChoice(slot, board, history, rng = Math.random) {
    const options = TARGETS[slot];
    const greed = .9; // One policy for all seats; only public outcomes affect weights.
    const weights = options.map(cell => {
      const recent = history.slice(-2).flatMap(r => r.results).filter(r => r.cell === cell).length;
      return Math.max(.2, Math.pow(board[cell], greed) / (1 + recent * .42));
    });
    let roll = rng() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < options.length; i++) { roll -= weights[i]; if (roll <= 0) return options[i]; }
    return options[options.length - 1];
  }
  class Room {
    constructor(code, config = {}, options = {}) {
      this.code = code;
      this.config = clampConfig(config);
      this.rng = options.rng || Math.random;
      this.timings = { prepare: 20000, countdown: 3000, between: 3000, reveal: 7000, break: 4000, ...options.timings };
      this.players = [];
      this.hostId = null;
      this.phase = 'lobby';
      this.round = 0;
      this.matchId = 0;
      this.board = makeBoard(this.rng);
      this.matchBoards = [];
      this.phaseEndsAt = 0;
      this.phaseStartedAt = 0;
      this.results = [];
      this.history = [];
      this.createdAt = Date.now();
      this.touchedAt = Date.now();
      this.revision = 0;
    }
    touch(now = Date.now()) { this.touchedAt = now; this.revision++; }
    player(id) { return this.players.find(p => p.id === id); }
    assertHost(id) { if (id !== this.hostId) fail('방장만 할 수 있어요.'); }
    addHuman(id, name, now = Date.now()) {
      if (this.phase !== 'lobby') fail('이미 게임이 시작됐어요. 다음 판에 참가해 주세요.');
      if (this.players.some(p => p.id === id)) fail('이미 참가한 플레이어예요.');
      if (this.players.length >= 4) {
        const bot = this.players.find(p => p.bot);
        if (bot) this.players = this.players.filter(p => p !== bot);
        else fail('방이 가득 찼어요. 최대 4명까지 참가할 수 있어요.');
      }
      const slot = [0, 1, 2, 3].find(s => !this.players.some(p => p.slot === s));
      const player = { id, name: String(name || '플레이어').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 12) || '플레이어', slot, bot: false, connected: true, departed: false, score: 0, selected: null, locked: false, ready: false, botAt: 0 };
      this.players.push(player);
      this.players.sort((a, b) => a.slot - b.slot);
      if (!this.hostId) this.hostId = id;
      this.touch(now);
      return player;
    }
    addBot(hostId, now = Date.now()) {
      this.assertHost(hostId);
      if (this.phase !== 'lobby') fail('대기실에서만 봇을 추가할 수 있어요.');
      if (this.players.length >= 4) fail('빈자리가 없어요.');
      const slot = [0, 1, 2, 3].find(s => !this.players.some(p => p.slot === s));
      this.players.push({ id: `bot-${slot}`, name: BOT_NAMES[slot], slot, bot: true, connected: true, departed: false, score: 0, selected: null, locked: false, botAt: 0 });
      this.players.sort((a, b) => a.slot - b.slot);
      this.touch(now);
    }
    removeBot(hostId, botId, now = Date.now()) {
      this.assertHost(hostId);
      if (this.phase !== 'lobby') fail('대기실에서만 봇을 뺄 수 있어요.');
      this.players = this.players.filter(p => !(p.bot && p.id === botId)); this.touch(now);
    }
    configure(hostId, config, now = Date.now()) {
      this.assertHost(hostId);
      if (this.phase !== 'lobby') fail('대기실에서만 규칙을 바꿀 수 있어요.');
      this.config = clampConfig({ ...this.config, ...config }); this.touch(now);
    }
    setConnected(id, connected, now = Date.now()) {
      const p = this.player(id); if (!p || p.bot) return;
      p.connected = connected;
      if (connected && (!this.hostId || !this.player(this.hostId)?.connected)) this.hostId = id;
      if (!connected && this.hostId === id) {
        const next = this.players.find(x => !x.bot && x.connected && !x.departed && x.id !== id);
        if (next) this.hostId = next.id;
      }
      this.touch(now);
    }
    leave(id, now = Date.now()) {
      const p = this.player(id); if (!p) return;
      p.connected = false; p.departed = true; p.selected = null;
      if (this.phase === 'choose') p.locked = true;
      p.ready = true;
      if (this.phase === 'lobby' || this.phase === 'finished') this.players = this.players.filter(x => x.id !== id);
      if (this.hostId === id) this.hostId = this.players.find(x => !x.bot && x.connected && !x.departed)?.id || null;
      this.touch(now);
    }
    start(hostId, now = Date.now()) {
      this.assertHost(hostId);
      if (!['lobby', 'finished'].includes(this.phase)) fail('진행 중인 게임이 있어요.');
      this.players = this.players.filter(p => !p.departed && (p.bot || p.connected));
      if (this.config.fillBots) {
        this.phase = 'lobby';
        while (this.players.length < 4) this.addBot(hostId, now);
      }
      if (this.players.length < 2) fail('2명 이상 필요해요. 봇을 추가하거나 친구를 초대해 주세요.');
      this.players.forEach(p => { p.score = 0; p.selected = null; p.locked = false; p.ready = !!p.bot; });
      this.round = 0; this.matchId++; this.results = []; this.history = [];
      this.matchBoards = makeMatchBoards(this.rng);
      this.board = this.matchBoards[0].slice();
      this.phase = 'prepare'; this.phaseStartedAt = now; this.phaseEndsAt = now + this.timings.prepare;
      this.touch(now);
    }
    ready(id, matchId, now = Date.now()) {
      if (this.phase !== 'prepare' || this.matchId !== matchId) fail('준비 시간이 끝났습니다.');
      const p = this.player(id);
      if (!p || p.bot || p.departed) fail('참가 정보를 찾을 수 없습니다.');
      p.ready = true; this.touch(now);
      if (this.players.every(x => x.ready || x.departed)) this.nextRound(now, true);
    }
    nextRound(now, first = false) {
      this.round++; this.board = this.matchBoards[this.round - 1].slice(); this.results = [];
      this.players.forEach(p => { p.selected = null; p.locked = false; });
      this.phase = 'countdown'; this.phaseStartedAt = now;
      this.phaseEndsAt = now + (first ? this.timings.countdown : this.timings.between);
      this.touch(now);
    }
    beginChoice(now) {
      this.phase = 'choose'; this.phaseStartedAt = now;
      this.phaseEndsAt = now + this.config.seconds * 1000;
      this.players.forEach(p => {
        p.botAt = now + 700 + this.rng() * (this.config.seconds * 650 - 700);
        if (p.departed) p.locked = true;
      });
      this.touch(now);
    }
    select(id, cell, round, matchId, lock = false, now = Date.now()) {
      if (this.phase !== 'choose' || now >= this.phaseEndsAt) fail('선택 시간이 끝났어요.');
      if (round !== this.round || matchId !== this.matchId) fail('이전 라운드의 선택은 적용할 수 없어요.');
      const p = this.player(id);
      if (!p || p.bot || p.departed) fail('참가 정보를 찾을 수 없어요.');
      if (p.locked) fail('이미 확정했어요. 다음 라운드를 기다려 주세요.');
      if (!Number.isInteger(cell) || !TARGETS[p.slot].includes(cell)) fail('내 캐릭터 옆의 구름 3개 중에서 골라 주세요.');
      p.selected = cell;
      if (lock) p.locked = true;
      this.touch(now);
      if (lock && this.players.every(p => p.locked)) this.resolve(now);
    }
    resolve(now) {
      if (this.phase !== 'choose') return;
      const count = {};
      this.players.forEach(p => { if (p.selected !== null) count[p.selected] = (count[p.selected] || 0) + 1; });
      this.results = this.players.map(p => {
        const missed = p.selected === null;
        const collision = !missed && count[p.selected] > 1;
        const gain = !missed && !collision ? this.board[p.selected] : 0;
        p.score += gain;
        const r = { id: p.id, slot: p.slot, cell: p.selected, gain, collision, missed, automatic: !p.locked };
        p.locked = true;
        return r;
      });
      this.history.push({ round: this.round, board: this.board.slice(), results: this.results.map(r => ({ ...r })) });
      this.phase = 'reveal'; this.phaseStartedAt = now;
      this.phaseEndsAt = now + this.timings.reveal + ((this.round === 4 || this.round === 8) && this.round < this.config.rounds ? this.timings.break : 0);
      this.touch(now);
    }
    advance(now = Date.now()) {
      const before = this.revision;
      if (this.phase === 'prepare' && now >= this.phaseEndsAt) this.nextRound(now, true);
      else if (this.phase === 'countdown' && now >= this.phaseEndsAt) this.beginChoice(now);
      else if (this.phase === 'choose') {
        // Apply the deadline before processing bots that woke up too late.
        if (now >= this.phaseEndsAt) this.resolve(now);
        else {
          this.players.filter(p => p.bot && !p.locked && now >= p.botAt).forEach(p => {
            p.selected = botChoice(p.slot, this.board, this.history, this.rng);
            p.locked = true; this.touch(now);
          });
          if (this.players.every(p => p.locked)) this.resolve(now);
        }
      } else if (this.phase === 'reveal' && now >= this.phaseEndsAt) {
        if (this.round >= this.config.rounds) {
          this.phase = 'finished'; this.phaseStartedAt = now; this.phaseEndsAt = 0; this.touch(now);
        } else this.nextRound(now);
      }
      return this.revision !== before;
    }
    returnToLobby(hostId, now = Date.now()) {
      this.assertHost(hostId);
      if (this.phase !== 'finished') fail('게임이 끝난 뒤 대기실로 돌아갈 수 있어요.');
      this.players = this.players.filter(p => !p.departed && (p.bot || p.connected));
      this.players.forEach(p => { p.score = 0; p.selected = null; p.locked = false; });
      this.phase = 'lobby'; this.round = 0; this.results = []; this.history = [];
      this.phaseEndsAt = 0; this.board = makeBoard(this.rng); this.touch(now);
    }
    snapshot(viewerId, now = Date.now()) {
      const reveal = this.phase === 'reveal' || this.phase === 'finished';
      return {
        code: this.code, hostId: this.hostId, config: { ...this.config }, phase: this.phase,
        round: this.round, matchId: this.matchId, board: this.board.slice(),
        phaseStartedAt: this.phaseStartedAt, phaseEndsAt: this.phaseEndsAt, serverNow: now,
        revision: this.revision, yourId: viewerId,
        players: this.players.map(p => ({ id: p.id, name: p.name, slot: p.slot, bot: p.bot,
          connected: p.connected, departed: p.departed, score: p.score, locked: p.locked, ready: !!p.ready,
          // A locked player reveals only readiness, NEVER their destination.
          selected: p.id === viewerId || reveal ? p.selected : null,
        })),
        results: reveal ? this.results.map(r => ({ ...r })) : [],
        history: this.history.map(h => ({ round: h.round, board: h.board.slice(), results: h.results.map(r => ({ ...r })) })),
      };
    }
  }
  root.CloudGame = { VERSION, REWARD_CELLS, REWARD_SETS, makeMatchBoards, Room, HOMES, TARGETS, COLORS, BOT_NAMES, DEFAULTS, makeBoard, botChoice, clampConfig };
})(typeof globalThis !== 'undefined' ? globalThis : this);
