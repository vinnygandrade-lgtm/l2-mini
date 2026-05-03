/**
 * RANKING_SEASONS.JS - Gerenciador de Temporadas e Recompensas
 */

window.RankingSeasons = {
    SEASON_REWARDS: {
        "Paper": { adena: 10000, coins: 10, items: [] },
        "Wood": { adena: 30000, coins: 25, items: [] },
        "Copper": { adena: 80000, coins: 60, items: [{ id: 'ls_1', nome: 'Life Stone', qtd: 2 }] },
        "Silver": { adena: 200000, coins: 150, items: [{ id: 'ls_1', nome: 'Life Stone', qtd: 5 }, { id: 'sc_bw_d', nome: 'Blessed Scroll (D)', qtd: 1 }] },
        "Gold": { adena: 500000, coins: 350, items: [{ id: 'ls_1', nome: 'Life Stone', qtd: 10 }, { id: 'sc_bw_c', nome: 'Blessed Scroll (C)', qtd: 2 }] },
        "Platinum": { adena: 1200000, coins: 800, items: [{ id: 'ls_1', nome: 'Life Stone', qtd: 20 }, { id: 'sc_bw_b', nome: 'Blessed Scroll (B)', qtd: 3 }] },
        "Diamond": { adena: 3000000, coins: 1500, items: [{ id: 'ls_1', nome: 'Life Stone', qtd: 40 }, { id: 'sc_bw_a', nome: 'Blessed Scroll (A)', qtd: 5 }] },
        "Legendary": { adena: 8000000, coins: 4000, items: [{ id: 'ls_1', nome: 'Life Stone', qtd: 80 }, { id: 'sc_bw_s', nome: 'Blessed Scroll (S)', qtd: 5 }, { id: 'frag_baium', nome: 'Frag. Baium', qtd: 5 }] },
        "Mythic": { adena: 20000000, coins: 10000, items: [{ id: 'ls_1', nome: 'Life Stone', qtd: 150 }, { id: 'sc_bw_s', nome: 'Blessed Scroll (S)', qtd: 15 }, { id: 'frag_valakas', nome: 'Frag. Valakas', qtd: 10 }, { id: 'frag_antharas', nome: 'Frag. Antharas', qtd: 10 }] }
    },

    init() {
        console.log("[Seasons] Monitor de Temporadas iniciado.");
        this.checkSeason();
        // Verifica a cada hora se a temporada virou
        setInterval(() => this.checkSeason(), 3600000);
    },

    checkSeason() {
        if (!window.charName) return;

        const now = new Date();
        const currentMonthYear = `${now.getMonth() + 1}/${now.getFullYear()}`;
        const lastReset = localStorage.getItem('l2mini_last_season_reset');

        // Se o mês mudou, reseta a temporada
        if (lastReset && lastReset !== currentMonthYear) {
            this.finalizeSeason(lastReset);
        }

        // NOVO: Inicialização do CastleEngine
        if (typeof CastleEngine !== 'undefined') {
            CastleEngine.init();
        }

        // Se for a primeira vez jogando ou após o reset, salva o mês atual
        if (!lastReset) {
            localStorage.setItem('l2mini_last_season_reset', currentMonthYear);
        }
    },

    finalizeSeason(lastSeasonLabel) {
        console.log(`[Seasons] Finalizando temporada ${lastSeasonLabel}...`);

        // 1. Identifica o Rank Atual do Player antes do reset
        if (typeof OlympiadEngine === 'undefined' || typeof window.olympiadPoints === 'undefined') return;
        
        const rankInfo = OlympiadEngine.getRank(window.olympiadPoints);
        const rewards = this.SEASON_REWARDS[rankInfo.tier] || this.SEASON_REWARDS["Paper"];

        // 2. Envia Recompensa via Mailbox
        this.deliverRewards(rankInfo, rewards, lastSeasonLabel);

        // 3. Reset de Pontos (Soft Reset)
        // Jogadores míticos voltam para Platina, etc. 
        // Vamos resetar para um valor base fixo para todos começarem do zero mas manter o ranking vivo.
        const basePoints = 0; 
        window.olympiadPoints = basePoints;
        
        // Se houver ranking de bots, reseta eles também para manter o equilíbrio
        if (OlympiadEngine.dbRanking) {
            OlympiadEngine.dbRanking.forEach(bot => {
                bot.olympiadPoints = Math.floor(Math.random() * 200); // Bots começam com um pouco de variação
            });
            OlympiadEngine.salvarRanking();
        }

            // 4. Atualiza o registro do último reset para o mês atual
        const now = new Date();
        const currentMonthYear = `${now.getMonth() + 1}/${now.getFullYear()}`;
        localStorage.setItem('l2mini_last_season_reset', currentMonthYear);

        // RESET DE CASTELOS
        if (typeof CastleEngine !== 'undefined' && CastleEngine.finalizarTemporada) {
            CastleEngine.finalizarTemporada();
        }

        // 5. Salva o jogo
        if (typeof salvarJogo === 'function') salvarJogo();
        
        console.log(`[Seasons] Temporada ${lastSeasonLabel} finalizada com sucesso.`);
        if (typeof escreverLog === 'function') {
            escreverLog(`<span style="color:#facc15; font-weight:bold;">[SEASON] The previous season has ended! Check your mailbox for rewards for ${rankInfo.nomeCompleto || rankInfo.tier}.</span>`);
        }
    },

    deliverRewards(rankInfo, rewards, seasonLabel) {
        const msgAssunto = `Season Rewards: ${seasonLabel}`;
        const msgTexto = `Congratulations! You finished the season in the rank: ${rankInfo.nomeCompleto || rankInfo.tier}.\n\nYour dedication has been recognized. Here are your rewards!`;

        const mailDetalhes = {
            texto: msgTexto,
            recompensas: []
        };

        // Adiciona Adena
        if (rewards.adena > 0) {
            mailDetalhes.recompensas.push({ id: 'Adena', nome: 'Adena', qtd: rewards.adena });
        }

        // Adiciona Coins
        if (rewards.coins > 0) {
            mailDetalhes.recompensas.push({ id: 'Ancient Coin', nome: 'Ancient Coin', qtd: rewards.coins });
        }

        // Adiciona Itens
        if (rewards.items && rewards.items.length > 0) {
            rewards.items.forEach(item => {
                mailDetalhes.recompensas.push({ id: item.id, nome: item.nome, qtd: item.qtd });
            });
        }

        // Usa o engine de mailbox para enviar para o sistema
        if (typeof enviarMail === 'function') {
            enviarMail(window.charName, 'Olympiad Master', msgAssunto, 'system', mailDetalhes);
        }
    },

    getTimeLeft() {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const diff = nextMonth - now;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        return { days, hours };
    },

    findItemData(itemId) {
        // Busca em todos os catálogos possíveis
        const catalogs = [
            typeof catalogoMateriais !== 'undefined' ? catalogoMateriais : [],
            typeof catalogoArmas !== 'undefined' ? catalogoArmas : [],
            typeof catalogoArmaduras !== 'undefined' ? catalogoArmaduras : [],
            typeof catalogoJoias !== 'undefined' ? catalogoJoias : [],
            typeof catalogoConsumiveis !== 'undefined' ? catalogoConsumiveis : [],
            typeof catalogoScrolls !== 'undefined' ? catalogoScrolls : []
        ];

        for (const catalog of catalogs) {
            const item = catalog.find(i => i.id === itemId || i.nome === itemId);
            if (item) {
                // Se for arma, armadura ou joia, injeta o tipo correto se não tiver
                if (typeof catalogoArmas !== 'undefined' && catalogoArmas.includes(item)) item.tipo = 'weapon';
                else if (typeof catalogoArmaduras !== 'undefined' && catalogoArmaduras.includes(item)) item.tipo = 'armor';
                else if (typeof catalogoJoias !== 'undefined' && catalogoJoias.includes(item)) item.tipo = 'jewel';
                return item;
            }
        }
        return null;
    }
};

// Inicialização
window.addEventListener('load', () => {
    const checkReady = setInterval(() => {
        if (typeof window.charName !== 'undefined' && window.charName && typeof OlympiadEngine !== 'undefined') {
            clearInterval(checkReady);
            RankingSeasons.init();
        }
    }, 500);
});
