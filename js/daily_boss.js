// ==========================================
// BOSS DIÁRIO (1 tentativa / dia / personagem)
// Usa RaidEngine + mesma tela da Raid + barra de atalhos
// ==========================================

const DAILY_BOSS_LORE = {
    daily_boss_ng: 'On Talking Island’s shores, a corrupted arachnid queen tainted the crystal soil. End her before the whole island becomes a hive.',
    daily_boss_d: 'In the Ruins of Despair, the dead follow a faceless headsman. Defeat Barion or the catacombs will never fall silent.',
    daily_boss_c: 'In Death Pass, a shadow echoes Zaken’s cursed name. The strait narrows — you or it.',
    daily_boss_b: 'Dragon Valley burns under Matriarch Flameheart’s wake. Scale the vale before the sky turns to ash.',
    daily_boss_a: 'In the Tower of Insolence, the Sentinel watches Baium’s empty throne. Climb the carpet of light or be judged.',
    daily_boss_s: 'In the Imperial Tomb, Harik raises legions without souls. Only S-Grade heroes hear the Emperor’s last echo.'
};

const LISTA_DAILY_BOSS_IDS = [
    'daily_boss_ng',
    'daily_boss_d',
    'daily_boss_c',
    'daily_boss_b',
    'daily_boss_a',
    'daily_boss_s'
];

let indiceDailyBossSelecionado = 0;
let dailyBossUiInicializado = false;

function obterListaDailyBossIds() {
    return LISTA_DAILY_BOSS_IDS.filter(id => typeof catalogoBossesDiarios !== 'undefined' && catalogoBossesDiarios[id]);
}

function obterGradeDailyBossPorNivel() {
    if (nivel >= 76) return 'S';
    if (nivel >= 61) return 'A';
    if (nivel >= 52) return 'B';
    if (nivel >= 40) return 'C';
    if (nivel >= 20) return 'D';
    return 'No-Grade';
}

function gradeParaDailyBossId(grade) {
    const m = {
        'No-Grade': 'daily_boss_ng',
        'D': 'daily_boss_d',
        'C': 'daily_boss_c',
        'B': 'daily_boss_b',
        'A': 'daily_boss_a',
        'S': 'daily_boss_s'
    };
    return m[grade] || 'daily_boss_ng';
}

function indiceRecomendadoPorNivel() {
    const idAlvo = gradeParaDailyBossId(obterGradeDailyBossPorNivel());
    const lista = obterListaDailyBossIds();
    const idx = lista.indexOf(idAlvo);
    return idx >= 0 ? idx : 0;
}

function getDataHojeDailyBoss() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getChaveDailyBoss() {
    if (!charName) return null;
    return `l2mini_dailyboss_${charName.toLowerCase()}_${getDataHojeDailyBoss()}`;
}

function getChaveDailyBossAlvo() {
    const k = getChaveDailyBoss();
    return k ? k + '_alvo' : null;
}

window.dailyBossJaConsumiuHoje = function() {
    const k = getChaveDailyBoss();
    if (!k) return true;
    return localStorage.getItem(k) === '1';
};

function marcarDailyBossConsumido(bossId) {
    const k = getChaveDailyBoss();
    if (k) {
        localStorage.setItem(k, '1');
        if (bossId) {
            const ka = getChaveDailyBossAlvo();
            if (ka) localStorage.setItem(ka, bossId);
        }
    }
}

function obterUltimoBossIdConsumido() {
    const ka = getChaveDailyBossAlvo();
    if (!ka) return null;
    return localStorage.getItem(ka);
}

function aplicarIndiceDailyBoss(novoIndice) {
    const lista = obterListaDailyBossIds();
    if (!lista.length) return;
    let i = novoIndice % lista.length;
    if (i < 0) i += lista.length;
    indiceDailyBossSelecionado = i;
    atualizarPainelBossDiario();
}

window.dailyBossSelecionarAnterior = function() {
    aplicarIndiceDailyBoss(indiceDailyBossSelecionado - 1);
};

window.dailyBossSelecionarProximo = function() {
    aplicarIndiceDailyBoss(indiceDailyBossSelecionado + 1);
};

function obterBossIdSelecionado() {
    const lista = obterListaDailyBossIds();
    if (!lista.length) return null;
    return lista[indiceDailyBossSelecionado] || lista[0];
}

function atualizarPainelBossDiario() {
    const lista = obterListaDailyBossIds();
    const bossId = obterBossIdSelecionado();
    const dados = bossId && typeof catalogoBossesDiarios !== 'undefined' ? catalogoBossesDiarios[bossId] : null;

    const img = document.getElementById('daily-boss-preview-img');
    const nomeEl = document.getElementById('daily-boss-preview-nome');
    const regiaoEl = document.getElementById('daily-boss-preview-regiao');
    const gradeEl = document.getElementById('daily-boss-preview-grade');
    const loreEl = document.getElementById('daily-boss-preview-lore');
    const contador = document.getElementById('daily-boss-contador');
    const badge = document.getElementById('daily-boss-grade-badge');

    if (!dados) return;

    if (img) {
        img.onerror = function() {
            this.onerror = null;
            this.src = 'assets/npcs/magister.png';
        };
        img.src = dados.img;
        img.alt = dados.nome;
    }
    if (nomeEl) nomeEl.innerText = dados.nome;
    const tFn = (typeof window.t === 'function') ? window.t : null;
    if (regiaoEl) {
        regiaoEl.innerText = dados.regiao
            ? (tFn ? tFn('game.dailyBoss.regionLabel', { region: dados.regiao }) : `Region: ${dados.regiao}`)
            : '';
    }
    if (gradeEl) {
        const grBoss = dados.gradeRef || '—';
        const grReco = obterGradeDailyBossPorNivel();
        const recoLine = tFn ? tFn('game.dailyBoss.recoForLevel', { grade: grReco }) : `Recommended for your level: ${grReco}`;
        gradeEl.innerHTML = tFn
            ? tFn('game.dailyBoss.previewBlock', { grade: grBoss, suggested: dados.nivel || '?', yourLevel: nivel, recoLine })
            : (`Boss <b style="color:#fde047;">${grBoss}</b> · Suggested level ~${dados.nivel || '?'} · You: <b>Lv.${nivel}</b><br><span style="color:#6ee7b7; font-size:0.92em;">${recoLine}</span>`);
    }
    if (loreEl) loreEl.innerText = DAILY_BOSS_LORE[bossId] || (tFn ? tFn('game.dailyBoss.loreFallback') : 'A titan awaits your arrival.');

    if (contador) contador.innerText = `${indiceDailyBossSelecionado + 1} / ${lista.length}`;
    if (badge) {
        const idReco = gradeParaDailyBossId(obterGradeDailyBossPorNivel());
        const idxReco = LISTA_DAILY_BOSS_IDS.indexOf(idReco);
        const idxSel = LISTA_DAILY_BOSS_IDS.indexOf(bossId);
        if (idxReco >= 0 && idxSel >= 0) {
            const tFn = (typeof window.t === 'function') ? window.t : null;
            if (idxSel > idxReco) {
                badge.innerHTML = '<span style="color:#f87171;">' + (tFn ? tFn('game.dailyBoss.badgeHarder') : '⚠ Harder than recommended for your level') + '</span>';
            } else if (idxSel < idxReco) {
                badge.innerHTML = '<span style="color:#6ee7b7;">' + (tFn ? tFn('game.dailyBoss.badgeEasier') : '✓ Below recommended — easier / faster farm') + '</span>';
            } else {
                badge.innerHTML = '<span style="color:#fbbf24;">' + (tFn ? tFn('game.dailyBoss.badgeMatch') : '◎ Matches your level tier') + '</span>';
            }
        } else {
            badge.innerHTML = '';
        }
    }
}

window.atualizarWorldDailyBossUI = function() {
    const resumo = document.getElementById('daily-boss-card-resumo');
    const badge = document.getElementById('daily-boss-badge-estado');
    if (!resumo || !badge) return;

    const tFn = (typeof window.t === 'function') ? window.t : null;

    if (dailyBossJaConsumiuHoje()) {
        const ultimoId = obterUltimoBossIdConsumido();
        let nome = tFn ? tFn('game.dailyBoss.defaultName') : 'Daily Boss';
        let regiao = '';
        if (ultimoId && typeof catalogoBossesDiarios !== 'undefined' && catalogoBossesDiarios[ultimoId]) {
            nome = catalogoBossesDiarios[ultimoId].nome;
            regiao = catalogoBossesDiarios[ultimoId].regiao || '';
        } else {
            const gr = obterGradeDailyBossPorNivel();
            const bid = gradeParaDailyBossId(gr);
            const dados = typeof catalogoBossesDiarios !== 'undefined' ? catalogoBossesDiarios[bid] : null;
            if (dados) {
                nome = dados.nome;
                regiao = dados.regiao || '';
            }
        }
        badge.innerText = (typeof window.t === 'function') ? window.t('game.world.badgeDone') : 'DONE';
        badge.style.background = '#374151';
        badge.style.color = '#e5e7eb';
        const regionSuffix = regiao ? (' · ' + regiao) : '';
        const line1 = tFn ? tFn('game.dailyBoss.comeBackTomorrow') : 'Come back tomorrow.';
        const line2 = tFn
            ? tFn('game.dailyBoss.lastTargetLine', { name: nome, regionSuffix })
            : (`Last target: ${nome}${regionSuffix}`);
        resumo.innerHTML = `<span style="color:#9ca3af;">${line1}</span><br><span style="color:#94a3b8; font-size:0.95em;">${line2}</span>`;
    } else {
        badge.innerText = (typeof window.t === 'function') ? window.t('game.world.badge1xDayShort') : '1x / DAY';
        badge.style.background = '#f59e0b';
        badge.style.color = '#000';
        const gr = obterGradeDailyBossPorNivel();
        const pickHint = tFn ? tFn('game.dailyBoss.pickBossHint') : 'Tap to choose a boss';
        const recoL = tFn ? tFn('game.dailyBoss.recoShortLine', { grade: gr }) : (`Recommended for your level: ${gr}`);
        resumo.innerHTML = `<span style="color:#94a3b8;">${pickHint}</span><br><span style="color:#6ee7b7; font-size:0.9em;">${recoL}</span>`;
    }
};

window.abrirJanelaDailyBoss = function() {
    if (!charName) return;
    atualizarWorldDailyBossUI();

    const lista = obterListaDailyBossIds();
    if (!lista.length) {
        if (typeof mostrarAviso === 'function') mostrarAviso(typeof window.t === 'function' ? window.t('game.dailyBoss.unavailable') : 'Daily boss unavailable.');
        return;
    }

    if (!dailyBossUiInicializado) {
        indiceDailyBossSelecionado = indiceRecomendadoPorNivel();
        dailyBossUiInicializado = true;
    } else {
        indiceDailyBossSelecionado = Math.min(indiceDailyBossSelecionado, lista.length - 1);
        indiceDailyBossSelecionado = Math.max(0, indiceDailyBossSelecionado);
    }

    atualizarPainelBossDiario();

    const statusEl = document.getElementById('daily-boss-status-msg');
    const btn = document.getElementById('btn-iniciar-daily-boss');
    const gasto = dailyBossJaConsumiuHoje();

    if (statusEl) {
        const tFn = (typeof window.t === 'function') ? window.t : null;
        const msg = gasto
            ? (tFn ? tFn('game.dailyBoss.statusFoughtToday') : 'You already fought the Daily Boss today.')
            : (tFn ? tFn('game.dailyBoss.statusPickTarget') : 'Pick your target with the arrows — the attempt is spent when you enter the arena.');
        const color = gasto ? '#f87171' : '#34d399';
        statusEl.innerHTML = `<span style="color:${color};">${msg}</span>`;
    }
    if (btn) {
        btn.disabled = gasto;
        btn.style.opacity = gasto ? '0.55' : '1';
        const tFn = (typeof window.t === 'function') ? window.t : null;
        btn.innerText = gasto
            ? (tFn ? tFn('game.dailyBoss.btnDoneToday') : 'ALREADY DONE TODAY')
            : (tFn ? tFn('game.dailyBoss.btnEnterArena') : 'ENTER ARENA');
    }

    abrirModal('janela-daily-boss', 1500);
};

window.fecharJanelaDailyBoss = function() {
    fecharModal('janela-daily-boss');
};

window.confirmarInicioDailyBoss = function() {
    if (!charName) return;
    if (dailyBossJaConsumiuHoje()) {
        if (typeof mostrarAviso === 'function') mostrarAviso(typeof window.t === 'function' ? window.t('game.dailyBoss.alreadyUsed') : 'Daily Boss already used today.');
        return;
    }

    const bossId = obterBossIdSelecionado();
    let dadosBoss = null;
    if (typeof RaidEngine !== 'undefined' && RaidEngine.resolverBossDoCatalogo) {
        dadosBoss = RaidEngine.resolverBossDoCatalogo(bossId);
    } else if (typeof catalogoBossesDiarios !== 'undefined') {
        dadosBoss = catalogoBossesDiarios[bossId];
    }
    if (!dadosBoss) {
        if (typeof mostrarAviso === 'function') mostrarAviso(typeof window.t === 'function' ? window.t('game.dailyBoss.notFound') : 'Boss data not found.');
        return;
    }

    if (typeof RaidEngine === 'undefined' || !RaidEngine.iniciar) {
        if (typeof mostrarAviso === 'function') mostrarAviso(typeof window.t === 'function' ? window.t('game.dailyBoss.raidNotLoaded') : 'RaidEngine not loaded.');
        return;
    }
    const lobbyRaid = document.getElementById('janela-raid-lobby');
    if (!lobbyRaid) {
        if (typeof mostrarAviso === 'function') mostrarAviso(typeof window.t === 'function' ? window.t('game.dailyBoss.uiUnavailable') : 'Raid UI unavailable.');
        return;
    }

    marcarDailyBossConsumido(bossId);
    fecharJanelaDailyBoss();
    atualizarWorldDailyBossUI();

    lobbyRaid.style.display = 'none';
    RaidEngine.iniciar(bossId, { modoDiario: true, bots: 0 });

    if (typeof escreverLog === 'function') {
        const tFn = (typeof window.t === 'function') ? window.t : null;
        const logLine = tFn ? tFn('game.dailyBoss.logChallenge', { name: dadosBoss.nome }) : (`[Daily Boss] Challenge: ${dadosBoss.nome}. Good luck!`);
        escreverLog(`<span style="color:#f59e0b; font-weight:bold;">${logLine}</span>`);
    }
};
