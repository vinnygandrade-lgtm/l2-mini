/**
 * OLYMPIAD_ENGINE — Novo Sistema de PvP Semi-Online
 * Migrado: js/olympiad_engine.js — Fase 4: tipos explícitos.
 *
 * - Para oponente HUMANO na nuvem, os números do VERSUS PREVIEW e do combate vêm de
 *   fetchOlympiadCharacterRow + applyRealPlayerStatsFromCloudRow → calcularStatusGlobaisFromData
 *   (mesma verdade que inspeção de perfil). Bots: só gerarBotCompleto.
 * - Ver GDD §7 — Inspeção cloud (bullet Olimpíada) e §11.5 checklist item 10.
 */

import type {
  BotRankingSeed,
  ItemCatalogBase,
  OlympiadClaimRpcResult,
  OlympiadEngineApi,
  OlympiadHistoryRow,
  OlympiadRankInfo,
  OlympiadRival,
  SupabaseQueryBuilder,
} from '../types/game';
import { registerGlobal } from '../runtime/register-global';

function olyImg(id: string): HTMLImageElement | null {
    const el = document.getElementById(id);
    return el instanceof HTMLImageElement ? el : null;
}

function olyRankingBot(nome: string): BotRankingSeed | null {
    if (!Array.isArray(window.dbBotsRanking)) return null;
    const hit = window.dbBotsRanking.find((b) => {
        const row = b as BotRankingSeed;
        return (row.nome || row.farmBot1) === nome;
    });
    return hit ? (hit as BotRankingSeed) : null;
}

function olyCharactersTable(client: NonNullable<typeof window.SupabaseAPI>['client']) {
    return client!.from('characters') as SupabaseQueryBuilder;
}

function catalogItemId(item: { base?: ItemCatalogBase; id?: string } | null | undefined): string {
    if (!item) return '';
    const base = (item.base ?? item) as ItemCatalogBase & { id?: string };
    return base.id != null ? String(base.id) : '';
}

function catalogItemImg(item: { base?: ItemCatalogBase; id?: string } | null | undefined): string {
    if (!item) return '';
    const base = (item.base ?? item) as ItemCatalogBase & { id?: string; img?: string };
    if (base.img && String(base.img).trim()) return String(base.img).trim();
    return base.id ? `assets/equips/${base.id}.png` : '';
}

const OlympiadEngine = {
    ativo: false,
    inimigo: null as OlympiadRival | null,
    danoCausado: 0,
    danoRecebido: 0,
    loopInimigo: null,
    /**
     * Arena: só afeta quanto de HP/CP sai por golpe ou skill (atkSpd, CDs e rotação do bot inalterados).
     * Valores mais baixos = duelos mais longos. Pisos são fração do atk antes de multDano* (evita hits irrelevantes).
     */
    multDanoPlayer: 0.26,
    multDanoRival: 0.26,
    /** Piso dano auto jogador: fração de atk (antes de multDanoPlayer). */
    olyFloorPlayerAuto: 0.045,
    /** Piso dano skill jogador (antes de multDanoPlayer). */
    olyFloorPlayerSkill: 0.06,
    /** Piso dano rival (auto + skill): fração de pAtk/mAtk de referência (antes de multDanoRival). */
    olyFloorRival: 0.045,
    historicoBatalhas: [] as OlympiadHistoryRow[],
    abaAtiva: 'battle',
    olyBasicAttackLockUntil: 0,
    rewardsClaimed: [], // Lista de IDs de patentes já resgatadas
    _claimingReward: false,
    _previewLoading: false,
    _previewOpponent: null as { nome: string; isBot: boolean } | null,
    /** UUID de linha `olympiad_matches` (nuvem); obrigatório para persistir MMR em PvP real */
    olyMatchId: null,
    /** Debuffs do rival no jogador (Hamstring, etc.) — multiplicador de P.Atk do atacante */
    olyPlayerPAtkMult: 1,
    olyPlayerDebuffUntil: 0,

    /** Fim da fase de abertura agressiva do rival (evita buff def/spd antes de trocar dano). */
    olyRivalOpenAggroUntil: 0,
    /** Timeouts do burst inicial do rival (limpar em finalizarDuelo). */
    _olyRivalBurstTimers: null,

    viewedRankIndex: -1, // Índice da patente que o jogador está visualizando no card
    allRanks: [
        "Paper 5", "Paper 4", "Paper 3", "Paper 2", "Paper 1",
        "Wood 5", "Wood 4", "Wood 3", "Wood 2", "Wood 1",
        "Copper 5", "Copper 4", "Copper 3", "Copper 2", "Copper 1",
        "Silver 5", "Silver 4", "Silver 3", "Silver 2", "Silver 1",
        "Gold 5", "Gold 4", "Gold 3", "Gold 2", "Gold 1",
        "Platinum 5", "Platinum 4", "Platinum 3", "Platinum 2", "Platinum 1",
        "Diamond 5", "Diamond 4", "Diamond 3", "Diamond 2", "Diamond 1",
        "Legendary 5", "Legendary 4", "Legendary 3", "Legendary 2", "Legendary 1",
        "Mythic"
    ],

    // --- RECOMPENSAS POR PATENTE (RANK-UP) ---
    // Ajustadas para serem equilibradas com os prêmios de fim de temporada
    rankRewards: {
        "Paper 5": { adena: 5000, items: [{id: "HP Potion", qtd: 5}] },
        "Paper 4": { adena: 7500, items: [{id: "HP Potion", qtd: 10}] },
        "Paper 3": { adena: 10000, items: [{id: "HP Potion", qtd: 15}] },
        "Paper 2": { adena: 12500, items: [{id: "Mana Potion", qtd: 5}] },
        "Paper 1": { adena: 15000, items: [{id: "Ancient Coin", qtd: 2}] },
        
        "Wood 5": { adena: 20000, items: [{id: "Ancient Coin", qtd: 5}] },
        "Wood 4": { adena: 25000, items: [{id: "Ancient Coin", qtd: 8}] },
        "Wood 3": { adena: 30000, items: [{id: "Ancient Coin", qtd: 10}] },
        "Wood 2": { adena: 35000, items: [{id: "Mana Potion", qtd: 10}] },
        "Wood 1": { adena: 40000, items: [{id: "Ancient Coin", qtd: 15}] },
        
        "Copper 5": { adena: 50000, items: [{id: "Ancient Coin", qtd: 20}] },
        "Copper 4": { adena: 60000, items: [{id: "Ancient Coin", qtd: 25}] },
        "Copper 3": { adena: 70000, items: [{id: "Life Stone", qtd: 1}] },
        "Copper 2": { adena: 80000, items: [{id: "Ancient Coin", qtd: 35}] },
        "Copper 1": { adena: 100000, items: [{id: "Ancient Coin", qtd: 50}] },
        
        "Silver 5": { adena: 150000, items: [{id: "Ancient Coin", qtd: 60}] },
        "Silver 4": { adena: 200000, items: [{id: "Ancient Coin", qtd: 75}] },
        "Silver 3": { adena: 250000, items: [{id: "Life Stone", qtd: 2}] },
        "Silver 2": { adena: 300000, items: [{id: "Ancient Coin", qtd: 100}] },
        "Silver 1": { adena: 400000, items: [{id: "Ancient Coin", qtd: 125}] },
        
        "Gold 5": { adena: 500000, items: [{id: "Ancient Coin", qtd: 150}] },
        "Gold 4": { adena: 600000, items: [{id: "Ancient Coin", qtd: 175}] },
        "Gold 3": { adena: 700000, items: [{id: "Life Stone", qtd: 3}] },
        "Gold 2": { adena: 800000, items: [{id: "Ancient Coin", qtd: 200}] },
        "Gold 1": { adena: 1000000, items: [{id: "Ancient Coin", qtd: 250}] },
        
        "Platinum 5": { adena: 1500000, items: [{id: "Ancient Coin", qtd: 300}] },
        "Platinum 4": { adena: 2000000, items: [{id: "Life Stone", qtd: 5}] },
        "Platinum 3": { adena: 2500000, items: [{id: "Enchant Weapon (A)", qtd: 1}] },
        "Platinum 2": { adena: 3000000, items: [{id: "Ancient Coin", qtd: 400}] },
        "Platinum 1": { adena: 4000000, items: [{id: "Ancient Coin", qtd: 500}] },
        
        "Diamond 5": { adena: 5000000, items: [{id: "Ancient Coin", qtd: 600}] },
        "Diamond 4": { adena: 6500000, items: [{id: "Life Stone", qtd: 10}] },
        "Diamond 3": { adena: 8000000, items: [{id: "Enchant Weapon (S)", qtd: 1}] },
        "Diamond 2": { adena: 10000000, items: [{id: "Ancient Coin", qtd: 800}] },
        "Diamond 1": { adena: 15000000, items: [{id: "Ancient Coin", qtd: 1000}] },
        
        "Legendary 5": { adena: 20000000, items: [{id: "Ancient Coin", qtd: 1200}] },
        "Legendary 4": { adena: 25000000, items: [{id: "Life Stone", qtd: 15}] },
        "Legendary 3": { adena: 30000000, items: [{id: "Enchant Armor (S)", qtd: 1}] },
        "Legendary 2": { adena: 40000000, items: [{id: "Ancient Coin", qtd: 1500}] },
        "Legendary 1": { adena: 50000000, items: [{id: "Ancient Coin", qtd: 2000}] },
        
        "Mythic": { adena: 100000000, items: [{id: "Ancient Coin", qtd: 5000}, {id: "Enchant Weapon (S)", qtd: 2}, {id: "Life Stone", qtd: 30}] }
    },

    // --- INICIALIZAÇÃO ---

    init() {
        this.carregarHistorico();
        this.carregarRecompensasResgatadas();
        console.log("⚔️ [Olympiad] Motor Semi-Online inicializado.");
    },

    /** Mapeia códigos `error` devolvidos pelas RPCs da Olympiad (EN/pt-BR em locales_bundle). */
    olyMatchRpcMessage(code) {
        const c = String(code || '').trim();
        if (!c) return '';
        const safe = c.replace(/[^a-z0-9_]/gi, '');
        if (!safe) return '';
        if (typeof window.t !== 'function') return '';
        const keys = [`game.olympiad.error_${safe}`, `olympiad.error_${safe}`];
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i]!;
            const msg = window.t(k);
            if (msg !== k) return msg;
        }
        if (typeof window.cloudRpcMessage === 'function') {
            return window.cloudRpcMessage(c, { prefix: 'olympiad', fallbackKey: 'olympiad.rewardClaimFailed' });
        }
        return '';
    },

    olyT(key, params) {
        return typeof window.t === 'function' ? window.t(key, params) : key;
    },

    olyPruneRivalEffects(agora) {
        if (!this.inimigo || !Array.isArray(this.inimigo.olyEffects)) return;
        this.inimigo.olyEffects = this.inimigo.olyEffects.filter((e) => e.until > agora);
    },

    olyPrunePlayerDebuff(agora) {
        if (!this.olyPlayerDebuffUntil || agora >= this.olyPlayerDebuffUntil) {
            this.olyPlayerPAtkMult = 1;
            this.olyPlayerDebuffUntil = 0;
        }
    },

    getRivalAtkForSkill(_skill) {
        if (!this.inimigo) return 0;
        const agora = Date.now();
        this.olyPruneRivalEffects(agora);
        let pm = 1;
        let mm = 1;
        let spd = 1;
        (this.inimigo.olyEffects || []).forEach((e) => {
            if (e.until <= agora) return;
            if (e.kind === 'pAtk') pm *= e.mult;
            if (e.kind === 'mAtk') mm *= e.mult;
            if (e.kind === 'spdDmg') spd *= e.mult;
        });
        const usoMagic = this.inimigo.isMage;
        const base = usoMagic ? this.inimigo.mAtk * mm : this.inimigo.pAtk * pm;
        return Math.max(1, Math.floor(base * spd));
    },

    getRivalDefVsPlayer(isMagicHit) {
        if (!this.inimigo) return 1;
        const agora = Date.now();
        this.olyPruneRivalEffects(agora);
        let pd = 1;
        let md = 1;
        (this.inimigo.olyEffects || []).forEach((e) => {
            if (e.until <= agora) return;
            if (e.kind === 'pDef') pd *= e.mult;
            if (e.kind === 'mDef') md *= e.mult;
        });
        const base = isMagicHit ? this.inimigo.mDef : this.inimigo.pDef;
        return Math.max(1, Math.floor(base * (isMagicHit ? md : pd)));
    },

    carregarRecompensasResgatadas() {
        if (!window.charName) return;
        
        // Prioridade para o que já está na memória (carregado pelo core_persistence)
        if (this.rewardsClaimed && this.rewardsClaimed.length > 0) return;

        const key = 'l2mini_oly_rewards_' + window.charName.toLowerCase();
        const saved = localStorage.getItem(key);
        if (saved) {
            this.rewardsClaimed = JSON.parse(saved);
        }
    },

    salvarRecompensasResgatadas() {
        if (!window.charName) return;
        const key = 'l2mini_oly_rewards_' + window.charName.toLowerCase();
        localStorage.setItem(key, JSON.stringify(this.rewardsClaimed));
    },

    navegarRank(direcao) {
        const currentRank = this.getRank(window.olympiadPoints || 0);
        
        // Se for a primeira vez navegando, começa pelo rank atual
        if (this.viewedRankIndex === -1) {
            this.viewedRankIndex = this.allRanks.indexOf(currentRank.nomeCompleto);
            if (this.viewedRankIndex === -1) this.viewedRankIndex = 0;
        }

        this.viewedRankIndex += direcao;

        // Travas de limites
        if (this.viewedRankIndex < 0) this.viewedRankIndex = 0;
        if (this.viewedRankIndex >= this.allRanks.length) this.viewedRankIndex = this.allRanks.length - 1;

        if (typeof window.renderizarSocial === 'function') window.renderizarSocial();
    },

    abrirModalRecompensas() {
        const modal = document.getElementById('modal-oly-rewards');
        const container = document.getElementById('oly-rewards-list-container');
        if (!modal || !container) return;

        container.innerHTML = '';
        modal.style.display = 'flex';

        const currentRank = this.getRank(window.olympiadPoints || 0);
        const tiers = ["Paper", "Wood", "Copper", "Silver", "Gold", "Platinum", "Diamond", "Legendary", "Mythic"];
        
        // Mapeia ordem de importância para saber se já passou da patente
        const tierOrder = {};
        tiers.forEach((t, i) => tierOrder[t] = i);

        // Gera lista de todas as patentes com recompensas
        Object.keys(this.rankRewards).forEach(rankId => {
            const reward = this.rankRewards[rankId];
            const isClaimed = this.rewardsClaimed.includes(rankId);
            
            // Lógica para saber se alcançou
            const parts = rankId.split(' ');
            const rTier = parts[0];
            const rDiv = parts[1] ? parseInt(parts[1]) : 1;
            
            let alcancou = false;
            if (tierOrder[currentRank.tier] > tierOrder[rTier]) {
                alcancou = true;
            } else if (currentRank.tier === rTier) {
                if (currentRank.divisao <= rDiv) alcancou = true;
            }

            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(0,0,0,0.4);
                border: 1px solid ${alcancou ? '#7e22ce' : '#333'};
                border-radius: 8px;
                padding: 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                opacity: ${alcancou ? '1' : '0.6'};
                position: relative;
                overflow: hidden;
            `;

            if (alcancou && !isClaimed) {
                card.style.boxShadow = "0 0 10px rgba(126,34,206,0.3)";
                card.style.background = "linear-gradient(90deg, rgba(126,34,206,0.1), transparent)";
            }

            let rewardHtml = `<div style="display:flex; flex-direction:column; gap:2px;">`;
            rewardHtml += `<div style="color:#facc15; font-size:0.85em; font-weight:bold;">${reward.adena.toLocaleString()} Adena</div>`;
            reward.items.forEach(it => {
                rewardHtml += `<div style="color:#a78bfa; font-size:0.75em;">${it.qtd}x ${it.id}</div>`;
            });
            rewardHtml += `</div>`;

            let btnHtml = '';
            if (isClaimed) {
                btnHtml = `<span style="color:#22c55e; font-size:0.75em; font-weight:bold;">CLAIMED ✓</span>`;
            } else if (alcancou) {
                btnHtml = `<button class="btn-l2 btn-claim-reward" style="padding:5px 15px; font-size:0.75em; color:#fff;" onclick="OlympiadEngine.recolherPremio('${rankId}')">CLAIM</button>`;
            } else {
                btnHtml = `<span style="color:#666; font-size:0.75em; font-weight:bold;">LOCKED</span>`;
            }

            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="font-size:1.5em;">${this.getIconForTier(rTier)}</div>
                    <div style="display:flex; flex-direction:column;">
                        <span style="color:#fff; font-weight:bold; font-size:0.9em;">${rankId}</span>
                        ${rewardHtml}
                    </div>
                </div>
                <div>${btnHtml}</div>
            `;

            container.appendChild(card);
        });
    },

    getIconForTier(tier) {
        switch(tier) {
            case "Unranked": return "🥚";
            case "Paper": return "📄";
            case "Wood": return "🪵";
            case "Copper": return "🥉";
            case "Silver": return "🥈";
            case "Gold": return "🥇";
            case "Platinum": return "💎";
            case "Diamond": return "💠";
            case "Legendary": return "👹";
            case "Mythic": return "👑";
            default: return "🏆";
        }
    },

    abrirModalTiers() {
        const modal = document.getElementById('modal-oly-tiers');
        const container = document.getElementById('oly-tiers-list-container');
        if (!modal || !container) return;

        container.innerHTML = '';
        modal.style.display = 'flex';

        const tiers = [
            {nome: "Paper", req: 0, color: "#e5e7eb"},
            {nome: "Wood", req: 1000, color: "#b45309"},
            {nome: "Copper", req: 2500, color: "#d97706"},
            {nome: "Silver", req: 4500, color: "#9ca3af"},
            {nome: "Gold", req: 7000, color: "#facc15"},
            {nome: "Platinum", req: 10000, color: "#38bdf8"},
            {nome: "Diamond", req: 13500, color: "#818cf8"},
            {nome: "Legendary", req: 17500, color: "#f43f5e"},
            {nome: "Mythic", req: 22500, color: "#a855f7"}
        ];

        tiers.forEach(t => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(0,0,0,0.3);
                border-left: 4px solid ${t.color};
                padding: 10px 15px;
                border-radius: 4px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.4em;">${this.getIconForTier(t.nome)}</span>
                    <span style="color:#fff; font-weight:bold; font-family:'Cinzel';">${t.nome}</span>
                </div>
                <div style="text-align:right;">
                    <div style="color:${t.color}; font-weight:bold; font-size:0.9em;">${t.req}+ MMR</div>
                    <div style="color:#666; font-size:0.65em;">5 Divisions</div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    fecharModais() {
        document.getElementById('modal-oly-rewards').style.display = 'none';
        document.getElementById('modal-oly-tiers').style.display = 'none';
        this.fecharOlyPreview();
    },

    fecharOlyPreview() {
        if (typeof window.fecharModal === 'function') window.fecharModal('janela-oly-preview');
        this._previewOpponent = null;
    },

    _renderOlyPreviewLoading() {
        const root = document.getElementById('oly-preview-root');
        if (!root) return;
        root.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:#a78bfa;">
                <div style="font-size:2em; margin-bottom:12px; animation: pulse 1.2s infinite;">⚔️</div>
                <div style="font-size:0.85em; letter-spacing:1px;">${this.olyT('olympiad.previewLoading')}</div>
            </div>`;
    },

    _renderOlyPreviewContent(bot: OlympiadRival, isBot: boolean, pStats: Record<string, number>) {
        const root = document.getElementById('oly-preview-root');
        if (!root) return;

        const getCompColor = (val1: number, val2: number, inverse = false) => {
            if (!val1 || !val2 || val1 === val2) return '#aaa';
            const isBetter = inverse ? val1 < val2 : val1 > val2;
            return isBetter ? '#22c55e' : '#ef4444';
        };

        const renderStatRow = (label: string, pVal: number, bVal: number, icon: string, color: string) => `
            <div style="display:grid; grid-template-columns: 1fr 40px 1fr; align-items:center; gap:10px; margin-bottom:12px; background:rgba(255,255,255,0.02); padding:8px; border-radius:4px; border:1px solid rgba(255,255,255,0.05);">
                <div style="text-align:right;">
                    <div style="font-size:0.6em; color:#666; text-transform:uppercase;">${this.olyT('olympiad.previewYou')}</div>
                    <div style="font-size:0.9em; font-weight:bold; color:${getCompColor(pVal, bVal)};">${Math.floor(pVal || 0)}</div>
                </div>
                <div style="text-align:center; display:flex; flex-direction:column; align-items:center;">
                    <div style="font-size:0.6em; color:${color}; font-weight:bold; margin-bottom:2px;">${label}</div>
                    <div style="font-size:12px; opacity:0.7;">${icon}</div>
                </div>
                <div style="text-align:left;">
                    <div style="font-size:0.6em; color:#666; text-transform:uppercase;">${this.olyT('olympiad.previewRival')}</div>
                    <div style="font-size:0.9em; font-weight:bold; color:${getCompColor(bVal, pVal)};">${Math.floor(bVal || 0)}</div>
                </div>
            </div>
        `;

        const cancelLabel = this.olyT('modal.cancel');
        const fightLabel = this.olyT('olympiad.previewFight');

        root.innerHTML = `
            <div style="padding:4px 0;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; position:relative;">
                    <div style="text-align:center; flex:1;">
                        <div style="width:64px; height:64px; border-radius:50%; background:#111; border:2px solid #22c55e; margin:0 auto 8px; overflow:hidden; box-shadow:0 0 15px rgba(34,197,94,0.3);">
                            <img src="${this.getCharImg(window.playerData?.raca, window.playerData?.visual?.isFem, window.isClasseMagica(window.charClass))}" style="width:150%; transform:translate(0, 5px);" alt="">
                        </div>
                        <div style="color:#22c55e; font-weight:bold; font-size:0.8em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${window.charName}</div>
                        <div style="color:#666; font-size:0.6em;">Lv.${typeof window.nivel === 'number' ? window.nivel : 1}</div>
                    </div>
                    <div style="font-family:'Cinzel'; color:#444; font-size:1.5em; font-weight:900; position:absolute; left:50%; transform:translateX(-50%); top:20px;">${this.olyT('olympiad.previewVs')}</div>
                    <div style="text-align:center; flex:1;">
                        <div style="width:64px; height:64px; border-radius:50%; background:#111; border:2px solid #ef4444; margin:0 auto 8px; overflow:hidden; box-shadow:0 0 15px rgba(239,68,68,0.3);">
                            <img src="${this.getCharImg(bot.raca, bot.visual?.isFem, bot.isMage)}" style="width:150%; transform:translate(0, 5px);" alt="">
                        </div>
                        <div style="color:#ef4444; font-weight:bold; font-size:0.8em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${bot.nome}</div>
                        <div style="color:#666; font-size:0.6em;">Lv.${bot.nivel}</div>
                    </div>
                </div>
                <div style="margin-bottom:20px;">
                    ${renderStatRow(this.olyT('olympiad.previewStatHp'), pStats.maxHp, bot.maxHp, '❤️', '#ef4444')}
                    ${renderStatRow(this.olyT('olympiad.previewStatPAtk'), pStats.pAtk, bot.pAtk, '⚔️', '#f87171')}
                    ${renderStatRow(this.olyT('olympiad.previewStatMAtk'), pStats.mAtk, bot.mAtk, '✨', '#60a5fa')}
                    ${renderStatRow(this.olyT('olympiad.previewStatPDef'), pStats.pDef, bot.pDef, '🛡️', '#94a3b8')}
                    ${renderStatRow(this.olyT('olympiad.previewStatMDef'), pStats.mDef, bot.mDef, '🔮', '#a78bfa')}
                    ${renderStatRow(this.olyT('olympiad.previewStatSpd'), pStats.atkSpeed, bot.atkSpd, '⚡', '#fbbf24')}
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <button type="button" class="btn-l2" style="background:#333; border-color:#555; height:40px;" onclick="OlympiadEngine.fecharOlyPreview()">${cancelLabel}</button>
                    <button type="button" class="btn-l2" style="background:linear-gradient(180deg, #7e22ce, #581c87); height:40px; font-weight:bold;" onclick="OlympiadEngine.confirmarDesafio()">${fightLabel}</button>
                </div>
            </div>`;

        this._previewOpponent = { nome: String(bot.nome), isBot };
    },

    async recolherPremio(rankId) {
        if (this.rewardsClaimed.includes(rankId)) return;
        if (this._claimingReward) return;
        
        const reward = this.rankRewards[rankId];
        if (!reward) return;

        // --- SEGURANÇA: MODO MULTIPLAYER (SUPABASE) ---
        if (window.SupabaseAPI && window.SUPABASE_CONFIG?.enabled && window.SupabaseAPI.getUser()) {
            this._claimingReward = true;
            try {
                if (window.mostrarAviso) window.mostrarAviso(this.olyT('olympiad.rewardClaimProcessing'));
                
                const result = await window.SupabaseAPI.client.rpc('claim_olympiad_reward', {
                    p_char_name: window.charName,
                    p_rank_id: rankId,
                    p_reward_adena: reward.adena,
                    p_reward_items: reward.items.map(it => ({ id: it.id, nome: it.id, qtd: it.qtd }))
                }) as { data: OlympiadClaimRpcResult | null; error: unknown };

                if (result && result.data && result.data.success) {
                    this.rewardsClaimed = result.data.claimed_list || [];
                    this.salvarRecompensasResgatadas();
                    
                    if (window.mostrarAviso) {
                        window.mostrarAviso(this.olyT('olympiad.rewardClaimSuccess', { rank: rankId }));
                    }
                    
                    if (typeof window.carregarMailbox === 'function') void window.carregarMailbox();
                } else {
                    const rawMsg = (result && result.data) ? result.data.message : '';
                    const mapped = rawMsg ? this.olyMatchRpcMessage(rawMsg) : '';
                    const fallback = this.olyT('olympiad.rewardClaimFailed');
                    if (window.mostrarAviso) window.mostrarAviso(mapped || fallback);
                }
            } catch (err) {
                console.error("❌ [Olympiad] Erro ao resgatar via RPC:", err);
                if (window.mostrarAviso) window.mostrarAviso(this.olyT('olympiad.rewardClaimConnectionFailed'));
            } finally {
                this._claimingReward = false;
            }
            
            this.abrirModalRecompensas();
            if (typeof window.renderizarSocial === 'function') window.renderizarSocial();
            return;
        }

        // --- MODO LOCAL (OFFLINE) ---
        // Adiciona à lista de resgatados
        this.rewardsClaimed.push(rankId);
        this.salvarRecompensasResgatadas();

        // Envia para o Mailbox usando o tipo 'system' que já suporta recompensas múltiplas
        if (typeof window.enviarMail === 'function') {
            const recompensas = [];
            
            // Adena
            if (reward.adena > 0) {
                recompensas.push({ id: "Adena", nome: "Adena", qtd: reward.adena });
            }
            
            // Itens
            reward.items.forEach(it => {
                recompensas.push({ id: it.id, nome: it.id, qtd: it.qtd });
            });
            
            const texto = `Congratulations! You have reached the rank of ${rankId} in the Grand Olympiad. Here are your rewards.`;
            
            await window.enviarMail!(
                window.charName,
                "Olympiad Manager",
                `Rank Reward: ${rankId}`,
                "system",
                { texto: texto, recompensas: recompensas }
            );

            if (window.mostrarAviso) window.mostrarAviso(`Reward for ${rankId} sent to Mailbox!`);
        }

        // Atualiza o modal e o card
        this.abrirModalRecompensas();
        if (typeof window.renderizarSocial === 'function') window.renderizarSocial();
        
        // Garante que o save global inclua a nova lista
        if (typeof window.salvarJogo === 'function') window.salvarJogo();
    },

    // --- NAVEGAÇÃO E UI ---

    mudarAbaLobby(aba) {
        this.abaAtiva = aba;
        
        // Atualiza botões
        document.querySelectorAll('.oly-tab-btn').forEach(btn => {
            const el = btn as HTMLElement;
            el.classList.remove('active');
            el.style.color = '#aaa';
            el.style.borderBottomColor = 'transparent';
        });
        
        const btnAtivo = document.getElementById(`btn-oly-tab-${aba}`);
        if (btnAtivo) {
            btnAtivo.classList.add('active');
            btnAtivo.style.color = '#fff';
            btnAtivo.style.borderBottomColor = '#7e22ce';
        }

        // Atualiza conteúdos
        document.querySelectorAll('.oly-tab-content').forEach(cont => {
            (cont as HTMLElement).style.display = 'none';
        });
        const contentEl = document.getElementById(`oly-content-${aba}`);
        if (contentEl) contentEl.style.display = 'block';

        // Controle de visibilidade da barra de atalhos no lobby
        const barraGlobal = document.getElementById('barra-de-atalhos-dinamica');
        if (barraGlobal) {
            // A barra NUNCA aparece no lobby (Battle, Ranking, Rewards, History)
            // Ela agora só aparecerá quando o duelo começar de fato (após o Fight)
            barraGlobal.style.setProperty('display', 'none', 'important');
        }

        if (aba === 'ranking') this.renderizarRankingGeral();
        if (aba === 'rewards') {
            if (typeof window.renderizarPremiosRanking === 'function') {
                window.renderizarPremiosRanking();
            }
        }
        if (aba === 'history') {
            this.carregarHistorico().then(() => this.renderizarHistorico());
        }
        if (aba === 'battle') this.carregarOponentes();
        if (aba === 'rules') this.renderizarRegras();
    },

    renderizarRegras() {
        const cont = document.getElementById('oly-rules-container');
        if (!cont) return;

        const t = (key) => (typeof window.t === 'function') ? window.t(key) : key;

        const regras = [
            { title: t('olympiad.rule1Title'), desc: t('olympiad.rule1Desc'), icon: '⚔️' },
            { title: t('olympiad.rule2Title'), desc: t('olympiad.rule2Desc'), icon: '📈' },
            { title: t('olympiad.rule3Title'), desc: t('olympiad.rule3Desc'), icon: '⚖️' },
            { title: t('olympiad.rule4Title'), desc: t('olympiad.rule4Desc'), icon: '🎁' },
            { title: t('olympiad.rule5Title'), desc: t('olympiad.rule5Desc'), icon: '🛡️' }
        ];

        cont.innerHTML = `
            <div style="text-align:center; margin-bottom:10px;">
                <h4 style="color:#d8b4fe; font-family:'Cinzel'; letter-spacing:1px; margin:0;">${t('olympiad.rulesTitle')}</h4>
            </div>
            ${regras.map(r => `
                <div style="background:rgba(20,15,30,0.6); border:1px solid #4c1d95; border-radius:8px; padding:12px; display:flex; gap:12px; align-items:start;">
                    <div style="font-size:1.5em; background:rgba(126,34,206,0.2); width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; flex-shrink:0;">${r.icon}</div>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <b style="color:#a78bfa; font-size:0.85em; text-transform:uppercase; letter-spacing:0.5px;">${r.title}</b>
                        <p style="color:#bbb; font-size:0.75em; margin:0; line-height:1.4;">${r.desc}</p>
                    </div>
                </div>
            `).join('')}
        `;
    },

    async renderizarRankingGeral() {
        // 1. Renderiza as Patentes (Tiers) do Jogador
        if (typeof window.renderizarSocial === 'function') window.renderizarSocial();
        
        // 2. Atualiza o ícone grande do Tier na Olympiada
        const rankData = this.getRank(window.olympiadPoints || 0);
        const iconEl = document.getElementById('oly-my-tier-icon');
        if (iconEl) {
            let icon = "🏆";
            switch(rankData.tier) {
                case "Unranked": icon = "🥚"; break;
                case "Paper": icon = "📄"; break;
                case "Wood": icon = "🪵"; break;
                case "Copper": icon = "🥉"; break;
                case "Silver": icon = "🥈"; break;
                case "Gold": icon = "🥇"; break;
                case "Platinum": icon = "💎"; break;
                case "Diamond": icon = "💠"; break;
                case "Legendary": icon = "👹"; break;
                case "Mythic": icon = "👑"; break;
            }
            iconEl.innerText = icon;
        }

        // 3. Renderiza a Lista Mundial
        const listCont = document.getElementById('oly-global-ranking-list');
        if (!listCont) return;

        listCont.innerHTML = '<div style="color:#aaa; text-align:center; padding:20px;">Loading world ladder...</div>';
        
        const ranking = await window.RankingManager.getMergedRanking();
        
        listCont.innerHTML = ranking.map((jog, index) => {
            const posicao = index + 1;
            const isHero = posicao === 1;
            let corPosicao = "#a1a1aa";
            let fundoPosicao = "#27272a";
            
            if (posicao === 1) { corPosicao = "#000"; fundoPosicao = "#facc15"; }
            else if (posicao === 2) { corPosicao = "#000"; fundoPosicao = "#9ca3af"; }
            else if (posicao === 3) { corPosicao = "#000"; fundoPosicao = "#b45309"; }

            const isLocal = (jog.nome === window.charName);
            const corNome = isLocal ? "#22c55e" : (jog.isRealPlayer ? "#60a5fa" : "#e2e8f0");
            const glow = isLocal ? "box-shadow: inset 0 0 10px rgba(34, 197, 94, 0.2); border: 1px solid #22c55e;" : "";
            const heroBadge = isHero ? `<span class="hero-badge-ranking">HERO</span>` : "";

            // Subtítulo de Ascensão (se houver)
            let ascSub = '';
            if (!jog.isBot && (jog.ascensionTitle || typeof jog.renown === 'number')) {
                const ren = typeof jog.renown === 'number' ? jog.renown : 0;
                ascSub = `<div style="color:#a78bfa; font-size:0.65em; margin-top:2px;">${jog.ascensionTitle || ''} • Renown ${ren}</div>`;
            }

            // Tier visual no ranking
            const mmr = Number(jog.olympiadPoints) || 0;
            const jogRank = this.getRank(mmr);
            let iconeTier = "📄";
            switch(jogRank.tier) {
                case "Unranked": iconeTier = "🥚"; break;
                case "Paper": iconeTier = "📄"; break;
                case "Wood": iconeTier = "🪵"; break;
                case "Copper": iconeTier = "🥉"; break;
                case "Silver": iconeTier = "🥈"; break;
                case "Gold": iconeTier = "🥇"; break;
                case "Platinum": iconeTier = "💎"; break;
                case "Diamond": iconeTier = "💠"; break;
                case "Legendary": iconeTier = "👹"; break;
                case "Mythic": iconeTier = "👑"; break;
            }

            return `
                <div style="display: flex; align-items: center; justify-content: space-between; background: #18181b; padding: 8px 10px; border-radius: 6px; margin-bottom: 4px; cursor: pointer; transition: background 0.2s; ${glow}" onclick="OlympiadEngine.inspecionarRanking('${jog.nome}', ${!!jog.isBot})" onmouseover="this.style.background='#27272a'" onmouseout="this.style.background='#18181b'">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 24px; height: 24px; border-radius: 50%; background: ${fundoPosicao}; color: ${corPosicao}; display: flex; align-items: center; justify-content: center; font-size: 0.7em; font-weight: bold;">
                            ${posicao}
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            <div style="color: ${corNome}; font-weight: bold; font-size: 0.85em;">
                                ${jog.nome} <span style="font-size: 0.75em; color: #a1a1aa; font-weight: normal;">(Lv.${jog.nivel})</span>
                                ${heroBadge}
                            </div>
                            <div style="color: #71717a; font-size: 0.65em;">${jog.classe}</div>
                            ${ascSub}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #c084fc; font-weight: bold; font-size: 0.85em;">${mmr} MMR</div>
                        <div style="font-size: 0.7em; color: #a1a1aa; font-weight: bold; display: flex; align-items: center; justify-content: flex-end; gap: 3px;">
                            <span>${iconeTier}</span>
                            <span style="letter-spacing: 0.5px;">${jogRank.nomeCompleto.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    async verificarStatusHero() {
        const ranking = await window.RankingManager.getMergedRanking();
        if (!ranking || ranking.length === 0) return { playerIsHero: false, rivalIsHero: false };

        const hero = ranking[0];
        const playerIsHero = (window.charName === hero.nome);
        const rivalIsHero = (this.inimigo && this.inimigo.nome === hero.nome);

        return { playerIsHero, rivalIsHero };
    },

    /**
     * Busca linha `characters` (eq exato, depois ilike) para snapshot Olimpíada / preview.
     */
    async fetchOlympiadCharacterRow(nome) {
        if (!window.SupabaseAPI || !window.SupabaseAPI.client) {
            return { data: null, error: new Error('no_supabase') };
        }
        const keyEq = String(nome || '').trim();
        if (!keyEq) return { data: null, error: new Error('empty_name') };
        let res = await olyCharactersTable(window.SupabaseAPI.client)
            .select('*')
            .eq('char_name', keyEq)
            .maybeSingle();
        if (!res.error && !res.data) {
            res = await olyCharactersTable(window.SupabaseAPI.client)
                .select('*')
                .ilike('char_name', keyEq)
                .maybeSingle();
        }
        return res;
    },

    /** Monta o payload esperado por gerarBotSkills/barra a partir da linha Supabase. */
    buildBotDataFromCharacterRow(data) {
        if (!data) return null;
        var d = data.data;
        if (d && typeof d === 'string') {
            try { d = JSON.parse(d); } catch (e) { d = {}; }
        }
        if (!d || typeof d !== 'object') d = {};
        return {
            nome: data.char_name,
            classe: data.char_class,
            nivel: data.level,
            raca: d.charRace || d.raca,
            visual: d.visual,
            equipamentos: d.equipamentos,
            olympiadPoints: d.olympiadPoints || 0,
            barraAtalhos: d.barraAtalhos
        };
    },

    /**
     * Alinha HP/Atk/Def/M.Def/SPD do duelista ao motor real (equip do JSONB + nível/classe da tabela).
     * gerarBotCompleto só aproxima por grade/MMR quando não há snapshot de equip.
     */
    applyRealPlayerStatsFromCloudRow(bot, characterRow) {
        if (!bot || !characterRow || characterRow.data == null) return bot;
        if (typeof window.unwrapCloudCharacterJsonb !== 'function' || typeof window.calcularStatusGlobaisFromData !== 'function') {
            return bot;
        }
        var realData = window.unwrapCloudCharacterJsonb(characterRow.data);
        var saveForCalc = Object.assign({}, realData);
        saveForCalc.charClass = characterRow.char_class || realData.charClass || 'Fighter';
        saveForCalc.nivel = characterRow.level != null ? characterRow.level : (realData.nivel || 1);
        saveForCalc.charRace = realData.charRace || 'Human';
        if (realData.charGender) saveForCalc.charGender = realData.charGender;
        var st = window.calcularStatusGlobaisFromData(saveForCalc);
        if (!st || typeof st.pAtk !== 'number') return bot;
        bot.maxHp = Math.max(1, st.maxHp);
        bot.hp = bot.maxHp;
        bot.maxMp = Math.max(1, st.maxMp);
        bot.mp = bot.maxMp;
        bot.maxCp = Math.max(1, st.maxCp);
        bot.cp = bot.maxCp;
        bot.pAtk = Math.max(1, st.pAtk);
        bot.mAtk = Math.max(1, st.mAtk);
        bot.pDef = Math.max(1, st.pDef);
        bot.mDef = Math.max(1, st.mDef);
        if (typeof st.critRate === 'number') bot.critRate = st.critRate;
        bot.atkSpd = Math.max(250, st.atkSpeed || bot.atkSpd || 3800);
        if (!bot.cooldowns || typeof bot.cooldowns !== 'object') bot.cooldowns = {};
        return bot;
    },

    async inspecionarRanking(nome, isBot) {
        // Se for o próprio player, abre o perfil normal
        if (nome === window.charName) {
            window.irPara('perfil');
            return;
        }

        // 1. Busca os dados completos do oponente (Bot ou Player Real)
        let botData = null;
        let cloudRow = null;
        if (isBot) {
            const baseRanking = Array.isArray(window.dbBotsRanking) ? window.dbBotsRanking : [];
            botData = baseRanking.find(b => {
                const row = b as BotRankingSeed;
                return (row.nome || row.farmBot1) === nome;
            }) as Record<string, unknown> | null;
        } else {
            if (window.SupabaseAPI && window.SUPABASE_CONFIG?.enabled) {
                const { data, error } = await this.fetchOlympiadCharacterRow(nome);
                if (error || !data) return;
                cloudRow = data;
                botData = this.buildBotDataFromCharacterRow(data);
                botData.isCloudPlayerInspection = true;
                const rd = (typeof window.unwrapCloudCharacterJsonb === 'function')
                    ? (window.unwrapCloudCharacterJsonb(data.data) as Record<string, unknown>)
                    : {};
                const egBlock = rd.endgame as { renown?: number } | undefined;
                const egR = egBlock && typeof egBlock.renown === 'number' ? egBlock.renown : 0;
                botData.renown = egR;
                if (window.EndgamePursuits && typeof window.EndgamePursuits.getAscensionTitleForRenown === 'function') {
                    botData.ascensionTitle = window.EndgamePursuits.getAscensionTitleForRenown(egR);
                }
            }
        }

        if (!botData) return;

        // 2. Gera a instância completa para cálculo de status
        const bot = window.OlympiadBots.gerarBotCompleto(botData) as OlympiadRival;
        if (!isBot && cloudRow) this.applyRealPlayerStatsFromCloudRow(bot, cloudRow);
        
        // 3. Reutiliza a função global de abrir perfil, mas passando o objeto bot carregado
        window.botAtualVisualizado = bot;
        if (typeof window.abrirPerfilJogadorRanking === 'function') {
            window.abrirPerfilJogadorRanking(nome, isBot);
        }
    },

    abrirOlympiad() {
        if (typeof window.fecharTodosModaisBackdropStack === 'function') window.fecharTodosModaisBackdropStack();
        
        const oly = window.OlympiadEngine;
        if (oly) {
            const currentRank = oly.getRank(window.olympiadPoints || 0);
            oly.viewedRankIndex = oly.allRanks.indexOf(currentRank.nomeCompleto);
            if (oly.viewedRankIndex === -1) oly.viewedRankIndex = 0;
        }

        const telaOly = document.getElementById('tela-olympiad-arena');
        if (!telaOly) return;

        // Esconde outras telas
        document.querySelectorAll('.screen-content').forEach(s => {
            if (s instanceof HTMLElement) s.style.display = 'none';
        });
        telaOly.style.display = 'flex';

        // Garante que a barra de atalhos seja renderizada
        if (typeof window.renderizarBarraAtalhos === 'function') {
            window.renderizarBarraAtalhos();
        }

        this.renderizarLobby();
        this.mudarAbaLobby('battle');
        if (typeof window.atualizarRelogioSeason === 'function') window.atualizarRelogioSeason();
    },

    async renderizarLobby() {
        const lobby = document.getElementById('olympiad-lobby');
        if (!lobby) return;

        lobby.style.display = 'flex';
        this.renderizarHistorico();
        await this.carregarOponentes();
    },

    async carregarOponentes() {
        const listCont = document.getElementById('oly-challenge-list');
        if (!listCont) return;

        listCont.innerHTML = '<div style="color:#aaa; text-align:center; padding:10px;">Syncing live ranking...</div>';

        // Obtém o ranking atualizado
        const ranking = await window.RankingManager.getMergedRanking();
        const minhaPos = ranking.findIndex(p => p.nome === window.charName);
        
        // Queremos mostrar uma "janela" do ranking ao redor do player
        let oponentesExibidos = [];
        let startIdx = 0;
        let endIdx = ranking.length;

        if (minhaPos !== -1) {
            // Mostra uma janela maior (10 acima e 10 abaixo) para facilitar encontrar amigos/contas de teste
            startIdx = Math.max(0, minhaPos - 10);
            endIdx = Math.min(ranking.length, minhaPos + 11);
            oponentesExibidos = ranking.slice(startIdx, endIdx);
        } else {
            oponentesExibidos = ranking.slice(0, 20);
        }

        if (oponentesExibidos.length === 0) {
            listCont.innerHTML = '<div style="color:#666; text-align:center; padding:10px;">Ranking is empty.</div>';
            return;
        }

        // Criamos o HTML da lista
        let htmlLista = oponentesExibidos.map((op, idx) => {
            const indexReal = startIdx + idx;
            const posicao = indexReal + 1;
            const isLocal = (op.nome === window.charName);
            const isAbove = minhaPos === -1 || indexReal < minhaPos;
            
            let bgColor = "rgba(255,255,255,0.03)";
            let borderColor = "#333";
            let glow = "";
            
            if (isLocal) {
                bgColor = "rgba(34, 197, 94, 0.1)";
                borderColor = "#22c55e";
                glow = "box-shadow: inset 0 0 15px rgba(34, 197, 94, 0.2);";
            } else if (isAbove) {
                borderColor = "rgba(126, 34, 206, 0.4)";
            } else {
                borderColor = "rgba(239, 68, 68, 0.2)";
            }

            // Botão de desafio (Agora disponível para todos os oponentes próximos)
            let actionHtml = "";
            if (!isLocal) {
                let pontosBase = 15;
                let labelGanho = this.olyT('olympiad.potentialGain');
                let corGanho = "#22c55e";

                if (isAbove) {
                    // Oponentes acima: Ganho maior (15 a 35 pts)
                    pontosBase = 15 + (Math.max(0, (minhaPos - indexReal)) * 4);
                    pontosBase = Math.min(35, pontosBase);
                } else {
                    // Oponentes abaixo: Ganho reduzido (5 a 10 pts)
                    pontosBase = 10 - (Math.max(0, (indexReal - minhaPos)) * 1);
                    pontosBase = Math.max(5, pontosBase);
                    labelGanho = this.olyT('olympiad.reducedGain');
                    corGanho = "#facc15"; // Amarelo para indicar ganho menor
                }

                actionHtml = `
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                        <div style="text-align:right;">
                            <div style="color:${corGanho}; font-size:0.65em; font-weight:900;">+${pontosBase} PTS</div>
                            <div style="color:#666; font-size:0.55em;">${labelGanho}</div>
                        </div>
                        <button class="btn-l2" style="padding:4px 10px; font-size:0.7em; height:auto; background:linear-gradient(180deg, ${isAbove ? '#7e22ce, #581c87' : '#444, #222'}); border-color:${isAbove ? '#a78bfa' : '#666'};" onclick="OlympiadEngine.mostrarPreviewDesafio('${op.nome}', ${!!op.isBot})">${this.olyT('olympiad.challengeBtn')}</button>
                    </div>
                `;
            }

            return `
                <div style="background:${bgColor}; border:1px solid ${borderColor}; border-radius:6px; padding:10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; ${glow}">
                    <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="abrirPerfilJogadorRanking('${op.nome}', ${!!op.isBot})">
                        <div style="width:22px; height:22px; background:${isLocal ? '#22c55e' : '#111'}; color:${isLocal ? '#000' : '#666'}; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7em; font-weight:bold; border:1px solid ${isLocal ? '#22c55e' : '#444'};">
                            ${posicao}
                        </div>
                        <div style="display:flex; flex-direction:column;">
                            <div style="display:flex; align-items:center; gap:5px;">
                                <span style="color:${isLocal ? '#22c55e' : '#fff'}; font-weight:bold; font-size:0.85em;">${op.nome}</span>
                                <span style="color:#666; font-size:0.7em;">Lv.${op.nivel}</span>
                            </div>
                            <span style="color:#71717a; font-size:0.65em; text-transform:uppercase;">${op.classe || op.charClass} • ${op.olympiadPoints} MMR</span>
                        </div>
                    </div>
                    ${actionHtml}
                </div>
            `;
        }).join('');

        listCont.innerHTML = htmlLista;

        if (startIdx > 0) {
            listCont.insertAdjacentHTML('afterbegin', `<div style="text-align:center; color:#444; font-size:0.6em; margin-bottom:10px; letter-spacing:2px;">▲ TOP ${startIdx} PLAYERS ABOVE ▲</div>`);
        }
        if (endIdx < ranking.length) {
            listCont.insertAdjacentHTML('beforeend', `<div style="text-align:center; color:#444; font-size:0.6em; margin-top:10px; letter-spacing:2px;">▼ OTHERS CLIMBING BELOW ▼</div>`);
        }
    },

    async mostrarPreviewDesafio(nome, isBot) {
        if (this._previewLoading) return;
        this._previewLoading = true;

        const needsCloudFetch = !isBot && window.SupabaseAPI && window.SUPABASE_CONFIG?.enabled;
        if (needsCloudFetch) {
            this._renderOlyPreviewLoading();
            if (typeof window.abrirModal === 'function') window.abrirModal('janela-oly-preview');
        }

        let botData = null;
        let cloudRow = null;
        if (isBot) {
            const baseRanking = Array.isArray(window.dbBotsRanking) ? window.dbBotsRanking : [];
            botData = baseRanking.find(b => {
                const row = b as BotRankingSeed;
                return (row.nome || row.farmBot1) === nome;
            }) as Record<string, unknown> | null;
        } else if (needsCloudFetch) {
            try {
                const { data, error } = await this.fetchOlympiadCharacterRow(nome);
                if (error) throw error;
                if (!data) {
                    this.fecharOlyPreview();
                    window.l2Alert(this.olyT('olympiad.previewLoadFailed'));
                    this._previewLoading = false;
                    return;
                }
                cloudRow = data;
                botData = this.buildBotDataFromCharacterRow(data);
            } catch (err) {
                console.error("❌ [Olympiad] Erro ao buscar oponente real:", err);
                this.fecharOlyPreview();
                window.l2Alert(this.olyT('olympiad.previewLoadFailed'));
                this._previewLoading = false;
                return;
            }
        }

        if (!botData) {
            this.fecharOlyPreview();
            this._previewLoading = false;
            return;
        }

        if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
        const bot = window.OlympiadBots.gerarBotCompleto(botData) as OlympiadRival;
        if (!isBot && cloudRow) this.applyRealPlayerStatsFromCloudRow(bot, cloudRow);
        const pStats = window.playerStats as unknown as Record<string, number>;

        this._renderOlyPreviewContent(bot, isBot, pStats);
        if (!needsCloudFetch && typeof window.abrirModal === 'function') {
            window.abrirModal('janela-oly-preview');
        }
        this._previewLoading = false;
    },

    async confirmarDesafio() {
        const pending = this._previewOpponent;
        this.fecharOlyPreview();
        if (!pending?.nome) return;
        await this.desafiar(pending.nome, pending.isBot);
    },

    async desafiar(nome, isBot) {
        let botData = null;
        let cloudRow = null;
        
        // Garante que a barra de atalhos apareça apenas no momento do combate
        const barraGlobal = document.getElementById('barra-de-atalhos-dinamica');
        if (barraGlobal) {
            barraGlobal.style.setProperty('display', 'grid', 'important');
        }

        if (isBot) {
            const baseRanking = Array.isArray(window.dbBotsRanking) ? window.dbBotsRanking : [];
            botData = baseRanking.find(b => {
                const row = b as BotRankingSeed;
                return (row.nome || row.farmBot1) === nome;
            }) as Record<string, unknown> | null;
        } else {
            // Busca snapshot do player real no Supabase
            if (window.SupabaseAPI && window.SUPABASE_CONFIG?.enabled) {
                try {
                    const { data, error } = await this.fetchOlympiadCharacterRow(nome);
                    if (error) throw error;
                    if (!data) {
                        window.l2Alert(this.olyT('olympiad.previewLoadFailedCombat'));
                        return;
                    }
                    cloudRow = data;
                    botData = this.buildBotDataFromCharacterRow(data);
                } catch (err) {
                    console.error("❌ [Olympiad] Erro ao buscar oponente real para duelo:", err);
                    window.l2Alert(this.olyT('olympiad.previewLoadFailedCombat'));
                    return;
                }
            }
        }

        if (!botData) {
            window.l2Alert(this.olyT('olympiad.previewOpponentFailed'));
            return;
        }

        this.olyMatchId = null;
        const useCloudHuman =
            !isBot &&
            window.SupabaseAPI &&
            typeof window.SupabaseAPI.createOlympiadMatch === 'function' &&
            window.SUPABASE_CONFIG?.enabled;

        if (useCloudHuman) {
            const reg = await window.SupabaseAPI.createOlympiadMatch(window.charName, nome);
            if (!reg || !reg.success || !reg.match_id) {
                const mapped = this.olyMatchRpcMessage(reg && reg.error);
                const fallback =
                    typeof window.t === 'function' ? window.t('game.olympiad.matchRegisterFailed') : 'Could not register duel on the server.';
                if (typeof window.l2Alert === 'function') window.l2Alert(mapped || fallback);
                const barraGlobalHide = document.getElementById('barra-de-atalhos-dinamica');
                if (barraGlobalHide) barraGlobalHide.style.setProperty('display', 'none', 'important');
                return;
            }
            this.olyMatchId = reg.match_id;
        }

        // Gera o bot completo (skills/barra); stats de humano vêm do JSONB via applyRealPlayerStatsFromCloudRow
        this.inimigo = window.OlympiadBots.gerarBotCompleto(botData) as OlympiadRival;
        this.inimigo.isBot = isBot; // Preserva a flag de bot para a finalização
        this.inimigo.isRealPlayerSnapshot = !isBot;
        if (!isBot && cloudRow) this.applyRealPlayerStatsFromCloudRow(this.inimigo, cloudRow);
        
        this.iniciarDuelo();
    },

    // --- MOTOR DE COMBATE ---

    iniciarDuelo() {
        const lobby = document.getElementById('olympiad-lobby');
        if (lobby) lobby.style.display = 'none';

        this.ativo = false; // Começa inativo até o timer acabar
        this.danoCausado = 0;
        this.danoRecebido = 0;
        
        // Garante que os status globais estejam calculados
        if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();

        // Restaura status do player para o máximo calculado
        window.playerHP = window.playerStats.maxHp;
        window.playerMP = window.playerStats.maxMp;
        window.playerCP = window.playerStats.maxCp;

        this.setupVisualArena();
        this.renderizarUI();
        
        // Renderiza a barra de atalhos mas bloqueia cliques
        if (typeof window.renderizarBarraAtalhos === 'function') window.renderizarBarraAtalhos();

        // --- SISTEMA DE COUNTDOWN ---
        const overlay = document.getElementById('oly-countdown-overlay');
        const text = document.getElementById('oly-countdown-text');
        if (overlay && text) {
            overlay.style.display = 'flex';
            let count = 3;
            text.innerText = String(count);
            text.className = 'countdown-number';

            const timer = setInterval(() => {
                count--;
                if (count > 0) {
                    text.innerText = String(count);
                    // Força restart da animação
                    text.style.animation = 'none';
                    void text.offsetWidth;
                    text.style.animation = null;
                } else if (count === 0) {
                    text.innerText = (typeof window.t === 'function') ? window.t('pvp.fight') : 'FIGHT!';
                    text.className = 'fight-text';
                    text.style.animation = 'none';
                    void text.offsetWidth;
                    text.style.animation = null;
                } else {
                    clearInterval(timer);
                    overlay.style.display = 'none';
                    this.comecarCombateEfetivo();
                }
            }, 1000);
        } else {
            this.comecarCombateEfetivo();
        }
    },

    comecarCombateEfetivo() {
        this.ativo = true;
        this.olyBasicAttackLockUntil = 0;
        this.olyPlayerPAtkMult = 1;
        this.olyPlayerDebuffUntil = 0;
        if (this.inimigo) {
            this.inimigo.olyEffects = [];
            this.inimigo.cooldowns = {};
            if (typeof this.inimigo.maxMp === 'number' && this.inimigo.maxMp > 0) {
                this.inimigo.mp = this.inimigo.maxMp;
            }
        }
        this.escreverLog(`<span style="color:#facc15; font-weight:bold;">Duel started against ${this.inimigo.nome}!</span>`);
        // Janela em que o snapshot prioriza dano/debuff em vez de buff def/spd “lento”.
        this.olyRivalOpenAggroUntil = Date.now() + 14000;
        this.iniciarIA();
    },

    setupVisualArena() {
        const pBase = olyImg('oly-player-base');
        const rBase = olyImg('oly-rival-base');
        const pArmor = olyImg('oly-player-armor');
        const pWeapon = olyImg('oly-player-weapon');
        const rArmor = olyImg('oly-rival-armor');
        const rWeapon = olyImg('oly-rival-weapon');

        // --- LÓGICA DE HERO ---
        this.verificarStatusHero().then(status => {
            const pAura = document.getElementById('oly-player-hero-aura');
            const pGlow = document.getElementById('oly-player-hero-glow');
            const rAura = document.getElementById('oly-rival-hero-aura');
            const rGlow = document.getElementById('oly-rival-hero-glow');

            if (pAura) pAura.style.display = status.playerIsHero ? 'block' : 'none';
            if (pGlow) pGlow.style.display = status.playerIsHero ? 'block' : 'none';
            if (rAura) rAura.style.display = status.rivalIsHero ? 'block' : 'none';
            if (rGlow) rGlow.style.display = status.rivalIsHero ? 'block' : 'none';
        });
        
        if (pBase) pBase.src = this.getCharImg(window.charRace, window.charGender === "Female", window.isClasseMagica(window.charClass));
        if (rBase) rBase.src = this.getCharImg(this.inimigo.raca, !!(this.inimigo.visual as { isFem?: boolean } | undefined)?.isFem, this.inimigo.isMage);

        if (pArmor) {
            const aid = catalogItemId(window.armaduraEquipada);
            pArmor.src = aid ? `assets/equips/${aid}.png` : '';
            pArmor.style.display = aid ? 'block' : 'none';
        }
        if (pWeapon) {
            const wsrc = catalogItemImg(window.armaEquipadaBase);
            pWeapon.src = wsrc || '';
            pWeapon.style.display = wsrc ? 'block' : 'none';
        }

        if (rArmor) {
            rArmor.src = this.inimigo.visual?.armorId ? `assets/equips/${this.inimigo.visual.armorId}.png` : "";
            rArmor.style.display = this.inimigo.visual?.armorId ? 'block' : 'none';
        }
        if (rWeapon) {
            rWeapon.src = this.inimigo.visual?.weaponId ? `assets/equips/${this.inimigo.visual.weaponId}.png` : "";
            rWeapon.style.display = this.inimigo.visual?.weaponId ? 'block' : 'none';
        }

        const logCont = document.getElementById('olympiad-log');
        if (logCont) logCont.innerHTML = '';
    },

    getCharImg(raca, isFem, isMage) {
        let prefixo = "";
        if (raca === "Dark Elf") prefixo = "de_";
        else if (raca === "Elf") prefixo = "elf_";
        else if (raca === "Orc") prefixo = "orc_";
        else if (raca === "Dwarf") prefixo = "dwarf_";
        
        if (raca === "Human" && !isMage) return 'assets/chars/base_fighter.png';
        if (raca === "Human" && isMage && !isFem) return 'assets/chars/mago_m.png';

        let sulfixo = isFem ? "mulher" : "homem";
        return `assets/chars/${prefixo}${sulfixo}.png`;
    },

    iniciarIA() {
        if (this.loopInimigo) clearInterval(this.loopInimigo);
        if (Array.isArray(this._olyRivalBurstTimers)) {
            this._olyRivalBurstTimers.forEach((id) => clearTimeout(id));
        }
        this._olyRivalBurstTimers = [];
        // Um golpe/skill por intervalo = atkSpd do snapshot (espelha o jogador).
        const refSpd = Math.max(300, Math.min(8000, Number(this.inimigo.atkSpd) || 3800));
        this._olyRivalTickMs = refSpd;
        const tick = () => {
            if (!this.ativo || playerHP <= 0 || !this.inimigo || this.inimigo.hp <= 0) return;
            this.executarTurnoBot();
        };
        // setInterval só dispara depois do 1º refSpd — sem isto o jogador ganha um turno “de graça”.
        tick();
        // Segunda ação rápida no começo (rotação parecida com quem spam skills no FIGHT).
        const burstDelay = Math.max(220, Math.min(520, Math.floor(refSpd * 0.15)));
        this._olyRivalBurstTimers.push(
            setTimeout(() => {
                if (!this.ativo || playerHP <= 0 || !this.inimigo || this.inimigo.hp <= 0) return;
                tick();
            }, burstDelay)
        );
        this.loopInimigo = setInterval(tick, refSpd);
    },

    executarTurnoBot() {
        const agora = Date.now();
        this.olyPrunePlayerDebuff(agora);
        this.olyPruneRivalEffects(agora);
        if (!this.inimigo) return;
        if (!this.inimigo.cooldowns || typeof this.inimigo.cooldowns !== 'object') this.inimigo.cooldowns = {};

        if (typeof this.inimigo.maxMp === 'number' && this.inimigo.maxMp > 0) {
            const tickMs = Math.max(1, Number(this._olyRivalTickMs) || 1000);
            const mpGain = Math.max(1, Math.floor(this.inimigo.maxMp * 0.05 * (tickMs / 1000)));
            this.inimigo.mp = Math.min(this.inimigo.maxMp, (this.inimigo.mp || 0) + mpGain);
        }

        const skillKey = (s) => (s ? String(s.idNome || s.nome || '').trim() : '');

        let skillUsada = null;
        const mpOf = (s) => (typeof s.mp === 'number' ? s.mp : 0);
        const tiposOfensivos = {
            ataque: true,
            ataque_area: true,
            ataque_ultimate: true,
            ataque_cura: true,
            ataque_dreno: true
        };

        if (this.inimigo.skills && this.inimigo.skills.length > 0) {
            const skillsProntas = this.inimigo.skills.filter((s) => {
                const k = skillKey(s);
                if (!k) return false;
                return (
                    (!this.inimigo.cooldowns[k] || this.inimigo.cooldowns[k] <= agora) &&
                    mpOf(s) <= (this.inimigo.mp || 0)
                );
            });
            let usaveis = skillsProntas.filter((s) => s.tipo !== 'utilidade' && s.tipo !== 'pet');
            if (usaveis.length > 0) {
                const openUntil = Number(this.olyRivalOpenAggroUntil) || 0;
                if (openUntil > agora) {
                    const semBuffTurtle = usaveis.filter(
                        (s) => s.tipo !== 'buff_def' && s.tipo !== 'buff_spd'
                    );
                    if (semBuffTurtle.length > 0) usaveis = semBuffTurtle;
                }
                const skillsCura = usaveis.filter((s) => s.tipo === 'cura');
                const offensivas = usaveis.filter((s) => tiposOfensivos[s.tipo]);
                const debuffs = usaveis.filter((s) => s.tipo === 'debuff');
                const buffAtk = usaveis.filter((s) => s.tipo === 'buff_atk');
                const buffDef = usaveis.filter((s) => s.tipo === 'buff_def');
                const buffSpd = usaveis.filter((s) => s.tipo === 'buff_spd');

                const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

                // Agressivo: prioriza sempre skills de dano com CD/MP ok; depois setup.
                if (this.inimigo.hp < this.inimigo.maxHp * 0.5 && skillsCura.length > 0) {
                    skillUsada = pickRandom(skillsCura);
                } else if (offensivas.length > 0) {
                    const sorted = offensivas.slice().sort(
                        (a, b) => (Number(b.poder) || 0) - (Number(a.poder) || 0)
                    );
                    skillUsada = sorted[0];
                } else if (debuffs.length > 0) {
                    skillUsada = pickRandom(debuffs);
                } else if (buffAtk.length > 0) {
                    skillUsada = pickRandom(buffAtk);
                } else if (buffSpd.length > 0) {
                    skillUsada = pickRandom(buffSpd);
                } else if (buffDef.length > 0) {
                    skillUsada = pickRandom(buffDef);
                } else if (skillsCura.length > 0) {
                    skillUsada = pickRandom(skillsCura);
                } else {
                    skillUsada = pickRandom(usaveis);
                }
            }
        }

        let dano = 0;
        let skillName = '';
        let strikePlus = false;
        const defAlvoFis = window.playerStats.pDef;
        const defAlvoMag = window.playerStats.mDef;
        const buffDur = (sk) =>
            Math.min(55000, Math.max(10000, typeof sk.cd === 'number' && sk.cd > 0 ? sk.cd : 30000));

        if (skillUsada) {
            const cdMs = typeof skillUsada.cd === 'number' && skillUsada.cd > 0 ? skillUsada.cd : 3000;
            const sKey = skillKey(skillUsada);
            if (!sKey) {
                skillUsada = null;
            } else {
                this.inimigo.cooldowns[sKey] = agora + cdMs;
                skillName = sKey;
                this.inimigo.mp = Math.max(0, (this.inimigo.mp || 0) - mpOf(skillUsada));

                if (skillUsada.tipo === 'cura') {
                    const cura = Math.floor(this.inimigo.maxHp * (skillUsada.poder || 0.3));
                    this.inimigo.hp = Math.min(this.inimigo.maxHp, this.inimigo.hp + cura);
                    this.escreverLog(
                        `<span style="color:#10b981;">[${skillName}] ${this.inimigo.nome} healed +${cura} HP.</span>`
                    );
                } else if (skillUsada.tipo === 'debuff') {
                    this.olyPlayerPAtkMult = Math.min(this.olyPlayerPAtkMult, 0.85);
                    this.olyPlayerDebuffUntil = Math.max(this.olyPlayerDebuffUntil, agora + 15000);
                    this.escreverLog(
                        `<span style="color:#a78bfa;">[${skillName}] ${this.inimigo.nome} weakens your offense!</span>`
                    );
                } else if (skillUsada.tipo === 'buff_atk') {
                    this.inimigo.olyEffects = this.inimigo.olyEffects || [];
                    const mult = Math.max(1.05, Math.min(2.2, skillUsada.poder || 1.2));
                    const until = agora + buffDur(skillUsada);
                    if (this.inimigo.isMage) {
                        this.inimigo.olyEffects.push({ kind: 'mAtk', mult, until });
                    } else {
                        this.inimigo.olyEffects.push({ kind: 'pAtk', mult, until });
                    }
                    this.escreverLog(
                        `<span style="color:#fbbf24;">[${skillName}] ${this.inimigo.nome} empowers their attack!</span>`
                    );
                } else if (skillUsada.tipo === 'buff_def') {
                    this.inimigo.olyEffects = this.inimigo.olyEffects || [];
                    const mult = Math.max(1.05, Math.min(2.2, skillUsada.poder || 1.3));
                    const until = agora + buffDur(skillUsada);
                    this.inimigo.olyEffects.push({ kind: 'pDef', mult, until });
                    this.inimigo.olyEffects.push({ kind: 'mDef', mult, until });
                    this.escreverLog(
                        `<span style="color:#94a3b8;">[${skillName}] ${this.inimigo.nome} hardens their defense!</span>`
                    );
                } else if (skillUsada.tipo === 'buff_spd') {
                    this.inimigo.olyEffects = this.inimigo.olyEffects || [];
                    const mult = Math.max(
                        1.08,
                        Math.min(1.35, typeof skillUsada.poder === 'number' ? skillUsada.poder : 1.15)
                    );
                    const until = agora + Math.min(25000, buffDur(skillUsada));
                    this.inimigo.olyEffects.push({ kind: 'spdDmg', mult, until });
                    this.escreverLog(
                        `<span style="color:#38bdf8;">[${skillName}] ${this.inimigo.nome} accelerates!</span>`
                    );
                } else {
                    const atkEff = this.getRivalAtkForSkill(skillUsada);
                    const defAlvo = this.inimigo.isMage ? defAlvoMag : defAlvoFis;
                    const skillPoder =
                        skillUsada.poder != null && skillUsada.poder > 0 ? skillUsada.poder : 1.4;

                    if (skillUsada.tipo === 'ataque_cura') {
                        dano = Math.floor(((atkEff * skillPoder) * 1100) / (350 + defAlvo));
                        const curaDreno = Math.floor(dano * 0.35);
                        this.inimigo.hp = Math.min(this.inimigo.maxHp, this.inimigo.hp + curaDreno);
                        if (curaDreno > 0) {
                            this.escreverLog(
                                `<span style="color:#c4b5fd;">[${skillName}] ${this.inimigo.nome} drains and recovers +${curaDreno} HP.</span>`
                            );
                        }
                    } else if (skillUsada.tipo === 'ataque_dreno') {
                        dano = Math.floor(((atkEff * skillPoder) * 1100) / (350 + defAlvo));
                        const curaDreno = Math.floor(dano * 0.35);
                        this.inimigo.hp = Math.min(this.inimigo.maxHp, this.inimigo.hp + curaDreno);
                        if (curaDreno > 0) {
                            this.escreverLog(
                                `<span style="color:#c4b5fd;">[${skillName}] ${this.inimigo.nome} drains +${curaDreno} HP.</span>`
                            );
                        }
                    } else if (
                        skillUsada.tipo === 'ataque' ||
                        skillUsada.tipo === 'ataque_area' ||
                        skillUsada.tipo === 'ataque_ultimate'
                    ) {
                        dano = Math.floor(((atkEff * skillPoder) * 1100) / (350 + defAlvo));
                    } else {
                        dano = Math.floor((atkEff * 1100) / (350 + defAlvo));
                    }
                }

                const utilSemDano =
                    skillUsada &&
                    (skillUsada.tipo === 'cura' ||
                        skillUsada.tipo === 'debuff' ||
                        skillUsada.tipo === 'buff_atk' ||
                        skillUsada.tipo === 'buff_def' ||
                        skillUsada.tipo === 'buff_spd');
                if (utilSemDano) {
                    const atkBase = this.getRivalAtkForSkill({});
                    const defAlvo = this.inimigo.isMage ? defAlvoMag : defAlvoFis;
                    dano = Math.floor((atkBase * 1100) / (350 + defAlvo));
                    strikePlus = true;
                }
            }
        }

        if (!skillUsada) {
            const atkBase = this.getRivalAtkForSkill({});
            const defAlvo = this.inimigo.isMage ? defAlvoMag : defAlvoFis;
            dano = Math.floor((atkBase * 1100) / (350 + defAlvo));
        }

        const refStat = this.inimigo.isMage ? this.inimigo.mAtk : this.inimigo.pAtk;
        const floorR = Math.max(0.02, Math.min(0.12, Number(this.olyFloorRival) || 0.045));
        dano = Math.max(Math.floor(refStat * floorR), Math.floor(dano));
        dano = Math.floor(dano * this.multDanoRival);

        if (window.playerCP > 0) {
            if (window.playerCP >= dano) window.playerCP -= dano;
            else {
                const sobra = dano - window.playerCP;
                window.playerCP = 0;
                window.playerHP -= sobra;
            }
        } else {
            window.playerHP -= dano;
        }

        this.danoRecebido += dano;
        let msg;
        if (strikePlus && skillName) {
            msg = `[${skillName}+] ${this.inimigo.nome} strikes for ${dano} damage.`;
        } else if (skillName) {
            msg = `[${skillName}] ${this.inimigo.nome} dealt ${dano} damage.`;
        } else {
            msg = `${this.inimigo.nome} dealt ${dano} damage.`;
        }
        this.escreverLog(`<span style="color:#fca5a5;">${msg}</span>`);

        this.mostrarDanoVisual(dano, 'rival', false);
        this.shakeScreen(false);

        if (window.playerHP <= 0) {
            window.playerHP = 0;
            this.finalizarDuelo(false);
        }

        this.renderizarUI();
        if (typeof window.atualizar === 'function') window.atualizar();
    },

    playerAtaca() {
        if (!this.ativo || !this.inimigo) return;
        const agora = Date.now();
        if (agora < (this.olyBasicAttackLockUntil || 0)) return;

        // Trava física anti-spam (debounce de segurança)
        if (this._lastAttackTime && agora - this._lastAttackTime < 200) return;
        this._lastAttackTime = agora;

        const isMage = window.isClasseMagica(window.charClass);
        this.olyPrunePlayerDebuff(agora);
        const atkRaw = isMage ? window.playerStats.mAtk : window.playerStats.pAtk;
        const atk = Math.max(1, Math.floor(atkRaw * (this.olyPlayerPAtkMult || 1)));
        const def = this.getRivalDefVsPlayer(isMage);
        
        let dano = Math.floor((atk * 1100) / (350 + def));
        const floorA = Math.max(0.02, Math.min(0.12, Number(this.olyFloorPlayerAuto) || 0.045));
        dano = Math.max(Math.floor(atk * floorA), dano);
        dano = Math.floor(dano * this.multDanoPlayer);

        if (this.inimigo.cp > 0) {
            if (this.inimigo.cp >= dano) this.inimigo.cp -= dano;
            else {
                const sobra = dano - this.inimigo.cp;
                this.inimigo.cp = 0;
                this.inimigo.hp -= sobra;
            }
        } else {
            this.inimigo.hp -= dano;
        }

        this.danoCausado += dano;
        this.escreverLog(`You dealt <span style="color:#fff;">${dano}</span> damage.`);

        // Feedback Visual de Dano
        const isCrit = Math.random() < 0.1; // Simulação de crítico visual
        this.mostrarDanoVisual(dano, 'player', isCrit);
        if (isCrit) this.shakeScreen(true);

        if (this.inimigo.hp <= 0) {
            this.inimigo.hp = 0;
            this.finalizarDuelo(true);
        }

        this.renderizarUI();
        if (typeof window.atualizar === 'function') window.atualizar();
        
        // Swing do Attack: não bloqueia skills; só o próximo Attack
        const tempoCD = Math.max(300, window.playerStats.atkSpeed || 3800);
        this.olyBasicAttackLockUntil = agora + tempoCD;
        if (typeof window.dispararAnimacaoCooldown === 'function') {
            window.dispararAnimacaoCooldown('Attack', tempoCD);
        }
    },

    playerUsaSkill(nomeSkill) {
        if (!this.ativo || !this.inimigo) return;
        const skill = window.bancoDeSkills?.[nomeSkill];
        if (!skill || window.playerMP < skill.mp) return;

        const agora = Date.now();
        if (window.cooldownsAtivos[nomeSkill] && window.cooldownsAtivos[nomeSkill] > agora) {
            return;
        }

        window.playerMP -= skill.mp;

        const skillCD = skill.cd || 1000;
        if (typeof window.dispararAnimacaoCooldown === 'function') {
            window.dispararAnimacaoCooldown(nomeSkill, skillCD);
        }
        
        if (skill.tipo === "cura") {
            const cura = Math.floor(window.playerStats.maxHp * (skill.poder || 0.3));
            window.playerHP = Math.min(window.playerStats.maxHp, window.playerHP + cura);
            this.escreverLog(`<span style="color:#10b981;">[${nomeSkill}] Healed +${cura} HP.</span>`);
        } else {
            const isMage = window.isClasseMagica(window.charClass);
            this.olyPrunePlayerDebuff(Date.now());
            const atkRaw = isMage ? window.playerStats.mAtk : window.playerStats.pAtk;
            const atk = Math.max(1, Math.floor(atkRaw * (this.olyPlayerPAtkMult || 1)));
            const def = this.getRivalDefVsPlayer(isMage);
            
            let dano = Math.floor(((atk * (skill.poder || 1.5)) * 1100) / (350 + def));
            const floorS = Math.max(0.025, Math.min(0.15, Number(this.olyFloorPlayerSkill) || 0.06));
            dano = Math.max(Math.floor(atk * floorS), dano);
            dano = Math.floor(dano * this.multDanoPlayer);

            if (this.inimigo.cp > 0) {
                if (this.inimigo.cp >= dano) this.inimigo.cp -= dano;
                else {
                    const sobra = dano - this.inimigo.cp;
                    this.inimigo.cp = 0;
                    this.inimigo.hp -= sobra;
                }
            } else {
                this.inimigo.hp -= dano;
            }

            this.danoCausado += dano;
            this.escreverLog(`[${nomeSkill}] Dealt <span style="color:#fff;">${dano}</span> damage.`);
        }

        if (this.inimigo.hp <= 0) {
            this.inimigo.hp = 0;
            this.finalizarDuelo(true);
        }

        this.renderizarUI();
        if (typeof window.atualizar === 'function') window.atualizar();
    },

    // --- FINALIZAÇÃO E RECOMPENSAS ---

    async finalizarDuelo(vitoria) {
        this.ativo = false;
        if (this.loopInimigo) clearInterval(this.loopInimigo);
        if (Array.isArray(this._olyRivalBurstTimers)) {
            this._olyRivalBurstTimers.forEach((id) => clearTimeout(id));
            this._olyRivalBurstTimers = null;
        }
        this.olyBasicAttackLockUntil = 0;

        // Esconde a barra de atalhos ao finalizar o duelo (antes de mostrar o resultado)
        const barraGlobal = document.getElementById('barra-de-atalhos-dinamica');
        if (barraGlobal) {
            barraGlobal.style.setProperty('display', 'none', 'important');
        }

        // Limpa cooldowns visuais ao finalizar
        if (window.cooldownsAtivos) {
            Object.keys(window.cooldownsAtivos).forEach(k => delete window.cooldownsAtivos[k]);
        }

        const prevOlyPts = typeof window.olympiadPoints === 'number' ? window.olympiadPoints : 0;
        const prevWins = typeof window.olympiadWins === 'number' ? window.olympiadWins : 0;
        const prevLosses = typeof window.olympiadLosses === 'number' ? window.olympiadLosses : 0;
        const prevAdenas = typeof window.adenas === 'number' ? window.adenas : 0;
        const prevCoins = typeof window.ancientCoins === 'number' ? window.ancientCoins : 0;

        let finalPts = 0;
        let rewardAdena = 0;
        let rewardCoins = 0;
        let olyCloudSync = false;

        const useCloudOly = !!(window.SupabaseAPI && window.SUPABASE_CONFIG?.enabled && window.SupabaseAPI.client && typeof window.SupabaseAPI.client.rpc === 'function');

        if (useCloudOly) {
            try {
                const snapMmr = this.inimigo.isBot ? Math.max(0, parseInt(String(this.inimigo.olympiadPoints), 10) || 0) : null;
                const snapLvl = this.inimigo.isBot ? Math.max(1, parseInt(String(this.inimigo.nivel), 10) || 1) : null;
                let pairErr = null;
                let pairRes = null;
                for (let att = 0; att < 2; att++) {
                    const r = await window.SupabaseAPI.client.rpc('resolve_olympiad_mmr_pair', {
                        p_attacker_name: window.charName,
                        p_defender_name: this.inimigo.nome,
                        p_attacker_won: vitoria,
                        p_defender_is_bot: !!this.inimigo.isBot,
                        p_defender_snapshot_mmr: snapMmr,
                        p_defender_snapshot_level: snapLvl,
                        p_match_id: this.inimigo.isBot ? null : this.olyMatchId
                    });
                    pairErr = r.error;
                    pairRes = r.data;
                    if (!pairErr && pairRes && pairRes.success) break;
                }
                if (!pairErr && pairRes && pairRes.success) {
                    olyCloudSync = true;
                    finalPts = Number(pairRes.attacker_points_change) || 0;
                    rewardAdena = Number(pairRes.reward_adena) || 0;
                    rewardCoins = Number(pairRes.reward_coins) || 0;
                    if (pairRes.attacker) {
                        window.olympiadPoints = Math.max(0, Number(pairRes.attacker.new_mmr) || 0);
                        window.olympiadWins = Number(pairRes.attacker.wins) || 0;
                        window.olympiadLosses = Number(pairRes.attacker.losses) || 0;
                    }
                    if (pairRes.new_adenas != null && pairRes.new_adenas !== '') {
                        window.adenas = Number(pairRes.new_adenas);
                    } else {
                        window.adenas = prevAdenas + rewardAdena;
                    }
                    if (pairRes.new_ancient_coins != null && pairRes.new_ancient_coins !== '') {
                        window.ancientCoins = Number(pairRes.new_ancient_coins);
                    } else {
                        window.ancientCoins = prevCoins + rewardCoins;
                    }
                    if (this.inimigo.isBot && Array.isArray(window.dbBotsRanking)) {
                        const defDelta = Number(pairRes.defender_points_change) || 0;
                        const bot = window.dbBotsRanking.find(b => {
                            const row = b as BotRankingSeed;
                            return row.nome === this.inimigo!.nome;
                        }) as BotRankingSeed | undefined;
                        if (bot) {
                            bot.olympiadPoints = Math.max(0, (Number(bot.olympiadPoints) || 0) + defDelta);
                            if (!vitoria) bot.vitorias = (Number(bot.vitorias) || 0) + 1;
                            else bot.derrotas = (Number(bot.derrotas) || 0) + 1;
                            console.log(`🤖 [Olympiad] Bot ${bot.nome} atualizado: ${bot.olympiadPoints} MMR`);
                        }
                    } else if (!this.inimigo.isBot && typeof window.SupabaseAPI.broadcastGM === 'function') {
                        void window.SupabaseAPI.broadcastGM('force_update', this.inimigo.nome, {
                            msg: vitoria ? `You were defeated by ${window.charName} in the Olympiad (Offline Defense).` : `Your character successfully defended against ${window.charName} in the Olympiad!`,
                            reloadSave: true
                        });
                    }
                } else {
                    console.error('[Olympiad] resolve_olympiad_mmr_pair', pairErr, pairRes);
                    window.olympiadPoints = prevOlyPts;
                    window.olympiadWins = prevWins;
                    window.olympiadLosses = prevLosses;
                    window.adenas = prevAdenas;
                    window.ancientCoins = prevCoins;
                    finalPts = 0;
                    rewardAdena = 0;
                    rewardCoins = 0;
                    const code = pairRes && pairRes.error;
                    const mapped = this.olyMatchRpcMessage(code);
                    const msg =
                        mapped ||
                        (typeof window.t === 'function' ? window.t('game.olympiad.syncFailed') : 'Could not sync Olympiad result.');
                    if (typeof window.l2Alert === 'function') window.l2Alert(msg);
                }
            } catch (e) {
                console.error('[Olympiad] cloud duelo sync', e);
                window.olympiadPoints = prevOlyPts;
                window.olympiadWins = prevWins;
                window.olympiadLosses = prevLosses;
                window.adenas = prevAdenas;
                window.ancientCoins = prevCoins;
                finalPts = 0;
                rewardAdena = 0;
                rewardCoins = 0;
                const msg = typeof window.t === 'function' ? window.t('game.olympiad.syncFailed') : 'Could not sync Olympiad result.';
                if (typeof window.l2Alert === 'function') window.l2Alert(msg);
            }
        }

        if (!useCloudOly) {
            const ranking = await window.RankingManager.getMergedRanking();
            const minhaPos = ranking.findIndex(p => p.nome === window.charName);
            const opPos = ranking.findIndex(p => p.nome === this.inimigo.nome);

            if (vitoria) {
                if (opPos < minhaPos && minhaPos !== -1) {
                    const diff = minhaPos - opPos;
                    finalPts = 15 + Math.min(20, diff * 4);
                    rewardAdena = 2000 + (diff * 500);
                    rewardCoins = 2 + Math.floor(diff / 2);
                } else {
                    const diff = Math.max(0, opPos - minhaPos);
                    finalPts = Math.max(2, 5 - Math.floor(diff / 2));
                    rewardAdena = 0;
                    rewardCoins = 0;
                }
                window.olympiadWins++;
                window.adenas += rewardAdena;
                window.ancientCoins += rewardCoins;
            } else {
                finalPts = -15;
                window.olympiadLosses++;
            }

            window.olympiadPoints = Math.max(0, window.olympiadPoints + finalPts);

            if (this.inimigo.isBot && Array.isArray(window.dbBotsRanking)) {
                const defensorPtsOff = vitoria ? -Math.floor(finalPts / 2) : Math.abs(finalPts);
                const botOff = window.dbBotsRanking.find(b => {
                    const row = b as BotRankingSeed;
                    return row.nome === this.inimigo!.nome;
                }) as BotRankingSeed | undefined;
                if (botOff) {
                    botOff.olympiadPoints = Math.max(0, (botOff.olympiadPoints || 0) + defensorPtsOff);
                    if (!vitoria) botOff.vitorias = (botOff.vitorias || 0) + 1;
                    else botOff.derrotas = (botOff.derrotas || 0) + 1;
                }
            }
        }

        // 1. Salva no localStorage IMEDIATAMENTE (Garante persistência local)
        const localSaveKey = 'l2mini_save_' + window.charName.toLowerCase();
        const localSave = JSON.parse(localStorage.getItem(localSaveKey) || '{}');
        localSave.olympiadPoints = window.olympiadPoints;
        localSave.olympiadWins = window.olympiadWins;
        localSave.olympiadLosses = window.olympiadLosses;
        localSave.adenas = window.adenas;
        localSave.ancientCoins = window.ancientCoins;
        localStorage.setItem(localSaveKey, JSON.stringify(localSave));

        // 2. Save na nuvem: só envia se o duelo em nuvem foi aplicado na RPC ou se o fluxo é offline (useCloudOly falso)
        if (window.SupabaseAPI && window.SUPABASE_CONFIG?.enabled) {
            try {
                const shouldPush = (useCloudOly && olyCloudSync) || !useCloudOly;
                if (shouldPush && typeof window.SupabaseAPI.savePlayer === 'function') {
                    await window.SupabaseAPI.savePlayer(window.charName, localSave);
                }
                if (window.RankingManager) window.RankingManager.lastFetch = 0;
            } catch (err) {
                console.error("❌ [Olympiad] Erro ao sincronizar save com a nuvem:", err);
            }
        }

        // 3. Registra no histórico pessoal
        this.adicionarAoHistorico({
            oponente: this.inimigo.nome,
            vitoria: vitoria,
            pontos: finalPts,
            tipo: 'offensive',
            data: new Date().toISOString()
        });

        // 4. Atualiza a UI Global (HUD, etc)
        if (typeof window.atualizar === 'function') window.atualizar();

        // 5. Missões diárias — progresso no cliente (engajamento); MMR/recompensa de arena seguem regra cloud acima.
        if (vitoria && typeof registrarProgressoMissaoDiaria === 'function') {
            registrarProgressoMissaoDiaria('vencer_olympiad', 1);
            if (rewardAdena > 0) registrarProgressoMissaoDiaria('ganhar_adena', rewardAdena);
            if (rewardCoins > 0) registrarProgressoMissaoDiaria('coletar_coins', rewardCoins);
        }

        // --- VERIFICAÇÃO DE NOVO HERO ---
        const rankingPosVitoria = await window.RankingManager.getMergedRanking();
        if ((olyCloudSync || !useCloudOly) && rankingPosVitoria.length && rankingPosVitoria[0].nome === window.charName && vitoria) {
            // Se o player acabou de assumir o #1, dispara um efeito visual de prestígio
            this.escreverLog(`<span style="color:#facc15; font-weight:bold; font-size:1.2em; text-shadow:0 0 10px orange;">👑 ALL HAIL THE NEW HERO: ${window.charName.toUpperCase()}!</span>`);
            if (typeof tocarSom === 'function') tocarSom('lvlup');
        }

        // 6. Sincroniza o save local com a nuvem após todas as alterações
        if (typeof window.salvarJogo === 'function') window.salvarJogo();

        this.olyMatchId = null;

        this.mostrarResultado(vitoria, finalPts, rewardAdena, rewardCoins);
    },

    async registrarBatalhaDefensiva(targetName, attackerName, vitoria, pontos) {
        console.log(`🛡️ [Olympiad] Registrando vitória defensiva para ${targetName} contra ${attackerName}`);
    },

    mostrarResultado(vitoria, pts, adena = 0, coins = 0) {
        const res = document.getElementById('olympiad-resultado');
        if (!res) return;

        res.style.display = 'flex';
        document.getElementById('oly-res-titulo').innerText = vitoria ? "VICTORY" : "DEFEAT";
        document.getElementById('oly-res-subtitulo').innerText = vitoria ? "You climbed the ranks!" : "You lost points this time.";
        document.getElementById('oly-res-rival').innerText = this.inimigo.nome;
        document.getElementById('oly-res-dano-causado')!.innerText = String(this.danoCausado);
        document.getElementById('oly-res-dano-recebido')!.innerText = String(this.danoRecebido);
        document.getElementById('oly-res-mmr-total')!.innerText = String(window.olympiadPoints);
        document.getElementById('oly-res-mmr-gained').innerText = (pts >= 0 ? "+" : "") + pts;
        
        // Atualiza recompensas visuais
        const adenaEl = document.getElementById('oly-res-adena');
        const coinEl = document.getElementById('oly-res-coin');
        if (adenaEl) adenaEl.innerText = "+" + adena;
        if (coinEl) coinEl.innerText = "+" + coins;
        
        const rank = this.getRank(window.olympiadPoints);
        const tierEl = document.getElementById('oly-res-mmr-tier');
        if (tierEl) {
            tierEl.innerText = rank.nomeCompleto;
            // Cores baseadas no Tier
            let color = "#fde047";
            switch(rank.tier) {
                case "Unranked": color = "#94a3b8"; break;
                case "Paper": color = "#e5e7eb"; break;
                case "Wood": color = "#b45309"; break;
                case "Copper": color = "#d97706"; break;
                case "Silver": color = "#9ca3af"; break;
                case "Gold": color = "#facc15"; break;
                case "Platinum": color = "#38bdf8"; break;
                case "Diamond": color = "#818cf8"; break;
                case "Legendary": color = "#f43f5e"; break;
                case "Mythic": color = "#a855f7"; break;
            }
            tierEl.style.color = color;
        }
    },

    // --- HISTÓRICO E PERSISTÊNCIA ---

    adicionarAoHistorico(entrada) {
        // Com sessão Supabase, MMR/histórico vêm das RPCs resolve_olympiad_mmr_pair / update_olympiad_mmr; isto alimenta UI local.
        // Mantemos o local para bots ou fallback
        this.historicoBatalhas.unshift(entrada);
        if (this.historicoBatalhas.length > 15) this.historicoBatalhas.pop();
        localStorage.setItem('l2mini_oly_history', JSON.stringify(this.historicoBatalhas));
    },

    async carregarHistorico() {
        // Prioridade: Supabase se estiver logado
        if (window.SUPABASE_CONFIG?.enabled && window.charName) {
            try {
                const cloudHistory = typeof window.SupabaseAPI.fetchOlympiadHistory === 'function'
                    ? await window.SupabaseAPI.fetchOlympiadHistory(window.charName)
                    : [];
                if (cloudHistory && cloudHistory.length > 0) {
                    this.historicoBatalhas = cloudHistory.map(h => ({
                        tipo: h.battle_type,
                        vitoria: h.is_victory,
                        oponente: h.opponent_name,
                        pontos: h.points_change,
                        data: h.created_at
                    }));
                    return;
                }
            } catch (e) {
                console.warn("Falha ao carregar histórico da nuvem, usando local.", e);
            }
        }

        const saved = localStorage.getItem('l2mini_oly_history');
        if (saved) this.historicoBatalhas = JSON.parse(saved);
    },

    renderizarHistorico() {
        const cont = document.getElementById('oly-battle-history');
        if (!cont) return;

        if (this.historicoBatalhas.length === 0) {
            cont.innerHTML = '<div style="color:#555; text-align:center; padding:20px;">No recent battles.</div>';
            return;
        }

        cont.innerHTML = this.historicoBatalhas.map(h => {
            const isDefensive = h.tipo === 'defensive';
            const vitoria = h.vitoria;
            const corStatus = vitoria ? '#22c55e' : '#ef4444';
            const labelStatus = vitoria ? 'WIN' : 'LOSS';
            const labelTipo = isDefensive ? '🛡️ DEFENSE' : '⚔️ ATTACK';
            
            const d = new Date(h.data);
            const dataStr = d.toLocaleDateString();
            const horaStr = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            return `
                <div style="background:rgba(0,0,0,0.4); border:1px solid #333; border-radius:6px; padding:10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <div style="display:flex; flex-direction:column;">
                        <div style="display:flex; align-items:center; gap:5px;">
                            <span style="color:${corStatus}; font-weight:bold; font-size:0.8em;">${labelStatus}</span>
                            <span style="color:#666; font-size:0.6em;">${labelTipo}</span>
                        </div>
                        <span style="color:#ddd; font-size:0.85em;">vs ${h.oponente}</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="color:${h.pontos >= 0 ? '#22c55e' : '#ef4444'}; font-weight:bold; font-size:0.9em;">${h.pontos >= 0 ? '+' : ''}${h.pontos} MMR</span>
                        <div style="color:#555; font-size:0.6em;">${dataStr} ${horaStr}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // --- AUXILIARES ---

    escreverLog(msg) {
        const log = document.getElementById('olympiad-log');
        if (!log) return;
        log.innerHTML = `<div>${msg}</div>${log.innerHTML}`;
    },

    renderizarUI() {
        const hpFill = document.getElementById('oly-inimigo-hp-fill');
        const cpFill = document.getElementById('oly-inimigo-cp-fill');
        const enemyName = document.getElementById('oly-inimigo-nome');
        const enemyLvl = document.getElementById('oly-inimigo-lvl');
        
        const hpText = document.getElementById('oly-inimigo-hp-text');
        const cpText = document.getElementById('oly-inimigo-cp-text');

        if (this.inimigo) {
            if (hpFill) hpFill.style.width = (this.inimigo.hp / this.inimigo.maxHp * 100) + '%';
            if (cpFill) cpFill.style.width = (this.inimigo.cp / this.inimigo.maxCp * 100) + '%';
            if (enemyName) enemyName.innerText = this.inimigo.nome;
            if (enemyLvl) enemyLvl.innerText = this.inimigo.nivel;
            
            if (hpText) hpText.innerText = Math.floor(this.inimigo.hp) + " / " + this.inimigo.maxHp;
            if (cpText) cpText.innerText = Math.floor(this.inimigo.cp) + " / " + this.inimigo.maxCp;
        }

        const pHpFill = document.getElementById('oly-player-hp-fill');
        const pCpFill = document.getElementById('oly-player-cp-fill');
        const pMpFill = document.getElementById('oly-player-mp-fill');
        
        const pHpText = document.getElementById('oly-player-hp-text');
        const pCpText = document.getElementById('oly-player-cp-text');
        const pMpText = document.getElementById('oly-player-mp-text');
        
        if (pHpFill) pHpFill.style.width = (window.playerHP / window.playerStats.maxHp * 100) + '%';
        if (pCpFill) pCpFill.style.width = (window.playerCP / window.playerStats.maxCp * 100) + '%';
        if (pMpFill) pMpFill.style.width = (window.playerMP / window.playerStats.maxMp * 100) + '%';

        if (pHpText) pHpText.innerText = Math.floor(window.playerHP) + " / " + window.playerStats.maxHp;
        if (pCpText) pCpText.innerText = Math.floor(window.playerCP) + " / " + window.playerStats.maxCp;
        if (pMpText) pMpText.innerText = Math.floor(window.playerMP) + " / " + window.playerStats.maxMp;
    },

    getRank(points: number | string): OlympiadRankInfo {
        const pts = parseInt(String(points), 10) || 0;
        
        // Definição dos Tiers base - Agora começando do 0 para Paper 5
        const tiers = [
            {nome: "Paper", req: 0},
            {nome: "Wood", req: 1000},
            {nome: "Copper", req: 2500},
            {nome: "Silver", req: 4500},
            {nome: "Gold", req: 7000},
            {nome: "Platinum", req: 10000},
            {nome: "Diamond", req: 13500},
            {nome: "Legendary", req: 17500},
            {nome: "Mythic", req: 22500}
        ];

        // Função para calcular o custo de cada divisão dentro de um tier
        const getDivCost = (tierIndex, divIndex) => {
            // Base aumenta conforme o tier (Paper=100, Wood=200, etc.)
            const base = 100 + (tierIndex * 100); 
            // Dificuldade interna aumenta conforme sobe de divisão (5->4=+0, 4->3=+50, etc.)
            const extraPorDiv = (5 - divIndex) * 50;
            return base + extraPorDiv;
        };

        let tierIndex = 0;
        for (let i = 0; i < tiers.length; i++) {
            if (pts >= tiers[i].req) {
                tierIndex = i;
            }
        }

        const currentTier = tiers[tierIndex];
        const nextTierObj = tiers[tierIndex + 1] || null;

        if (currentTier.nome === "Mythic") {
            return { 
                nomeCompleto: "Mythic",
                tier: "Mythic",
                divisao: 1,
                req: currentTier.req,
                nextTier: "MAX",
                progressoAtual: pts - currentTier.req,
                maxDivisao: 5000,
                porcentagem: Math.min(100, ((pts - currentTier.req) / 5000) * 100)
            };
        }

        // Calcula em qual divisão o jogador está dentro do tier
        let pontosNoTier = pts - currentTier.req;
        let divAtual = 5;
        let custoDivAtual = 0;

        for (let d = 5; d >= 1; d--) {
            custoDivAtual = getDivCost(tierIndex, d);
            if (pontosNoTier < custoDivAtual) {
                divAtual = d;
                break;
            }
            pontosNoTier -= custoDivAtual;
            if (d === 1) divAtual = 1; 
        }

        // Próximo Rank (para exibição visual)
        let visualNextRank = "";
        if (divAtual > 1) {
            visualNextRank = `${currentTier.nome} ${divAtual - 1}`;
        } else {
            visualNextRank = nextTierObj ? `${nextTierObj.nome} 5` : "MAX";
        }

        const pct = (pontosNoTier / custoDivAtual) * 100;

        return { 
            nomeCompleto: `${currentTier.nome} ${divAtual}`,
            tier: currentTier.nome,
            divisao: divAtual,
            req: currentTier.req,
            nextTier: visualNextRank,
            progressoAtual: Math.floor(pontosNoTier),
            maxDivisao: custoDivAtual,
            porcentagem: Math.min(100, Math.max(0, pct))
        };
    },

    fugir() {
        if (this.ativo) this.finalizarDuelo(false);
        
        // Esconde a barra ao fugir
        const barraGlobal = document.getElementById('barra-de-atalhos-dinamica');
        if (barraGlobal) {
            barraGlobal.style.setProperty('display', 'none', 'important');
        }

        window.sairOlympiad(true);
    },

    revanche() {
        const res = document.getElementById('olympiad-resultado');
        if (res) res.style.display = 'none';
        
        // Esconde a barra ao voltar para o lobby
        const barraGlobal = document.getElementById('barra-de-atalhos-dinamica');
        if (barraGlobal) {
            barraGlobal.style.setProperty('display', 'none', 'important');
        }

        this.renderizarLobby();
        this.mudarAbaLobby('battle');
    },

    sairPosPartida() {
        document.getElementById('olympiad-resultado').style.display = 'none';
        window.sairOlympiad(true);
    },

    mostrarDanoVisual(valor, alvo, isCrit = false) {
        const cena = document.getElementById('oly-combate-cena');
        if (!cena) return;

        const el = document.createElement('div');
        el.className = `damage-number ${alvo}${isCrit ? ' critical' : ''}`;
        el.innerText = valor;

        // Posição aleatória leve para não sobrepor
        const offset = (Math.random() * 40) - 20;
        if (alvo === 'player') {
            // Dano que VOCÊ causa (aparece no inimigo)
            el.style.left = `calc(75% + ${offset}px)`;
            el.style.top = '40%';
        } else {
            // Dano que VOCÊ recebe (aparece em você)
            el.style.left = `calc(25% + ${offset}px)`;
            el.style.top = '40%';
        }

        cena.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    },

    shakeScreen(isPlayerCausando) {
        const cena = document.getElementById('oly-combate-cena');
        if (!cena) return;

        cena.classList.add('screen-shake');
        
        // Flash de tela sutil
        const flash = document.createElement('div');
        flash.className = 'hit-flash';
        if (!isPlayerCausando) flash.style.background = 'rgba(255,0,0,0.2)';
        cena.appendChild(flash);

        setTimeout(() => {
            cena.classList.remove('screen-shake');
            flash.remove();
        }, 300);
    }
};

// --- FUNÇÕES GLOBAIS PARA COMPATIBILIDADE ---
registerGlobal('OlympiadEngine', OlympiadEngine as OlympiadEngineApi);

window.abrirOlympiad = function() {
    if (window.OlympiadEngine && typeof window.OlympiadEngine.abrirOlympiad === 'function') {
        window.OlympiadEngine.abrirOlympiad();
    } else {
        console.error("❌ [Olympiad] Erro: OlympiadEngine não carregado.");
    }
};

window.getOlympiadRank = function(pts: number): OlympiadRankInfo {
    if (window.OlympiadEngine && typeof window.OlympiadEngine.getRank === 'function') {
        return window.OlympiadEngine.getRank(pts);
    }
    return { nomeCompleto: 'Paper', tier: 'Paper', divisao: 5, porcentagem: 0, progressoAtual: 0, maxDivisao: 5 };
};

window.sairOlympiad = function(forcarSaida = false) {
    void forcarSaida;
    const tela = document.getElementById('tela-olympiad-arena');
    if (tela) tela.style.display = 'none';
    
    window.irPara('world');
};

// Inicializa ao carregar
window.OlympiadEngine.init?.();

export {};
