/**
 * UI — clãs, candidaturas e gerenciamento social
 * Migrado: js/ui_clans.js — Fase 4: tipos explícitos.
 */

import type {
  BotRankingSeed,
  ClanApplicationRecord,
  ClanMemberDisplayInfo,
  ClanRecord,
  ClanRpcResult,
  ClanSecurityAction,
  ClanUiTab,
  CloudClanApplicationRow,
  CloudClanRow,
  InspectionCachePreview,
} from '../types/game';

function clanBotName(bot: BotRankingSeed): string {
    return String(bot.nome || bot.farmBot1 || '').trim();
}

function clanBotLevel(bot: BotRankingSeed): number {
    return Number(bot.nivel) || 1;
}

function clanBotPoints(bot: BotRankingSeed): number {
    return Number(bot.olympiadPoints) || 0;
}

function clanT(key: string, params?: Record<string, string | number>): string {
    return typeof window.t === 'function' ? window.t(key, params) : key;
}

let clanProcessando = false;
/** Estado de clã espelhado em window (core_globals + módulos TS). */
let solicitacoesClan: ClanApplicationRecord[] = [];
let vidaMundialInterval: ReturnType<typeof setInterval> | null = null;

function isClanRpcSuccess(res: ClanRpcResult | null | undefined): res is ClanRpcResult & { success: true } {
    return !!(res && res.success);
}

/** Clã do personagem: membro em `membros` ou líder (fallback se `clan_members` incompleto). */
function findClanIdForCharacter(charName: string | null | undefined): number | string | null {
    const cn = String(charName || '').trim();
    if (!cn || !Array.isArray(window.clans)) return null;
    const nomeMatch = (m: unknown): boolean => {
        const s = typeof m === 'string' ? m : (m && typeof m === 'object' && 'nome' in m) ? String((m as { nome?: string }).nome || '') : '';
        return !!(s && (s === cn || s.toLowerCase() === cn.toLowerCase()));
    };
    const byMember = window.clans.find((c) => (c.membros || []).some(nomeMatch));
    if (byMember) return byMember.id;
    const byLeader = window.clans.find((c) => {
        const l = String(c.lider || '').trim();
        return l && l.toLowerCase() === cn.toLowerCase();
    });
    return byLeader ? byLeader.id : null;
}

// Ícones disponíveis para Clãs
const clanIcons = [
    "🏰", "⚔️", "🛡️", "🐉", "🦅", "🐺", "🔥", "❄️", "⚡", "🔱", "🏆", "👑", "🌑", "🌟"
];

/** Nível/classe na lista do clã: jogador atual, bots locais, ranking nuvem ou cache de inspeção */
function clanMemberDisplayInfo(membroNome: string | null | undefined): ClanMemberDisplayInfo {
    function fmtCls(c: unknown): string {
        if (c == null || c === '' || c === '?') return '?';
        return (typeof window.formatClassDisplayName === 'function')
            ? window.formatClassDisplayName(c)
            : String(c).replace(/_/g, ' ');
    }
    if (membroNome == null || membroNome === '') return { nivel: '?', classe: '?' };
    var mn = String(membroNome).trim();
    if (typeof window.charName === 'string' && mn === window.charName) {
        return {
            nivel: (typeof window.nivel !== 'undefined' && window.nivel !== null) ? window.nivel : '?',
            classe: fmtCls(window.charClass || '?')
        };
    }
    if (typeof window.dbBotsRanking !== 'undefined') {
        var bot = window.dbBotsRanking.find(function (b: BotRankingSeed) {
            var n = (b.nome || b.farmBot1 || '').trim();
            return n === mn || n.toLowerCase() === mn.toLowerCase();
        });
        if (bot) return { nivel: clanBotLevel(bot), classe: fmtCls(bot.classe) };
    }
    if (window.RankingManager && Array.isArray(window.RankingManager.realPlayers)) {
        var key = mn.toLowerCase();
        var rp = window.RankingManager.realPlayers.find(function (p) {
            return String(p.nome || '').trim().toLowerCase() === key;
        });
        if (rp) {
            return {
                nivel: rp.nivel != null ? rp.nivel : 1,
                classe: fmtCls(rp.classe || rp.charClass || '?')
            };
        }
    }
    if (typeof window.getInspectionCacheEntry === 'function') {
        var c = window.getInspectionCacheEntry(mn) as InspectionCachePreview | null | undefined;
        if (c && (c.nivel != null || c.classe)) {
            return {
                nivel: c.nivel != null ? c.nivel : '?',
                classe: fmtCls(c.classe || '?')
            };
        }
    }
    return { nivel: '?', classe: '?' };
}

async function clanHydrateRankingForMemberRows(): Promise<void> {
    if (typeof window.RankingManager === 'undefined' || typeof window.RankingManager.getMergedRanking !== 'function') return;
    if (!(window.SupabaseAPI && typeof window.SupabaseAPI.getUser === 'function' && window.SupabaseAPI.getUser())) return;
    try {
        await window.RankingManager.getMergedRanking();
    } catch (e) { /* ignore */ }
}

/**
 * Inicializa o sistema de clãs
 */
async function iniciarSistemaClans(): Promise<void> {
    if (!window.charName) return console.log("Sistema de clãs aguardando identificação do herói...");
    console.log(`Iniciando sistema de clãs para [${window.charName}]...`);
    
    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        console.log("🔗 [Clãs] Sincronizando com a nuvem (Livre de Bots)...");
        try {
            const fetchClansFn = window.SupabaseAPI.fetchClans;
            if (typeof fetchClansFn !== 'function') throw new Error('fetchClans missing');

            const cloudClans = await fetchClansFn.call(window.SupabaseAPI) as CloudClanRow[];
            window.clans = (cloudClans || []).map((c): ClanRecord => ({
                id: c.id,
                nome: c.name,
                sigla: c.tag,
                logo: c.logo,
                lider: c.leader_name,
                nivelMin: c.min_level,
                level: c.level,
                descricao: c.description != null ? c.description : '',
                membros: Array.isArray(c.membros) ? c.membros : []
            }));

            const cn = String(window.charName || '').trim();
            window.playerClanId = findClanIdForCharacter(cn);
            const meuClan = window.playerClanId != null ? window.clans.find(c => c.id === window.playerClanId) : null;

            const fetchApps = window.SupabaseAPI.fetchClanApplications;
            const outgoing = typeof fetchApps === 'function'
                ? await fetchApps.call(window.SupabaseAPI, window.charName || '') as CloudClanApplicationRow[]
                : [];
            const fetchIncoming = window.SupabaseAPI.fetchClanPendingApplicationsForClan;
            let incoming: CloudClanApplicationRow[] = [];
            if (window.playerClanId && typeof fetchIncoming === 'function') {
                const clanLider = window.clans.find(c => c.id === window.playerClanId);
                if (clanLider && String(clanLider.lider || '').toLowerCase() === cn.toLowerCase()) {
                    incoming = await fetchIncoming.call(window.SupabaseAPI, window.playerClanId) as CloudClanApplicationRow[] || [];
                }
            }
            const merged = new Map<string | number, ClanApplicationRecord>();
            [...(outgoing || []), ...(incoming || [])].forEach((r) => {
                if (!r || !r.id) return;
                merged.set(r.id, {
                    id: r.id,
                    nome: r.char_name,
                    clanId: r.clan_id,
                    timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
                    clans: r.clans
                });
            });
            solicitacoesClan = Array.from(merged.values());

            console.log(`[Clãs Cloud] ${window.clans.length} clãs ativos. Player em: ${meuClan ? meuClan.nome : 'Nenhum'}`);

            if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
            return;
        } catch (e) {
            console.error('[Clãs Cloud] Falha ao sincronizar; usando modo offline local.', e);
        }
    }

    // MODO LOCAL (OFFLINE - MANTIDO PARA COMPATIBILIDADE)
    let savedClans = localStorage.getItem('l2mini_clans');
    if (savedClans && savedClans !== "[]") {
        try {
            window.clans = JSON.parse(savedClans) as ClanRecord[] || [];
            const temClasAntigos = window.clans.some(c => c.nome === "Lendários" || c.nome === "Elite");
            if (temClasAntigos) {
                gerarClansIniciais();
            } else {
                const temLiderFake = window.clans.some(c => c.lider === "Bot Lider" || !c.lider);
                if (temLiderFake) {
                    corrigirLideresClans();
                }
            }
        } catch(e) { window.clans = []; gerarClansIniciais(); }
    } else {
        gerarClansIniciais();
    }

    let savedPlayerClan = localStorage.getItem('l2mini_player_clan_' + window.charName);
    if (savedPlayerClan && savedPlayerClan !== "null") {
        try {
            window.playerClanId = JSON.parse(savedPlayerClan);
        } catch(e) { window.playerClanId = null; }
    } else {
        let clanEncontrado = window.clans.find(c => c.membros.includes(window.charName));
        if (clanEncontrado) {
            window.playerClanId = clanEncontrado.id;
            localStorage.setItem('l2mini_player_clan_' + window.charName, JSON.stringify(window.playerClanId));
        } else {
            window.playerClanId = null;
        }
    }

    let savedReqs = localStorage.getItem('l2mini_clan_reqs');
    if (savedReqs && savedReqs !== "null" && savedReqs !== "undefined") {
        try {
            solicitacoesClan = JSON.parse(savedReqs) as ClanApplicationRecord[] || [];
        } catch(e) { solicitacoesClan = []; }
    } else {
        solicitacoesClan = [];
    }

    if (!vidaMundialInterval) {
        iniciarVidaMundialClans();
    }
    atualizarNotificacaoSocial();
    
    if (typeof window.charName !== 'undefined' && window.charName && typeof window.calcularStatusGlobais === 'function') {
        window.calcularStatusGlobais();
    }
}

/**
 * Corrige líderes sem apagar o clã do player
 */
function corrigirLideresClans(): void {
    let botsDisponiveis: BotRankingSeed[] = [];
    if (typeof window.dbBotsRanking !== 'undefined') {
        botsDisponiveis = [...window.dbBotsRanking].sort((a, b) => clanBotPoints(b) - clanBotPoints(a));
    }

    window.clans.forEach((c, i) => {
        if (c.lider === "Bot Lider" || !c.lider) {
            const botLider = botsDisponiveis[i % botsDisponiveis.length];
            if (!botLider) return;
            const liderNome = clanBotName(botLider);
            c.lider = liderNome;
            if (liderNome && !c.membros.includes(liderNome)) c.membros.unshift(liderNome);
        }
    });
    salvarClans();
}

/**
 * Sistema de Rotatividade e Eventos de Clã
 */
/**
 * Sistema de Rotatividade e Eventos de Clã (Vida Mundial)
 * v3.0 - Motor Profissional de IA de Clãs
 */
function iniciarVidaMundialClans() {
    if (vidaMundialInterval) clearInterval(vidaMundialInterval);
    
    vidaMundialInterval = setInterval(() => {
        if (!window.clans || window.clans.length === 0 || typeof window.dbBotsRanking === 'undefined') return;

        const agora = Date.now();
        
        // 1. DINÂMICA DE EXPULSÃO (KICKING) E SAÍDA ESPONTÂNEA
        window.clans.forEach(clan => {
            if (clan.membros.length <= 1) return;

            // Bots saem de clãs alheios (incluindo do player) por descontentamento ou ambição
            clan.membros.forEach(membroNome => {
                if (membroNome === clan.lider) return; // Líderes não saem assim

                const botData = window.dbBotsRanking.find(b => (b.nome || b.farmBot1) === membroNome);
                if (!botData) return;

                // Chance base de 5% de sair por "rotatividade"
                let chanceSair = 0.05;

                // Se o bot for nível muito alto para o clã, ele quer sair para um clã melhor
                const nivelMedio = clan.membros.reduce((acc, m) => {
                    const b = window.dbBotsRanking.find(x => clanBotName(x) === m);
                    return acc + (b ? clanBotLevel(b) : 20);
                }, 0) / clan.membros.length;

                if (clanBotLevel(botData) > nivelMedio + 15) chanceSair += 0.20;

                if (Math.random() < chanceSair) {
                    clan.membros = clan.membros.filter(m => m !== membroNome);
                    // Se o player for o líder, avisa via log
                    if (clan.id === window.playerClanId && clan.lider === window.charName) {
                        window.escreverLog(`<span style="color:#ef4444;">[Clan] ${membroNome} has left your clan seeking better opportunities.</span>`);
                    }
                    console.log(`[ClanEngine] ${membroNome} saiu do clã ${clan.nome}`);
                }
            });

            // Líderes Bots expulsam membros fracos para "limpar" o clã (10% de chance por ciclo)
            if (clan.lider !== window.charName && Math.random() < 0.10 && clan.membros.length > 3) {
                // Encontra o membro de menor nível (que não seja o líder)
                let membroMaisFraco: string | null = null;
                let menorNivel = 999;

                clan.membros.forEach(m => {
                    if (m === clan.lider) return;
                    const b = window.dbBotsRanking.find(x => clanBotName(x) === m);
                    const lvl = b ? clanBotLevel(b) : 1;
                    if (lvl < menorNivel) {
                        menorNivel = lvl;
                        membroMaisFraco = m;
                    }
                });

                if (membroMaisFraco) {
                    clan.membros = clan.membros.filter(m => m !== membroMaisFraco);
                    console.log(`[ClanEngine] Líder ${clan.lider} expulsou ${membroMaisFraco} por ser muito fraco.`);
                }
            }
        });

        // 2. DINÂMICA DE SOLICITAÇÃO (JOINING)
        // Bots sem clã procuram um lugar para morar
        const botsSemClan = window.dbBotsRanking.filter(b => {
            const nome = clanBotName(b);
            return nome && !window.clans.some(c => c.membros.includes(nome));
        });

        if (botsSemClan.length > 0) {
            // Pega até 2 bots por ciclo para tentar entrar em algum clã
            const candidatos = botsSemClan.sort(() => 0.5 - Math.random()).slice(0, 2);

            candidatos.forEach(bot => {
                const nomeBot = clanBotName(bot);
                if (!nomeBot) return;
                const r = Math.random();

                // 30% de chance de tentar entrar no clã do Player (se ele for líder)
                if (window.playerClanId && r < 0.30) {
                    const meuClan = window.clans.find(c => c.id === window.playerClanId);
                    if (meuClan && meuClan.lider === window.charName) {
                        // Verifica se já tem solicitação pendente
                        const jaTem = solicitacoesClan.some(req => (typeof req === 'object' ? req.nome === nomeBot : req === nomeBot));
                        if (!jaTem && meuClan.membros.length < 40) {
                            solicitacoesClan.push({
                                nome: nomeBot,
                                clanId: window.playerClanId,
                                timestamp: agora
                            });

                            // Notifica o Líder via Mailbox Profissional
                            if (typeof window.enviarMail === 'function') {
                                window.enviarMail(window.charName, nomeBot, 'New Clan Application', 'clan', { 
                                    nome: nomeBot,
                                    nivel: bot.nivel,
                                    classe: bot.classe
                                });
                            }
                            console.log(`[ClanEngine] Bot ${nomeBot} enviou solicitação para o clã do player.`);
                            if (document.getElementById('clan-content-area')) renderizarClans('meu');
                        }
                    }
                } 
                // 70% de chance de tentar entrar em um clã de bot
                else {
                    const clansDisponiveis = window.clans.filter(c => c.lider !== window.charName && c.membros.length < 30);
                    if (clansDisponiveis.length > 0) {
                        const clanAlvo = clansDisponiveis[Math.floor(Math.random() * clansDisponiveis.length)];
                        if (!clanAlvo.membros.includes(nomeBot)) {
                            clanAlvo.membros.push(nomeBot);
                            console.log(`[ClanEngine] Bot ${nomeBot} juntou-se ao clã ${clanAlvo.nome}`);
                        }
                    }
                }
            });
        }

        salvarClans();
        atualizarNotificacaoSocial();
    }, 45000); // Reduzido para 45s para um mundo mais dinâmico
}

function atualizarNotificacaoSocial() {
    // Sistema substituído pela Mailbox
}

function salvarClans() {
    if (!window.clans || window.clans.length === 0) {
        console.warn("Tentativa de salvar lista de clãs vazia abortada.");
        // Não salvamos se estiver vazio para evitar sobrescrever dados bons por erro de carregamento
    } else {
        localStorage.setItem('l2mini_clans', JSON.stringify(window.clans));
    }
    localStorage.setItem('l2mini_player_clan_' + window.charName, JSON.stringify(window.playerClanId));
    localStorage.setItem('l2mini_clan_reqs', JSON.stringify(solicitacoesClan));
}

/**
 * Gera clãs iniciais para los bots
 */
function gerarClansIniciais() {
    let meuClanAntigo = window.playerClanId ? window.clans.find(c => c.id === window.playerClanId) : null;
    window.clans = [];
    if (meuClanAntigo) window.clans.push(meuClanAntigo);

    const nomesClans = ["DragonSlayers", "BloodAlliance", "Invictus", "RoyalArmy", "DeathKnights", "ChaosLegion", "SilverKnights", "MysticOrder", "ElvenGuard"];
    const siglasClans = ["DS", "BA", "INV", "RA", "DK", "CL", "SK", "MO", "EG"];
    
    let botsDisponiveis: BotRankingSeed[] = [];
    if (typeof window.dbBotsRanking !== 'undefined') {
        botsDisponiveis = [...window.dbBotsRanking].sort((a, b) => clanBotPoints(b) - clanBotPoints(a));
    }

    nomesClans.forEach((nome, i) => {
        let clanId = 1000 + i;
        let nomeLider = "Bot Lider";
        if (botsDisponiveis.length > 0) {
            const botLider = botsDisponiveis[i % botsDisponiveis.length];
            nomeLider = clanBotName(botLider) || nomeLider;
        }

        const novoClan: ClanRecord = {
            id: clanId,
            nome: nome,
            sigla: siglasClans[i],
            logo: clanIcons[Math.floor(Math.random() * clanIcons.length)],
            lider: nomeLider,
            nivelMin: 10 + (i * 5),
            level: 5, // Todos começam level 5 para ter os bônus
            descricao: `Ancient clan of the Iron Marches. Fighting for ${nome} glory.`,
            membros: [nomeLider]
        };
        window.clans.push(novoClan);
    });

    // Distribui TODOS os bots nos clãs de forma equilibrada
    if (typeof window.dbBotsRanking !== 'undefined') {
        window.dbBotsRanking.forEach((bot, index) => {
            const nomeBot = clanBotName(bot);
            if (!nomeBot) return;
            // Pula se já for líder de algum clã
            if (window.clans.some(c => c.lider === nomeBot)) return;
            
            // Escolhe um clã para o bot (sequencial para equilíbrio)
            let clanAlvo = window.clans[index % window.clans.length];
            if (clanAlvo.id !== window.playerClanId) {
                if (!clanAlvo.membros.includes(nomeBot)) clanAlvo.membros.push(nomeBot);
            }
        });
    }
    salvarClans();
}

/**
 * Renderiza a interface de clãs no menu dedicado
 */
function renderizarClans(aba = 'ranking') {
    const container = document.getElementById('clans-container-main');
    if (!container) {
        console.error("ERRO CRÍTICO: Container 'clans-container-main' não encontrado!");
        return;
    }

    // Forçar visibilidade do container pai caso esteja escondido por erro
    if (container.parentElement) container.parentElement.style.display = 'flex';
    container.style.display = 'block';

    console.log(`Renderizando Clãs - Aba: ${aba}, Clãs carregados: ${window.clans.length}`);

    // Cabeçalho de Abas
    let abasHtml = `
        <div style="display: flex; gap: 5px; margin-bottom: 15px; width: 100%; border-bottom: 1px solid #3d2b1f; padding-bottom: 5px;">
            <button class="btn-l2" id="btn-clan-ranking" style="flex: 1; height: 35px; font-size: 0.75em; background: ${aba === 'ranking' ? '#ca8a04' : '#333'}; color: ${aba === 'ranking' ? '#fff' : '#aaa'};" onclick="renderizarClans('ranking')">CLAN RANKING</button>
            <button class="btn-l2" id="btn-clan-meu" style="flex: 1; height: 35px; font-size: 0.75em; background: ${aba === 'meu' ? '#ca8a04' : '#333'}; color: ${aba === 'meu' ? '#fff' : '#aaa'};" onclick="renderizarClans('meu')">MY CLAN</button>
        </div>
    `;

    container.innerHTML = abasHtml + `<div id="clan-content-area" style="width:100%; min-height: 200px;"></div>`;
    const contentArea = document.getElementById('clan-content-area');

    if (!contentArea) {
        console.error("Erro ao encontrar área de conteúdo do clã!");
        // Fallback: Se o innerHTML acima falhou ou o DOM não atualizou a tempo
        container.innerHTML = abasHtml + `<div id="clan-content-area" style="width:100%; min-height: 200px; padding: 10px; background: rgba(0,0,0,0.2);"></div>`;
        const retryArea = document.getElementById('clan-content-area');
        if (aba === 'ranking') {
            renderizarRankingClans(retryArea);
        } else {
            if (window.playerClanId && window.clans.some(c => c.id === window.playerClanId)) {
                renderizarMeuClan(retryArea);
            } else {
                renderizarOpcoesClan(retryArea);
            }
        }
        return;
    }

    if (aba === 'ranking') {
        renderizarRankingClans(contentArea);
    } else {
        if (window.playerClanId && window.clans.some(c => c.id === window.playerClanId)) {
            renderizarMeuClan(contentArea);
        } else {
            // Se o window.playerClanId não existe mais nos clãs globais, limpa ele
            if (window.playerClanId) {
                console.log("Clã do jogador não encontrado na lista global. Resetando...");
                window.playerClanId = null;
                salvarClans();
            }
            renderizarOpcoesClan(contentArea);
        }
    }
}

/**
 * RENDERIZAR RANKING DE CLANS
 */
function renderizarRankingClans(target) {
    const cloudSession = !!(window.SupabaseAPI && window.SupabaseAPI.getUser());
    if (!cloudSession && window.clans.length === 0) {
        console.log("Nenhum clã encontrado ao renderizar. Gerando iniciais...");
        gerarClansIniciais();
    }

    const nivelPlayer = typeof window.nivel !== 'undefined' && window.nivel != null ? window.nivel : 1;

    if (cloudSession && window.clans.length === 0) {
        target.innerHTML = `
        <div style="width: 100%; display: flex; flex-direction: column; box-sizing: border-box;">
            <h4 style="color: #ffcc00; text-align: center; margin-bottom: 15px; font-family: 'Cinzel', serif; font-size: 0.9em; letter-spacing: 1px;">IRON MARCHES CLAN DIRECTORY</h4>
            <p style="color:#aaa; text-align:center; padding: 12px;">${typeof window.t === 'function' ? window.t('game.clan.directoryEmptyCloud') : 'No clans registered on the server yet.'}</p>
            <button class="btn-l2" style="background: #444; margin-top: 15px; width: 100%; height: 45px;" onclick="fecharNpcSocial()">${typeof window.t === 'function' ? window.t('market.backToHub') : 'BACK TO HUB'}</button>
        </div>`;
        return;
    }

    let clansHtml = window.clans.sort((a, b) => (b.membros || []).length - (a.membros || []).length).map((clan, index) => {
        let rankColor = "#aaa";
        if (index === 0) rankColor = "#facc15"; // Gold
        if (index === 1) rankColor = "#cbd5e1"; // Silver
        if (index === 2) rankColor = "#b45309"; // Bronze

        // Verifica se o clã possui castelo
        let castleLabel = "";
        if (typeof window.CastleEngine !== 'undefined') {
            const castelo = window.CastleEngine.castelos.find(c => c.ownerClanId === clan.id);
            if (castelo) {
                castleLabel = `<div style="color: #facc15; font-size: 0.6em; font-weight: bold; margin-top: 2px;">🏰 ${castelo.nome.toUpperCase()} LORD</div>`;
            }
        }

        return `
            <div class="market-card" style="padding: 12px; margin-bottom: 8px; cursor: pointer; border: 1px solid #5a4634; background: rgba(10,7,5,0.7); display: flex; align-items: center; position: relative;" onclick='abrirDetalhesClan(${JSON.stringify(clan.id)})'>
                <div style="position: absolute; top: -5px; left: -5px; background: ${rankColor}; color: #000; font-size: 0.6em; font-weight: bold; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid #000;">${index + 1}</div>
                <div style="font-size: 2.2em; margin-right: 15px; filter: drop-shadow(0 0 5px rgba(255,204,0,0.3));">${clan.logo}</div>
                <div style="flex: 1;">
                    <div style="color: #ffcc00; font-weight: bold; font-family: 'Cinzel', serif; font-size: 1em;">[${clan.sigla}] ${clan.nome}</div>
                    <div style="font-size: 0.7em; color: #888;">Leader: <span style="color:#eee;">${clan.lider}</span> | Members: <span style="color:#eee;">${(clan.membros || []).length}</span></div>
                    ${castleLabel}
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.6em; color: #aaa; text-transform: uppercase;">Req Lvl</div>
                    <div style="color: ${nivelPlayer >= Number(clan.nivelMin ?? 0) ? '#22c55e' : '#ef4444'}; font-weight: bold; font-size: 1.1em;">${clan.nivelMin ?? 0}</div>
                </div>
            </div>
        `;
    }).join('');

    target.innerHTML = `
        <div style="width: 100%; display: flex; flex-direction: column; box-sizing: border-box;">
            <h4 style="color: #ffcc00; text-align: center; margin-bottom: 15px; font-family: 'Cinzel', serif; font-size: 0.9em; letter-spacing: 1px;">IRON MARCHES CLAN DIRECTORY</h4>
            <div style="max-height: 380px; overflow-y: auto; padding-right: 5px;">
                ${clansHtml || '<p style="color:#aaa; text-align:center;">No clans found.</p>'}
            </div>
            <button class="btn-l2" style="background: #444; margin-top: 15px; width: 100%; height: 45px;" onclick="fecharNpcSocial()">BACK TO HUB</button>
        </div>
    `;
}

function renderizarOpcoesClan(target) {
    target.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 15px; width: 100%; align-items: center; margin-top: 5px;">
            <div style="background: rgba(10, 7, 5, 0.9); border: 1px solid #ca8a04; border-radius: 10px; padding: 20px; text-align: center; width: 95%; box-sizing: border-box; box-shadow: inset 0 0 15px #000;">
                <h3 style="color: #ffcc00; margin-bottom: 10px; font-family: 'Cinzel', serif; font-size: 1em;">JOIN A CLAN</h3>
                <p style="color: #aaa; font-size: 0.85em; margin-bottom: 15px;">Join a community to share rewards and fight together.</p>
                <button class="btn-l2" style="background: #ca8a04; color: white;" onclick="renderizarClans('ranking')">BROWSE CLANS</button>
            </div>

            <div style="background: rgba(10, 7, 5, 0.9); border: 1px solid #7e22ce; border-radius: 10px; padding: 20px; text-align: center; width: 95%; box-sizing: border-box; box-shadow: inset 0 0 15px #000;">
                <h3 style="color: #d8b4fe; margin-bottom: 10px; font-family: 'Cinzel', serif; font-size: 1em;">CREATE CLAN</h3>
                <p style="color: #aaa; font-size: 0.85em; margin-bottom: 15px;">Become a leader and build your own empire. Cost: 50,000a</p>
                <button class="btn-l2" style="background: #7e22ce; color: white;" onclick="abrirCriacaoClan()">START FOUNDATION</button>
            </div>

            <button class="btn-l2" style="background: #444; width: 95%; margin-top: 10px;" onclick="fecharNpcSocial()">BACK TO HUB</button>
        </div>
    `;
}

function abrirCriacaoClan() {
    const container = document.getElementById('clan-content-area') || document.getElementById('clans-container-main');
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; padding: 10px; box-sizing: border-box;">
            <div style="background: rgba(18, 13, 10, 0.95); border-radius: 8px; border: 1px solid #5a4634; padding: 15px;">
                <h4 style="color: #ffcc00; text-align: center; margin-bottom: 15px; font-family: 'Cinzel', serif;">NEW CLAN FOUNDATION</h4>
                
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                    <label style="font-size: 0.75em; color: #88745c; font-weight: bold;">CLAN NAME</label>
                    <input type="text" id="clan-name-input" placeholder="e.g. Royal Knights" style="width: 100%; height: 40px; text-align: left; padding: 0 10px; margin: 0; background: #000; color: #fff; font-family: 'Tahoma', sans-serif;" oninput="this.value = this.value.replace(/[^a-zA-Z0-9 ]/g, '');">
                    <div style="color: #88745c; font-size: 0.6em; margin-top: 2px;">${clanT('game.clan.nameHint')}</div>
                </div>

                <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-size: 0.75em; color: #88745c; font-weight: bold;">TAG (SIGLA)</label>
                        <input type="text" id="clan-tag-input" placeholder="RYK" maxlength="4" style="width: 100%; height: 40px; text-align: center; padding: 0; margin: 0; background: #000; color: #fff; font-family: 'Tahoma', sans-serif;" oninput="this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');">
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-size: 0.75em; color: #88745c; font-weight: bold;">REQD. LVL</label>
                        <input type="number" id="clan-lvl-input" value="1" min="1" max="85" style="width: 100%; height: 40px; text-align: center; padding: 0; margin: 0; background: #000; color: #fff; font-family: 'Tahoma', sans-serif;">
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px;">
                    <label style="font-size: 0.75em; color: #88745c; font-weight: bold;">CLAN LOGO</label>
                    <div id="clan-logo-selector" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; background: #000; padding: 10px; border-radius: 5px; border: 1px inset #3d2b1f;">
                        ${clanIcons.map(icon => `<div class="clan-logo-opt" style="cursor: pointer; font-size: 1.5em; text-align: center; padding: 5px; border-radius: 4px;" onclick="selecionarLogoClan(this, '${icon}')">${icon}</div>`).join('')}
                    </div>
                    <input type="hidden" id="clan-logo-val" value="🏰">
                </div>

                <button class="btn-l2" style="background: linear-gradient(180deg, #15803d 0%, #14532d 100%); width: 100%; height: 50px; font-size: 0.9em;" onclick="confirmarCriacaoClan()">CREATE CLAN (50,000a)</button>
                <button class="btn-l2" style="background: #444; width: 100%; margin-top: 8px;" onclick="renderizarClans()">CANCEL</button>
            </div>
        </div>
    `;
    // Seleciona o primeiro por padrão
    setTimeout(() => {
        const firstLogo = document.querySelector('.clan-logo-opt');
        if (firstLogo) selecionarLogoClan(firstLogo as HTMLElement, clanIcons[0]);
    }, 10);
}

function selecionarLogoClan(el: HTMLElement, icon: string): void {
    document.querySelectorAll('.clan-logo-opt').forEach((opt) => {
        const node = opt as HTMLElement;
        node.style.background = 'transparent';
        node.style.border = 'none';
        node.classList.remove('active');
    });
    el.style.background = 'rgba(202, 138, 4, 0.3)';
    el.style.border = '1px solid #ca8a04';
    el.classList.add('active');
    const logoVal = document.getElementById('clan-logo-val') as HTMLInputElement | null;
    if (logoVal) logoVal.value = icon;
}

async function confirmarCriacaoClan(): Promise<void> {
    const nameInput = document.getElementById('clan-name-input') as HTMLInputElement | null;
    const tagInput = document.getElementById('clan-tag-input') as HTMLInputElement | null;
    const lvlInput = document.getElementById('clan-lvl-input') as HTMLInputElement | null;
    const logoInput = document.getElementById('clan-logo-val') as HTMLInputElement | null;

    const nome = (nameInput?.value || '').trim();
    const sigla = (tagInput?.value || '').trim().toUpperCase();
    const lvl = parseInt(lvlInput?.value || '', 10);
    const logo = logoInput?.value || '🏰';

    if (nome.length < 3) return window.mostrarAviso(clanT('game.clan.nameTooShort'));
    if (!/^[a-zA-Z0-9 ]+$/.test(nome)) return window.mostrarAviso(clanT('game.clan.nameInvalid'));
    if (sigla.length < 2 || sigla.length > 4) return window.mostrarAviso(clanT('game.clan.tagInvalid'));
    if (!/^[A-Z0-9]+$/.test(sigla)) return window.mostrarAviso(clanT('game.clan.tagInvalidFormat'));
    
    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        if (clanProcessando) return;
        clanProcessando = true;
        
        try {
            const res = await window.SupabaseAPI.createClan(window.charName, nome, sigla, logo, lvl);
            if (res && res.success) {
                window.mostrarAviso(clanT('game.clan.clanCreated', { name: nome }));
                await iniciarSistemaClans();
                renderizarClans('meu');
                if (typeof window.salvarJogo === 'function') window.salvarJogo();
                if (typeof window.atualizar === 'function') window.atualizar();
            } else {
                const err = res && res.error ? res.error : '';
                const msg = typeof window.cloudRpcMessage === 'function'
                    ? window.cloudRpcMessage(err, { prefix: 'game.clan.rpc', fallbackKey: 'game.clan.rpc.unknown', keyStyle: 'dot' })
                    : clanT('game.clan.rpc.unknown');
                window.mostrarAviso(msg);
            }
        } catch (e) {
            console.error("[Clan Create Error]", e);
        } finally {
            clanProcessando = false;
        }
        return;
    }

    // MODO LOCAL (OFFLINE)
    if (window.adenas < 50000) return window.mostrarAviso(clanT('game.clan.need50000a'));
    if (window.clans.some(c => String(c.nome || '').toLowerCase() === nome.toLowerCase())) return window.mostrarAviso(clanT('game.clan.nameTaken'));
    if (window.clans.some(c => String(c.sigla || '').toUpperCase() === sigla)) return window.mostrarAviso(clanT('game.clan.tagTaken'));
    if (window.clans.some(c => (c.membros || []).includes(window.charName))) return window.mostrarAviso(clanT('game.clan.alreadyInClan'));

    window.adenas -= 50000;

    const maxNumId = window.clans.reduce((acc, c) => {
        const n = typeof c.id === 'number' ? c.id : parseInt(String(c.id), 10);
        return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 0);
    const novoId = maxNumId > 0 ? maxNumId + 1 : Date.now();

    window.clans.push({
        id: novoId,
        nome,
        sigla,
        logo: logo || '🏰',
        lider: window.charName,
        nivelMin: Math.min(85, Math.max(1, lvl || 1)),
        level: 1,
        descricao: clanT('game.clan.foundedBy', { name: window.charName }),
        membros: [window.charName]
    });
    window.playerClanId = novoId;
    salvarClans();
    if (typeof window.salvarJogo === 'function') window.salvarJogo();
    window.mostrarAviso(clanT('game.clan.clanCreated', { name: nome }));
    renderizarClans('meu');
    if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
    window.atualizar();
}

function abrirListaClans() {
    renderizarClans('ranking');
}

function abrirDetalhesClan(id) {
    const clan = window.clans.find(c => c.id === id);
    if (!clan) return;

    clanHydrateRankingForMemberRows().then(function () {
    const container = document.getElementById('clan-content-area') || document.getElementById('clans-container-main');
    
    // Lista de membros
    let membrosHtml = clan.membros.map(membro => {
        let isPlayer = membro === window.charName;
        let infoMembro = clanMemberDisplayInfo(membro);
        if (isPlayer) infoMembro = { nivel: window.nivel, classe: window.charClass };

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.5); padding: 10px 12px; border-radius: 6px; border: 1px solid #3d2b1f; margin-bottom: 6px; cursor: pointer;" onclick="abrirPerfilMembroClan('${membro}')">
                <div style="display: flex; flex-direction: column;">
                    <span style="color: ${isPlayer ? '#22c55e' : '#eee'}; font-weight: bold; font-size: 0.9em;">${membro}</span>
                    <span style="color: #888; font-size: 0.7em;">${infoMembro.classe}</span>
                </div>
                <div style="text-align: right;">
                    <span style="color: #facc15; font-weight: bold; font-size: 0.85em;">Lv. ${infoMembro.nivel}</span>
                    ${membro === clan.lider ? '<div style="color: #ca8a04; font-size: 0.6em; font-weight: bold; margin-top: 2px;">LEADER</div>' : ''}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="width: 100%; display: flex; flex-direction: column; gap: 12px; box-sizing: border-box;">
            <div style="display: flex; align-items: center; gap: 15px; background: linear-gradient(135deg, rgba(61, 43, 31, 0.6) 0%, rgba(18, 13, 10, 0.9) 100%); padding: 15px; border-radius: 10px; border: 2px solid #ca8a04; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                <div style="font-size: 3.5em; filter: drop-shadow(0 0 10px rgba(255,204,0,0.2));">${clan.logo}</div>
                <div style="flex: 1;">
                    <h3 style="color: #ffcc00; margin: 0; font-family: 'Cinzel', serif; letter-spacing: 1px; font-size: 1.1em;">[${clan.sigla}] ${clan.nome}</h3>
                    <div style="color: #aaa; font-size: 0.8em; margin-top: 4px;">Leader: <span style="color: #eee;">${clan.lider}</span> | Level: <span style="color: #22c55e; font-weight: bold;">${clan.level || 1}</span></div>
                    <div style="color: #888; font-size: 0.75em; font-style: italic; margin-top: 6px; line-height: 1.3;">"${clan.descricao}"</div>
                </div>
            </div>

            <div style="background: rgba(10, 7, 5, 0.8); padding: 12px; border-radius: 8px; border: 1px solid #3d2b1f;">
                <h5 style="color: #88745c; margin-bottom: 10px; font-size: 0.8em; text-transform: uppercase; border-bottom: 1px solid #3d2b1f; padding-bottom: 5px; font-family: 'Cinzel', serif;">Clan Members (${clan.membros.length})</h5>
                <div style="max-height: 220px; overflow-y: auto; padding-right: 5px;">
                    ${membrosHtml}
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 5px;">
                ${(() => {
                    const jaPediu = solicitacoesClan.some(req => req.nome === window.charName && req.clanId === clan.id);
                    if (window.playerClanId) return '';
                    if (jaPediu) return `<button class="btn-l2" style="background: #333; flex: 1; height: 50px; color: #888; cursor: default;" disabled>APPLICATION PENDING</button>`;
                    return `<button class="btn-l2" style="background: linear-gradient(180deg, #15803d 0%, #14532d 100%); flex: 1; height: 50px;" onclick='entrarNoClan(${JSON.stringify(clan.id)})'>APPLY TO CLAN</button>`;
                })()}
                <button class="btn-l2" style="background: #444; flex: 1; height: 50px;" onclick="renderizarClans('ranking')">BACK</button>
            </div>
        </div>
    `;
    });
}

function abrirPerfilMembroClan(nome, skipCloudInspect) {
    if (!nome) return;
    const nomeLimpo = nome.trim();

    if (nomeLimpo === window.charName) {
        window.irPara('perfil');
        return;
    }

    // Com sessão na nuvem: inspeção de OUTRO jogador deve vir do Supabase (JSONB autoritativo).
    // LocalStorage com o mesmo nome (save antigo/outra conta neste browser) mostrava equip vazio e bloqueava a nuvem.
    if (
        window.SupabaseAPI &&
        window.SUPABASE_CONFIG &&
        window.SUPABASE_CONFIG.enabled &&
        typeof window.SupabaseAPI.getUser === 'function' &&
        window.SupabaseAPI.getUser() &&
        !skipCloudInspect &&
        typeof window.abrirPerfilChat === 'function'
    ) {
        window.abrirPerfilChat(nomeLimpo, 'clan');
        return;
    }
    
    // 1. Tenta carregar como outro jogador salvo no LocalStorage (Várias tentativas de chave)
    const chavesSave = [
        'l2mini_save_' + nomeLimpo.toLowerCase(),
        'l2mini_save_' + nomeLimpo,
        'l2mini_save_' + nomeLimpo.toUpperCase()
    ];

    let savedData = null;
    for (let chave of chavesSave) {
        savedData = localStorage.getItem(chave);
        if (savedData) break;
    }

    if (savedData) {
        try {
            let jog = JSON.parse(savedData);
            // Monta o objeto com compatibilidade total
            let fakeBot = {
                nome: jog.charName || nomeLimpo,
                nivel: jog.nivel || 1,
                classe: jog.charClass || "Unknown",
                raca: jog.charRace || "Human",
                charGender: jog.charGender === 'Female' || jog.charGender === 'Male' ? jog.charGender : 'Male',
                olympiadPoints: jog.olympiadPoints || 0,
                isBot: false,
                isMage: typeof window.isClasseMagica === 'function' ? window.isClasseMagica(jog.charClass) : false,
                equipamentos: {
                    arma: jog.armaEquipadaBase,
                    armadura: jog.armaduraEquipada,
                    joias: [jog.colarEquipado, jog.brincoEquipado1, jog.brincoEquipado2, jog.anelEquipado1, jog.anelEquipado2].filter(j => j !== null),
                    enchant: jog.enchant || 0
                }
            };

            // Calcula status reais do jogador para exibição
            if (typeof window.OlympiadBots !== 'undefined' && window.OlympiadBots.gerarBotCompleto) {
                const completo = window.OlympiadBots.gerarBotCompleto(fakeBot);
                if (completo && typeof completo === 'object') Object.assign(fakeBot, completo);
            }
            
            window.botAtualVisualizado = fakeBot;
            window.abrirPerfilJogadorRanking(fakeBot.nome, false);
            return;
        } catch(e) { console.error("Erro ao processar save do membro:", e); }
    }

    // 2. Procura o bot no banco de dados se não for jogador real salvo
    let botData = null;
    if (typeof window.dbBotsRanking !== 'undefined') {
        botData = window.dbBotsRanking.find(b => clanBotName(b).toLowerCase() === nomeLimpo.toLowerCase());
    }
    
    if (botData) {
        if (typeof window.abrirPerfilJogadorRanking === 'function') {
            window.abrirPerfilJogadorRanking(botData.nome || botData.farmBot1, true);
        }
        return;
    }

    window.mostrarAviso(clanT('game.clan.profileUnavailable', { name: nomeLimpo }));
}

async function entrarNoClan(id: string | number): Promise<void> {
    const clan = window.clans.find(c => c.id === id);
    if (!clan) return;

    const minLevel = Number(clan.nivelMin ?? 0);
    if ((window.nivel || 0) < minLevel) return window.mostrarAviso(clanT('game.clan.needLevelMin', { level: minLevel }));

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        const res = await window.SupabaseAPI.applyToClan(window.charName, id);
        if (res && res.success) {
            window.mostrarAviso(clanT('game.clan.applicationSent', { tag: String(clan.sigla || ''), name: String(clan.nome || '') }));
            await iniciarSistemaClans();
            renderizarClans('ranking');
        } else {
            const err = (res && res.error) ? res.error : '';
            const msg = typeof window.cloudRpcMessage === 'function'
                ? window.cloudRpcMessage(err, { prefix: 'game.clan.rpc', fallbackKey: 'game.clan.rpc.unknown', keyStyle: 'dot' })
                : clanT('game.clan.rpc.unknown');
            window.mostrarAviso(msg);
        }
        return;
    }

    // MODO LOCAL (OFFLINE)
    const jaPediu = solicitacoesClan.some(req => req.nome === window.charName && req.clanId === id);
    if (jaPediu) return window.mostrarAviso(clanT('game.clan.applicationPending'));

    solicitacoesClan.push({
        nome: window.charName,
        clanId: id,
        timestamp: Date.now()
    });
    
    salvarClans();
    
    if (typeof window.enviarMail === 'function') {
        window.enviarMail(String(clan.lider || ''), window.charName || '', 'New Clan Application', 'clan', { nome: window.charName });
    }

    window.mostrarAviso(clanT('game.clan.applicationSent', { tag: String(clan.sigla || ''), name: String(clan.nome || '') }));
    renderizarClans('ranking');
}

function renderizarMeuClan(target) {
    const clan = window.clans.find(c => c.id === window.playerClanId);
    if (!clan) {
        window.playerClanId = null;
        renderizarOpcoesClan(target);
        return;
    }

    clanHydrateRankingForMemberRows().then(function () {
    const isLider = clan.lider === window.charName;
    const container = target || document.getElementById('clan-content-area') || document.getElementById('clans-container-main');
    
    // Lista de bônus ativos (se houver)
    let bonusesHtml = '';
    
    // NOVO: BOTÃO DE GUERRA DE CLÃS (REMOVIDO DAQUI POR SOLICITAÇÃO)
    let warButtonHtml = '';

    // Verifica dominação de castelo para o meu clã
    let castleStatusHtml = '';
    if (typeof window.CastleEngine !== 'undefined') {
        const meuCastelo = window.CastleEngine.castelos.find(c => c.ownerClanId === window.playerClanId);
        if (meuCastelo) {
            castleStatusHtml = `
                <div style="background: linear-gradient(135deg, #166534, #064e3b); border: 1px solid #22c55e; border-radius: 8px; padding: 10px; margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 2em;">🏰</div>
                    <div style="flex: 1;">
                        <div style="color: #22c55e; font-size: 0.6em; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Ruling Territory</div>
                        <div style="color: #fff; font-weight: bold; font-family: 'Cinzel', serif; font-size: 0.9em;">${meuCastelo.nome}</div>
                    </div>
                    <button class="btn-l2" style="background: #15803d; border: 1px solid #22c55e; height: 30px; font-size: 0.6em; padding: 0 10px;" onclick="CastleEngine.abrirMenuLiderCastelo(CastleEngine.castelos.find(c => c.id === '${meuCastelo.id}'))">MANAGE</button>
                </div>
            `;
        }
    }

    if (clan.level > 1) {
        let list = [];
        if (clan.level >= 2) list.push("P.Atk +2%");
        if (clan.level >= 3) list.push("P.Def +2%");
        if (clan.level >= 4) list.push("Max HP +3%");
        if (clan.level >= 5) list.push("M.Atk +3%");
        bonusesHtml = `
            <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid #22c55e; border-radius: 6px; padding: 8px; margin-bottom: 12px;">
                <div style="color: #22c55e; font-size: 0.7em; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Active Clan Skills</div>
                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                    ${list.map(b => `<span style="background: rgba(0,0,0,0.4); color: #eee; font-size: 0.65em; padding: 2px 6px; border-radius: 4px; border: 1px solid #22c55e;">${b}</span>`).join('')}
                </div>
            </div>
        `;
    }

    // Lista de solicitações pendentes (apenas para o líder e deste clã)
    let reqsHtml = '';
    const pedidosDesteClan = solicitacoesClan.filter(req => 
        (typeof req === 'object' ? req.clanId === window.playerClanId : isLider) // Compatibilidade com bots antigos
    );

    if (isLider && pedidosDesteClan.length > 0) {
        reqsHtml = `
            <div style="background: rgba(126, 34, 206, 0.2); border: 1px solid #7e22ce; border-radius: 8px; padding: 10px; margin-bottom: 12px;">
                <h6 style="color: #d8b4fe; margin: 0 0 8px 0; font-size: 0.75em; text-transform: uppercase; font-family: 'Cinzel', serif;">New Applications (${pedidosDesteClan.length})</h6>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    ${pedidosDesteClan.map(req => {
                        const nome = typeof req === 'object' ? req.nome : req;
                        const appId = typeof req === 'object' ? req.id : null;
                        const appIdEsc = appId ? `'${appId}'` : 'null';
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.4); padding: 5px 8px; border-radius: 4px;">
                                <span style="color: #eee; font-size: 0.85em;">${nome}</span>
                                <div style="display: flex; gap: 5px;">
                                    <button onclick="responderSolicitacao('${nome}', true, ${appIdEsc})" style="background: #15803d; border: none; color: white; border-radius: 3px; padding: 3px 8px; font-size: 0.7em; cursor: pointer;">ACCEPT</button>
                                    <button onclick="responderSolicitacao('${nome}', false, ${appIdEsc})" style="background: #991b1b; border: none; color: white; border-radius: 3px; padding: 3px 8px; font-size: 0.7em; cursor: pointer;">DECLINE</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // Lista de membros
    let membrosHtml = clan.membros.map(membro => {
        let isPlayer = membro === window.charName;
        let infoMembro = clanMemberDisplayInfo(membro);
        if (isPlayer) infoMembro = { nivel: window.nivel, classe: window.charClass };

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.5); padding: 10px 12px; border-radius: 6px; border: 1px solid #3d2b1f; margin-bottom: 6px; cursor: pointer; position: relative;" onclick="abrirPerfilMembroClan('${membro}')">
                <div style="display: flex; flex-direction: column;">
                    <span style="color: ${isPlayer ? '#22c55e' : '#eee'}; font-weight: bold; font-size: 0.9em;">${membro}</span>
                    <span style="color: #888; font-size: 0.7em;">${infoMembro.classe}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="text-align: right;">
                        <div style="color: #facc15; font-weight: bold; font-size: 0.85em;">Lv. ${infoMembro.nivel}</div>
                        ${membro === clan.lider ? '<span style="color: #ca8a04; font-size: 0.6em; font-weight: bold;">LEADER</span>' : ''}
                    </div>
                    ${isLider && !isPlayer ? `
                        <button onclick="event.stopPropagation(); abrirSegurancaClan('expulsar', '${membro}')" style="background: #991b1b; border: 1px solid #ef4444; color: #fff; border-radius: 4px; padding: 4px 8px; font-size: 0.6em; cursor: pointer; text-transform: uppercase; font-weight: bold;">Kick</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="width: 100%; display: flex; flex-direction: column; gap: 12px; box-sizing: border-box;">
            <div style="display: flex; align-items: center; gap: 15px; background: linear-gradient(135deg, rgba(61, 43, 31, 0.6) 0%, rgba(18, 13, 10, 0.9) 100%); padding: 15px; border-radius: 10px; border: 2px solid #ca8a04; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                <div style="font-size: 3.5em;">${clan.logo}</div>
                <div style="flex: 1;">
                    <h3 style="color: #ffcc00; margin: 0; font-family: 'Cinzel', serif; letter-spacing: 1px; font-size: 1.1em;">[${clan.sigla}] ${clan.nome}</h3>
                    <div style="color: #aaa; font-size: 0.8em; margin-top: 2px;">Leader: <span style="color: #fff;">${clan.lider}</span></div>
                    <div style="display: flex; gap: 10px; margin-top: 8px;">
                        <span style="color: #22c55e; font-size: 0.75em; font-weight: bold; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 4px;">LVL ${clan.level || 1}</span>
                        <span style="color: #60a5fa; font-size: 0.75em; font-weight: bold; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 4px;">${clan.membros.length} MEMBERS</span>
                    </div>
                </div>
            </div>

            ${reqsHtml}

            ${castleStatusHtml}

            ${warButtonHtml}

            <div style="background: rgba(10, 7, 5, 0.8); padding: 12px; border-radius: 8px; border: 1px solid #3d2b1f;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #3d2b1f; padding-bottom: 5px;">
                    <h5 style="color: #88745c; margin: 0; font-size: 0.8em; text-transform: uppercase; font-family: 'Cinzel', serif;">Clan Members List</h5>
                    ${isLider ? `<button onclick="convidarMembroBot()" style="background: #15803d; border: 1px solid #22c55e; color: #fff; border-radius: 4px; padding: 2px 10px; font-size: 0.65em; cursor: pointer; text-transform: uppercase; font-weight: bold;">+ Recruit</button>` : ''}
                </div>
                <div style="max-height: 200px; overflow-y: auto; padding-right: 5px;">
                    ${membrosHtml}
                </div>
            </div>

            ${bonusesHtml}

            <div style="display: flex; gap: 10px; margin-top: 5px;">
                ${isLider ? `<button class="btn-l2" style="background: linear-gradient(180deg, #ca8a04 0%, #a16207 100%); flex: 1; font-size: 0.8em; height: 50px;" onclick="abrirConfiguracoesClan()">CLAN SETTINGS</button>` : ''}
                <button class="btn-l2" style="background: linear-gradient(180deg, #991b1b 0%, #7f1d1d 100%); flex: 1; font-size: 0.8em; height: 50px; border: 1px solid #ef4444;" onclick="abrirSegurancaClan('sair')">LEAVE CLAN</button>
            </div>
            <button class="btn-l2" style="background: #444; width: 100%; font-size: 0.8em; height: 40px; margin-top: 5px;" onclick="fecharNpcSocial()">CLOSE</button>
        </div>
    `;
    });
}

/** @returns {Promise<boolean>|boolean} true se a ação concluiu (correio pode arquivar); false se falhou ou abortou */
async function responderSolicitacao(
    nome: string,
    aceito: boolean,
    applicationId: string | number | null = null
): Promise<boolean> {
    let clan = window.clans.find(c => c.id === window.playerClanId);
    if (!clan && window.charName && window.SupabaseAPI && window.SupabaseAPI.getUser() && typeof window.iniciarSistemaClans === 'function') {
        await window.iniciarSistemaClans();
        clan = window.clans.find(c => c.id === window.playerClanId);
    }
    if (!clan) return false;

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        if (!applicationId) {
            window.mostrarAviso(clanT('game.clan.applicationCloudIdMissing'));
            return false;
        }
        const res = await window.SupabaseAPI.respondClanApplication(window.charName, applicationId, aceito);
        if (res && res.success) {
            window.mostrarAviso(aceito ? clanT('game.clan.memberJoined', { name: nome }) : clanT('game.clan.applicationRejected'));
            await iniciarSistemaClans();
            renderizarClans('meu');
            return true;
        }
        window.mostrarAviso((res && res.error) ? res.error : clanT('game.clan.rpc.unknown'));
        return false;
    }

    // MODO LOCAL (OFFLINE)
    if (aceito) {
        if (!clan.membros.includes(nome)) {
            // Se o bot já estava em outro clã, remove de lá para evitar duplicação
            window.clans.forEach(c => {
                if (c.id !== clan.id) {
                    c.membros = c.membros.filter(m => m !== nome);
                }
            });

            clan.membros.push(nome);
            
            // Notifica o jogador aceito via Mailbox Profissional
            if (typeof window.enviarMail === 'function') {
                window.enviarMail(nome, window.charName, 'Clan Application Accepted', 'clan', {
                    clanNome: clan.nome, 
                    clanSigla: clan.sigla 
                });
            }

            // Se o aceito for o personagem atual, precisamos atualizar o estado dele
            if (nome === window.charName) {
                window.playerClanId = clan.id;
            }
        }
        window.mostrarAviso(clanT('game.clan.memberJoined', { name: nome }));
    } else {
        window.mostrarAviso(clanT('game.clan.applicationRejected'));
    }

    // Remove a solicitação (seja objeto ou string antiga de bot)
    solicitacoesClan = solicitacoesClan.filter(req => 
        (typeof req === 'object' ? req.nome !== nome : req !== nome)
    );
    
    salvarClans();
    atualizarNotificacaoSocial();
    if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
    renderizarClans('meu');
    return true;
}

async function expulsarMembro(membroNome) {
    const clan = window.clans.find(c => c.id === window.playerClanId);
    if (!clan || clan.lider !== window.charName) return;

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        const res = await window.SupabaseAPI.leaveClan(membroNome, window.playerClanId);
        if (res && res.success) {
            window.mostrarAviso(clanT('game.clan.memberExpelled', { name: membroNome }));
            await iniciarSistemaClans();
            renderizarClans('meu');
        } else {
            window.mostrarAviso((res && res.error) ? res.error : clanT('game.clan.rpc.unknown'));
        }
        return;
    }

    // MODO LOCAL (OFFLINE)
    clan.membros = clan.membros.filter(m => m !== membroNome);
    salvarClans();
    window.mostrarAviso(clanT('game.clan.memberExpelled', { name: membroNome }));
    renderizarClans('meu');
}

function convidarMembroBot(): void {
    const clan = window.clans.find(c => c.id === window.playerClanId);
    if (!clan || clan.lider !== window.charName) return;

    const botsSemClan = window.dbBotsRanking.filter(bot => {
        const nome = clanBotName(bot);
        return nome && !window.clans.some(c => c.membros.includes(nome));
    });

    if (botsSemClan.length === 0) {
        return window.mostrarAviso(clanT('game.clan.noFreelanceBots'));
    }

    const botSorteado = botsSemClan[Math.floor(Math.random() * botsSemClan.length)];
    const nomeBot = clanBotName(botSorteado);
    if (!nomeBot) return;

    clan.membros.push(nomeBot);
    salvarClans();
    window.mostrarAviso(clanT('game.clan.botJoined', { name: nomeBot }));
    renderizarClans('meu');
}

async function sairDoClan() {
    const clan = window.clans.find(c => c.id === window.playerClanId);
    if (!clan) return;

    if (clan.lider === window.charName && clan.membros.length > 1) {
        return window.mostrarAviso(clanT('game.clan.leaderCannotLeave'));
    }

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        const res = await window.SupabaseAPI.leaveClan(window.charName, window.playerClanId);
        if (res && res.success) {
            window.playerClanId = null;
            await iniciarSistemaClans();
            window.mostrarAviso(clanT('game.clan.youLeftClan'));
            if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
            renderizarClans();
            window.atualizar();
            if (typeof window.salvarJogo === 'function') window.salvarJogo();
        } else {
            window.mostrarAviso((res && res.error) ? res.error : clanT('game.clan.rpc.unknown'));
        }
        return;
    }

    // MODO LOCAL (OFFLINE)
    clan.membros = clan.membros.filter(m => m !== window.charName);
    if (clan.membros.length === 0) {
        window.clans = window.clans.filter(c => c.id !== clan.id);
    }
    window.playerClanId = null;
    salvarClans();
    window.mostrarAviso(clanT('game.clan.youLeftClan'));
    if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
    renderizarClans();
    window.atualizar();
}

/**
 * Interface de Gerenciamento do Clã (Líder apenas)
 */
function abrirConfiguracoesClan() {
    const clan = window.clans.find(c => c.id === window.playerClanId);
    if (!clan || clan.lider !== window.charName) return;

    const container = document.getElementById('clan-content-area');
    
    const custosNivel = {
        1: 100000,
        2: 250000,
        3: 500000,
        4: 1000000
    };
    
    const proximoNivel = (clan.level || 1) + 1;
    const custo = custosNivel[clan.level || 1] || 0;
    
    const bonusHtml = [
        { lvl: 2, bonus: "+2% Physical Attack" },
        { lvl: 3, bonus: "+2% Physical Defense" },
        { lvl: 4, bonus: "+3% Maximum HP" },
        { lvl: 5, bonus: "+3% Magical Attack" }
    ].map(b => `<div style="font-size: 0.75em; color: ${clan.level >= b.lvl ? '#22c55e' : '#666'};">${clan.level >= b.lvl ? '✅' : '🔒'} Lvl ${b.lvl}: ${b.bonus}</div>`).join('');

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box;">
            <div style="background: rgba(18, 13, 10, 0.95); border-radius: 8px; border: 1px solid #ca8a04; padding: 15px;">
                <h4 style="color: #ffcc00; text-align: center; margin-bottom: 15px; font-family: 'Cinzel', serif;">CLAN MANAGEMENT</h4>
                
                <!-- Ajuste de Nível Mínimo -->
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #3d2b1f;">
                    <label style="font-size: 0.75em; color: #88745c; font-weight: bold; display: block; margin-bottom: 8px;">MINIMUM LEVEL FOR APPLICANTS</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="number" id="clan-min-lvl-edit" value="${clan.nivelMin}" min="1" max="85" style="flex: 1; height: 35px; background: #000; color: #fff; border: 1px solid #5a4634; text-align: center;">
                        <button class="btn-l2" style="background: #1e3a8a; height: 35px; width: 80px; font-size: 0.7em;" onclick="atualizarNivelMinClan()">UPDATE</button>
                    </div>
                </div>

                <!-- Upgrade de Clã -->
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #3d2b1f;">
                    <label style="font-size: 0.75em; color: #88745c; font-weight: bold; display: block; margin-bottom: 8px;">CLAN PROGRESSION (LEVEL ${clan.level || 1})</label>
                    <div style="margin-bottom: 10px;">
                        ${bonusHtml}
                    </div>
                    ${proximoNivel <= 5 ? `
                        <button class="btn-l2" style="background: linear-gradient(180deg, #15803d 0%, #14532d 100%); width: 100%; height: 45px; font-size: 0.8em;" onclick="subirNivelClan()">
                            UPGRADE TO LEVEL ${proximoNivel} (${custo.toLocaleString()}a)
                        </button>
                    ` : '<div style="color: #facc15; font-size: 0.8em; text-align: center; font-weight: bold;">MAX CLAN LEVEL REACHED</div>'}
                </div>

                <!-- Logo & Descrição -->
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #3d2b1f;">
                    <label style="font-size: 0.75em; color: #88745c; font-weight: bold; display: block; margin-bottom: 8px;">CHANGE CLAN LOGO</label>
                    <div id="clan-logo-selector-edit" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; background: #000; padding: 10px; border-radius: 5px; border: 1px inset #3d2b1f; margin-bottom: 8px;">
                        ${clanIcons.map(icon => `<div class="clan-logo-opt ${clan.logo === icon ? 'active' : ''}" style="cursor: pointer; font-size: 1.5em; text-align: center; padding: 5px; border-radius: 4px; ${clan.logo === icon ? 'background: rgba(202, 138, 4, 0.3); border: 1px solid #ca8a04;' : ''}" onclick="atualizarLogoClan(this, '${icon}')">${icon}</div>`).join('')}
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #3d2b1f;">
                    <label style="font-size: 0.75em; color: #88745c; font-weight: bold; display: block; margin-bottom: 8px;">CLAN DESCRIPTION</label>
                    <textarea id="clan-desc-edit" style="width: 100%; min-height: 60px; background: #000; color: #fff; border: 1px solid #5a4634; padding: 8px; font-size: 0.8em; font-family: sans-serif; resize: none; margin-bottom: 8px;">${clan.descricao || ""}</textarea>
                    <button class="btn-l2" style="background: #1e3a8a; width: 100%; height: 35px; font-size: 0.7em;" onclick="atualizarDescricaoClan()">SAVE DESCRIPTION</button>
                </div>

                <!-- Perigo: Dissolver -->
                <div style="border-top: 1px solid #3d2b1f; padding-top: 15px;">
                    <button class="btn-l2" style="background: linear-gradient(180deg, #991b1b 0%, #7f1d1d 100%); width: 100%; height: 45px; font-size: 0.8em; border: 1px solid #ef4444;" onclick="abrirSegurancaClan('dissolver')">DISSOLVE CLAN</button>
                </div>

                <button class="btn-l2" style="background: #444; width: 100%; margin-top: 12px;" onclick="renderizarClans('meu')">BACK</button>
            </div>
        </div>
    `;
}

function atualizarNivelMinClan(): void {
    const clan = window.clans.find(c => c.id === window.playerClanId);
    if (!clan) return;
    const lvlInput = document.getElementById('clan-min-lvl-edit') as HTMLInputElement | null;
    const novoLvl = parseInt(lvlInput?.value || '', 10);
    if (isNaN(novoLvl) || novoLvl < 1 || novoLvl > 85) return window.mostrarAviso(clanT('game.clan.invalidLevel'));

    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        window.SupabaseAPI.updateClanSettings(window.playerClanId, { min_level: novoLvl }).then(async (res) => {
            if (res && res.success) {
                await iniciarSistemaClans();
                window.mostrarAviso(clanT('game.clan.minLevelUpdated', { level: novoLvl }));
                abrirConfiguracoesClan();
            } else {
                window.mostrarAviso((res && res.error) ? res.error : clanT('game.clan.rpc.unknown'));
            }
        });
        return;
    }

    clan.nivelMin = novoLvl;
    salvarClans();
    window.mostrarAviso(clanT('game.clan.minLevelUpdated', { level: novoLvl }));
    abrirConfiguracoesClan();
}

function atualizarLogoClan(el: HTMLElement, icon: string): void {
    const clan = window.clans.find(c => c.id === window.playerClanId);
    if (!clan) return;

    document.querySelectorAll('#clan-logo-selector-edit .clan-logo-opt').forEach((opt) => {
        const node = opt as HTMLElement;
        node.style.background = 'transparent';
        node.style.border = 'none';
    });
    el.style.background = 'rgba(202, 138, 4, 0.3)';
    el.style.border = '1px solid #ca8a04';

    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        window.SupabaseAPI.updateClanSettings(window.playerClanId, { logo: icon }).then(async (res) => {
            if (res && res.success) {
                clan.logo = icon;
                await iniciarSistemaClans();
                window.mostrarAviso(clanT('game.clan.logoUpdated'));
                abrirConfiguracoesClan();
            } else {
                window.mostrarAviso((res && res.error) ? res.error : clanT('game.clan.rpc.unknown'));
            }
        });
        return;
    }

    clan.logo = icon;
    salvarClans();
    window.mostrarAviso(clanT('game.clan.logoUpdated'));
}

function atualizarDescricaoClan(): void {
    const clan = window.clans.find(c => c.id === window.playerClanId);
    if (!clan) return;
    const descInput = document.getElementById('clan-desc-edit') as HTMLTextAreaElement | null;
    const desc = (descInput?.value || '').trim();
    if (desc.length > 200) return window.mostrarAviso(clanT('game.clan.descTooLong'));

    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        window.SupabaseAPI.updateClanSettings(window.playerClanId, { description: desc }).then(async (res) => {
            if (res && res.success) {
                clan.descricao = desc;
                await iniciarSistemaClans();
                window.mostrarAviso(clanT('game.clan.descUpdated'));
                abrirConfiguracoesClan();
            } else {
                window.mostrarAviso((res && res.error) ? res.error : clanT('game.clan.rpc.unknown'));
            }
        });
        return;
    }

    clan.descricao = desc;
    salvarClans();
    window.mostrarAviso(clanT('game.clan.descUpdated'));
}

async function subirNivelClan() {
    const clan = window.clans.find(c => c.id === window.playerClanId);
    if (!clan) return;

    const custosNivel = { 1: 100000, 2: 250000, 3: 500000, 4: 1000000 };
    const custo = custosNivel[clan.level || 1];

    if (!custo) return window.mostrarAviso(clanT('game.clan.maxClanLevel'));
    if (window.adenas < custo) return window.mostrarAviso(clanT('game.clan.needAdena', { amount: custo.toLocaleString() }));

    const confirmado = await window.l2Confirm(clanT('game.clan.upgradeConfirm', { nextLevel: (clan.level || 1) + 1, cost: custo.toLocaleString() }), clanT('game.clan.upgradeTitle'));
    if (!confirmado) return;

    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        const res = await window.SupabaseAPI.upgradeClanLevel(window.playerClanId);
        if (res && res.success) {
            await iniciarSistemaClans();
            window.mostrarAviso(clanT('game.clan.clanUpgraded', { level: res.level || ((clan.level || 1) + 1) }));
            abrirConfiguracoesClan();
            if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
            if (typeof window.salvarJogo === 'function') window.salvarJogo();
            window.atualizar();
        } else {
            window.mostrarAviso((res && res.error) ? res.error : clanT('game.clan.rpc.unknown'));
        }
        return;
    }

    window.adenas -= custo;
    clan.level = (clan.level || 1) + 1;
    salvarClans();
    window.atualizar();
    window.mostrarAviso(clanT('game.clan.clanUpgraded', { level: clan.level }));
    abrirConfiguracoesClan();
    if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
}

async function dissolverClan() {
    const clan = window.clans.find(c => c.id === window.playerClanId);
    if (!clan) return;

    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        const res = await window.SupabaseAPI.dissolveClan(window.playerClanId);
        if (res && res.success) {
            window.playerClanId = null;
            await iniciarSistemaClans();
            window.mostrarAviso(clanT('game.clan.clanDissolved'));
            if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
            renderizarClans();
            window.atualizar();
            if (typeof window.salvarJogo === 'function') window.salvarJogo();
        } else {
            window.mostrarAviso((res && res.error) ? res.error : clanT('game.clan.rpc.unknown'));
        }
        return;
    }

    window.clans = window.clans.filter(c => c.id !== window.playerClanId);
    window.playerClanId = null;
    salvarClans();
    window.mostrarAviso(clanT('game.clan.clanDissolved'));
    if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
    renderizarClans();
    window.atualizar();
}

/**
 * Janela de Segurança para Ações Críticas
 */
function abrirSegurancaClan(acao, alvo = null) {
    const clan = window.clans.find(c => c.id === window.playerClanId);
    if (!clan) return;

    const isLider = clan.lider === window.charName;
    const container = document.getElementById('clan-content-area');
    
    let titulo = "SECURITY VERIFICATION";
    let mensagem = "";
    let btnConfirmar = "";

    if (acao === 'sair') {
        if (isLider && clan.membros.length > 1) {
            return window.mostrarAviso(clanT('game.clan.leaderCannotLeaveDissolve'));
        }
        mensagem = "Are you sure you want to LEAVE the clan? All clan bonuses will be lost immediately.";
        btnConfirmar = `<button class="btn-l2" style="background: #991b1b;" onclick="sairDoClan()">CONFIRM DEPARTURE</button>`;
    } else if (acao === 'expulsar') {
        mensagem = `Confirm expulsion of member <b style="color:#ffcc00;">${alvo}</b>? This action is permanent.`;
        btnConfirmar = `<button class="btn-l2" style="background: #991b1b;" onclick="expulsarMembro('${alvo}')">CONFIRM KICK</button>`;
    } else if (acao === 'dissolver') {
        mensagem = "EXTREME DANGER: You are about to DISSOLVE the clan. This will kick ALL members and delete the clan forever!";
        btnConfirmar = `<button class="btn-l2" style="background: #991b1b;" onclick="dissolverClan()">DISSOLVE CLAN FOREVER</button>`;
    }

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box;">
            <div style="background: rgba(20, 5, 5, 0.98); border-radius: 8px; border: 2px solid #ef4444; padding: 20px; text-align: center; box-shadow: 0 0 30px rgba(239, 68, 68, 0.3);">
                <div style="font-size: 3em; margin-bottom: 10px;">⚠️</div>
                <h4 style="color: #ef4444; margin-bottom: 15px; font-family: 'Cinzel', serif; letter-spacing: 1px;">${titulo}</h4>
                
                <p style="color: #eee; font-size: 0.9em; line-height: 1.5; margin-bottom: 25px;">
                    ${mensagem}
                </p>

                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${btnConfirmar}
                    <button class="btn-l2" style="background: #444;" onclick="${acao === 'dissolver' ? 'abrirConfiguracoesClan()' : 'renderizarClans(\'meu\')'}">CANCEL</button>
                </div>
            </div>
        </div>
    `;
}

// Inicializa o sistema ao carregar
window.addEventListener('load', () => {
    const checkDb = setInterval(() => {
        if (typeof window.dbBotsRanking !== 'undefined') {
            clearInterval(checkDb);
            void window.iniciarSistemaClans();
        }
    }, 100);
    setTimeout(() => clearInterval(checkDb), 5000);
});

window.iniciarSistemaClans = iniciarSistemaClans;
window.renderizarClans = renderizarClans;
window.abrirCriacaoClan = abrirCriacaoClan;
window.selecionarLogoClan = selecionarLogoClan;
window.confirmarCriacaoClan = confirmarCriacaoClan;
window.abrirListaClans = abrirListaClans;
window.abrirDetalhesClan = abrirDetalhesClan;
window.abrirPerfilMembroClan = abrirPerfilMembroClan;
window.entrarNoClan = entrarNoClan;
window.responderSolicitacao = responderSolicitacao;
window.expulsarMembro = expulsarMembro;
window.convidarMembroBot = convidarMembroBot;
window.sairDoClan = sairDoClan;
window.abrirConfiguracoesClan = abrirConfiguracoesClan;
window.atualizarNivelMinClan = atualizarNivelMinClan;
window.atualizarLogoClan = atualizarLogoClan;
window.atualizarDescricaoClan = atualizarDescricaoClan;
window.subirNivelClan = subirNivelClan;
window.dissolverClan = dissolverClan;
window.abrirSegurancaClan = abrirSegurancaClan;

export {};
