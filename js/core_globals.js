/* ========================================== */
/* CORE GLOBALS & BASIC HELPERS               */
/* ========================================== */

// Variáveis de Estado do Personagem (Globais - Anexadas ao Window para segurança total entre arquivos)
window.charName = "";
window.charRace = "Human";
window.charGender = "Male";
window.charClass = "Fighter";
window.nivel = 1;
window.adenas = 0;
window.ancientCoins = 0; 
window.xpAtual = 0;
window.xpNecessario = 100;
window.playerHP = 100;
window.playerMP = 50;
window.playerCP = 60;
window.isAugmented = false;

/** Progressão meta pós-S-grade (missão semanal, renome, etc.) — persistido em save v2+. */
window.endgameData = {
    weeklyChampionKills: 0,
    weeklyWeekKey: '',
    lastClaimedWeekKey: '',
    lifetimeChampionKills: 0,
    renown: 0
};

// === SISTEMA DE CLÃS E SOCIAL (Globais para evitar ReferenceError) ===
var clans = [];
var playerClanId = null;
var solicitacoesClan = [];

window.clans = clans;
window.playerClanId = playerClanId;
window.solicitacoesClan = solicitacoesClan;

// Objetos de Status (Blindagem contra ReferenceError)
window.playerStats = {
    maxHp: 100, maxMp: 50, maxCp: 60,
    pAtk: 10, mAtk: 10, pDef: 10, mDef: 10,
    critRate: 5, atkSpeed: 500, castSpeed: 600, runSpeed: 120
};

window.buffsAtivos = {
    pAtkMult: 1.0, pDefMult: 1.0, mAtkMult: 1.0, mDefMult: 1.0
};

window.enchant = 0;
window.enchantArmor = 0;
window.inventario = { 'HP Potion': 20, 'Mana Potion': 5 };
window.inventarioEquips = [];
window.armaEquipadaBase = null;
window.armaduraEquipada = null;

window.olympiadPoints = 0; 
window.olympiadWins = 0;
window.olympiadLosses = 0;

window.barraAtalhos = ['HP Potion', 'Mana Potion', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
window.tempoFimBuffGuerreiro = 0; 
window.tempoFimBuffMistico = 0; 

// === HELPERS DE CÁLCULO ===
window.calcularXpNecessario = function(lvl) { 
    return Math.floor(100 * Math.pow(lvl, 2) + Math.pow(lvl, 5) * 0.05); 
};

// === HUD P.ATK / M.ATK ===
window.labelTipoHUD = null;
window.labelValorHUD = null;

// Inicializa referências do HUD quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    window.labelTipoHUD = document.getElementById('hud-tipo-ataque');
    window.labelValorHUD = document.getElementById('hud-valor-ataque');
});

window.isClasseMagica = function(classeNome) {
    const classesMagicas = [
        "Mage", "Wizard", "Cleric", "Sorcerer", "Necromancer", "Warlock", "Bishop", "Prophet", 
        "Dark_Mage", "Dark Wizard", "Shillien Oracle", "Spellhowler", "Phantom Summoner", "Shillien Elder",
        "Elf_Mage", "Elven Wizard", "Elven Oracle", "Spellsinger", "Elemental Summoner", "Elven Elder", "Mystic Muse", "Elemental Master", "Eva's Saint",
        "Orc_Mage", "Orc Shaman", "Overlord", "Warcryer", "Dominator", "Doomcryer"
    ];
    return classesMagicas.includes(classeNome);
};

window.mostrarAviso = function(mensagem) {
    let container = document.getElementById('toast-container');
    if (!container) return;
    if (container.children.length >= 2) {
        container.removeChild(container.firstElementChild);
    }
    let toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `⚠️ ${mensagem}`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3000);
};

window.TRAVAS_GRADE_NIVEL = {
    'NO-GRADE': 1, 'D': 20, 'C': 40, 'B': 52, 'A': 61, 'S': 76
};

window.normalizarGradeEquip = function(grade) {
    if (!grade) return 'NO-GRADE';
    let g = String(grade).trim().toUpperCase();
    if (g === 'NO-GRADE' || g === 'NOGRADE' || g === 'NO GRADE') return 'NO-GRADE';
    if (g.startsWith('D')) return 'D';
    if (g.startsWith('C')) return 'C';
    if (g.startsWith('B')) return 'B';
    if (g.startsWith('A')) return 'A';
    if (g.startsWith('S')) return 'S';
    return 'NO-GRADE';
};

window.obterNivelMinimoGradeEquip = function(grade) {
    let gradeNormalizado = normalizarGradeEquip(grade);
    return TRAVAS_GRADE_NIVEL[gradeNormalizado] || 1;
};

window.validarEquipPorGrade = function(item) {
    if (!item) return { permitido: false, motivo: 'ITEM_INVALIDO', nivelMinimo: 1, grade: 'NO-GRADE' };
    let gradeDetectada = item.grade;
    if (!gradeDetectada) {
        const idBusca = item.id || null;
        const nomeBusca = item.nome || null;
        const buscarNoCatalogo = (cat) => {
            if (!Array.isArray(cat)) return null;
            return cat.find(i => (idBusca && i.id === idBusca) || (nomeBusca && i.nome === nomeBusca)) || null;
        };
        let itemCat = buscarNoCatalogo(typeof catalogoArmas !== 'undefined' ? catalogoArmas : null)
            || buscarNoCatalogo(typeof catalogoArmaduras !== 'undefined' ? catalogoArmaduras : null)
            || buscarNoCatalogo(typeof catalogoJoias !== 'undefined' ? catalogoJoias : null);
        if (itemCat && itemCat.grade) gradeDetectada = itemCat.grade;
    }
    let gradeNormalizado = normalizarGradeEquip(gradeDetectada);
    let nivelMinimo = obterNivelMinimoGradeEquip(gradeNormalizado);
    let nivelAtual = typeof window.nivel !== 'undefined' ? window.nivel : 1;
    let permitido = nivelAtual >= nivelMinimo;
    return { permitido, nivelMinimo, grade: gradeNormalizado, nivelAtual };
};
