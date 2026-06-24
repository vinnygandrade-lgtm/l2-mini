/**
 * UI — Boss Diário (1 tentativa / dia / personagem)
 * Migrado: js/ui_daily_boss.js — Fase 4: tipos explícitos.
 */

import type {
  DailyBossCatalogEntry,
  DailyBossGradeTier,
  DailyBossId,
  RaidBossData,
} from '../types/game';

const LISTA_DAILY_BOSS_IDS: readonly DailyBossId[] = [
  'daily_boss_ng',
  'daily_boss_d',
  'daily_boss_c',
  'daily_boss_b',
  'daily_boss_a',
  'daily_boss_s',
];

const GRADE_TO_DAILY_BOSS_ID: Record<DailyBossGradeTier, DailyBossId> = {
  'No-Grade': 'daily_boss_ng',
  D: 'daily_boss_d',
  C: 'daily_boss_c',
  B: 'daily_boss_b',
  A: 'daily_boss_a',
  S: 'daily_boss_s',
};

let indiceDailyBossSelecionado = 0;
let dailyBossUiInicializado = false;

/** DEV/testes: true = ignora limite 1×/dia. Repor false antes de produção. */
const DAILY_BOSS_SKIP_DAILY_LIMIT = true;

function dailyBossT(key: string, params?: Record<string, string | number>): string {
  return typeof window.t === 'function' ? window.t(key, params) : key;
}

function dailyBossLore(bossId: DailyBossId): string {
  const text = dailyBossT(`game.dailyBoss.lore.${bossId}`);
  if (text && text !== `game.dailyBoss.lore.${bossId}`) return text;
  return dailyBossT('game.dailyBoss.loreFallback');
}

function dailyBossDisplayName(bossId: string | null | undefined, fallback: string): string {
  if (bossId && typeof window.bossDisplayName === 'function') {
    return window.bossDisplayName(bossId, fallback);
  }
  return fallback;
}

function dailyBossRegionLabel(bossId: string | null | undefined, fallback: string): string {
  if (bossId && typeof window.dailyBossRegionDisplay === 'function') {
    return window.dailyBossRegionDisplay(bossId, fallback);
  }
  return fallback;
}

function getDailyBossCatalog(id: string | null | undefined): DailyBossCatalogEntry | null {
  if (!id || !window.catalogoBossesDiarios) return null;
  const row = window.catalogoBossesDiarios[id];
  return row && typeof row === 'object' ? (row as DailyBossCatalogEntry) : null;
}

function obterListaDailyBossIds(): DailyBossId[] {
  return LISTA_DAILY_BOSS_IDS.filter((id) => !!getDailyBossCatalog(id));
}

function obterGradeDailyBossPorNivel(): DailyBossGradeTier {
  if (window.nivel >= 76) return 'S';
  if (window.nivel >= 61) return 'A';
  if (window.nivel >= 52) return 'B';
  if (window.nivel >= 40) return 'C';
  if (window.nivel >= 20) return 'D';
  return 'No-Grade';
}

function gradeParaDailyBossId(grade: DailyBossGradeTier): DailyBossId {
  return GRADE_TO_DAILY_BOSS_ID[grade] || 'daily_boss_ng';
}

function indiceRecomendadoPorNivel(): number {
  const idAlvo = gradeParaDailyBossId(obterGradeDailyBossPorNivel());
  const lista = obterListaDailyBossIds();
  const idx = lista.indexOf(idAlvo);
  return idx >= 0 ? idx : 0;
}

function getDataHojeDailyBoss(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getChaveDailyBoss(): string | null {
  if (!window.charName) return null;
  return `l2mini_dailyboss_${window.charName.toLowerCase()}_${getDataHojeDailyBoss()}`;
}

function getChaveDailyBossAlvo(): string | null {
  const k = getChaveDailyBoss();
  return k ? k + '_alvo' : null;
}

function dailyBossJaConsumiuHoje(): boolean {
  if (DAILY_BOSS_SKIP_DAILY_LIMIT) return false;
  const k = getChaveDailyBoss();
  if (!k) return true;
  return localStorage.getItem(k) === '1';
}

function marcarDailyBossConsumido(bossId: DailyBossId | string | null): void {
  if (DAILY_BOSS_SKIP_DAILY_LIMIT) return;
  const k = getChaveDailyBoss();
  if (k) {
    localStorage.setItem(k, '1');
    if (bossId) {
      const ka = getChaveDailyBossAlvo();
      if (ka) localStorage.setItem(ka, bossId);
    }
  }
}

function obterUltimoBossIdConsumido(): string | null {
  const ka = getChaveDailyBossAlvo();
  if (!ka) return null;
  return localStorage.getItem(ka);
}

function aplicarIndiceDailyBoss(novoIndice: number): void {
  const lista = obterListaDailyBossIds();
  if (!lista.length) return;
  let i = novoIndice % lista.length;
  if (i < 0) i += lista.length;
  indiceDailyBossSelecionado = i;
  atualizarPainelBossDiario();
}

function dailyBossSelecionarAnterior(): void {
  aplicarIndiceDailyBoss(indiceDailyBossSelecionado - 1);
}

function dailyBossSelecionarProximo(): void {
  aplicarIndiceDailyBoss(indiceDailyBossSelecionado + 1);
}

function obterBossIdSelecionado(): DailyBossId | null {
  const lista = obterListaDailyBossIds();
  if (!lista.length) return null;
  return lista[indiceDailyBossSelecionado] || lista[0];
}

function atualizarPainelBossDiario(): void {
  const lista = obterListaDailyBossIds();
  const bossId = obterBossIdSelecionado();
  const dados = getDailyBossCatalog(bossId);

  const img = document.getElementById('daily-boss-preview-img') as HTMLImageElement | null;
  const nomeEl = document.getElementById('daily-boss-preview-nome');
  const regiaoEl = document.getElementById('daily-boss-preview-regiao');
  const gradeEl = document.getElementById('daily-boss-preview-grade');
  const loreEl = document.getElementById('daily-boss-preview-lore');
  const contador = document.getElementById('daily-boss-contador');
  const badge = document.getElementById('daily-boss-grade-badge');

  if (!dados || !bossId) return;

  if (img) {
    img.onerror = function (this: HTMLImageElement) {
      this.onerror = null;
      this.src = 'assets/npcs/magister.png';
    };
    img.src = dados.img || '';
    img.alt = dailyBossDisplayName(bossId, dados.nome);
  }
  if (nomeEl) nomeEl.innerText = dailyBossDisplayName(bossId, dados.nome);
  if (regiaoEl) {
    const region = dailyBossRegionLabel(bossId, dados.regiao || '');
    regiaoEl.innerText = region
      ? dailyBossT('game.dailyBoss.regionLabel', { region })
      : '';
  }
  if (gradeEl) {
    const grBoss = dados.gradeRef || '—';
    const grReco = obterGradeDailyBossPorNivel();
    const recoLine = dailyBossT('game.dailyBoss.recoForLevel', { grade: grReco });
    gradeEl.innerHTML = dailyBossT('game.dailyBoss.previewBlock', {
      grade: grBoss,
      suggested: dados.nivel ?? '?',
      yourLevel: window.nivel,
      recoLine,
    });
  }
  if (loreEl) {
    loreEl.innerText = dailyBossLore(bossId);
  }

  if (contador) contador.innerText = `${indiceDailyBossSelecionado + 1} / ${lista.length}`;
  if (badge) {
    const idReco = gradeParaDailyBossId(obterGradeDailyBossPorNivel());
    const idxReco = LISTA_DAILY_BOSS_IDS.indexOf(idReco);
    const idxSel = LISTA_DAILY_BOSS_IDS.indexOf(bossId);
    if (idxReco >= 0 && idxSel >= 0) {
      if (idxSel > idxReco) {
        badge.innerHTML = '<span style="color:#f87171;">' + dailyBossT('game.dailyBoss.badgeHarder') + '</span>';
      } else if (idxSel < idxReco) {
        badge.innerHTML = '<span style="color:#6ee7b7;">' + dailyBossT('game.dailyBoss.badgeEasier') + '</span>';
      } else {
        badge.innerHTML = '<span style="color:#fbbf24;">' + dailyBossT('game.dailyBoss.badgeMatch') + '</span>';
      }
    } else {
      badge.innerHTML = '';
    }
  }
}

function atualizarWorldDailyBossUI(): void {
  const resumo = document.getElementById('daily-boss-card-resumo');
  const badge = document.getElementById('daily-boss-badge-estado');
  if (!resumo || !badge) return;

  if (dailyBossJaConsumiuHoje()) {
    const ultimoId = obterUltimoBossIdConsumido();
    let nome = dailyBossT('game.dailyBoss.defaultName');
    let regiao = '';
    const ultimoDados = getDailyBossCatalog(ultimoId);
    if (ultimoDados) {
      nome = dailyBossDisplayName(ultimoId, ultimoDados.nome);
      regiao = dailyBossRegionLabel(ultimoId, ultimoDados.regiao || '');
    } else {
      const bid = gradeParaDailyBossId(obterGradeDailyBossPorNivel());
      const dados = getDailyBossCatalog(bid);
      if (dados) {
        nome = dailyBossDisplayName(bid, dados.nome);
        regiao = dailyBossRegionLabel(bid, dados.regiao || '');
      }
    }
    badge.innerText = dailyBossT('game.world.badgeDone');
    badge.style.background = '#374151';
    badge.style.color = '#e5e7eb';
    const regionSuffix = regiao ? (' · ' + regiao) : '';
    const line1 = dailyBossT('game.dailyBoss.comeBackTomorrow');
    const line2 = dailyBossT('game.dailyBoss.lastTargetLine', { name: nome, regionSuffix });
    resumo.innerHTML = `<span style="color:#9ca3af;">${line1}</span><br><span style="color:#94a3b8; font-size:0.95em;">${line2}</span>`;
  } else {
    badge.innerText = dailyBossT('game.world.badge1xDayShort');
    badge.style.background = '#f59e0b';
    badge.style.color = '#000';
    const gr = obterGradeDailyBossPorNivel();
    const pickHint = dailyBossT('game.dailyBoss.pickBossHint');
    const recoL = dailyBossT('game.dailyBoss.recoShortLine', { grade: gr });
    resumo.innerHTML = `<span style="color:#94a3b8;">${pickHint}</span><br><span style="color:#6ee7b7; font-size:0.9em;">${recoL}</span>`;
  }
}

function abrirJanelaDailyBoss(): void {
  if (!window.charName) return;
  atualizarWorldDailyBossUI();

  const lista = obterListaDailyBossIds();
  if (!lista.length) {
    if (typeof window.mostrarAviso === 'function') {
      window.mostrarAviso(dailyBossT('game.dailyBoss.unavailable'));
    }
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
  const btn = document.getElementById('btn-iniciar-daily-boss') as HTMLButtonElement | null;
  const gasto = dailyBossJaConsumiuHoje();

  if (statusEl) {
    const msg = gasto
      ? dailyBossT('game.dailyBoss.statusFoughtToday')
      : dailyBossT('game.dailyBoss.statusPickTarget');
    const color = gasto ? '#f87171' : '#34d399';
    statusEl.innerHTML = `<span style="color:${color};">${msg}</span>`;
  }
  if (btn) {
    btn.disabled = gasto;
    btn.style.opacity = gasto ? '0.55' : '1';
    btn.innerText = gasto
      ? dailyBossT('game.dailyBoss.btnDoneToday')
      : dailyBossT('game.dailyBoss.btnEnterArena');
  }

  window.abrirModal('janela-daily-boss', 1500);
}

function fecharJanelaDailyBoss(): void {
  window.fecharModal('janela-daily-boss');
}

function confirmarInicioDailyBoss(): void {
  if (!window.charName) return;
  if (dailyBossJaConsumiuHoje()) {
    if (typeof window.mostrarAviso === 'function') {
      window.mostrarAviso(dailyBossT('game.dailyBoss.alreadyUsed'));
    }
    return;
  }

  const bossId = obterBossIdSelecionado();
  if (!bossId) {
    if (typeof window.mostrarAviso === 'function') {
      window.mostrarAviso(dailyBossT('game.dailyBoss.notFound'));
    }
    return;
  }

  let dadosBoss: RaidBossData | DailyBossCatalogEntry | null = null;
  if (window.RaidEngine?.resolverBossDoCatalogo) {
    dadosBoss = window.RaidEngine.resolverBossDoCatalogo(bossId);
  } else {
    dadosBoss = getDailyBossCatalog(bossId);
  }
  if (!dadosBoss) {
    if (typeof window.mostrarAviso === 'function') {
      window.mostrarAviso(dailyBossT('game.dailyBoss.notFound'));
    }
    return;
  }

  if (!window.RaidEngine?.iniciar) {
    if (typeof window.mostrarAviso === 'function') {
      window.mostrarAviso(dailyBossT('game.dailyBoss.raidNotLoaded'));
    }
    return;
  }
  const lobbyRaid = document.getElementById('janela-raid-lobby');
  if (!lobbyRaid) {
    if (typeof window.mostrarAviso === 'function') {
      window.mostrarAviso(dailyBossT('game.dailyBoss.uiUnavailable'));
    }
    return;
  }

  marcarDailyBossConsumido(bossId);
  fecharJanelaDailyBoss();
  atualizarWorldDailyBossUI();

  lobbyRaid.style.display = 'none';
  if (typeof window.irPara === 'function') {
    window.irPara('raid-arena');
  }
  window.RaidEngine.iniciar(bossId, { modoDiario: true, bots: 0 });

  if (typeof window.escreverLog === 'function') {
    const bossLabel = dailyBossDisplayName(bossId, dadosBoss.nome);
    const logLine = dailyBossT('game.dailyBoss.logChallenge', { name: bossLabel });
    window.escreverLog(`<span style="color:#f59e0b; font-weight:bold;">${logLine}</span>`);
  }
}

window.dailyBossJaConsumiuHoje = dailyBossJaConsumiuHoje;
window.dailyBossSelecionarAnterior = dailyBossSelecionarAnterior;
window.dailyBossSelecionarProximo = dailyBossSelecionarProximo;
window.atualizarWorldDailyBossUI = atualizarWorldDailyBossUI;
window.abrirJanelaDailyBoss = abrirJanelaDailyBoss;
window.fecharJanelaDailyBoss = fecharJanelaDailyBoss;
window.confirmarInicioDailyBoss = confirmarInicioDailyBoss;

export {};
