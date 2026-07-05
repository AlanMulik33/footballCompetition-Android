const STORAGE_KEY = 'football_competition_mobile_lite_v1';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

let app = {
  leagueTeams: [],
  cupTeams: [],
  leagueDraft: [],
  cupDraft: null,
  competitions: [],
  historyFilter: 'all',
  selectedCompetitionId: null
};

const defaultLeagueNames = ['Tim 1', 'Tim 2', 'Tim 3'];
const defaultCupNames = ['Tim 1', 'Tim 2', 'Tim 3'];

function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ competitions: app.competitions }));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      app.competitions = Array.isArray(parsed.competitions) ? parsed.competitions : [];
    }
  } catch (error) {
    app.competitions = [];
  }
  app.leagueTeams = defaultLeagueNames.map(name => ({ id: uid('team'), name }));
  app.cupTeams = defaultCupNames.map(name => ({ id: uid('team'), name }));
}

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function titleFor(screenId) {
  return {
    homeScreen: 'Home',
    leagueScreen: 'Liga',
    cupScreen: 'Cup',
    historyScreen: 'Riwayat',
    detailScreen: 'Detail'
  }[screenId] || 'Football Competition';
}

function go(screenId) {
  $$('.screen').forEach(screen => screen.classList.toggle('active', screen.id === screenId));
  $$('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.go === screenId));
  $('#screenTitle').textContent = titleFor(screenId);
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (screenId === 'historyScreen') renderHistory();
}

function teamNames(type) {
  const teams = type === 'league' ? app.leagueTeams : app.cupTeams;
  return teams.map(t => t.name.trim()).filter(Boolean);
}

function renderTeamList(type) {
  const teams = type === 'league' ? app.leagueTeams : app.cupTeams;
  const container = type === 'league' ? $('#leagueTeams') : $('#cupTeams');
  const count = type === 'league' ? $('#leagueTeamCount') : $('#cupTeamCount');
  count.textContent = `${teams.filter(t => t.name.trim()).length} tim`;
  container.innerHTML = teams.map((team, index) => `
    <div class="team-row">
      <div class="row-number">${index + 1}</div>
      <input class="text-input team-input" data-type="${type}" data-id="${team.id}" type="text" value="${escapeHtml(team.name)}" placeholder="Nama tim" />
      <button class="remove-btn" data-type="${type}" data-id="${team.id}" type="button">×</button>
    </div>
  `).join('');
}

function addTeam(type) {
  const list = type === 'league' ? app.leagueTeams : app.cupTeams;
  list.push({ id: uid('team'), name: `Tim ${list.length + 1}` });
  if (type === 'league') app.leagueDraft = [];
  if (type === 'cup') app.cupDraft = null;
  renderAllDraftInputs();
}

function removeTeam(type, id) {
  const list = type === 'league' ? app.leagueTeams : app.cupTeams;
  if (list.length <= 1) return toast('Minimal harus ada 1 baris tim.');
  const next = list.filter(t => t.id !== id);
  if (type === 'league') {
    app.leagueTeams = next;
    app.leagueDraft = [];
  } else {
    app.cupTeams = next;
    app.cupDraft = null;
  }
  renderAllDraftInputs();
}

function updateTeamName(type, id, value) {
  const list = type === 'league' ? app.leagueTeams : app.cupTeams;
  const team = list.find(t => t.id === id);
  if (team) team.name = value;
}

function renderAllDraftInputs() {
  renderTeamList('league');
  renderTeamList('cup');
  renderLeagueDraft();
  renderCupDraft();
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateLeagueDraft() {
  const names = teamNames('league');
  if (names.length < 3) return toast('Liga minimal 3 tim.');
  const unique = new Set(names.map(n => n.toLowerCase()));
  if (unique.size !== names.length) return toast('Nama tim tidak boleh sama.');

  let pairs = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      pairs.push([names[i], names[j]]);
    }
  }
  pairs = shuffle(pairs);

  const firstLeg = pairs.map(([a, b], index) => {
    const flip = Math.random() > 0.5;
    return {
      id: uid('match'),
      order: index + 1,
      stage: 'Leg 1',
      home: flip ? b : a,
      away: flip ? a : b,
      homeScore: null,
      awayScore: null,
      status: 'Belum'
    };
  });

  const secondLeg = firstLeg.map((match, index) => ({
    id: uid('match'),
    order: firstLeg.length + index + 1,
    stage: 'Leg 2',
    home: match.away,
    away: match.home,
    homeScore: null,
    awayScore: null,
    status: 'Belum'
  }));

  app.leagueDraft = [...firstLeg, ...secondLeg];
  renderLeagueDraft();
  toast('Jadwal liga sudah diacak. Silakan cek dulu.');
}

function renderLeagueDraft() {
  const info = $('#leagueDraftInfo');
  const box = $('#leagueDraft');
  const names = teamNames('league');
  if (!app.leagueDraft.length) {
    info.textContent = 'Belum ada jadwal. Klik Acak Jadwal.';
    box.innerHTML = '';
    return;
  }
  info.textContent = `${app.leagueDraft.length} pertandingan. Kamu bisa ubah Home/Away dan urutan sebelum disimpan.`;
  box.innerHTML = app.leagueDraft.map((match, index) => matchEditorCard(match, index, names, 'league')).join('');
}

function matchEditorCard(match, index, names, type) {
  const optionHtml = (selectedValue) => names.map(name => {
    const selected = name === selectedValue ? ' selected' : '';
    return `<option value="${escapeAttr(name)}"${selected}>${escapeHtml(name)}</option>`;
  }).join('');
  return `
    <div class="match-card">
      <div class="match-top">
        <span>${type === 'league' ? match.stage : (match.stage || 'Match')} • Match ${index + 1}</span>
        <span class="badge wait">Preview</span>
      </div>
      <div class="match-edit-grid">
        <select class="text-input draft-select" data-type="${type}" data-index="${index}" data-side="home">${optionHtml(match.home)}</select>
        <div class="vs-line">VS</div>
        <select class="text-input draft-select" data-type="${type}" data-index="${index}" data-side="away">${optionHtml(match.away)}</select>
      </div>
      <div class="match-actions">
        <button class="mini-btn move-match" data-type="${type}" data-index="${index}" data-dir="up" type="button">↑</button>
        <button class="mini-btn move-match" data-type="${type}" data-index="${index}" data-dir="down" type="button">↓</button>
        <button class="mini-btn swap-match" data-type="${type}" data-index="${index}" type="button">⇄</button>
        <button class="mini-btn reset-match" data-type="${type}" data-index="${index}" type="button">↺</button>
      </div>
    </div>
  `;
}

function syncSelectValues() {
  $$('.draft-select').forEach(sel => {
    const list = sel.dataset.type === 'league' ? app.leagueDraft : (app.cupDraft?.matches || []);
    const match = list[Number(sel.dataset.index)];
    if (match) sel.value = match[sel.dataset.side];
  });
  $$('.bye-select').forEach(sel => {
    if (app.cupDraft) sel.value = app.cupDraft.bye || '';
  });
}

function updateDraftMatch(type, index, side, value) {
  const list = type === 'league' ? app.leagueDraft : (app.cupDraft?.matches || []);
  if (!list[index]) return;
  list[index][side] = value;
  syncSelectValues();
}

function moveDraftMatch(type, index, dir) {
  const list = type === 'league' ? app.leagueDraft : (app.cupDraft?.matches || []);
  const target = dir === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  type === 'league' ? renderLeagueDraft() : renderCupDraft();
  syncSelectValues();
}

function swapDraftMatch(type, index) {
  const list = type === 'league' ? app.leagueDraft : (app.cupDraft?.matches || []);
  if (!list[index]) return;
  [list[index].home, list[index].away] = [list[index].away, list[index].home];
  type === 'league' ? renderLeagueDraft() : renderCupDraft();
  syncSelectValues();
}

function validateLeagueDraft() {
  const teams = teamNames('league');
  const expected = teams.length * (teams.length - 1);
  if (app.leagueDraft.length !== expected) return `Jumlah pertandingan harus ${expected}.`;
  const ordered = new Map();
  for (const match of app.leagueDraft) {
    if (!match.home || !match.away) return 'Ada pertandingan yang timnya kosong.';
    if (match.home === match.away) return 'Tim tidak boleh melawan dirinya sendiri.';
    if (!teams.includes(match.home) || !teams.includes(match.away)) return 'Ada tim di jadwal yang tidak ada di daftar tim.';
    const key = `${match.home}__${match.away}`;
    ordered.set(key, (ordered.get(key) || 0) + 1);
  }
  for (const home of teams) {
    for (const away of teams) {
      if (home === away) continue;
      const key = `${home}__${away}`;
      if (ordered.get(key) !== 1) return `Jadwal belum double home-away lengkap. Cek ${home} vs ${away}.`;
    }
  }
  return '';
}

function startLeague() {
  const teams = teamNames('league');
  if (teams.length < 3) return toast('Liga minimal 3 tim.');
  if (!app.leagueDraft.length) return toast('Acak jadwal dulu.');
  const error = validateLeagueDraft();
  if (error) return toast(error);
  const comp = {
    id: uid('comp'),
    type: 'Liga',
    name: $('#leagueName').value.trim() || 'Liga Custom',
    createdAt: new Date().toISOString(),
    teams,
    matches: app.leagueDraft.map((m, i) => ({ ...m, id: uid('match'), order: i + 1 }))
  };
  app.competitions.unshift(comp);
  save();
  app.selectedCompetitionId = comp.id;
  app.leagueDraft = [];
  renderLeagueDraft();
  renderDetail(comp.id);
  go('detailScreen');
  toast('Liga disimpan. Sekarang bisa input skor.');
}

function generateCupDraft() {
  const names = teamNames('cup');
  const mode = $('#cupMode').value;
  const unique = new Set(names.map(n => n.toLowerCase()));
  if (unique.size !== names.length) return toast('Nama tim tidak boleh sama.');

  if (mode === 'knockout') {
    if (names.length < 3) return toast('Knockout minimal 3 tim.');
    const shuffled = shuffle(names);
    if (shuffled.length === 3) {
      app.cupDraft = {
        mode,
        bye: shuffled[2],
        matches: [{ id: uid('match'), stage: 'Ronde Awal', phase: 'knockout', round: 1, home: shuffled[0], away: shuffled[1], homeScore: null, awayScore: null, status: 'Belum' }]
      };
    } else {
      const matches = [];
      const byes = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        if (shuffled[i + 1]) matches.push({ id: uid('match'), stage: 'Ronde 1', phase: 'knockout', round: 1, home: shuffled[i], away: shuffled[i + 1], homeScore: null, awayScore: null, status: 'Belum' });
        else byes.push(shuffled[i]);
      }
      app.cupDraft = { mode, byes, matches };
    }
  } else {
    if (names.length < 8) return toast('Fase grup + gugur minimal 8 tim.');
    const shuffled = shuffle(names);
    const groups = { A: [], B: [] };
    shuffled.forEach((name, index) => groups[index % 2 === 0 ? 'A' : 'B'].push(name));
    const matches = [];
    for (const groupName of ['A', 'B']) {
      const g = groups[groupName];
      for (let i = 0; i < g.length; i++) {
        for (let j = i + 1; j < g.length; j++) {
          const flip = Math.random() > 0.5;
          matches.push({ id: uid('match'), stage: `Grup ${groupName}`, phase: 'group', group: groupName, home: flip ? g[j] : g[i], away: flip ? g[i] : g[j], homeScore: null, awayScore: null, status: 'Belum' });
        }
      }
    }
    app.cupDraft = { mode, groups, matches: shuffle(matches) };
  }
  renderCupDraft();
  toast('Preview cup sudah dibuat.');
}

function renderCupDraft() {
  const info = $('#cupDraftInfo');
  const box = $('#cupDraft');
  const names = teamNames('cup');
  if (!app.cupDraft) {
    info.textContent = 'Belum ada preview. Klik Acak Cup.';
    box.innerHTML = '';
    return;
  }
  if (app.cupDraft.mode === 'knockout') {
    info.textContent = 'Preview knockout. Untuk 3 tim, pilih 2 tim main duluan dan 1 tim bye.';
    let byeHtml = '';
    const byeValue = app.cupDraft.bye || (app.cupDraft.byes || []).join(', ');
    if (names.length === 3) {
      const options = names.map(name => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join('');
      byeHtml = `
        <div class="match-card">
          <div class="match-top"><span>Tim Bye</span><span class="badge wait">Menunggu</span></div>
          <select class="text-input bye-select">${options}</select>
        </div>
      `;
    } else if (byeValue) {
      byeHtml = `<div class="hint-box">Bye: ${escapeHtml(byeValue)}</div>`;
    }
    box.innerHTML = app.cupDraft.matches.map((match, index) => matchEditorCard(match, index, names, 'cup')).join('') + byeHtml;
  } else {
    info.textContent = 'Preview grup. Tim dibagi Grup A dan B, lalu jadwal grup dimainkan.';
    const groups = app.cupDraft.groups || { A: [], B: [] };
    const groupHtml = `
      <div class="hint-box"><strong>Grup A:</strong> ${groups.A.map(escapeHtml).join(', ')}<br><strong>Grup B:</strong> ${groups.B.map(escapeHtml).join(', ')}</div>
    `;
    box.innerHTML = groupHtml + app.cupDraft.matches.map((match, index) => matchEditorCard(match, index, names, 'cup')).join('');
  }
  syncSelectValues();
}

function updateCupBye(value) {
  if (!app.cupDraft) return;
  app.cupDraft.bye = value;
}

function validateCupDraft() {
  const teams = teamNames('cup');
  if (!app.cupDraft) return 'Acak cup dulu.';
  if (app.cupDraft.mode === 'knockout' && teams.length < 3) return 'Knockout minimal 3 tim.';
  if (app.cupDraft.mode === 'group' && teams.length < 8) return 'Grup + gugur minimal 8 tim.';
  for (const match of app.cupDraft.matches) {
    if (!match.home || !match.away) return 'Ada pertandingan yang timnya kosong.';
    if (match.home === match.away) return 'Tim tidak boleh melawan dirinya sendiri.';
  }
  if (app.cupDraft.mode === 'knockout' && teams.length === 3) {
    const used = [app.cupDraft.matches[0]?.home, app.cupDraft.matches[0]?.away, app.cupDraft.bye];
    const unique = new Set(used);
    if (unique.size !== 3) return 'Untuk cup 3 tim, tim main awal dan tim bye harus berbeda semua.';
  }
  return '';
}

function startCup() {
  const teams = teamNames('cup');
  const error = validateCupDraft();
  if (error) return toast(error);
  const comp = {
    id: uid('comp'),
    type: 'Cup',
    cupMode: app.cupDraft.mode,
    name: $('#cupName').value.trim() || 'Cup Custom',
    createdAt: new Date().toISOString(),
    teams,
    matches: app.cupDraft.matches.map((m, i) => ({ ...m, id: uid('match'), order: i + 1 })),
    byes: app.cupDraft.bye ? [app.cupDraft.bye] : (app.cupDraft.byes || []),
    groups: app.cupDraft.groups || null,
    champion: null
  };
  app.competitions.unshift(comp);
  save();
  app.selectedCompetitionId = comp.id;
  app.cupDraft = null;
  renderCupDraft();
  renderDetail(comp.id);
  go('detailScreen');
  toast('Cup disimpan. Sekarang bisa input skor.');
}

function renderHistory() {
  const list = $('#historyList');
  let comps = [...app.competitions];
  if (app.historyFilter !== 'all') comps = comps.filter(c => c.type === app.historyFilter);
  if (!comps.length) {
    list.innerHTML = '<div class="empty">Belum ada riwayat kompetisi.</div>';
    return;
  }
  list.innerHTML = comps.map(comp => {
    const done = comp.matches.filter(m => m.status === 'Selesai').length;
    return `
      <button class="history-item open-detail" data-id="${comp.id}" type="button">
        <strong>${escapeHtml(comp.name)}</strong>
        <p>${comp.type}${comp.cupMode ? ` • ${comp.cupMode === 'group' ? 'Grup + Gugur' : 'Knockout'}` : ''}</p>
        <div class="history-meta">
          <span class="badge">${comp.teams.length} tim</span>
          <span class="badge">${done}/${comp.matches.length} match</span>
          <span class="badge">${formatDate(comp.createdAt)}</span>
        </div>
      </button>
    `;
  }).join('');
}

function renderDetail(id) {
  const comp = app.competitions.find(c => c.id === id);
  if (!comp) return;
  app.selectedCompetitionId = id;
  const content = $('#detailContent');
  const done = comp.matches.filter(m => m.status === 'Selesai').length;
  const champion = comp.type === 'Liga' ? getLeagueChampion(comp) : comp.champion;
  let html = `
    <div class="detail-card detail-title">
      <h2>${escapeHtml(comp.name)}</h2>
      <p>${comp.type}${comp.cupMode ? ` • ${comp.cupMode === 'group' ? 'Grup + Gugur' : 'Knockout'}` : ''}</p>
      <div class="summary-grid">
        <div class="summary-box"><strong>${comp.teams.length}</strong><span>Tim</span></div>
        <div class="summary-box"><strong>${done}/${comp.matches.length}</strong><span>Match</span></div>
        <div class="summary-box"><strong>${champion ? escapeHtml(champion) : '-'}</strong><span>${comp.type === 'Liga' ? 'Peringkat 1' : 'Juara'}</span></div>
        <div class="summary-box"><strong>${formatDate(comp.createdAt)}</strong><span>Tanggal</span></div>
      </div>
    </div>
  `;

  if (comp.type === 'Liga') {
    html += renderLeagueTable(comp);
  } else {
    html += comp.cupMode === 'group' ? renderGroupTables(comp) : renderCupProgress(comp);
  }
  html += renderMatches(comp);
  content.innerHTML = html;
}

function renderLeagueTable(comp) {
  const table = computeStandings(comp.teams, comp.matches);
  return `
    <div class="detail-card">
      <h3>Klasemen</h3>
      <div class="stand-list">
        ${table.map((row, i) => `
          <div class="stand-card">
            <div class="row-number">${i + 1}</div>
            <div><strong>${escapeHtml(row.team)}</strong><br><small>M:${row.played} W:${row.win} D:${row.draw} L:${row.loss} GD:${row.gd}</small></div>
            <strong>${row.pts} pts</strong>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderGroupTables(comp) {
  const parts = ['A', 'B'].map(group => {
    const teams = comp.groups?.[group] || [];
    const matches = comp.matches.filter(m => m.phase === 'group' && m.group === group);
    const table = computeStandings(teams, matches);
    return `
      <h3 class="group-title">Grup ${group}</h3>
      <div class="stand-list">
        ${table.map((row, i) => `
          <div class="stand-card">
            <div class="row-number">${i + 1}</div>
            <div><strong>${escapeHtml(row.team)}</strong><br><small>M:${row.played} W:${row.win} D:${row.draw} L:${row.loss} GD:${row.gd}</small></div>
            <strong>${row.pts} pts</strong>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
  return `<div class="detail-card"><h3>Klasemen Grup</h3>${parts}</div>`;
}

function renderCupProgress(comp) {
  const byes = comp.byes?.length ? `<p>Bye awal: ${comp.byes.map(escapeHtml).join(', ')}</p>` : '<p>Tidak ada bye awal.</p>';
  return `<div class="detail-card"><h3>Progress Cup</h3>${byes}<p>${comp.champion ? `Juara: ${escapeHtml(comp.champion)}` : 'Juara belum ditentukan.'}</p></div>`;
}

function renderMatches(comp) {
  const grouped = groupBy(comp.matches, m => m.stage || 'Pertandingan');
  const sections = Object.keys(grouped).map(stage => `
    <div class="detail-card">
      <h3>${escapeHtml(stage)}</h3>
      <div class="match-list">
        ${grouped[stage].map(match => matchPlayCard(comp, match)).join('')}
      </div>
    </div>
  `).join('');
  return sections;
}

function matchPlayCard(comp, match) {
  const homeScore = match.homeScore ?? '';
  const awayScore = match.awayScore ?? '';
  const statusClass = match.status === 'Selesai' ? 'done' : 'wait';
  const winnerText = match.status === 'Selesai' ? (match.winner ? `Pemenang: ${escapeHtml(match.winner)}` : 'Seri') : 'Belum selesai';
  const isCupKnockout = comp.type === 'Cup' && match.phase !== 'group';
  return `
    <div class="match-card">
      <div class="match-top">
        <span>Match ${match.order || '-'}</span>
        <span class="badge ${statusClass}">${match.status}</span>
      </div>
      <div class="score-row">
        <div class="team-name">${escapeHtml(match.home)}</div>
        <input class="score-input" inputmode="numeric" pattern="[0-9]*" data-comp="${comp.id}" data-match="${match.id}" data-side="homeScore" value="${homeScore}" placeholder="0" />
        <strong>-</strong>
        <input class="score-input" inputmode="numeric" pattern="[0-9]*" data-comp="${comp.id}" data-match="${match.id}" data-side="awayScore" value="${awayScore}" placeholder="0" />
        <div class="team-name">${escapeHtml(match.away)}</div>
      </div>
      <p style="margin-top:8px">${winnerText}${isCupKnockout ? ' • Tidak boleh seri' : ''}</p>
      <button class="save-score" data-comp="${comp.id}" data-match="${match.id}" type="button">Simpan Skor</button>
    </div>
  `;
}

function saveScore(compId, matchId) {
  const comp = app.competitions.find(c => c.id === compId);
  if (!comp) return;
  const match = comp.matches.find(m => m.id === matchId);
  if (!match) return;
  const hs = $(`.score-input[data-comp="${compId}"][data-match="${matchId}"][data-side="homeScore"]`).value;
  const as = $(`.score-input[data-comp="${compId}"][data-match="${matchId}"][data-side="awayScore"]`).value;
  if (hs === '' || as === '') return toast('Isi skor kedua tim.');
  const homeScore = Number(hs);
  const awayScore = Number(as);
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) return toast('Skor harus angka 0 atau lebih.');
  if (comp.type === 'Cup' && match.phase !== 'group' && homeScore === awayScore) return toast('Knockout tidak boleh seri. Ubah skor setelah penalti/extra time.');
  match.homeScore = homeScore;
  match.awayScore = awayScore;
  match.status = 'Selesai';
  match.winner = homeScore > awayScore ? match.home : awayScore > homeScore ? match.away : null;
  match.updatedAt = new Date().toISOString();
  if (comp.type === 'Cup') progressCup(comp);
  save();
  renderDetail(comp.id);
  toast('Skor disimpan.');
}

function progressCup(comp) {
  if (comp.cupMode === 'group') {
    const groupMatches = comp.matches.filter(m => m.phase === 'group');
    const groupDone = groupMatches.length && groupMatches.every(m => m.status === 'Selesai');
    const hasSemis = comp.matches.some(m => m.stage === 'Semifinal');
    if (groupDone && !hasSemis) {
      const a = computeStandings(comp.groups.A, comp.matches.filter(m => m.group === 'A'));
      const b = computeStandings(comp.groups.B, comp.matches.filter(m => m.group === 'B'));
      comp.matches.push(
        makeMatch('Semifinal', 'knockout', a[0].team, b[1].team, comp.matches.length + 1),
        makeMatch('Semifinal', 'knockout', b[0].team, a[1].team, comp.matches.length + 2)
      );
      toast('Semifinal otomatis dibuat.');
      return;
    }
    const semis = comp.matches.filter(m => m.stage === 'Semifinal');
    const finalExists = comp.matches.some(m => m.stage === 'Final');
    if (semis.length === 2 && semis.every(m => m.status === 'Selesai') && !finalExists) {
      comp.matches.push(makeMatch('Final', 'knockout', semis[0].winner, semis[1].winner, comp.matches.length + 1));
      toast('Final otomatis dibuat.');
      return;
    }
    const final = comp.matches.find(m => m.stage === 'Final');
    if (final?.status === 'Selesai') comp.champion = final.winner;
    return;
  }

  const knockoutMatches = comp.matches.filter(m => m.phase === 'knockout');
  const rounds = [...new Set(knockoutMatches.map(m => m.round))].sort((a, b) => a - b);
  const lastRound = rounds[rounds.length - 1];
  const current = knockoutMatches.filter(m => m.round === lastRound);
  if (!current.length || !current.every(m => m.status === 'Selesai')) return;
  const existingNext = knockoutMatches.some(m => m.round === lastRound + 1);
  if (existingNext) return;
  const winners = current.map(m => m.winner).filter(Boolean);
  const availableByes = lastRound === 1 ? (comp.byes || []) : [];
  const nextTeams = [...winners, ...availableByes];
  if (nextTeams.length === 1) {
    comp.champion = nextTeams[0];
    return;
  }
  const nextRoundName = nextTeams.length === 2 ? 'Final' : `Ronde ${lastRound + 1}`;
  const shuffled = shuffle(nextTeams);
  const nextMatches = [];
  const nextByes = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) nextMatches.push(makeMatch(nextRoundName, 'knockout', shuffled[i], shuffled[i + 1], comp.matches.length + nextMatches.length + 1, lastRound + 1));
    else nextByes.push(shuffled[i]);
  }
  comp.matches.push(...nextMatches);
  comp.byes = nextByes;
}

function makeMatch(stage, phase, home, away, order, round = null) {
  return { id: uid('match'), stage, phase, round, home, away, homeScore: null, awayScore: null, status: 'Belum', order };
}

function computeStandings(teams, matches) {
  const map = new Map(teams.map(team => [team, { team, played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, gd: 0, pts: 0 }]));
  for (const m of matches) {
    if (m.status !== 'Selesai') continue;
    const h = map.get(m.home);
    const a = map.get(m.away);
    if (!h || !a) continue;
    h.played++; a.played++;
    h.gf += m.homeScore; h.ga += m.awayScore;
    a.gf += m.awayScore; a.ga += m.homeScore;
    if (m.homeScore > m.awayScore) { h.win++; a.loss++; h.pts += 3; }
    else if (m.homeScore < m.awayScore) { a.win++; h.loss++; a.pts += 3; }
    else { h.draw++; a.draw++; h.pts++; a.pts++; }
  }
  return [...map.values()].map(r => ({ ...r, gd: r.gf - r.ga })).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
}

function getLeagueChampion(comp) {
  const table = computeStandings(comp.teams, comp.matches);
  return table[0]?.team || null;
}

function groupBy(list, getKey) {
  return list.reduce((acc, item) => {
    const key = getKey(item);
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
}
function escapeAttr(value) { return escapeHtml(value).replace(/'/g, '&#039;'); }

function bindEvents() {
  document.addEventListener('click', (event) => {
    const goBtn = event.target.closest('[data-go]');
    if (goBtn) go(goBtn.dataset.go);

    if (event.target.id === 'quickSaveInfo') toast('Data riwayat disimpan di storage aplikasi/WebView.');
    if (event.target.id === 'addLeagueTeam') addTeam('league');
    if (event.target.id === 'addCupTeam') addTeam('cup');

    const remove = event.target.closest('.remove-btn');
    if (remove) removeTeam(remove.dataset.type, remove.dataset.id);

    if (event.target.id === 'randomLeague') generateLeagueDraft();
    if (event.target.id === 'clearLeagueDraft') { app.leagueDraft = []; renderLeagueDraft(); }
    if (event.target.id === 'startLeague') startLeague();

    if (event.target.id === 'randomCup') generateCupDraft();
    if (event.target.id === 'clearCupDraft') { app.cupDraft = null; renderCupDraft(); }
    if (event.target.id === 'startCup') startCup();

    const move = event.target.closest('.move-match');
    if (move) moveDraftMatch(move.dataset.type, Number(move.dataset.index), move.dataset.dir);
    const swap = event.target.closest('.swap-match');
    if (swap) swapDraftMatch(swap.dataset.type, Number(swap.dataset.index));
    const reset = event.target.closest('.reset-match');
    if (reset) { reset.dataset.type === 'league' ? renderLeagueDraft() : renderCupDraft(); syncSelectValues(); }

    const filter = event.target.closest('.filter');
    if (filter) {
      app.historyFilter = filter.dataset.filter;
      $$('.filter').forEach(btn => btn.classList.toggle('active', btn === filter));
      renderHistory();
    }

    const openDetail = event.target.closest('.open-detail');
    if (openDetail) { renderDetail(openDetail.dataset.id); go('detailScreen'); }
    if (event.target.id === 'backToHistory') go('historyScreen');

    const saveScoreBtn = event.target.closest('.save-score');
    if (saveScoreBtn) saveScore(saveScoreBtn.dataset.comp, saveScoreBtn.dataset.match);

    if (event.target.id === 'clearHistory') {
      if (confirm('Hapus semua riwayat kompetisi?')) {
        app.competitions = [];
        save();
        renderHistory();
        toast('Riwayat dihapus.');
      }
    }
  });

  document.addEventListener('input', (event) => {
    if (event.target.classList.contains('team-input')) updateTeamName(event.target.dataset.type, event.target.dataset.id, event.target.value);
  });

  document.addEventListener('change', (event) => {
    if (event.target.classList.contains('draft-select')) updateDraftMatch(event.target.dataset.type, Number(event.target.dataset.index), event.target.dataset.side, event.target.value);
    if (event.target.classList.contains('bye-select')) updateCupBye(event.target.value);
    if (event.target.id === 'cupMode') { app.cupDraft = null; renderCupDraft(); }
  });
}

function init() {
  load();
  bindEvents();
  renderAllDraftInputs();
  renderHistory();
}

document.addEventListener('DOMContentLoaded', init);
