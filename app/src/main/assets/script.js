const STORAGE_KEY = 'customFootballLeagueStateV4';

const DEFAULT_LEAGUE_TEAMS = ['Tim 1', 'Tim 2', 'Tim 3'];
const DEFAULT_CUP_TEAMS = ['Tim 1', 'Tim 2', 'Tim 3', 'Tim 4', 'Tim 5', 'Tim 6', 'Tim 7', 'Tim 8'];

const defaultState = () => ({
  league: null,
  cup: null,
  competitions: [],
  selectedCompetitionId: null,
  historyFilter: 'all',
  drafts: {
    leagueTeams: [...DEFAULT_LEAGUE_TEAMS],
    cupTeams: [...DEFAULT_CUP_TEAMS]
  },
  previews: {
    league: null,
    cup: null
  }
});

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      drafts: { ...base.drafts, ...(parsed.drafts || {}) },
      previews: { ...base.previews, ...(parsed.previews || {}) },
      competitions: parsed.competitions || []
    };
  } catch (error) {
    console.warn('Data lokal gagal dibaca:', error);
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2300);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function uniqueTeams(teams) {
  const clean = teams.map(team => team.trim()).filter(Boolean);
  return [...new Set(clean)];
}

function byId(id) {
  return document.getElementById(id);
}

function getDraftKey(kind) {
  return kind === 'league' ? 'leagueTeams' : 'cupTeams';
}

function getDraftTeams(kind) {
  return uniqueTeams(state.drafts[getDraftKey(kind)]);
}

function saveCompetition(comp) {
  comp.updatedAt = new Date().toISOString();
  const index = state.competitions.findIndex(item => item.id === comp.id);
  if (index >= 0) state.competitions[index] = clone(comp);
  else state.competitions.unshift(clone(comp));
}

function getSelectedCompetition() {
  return state.competitions.find(item => item.id === state.selectedCompetitionId) || null;
}

function makeMatch(prefix, phase, round, home, away, extra = {}) {
  return {
    id: uid(prefix),
    type: extra.type || (prefix.includes('cup') ? 'Cup' : 'Liga'),
    phase,
    round,
    home,
    away,
    homeScore: null,
    awayScore: null,
    status: 'Belum Main',
    playedAt: null,
    ...extra
  };
}

function statusBadge(match) {
  if (match.status === 'Selesai') return '<span class="badge done">Selesai</span>';
  return '<span class="badge wait">Belum Main</span>';
}

function scoreText(match) {
  if (match.status !== 'Selesai') return '-';
  return `${match.homeScore} - ${match.awayScore}`;
}

function matchWinner(match) {
  if (match.status !== 'Selesai') return null;
  const home = Number(match.homeScore);
  const away = Number(match.awayScore);
  if (home > away) return match.home;
  if (away > home) return match.away;
  return 'Seri';
}

function readScore(id) {
  const input = byId(id);
  if (!input) return null;
  const value = input.value.trim();
  if (value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) return null;
  return number;
}

function randomScore(allowDraw = true) {
  const home = Math.floor(Math.random() * 6);
  let away = Math.floor(Math.random() * 6);
  if (!allowDraw) {
    while (away === home) away = Math.floor(Math.random() * 6);
  }
  return [home, away];
}

function initialTable(teams) {
  const table = {};
  teams.forEach(team => {
    table[team] = {
      team,
      played: 0,
      win: 0,
      draw: 0,
      lose: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      point: 0
    };
  });
  return table;
}

function applyMatch(table, match) {
  if (match.status !== 'Selesai') return;
  const home = table[match.home];
  const away = table[match.away];
  if (!home || !away) return;

  const hs = Number(match.homeScore);
  const as = Number(match.awayScore);

  home.played += 1;
  away.played += 1;
  home.gf += hs;
  home.ga += as;
  away.gf += as;
  away.ga += hs;

  if (hs > as) {
    home.win += 1;
    home.point += 3;
    away.lose += 1;
  } else if (as > hs) {
    away.win += 1;
    away.point += 3;
    home.lose += 1;
  } else {
    home.draw += 1;
    away.draw += 1;
    home.point += 1;
    away.point += 1;
  }

  home.gd = home.gf - home.ga;
  away.gd = away.gf - away.ga;
}

function sortedTable(table) {
  return Object.values(table).sort((a, b) => {
    return b.point - a.point || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team);
  });
}

function computeTable(teams, matches) {
  const table = initialTable(teams);
  matches.forEach(match => applyMatch(table, match));
  return sortedTable(table);
}

function tableHtml(rows) {
  if (!rows.length) return '<div class="empty">Belum ada klasemen.</div>';
  return `
    <table>
      <thead>
        <tr>
          <th>Pos</th>
          <th>Tim</th>
          <th>Main</th>
          <th>M</th>
          <th>S</th>
          <th>K</th>
          <th>GM</th>
          <th>GK</th>
          <th>SG</th>
          <th>Poin</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(row.team)}</strong></td>
            <td>${row.played}</td>
            <td>${row.win}</td>
            <td>${row.draw}</td>
            <td>${row.lose}</td>
            <td>${row.gf}</td>
            <td>${row.ga}</td>
            <td>${row.gd > 0 ? '+' : ''}${row.gd}</td>
            <td><strong>${row.point}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function optionHtml(teams, selected) {
  return teams.map(team => `<option value="${escapeHtml(team)}" ${team === selected ? 'selected' : ''}>${escapeHtml(team)}</option>`).join('');
}

function renderTeamRows(kind) {
  const key = getDraftKey(kind);
  const body = byId(kind === 'league' ? 'leagueTeamRows' : 'cupTeamRows');
  const teams = state.drafts[key];
  body.innerHTML = teams.map((team, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><input class="team-input" data-kind="${kind}" data-index="${index}" value="${escapeHtml(team)}" placeholder="Nama tim" /></td>
      <td><button class="small-btn" data-action="remove-team" data-kind="${kind}" data-index="${index}">Hapus</button></td>
    </tr>
  `).join('');
}

function addTeamRow(kind) {
  state.drafts[getDraftKey(kind)].push('');
  clearPreview(kind, false);
  saveState();
  renderAll();
}

function removeTeamRow(kind, index) {
  const key = getDraftKey(kind);
  if (state.drafts[key].length <= 1) {
    toast('Minimal sisakan satu kolom tim.');
    return;
  }
  state.drafts[key].splice(index, 1);
  clearPreview(kind, false);
  saveState();
  renderAll();
}

function shuffleDraftTeams(kind) {
  const key = getDraftKey(kind);
  state.drafts[key] = shuffle(state.drafts[key]);
  clearPreview(kind, false);
  saveState();
  renderAll();
  toast('Urutan tim diacak.');
}

function clearPreview(kind, showToast = true) {
  if (kind === 'league') state.previews.league = null;
  if (kind === 'cup') state.previews.cup = null;
  if (showToast) toast('Preview dibersihkan.');
}

function generateSingleRoundRobinRounds(teams) {
  const list = [...teams];
  if (list.length % 2 === 1) list.push(null);

  const rounds = [];
  const totalRounds = list.length - 1;
  const matchesPerRound = list.length / 2;

  for (let round = 0; round < totalRounds; round++) {
    const roundPairs = [];

    for (let i = 0; i < matchesPerRound; i++) {
      const a = list[i];
      const b = list[list.length - 1 - i];
      if (!a || !b) continue;

      let home = a;
      let away = b;
      if ((round + i) % 2 === 1) {
        home = b;
        away = a;
      }

      roundPairs.push({ home, away });
    }

    rounds.push(roundPairs);

    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop());
    list.splice(0, list.length, fixed, ...rest);
  }

  return rounds;
}

function generateLeagueMatches(teams) {
  const firstLegRounds = generateSingleRoundRobinRounds(teams);
  const secondLegRounds = firstLegRounds.map(round => round.map(match => ({
    home: match.away,
    away: match.home
  })));

  const allRounds = [...firstLegRounds, ...secondLegRounds];
  let order = 0;
  return allRounds.flatMap((round, roundIndex) => {
    const roundMatches = shuffle(round);
    return roundMatches.map(pair => {
      order += 1;
      return makeMatch('league-match', 'league', `Matchday ${roundIndex + 1}`, pair.home, pair.away, {
        order,
        type: 'Liga'
      });
    });
  });
}

function createLeaguePreview() {
  const teams = getDraftTeams('league');
  if (teams.length < 3) {
    toast('Liga minimal membutuhkan 3 tim.');
    return;
  }

  const randomizedTeams = shuffle(teams);
  state.previews.league = {
    id: uid('league-preview'),
    type: 'Liga',
    mode: 'Double home-away',
    teams: randomizedTeams,
    matches: generateLeagueMatches(randomizedTeams),
    createdAt: new Date().toISOString()
  };

  saveState();
  renderAll();
  toast('Preview jadwal liga dibuat. Kamu bisa edit manual sebelum mulai.');
}

function directedPairKey(match) {
  return `${match.home}__VS__${match.away}`;
}

function validateLeaguePreview(preview) {
  if (!preview) return { ok: false, messages: ['Preview belum dibuat.'] };
  const messages = [];
  const teams = preview.teams;
  const expectedPairs = new Set();
  teams.forEach(home => {
    teams.forEach(away => {
      if (home !== away) expectedPairs.add(`${home}__VS__${away}`);
    });
  });

  const usedPairs = new Set();
  const duplicates = [];

  preview.matches.forEach((match, index) => {
    if (!match.home || !match.away) messages.push(`Pertandingan ${index + 1} belum lengkap.`);
    if (match.home === match.away) messages.push(`Pertandingan ${index + 1} memakai tim yang sama.`);
    const key = directedPairKey(match);
    if (usedPairs.has(key)) duplicates.push(`${match.home} vs ${match.away}`);
    usedPairs.add(key);
  });

  const missing = [...expectedPairs].filter(pair => !usedPairs.has(pair));
  const extra = [...usedPairs].filter(pair => !expectedPairs.has(pair));

  if (preview.matches.length !== expectedPairs.size) {
    messages.push(`Jumlah pertandingan seharusnya ${expectedPairs.size}, sekarang ${preview.matches.length}.`);
  }
  if (duplicates.length) messages.push(`Ada pasangan dobel: ${duplicates.slice(0, 3).join(', ')}${duplicates.length > 3 ? ', ...' : ''}.`);
  if (missing.length) messages.push(`Ada pasangan yang belum ada: ${missing.slice(0, 3).map(pair => pair.replace('__VS__', ' vs ')).join(', ')}${missing.length > 3 ? ', ...' : ''}.`);
  if (extra.length) messages.push('Ada tim/pasangan yang tidak sesuai daftar tim liga.');

  return { ok: messages.length === 0, messages };
}

function validateNoImmediateReverse(matches) {
  for (let i = 1; i < matches.length; i++) {
    const prev = matches[i - 1];
    const current = matches[i];
    if (prev.home === current.away && prev.away === current.home) {
      return `Peringatan: ${prev.home} vs ${prev.away} langsung bertemu balik di pertandingan ${i + 1}.`;
    }
  }
  return null;
}

function startLeagueFromPreview() {
  const preview = state.previews.league;
  const validation = validateLeaguePreview(preview);
  if (!validation.ok) {
    toast('Jadwal liga belum valid. Cek pesan di preview.');
    renderLeaguePreview();
    return;
  }

  const comp = {
    id: uid('league'),
    type: 'Liga',
    name: `Liga Custom ${new Date().toLocaleDateString('id-ID')}`,
    mode: 'Double home-away',
    teams: clone(preview.teams),
    matches: clone(preview.matches).map((match, index) => ({
      ...match,
      id: uid('league-match'),
      order: index + 1,
      round: `Pertandingan ${index + 1}`,
      type: 'Liga',
      status: 'Belum Main',
      homeScore: null,
      awayScore: null,
      playedAt: null
    })),
    champion: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.league = comp;
  state.selectedCompetitionId = comp.id;
  state.previews.league = null;
  saveCompetition(comp);
  saveState();
  renderAll();
  toast('Liga dimulai dan masuk riwayat.');
}

function moveItem(array, index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= array.length) return;
  [array[index], array[newIndex]] = [array[newIndex], array[index]];
}

function movePreviewMatch(kind, matchId, direction) {
  const preview = kind === 'league' ? state.previews.league : state.previews.cup;
  if (!preview) return;

  if (kind === 'league') {
    const index = preview.matches.findIndex(match => match.id === matchId);
    moveItem(preview.matches, index, direction);
    preview.matches.forEach((match, idx) => { match.order = idx + 1; });
  } else {
    const match = preview.matches.find(item => item.id === matchId);
    const round = (preview.rounds || []).find(item => item.matchIds.includes(matchId));

    if (round) {
      const index = round.matchIds.indexOf(matchId);
      moveItem(round.matchIds, index, direction);
    } else if (match && match.phase === 'group') {
      const groupIndexes = preview.matches
        .map((item, index) => item.phase === 'group' && item.group === match.group ? index : null)
        .filter(index => index !== null);
      const currentGlobalIndex = preview.matches.findIndex(item => item.id === matchId);
      const currentGroupIndex = groupIndexes.indexOf(currentGlobalIndex);
      const targetGroupIndex = currentGroupIndex + direction;

      if (targetGroupIndex >= 0 && targetGroupIndex < groupIndexes.length) {
        const targetGlobalIndex = groupIndexes[targetGroupIndex];
        [preview.matches[currentGlobalIndex], preview.matches[targetGlobalIndex]] = [preview.matches[targetGlobalIndex], preview.matches[currentGlobalIndex]];
      }
    }
  }

  saveState();
  renderAll();
}

function swapPreviewMatch(kind, matchId) {
  const preview = kind === 'league' ? state.previews.league : state.previews.cup;
  if (!preview) return;
  const match = preview.matches.find(item => item.id === matchId);
  if (!match) return;
  [match.home, match.away] = [match.away, match.home];
  saveState();
  renderAll();
}

function updatePreviewMatch(kind, matchId, field, value) {
  const preview = kind === 'league' ? state.previews.league : state.previews.cup;
  if (!preview) return;
  const match = preview.matches.find(item => item.id === matchId);
  if (!match) return;
  match[field] = value;
  saveState();
  if (kind === 'league') renderLeaguePreview();
  else renderCupPreview();
}

function renderLeaguePreview() {
  const box = byId('leaguePreview');
  const preview = state.previews.league;
  if (!preview) {
    box.className = 'empty';
    box.textContent = 'Belum ada preview jadwal.';
    return;
  }

  const validation = validateLeaguePreview(preview);
  const reverseWarning = validateNoImmediateReverse(preview.matches);
  const messages = [...validation.messages];
  if (reverseWarning) messages.push(reverseWarning);

  box.className = '';
  box.innerHTML = `
    <div class="preview-header">
      <div>
        <strong>Preview Liga</strong>
        <div class="preview-meta">${preview.teams.length} tim • ${preview.matches.length} pertandingan • belum masuk riwayat</div>
      </div>
      ${validation.ok ? '<span class="badge done">Jadwal valid</span>' : '<span class="badge wait">Perlu dicek</span>'}
    </div>
    ${messages.length ? `<div class="alert warning"><strong>Catatan:</strong><br>${messages.map(escapeHtml).join('<br>')}</div>` : '<div class="alert"><strong>Aman.</strong> Jadwal sudah double home-away. Kamu masih bisa mengubah urutan sebelum mulai.</div>'}
    <p class="note mobile-note mb">Di HP, tabel bisa digeser ke kanan/kiri.</p>
    ${editableScheduleTable('league', preview.matches, preview.teams)}
  `;
}

function editableScheduleTable(kind, matches, teams) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Babak</th>
            <th>Home</th>
            <th>Away</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${matches.map((match, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${kind === 'league' ? `Urutan ${index + 1}` : escapeHtml(match.round)}</td>
              <td>
                <select class="preview-match-select" data-kind="${kind}" data-id="${match.id}" data-field="home">
                  ${optionHtml(teams, match.home)}
                </select>
              </td>
              <td>
                <select class="preview-match-select" data-kind="${kind}" data-id="${match.id}" data-field="away">
                  ${optionHtml(teams, match.away)}
                </select>
              </td>
              <td>
                <div class="schedule-tools">
                  <button class="icon-btn" title="Naik" data-action="preview-move" data-kind="${kind}" data-id="${match.id}" data-dir="-1">↑</button>
                  <button class="icon-btn" title="Turun" data-action="preview-move" data-kind="${kind}" data-id="${match.id}" data-dir="1">↓</button>
                  <button class="icon-btn" title="Tukar Home/Away" data-action="preview-swap" data-kind="${kind}" data-id="${match.id}">⇄</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function saveLeagueScore(matchId) {
  if (!state.league) return;
  const match = state.league.matches.find(item => item.id === matchId);
  if (!match) return;

  const homeScore = readScore(`score-home-${matchId}`);
  const awayScore = readScore(`score-away-${matchId}`);
  if (homeScore === null || awayScore === null) {
    toast('Skor harus angka 0 atau lebih.');
    return;
  }

  match.homeScore = homeScore;
  match.awayScore = awayScore;
  match.status = 'Selesai';
  match.playedAt = new Date().toISOString();

  updateLeagueChampion(state.league);
  saveCompetition(state.league);
  saveState();
  renderAll();
  toast('Skor liga disimpan.');
}

function updateLeagueChampion(comp) {
  const allDone = comp.matches.length > 0 && comp.matches.every(match => match.status === 'Selesai');
  if (!allDone) {
    comp.champion = null;
    return;
  }
  const rows = computeTable(comp.teams, comp.matches);
  comp.champion = rows[0]?.team || null;
}

function simulateLeagueScores() {
  if (!state.league) {
    toast('Mulai liga dulu.');
    return;
  }

  state.league.matches.forEach(match => {
    if (match.status === 'Selesai') return;
    const [homeScore, awayScore] = randomScore(true);
    match.homeScore = homeScore;
    match.awayScore = awayScore;
    match.status = 'Selesai';
    match.playedAt = new Date().toISOString();
  });

  updateLeagueChampion(state.league);
  saveCompetition(state.league);
  saveState();
  renderAll();
  toast('Semua skor liga dibuat random.');
}

function renderLeague() {
  renderLeaguePreview();
  const status = byId('leagueStatus');
  const table = byId('leagueTable');
  const matches = byId('leagueMatches');

  if (!state.league) {
    status.textContent = 'Belum ada liga aktif.';
    table.className = 'table-wrap empty';
    table.textContent = 'Belum ada klasemen.';
    matches.className = 'match-list empty';
    matches.textContent = 'Belum ada jadwal aktif.';
    return;
  }

  const comp = state.league;
  const done = comp.matches.filter(match => match.status === 'Selesai').length;
  const champion = comp.champion ? ` Juara: ${comp.champion}.` : '';

  status.innerHTML = `
    <strong>${escapeHtml(comp.name)}</strong><br>
    ${comp.teams.length} tim • ${done}/${comp.matches.length} pertandingan selesai.${escapeHtml(champion)}
  `;

  table.className = 'table-wrap';
  table.innerHTML = tableHtml(computeTable(comp.teams, comp.matches));

  matches.className = 'match-list';
  matches.innerHTML = comp.matches.map(match => matchEditorHtml(match, 'league')).join('');
}

function roundName(teamCount) {
  if (teamCount <= 2) return 'Final';
  if (teamCount <= 4) return 'Semifinal';
  if (teamCount <= 8) return 'Perempat Final';
  if (teamCount <= 16) return '16 Besar';
  return `Ronde ${teamCount} Tim`;
}

function createKnockoutRound(participants) {
  const teams = [...participants];
  const name = roundName(teams.length);
  const byeTeams = [];
  const matches = [];

  if (teams.length % 2 === 1) {
    byeTeams.push(teams.pop());
  }

  for (let i = 0; i < teams.length; i += 2) {
    matches.push(makeMatch('cup-match', 'knockout', name, teams[i], teams[i + 1], { type: 'Cup' }));
  }

  return {
    round: {
      id: uid('round'),
      name,
      byeTeams,
      matchIds: matches.map(match => match.id),
      locked: false
    },
    matches
  };
}

function generateGroupMatches(groups) {
  const matches = [];
  Object.entries(groups).forEach(([groupName, teams]) => {
    const rounds = generateSingleRoundRobinRounds(teams);
    let order = 0;
    rounds.forEach((round, roundIndex) => {
      shuffle(round).forEach(pair => {
        order += 1;
        matches.push(makeMatch('cup-group-match', 'group', `Grup ${groupName} - Matchday ${roundIndex + 1}`, pair.home, pair.away, {
          group: groupName,
          order,
          type: 'Cup'
        }));
      });
    });
  });
  return matches;
}

function createCupPreview() {
  const teams = getDraftTeams('cup');
  const mode = byId('cupMode').value;

  if (mode === 'knockout' && teams.length < 3) {
    toast('Cup gugur langsung minimal membutuhkan 3 tim.');
    return;
  }
  if (mode === 'group' && teams.length < 8) {
    toast('Cup fase grup minimal membutuhkan 8 tim.');
    return;
  }

  const randomizedTeams = shuffle(teams);
  const preview = {
    id: uid('cup-preview'),
    type: 'Cup',
    mode: mode === 'group' ? 'Fase grup + gugur' : 'Gugur langsung',
    rawMode: mode,
    teams: randomizedTeams,
    matches: [],
    rounds: [],
    groups: null,
    semifinalsCreated: false,
    champion: null,
    createdAt: new Date().toISOString()
  };

  if (mode === 'group') {
    const middle = Math.ceil(randomizedTeams.length / 2);
    preview.groups = {
      A: randomizedTeams.slice(0, middle),
      B: randomizedTeams.slice(middle)
    };
    preview.matches = generateGroupMatches(preview.groups);
  } else {
    const firstRound = createKnockoutRound(randomizedTeams);
    preview.rounds = [firstRound.round];
    preview.matches = firstRound.matches;
  }

  state.previews.cup = preview;
  saveState();
  renderAll();
  toast('Preview cup dibuat. Kamu bisa edit manual sebelum mulai.');
}

function getRoundMatches(comp, round) {
  return round.matchIds.map(id => comp.matches.find(match => match.id === id)).filter(Boolean);
}

function validateCupPreview(preview) {
  if (!preview) return { ok: false, messages: ['Preview belum dibuat.'] };
  const messages = [];

  if (preview.rawMode === 'knockout') {
    const firstRound = preview.rounds[0];
    const used = [];
    getRoundMatches(preview, firstRound).forEach((match, index) => {
      if (!match.home || !match.away) messages.push(`Pertandingan ${index + 1} belum lengkap.`);
      if (match.home === match.away) messages.push(`Pertandingan ${index + 1} memakai tim yang sama.`);
      used.push(match.home, match.away);
    });
    used.push(...firstRound.byeTeams);

    const duplicate = used.filter((team, index) => used.indexOf(team) !== index);
    const missing = preview.teams.filter(team => !used.includes(team));
    const extra = used.filter(team => !preview.teams.includes(team));

    if (duplicate.length) messages.push(`Ada tim dobel: ${[...new Set(duplicate)].join(', ')}.`);
    if (missing.length) messages.push(`Ada tim belum dipakai: ${missing.join(', ')}.`);
    if (extra.length) messages.push('Ada tim yang tidak sesuai daftar cup.');
  }

  if (preview.rawMode === 'group') {
    Object.entries(preview.groups).forEach(([groupName, teams]) => {
      const matches = preview.matches.filter(match => match.phase === 'group' && match.group === groupName);
      const expectedPairs = new Set();
      teams.forEach((a, i) => {
        teams.forEach((b, j) => {
          if (i < j) expectedPairs.add([a, b].sort().join('__VS__'));
        });
      });

      const usedPairs = new Set();
      const duplicates = [];
      matches.forEach((match, index) => {
        if (match.home === match.away) messages.push(`Grup ${groupName}, pertandingan ${index + 1} memakai tim yang sama.`);
        if (!teams.includes(match.home) || !teams.includes(match.away)) messages.push(`Grup ${groupName}, ada tim yang tidak masuk grup.`);
        const key = [match.home, match.away].sort().join('__VS__');
        if (usedPairs.has(key)) duplicates.push(`${match.home} vs ${match.away}`);
        usedPairs.add(key);
      });

      const missing = [...expectedPairs].filter(pair => !usedPairs.has(pair));
      if (duplicates.length) messages.push(`Grup ${groupName} ada pertandingan dobel: ${duplicates.slice(0, 2).join(', ')}.`);
      if (missing.length) messages.push(`Grup ${groupName} ada pertandingan belum ada.`);
    });
  }

  return { ok: messages.length === 0, messages };
}

function startCupFromPreview() {
  const preview = state.previews.cup;
  const validation = validateCupPreview(preview);
  if (!validation.ok) {
    toast('Cup belum valid. Cek pesan di preview.');
    renderCupPreview();
    return;
  }

  const comp = clone(preview);
  comp.id = uid('cup');
  comp.name = `Cup Custom ${new Date().toLocaleDateString('id-ID')}`;
  comp.matches = comp.matches.map((match, index) => ({
    ...match,
    id: uid(match.phase === 'group' ? 'cup-group-match' : 'cup-match'),
    order: index + 1,
    type: 'Cup',
    status: 'Belum Main',
    homeScore: null,
    awayScore: null,
    playedAt: null
  }));

  if (comp.rounds?.length) {
    let matchIndex = 0;
    comp.rounds = comp.rounds.map(round => {
      const newIds = round.matchIds.map(() => comp.matches[matchIndex++]?.id).filter(Boolean);
      return { ...round, id: uid('round'), matchIds: newIds, locked: false };
    });
  }

  comp.createdAt = new Date().toISOString();
  comp.updatedAt = new Date().toISOString();

  state.cup = comp;
  state.selectedCompetitionId = comp.id;
  state.previews.cup = null;
  saveCompetition(comp);
  saveState();
  renderAll();
  toast('Cup dimulai dan masuk riwayat.');
}

function updateCupBye(roundId, value) {
  const preview = state.previews.cup;
  if (!preview) return;
  const round = preview.rounds.find(item => item.id === roundId);
  if (!round) return;
  round.byeTeams = value ? [value] : [];
  saveState();
  renderCupPreview();
}

function renderCupPreview() {
  const box = byId('cupPreview');
  const preview = state.previews.cup;
  if (!preview) {
    box.className = 'empty';
    box.textContent = 'Belum ada preview cup.';
    return;
  }

  const validation = validateCupPreview(preview);
  box.className = '';
  box.innerHTML = `
    <div class="preview-header">
      <div>
        <strong>Preview Cup</strong>
        <div class="preview-meta">Mode: ${escapeHtml(preview.mode)} • ${preview.teams.length} tim • belum masuk riwayat</div>
      </div>
      ${validation.ok ? '<span class="badge done">Cup valid</span>' : '<span class="badge wait">Perlu dicek</span>'}
    </div>
    ${validation.messages.length ? `<div class="alert warning"><strong>Catatan:</strong><br>${validation.messages.map(escapeHtml).join('<br>')}</div>` : '<div class="alert"><strong>Aman.</strong> Susunan cup sudah bisa dimulai.</div>'}
    ${preview.rawMode === 'knockout' ? renderKnockoutPreview(preview) : renderGroupPreview(preview)}
  `;
}

function renderKnockoutPreview(preview) {
  const round = preview.rounds[0];
  const matches = getRoundMatches(preview, round);
  return `
    <div class="group-box">
      <h4>${escapeHtml(round.name)} / Ronde Awal</h4>
      ${round.byeTeams.length ? `
        <label class="field mb">
          <span>Tim Bye / Menunggu Ronde Berikutnya</span>
          <select class="preview-bye-select" data-round-id="${round.id}">
            ${optionHtml(preview.teams, round.byeTeams[0])}
          </select>
        </label>
      ` : '<p class="note mb">Jumlah tim genap, tidak ada bye.</p>'}
      ${editableScheduleTable('cup', matches, preview.teams)}
      <p class="note mt">Untuk contoh 3 tim: pilih dua tim yang bertemu duluan, lalu pilih satu tim sebagai bye/menunggu final.</p>
    </div>
  `;
}

function renderGroupPreview(preview) {
  return `
    <div class="group-grid">
      ${Object.entries(preview.groups).map(([groupName, teams]) => {
        const matches = preview.matches.filter(match => match.phase === 'group' && match.group === groupName);
        return `
          <div class="group-box">
            <h4>Grup ${escapeHtml(groupName)}</h4>
            <ol class="team-list">${teams.map(team => `<li>${escapeHtml(team)}</li>`).join('')}</ol>
            <h5>Jadwal Grup</h5>
            ${editableScheduleTable('cup', matches, teams)}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function saveCupScore(matchId) {
  if (!state.cup) return;
  const match = state.cup.matches.find(item => item.id === matchId);
  if (!match) return;

  const homeScore = readScore(`score-home-${matchId}`);
  const awayScore = readScore(`score-away-${matchId}`);
  if (homeScore === null || awayScore === null) {
    toast('Skor harus angka 0 atau lebih.');
    return;
  }
  if (match.phase === 'knockout' && homeScore === awayScore) {
    toast('Babak gugur tidak boleh seri. Harus ada pemenang.');
    return;
  }

  match.homeScore = homeScore;
  match.awayScore = awayScore;
  match.status = 'Selesai';
  match.playedAt = new Date().toISOString();

  autoSetCupChampion(state.cup);
  saveCompetition(state.cup);
  saveState();
  renderAll();
  toast('Skor cup disimpan.');
}

function groupTables(comp) {
  if (!comp.groups) return {};
  const tables = {};
  Object.entries(comp.groups).forEach(([groupName, teams]) => {
    const matches = comp.matches.filter(match => match.phase === 'group' && match.group === groupName);
    tables[groupName] = computeTable(teams, matches);
  });
  return tables;
}

function allGroupMatchesDone(comp) {
  const groupMatches = comp.matches.filter(match => match.phase === 'group');
  return groupMatches.length > 0 && groupMatches.every(match => match.status === 'Selesai');
}

function currentRound(comp) {
  if (!comp.rounds || !comp.rounds.length) return null;
  return comp.rounds[comp.rounds.length - 1];
}

function isRoundDone(comp, round) {
  const matches = getRoundMatches(comp, round);
  return matches.length > 0 && matches.every(match => match.status === 'Selesai');
}

function roundWinners(comp, round) {
  const winners = [];
  getRoundMatches(comp, round).forEach(match => {
    const winner = matchWinner(match);
    if (winner && winner !== 'Seri') winners.push(winner);
  });
  winners.push(...(round.byeTeams || []));
  return winners;
}

function createSemifinal() {
  if (!state.cup || !state.cup.groups) return;
  const comp = state.cup;
  if (!allGroupMatchesDone(comp)) {
    toast('Selesaikan semua pertandingan fase grup dulu.');
    return;
  }
  if (comp.semifinalsCreated) {
    toast('Semifinal sudah dibuat.');
    return;
  }

  createSemifinalDirect(comp);
  saveCompetition(comp);
  saveState();
  renderAll();
  toast('Semifinal berhasil dibuat.');
}

function createSemifinalDirect(comp) {
  const tables = groupTables(comp);
  const a1 = tables.A?.[0]?.team;
  const a2 = tables.A?.[1]?.team;
  const b1 = tables.B?.[0]?.team;
  const b2 = tables.B?.[1]?.team;
  if (!a1 || !a2 || !b1 || !b2) return;

  const semiMatches = [
    makeMatch('cup-match', 'knockout', 'Semifinal', a1, b2, { type: 'Cup' }),
    makeMatch('cup-match', 'knockout', 'Semifinal', b1, a2, { type: 'Cup' })
  ];
  const round = {
    id: uid('round'),
    name: 'Semifinal',
    byeTeams: [],
    matchIds: semiMatches.map(match => match.id),
    locked: false
  };
  comp.semifinalsCreated = true;
  comp.rounds.push(round);
  comp.matches.push(...semiMatches);
}

function autoSetCupChampion(comp) {
  const round = currentRound(comp);
  if (!round || !isRoundDone(comp, round)) return;
  const winners = roundWinners(comp, round);
  if (winners.length === 1) {
    comp.champion = winners[0];
    round.locked = true;
  }
}

function createNextRound() {
  if (!state.cup) return;
  const comp = state.cup;
  const round = currentRound(comp);
  if (!round) {
    toast('Belum ada ronde gugur.');
    return;
  }
  if (!isRoundDone(comp, round)) {
    toast('Selesaikan ronde aktif dulu.');
    return;
  }
  if (round.locked && !comp.champion) {
    toast('Ronde berikutnya sudah dibuat.');
    return;
  }

  const winners = roundWinners(comp, round);
  if (winners.length <= 1) {
    comp.champion = winners[0] || comp.champion;
    round.locked = true;
    saveCompetition(comp);
    saveState();
    renderAll();
    toast('Cup selesai.');
    return;
  }

  round.locked = true;
  const next = createKnockoutRound(winners);
  comp.rounds.push(next.round);
  comp.matches.push(...next.matches);
  saveCompetition(comp);
  saveState();
  renderAll();
  toast('Ronde berikutnya dibuat.');
}

function simulateCupScores() {
  if (!state.cup) {
    toast('Mulai cup dulu.');
    return;
  }

  const comp = state.cup;
  let guard = 0;
  while (!comp.champion && guard < 160) {
    guard += 1;

    const nextMatch = comp.matches.find(match => match.status !== 'Selesai');
    if (nextMatch) {
      const allowDraw = nextMatch.phase === 'group';
      const [homeScore, awayScore] = randomScore(allowDraw);
      nextMatch.homeScore = homeScore;
      nextMatch.awayScore = awayScore;
      nextMatch.status = 'Selesai';
      nextMatch.playedAt = new Date().toISOString();
      autoSetCupChampion(comp);
      continue;
    }

    if (comp.groups && !comp.semifinalsCreated && allGroupMatchesDone(comp)) {
      createSemifinalDirect(comp);
      continue;
    }

    const round = currentRound(comp);
    if (round && isRoundDone(comp, round) && !round.locked) {
      const winners = roundWinners(comp, round);
      if (winners.length <= 1) {
        comp.champion = winners[0] || comp.champion;
        round.locked = true;
      } else {
        round.locked = true;
        const next = createKnockoutRound(winners);
        comp.rounds.push(next.round);
        comp.matches.push(...next.matches);
      }
      continue;
    }

    break;
  }

  saveCompetition(comp);
  saveState();
  renderAll();
  toast('Skor cup dibuat random.');
}

function renderCup() {
  renderCupPreview();
  const status = byId('cupStatus');
  const groupContent = byId('groupContent');
  const cupBracket = byId('cupBracket');
  const createSemiBtn = byId('createSemiBtn');
  const nextRoundBtn = byId('nextRoundBtn');

  createSemiBtn.classList.add('hidden');
  nextRoundBtn.classList.add('hidden');

  if (!state.cup) {
    status.textContent = 'Belum ada cup aktif.';
    groupContent.className = 'empty';
    groupContent.textContent = 'Belum ada fase grup.';
    cupBracket.className = 'empty';
    cupBracket.textContent = 'Belum ada bracket.';
    return;
  }

  const comp = state.cup;
  const done = comp.matches.filter(match => match.status === 'Selesai').length;
  const champion = comp.champion ? ` Juara: ${comp.champion}.` : '';

  status.innerHTML = `
    <strong>${escapeHtml(comp.name)}</strong><br>
    Mode: ${escapeHtml(comp.mode)} • ${comp.teams.length} tim • ${done}/${comp.matches.length} pertandingan selesai.${escapeHtml(champion)}
  `;

  if (comp.groups) {
    groupContent.className = '';
    groupContent.innerHTML = renderGroups(comp);
    if (!comp.semifinalsCreated && allGroupMatchesDone(comp)) createSemiBtn.classList.remove('hidden');
  } else {
    groupContent.className = 'empty';
    groupContent.textContent = 'Mode ini tidak memakai fase grup.';
  }

  if (comp.rounds?.length) {
    cupBracket.className = '';
    cupBracket.innerHTML = renderRounds(comp, true);
    const round = currentRound(comp);
    if (round && isRoundDone(comp, round) && !round.locked && !comp.champion) nextRoundBtn.classList.remove('hidden');
  } else {
    cupBracket.className = 'empty';
    cupBracket.textContent = comp.groups ? 'Bracket gugur belum dibuat.' : 'Belum ada bracket.';
  }
}

function renderGroups(comp) {
  const tables = groupTables(comp);
  return `
    <div class="group-grid">
      ${Object.entries(comp.groups).map(([groupName]) => `
        <div class="group-box">
          <h4>Grup ${escapeHtml(groupName)}</h4>
          <div class="table-wrap mb">${tableHtml(tables[groupName])}</div>
          <div class="match-list">
            ${comp.matches
              .filter(match => match.phase === 'group' && match.group === groupName)
              .map(match => matchEditorHtml(match, 'cup'))
              .join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderRounds(comp, editable) {
  return comp.rounds.map(round => {
    const matches = getRoundMatches(comp, round);
    return `
      <div class="group-box mb">
        <h4>${escapeHtml(round.name)}</h4>
        ${round.byeTeams?.length ? `<p class="note mb">Bye / menunggu ronde berikutnya: ${round.byeTeams.map(escapeHtml).join(', ')}</p>` : ''}
        <div class="match-list">
          ${matches.map(match => editable ? matchEditorHtml(match, 'cup') : matchReadOnlyHtml(match)).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function matchEditorHtml(match, area) {
  const buttonLabel = match.status === 'Selesai' ? 'Update Skor' : 'Simpan Skor';
  const action = area === 'league' ? 'save-league-score' : 'save-cup-score';
  return `
    <div class="match-card">
      <div class="match-top">
        <span class="match-round">${match.order ? `${match.order}. ` : ''}${escapeHtml(match.round)}</span>
        ${statusBadge(match)}
      </div>
      <div class="match-body">
        <div class="team-name left"><strong>${escapeHtml(match.home)}</strong><br><small>Home</small></div>
        <input id="score-home-${match.id}" class="score-input" type="number" min="0" value="${match.homeScore ?? ''}" />
        <div class="versus">vs</div>
        <input id="score-away-${match.id}" class="score-input" type="number" min="0" value="${match.awayScore ?? ''}" />
        <div class="team-name right"><strong>${escapeHtml(match.away)}</strong><br><small>Away</small></div>
        <div class="save-area"><button class="small-btn" data-action="${action}" data-id="${match.id}">${buttonLabel}</button></div>
      </div>
    </div>
  `;
}

function matchReadOnlyHtml(match) {
  const winner = matchWinner(match);
  return `
    <div class="match-card">
      <div class="match-top">
        <span class="match-round">${match.order ? `${match.order}. ` : ''}${escapeHtml(match.round)}</span>
        ${statusBadge(match)}
      </div>
      <div class="match-top">
        <strong>${escapeHtml(match.home)}</strong>
        <span class="score-view">${scoreText(match)}</span>
        <strong>${escapeHtml(match.away)}</strong>
      </div>
      <p class="note">Pemenang: ${winner ? escapeHtml(winner) : '-'}</p>
    </div>
  `;
}


function historyRoundLabel(comp, match, index) {
  if (comp.type === 'Liga') return match.round || `Pertandingan ${index + 1}`;
  if (match.phase === 'group') return match.round || `Grup ${match.group || '-'}`;
  return match.round || `Pertandingan ${index + 1}`;
}

function renderHome() {
  const latest = byId('homeLatest');
  if (!state.competitions.length) {
    latest.className = 'empty';
    latest.textContent = 'Belum ada kompetisi.';
    return;
  }

  const comp = state.competitions[0];
  const done = comp.matches.filter(match => match.status === 'Selesai').length;
  latest.className = '';
  latest.innerHTML = `
    <button class="competition-item active" data-action="select-competition-jump" data-id="${comp.id}">
      <strong>${escapeHtml(comp.name)}</strong>
      <span>${escapeHtml(comp.type)} • ${escapeHtml(comp.mode)} • ${comp.teams.length} tim</span><br>
      <span>${done}/${comp.matches.length} pertandingan selesai • dibuat ${formatDate(comp.createdAt)}</span>
    </button>
  `;
}

function renderHistory() {
  const list = byId('competitionList');
  const detail = byId('competitionDetail');
  const filter = state.historyFilter || 'all';

  document.querySelectorAll('.filter-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.type === filter);
  });

  const competitions = state.competitions.filter(comp => filter === 'all' || comp.type === filter);
  const selectedIsVisible = competitions.some(comp => comp.id === state.selectedCompetitionId);

  if (!selectedIsVisible && competitions.length) {
    state.selectedCompetitionId = competitions[0].id;
    saveState();
  }

  if (!competitions.length) {
    list.className = 'competition-list empty';
    list.textContent = 'Belum ada riwayat kompetisi.';
  } else {
    list.className = 'competition-list';
    list.innerHTML = competitions.map(comp => {
      const done = comp.matches.filter(match => match.status === 'Selesai').length;
      const active = comp.id === state.selectedCompetitionId ? 'active' : '';
      return `
        <button class="competition-item ${active}" data-action="select-competition" data-id="${comp.id}">
          <strong>${escapeHtml(comp.name)}</strong>
          <span>${escapeHtml(comp.type)} • ${escapeHtml(comp.mode)}</span><br>
          <span>${done}/${comp.matches.length} pertandingan selesai</span><br>
          <small>${formatDate(comp.createdAt)}</small>
          <span class="click-hint">Klik untuk lihat detail</span>
        </button>
      `;
    }).join('');
  }

  const selected = getSelectedCompetition();
  if (!selected || !competitions.some(comp => comp.id === selected.id)) {
    detail.className = 'empty';
    detail.textContent = 'Pilih kompetisi untuk melihat detail.';
  } else {
    detail.className = '';
    detail.innerHTML = competitionDetailHtml(selected);
  }
}

function competitionDetailHtml(comp) {
  const done = comp.matches.filter(match => match.status === 'Selesai').length;
  return `
    <div class="detail-title">
      <div>
        <h3>${escapeHtml(comp.name)}</h3>
        <p class="muted">${escapeHtml(comp.type)} • ${escapeHtml(comp.mode)} • ${comp.teams.length} tim • ${done}/${comp.matches.length} pertandingan selesai</p>
      </div>
      <div>${comp.champion ? `<span class="badge done">Juara: ${escapeHtml(comp.champion)}</span>` : '<span class="badge wait">Belum selesai</span>'}</div>
    </div>

    <h4>Daftar Tim</h4>
    <p class="note mb">${comp.teams.map(escapeHtml).join(', ')}</p>

    ${comp.type === 'Liga' ? `
      <h4>Klasemen</h4>
      <div class="table-wrap mb">${tableHtml(computeTable(comp.teams, comp.matches))}</div>
    ` : ''}

    ${comp.type === 'Cup' && comp.groups ? `
      <h4>Klasemen Grup</h4>
      ${historyGroupTablesHtml(comp)}
    ` : ''}

    ${comp.type === 'Cup' && comp.rounds?.length ? `
      <h4>Bracket Gugur</h4>
      ${renderRounds(comp, false)}
    ` : ''}

    <h4>Semua Pertandingan</h4>
    <p class="note mobile-note mb">Di HP, tabel bisa digeser ke kanan/kiri.</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Babak</th>
            <th>Home</th>
            <th>Skor</th>
            <th>Away</th>
            <th>Status</th>
            <th>Pemenang</th>
            <th>Waktu Input</th>
          </tr>
        </thead>
        <tbody>
          ${comp.matches.map((match, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(historyRoundLabel(comp, match, index))}</td>
              <td><strong>${escapeHtml(match.home)}</strong></td>
              <td>${scoreText(match)}</td>
              <td><strong>${escapeHtml(match.away)}</strong></td>
              <td>${escapeHtml(match.status)}</td>
              <td>${matchWinner(match) ? escapeHtml(matchWinner(match)) : '-'}</td>
              <td>${match.playedAt ? formatDate(match.playedAt) : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function historyGroupTablesHtml(comp) {
  const tables = groupTables(comp);
  return `
    <div class="group-grid mb">
      ${Object.entries(tables).map(([groupName, rows]) => `
        <div class="group-box">
          <h4>Grup ${escapeHtml(groupName)}</h4>
          <div class="table-wrap">${tableHtml(rows)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function resetLeague() {
  if (!state.league) {
    toast('Tidak ada liga aktif.');
    return;
  }
  state.league = null;
  saveState();
  renderAll();
  toast('Liga aktif direset. Riwayat tetap tersimpan.');
}

function resetCup() {
  if (!state.cup) {
    toast('Tidak ada cup aktif.');
    return;
  }
  state.cup = null;
  saveState();
  renderAll();
  toast('Cup aktif direset. Riwayat tetap tersimpan.');
}

function clearHistory() {
  if (!confirm('Hapus semua riwayat Liga dan Cup?')) return;
  state.competitions = [];
  state.selectedCompetitionId = null;
  state.league = null;
  state.cup = null;
  saveState();
  renderAll();
  toast('Semua riwayat dihapus.');
}

function jumpToTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  const page = byId(tab);
  if (page) page.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAll() {
  renderTeamRows('league');
  renderTeamRows('cup');
  renderHome();
  renderLeague();
  renderCup();
  renderHistory();
}

function bindEvents() {
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => jumpToTab(button.dataset.tab));
  });

  document.querySelectorAll('[data-jump]').forEach(button => {
    button.addEventListener('click', () => jumpToTab(button.dataset.jump));
  });

  byId('addLeagueTeamBtn').addEventListener('click', () => addTeamRow('league'));
  byId('addCupTeamBtn').addEventListener('click', () => addTeamRow('cup'));
  byId('shuffleLeagueTeamsBtn').addEventListener('click', () => shuffleDraftTeams('league'));
  byId('shuffleCupTeamsBtn').addEventListener('click', () => shuffleDraftTeams('cup'));

  byId('previewLeagueBtn').addEventListener('click', createLeaguePreview);
  byId('startLeagueBtn').addEventListener('click', startLeagueFromPreview);
  byId('clearLeaguePreviewBtn').addEventListener('click', () => {
    clearPreview('league');
    saveState();
    renderAll();
  });

  byId('previewCupBtn').addEventListener('click', createCupPreview);
  byId('startCupBtn').addEventListener('click', startCupFromPreview);
  byId('clearCupPreviewBtn').addEventListener('click', () => {
    clearPreview('cup');
    saveState();
    renderAll();
  });

  byId('randomLeagueScoreBtn').addEventListener('click', simulateLeagueScores);
  byId('resetLeagueBtn').addEventListener('click', resetLeague);
  byId('randomCupScoreBtn').addEventListener('click', simulateCupScores);
  byId('resetCupBtn').addEventListener('click', resetCup);
  byId('createSemiBtn').addEventListener('click', createSemifinal);
  byId('nextRoundBtn').addEventListener('click', createNextRound);
  byId('clearHistoryBtn').addEventListener('click', clearHistory);

  byId('cupMode').addEventListener('change', () => {
    clearPreview('cup', false);
    saveState();
    renderAll();
  });

  document.addEventListener('input', event => {
    if (!event.target.classList.contains('team-input')) return;
    const kind = event.target.dataset.kind;
    const index = Number(event.target.dataset.index);
    state.drafts[getDraftKey(kind)][index] = event.target.value;
    clearPreview(kind, false);
    saveState();
    if (kind === 'league') renderLeaguePreview();
    if (kind === 'cup') renderCupPreview();
  });

  document.addEventListener('change', event => {
    if (event.target.classList.contains('preview-match-select')) {
      updatePreviewMatch(event.target.dataset.kind, event.target.dataset.id, event.target.dataset.field, event.target.value);
    }
    if (event.target.classList.contains('preview-bye-select')) {
      updateCupBye(event.target.dataset.roundId, event.target.value);
    }
  });

  document.addEventListener('click', event => {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;
    const action = actionTarget.dataset.action;
    const id = actionTarget.dataset.id;

    if (action === 'remove-team') removeTeamRow(actionTarget.dataset.kind, Number(actionTarget.dataset.index));
    if (action === 'save-league-score') saveLeagueScore(id);
    if (action === 'save-cup-score') saveCupScore(id);
    if (action === 'preview-move') movePreviewMatch(actionTarget.dataset.kind, id, Number(actionTarget.dataset.dir));
    if (action === 'preview-swap') swapPreviewMatch(actionTarget.dataset.kind, id);
    if (action === 'select-competition') {
      state.selectedCompetitionId = id;
      saveState();
      renderHistory();
    }
    if (action === 'select-competition-jump') {
      state.selectedCompetitionId = id;
      saveState();
      renderHistory();
      jumpToTab('hasil');
    }
  });

  document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
      state.historyFilter = button.dataset.type;
      saveState();
      renderHistory();
    });
  });
}

bindEvents();
renderAll();
