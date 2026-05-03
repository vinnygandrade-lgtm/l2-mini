/**
 * UI_CLANS.JS
 * Sistema de Clãs, Alianças e Gerenciamento Social
 */

function clanT(key, params) {
    return typeof window.t === 'function' ? window.t(key, params) : key;
}

let clanProcessando = false;
// solicitacoesClan, clans e playerClanId movidos para core_globals.js como var global
let vidaMundialInterval = null;

// Ícones disponíveis para Clãs
const clanIcons = [
    "🏰", "⚔️", "🛡️", "🐉", "🦅", "🐺", "🔥", "❄️", "⚡", "🔱", "🏆", "👑", "🌑", "🌟"
];

/**
 * Inicializa o sistema de clãs
 */
async function iniciarSistemaClans() {
    if (!window.charName) return console.log("Sistema de clãs aguardando identificação do herói...");
    console.log(`Iniciando sistema de clãs para [${window.charName}]...`);
    
    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        console.log("🔗 [Clãs] Sincronizando com a nuvem (Livre de Bots)...");
        
        // 1. Carregar Clãs Reais da Nuvem
        const cloudClans = await window.SupabaseAPI.fetchClans();
        clans = cloudClans.map(c => ({
            id: c.id,
            nome: c.name,
            sigla: c.tag,
            logo: c.logo,
            lider: c.leader_name,
            nivelMin: c.min_level,
            level: c.level,
            descricao: c.description,
            membros: c.membros || []
        }));

        // 2. Identificar Clã do Player
        const meuClan = clans.find(c => c.membros.includes(window.charName));
        playerClanId = meuClan ? meuClan.id : null;

        // 3. Carregar Solicitações Reais
        const cloudReqs = await window.SupabaseAPI.fetchClanApplications(window.charName);
        solicitacoesClan = cloudReqs.map(r => ({
            id: r.id,
            nome: r.char_name,
            clanId: r.clan_id,
            timestamp: new Date(r.created_at).getTime(),
            clans: r.clans
        }));

        console.log(`[Clãs Cloud] ${clans.length} clãs ativos. Player em: ${meuClan ? meuClan.nome : 'Nenhum'}`);
        
        atualizarNotificacaoSocial();
        if (typeof calcularStatusGlobais === 'function') calcularStatusGlobais();
        return;
    }

    // MODO LOCAL (OFFLINE - MANTIDO PARA COMPATIBILIDADE)
    let savedClans = localStorage.getItem('l2mini_clans');
    if (savedClans && savedClans !== "[]") {
        try {
            clans = JSON.parse(savedClans) || [];
            const temClasAntigos = clans.some(c => c.nome === "Lendários" || c.nome === "Elite");
            if (temClasAntigos) {
                gerarClansIniciais();
            } else {
                const temLiderFake = clans.some(c => c.lider === "Bot Lider" || !c.lider);
                if (temLiderFake) {
                    corrigirLideresClans();
                }
            }
        } catch(e) { clans = []; gerarClansIniciais(); }
    } else {
        gerarClansIniciais();
    }

    let savedPlayerClan = localStorage.getItem('l2mini_player_clan_' + charName);
    if (savedPlayerClan && savedPlayerClan !== "null") {
        try {
            playerClanId = JSON.parse(savedPlayerClan);
        } catch(e) { playerClanId = null; }
    } else {
        let clanEncontrado = clans.find(c => c.membros.includes(charName));
        if (clanEncontrado) {
            playerClanId = clanEncontrado.id;
            localStorage.setItem('l2mini_player_clan_' + charName, JSON.stringify(playerClanId));
        } else {
            playerClanId = null;
        }
    }

    let savedReqs = localStorage.getItem('l2mini_clan_reqs');
    if (savedReqs && savedReqs !== "null" && savedReqs !== "undefined") {
        try {
            solicitacoesClan = JSON.parse(savedReqs) || [];
        } catch(e) { solicitacoesClan = []; }
    } else {
        solicitacoesClan = [];
    }

    if (!vidaMundialInterval) {
        iniciarVidaMundialClans();
    }
    atualizarNotificacaoSocial();
    
    if (typeof charName !== 'undefined' && charName && typeof calcularStatusGlobais === 'function') {
        calcularStatusGlobais();
    }
}

/**
 * Corrige líderes sem apagar o clã do player
 */
function corrigirLideresClans() {
    let botsDisponiveis = [];
    if (typeof dbBotsRanking !== 'undefined') {
        botsDisponiveis = [...dbBotsRanking].sort((a, b) => b.olympiadPoints - a.olympiadPoints);
    }

    clans.forEach((c, i) => {
        if (c.lider === "Bot Lider" || !c.lider) {
            let botLider = botsDisponiveis[i % botsDisponiveis.length];
            c.lider = botLider.nome || botLider.farmBot1;
            if (!c.membros.includes(c.lider)) c.membros.unshift(c.lider);
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
        if (!clans || clans.length === 0 || typeof dbBotsRanking === 'undefined') return;

        const agora = Date.now();
        
        // 1. DINÂMICA DE EXPULSÃO (KICKING) E SAÍDA ESPONTÂNEA
        clans.forEach(clan => {
            if (clan.membros.length <= 1) return;

            // Bots saem de clãs alheios (incluindo do player) por descontentamento ou ambição
            clan.membros.forEach(membroNome => {
                if (membroNome === clan.lider) return; // Líderes não saem assim

                const botData = dbBotsRanking.find(b => (b.nome || b.farmBot1) === membroNome);
                if (!botData) return;

                // Chance base de 5% de sair por "rotatividade"
                let chanceSair = 0.05;

                // Se o bot for nível muito alto para o clã, ele quer sair para um clã melhor
                const nivelMedio = clan.membros.reduce((acc, m) => {
                    const b = dbBotsRanking.find(x => (x.nome || x.farmBot1) === m);
                    return acc + (b ? b.nivel : 20);
                }, 0) / clan.membros.length;

                if (botData.nivel > nivelMedio + 15) chanceSair += 0.20; // Muito forte para o clã atual

                if (Math.random() < chanceSair) {
                    clan.membros = clan.membros.filter(m => m !== membroNome);
                    // Se o player for o líder, avisa via log
                    if (clan.id === playerClanId && clan.lider === charName) {
                        escreverLog(`<span style="color:#ef4444;">[Clan] ${membroNome} has left your clan seeking better opportunities.</span>`);
                    }
                    console.log(`[ClanEngine] ${membroNome} saiu do clã ${clan.nome}`);
                }
            });

            // Líderes Bots expulsam membros fracos para "limpar" o clã (10% de chance por ciclo)
            if (clan.lider !== charName && Math.random() < 0.10 && clan.membros.length > 3) {
                // Encontra o membro de menor nível (que não seja o líder)
                let membroMaisFraco = null;
                let menorNivel = 999;

                clan.membros.forEach(m => {
                    if (m === clan.lider) return;
                    const b = dbBotsRanking.find(x => (x.nome || x.farmBot1) === m);
                    const lvl = b ? b.nivel : 1;
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
        const botsSemClan = dbBotsRanking.filter(b => {
            const nome = b.nome || b.farmBot1;
            return !clans.some(c => c.membros.includes(nome));
        });

        if (botsSemClan.length > 0) {
            // Pega até 2 bots por ciclo para tentar entrar em algum clã
            const candidatos = botsSemClan.sort(() => 0.5 - Math.random()).slice(0, 2);

            candidatos.forEach(bot => {
                const nomeBot = bot.nome || bot.farmBot1;
                const r = Math.random();

                // 30% de chance de tentar entrar no clã do Player (se ele for líder)
                if (playerClanId && r < 0.30) {
                    const meuClan = clans.find(c => c.id === playerClanId);
                    if (meuClan && meuClan.lider === charName) {
                        // Verifica se já tem solicitação pendente
                        const jaTem = solicitacoesClan.some(req => (typeof req === 'object' ? req.nome === nomeBot : req === nomeBot));
                        if (!jaTem && meuClan.membros.length < 40) {
                            solicitacoesClan.push({
                                nome: nomeBot,
                                clanId: playerClanId,
                                timestamp: agora
                            });

                            // Notifica o Líder via Mailbox Profissional
                            if (typeof enviarMail === 'function') {
                                enviarMail(charName, nomeBot, 'New Clan Application', 'clan', { 
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
                    const clansDisponiveis = clans.filter(c => c.lider !== charName && c.membros.length < 30);
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
    if (!clans || clans.length === 0) {
        console.warn("Tentativa de salvar lista de clãs vazia abortada.");
        // Não salvamos se estiver vazio para evitar sobrescrever dados bons por erro de carregamento
    } else {
        localStorage.setItem('l2mini_clans', JSON.stringify(clans));
    }
    localStorage.setItem('l2mini_player_clan_' + charName, JSON.stringify(playerClanId));
    localStorage.setItem('l2mini_clan_reqs', JSON.stringify(solicitacoesClan));
}

/**
 * Gera clãs iniciais para los bots
 */
function gerarClansIniciais() {
    let meuClanAntigo = playerClanId ? clans.find(c => c.id === playerClanId) : null;
    clans = [];
    if (meuClanAntigo) clans.push(meuClanAntigo);

    const nomesClans = ["DragonSlayers", "BloodAlliance", "Invictus", "RoyalArmy", "DeathKnights", "ChaosLegion", "SilverKnights", "MysticOrder", "ElvenGuard"];
    const siglasClans = ["DS", "BA", "INV", "RA", "DK", "CL", "SK", "MO", "EG"];
    
    let botsDisponiveis = [];
    if (typeof dbBotsRanking !== 'undefined') {
        botsDisponiveis = [...dbBotsRanking].sort((a, b) => b.olympiadPoints - a.olympiadPoints);
    }

    nomesClans.forEach((nome, i) => {
        let clanId = 1000 + i; // ID fixo para consistência
        let nomeLider = "Bot Lider";
        if (botsDisponiveis.length > 0) {
            let botLider = botsDisponiveis[i % botsDisponiveis.length];
            nomeLider = botLider.nome || botLider.farmBot1;
        }

        let novoClan = {
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
        clans.push(novoClan);
    });

    // Distribui TODOS os bots nos clãs de forma equilibrada
    if (typeof dbBotsRanking !== 'undefined') {
        dbBotsRanking.forEach((bot, index) => {
            let nomeBot = bot.nome || bot.farmBot1;
            // Pula se já for líder de algum clã
            if (clans.some(c => c.lider === nomeBot)) return;
            
            // Escolhe um clã para o bot (sequencial para equilíbrio)
            let clanAlvo = clans[index % clans.length];
            if (clanAlvo.id !== playerClanId) {
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

    console.log(`Renderizando Clãs - Aba: ${aba}, Clãs carregados: ${clans.length}`);

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
            if (playerClanId && clans.some(c => c.id === playerClanId)) {
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
        if (playerClanId && clans.some(c => c.id === playerClanId)) {
            renderizarMeuClan(contentArea);
        } else {
            // Se o playerClanId não existe mais nos clãs globais, limpa ele
            if (playerClanId) {
                console.log("Clã do jogador não encontrado na lista global. Resetando...");
                playerClanId = null;
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
    // Fallback: Se não houver clãs, gera os iniciais imediatamente
    if (clans.length === 0) {
        console.log("Nenhum clã encontrado ao renderizar. Gerando iniciais...");
        gerarClansIniciais();
    }

    let clansHtml = clans.sort((a, b) => b.membros.length - a.membros.length).map((clan, index) => {
        let rankColor = "#aaa";
        if (index === 0) rankColor = "#facc15"; // Gold
        if (index === 1) rankColor = "#cbd5e1"; // Silver
        if (index === 2) rankColor = "#b45309"; // Bronze

        // Verifica se o clã possui castelo
        let castleLabel = "";
        if (typeof CastleEngine !== 'undefined') {
            const castelo = CastleEngine.castelos.find(c => c.ownerClanId === clan.id);
            if (castelo) {
                castleLabel = `<div style="color: #facc15; font-size: 0.6em; font-weight: bold; margin-top: 2px;">🏰 ${castelo.nome.toUpperCase()} LORD</div>`;
            }
        }

        return `
            <div class="market-card" style="padding: 12px; margin-bottom: 8px; cursor: pointer; border: 1px solid #5a4634; background: rgba(10,7,5,0.7); display: flex; align-items: center; position: relative;" onclick="abrirDetalhesClan(${clan.id})">
                <div style="position: absolute; top: -5px; left: -5px; background: ${rankColor}; color: #000; font-size: 0.6em; font-weight: bold; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid #000;">${index + 1}</div>
                <div style="font-size: 2.2em; margin-right: 15px; filter: drop-shadow(0 0 5px rgba(255,204,0,0.3));">${clan.logo}</div>
                <div style="flex: 1;">
                    <div style="color: #ffcc00; font-weight: bold; font-family: 'Cinzel', serif; font-size: 1em;">[${clan.sigla}] ${clan.nome}</div>
                    <div style="font-size: 0.7em; color: #888;">Leader: <span style="color:#eee;">${clan.lider}</span> | Members: <span style="color:#eee;">${clan.membros.length}</span></div>
                    ${castleLabel}
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.6em; color: #aaa; text-transform: uppercase;">Req Lvl</div>
                    <div style="color: ${nivel >= clan.nivelMin ? '#22c55e' : '#ef4444'}; font-weight: bold; font-size: 1.1em;">${clan.nivelMin}</div>
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
                    <input type="text" id="clan-name-input" placeholder="e.g. Royal Knights" style="width: 100%; height: 40px; text-align: left; padding: 0 10px; margin: 0; background: #000; color: #fff; font-family: 'Tahoma', sans-serif;">
                </div>

                <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
                        <label style="font-size: 0.75em; color: #88745c; font-weight: bold;">TAG (SIGLA)</label>
                        <input type="text" id="clan-tag-input" placeholder="RYK" maxlength="4" style="width: 100%; height: 40px; text-align: center; padding: 0; margin: 0; background: #000; color: #fff; font-family: 'Tahoma', sans-serif;">
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
        if (firstLogo) selecionarLogoClan(firstLogo, clanIcons[0]);
    }, 10);
}

function selecionarLogoClan(el, icon) {
    document.querySelectorAll('.clan-logo-opt').forEach(opt => {
        opt.style.background = 'transparent';
        opt.style.border = 'none';
        opt.classList.remove('active');
    });
    el.style.background = 'rgba(202, 138, 4, 0.3)';
    el.style.border = '1px solid #ca8a04';
    el.classList.add('active');
    document.getElementById('clan-logo-val').value = icon;
}

async function confirmarCriacaoClan() {
    const nome = document.getElementById('clan-name-input').value.trim();
    const sigla = document.getElementById('clan-tag-input').value.trim().toUpperCase();
    const lvl = parseInt(document.getElementById('clan-lvl-input').value);
    const logo = document.getElementById('clan-logo-val').value;

    if (nome.length < 3) return mostrarAviso(clanT('game.clan.nameTooShort'));
    if (sigla.length < 2 || sigla.length > 4) return mostrarAviso(clanT('game.clan.tagInvalid'));
    
    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        if (clanProcessando) return;
        clanProcessando = true;
        
        try {
            const res = await window.SupabaseAPI.createClan(charName, nome, sigla, logo, lvl);
            if (res && res.success) {
                mostrarAviso(clanT('game.clan.clanCreated', { name: nome }));
                await iniciarSistemaClans(); // Recarrega tudo da nuvem
                renderizarClans('meu');
            } else {
                const err = res ? res.error : 'unknown_error';
                mostrarAviso(clanT('game.cloud.error') + ': ' + err);
            }
        } catch (e) {
            console.error("[Clan Create Error]", e);
        } finally {
            clanProcessando = false;
        }
        return;
    }

    // MODO LOCAL (OFFLINE)
    if (adenas < 50000) return mostrarAviso(clanT('game.clan.need50000a'));
    adenas -= 50000;
    // ... (resto da lógica offline)

function abrirListaClans() {
    renderizarClans('ranking');
}

function abrirDetalhesClan(id) {
    const clan = clans.find(c => c.id === id);
    if (!clan) return;

    const container = document.getElementById('clan-content-area') || document.getElementById('clans-container-main');
    
    // Lista de membros
    let membrosHtml = clan.membros.map(membro => {
        let isPlayer = membro === charName;
        let infoMembro = { nivel: '?', classe: '?' };
        
        if (typeof dbBotsRanking !== 'undefined') {
            let bot = dbBotsRanking.find(b => (b.nome || b.farmBot1) === membro);
            if (bot) infoMembro = { nivel: bot.nivel, classe: bot.classe };
        }
        if (isPlayer) infoMembro = { nivel: nivel, classe: charClass };

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
                    const jaPediu = solicitacoesClan.some(req => req.nome === charName && req.clanId === clan.id);
                    if (playerClanId) return '';
                    if (jaPediu) return `<button class="btn-l2" style="background: #333; flex: 1; height: 50px; color: #888; cursor: default;" disabled>APPLICATION PENDING</button>`;
                    return `<button class="btn-l2" style="background: linear-gradient(180deg, #15803d 0%, #14532d 100%); flex: 1; height: 50px;" onclick="entrarNoClan(${clan.id})">APPLY TO CLAN</button>`;
                })()}
                <button class="btn-l2" style="background: #444; flex: 1; height: 50px;" onclick="renderizarClans('ranking')">BACK</button>
            </div>
        </div>
    `;
}

function abrirPerfilMembroClan(nome) {
    if (!nome) return;
    const nomeLimpo = nome.trim();

    if (nomeLimpo === charName) {
        irPara('perfil');
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
            if (typeof OlympiadEngine !== 'undefined' && OlympiadEngine.gerarBotCompleto) {
                const completo = OlympiadEngine.gerarBotCompleto(fakeBot);
                Object.assign(fakeBot, completo);
            }
            
            window.botAtualVisualizado = fakeBot;
            abrirPerfilJogadorRanking(fakeBot.nome, false);
            return;
        } catch(e) { console.error("Erro ao processar save do membro:", e); }
    }

    // 2. Procura o bot no banco de dados se não for jogador real salvo
    let botData = null;
    if (typeof dbBotsRanking !== 'undefined') {
        botData = dbBotsRanking.find(b => (b.nome || b.farmBot1 || "").trim().toLowerCase() === nomeLimpo.toLowerCase());
    }
    
    if (botData) {
        if (typeof abrirPerfilJogadorRanking === 'function') {
            abrirPerfilJogadorRanking(botData.nome || botData.farmBot1, true);
        }
    } else {
        mostrarAviso(clanT('game.clan.profileUnavailable', { name: nomeLimpo }));
    }
}

async function entrarNoClan(id) {
    const clan = clans.find(c => c.id === id);
    if (!clan) return;

    if (nivel < clan.nivelMin) return mostrarAviso(clanT('game.clan.needLevelMin', { level: clan.nivelMin }));

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        const res = await window.SupabaseAPI.applyToClan(charName, id);
        if (res && res.success) {
            mostrarAviso(clanT('game.clan.applicationSent', { tag: clan.sigla, name: clan.nome }));
            await iniciarSistemaClans();
            renderizarClans('ranking');
        } else {
            mostrarAviso(clanT('game.cloud.error') + ': ' + (res ? res.error : 'unknown'));
        }
        return;
    }

    // MODO LOCAL (OFFLINE)
    const jaPediu = solicitacoesClan.some(req => req.nome === charName && req.clanId === id);
    if (jaPediu) return mostrarAviso(clanT('game.clan.applicationPending'));

    solicitacoesClan.push({
        nome: charName,
        clanId: id,
        timestamp: Date.now()
    });
    
    salvarClans();
    
    if (typeof enviarMail === 'function') {
        enviarMail(clan.lider, charName, 'New Clan Application', 'clan', { nome: charName });
    }

    mostrarAviso(clanT('game.clan.applicationSent', { tag: clan.sigla, name: clan.nome }));
    renderizarClans('ranking');
}

function renderizarMeuClan(target) {
    const clan = clans.find(c => c.id === playerClanId);
    if (!clan) {
        playerClanId = null;
        renderizarOpcoesClan(target);
        return;
    }

    const isLider = clan.lider === charName;
    const container = target || document.getElementById('clan-content-area') || document.getElementById('clans-container-main');
    
    // Lista de bônus ativos (se houver)
    let bonusesHtml = '';
    
    // NOVO: BOTÃO DE GUERRA DE CLÃS (AGORA ABRE A DOMINAÇÃO)
    let warButtonHtml = `
        <div style="background: linear-gradient(135deg, #450a0a, #991b1b); border: 2px solid #ef4444; border-radius: 8px; padding: 12px; margin-bottom: 12px; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3); text-align: center; cursor: pointer; transition: transform 0.2s;" onclick="ClanWarEngine.abrirLobby()">
            <div style="font-size: 1.5em; margin-bottom: 4px;">⚔️</div>
            <div style="color: #fff; font-weight: 900; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px;">TERRITORY DOMINATION</div>
            <div style="color: #fca5a5; font-size: 0.65em; margin-top: 2px;">Expand your empire and conquer castles!</div>
        </div>
    `;

    // Verifica dominação de castelo para o meu clã
    let castleStatusHtml = '';
    if (typeof CastleEngine !== 'undefined') {
        const meuCastelo = CastleEngine.castelos.find(c => c.ownerClanId === playerClanId);
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
        (typeof req === 'object' ? req.clanId === playerClanId : isLider) // Compatibilidade com bots antigos
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
        let isPlayer = membro === charName;
        let infoMembro = { nivel: '?', classe: '?' };
        
        if (typeof dbBotsRanking !== 'undefined') {
            let bot = dbBotsRanking.find(b => (b.nome || b.farmBot1) === membro);
            if (bot) infoMembro = { nivel: bot.nivel, classe: bot.classe };
        }
        if (isPlayer) infoMembro = { nivel: nivel, classe: charClass };

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
}

async function responderSolicitacao(nome, aceito, applicationId = null) {
    const clan = clans.find(c => c.id === playerClanId);
    if (!clan) return;

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser() && applicationId) {
        const res = await window.SupabaseAPI.respondClanApplication(charName, applicationId, aceito);
        if (res && res.success) {
            mostrarAviso(aceito ? clanT('game.clan.memberJoined', { name: nome }) : 'Application rejected.');
            await iniciarSistemaClans();
            renderizarClans('meu');
        }
        return;
    }

    // MODO LOCAL (OFFLINE)
    if (aceito) {
        if (!clan.membros.includes(nome)) {
            // Se o bot já estava em outro clã, remove de lá para evitar duplicação
            clans.forEach(c => {
                if (c.id !== clan.id) {
                    c.membros = c.membros.filter(m => m !== nome);
                }
            });

            clan.membros.push(nome);
            
            // Notifica o jogador aceito via Mailbox Profissional
            if (typeof enviarMail === 'function') {
                enviarMail(nome, charName, 'Clan Application Accepted', 'clan', { 
                    clanNome: clan.nome, 
                    clanSigla: clan.sigla 
                });
            }

            // Se o aceito for o personagem atual, precisamos atualizar o estado dele
            if (nome === charName) {
                playerClanId = clan.id;
            }
        }
        mostrarAviso(clanT('game.clan.memberJoined', { name: nome }));
    }

    // Remove a solicitação (seja objeto ou string antiga de bot)
    solicitacoesClan = solicitacoesClan.filter(req => 
        (typeof req === 'object' ? req.nome !== nome : req !== nome)
    );
    
    salvarClans();
    atualizarNotificacaoSocial();
    if (typeof calcularStatusGlobais === 'function') calcularStatusGlobais();
    renderizarClans('meu');
}

async function expulsarMembro(membroNome) {
    const clan = clans.find(c => c.id === playerClanId);
    if (!clan || clan.lider !== charName) return;

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        const res = await window.SupabaseAPI.leaveClan(membroNome, playerClanId);
        if (res && res.success) {
            mostrarAviso(clanT('game.clan.memberExpelled', { name: membroNome }));
            await iniciarSistemaClans();
            renderizarClans('meu');
        }
        return;
    }

    // MODO LOCAL (OFFLINE)
    clan.membros = clan.membros.filter(m => m !== membroNome);
    salvarClans();
    mostrarAviso(clanT('game.clan.memberExpelled', { name: membroNome }));
    renderizarClans('meu');
}

function convidarMembroBot() {
    const clan = clans.find(c => c.id === playerClanId);
    if (!clan || clan.lider !== charName) return;

    // Acha bots que não estão em nenhum clã
    let botsSemClan = dbBotsRanking.filter(bot => {
        let nome = bot.nome || bot.farmBot1;
        return !clans.some(c => c.membros.includes(nome));
    });

    if (botsSemClan.length === 0) {
        return mostrarAviso(clanT('game.clan.noFreelanceBots'));
    }

    // Sorteia um bot e adiciona
    let botSorteado = botsSemClan[Math.floor(Math.random() * botsSemClan.length)];
    let nomeBot = botSorteado.nome || botSorteado.farmBot1;

    clan.membros.push(nomeBot);
    salvarClans();
    mostrarAviso(clanT('game.clan.botJoined', { name: nomeBot }));
    renderizarClans('meu');
}

async function sairDoClan() {
    const clan = clans.find(c => c.id === playerClanId);
    if (!clan) return;

    if (clan.lider === charName && clan.membros.length > 1) {
        return mostrarAviso(clanT('game.clan.leaderCannotLeave'));
    }

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser()) {
        const res = await window.SupabaseAPI.leaveClan(charName, playerClanId);
        if (res && res.success) {
            playerClanId = null;
            await iniciarSistemaClans();
            mostrarAviso(clanT('game.clan.youLeftClan'));
            if (typeof calcularStatusGlobais === 'function') calcularStatusGlobais();
            renderizarClans();
            atualizar();
        }
        return;
    }

    // MODO LOCAL (OFFLINE)
    clan.membros = clan.membros.filter(m => m !== charName);
    if (clan.membros.length === 0) {
        clans = clans.filter(c => c.id !== clan.id);
    }
    playerClanId = null;
    salvarClans();
    mostrarAviso(clanT('game.clan.youLeftClan'));
    if (typeof calcularStatusGlobais === 'function') calcularStatusGlobais();
    renderizarClans();
    atualizar();
}

/**
 * Interface de Gerenciamento do Clã (Líder apenas)
 */
function abrirConfiguracoesClan() {
    const clan = clans.find(c => c.id === playerClanId);
    if (!clan || clan.lider !== charName) return;

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

function atualizarNivelMinClan() {
    const clan = clans.find(c => c.id === playerClanId);
    if (!clan) return;
    const novoLvl = parseInt(document.getElementById('clan-min-lvl-edit').value);
    if (isNaN(novoLvl) || novoLvl < 1 || novoLvl > 85) return mostrarAviso(clanT('game.clan.invalidLevel'));
    
    clan.nivelMin = novoLvl;
    salvarClans();
    mostrarAviso(clanT('game.clan.minLevelUpdated', { level: novoLvl }));
    abrirConfiguracoesClan();
}

function atualizarLogoClan(el, icon) {
    const clan = clans.find(c => c.id === playerClanId);
    if (!clan) return;

    document.querySelectorAll('#clan-logo-selector-edit .clan-logo-opt').forEach(opt => {
        opt.style.background = 'transparent';
        opt.style.border = 'none';
    });
    el.style.background = 'rgba(202, 138, 4, 0.3)';
    el.style.border = '1px solid #ca8a04';
    
    clan.logo = icon;
    salvarClans();
    mostrarAviso(clanT('game.clan.logoUpdated'));
}

function atualizarDescricaoClan() {
    const clan = clans.find(c => c.id === playerClanId);
    if (!clan) return;
    const desc = document.getElementById('clan-desc-edit').value.trim();
    if (desc.length > 200) return mostrarAviso(clanT('game.clan.descTooLong'));
    
    clan.descricao = desc;
    salvarClans();
    mostrarAviso(clanT('game.clan.descUpdated'));
}

async function subirNivelClan() {
    const clan = clans.find(c => c.id === playerClanId);
    if (!clan) return;

    const custosNivel = { 1: 100000, 2: 250000, 3: 500000, 4: 1000000 };
    const custo = custosNivel[clan.level || 1];
    
    if (!custo) return mostrarAviso(clanT('game.clan.maxClanLevel'));
    if (adenas < custo) return mostrarAviso(clanT('game.clan.needAdena', { amount: custo.toLocaleString() }));

    const confirmado = await l2Confirm(clanT('game.clan.upgradeConfirm', { nextLevel: (clan.level || 1) + 1, cost: custo.toLocaleString() }), clanT('game.clan.upgradeTitle'));
    if (confirmado) {
        adenas -= custo;
        clan.level = (clan.level || 1) + 1;
        salvarClans();
        atualizar();
        mostrarAviso(clanT('game.clan.clanUpgraded', { level: clan.level }));
        abrirConfiguracoesClan();
        if (typeof calcularStatusGlobais === 'function') calcularStatusGlobais();
    }
}

function dissolverClan() {
    const clan = clans.find(c => c.id === playerClanId);
    if (!clan) return;

    clans = clans.filter(c => c.id !== playerClanId);
    playerClanId = null;
    salvarClans();
    mostrarAviso(clanT('game.clan.clanDissolved'));
    if (typeof calcularStatusGlobais === 'function') calcularStatusGlobais();
    renderizarClans();
    atualizar();
}

/**
 * Janela de Segurança para Ações Críticas
 */
function abrirSegurancaClan(acao, alvo = null) {
    const clan = clans.find(c => c.id === playerClanId);
    if (!clan) return;

    const isLider = clan.lider === charName;
    const container = document.getElementById('clan-content-area');
    
    let titulo = "SECURITY VERIFICATION";
    let mensagem = "";
    let btnConfirmar = "";

    if (acao === 'sair') {
        if (isLider && clan.membros.length > 1) {
            return mostrarAviso(clanT('game.clan.leaderCannotLeaveDissolve'));
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
    // Tenta inicializar, mas garante que o DB de bots está carregado
    const checkDb = setInterval(() => {
        if (typeof dbBotsRanking !== 'undefined') {
            clearInterval(checkDb);
            iniciarSistemaClans();
        }
    }, 100);
    
    // Timeout de segurança
    setTimeout(() => clearInterval(checkDb), 5000);
});
