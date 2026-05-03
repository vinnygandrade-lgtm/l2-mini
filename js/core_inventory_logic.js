/**
 * CORE INVENTORY LOGIC (SAFE ENGINE)
 * centraliza todas as operações de equipamentos para evitar duplicação e perda de dados.
 */

window.InventoryManager = {
    /**
     * Adiciona um item ao inventário de forma segura.
     * O item DEVE ser um objeto { tipo, base, enchant, augmented, uid }
     */
    adicionarEquipamento: function(item) {
        if (!item || !item.base) return false;

        // Se o item já for uma instância segura (vinda de outra movimentação), mantemos.
        // Se for um objeto bruto (vinda da loja/craft), criamos a instância oficial.
        let itemSeguro = item;
        if (!ItemSecurity.isValidInstance(item)) {
            itemSeguro = ItemSecurity.createInstance(item.tipo, item.base, {
                enchant: item.enchant,
                augmented: item.augmented,
                origin: item.origin || 'System'
            });
        }

        if (!itemSeguro) return false;

        // Barreira de Duplicação (UID Check)
        const existeNaBolsa = inventarioEquips.some(i => i.uid === itemSeguro.uid);
        if (existeNaBolsa) {
            console.warn("[InventoryManager] Tentativa de duplicar item na bolsa bloqueada:", itemSeguro.uid);
            return false;
        }

        if (this.estaEquipado(itemSeguro.uid)) {
            console.warn("[InventoryManager] Tentativa de adicionar item equipado à bolsa bloqueada:", itemSeguro.uid);
            return false;
        }

        inventarioEquips.push(itemSeguro);
        return true;
    },

    estaEquipado: function(uid) {
        if (!uid) return false;
        const equipado = [
            armaEquipadaBase, armaduraEquipada, colarEquipado, 
            brincoEquipado1, brincoEquipado2, anelEquipado1, anelEquipado2
        ];
        return equipado.some(e => e && e.uid === uid);
    },

    /**
     * Move um item da bolsa para o corpo.
     */
    equiparGarantido: function(indexBolsa) {
        const item = inventarioEquips[indexBolsa];
        if (!item) return false;

        // Determina slot alvo
        const subTipo = item.base.tipoItem || item.base.tipo || item.tipo;
        let slot = '';
        
        if (['Sword', 'Dagger', 'Bow', 'Fist', 'Mace', 'Magic Sword', 'weapon'].includes(subTipo)) slot = 'weapon';
        else if (['Heavy', 'Light', 'Robe', 'armor'].includes(subTipo)) slot = 'armor';
        else if (subTipo === 'neck') slot = 'neck';
        else if (subTipo === 'ear') slot = !brincoEquipado1 ? 'ear1' : (!brincoEquipado2 ? 'ear2' : 'ear1');
        else if (subTipo === 'ring') slot = !anelEquipado1 ? 'ring1' : (!anelEquipado2 ? 'ring2' : 'ring1');

        if (!slot) return false;

        // 1. Remove da bolsa primeiro
        const itemParaEquipar = inventarioEquips.splice(indexBolsa, 1)[0];

        // 2. Se já tinha algo, desequipa o antigo
        this.desequiparGarantido(slot);

        // 3. Coloca o novo no corpo (Referência direta!)
        switch(slot) {
            case 'weapon': armaEquipadaBase = itemParaEquipar; break;
            case 'armor': armaduraEquipada = itemParaEquipar; break;
            case 'neck': colarEquipado = itemParaEquipar; break;
            case 'ear1': brincoEquipado1 = itemParaEquipar; break;
            case 'ear2': brincoEquipado2 = itemParaEquipar; break;
            case 'ring1': anelEquipado1 = itemParaEquipar; break;
            case 'ring2': anelEquipado2 = itemParaEquipar; break;
        }

        this.sincronizarStatus();
        return true;
    },

    /**
     * Move um item do corpo para a bolsa.
     */
    desequiparGarantido: function(slot) {
        let itemParaBolsa = null;

        switch(slot) {
            case 'weapon':
                if (armaEquipadaBase && armaEquipadaBase.nome !== 'Treining Sword' && armaEquipadaBase.base) {
                    itemParaBolsa = armaEquipadaBase;
                    armaEquipadaBase = { nome: 'Treining Sword', atk: 5, img: 'assets/armas/espada_inicial.png', grade: 'No-Grade' };
                }
                break;
            case 'armor':
                if (armaduraEquipada) { itemParaBolsa = armaduraEquipada; armaduraEquipada = null; }
                break;
            case 'neck':
                if (colarEquipado) { itemParaBolsa = colarEquipado; colarEquipado = null; }
                break;
            case 'ear1':
                if (brincoEquipado1) { itemParaBolsa = brincoEquipado1; brincoEquipado1 = null; }
                break;
            case 'ear2':
                if (brincoEquipado2) { itemParaBolsa = brincoEquipado2; brincoEquipado2 = null; }
                break;
            case 'ring1':
                if (anelEquipado1) { itemParaBolsa = anelEquipado1; anelEquipado1 = null; }
                break;
            case 'ring2':
                if (anelEquipado2) { itemParaBolsa = anelEquipado2; anelEquipado2 = null; }
                break;
        }

        if (itemParaBolsa) {
            this.adicionarEquipamento(itemParaBolsa);
        }

        this.sincronizarStatus();
        return true;
    },

    /**
     * Sincroniza todas as interfaces e globais.
     */
    sincronizarStatus: function() {
        // Atualiza variáveis globais de encante para compatibilidade legada
        window.enchant = (armaEquipadaBase && armaEquipadaBase.enchant) || 0;
        window.enchantArmor = (armaduraEquipada && armaduraEquipada.enchant) || 0;
        window.isAugmented = (armaEquipadaBase && (armaEquipadaBase.augmented || armaEquipadaBase.augmented === true)) || false;

        if (typeof calcularStatusGlobais === 'function') calcularStatusGlobais();
        if (typeof atualizar === 'function') atualizar();
        if (typeof renderizarPerfil === 'function') renderizarPerfil();
        if (typeof renderizarInventario === 'function') renderizarInventario();
        if (typeof salvarJogo === 'function') salvarJogo();
    }
};
