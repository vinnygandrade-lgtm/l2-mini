/**
 * ENDGAME_PURSUITS.JS — Metas contínuas após S-Grade (renome, elite hunt semanal, painel de direção).
 */
(function () {
    var SGRADE_LEVEL = 76;
    var WEEKLY_CHAMP_TARGET = 35;
    var WEEKLY_REWARD_ADENA = 1200000;
    var WEEKLY_REWARD_ANCIENT = 400;
    var WEEKLY_RENOWN = 25;

    function getIsoWeekKey(d) {
        d = d || new Date();
        var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        var day = t.getUTCDay() || 7;
        t.setUTCDate(t.getUTCDate() + 4 - day);
        var y = t.getUTCFullYear();
        var yb = new Date(Date.UTC(y, 0, 1));
        var w = Math.ceil(((t - yb) / 86400000 + 1) / 7);
        return y + '-W' + String(w).padStart(2, '0');
    }

    function eg() {
        if (!window.endgameData || typeof window.endgameData !== 'object') {
            window.endgameData = {
                weeklyChampionKills: 0,
                weeklyWeekKey: '',
                lastClaimedWeekKey: '',
                lifetimeChampionKills: 0,
                renown: 0
            };
        }
        return window.endgameData;
    }

    function ensureWeekRollover() {
        var e = eg();
        var wk = getIsoWeekKey();
        if (e.weeklyWeekKey !== wk) {
            e.weeklyWeekKey = wk;
            e.weeklyChampionKills = 0;
        }
    }

    function onChampionKill() {
        if (typeof window.nivel !== 'number' || window.nivel < SGRADE_LEVEL) return;
        ensureWeekRollover();
        var e = eg();
        e.weeklyChampionKills = (e.weeklyChampionKills || 0) + 1;
        e.lifetimeChampionKills = (e.lifetimeChampionKills || 0) + 1;
        refreshPublicAscensionHUD();
    }

    function normalizeAfterLoad() {
        ensureWeekRollover();
        refreshPublicAscensionHUD();
    }

    function _t(key, params) {
        return typeof window.t === 'function' ? window.t(key, params) : key;
    }

    function getRenownTitle() {
        return getAscensionTitleForRenown(eg().renown || 0);
    }

    /** Título traduzido só a partir do valor de Renome (inspeção / jogadores remotos). */
    function getAscensionTitleForRenown(renown) {
        var r = Number(renown) || 0;
        if (r >= 200) return _t('game.endgame.titleParagon');
        if (r >= 100) return _t('game.endgame.titleWarlord');
        if (r >= 40) return _t('game.endgame.titleVeteran');
        return _t('game.endgame.titleAscendant');
    }

    async function claimWeeklyEliteHunt() {
        // Resgate semanal: agora com autoridade no servidor via RPC.
        if (typeof window.nivel !== 'number' || window.nivel < SGRADE_LEVEL) {
            var need = _t('game.endgame.needSGrade');
            if (typeof window.l2Alert === 'function') window.l2Alert(need);
            else if (typeof window.mostrarAviso === 'function') window.mostrarAviso(need);
            return;
        }

        ensureWeekRollover();
        var e = eg();
        var wk = getIsoWeekKey();

        if (e.lastClaimedWeekKey === wk) {
            if (typeof window.mostrarAviso === 'function') window.mostrarAviso(_t('game.endgame.alreadyClaimed'));
            return;
        }

        if ((e.weeklyChampionKills || 0) < WEEKLY_CHAMP_TARGET) {
            var left = WEEKLY_CHAMP_TARGET - (e.weeklyChampionKills || 0);
            if (typeof window.mostrarAviso === 'function') window.mostrarAviso(_t('game.endgame.needMoreChamps', { left: left }));
            return;
        }

        // Bloqueia duplo clique
        var btn = document.getElementById('endgame-btn-claim');
        if (btn) btn.disabled = true;

        // Se estiver logado na nuvem, usa a RPC. Caso contrário, mantém o modo local (bridge).
        if (window.SupabaseAPI && window.SupabaseAPI.getUser() && window.charName) {
            try {
                if (typeof window.mostrarAviso === 'function') window.mostrarAviso(_t('game.cloud.syncing'));
                
                const { data, error } = await window.SupabaseAPI.claimWeeklyAscension(window.charName, wk);
                
                if (error) {
                    console.error('[Ascension RPC Error]', error);
                    if (typeof window.l2Alert === 'function') window.l2Alert(_t('game.cloud.error') + ': ' + (error.message || error));
                    if (btn) btn.disabled = false;
                    return;
                }

                if (data && data.success) {
                    // Sincroniza o estado local com o que o servidor aplicou
                    e.lastClaimedWeekKey = wk;
                    e.renown = data.new_renown;
                    // As moedas serão atualizadas no próximo carregarJogo ou podemos atualizar agora
                    // Para evitar inconsistência, o ideal é que o servidor já aplicou no JSONB.
                    // Vamos atualizar localmente também para feedback imediato.
                    window.adenas = (window.adenas || 0) + data.added_adena;
                    window.ancientCoins = (window.ancientCoins || 0) + data.added_ancient;

                    if (typeof window.escreverLog === 'function') {
                        window.escreverLog('<span style="color:#c084fc;font-weight:bold;">' + _t('game.endgame.logClaimed') + '</span>');
                    }
                    
                    // Não chamamos salvarJogo aqui porque a RPC já salvou no DB. 
                    // Se chamarmos salvarJogo agora com dados locais, podemos sobrescrever algo se o sync for lento.
                    // Mas precisamos garantir que o próximo save local não faça rollback.
                    if (typeof window.atualizar === 'function') window.atualizar();
                    refreshEndgamePanelUI();
                } else {
                    const errMsg = data ? data.error : 'unknown_error';
                    if (typeof window.l2Alert === 'function') window.l2Alert(_t('game.endgame.error_' + errMsg) || errMsg);
                    if (btn) btn.disabled = false;
                }
            } catch (err) {
                console.error('[Ascension Claim Exception]', err);
                if (btn) btn.disabled = false;
            }
        } else {
            // Modo Local (sem nuvem) - Mantém comportamento original
            e.lastClaimedWeekKey = wk;
            e.renown = (e.renown || 0) + WEEKLY_RENOWN;
            window.adenas = (window.adenas || 0) + WEEKLY_REWARD_ADENA;
            window.ancientCoins = (window.ancientCoins || 0) + WEEKLY_REWARD_ANCIENT;

            if (typeof window.escreverLog === 'function') {
                window.escreverLog('<span style="color:#c084fc;font-weight:bold;">' + _t('game.endgame.logClaimed') + '</span>');
            }
            if (typeof window.salvarJogo === 'function') window.salvarJogo();
            if (typeof window.atualizar === 'function') window.atualizar();
            refreshEndgamePanelUI();
        }
    }

    function buildPanelInnerHTML() {
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

    function refreshEndgamePanelUI() {
        ensureWeekRollover();
        var e = eg();
        var wk = getIsoWeekKey();
        var kills = e.weeklyChampionKills || 0;
        var pct = Math.min(100, Math.floor((kills / WEEKLY_CHAMP_TARGET) * 100));
        var claimed = e.lastClaimedWeekKey === wk;
        var rank = { nomeCompleto: '—', tier: '—' };
        if (typeof window.OlympiadEngine !== 'undefined' && typeof window.OlympiadEngine.getRank === 'function') {
            rank = window.OlympiadEngine.getRank(window.olympiadPoints || 0) || rank;
        }
        var seasonLine = '—';
        if (typeof window.RankingSeasons !== 'undefined' && typeof window.RankingSeasons.getTimeLeft === 'function') {
            var tl = window.RankingSeasons.getTimeLeft();
            seasonLine = _t('game.endgame.seasonLine', { days: tl.days, hours: tl.hours });
        }
        var body = document.getElementById('endgame-panel-body');
        if (body) {
            var elProg = document.getElementById('endgame-weekly-progress-text');
            var elBar = document.getElementById('endgame-weekly-progress-bar');
            var btn = document.getElementById('endgame-btn-claim');
            if (elProg) elProg.textContent = _t('game.endgame.progressLine', { cur: kills, max: WEEKLY_CHAMP_TARGET });
            if (elBar) elBar.style.width = pct + '%';
            if (btn) {
                btn.disabled = !!claimed || kills < WEEKLY_CHAMP_TARGET;
                btn.textContent = claimed ? _t('game.endgame.claimedBtn') : _t('game.endgame.claimBtn');
            }
            var elRen = document.getElementById('endgame-renown');
            if (elRen) elRen.textContent = String(e.renown || 0);
            var elTit = document.getElementById('endgame-renown-title');
            if (elTit) elTit.textContent = getRenownTitle();
            var elSea = document.getElementById('endgame-season-line');
            if (elSea) elSea.textContent = seasonLine;
            var elOly = document.getElementById('endgame-olympiad-line');
            if (elOly) elOly.textContent = _t('game.endgame.olympiadLine', { rank: rank.nomeCompleto || rank.tier || '—' });
            var elLife = document.getElementById('endgame-lifetime-champs');
            if (elLife) elLife.textContent = (e.lifetimeChampionKills || 0).toLocaleString();
        }
        refreshPublicAscensionHUD();
    }

    function getRenown() {
        return eg().renown || 0;
    }

    function getRenownTitlePublic() {
        return getRenownTitle();
    }

    function refreshPublicAscensionHUD() {
        var title = getRenownTitle();
        var r = getRenown();
        var life = eg().lifetimeChampionKills || 0;
        var sub = document.getElementById('char-ascension-subtitle');
        if (sub) {
            sub.textContent =
                typeof window.t === 'function'
                    ? window.t('game.endgame.hudSubtitle', { title: title, renown: r })
                    : title + ' · Renown ' + r;
        }
        var prof = document.getElementById('profile-endgame-ascension');
        if (prof) {
            prof.textContent =
                typeof window.t === 'function'
                    ? window.t('game.endgame.profileAscensionLine', {
                          title: title,
                          renown: r,
                          lifetime: life.toLocaleString()
                      })
                    : title + ' · ' + r + ' renown · ' + life.toLocaleString() + ' champions';
        }
    }

    function openEndgamePursuits() {
        var el = document.getElementById('janela-endgame-pursuits');
        if (!el) return;
        var body = document.getElementById('endgame-panel-body');
        if (body) body.innerHTML = buildPanelInnerHTML();
        if (typeof window.abrirModal === 'function') window.abrirModal('janela-endgame-pursuits', 1650);
        else el.style.display = 'flex';
        refreshEndgamePanelUI();
    }

    function closeEndgamePursuits() {
        if (typeof window.fecharModal === 'function') window.fecharModal('janela-endgame-pursuits');
    }

    window.EndgamePursuits = {
        SGRADE_LEVEL: SGRADE_LEVEL,
        WEEKLY_CHAMP_TARGET: WEEKLY_CHAMP_TARGET,
        onChampionKill: onChampionKill,
        normalizeAfterLoad: normalizeAfterLoad,
        claimWeeklyEliteHunt: claimWeeklyEliteHunt,
        openEndgamePursuits: openEndgamePursuits,
        closeEndgamePursuits: closeEndgamePursuits,
        refreshEndgamePanelUI: refreshEndgamePanelUI,
        refreshPublicAscensionHUD: refreshPublicAscensionHUD,
        getRenown: getRenown,
        getRenownTitle: getRenownTitlePublic,
        getAscensionTitleForRenown: getAscensionTitleForRenown,
        getIsoWeekKey: getIsoWeekKey
    };
})();
