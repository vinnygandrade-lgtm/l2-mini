/* ========================================== */
/* PERSISTENCE ENGINE (SAVE/LOAD)             */
/* GDD §12 — Checklist evolutivo              */
/* (anti-retrabalho / lancamento serio):      */
/* migracoes em .cursor/rules/l2mini-project- */
/* rules.mdc                                  */
/* ========================================== */

/**
 * Versão do *formato* do JSON guardado (local + nuvem).
 * Quando adicionar/remover/renomear campos persistidos, incrementar este número
 * e acrescentar um passo em migrarDadosSave() para jogadores com saves antigos.
 */
var L2MINI_SAVE_VERSION = 3;

/** Chaves de stack na bolsa espelhando carteira (HUD + craft + nuvem). */
window.L2MINI_CURRENCY_BAG_KEYS = { adena: 'Adena', ancient: 'Ancient Coin' };

/**
 * Mantém bolsa alinhada a window.adenas / window.ancientCoins (fonte para shop, HUD, RPC).
 */
window.syncMoedasInventarioComCarteira = function () {
    if (!window.inventario || typeof window.inventario !== 'object') window.inventario = {};
    var kA = window.L2MINI_CURRENCY_BAG_KEYS.adena;
    var kC = window.L2MINI_CURRENCY_BAG_KEYS.ancient;
    var a = Math.max(0, Math.floor(Number(window.adenas)));
    var c = Math.max(0, Math.floor(Number(window.ancientCoins)));
    if (Number.isNaN(a)) { a = 0; window.adenas = 0; }
    if (Number.isNaN(c)) { c = 0; window.ancientCoins = 0; }
    window.adenas = a;
    window.ancientCoins = c;
    if (a > 0) window.inventario[kA] = a;
    else delete window.inventario[kA];
    if (c > 0) window.inventario[kC] = c;
    else delete window.inventario[kC];
};

/**
 * Ajusta um save antigo para a estrutura esperada pela versão atual.
 * Saves sem `saveVersion` tratam-se como versão 0.
 * @param {Record<string, unknown>} data
 * @returns {Record<string, unknown>}
 */
function migrarDadosSave(data) {
    if (!data || typeof data !== 'object') return data;
    var v = (typeof data.saveVersion === 'number' && data.saveVersion >= 0) ? data.saveVersion : 0;

    if (v < 1) {
        // v0 → v1: saves legados sem saveVersion; espaço para normalizações one-time.
        // (Ex.: campos renomeados no passado já são tratados no load com fallbacks.)
        if (typeof data.ancientCoins === 'undefined') data.ancientCoins = 0;
        v = 1;
    }

    if (v < 2) {
        if (!data.endgame || typeof data.endgame !== 'object') {
            data.endgame = {
                weeklyChampionKills: 0,
                weeklyWeekKey: '',
                lastClaimedWeekKey: '',
                lifetimeChampionKills: 0,
                renown: 0
            };
        } else {
            if (typeof data.endgame.weeklyChampionKills !== 'number') data.endgame.weeklyChampionKills = 0;
            if (typeof data.endgame.weeklyWeekKey !== 'string') data.endgame.weeklyWeekKey = '';
            if (typeof data.endgame.lastClaimedWeekKey !== 'string') data.endgame.lastClaimedWeekKey = '';
            if (typeof data.endgame.lifetimeChampionKills !== 'number') data.endgame.lifetimeChampionKills = 0;
            if (typeof data.endgame.renown !== 'number') data.endgame.renown = 0;
        }
        v = 2;
    }

    if (v < 3) {
        var inv3 = data.inventario;
        if (inv3 && typeof inv3 === 'object' && !Array.isArray(inv3)) {
            var acSt = Number(inv3['Ancient Coin']);
            var adSt = Number(inv3['Adena']);
            if (Number.isFinite(acSt) && acSt > 0) {
                data.ancientCoins = (Number(data.ancientCoins) || 0) + acSt;
                delete inv3['Ancient Coin'];
            }
            if (Number.isFinite(adSt) && adSt > 0) {
                data.adenas = (Number(data.adenas || data.adena) || 0) + adSt;
                delete inv3['Adena'];
            }
            data.inventario = inv3;
        }
        v = 3;
    }

    /* Protocolo GDD §12.1 — modelo para a próxima versão:
     * 1) L2MINI_SAVE_VERSION = 4
     * 2) if (v < 4) { ... converter dados v3 → v4 ...; v = 4; }
     */

    data.saveVersion = L2MINI_SAVE_VERSION;
    return data;
}

function salvarJogo() {
    // Sincroniza os níveis de encante nos objetos antes de salvar (Garante integridade no save)
    if (window.armaEquipadaBase) window.armaEquipadaBase.enchant = window.enchant || 0;
    if (window.armaduraEquipada) window.armaduraEquipada.enchant = window.enchantArmor || 0;
    if (typeof window.syncMoedasInventarioComCarteira === 'function') window.syncMoedasInventarioComCarteira();

    let saveData = { 
        saveVersion: L2MINI_SAVE_VERSION,
        charName: window.charName, 
        charRace: window.charRace, 
        charGender: window.charGender, 
        charClass: window.charClass, 
        adenas: window.adenas, 
        ancientCoins: window.ancientCoins, 
        enchant: window.enchant, 
        enchantArmor: window.enchantArmor, 
        nivel: window.nivel, 
        xpAtual: window.xpAtual, 
        xpNecessario: window.xpNecessario, 
        isAugmented: window.isAugmented, 
        playerHP: window.playerHP, 
        playerMP: window.playerMP, 
        playerCP: window.playerCP, 
        inventario: window.inventario, 
        inventarioEquips: window.inventarioEquips, 
        armaEquipadaBase: window.armaEquipadaBase, 
        armaduraEquipada: window.armaduraEquipada, 
        playerClanId: (typeof window.playerClanId !== 'undefined' ? window.playerClanId : null),
        colarEquipado: (window.colarEquipado || null),
        brincoEquipado1: (window.brincoEquipado1 || null),
        brincoEquipado2: (window.brincoEquipado2 || null),
        anelEquipado1: (window.anelEquipado1 || null),
        anelEquipado2: (window.anelEquipado2 || null),
        armaImgSrc: document.getElementById('arma-img') ? document.getElementById('arma-img').src : '', 
        barraAtalhos: window.barraAtalhos, 
        tempoFimBuffGuerreiro: window.tempoFimBuffGuerreiro, 
        tempoFimBuffMistico: window.tempoFimBuffMistico,
        olympiadPoints: window.olympiadPoints, 
        olympiadWins: window.olympiadWins, 
        olympiadLosses: window.olympiadLosses,
        endgame: window.endgameData && typeof window.endgameData === 'object' ? window.endgameData : undefined,
        uiLocale: (typeof window.I18n !== 'undefined' && typeof window.I18n.getLocale === 'function')
            ? window.I18n.getLocale() : undefined
    };
    
    if (!window.charName) return;
    
    localStorage.setItem('l2mini_save_' + window.charName.toLowerCase(), JSON.stringify(saveData));
    var savedMsg = (typeof window.t === 'function') ? window.t('common.gameSaved') : 'Game saved!';
    escreverLog(`<span style="color:#22c55e; font-weight:bold;">${savedMsg}</span>`);
    
    if (typeof window.dispararSincronizacaoCloud === 'function') {
        window.dispararSincronizacaoCloud();
    }
}

async function carregarJogo(nome) {
    if (!nome) return false;
    
    let data = null;
    
    // 1. Prioridade Máxima: Tentar carregar do Supabase (Nuvem)
    if (typeof SupabaseAPI !== 'undefined' && SUPABASE_CONFIG.enabled && SupabaseAPI.client) {
        try {
            console.log(`☁️ Buscando save de [${nome}] na nuvem...`);
            const { data: char, error } = await SupabaseAPI.client
                .from('characters')
                .select('data')
                .eq('char_name', nome)
                .maybeSingle();
            
            if (char && char.data) {
                data = char.data;
                console.log("✅ Save carregado da Nuvem.");
                // Sincroniza o localStorage para fallback offline
                localStorage.setItem('l2mini_save_' + nome.toLowerCase(), JSON.stringify(data));
            }
        } catch (err) {
            console.error("Erro ao carregar da nuvem:", err);
        }
    }

    // 2. Redundância: LocalStorage (Apenas se a nuvem falhar ou estiver offline)
    if (!data) {
        let saveStr = localStorage.getItem('l2mini_save_' + nome.toLowerCase());
        if(!saveStr) return false;
        try {
            data = JSON.parse(saveStr);
            console.log("💾 Save carregado do LocalStorage (Offline).");
        } catch (e) {
            console.error("Erro ao ler LocalStorage:", e);
            return false;
        }
    }

    if (!data) return false;

    try {
        data = migrarDadosSave(data);
        console.log(`Aplicando dados para [${nome}]... (save v${data.saveVersion})`, data);
        
        window.charName = data.charName || nome; 
        window.charRace = data.charRace || "Human"; 
        window.charGender = data.charGender || "Male"; 
        window.charClass = data.charClass || "Fighter";
        
        // CORREÇÃO: Nomes consistentes (plural)
        window.adenas = Number(data.adenas || data.adena || 0); 
        window.ancientCoins = Number(data.ancientCoins || 0); 
        
        window.enchant = data.enchant || 0; 
        window.enchantArmor = data.enchantArmor || 0; 
        window.nivel = data.nivel || 1; 
        window.xpAtual = data.xpAtual || 0; 
        window.xpNecessario = window.calcularXpNecessario(window.nivel); 
        window.isAugmented = data.isAugmented || false; 
        window.playerHP = (typeof data.playerHP !== 'undefined') ? data.playerHP : 100; 
        window.playerMP = (typeof data.playerMP !== 'undefined') ? data.playerMP : 50; 
        window.playerCP = (typeof data.playerCP !== 'undefined') ? data.playerCP : 60;
        
        // Garante que inventario é objeto
        window.inventario = data.inventario || { 'HP Potion': 10, 'Mana Potion': 5 };
        if (Array.isArray(window.inventario)) {
            // Se virou array por erro de GM, converte de volta
            const objInv = {};
            window.inventario.forEach(item => {
                if (item.idBase) objInv[item.idBase] = (objInv[item.idBase] || 0) + (item.qtd || 1);
            });
            window.inventario = objInv;
        }

        if (typeof window.syncMoedasInventarioComCarteira === 'function') window.syncMoedasInventarioComCarteira();

        window.barraAtalhos = data.barraAtalhos || ['HP Potion', 'Mana Potion', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
        
        if (window.barraAtalhos.length < 20) {
            while (window.barraAtalhos.length < 20) window.barraAtalhos.push(null);
        }
        
        window.tempoFimBuffGuerreiro = data.tempoFimBuffGuerreiro || 0; 
        window.tempoFimBuffMistico = data.tempoFimBuffMistico || 0;
        window.olympiadPoints = data.olympiadPoints || 0; 
        window.olympiadWins = data.olympiadWins || 0; 
        window.olympiadLosses = data.olympiadLosses || 0;

        const _defEnd = {
            weeklyChampionKills: 0,
            weeklyWeekKey: '',
            lastClaimedWeekKey: '',
            lifetimeChampionKills: 0,
            renown: 0
        };
        window.endgameData = (data.endgame && typeof data.endgame === 'object')
            ? Object.assign({}, _defEnd, data.endgame)
            : Object.assign({}, _defEnd);
        
        if (typeof window.EndgamePursuits !== 'undefined' && typeof window.EndgamePursuits.normalizeAfterLoad === 'function') {
            window.EndgamePursuits.normalizeAfterLoad();
        }
        
        window.inventarioEquips = (data.inventarioEquips || []).map(item => {
            if (typeof ItemSecurity !== 'undefined' && !ItemSecurity.isValidInstance(item)) {
                const itemBase = item.base || item;
                return ItemSecurity.createInstance(item.tipo, itemBase, {
                    uid: item.uid,
                    enchant: item.enchant !== undefined ? item.enchant : (item.enchantArmor || item.enchantJewel || 0),
                    augmented: item.augmented || false,
                    origin: 'Cloud'
                });
            }
            return item;
        });

        const validarEquipado = (item, tipoPadrao) => {
            if (!item) return null;
            if (typeof ItemSecurity !== 'undefined' && !ItemSecurity.isValidInstance(item)) {
                const itemBase = item.base || item;
                if (itemBase.nome === 'Treining Sword') return item;
                return ItemSecurity.createInstance(item.tipo || tipoPadrao, itemBase, {
                    uid: item.uid,
                    enchant: item.enchant !== undefined ? item.enchant : (item.enchantArmor || item.enchantJewel || 0),
                    augmented: item.augmented || false,
                    origin: 'Cloud'
                });
            }
            return item;
        };

        window.armaEquipadaBase = validarEquipado(data.armaEquipadaBase, 'weapon') || { 
            uid: 'WPN-START-' + Date.now(), 
            tipo: 'weapon', 
            base: { nome: 'Treining Sword', atk: 5, img: 'assets/armas/espada_inicial.png', grade: 'No-Grade' }, 
            enchant: 0 
        };

        window.armaduraEquipada = validarEquipado(data.armaduraEquipada, 'armor');
        window.colarEquipado = validarEquipado(data.colarEquipado, 'jewel');
        window.brincoEquipado1 = validarEquipado(data.brincoEquipado1, 'jewel');
        window.brincoEquipado2 = validarEquipado(data.brincoEquipado2, 'jewel');
        window.anelEquipado1 = validarEquipado(data.anelEquipado1, 'jewel');
        window.anelEquipado2 = validarEquipado(data.anelEquipado2, 'jewel');
        
        let armaImg = document.getElementById('arma-img'); 
        if (armaImg) {
            armaImg.src = data.armaImgSrc || (window.armaEquipadaBase.base ? window.armaEquipadaBase.base.img : window.armaEquipadaBase.img); 
            armaImg.className = ''; 
            if(window.isAugmented) armaImg.classList.add('augmented'); 
        }
        
        if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
        
        // --- ATUALIZAÇÃO DE PRESENÇA CLOUD (Garantia de Troca de Personagem) ---
        if (typeof SupabaseAPI !== 'undefined' && SUPABASE_CONFIG.enabled && window.charName) {
            void SupabaseAPI.updatePresence(window.charName, data);
        }
        
        // --- RESET DE MOTORES MULTIPLAYER ---
        if (typeof OlympiadEngine !== 'undefined' && OlympiadEngine.reset) {
            OlympiadEngine.reset();
        }

        if (typeof window.I18n !== 'undefined' && data.uiLocale) {
            window.I18n.applyFromSave(data.uiLocale);
        } else if (typeof window.atualizar === 'function') {
            window.atualizar();
        }

        // --- SINCRONIZAÇÃO DE MAILBOX (OFFLINE REWARDS) ---
        if (data.mailboxCloud && data.mailboxCloud.length > 0 && typeof window.MailboxEngine !== 'undefined') {
            const hasNew = window.MailboxEngine.syncFromCloud(data.mailboxCloud);
            if (hasNew) {
                // Se houve novas mensagens, limpamos o banco de dados do personagem para não baixar de novo
                // Mas mantemos as outras propriedades do charData
                setTimeout(async () => {
                    const cleanData = { ...data };
                    delete cleanData.mailboxCloud;
                    if (typeof SupabaseAPI !== 'undefined' && SupabaseAPI.client) {
                        await SupabaseAPI.client.from('characters').update({ data: cleanData }).eq('char_name', window.charName);
                        console.log("☁️ Cloud Mailbox synced and cleaned.");
                    }
                }, 2000);
            }
        }
        
        if (typeof inicializarMissoesDiarias === 'function') inicializarMissoesDiarias();
        if (typeof atualizarWorldDailyBossUI === 'function') atualizarWorldDailyBossUI();
        if (typeof iniciarSistemaMercado === 'function') iniciarSistemaMercado();
        if (typeof verificarPagamentosPendentes === 'function') verificarPagamentosPendentes();
        
        return true;
    } catch (e) { 
        console.error("Erro ao carregar:", e); 
        return false; 
    }
}
