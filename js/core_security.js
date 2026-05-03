/**
 * CORE ITEM SECURITY SYSTEM
 * Este é o sistema "RG" de equipamentos. Ele garante que cada item no mundo 
 * seja único, rastreável e impossível de ser clonado via bugs de interface.
 */

window.ItemSecurity = {
    /**
     * Gera um UID (RG) de alta entropia.
     * Formato: TIPO-TIMESTAMP-RANDOM-HASH
     */
    generateUID: function(prefix = 'ITEM') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        const entropy = Math.floor(Math.random() * 1000000).toString(16);
        return `${prefix}-${timestamp}-${random}-${entropy}`.toUpperCase();
    },

    /**
     * Fábrica de Instâncias de Itens.
     * NADA entra no jogo sem passar por aqui.
     */
    createInstance: function(tipo, base, overrides = {}) {
        if (!base || !base.nome) {
            console.error("[Security] Tentativa de criar item sem base válida.");
            return null;
        }

        // Determina o prefixo do RG baseado no tipo
        let prefix = 'MISC';
        if (['weapon', 'Sword', 'Dagger', 'Bow', 'Fist', 'Mace', 'Magic Sword'].includes(tipo) || base.atk) prefix = 'WPN';
        else if (['armor', 'Heavy', 'Light', 'Robe'].includes(tipo) || base.pDef) prefix = 'ARM';
        else if (['jewel', 'neck', 'ear', 'ring'].includes(tipo) || base.mDef) prefix = 'JWL';

        const instance = {
            uid: overrides.uid || this.generateUID(prefix),
            tipo: tipo || base.tipoItem || base.tipo || 'misc',
            base: JSON.parse(JSON.stringify(base)), // Proteção contra mutação de catálogo
            enchant: overrides.enchant !== undefined ? overrides.enchant : (overrides.enchantArmor || overrides.enchantJewel || 0),
            augmented: overrides.augmented || false,
            origin: overrides.origin || 'System', // Pode ser 'Craft', 'Drop', 'Shop', 'Market'
            owner: overrides.owner || charName || 'Unknown',
            createdAt: overrides.createdAt || new Date().toISOString()
        };

        console.log(`[Security] Novo item registrado: ${instance.base.nome} [RG: ${instance.uid}]`);
        return instance;
    },

    /**
     * Valida se um objeto de item é uma instância legítima e não corrompida.
     */
    isValidInstance: function(item) {
        if (!item || typeof item !== 'object') return false;
        if (!item.uid || !item.base || !item.base.nome) return false;
        
        // Verifica estrutura básica do RG
        const parts = item.uid.split('-');
        return parts.length === 4;
    },

    /**
     * Registra a destruição de um item (Enchant falho).
     */
    registerDestruction: function(item) {
        if (!item) return;
        console.warn(`[Security] ITEM DESTRUÍDO: ${item.base.nome} [RG: ${item.uid}] - Removido do banco de dados do mundo.`);
        // Em um sistema real multiplayer, aqui dispararíamos um evento para o servidor invalidar este UID.
    }
};
