/**
 * CLOUD_SYNC.JS - Fase 2: Arquitetura para a Nuvem
 * 
 * Este arquivo contém a estrutura planejada para sincronização de dados local -> nuvem
 * e integração de um ranking global real.
 */

const CLOUD_CONFIG = {
    provider: 'supabase', 
    apiUrl: 'https://kgjcbujkzsrgcjcowxts.supabase.co',
    apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnamNidWprenNyZ2NqY293eHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNzk0NzcsImV4cCI6MjA5Mjk1NTQ3N30.s1C3ubMA_ZRrkCmtk1nLC4VjDImk707X1wSTsA9CL9A',
    syncEnabled: true, // Agora está ativado!
    syncInterval: 30000 // Sincroniza a cada 30 segundos
};

/**
 * Envia o estado atual do localStorage para o banco de dados remoto.
 */
async function sincronizarSaveComNuvem() {
    if (!CLOUD_CONFIG.syncEnabled || !charName) return;

    const saveData = localStorage.getItem('l2mini_save_' + charName.toLowerCase());
    if (!saveData) return;

    try {
        console.log("☁️ Sincronizando save com a nuvem...");
        
        // INTEGRAÇÃO COM SUPABASE API
        if (typeof SupabaseAPI !== 'undefined' && SUPABASE_CONFIG.enabled) {
            await SupabaseAPI.savePlayer(charName, JSON.parse(saveData));
        } else {
            // Exemplo de chamada para Supabase/Firebase/Custom API
            /*
            const response = await fetch(`${CLOUD_CONFIG.apiUrl}/rest/v1/player_stats`, {
            ...
            */
        }
        
        // Simulação de sucesso
        // escreverLog(`<span style="color:#60a5fa;">Sincronizado com a nuvem.</span>`);
    } catch (error) {
        console.error("Erro na sincronização cloud:", error);
    }
}

/**
 * Busca o ranking global de jogadores reais para substituir os bots.
 */
async function buscarRankingGlobalReal() {
    // Se a nuvem estiver desligada, retorna null para o sistema usar bots
    if (!CLOUD_CONFIG.syncEnabled && (!typeof SUPABASE_CONFIG !== 'undefined' || !SUPABASE_CONFIG.enabled)) return null;

    try {
        console.log("🏆 Buscando ranking global da nuvem...");
        
        if (typeof SupabaseAPI !== 'undefined') {
            const players = await SupabaseAPI.getGlobalRanking();
            if (players && players.length > 0) {
                return players;
            }
        }
        
        return null; 
    } catch (error) {
        console.error("Erro ao buscar ranking:", error);
        return null;
    }
}

/**
 * Interface para o core.js chamar após salvar o jogo
 */
window.dispararSincronizacaoCloud = function() {
    sincronizarSaveComNuvem();
};

// Inicia o loop de sincronização periódica
if (CLOUD_CONFIG.syncEnabled) {
    setInterval(sincronizarSaveComNuvem, CLOUD_CONFIG.syncInterval);
}

console.log("☁️ Cloud Sync Engine carregado (Aguardando configuração).");
