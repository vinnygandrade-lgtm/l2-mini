/**
 * RANKING_MANAGER.JS - Gerenciador de Ranking Híbrido (Bots + Real Players)
 */

window.RankingManager = {
    realPlayers: [],
    lastFetch: 0,
    CACHE_DURATION: 300000, // 5 minutos

    async getMergedRanking() {
        // Tenta buscar da nuvem se habilitado
        if (typeof buscarRankingGlobalReal === 'function') {
            const now = Date.now();
            if (now - this.lastFetch > this.CACHE_DURATION || this.realPlayers.length === 0) {
                const cloudPlayers = await buscarRankingGlobalReal();
                if (cloudPlayers) {
                    this.realPlayers = cloudPlayers;
                    this.lastFetch = now;
                }
            }
        }

        // 1. Iniciar com os bots locais
        let baseRanking = (typeof OlympiadEngine !== 'undefined' && OlympiadEngine.dbRanking && OlympiadEngine.dbRanking.length > 0) 
            ? OlympiadEngine.dbRanking 
            : (typeof dbBotsRanking !== 'undefined' ? dbBotsRanking : []);

        let todosJogadores = baseRanking.map(bot => ({
            nome: bot.nome || bot.farmBot1 || "Bot",
            classe: bot.classe,
            nivel: bot.nivel,
            olympiadPoints: bot.olympiadPoints,
            isBot: true
        }));

        // 2. Adicionar jogadores reais da nuvem (removendo bots com mesmo nome se houver)
        this.realPlayers.forEach(rp => {
            // Se o player real for o próprio usuário, ignoramos aqui (será adicionado depois)
            if (rp.nome === window.charName) return;

            // Remove bot se houver colisão de nome
            todosJogadores = todosJogadores.filter(j => j.nome !== rp.nome);
            
            todosJogadores.push({
                nome: rp.nome,
                classe: rp.charClass || rp.classe || "Unknown",
                nivel: rp.nivel || 1,
                olympiadPoints: rp.olympiadPoints || 0,
                isBot: false,
                isRealPlayer: true,
                renown: typeof rp.renown === 'number' ? rp.renown : undefined,
                ascensionTitle: typeof rp.ascensionTitle === 'string' ? rp.ascensionTitle : undefined
            });
        });

        // 3. Adicionar o Player Atual
        // Remove da lista se ele já veio da nuvem ou se tem um bot com esse nome
        todosJogadores = todosJogadores.filter(j => j.nome !== window.charName);
        
        const localRenown =
            window.endgameData && typeof window.endgameData.renown === 'number' ? window.endgameData.renown : 0;
        let localAsc = '';
        if ( window.EndgamePursuits && typeof window.EndgamePursuits.getAscensionTitleForRenown === 'function') {
            localAsc = window.EndgamePursuits.getAscensionTitleForRenown(localRenown);
        } else if (localRenown >= 200) localAsc = 'Paragon';
        else if (localRenown >= 100) localAsc = 'Warlord';
        else if (localRenown >= 40) localAsc = 'Veteran';
        else localAsc = 'Ascendant';

        todosJogadores.push({
            nome: window.charName || "You",
            classe: window.charClass || "Fighter",
            nivel: window.nivel || 1,
            olympiadPoints: window.olympiadPoints || 0,
            isBot: false,
            isLocalPlayer: true,
            renown: localRenown,
            ascensionTitle: localAsc
        });

        // 4. Ordenar por MMR
        todosJogadores.sort((a, b) => b.olympiadPoints - a.olympiadPoints);

        return todosJogadores;
    }
};
