/**
 * Endgame pursuits — ascensão, elite hunt semanal, painel
 * Migrado: js/endgame_pursuits.js — Fase 4: tipos explícitos.
 */

import type {
  EndgameClaimRpcResult,
  EndgameData,
  EndgamePursuitsApi,
  EndgameRpcEnvelope,
  OlympiadRankInfo,
} from '../types/game';
import { registerGlobal } from '../runtime/register-global';

const SGRADE_LEVEL = 76;
const WEEKLY_CHAMP_TARGET = 35;
/** Teto semanal no servidor (register_elite_champion_kill_secure.c_weekly_cap) — manter alinhado. */
const WEEKLY_CHAMP_KILL_CAP = 500;
const WEEKLY_REWARD_ADENA = 1200000;
const WEEKLY_REWARD_ANCIENT = 400;
const WEEKLY_RENOWN = 25;
let _lastChampionKillSyncFailAlert = 0;
const CHAMP_KILL_SYNC_FAIL_ALERT_MS = 8000;

function getIsoWeekKey(d?: Date): string {
    const date = d ?? new Date();
    const t = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y = t.getUTCFullYear();
    const yb = new Date(Date.UTC(y, 0, 1));
    const w = Math.ceil(((t.getTime() - yb.getTime()) / 86400000 + 1) / 7);
    return y + '-W' + String(w).padStart(2, '0');
}

function eg(): EndgameData {
    if (!window.endgameData || typeof window.endgameData !== 'object') {
        window.endgameData = {
            weeklyChampionKills: 0,
            weeklyWeekKey: '',
            lastClaimedWeekKey: '',
            lifetimeChampionKills: 0,
            renown: 0,
        };
    }
    return window.endgameData;
}

function ensureWeekRollover(): void {
    const e = eg();
    const wk = getIsoWeekKey();
    if (e.weeklyWeekKey !== wk) {
        e.weeklyWeekKey = wk;
        e.weeklyChampionKills = 0;
    }
}

function mergeEndgameFromRpc(p: Partial<EndgameData> | null | undefined): void {
    if (!p || typeof p !== 'object') return;
    const e = eg();
    if (p.weeklyChampionKills != null) e.weeklyChampionKills = Number(p.weeklyChampionKills);
    if (p.weeklyWeekKey != null) e.weeklyWeekKey = String(p.weeklyWeekKey);
    if (p.lastClaimedWeekKey != null) e.lastClaimedWeekKey = String(p.lastClaimedWeekKey);
    if (p.lifetimeChampionKills != null) e.lifetimeChampionKills = Number(p.lifetimeChampionKills);
    if (p.renown != null) e.renown = Number(p.renown);
}

/** Rede / RPC ausente / resposta inesperada — não spamma em rajadas (vários campeões). */
function notifyChampionKillSyncFailure(): void {
    const now = Date.now();
    if (now - _lastChampionKillSyncFailAlert < CHAMP_KILL_SYNC_FAIL_ALERT_MS) return;
    _lastChampionKillSyncFailAlert = now;
    if (typeof window.l2Alert !== 'function') return;
    const msg = typeof window.t === 'function' ? window.t('game.endgame.championKillNotSynced') : '';
    if (msg && !msg.startsWith('game.endgame.championKillNotSynced')) window.l2Alert(msg);
}

function onChampionKill(): void {
    if (typeof window.nivel !== 'number' || window.nivel < SGRADE_LEVEL) return;

    const e = eg();
    const wk = getIsoWeekKey();
    const api = window.SupabaseAPI;
    const recordFn =
        api && typeof api.recordEliteChampionKillWithRetry === 'function'
            ? api.recordEliteChampionKillWithRetry.bind(api)
            : api && typeof api.recordEliteChampionKill === 'function'
              ? api.recordEliteChampionKill.bind(api)
              : null;
    const cloud =
        api &&
        typeof api.getUser === 'function' &&
        api.getUser() &&
        window.charName &&
        typeof recordFn === 'function';

    if (cloud && recordFn) {
        recordFn(wk)
            .then((res: EndgameRpcEnvelope) => {
                const err = res?.error;
                const data = res?.data;
                if (err) {
                    console.warn('[ChampionKill RPC]', err);
                    notifyChampionKillSyncFailure();
                    return;
                }
                if (!data || !data.success) {
                    const code = data?.error;
                    let shownSpecific = false;
                    if (code && typeof window.l2Alert === 'function') {
                        const msg = _t('game.endgame.error_' + code);
                        if (msg && !msg.startsWith('game.endgame.error_')) {
                            window.l2Alert(msg);
                            shownSpecific = true;
                        }
                    }
                    if (!shownSpecific) notifyChampionKillSyncFailure();
                    return;
                }
                if (data.endgame && typeof data.endgame === 'object') mergeEndgameFromRpc(data.endgame);
                else mergeEndgameFromRpc(data as Partial<EndgameData>);
                refreshPublicAscensionHUD();
                refreshEndgamePanelUI();
                if (typeof window.salvarJogo === 'function') window.salvarJogo();
            })
            .catch((rpcErr: unknown) => {
                console.warn('[ChampionKill RPC]', rpcErr);
                notifyChampionKillSyncFailure();
            });
        return;
    }

    ensureWeekRollover();
    e.weeklyChampionKills = (e.weeklyChampionKills || 0) + 1;
    e.lifetimeChampionKills = (e.lifetimeChampionKills || 0) + 1;
    refreshPublicAscensionHUD();
}

function normalizeAfterLoad(): void {
    ensureWeekRollover();
    refreshPublicAscensionHUD();
}

function _t(key: string, params?: Record<string, string | number>): string {
    return typeof window.t === 'function' ? window.t(key, params) : key;
}

function getRenownTitle(): string {
    return getAscensionTitleForRenown(eg().renown || 0);
}

/** Título traduzido só a partir do valor de Renome (inspeção / jogadores remotos). */
function getAscensionTitleForRenown(renown: number): string {
    const r = Number(renown) || 0;
    if (r >= 200) return _t('game.endgame.titleParagon');
    if (r >= 100) return _t('game.endgame.titleWarlord');
    if (r >= 40) return _t('game.endgame.titleVeteran');
    return _t('game.endgame.titleAscendant');
}

async function claimWeeklyEliteHunt(): Promise<void> {
    if (typeof window.nivel !== 'number' || window.nivel < SGRADE_LEVEL) {
        const need = _t('game.endgame.needSGrade');
        if (typeof window.l2Alert === 'function') window.l2Alert(need);
        else if (typeof window.mostrarAviso === 'function') window.mostrarAviso(need);
        return;
    }

    ensureWeekRollover();
    const e = eg();
    const wk = getIsoWeekKey();

    if (e.lastClaimedWeekKey === wk) {
        if (typeof window.mostrarAviso === 'function') window.mostrarAviso(_t('game.endgame.alreadyClaimed'));
        return;
    }

    if ((e.weeklyChampionKills || 0) < WEEKLY_CHAMP_TARGET) {
        const left = WEEKLY_CHAMP_TARGET - (e.weeklyChampionKills || 0);
        if (typeof window.mostrarAviso === 'function') {
            window.mostrarAviso(_t('game.endgame.needMoreChamps', { left }));
        }
        return;
    }

    const btn = document.getElementById('endgame-btn-claim');
    if (btn instanceof HTMLButtonElement) btn.disabled = true;

    if (window.SupabaseAPI && window.SupabaseAPI.getUser() && window.charName) {
        try {
            if (typeof window.mostrarAviso === 'function') window.mostrarAviso(_t('game.cloud.syncing'));

            const { data, error } = await window.SupabaseAPI.claimWeeklyAscension!(window.charName, wk);

            if (error) {
                console.error('[Ascension RPC Error]', error);
                if (typeof window.l2Alert === 'function') {
                    const msg = typeof window.cloudRpcMessage === 'function'
                        ? window.cloudRpcMessage(error, { prefix: 'game.endgame', fallbackKey: 'game.cloud.error' })
                        : String(error);
                    window.l2Alert(msg);
                }
                if (btn instanceof HTMLButtonElement) btn.disabled = false;
                return;
            }

            const claimData = data as EndgameClaimRpcResult | null;
            if (claimData?.success) {
                e.lastClaimedWeekKey = wk;
                if (claimData.new_renown != null) e.renown = Number(claimData.new_renown);
                if (claimData.endgame && typeof claimData.endgame === 'object') {
                    mergeEndgameFromRpc(claimData.endgame);
                }
                window.adenas = (window.adenas || 0) + Number(claimData.added_adena ?? 0);
                window.ancientCoins = (window.ancientCoins || 0) + Number(claimData.added_ancient ?? 0);

                if (typeof window.escreverLog === 'function') {
                    window.escreverLog(
                        '<span style="color:#c084fc;font-weight:bold;">' + _t('game.endgame.logClaimed') + '</span>',
                    );
                }

                if (typeof window.atualizar === 'function') window.atualizar();
                refreshEndgamePanelUI();
                if (typeof window.salvarJogo === 'function') window.salvarJogo();
            } else {
                const errCode = claimData?.error ?? 'unknown_error';
                if (typeof window.l2Alert === 'function') {
                    const msg = typeof window.cloudRpcMessage === 'function'
                        ? window.cloudRpcMessage(errCode, { prefix: 'game.endgame', fallbackKey: 'game.cloud.error' })
                        : (_t('game.endgame.error_' + errCode) || errCode);
                    window.l2Alert(msg);
                }
                if (btn instanceof HTMLButtonElement) btn.disabled = false;
            }
        } catch (err) {
            console.error('[Ascension Claim Exception]', err);
            if (btn instanceof HTMLButtonElement) btn.disabled = false;
        }
    } else {
        e.lastClaimedWeekKey = wk;
        e.renown = (e.renown || 0) + WEEKLY_RENOWN;
        window.adenas = (window.adenas || 0) + WEEKLY_REWARD_ADENA;
        window.ancientCoins = (window.ancientCoins || 0) + WEEKLY_REWARD_ANCIENT;

        if (typeof window.escreverLog === 'function') {
            window.escreverLog(
                '<span style="color:#c084fc;font-weight:bold;">' + _t('game.endgame.logClaimed') + '</span>',
            );
        }
        if (typeof window.salvarJogo === 'function') window.salvarJogo();
        if (typeof window.atualizar === 'function') window.atualizar();
        refreshEndgamePanelUI();
    }
}

function buildPanelInnerHTML(): string {
    return (
        '<p style="color:#94a3b8;font-size:0.82em;line-height:1.45;margin:0 0 10px 0;">' + _t('game.endgame.intro') + '</p>' +
        '<div style="background:#1a1410;border:1px solid #854d0e;border-radius:6px;padding:10px;margin-bottom:12px;">' +
        '<div style="color:#facc15;font-weight:bold;font-size:0.9em;margin-bottom:6px;">' + _t('game.endgame.weeklyTitle') + '</div>' +
        '<div id="endgame-weekly-progress-text" style="color:#e2e8f0;font-size:0.8em;"></div>' +
        '<div style="height:8px;background:#0f172a;border-radius:4px;margin-top:6px;overflow:hidden;">' +
        '<div id="endgame-weekly-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#7c3aed,#c084fc);transition:width 0.3s;"></div></div>' +
        '<button type="button" id="endgame-btn-claim" class="btn-l2" style="width:100%;margin-top:10px;background:#7c3aed;border-color:#a855f7;" ' +
        'onclick="EndgamePursuits.claimWeeklyEliteHunt()">' + _t('game.endgame.claimBtn') + '</button>' +
        '<div style="color:#64748b;font-size:0.72em;margin-top:6px;">' + _t('game.endgame.weeklyHint') + '</div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;font-size:0.8em;">' +
        '<div style="background:#111;padding:8px;border-radius:6px;border:1px solid #333;">' +
        '<div style="color:#94a3b8;">' + _t('game.endgame.renownLabel') + '</div>' +
        '<div id="endgame-renown" style="color:#facc15;font-weight:bold;font-size:1.2em;">0</div>' +
        '<div id="endgame-renown-title" style="color:#c084fc;font-size:0.75em;margin-top:4px;">—</div></div>' +
        '<div style="background:#111;padding:8px;border-radius:6px;border:1px solid #333;">' +
        '<div style="color:#94a3b8;">' + _t('game.endgame.lifetimeLabel') + '</div>' +
        '<div id="endgame-lifetime-champs" style="color:#e2e8f0;font-weight:bold;">0</div></div></div>' +
        '<div style="background:#0f172a;border-radius:6px;padding:10px;font-size:0.78em;color:#cbd5e1;line-height:1.5;">' +
        '<div><strong>' + _t('game.endgame.seasonTitle') + '</strong> <span id="endgame-season-line"></span></div>' +
        '<div style="margin-top:6px;"><strong>' + _t('game.endgame.olympiadTitle') + '</strong> <span id="endgame-olympiad-line"></span></div></div>' +
        '<ul style="margin:12px 0 0 0;padding-left:18px;color:#94a3b8;font-size:0.78em;line-height:1.55;">' +
        '<li>' + _t('game.endgame.pursuit1') + '</li>' +
        '<li>' + _t('game.endgame.pursuit2') + '</li>' +
        '<li>' + _t('game.endgame.pursuit3') + '</li>' +
        '<li>' + _t('game.endgame.pursuit4') + '</li>' +
        '<li>' + _t('game.endgame.pursuit5') + '</li></ul>'
    );
}

function refreshEndgamePanelUI(): void {
    ensureWeekRollover();
    const e = eg();
    const wk = getIsoWeekKey();
    const kills = e.weeklyChampionKills || 0;
    const pct = Math.min(100, Math.floor((kills / WEEKLY_CHAMP_TARGET) * 100));
    const claimed = e.lastClaimedWeekKey === wk;
    let rank: OlympiadRankInfo = { nomeCompleto: '—', tier: '—' };
    if (window.OlympiadEngine && typeof window.OlympiadEngine.getRank === 'function') {
        rank = window.OlympiadEngine.getRank(window.olympiadPoints || 0) ?? rank;
    }
    let seasonLine = '—';
    if (window.RankingSeasons && typeof window.RankingSeasons.getTimeLeft === 'function') {
        const tl = window.RankingSeasons.getTimeLeft();
        seasonLine = _t('game.endgame.seasonLine', { days: tl.days, hours: tl.hours });
    }
    const body = document.getElementById('endgame-panel-body');
    if (body) {
        const elProg = document.getElementById('endgame-weekly-progress-text');
        const elBar = document.getElementById('endgame-weekly-progress-bar');
        const btn = document.getElementById('endgame-btn-claim');
        if (elProg) elProg.textContent = _t('game.endgame.progressLine', { cur: kills, max: WEEKLY_CHAMP_TARGET });
        if (elBar instanceof HTMLElement) elBar.style.width = pct + '%';
        if (btn instanceof HTMLButtonElement) {
            btn.disabled = !!claimed || kills < WEEKLY_CHAMP_TARGET;
            btn.textContent = claimed ? _t('game.endgame.claimedBtn') : _t('game.endgame.claimBtn');
        }
        const elRen = document.getElementById('endgame-renown');
        if (elRen) elRen.textContent = String(e.renown || 0);
        const elTit = document.getElementById('endgame-renown-title');
        if (elTit) elTit.textContent = getRenownTitle();
        const elSea = document.getElementById('endgame-season-line');
        if (elSea) elSea.textContent = seasonLine;
        const elOly = document.getElementById('endgame-olympiad-line');
        if (elOly) {
            elOly.textContent = _t('game.endgame.olympiadLine', {
                rank: rank.nomeCompleto || rank.tier || '—',
            });
        }
        const elLife = document.getElementById('endgame-lifetime-champs');
        if (elLife) elLife.textContent = (e.lifetimeChampionKills || 0).toLocaleString();
    }
    refreshPublicAscensionHUD();
}

function getRenown(): number {
    return eg().renown || 0;
}

function getRenownTitlePublic(): string {
    return getRenownTitle();
}

function refreshPublicAscensionHUD(): void {
    const title = getRenownTitle();
    const r = getRenown();
    const life = eg().lifetimeChampionKills || 0;
    const sub = document.getElementById('char-ascension-subtitle');
    if (sub) {
        sub.textContent =
            typeof window.t === 'function'
                ? window.t('game.endgame.hudSubtitle', { title, renown: r })
                : title + ' · Renown ' + r;
    }
    const prof = document.getElementById('profile-endgame-ascension');
    if (prof) {
        prof.textContent =
            typeof window.t === 'function'
                ? window.t('game.endgame.profileAscensionLine', {
                      title,
                      renown: r,
                      lifetime: life.toLocaleString(),
                  })
                : title + ' · ' + r + ' renown · ' + life.toLocaleString() + ' champions';
    }
}

function openEndgamePursuits(): void {
    const el = document.getElementById('janela-endgame-pursuits');
    if (!el) return;
    const body = document.getElementById('endgame-panel-body');
    if (body) body.innerHTML = buildPanelInnerHTML();
    if (typeof window.abrirModal === 'function') window.abrirModal('janela-endgame-pursuits', 1650);
    else if (el instanceof HTMLElement) el.style.display = 'flex';
    refreshEndgamePanelUI();
}

function closeEndgamePursuits(): void {
    if (typeof window.fecharModal === 'function') window.fecharModal('janela-endgame-pursuits');
}

const EndgamePursuits: EndgamePursuitsApi = {
    SGRADE_LEVEL,
    WEEKLY_CHAMP_TARGET,
    WEEKLY_CHAMP_KILL_CAP,
    onChampionKill,
    normalizeAfterLoad,
    claimWeeklyEliteHunt,
    openEndgamePursuits,
    closeEndgamePursuits,
    refreshEndgamePanelUI,
    refreshPublicAscensionHUD,
    getRenown,
    getRenownTitle: getRenownTitlePublic,
    getAscensionTitleForRenown,
    getIsoWeekKey,
};

registerGlobal('EndgamePursuits', EndgamePursuits);

export {};
