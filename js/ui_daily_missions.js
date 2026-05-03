// ==========================================
// MISSOES DIARIAS
// ==========================================

let missoesDiariasData = null;
const GRADES_L2_OFICIAIS = ["No-Grade", "D", "C", "B", "A", "S"];
const MAX_HISTORICO_ROTACOES = 12;

// Títulos/descrições vindos do bundle (en / pt-BR); save antigo ainda traz titulo/desc em inglês como fallback.
function tituloMissaoDiaria(m) {
    if (m && m.id && typeof window.t === 'function') {
        const k = 'game.daily.missions.' + m.id + '.title';
        const s = window.t(k);
        if (s && s !== k) return s;
    }
    return (m && m.titulo) ? m.titulo : '';
}

function descMissaoDiaria(m) {
    if (m && m.id && typeof window.t === 'function') {
        const k = 'game.daily.missions.' + m.id + '.desc';
        const s = window.t(k);
        if (s && s !== k) return s;
    }
    return (m && m.desc) ? m.desc : '';
}

function obterGradeAtualPorNivel() {
    if (nivel >= 76) return "S";
    if (nivel >= 61) return "A";
    if (nivel >= 52) return "B";
    if (nivel >= 40) return "C";
    if (nivel >= 20) return "D";
    return "No-Grade";
}

function normalizarGradeParaRecompensa(grade) {
    return grade;
}

function obterModificadorGrade(grade) {
    const g = normalizarGradeParaRecompensa(grade);
    const map = {
        "No-Grade": 1.0,
        "D": 1.45,
        "C": 2.1,
        "B": 3.0,
        "A": 4.3,
        "S": 6.0
    };
    return map[g] || 1.0;
}

function montarRecompensaPorGrade(grade, pacote = "base") {
    const g = normalizarGradeParaRecompensa(grade);
    const shotMap = {
        "No-Grade": { fisico: "Soulshot (NG)", magico: "B. Spiritshot (NG)" },
        "D": { fisico: "Soulshot (D)", magico: "B. Spiritshot (D)" },
        "C": { fisico: "Soulshot (C)", magico: "B. Spiritshot (C)" },
        "B": { fisico: "Soulshot (B)", magico: "B. Spiritshot (B)" },
        "A": { fisico: "Soulshot (A)", magico: "B. Spiritshot (A)" },
        "S": { fisico: "Soulshot (S)", magico: "B. Spiritshot (S)" }
    };
    const itemFisico = shotMap[g] ? shotMap[g].fisico : null;
    const itemMagico = shotMap[g] ? shotMap[g].magico : null;
    const scrollW = `Enchant Weapon (${g === "No-Grade" ? "NG" : g})`;
    const scrollA = `Enchant Armor (${g === "No-Grade" ? "NG" : g})`;
    
    // Entrega o tiro (Shot) certo dependendo da tua classe atual!
    const isMage = typeof window.isClasseMagica === 'function' && typeof charClass !== 'undefined' ? window.isClasseMagica(charClass) : false;
    const shotRecompensa = isMage ? itemMagico : itemFisico;

    if (pacote === "farm") {
        return {
            adenas: Math.floor(2500 * obterModificadorGrade(grade)),
            ancientCoins: Math.floor(4 * obterModificadorGrade(grade)),
            itens: shotRecompensa ? { [shotRecompensa]: Math.floor(40 * obterModificadorGrade(grade)) } : { [scrollA]: 1 }
        };
    }

    if (pacote === "champion") {
        return {
            adenas: Math.floor(4200 * obterModificadorGrade(grade)),
            ancientCoins: Math.floor(6 * obterModificadorGrade(grade)),
            itens: { [scrollA]: 1 }
        };
    }

    if (pacote === "arena") {
        const itens = { [scrollW]: 1 };
        if (shotRecompensa) itens[shotRecompensa] = Math.floor(15 * obterModificadorGrade(grade));
        return {
            adenas: Math.floor(6000 * obterModificadorGrade(grade)),
            ancientCoins: Math.floor(8 * obterModificadorGrade(grade)),
            itens
        };
    }

    if (pacote === "pocao") {
        return {
            adenas: Math.floor(3000 * obterModificadorGrade(grade)),
            ancientCoins: Math.floor(3 * obterModificadorGrade(grade)),
            itens: { 'HP Potion': Math.floor(5 * obterModificadorGrade(grade)), 'Mana Potion': Math.floor(3 * obterModificadorGrade(grade)) }
        };
    }

    return {
        adenas: Math.floor(3500 * obterModificadorGrade(grade)),
        ancientCoins: Math.floor(5 * obterModificadorGrade(grade)),
        itens: { [scrollA]: 1 }
    };
}

function getChaveMissoesDiarias() {
    if (!charName) return null;
    return `l2mini_daily_${charName.toLowerCase()}`;
}

function getDataHojeStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

function randomBySeed(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function gerarPoolMissoes(seedBase, gradeAtual) {
    const baseSeed = seedBase || 1;
    const mod = obterModificadorGrade(gradeAtual);
    return [
        {
            id: 'hunt_pack',
            titulo: 'Ambush Slayer',
            desc: 'Defeat common mobs while hunting.',
            tipo: 'matar_monstros',
            alvo: Math.floor((26 + Math.floor(randomBySeed(baseSeed + 11) * 20)) * (1 + (mod * 0.12))),
            recompensa: montarRecompensaPorGrade(gradeAtual, "farm"),
            icone: '🗡️'
        },
        {
            id: 'champion_hunter',
            titulo: 'Champion Hunter',
            desc: 'Slay golden champions in hunting zones.',
            tipo: 'matar_champions',
            alvo: Math.max(2, Math.floor((2 + Math.floor(randomBySeed(baseSeed + 21) * 3)) * (1 + (mod * 0.08)))),
            recompensa: montarRecompensaPorGrade(gradeAtual, "champion"),
            icone: '👑'
        },
        {
            id: 'coin_collector',
            titulo: 'Ancient Hoard',
            desc: 'Gather Ancient Coins in battle.',
            tipo: 'coletar_coins',
            alvo: Math.floor((30 + Math.floor(randomBySeed(baseSeed + 31) * 40)) * (1 + (mod * 0.12))),
            recompensa: montarRecompensaPorGrade(gradeAtual, "base"),
            icone: '🪙'
        },
        {
            id: 'adena_farmer',
            titulo: 'Adena Pouch',
            desc: 'Earn Adena from combat and events.',
            tipo: 'ganhar_adena',
            alvo: Math.floor((9000 + Math.floor(randomBySeed(baseSeed + 41) * 14000)) * (1 + (mod * 0.25))),
            recompensa: montarRecompensaPorGrade(gradeAtual, "base"),
            icone: '💰'
        },
        {
            id: 'arena_blood',
            titulo: 'Blood on the Sand',
            desc: 'Win Grand Olympiad duels.',
            tipo: 'vencer_olympiad',
            alvo: 1 + Math.floor(randomBySeed(baseSeed + 51) * 2),
            recompensa: montarRecompensaPorGrade(gradeAtual, "arena"),
            icone: '⚔️'
        },
        {
            id: 'daily_boss_slayer',
            titulo: 'Lord of the Day',
            desc: 'Clear your grade’s Daily Boss (WORLD).',
            tipo: 'derrotar_daily_boss',
            alvo: 1,
            recompensa: montarRecompensaPorGrade(gradeAtual, "champion"),
            icone: '👹'
        },
        {
            id: 'battle_alchemist',
            titulo: 'Battle Alchemist',
            desc: 'Use potions in combat to stay alive.',
            tipo: 'usar_pocoes',
            alvo: Math.floor((8 + Math.floor(randomBySeed(baseSeed + 61) * 10)) * (1 + (mod * 0.10))),
            recompensa: montarRecompensaPorGrade(gradeAtual, "pocao"),
            icone: '🧪'
        }
    ];
}

function gerarMissoesDoDia() {
    const dia = getDataHojeStr();
    const gradeAtual = obterGradeAtualPorNivel();
    const seed = hashString(`${charName}_${dia}`);
    const pool = gerarPoolMissoes(seed, gradeAtual);
    const escolhidas = [];
    let idx = 0;

    while (escolhidas.length < 3 && idx < 20) {
        const pos = Math.floor(randomBySeed(seed + (idx * 7)) * pool.length);
        const missao = pool[pos];
        if (!escolhidas.find(m => m.id === missao.id)) {
            escolhidas.push({
                ...missao,
                progresso: 0,
                concluida: false,
                reivindicada: false
            });
        }
        idx++;
    }

    return {
        data: dia,
        gradeRef: gradeAtual,
        bonusReivindicado: false,
        missoes: escolhidas,
        historicoEncerrado: []
    };
}

function salvarMissoesDiarias() {
    const key = getChaveMissoesDiarias();
    if (!key || !missoesDiariasData) return;
    localStorage.setItem(key, JSON.stringify(missoesDiariasData));
}

function garantirEstruturaMissoesDiarias() {
    if (!missoesDiariasData) return;
    if (!Array.isArray(missoesDiariasData.missoes)) missoesDiariasData.missoes = [];
    if (!Array.isArray(missoesDiariasData.historicoEncerrado)) missoesDiariasData.historicoEncerrado = [];
    if (!missoesDiariasData.gradeRef) missoesDiariasData.gradeRef = obterGradeAtualPorNivel();
}

function cloneSeguro(obj) {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        return null;
    }
}

function arquivarRotacaoDeGrade(gradeDestino) {
    garantirEstruturaMissoesDiarias();
    if (!missoesDiariasData || !missoesDiariasData.missoes.length) return;

    const registro = {
        em: new Date().toISOString(),
        gradeAnterior: missoesDiariasData.gradeRef || "No-Grade",
        gradeNova: gradeDestino,
        missoes: cloneSeguro(missoesDiariasData.missoes) || []
    };

    missoesDiariasData.historicoEncerrado.unshift(registro);
    if (missoesDiariasData.historicoEncerrado.length > MAX_HISTORICO_ROTACOES) {
        missoesDiariasData.historicoEncerrado.length = MAX_HISTORICO_ROTACOES;
    }
}

function resgatarPendenciasConcluidasAntesRotacao() {
    garantirEstruturaMissoesDiarias();
    if (!missoesDiariasData) return { qtd: 0, itens: 0 };

    let qtdMissoes = 0;
    let qtdItens = 0;
    missoesDiariasData.missoes.forEach(m => {
        if (m.concluida && !m.reivindicada) {
            aplicarRecompensa(m.recompensa);
            m.reivindicada = true;
            qtdMissoes++;
            if (m.recompensa && m.recompensa.itens) {
                Object.keys(m.recompensa.itens).forEach(nome => { qtdItens += (m.recompensa.itens[nome] || 0); });
            }
        }
    });
    return { qtd: qtdMissoes, itens: qtdItens };
}

function precisaRotacionarPorGrade(data) {
    if (!data) return true;
    const gradeAtual = obterGradeAtualPorNivel();
    return data.gradeRef !== gradeAtual;
}

function aplicarRotacaoPorGradeSeNecessario() {
    if (!missoesDiariasData) return;
    if (!precisaRotacionarPorGrade(missoesDiariasData)) return;
    const gradeAntes = missoesDiariasData.gradeRef || "No-Grade";
    const gradeNova = obterGradeAtualPorNivel();

    // Loss guard: auto-claim completed missions before grade rotation.
    const pendencias = resgatarPendenciasConcluidasAntesRotacao();
    if (pendencias.qtd > 0) {
        if (typeof atualizar === 'function') atualizar();
        if (typeof salvarJogo === 'function') salvarJogo();
        if (typeof escreverLog === 'function') {
            const msg = (typeof window.t === 'function')
                ? window.t('game.daily.logSafetyAutoClaim', { count: pendencias.qtd })
                : `[Daily] Safety: ${pendencias.qtd} completed mission(s) were auto-claimed before your grade changed.`;
            escreverLog(`<span style="color:#facc15;">${msg}</span>`);
        }
    }

    arquivarRotacaoDeGrade(gradeNova);
    const historicoPrevio = cloneSeguro(missoesDiariasData.historicoEncerrado) || [];
    missoesDiariasData = gerarMissoesDoDia();
    missoesDiariasData.historicoEncerrado = historicoPrevio;
    salvarMissoesDiarias();
    if (typeof escreverLog === 'function') {
        const msg = (typeof window.t === 'function')
            ? window.t('game.daily.logGradeUpdated', { prev: gradeAntes, next: missoesDiariasData.gradeRef })
            : `[Daily] Grade updated: ${gradeAntes} -> ${missoesDiariasData.gradeRef}. New missions unlocked (safe backup).`;
        escreverLog(`<span style="color:#60a5fa; font-weight:bold;">${msg}</span>`);
    }
}

window.inicializarMissoesDiarias = function() {
    if (!charName) return;
    const key = getChaveMissoesDiarias();
    const hoje = getDataHojeStr();
    const salvo = key ? localStorage.getItem(key) : null;

    if (!salvo) {
        missoesDiariasData = gerarMissoesDoDia();
        salvarMissoesDiarias();
        return;
    }

    try {
        const data = JSON.parse(salvo);
        if (!data || data.data !== hoje || !Array.isArray(data.missoes)) {
            missoesDiariasData = gerarMissoesDoDia();
            salvarMissoesDiarias();
            return;
        }
        missoesDiariasData = data;
        garantirEstruturaMissoesDiarias();
        aplicarRotacaoPorGradeSeNecessario();
    } catch (e) {
        missoesDiariasData = gerarMissoesDoDia();
        salvarMissoesDiarias();
    }
};

window.registrarProgressoMissaoDiaria = function(tipoEvento, valor = 1) {
    aplicarRotacaoPorGradeSeNecessario();
    if (!missoesDiariasData || !missoesDiariasData.missoes) return;
    let houveMudanca = false;

    missoesDiariasData.missoes.forEach(m => {
        if (m.reivindicada || m.tipo !== tipoEvento) return;
        m.progresso += valor;
        if (m.progresso >= m.alvo) {
            m.progresso = m.alvo;
            if (!m.concluida && typeof escreverLog === 'function') {
                const title = tituloMissaoDiaria(m);
                const msg = (typeof window.t === 'function')
                    ? window.t('game.daily.logMissionComplete', { title })
                    : `[Daily] Mission complete: ${title}!`;
                escreverLog(`<span style="color:#34d399; font-weight:bold;">${msg}</span>`);
            }
            m.concluida = true;
        }
        houveMudanca = true;
    });

    if (houveMudanca) {
        salvarMissoesDiarias();
        const aberta = document.getElementById('janela-missoes-diarias');
        if (aberta && aberta.style.display === 'flex') renderizarMissoesDiarias();
    }
};

function aplicarRecompensa(recompensa) {
    if (!recompensa) return;
    if (recompensa.adenas) adenas += recompensa.adenas;
    if (recompensa.ancientCoins) ancientCoins += recompensa.ancientCoins;
    if (recompensa.itens) {
        Object.keys(recompensa.itens).forEach(nome => {
            inventario[nome] = (inventario[nome] || 0) + recompensa.itens[nome];
        });
    }
}

function textoRecompensa(recompensa) {
    const partes = [];
    if (recompensa.adenas) partes.push(`+${recompensa.adenas}a`);
    if (recompensa.ancientCoins) partes.push(`+${recompensa.ancientCoins} AC`);
    if (recompensa.itens) {
        Object.keys(recompensa.itens).forEach(nome => partes.push(`${recompensa.itens[nome]}x ${nome}`));
    }
    return partes.join(' | ');
}

function todasMissoesConcluidas() {
    if (!missoesDiariasData || !missoesDiariasData.missoes) return false;
    return missoesDiariasData.missoes.every(m => m.reivindicada);
}

window.reivindicarMissaoDiaria = function(index) {
    if (!missoesDiariasData || !missoesDiariasData.missoes[index]) return;
    const m = missoesDiariasData.missoes[index];
    if (!m.concluida || m.reivindicada) return;

    m.reivindicada = true;
    aplicarRecompensa(m.recompensa);
    salvarMissoesDiarias();
    if (typeof atualizar === 'function') atualizar();
    if (typeof salvarJogo === 'function') salvarJogo();
    if (typeof escreverLog === 'function') {
        const title = tituloMissaoDiaria(m);
        const msg = (typeof window.t === 'function')
            ? window.t('game.daily.logRewardClaimed', { title })
            : `[Daily] Reward claimed: ${title}`;
        escreverLog(`<span style="color:#facc15;">${msg}</span>`);
    }

    renderizarMissoesDiarias();
};

window.reivindicarBonusMissaoDiaria = function() {
    if (!missoesDiariasData || missoesDiariasData.bonusReivindicado || !todasMissoesConcluidas()) return;
    const gradeAtual = missoesDiariasData.gradeRef || obterGradeAtualPorNivel();
    const mod = obterModificadorGrade(gradeAtual);
    const baseBonus = montarRecompensaPorGrade(gradeAtual, "arena");
    const bonus = {
        adenas: (baseBonus.adenas || 0) + Math.floor(12000 * mod),
        ancientCoins: (baseBonus.ancientCoins || 0) + Math.floor(10 * mod),
        itens: {
            ...(baseBonus.itens || {}),
            'Mana Potion': 6 + Math.floor(3 * mod)
        }
    };
    aplicarRecompensa(bonus);
    missoesDiariasData.bonusReivindicado = true;
    salvarMissoesDiarias();
    if (typeof atualizar === 'function') atualizar();
    if (typeof salvarJogo === 'function') salvarJogo();
    if (typeof escreverLog === 'function') {
        const msg = (typeof window.t === 'function')
            ? window.t('game.daily.logBonusClaimed')
            : '[Daily] Legendary daily bonus claimed!';
        escreverLog(`<span style="color:#a855f7; font-weight:bold;">${msg}</span>`);
    }
    renderizarMissoesDiarias();
};

function renderizarMissoesDiarias() {
    const container = document.getElementById('missoes-diarias-container');
    const bonusBox = document.getElementById('missoes-bonus-box');
    if (!container || !bonusBox || !missoesDiariasData) return;
    aplicarRotacaoPorGradeSeNecessario();
    const gradeAtual = missoesDiariasData.gradeRef || obterGradeAtualPorNivel();

    container.innerHTML = '';
    const labClaimed = (typeof window.t === 'function') ? window.t('game.daily.claimed') : 'CLAIMED';
    const labClaim = (typeof window.t === 'function') ? window.t('game.daily.claim') : 'CLAIM';
    const labProgress = (typeof window.t === 'function') ? window.t('game.daily.inProgress') : 'IN PROGRESS';
    const labReward = (typeof window.t === 'function') ? window.t('game.daily.reward') : 'Reward:';

    missoesDiariasData.missoes.forEach((m, idx) => {
        const pct = Math.floor((m.progresso / m.alvo) * 100);
        const btn = m.reivindicada
            ? `<button class="btn-l2" style="width:auto; padding:6px 10px; background:#374151;" disabled>${labClaimed}</button>`
            : m.concluida
                ? `<button class="btn-l2" style="width:auto; padding:6px 10px; background:#15803d;" onclick="reivindicarMissaoDiaria(${idx})">${labClaim}</button>`
                : `<button class="btn-l2" style="width:auto; padding:6px 10px; background:#444;" disabled>${labProgress}</button>`;
        const mtit = tituloMissaoDiaria(m);
        const mdesc = descMissaoDiaria(m);

        container.innerHTML += `
            <div style="background:rgba(10,10,10,0.8); border:1px solid ${m.concluida ? '#10b981' : '#3f3f46'}; border-radius:6px; padding:8px;">
                <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
                    <div style="text-align:left; flex:1;">
                        <div style="font-weight:bold; color:#e5e7eb; font-size:0.9em;">${m.icone} ${mtit}</div>
                        <div style="font-size:0.75em; color:#9ca3af; margin-top:2px;">${mdesc}</div>
                        <div style="font-size:0.75em; color:#facc15; margin-top:4px;">${labReward} ${textoRecompensa(m.recompensa)}</div>
                    </div>
                    ${btn}
                </div>
                <div style="margin-top:6px; width:100%; height:8px; background:#1f2937; border-radius:4px; overflow:hidden; border:1px solid #374151;">
                    <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, #059669, #34d399);"></div>
                </div>
                <div style="margin-top:3px; font-size:0.72em; color:#cbd5e1; text-align:right;">${m.progresso}/${m.alvo}</div>
            </div>
        `;
    });

    const bonusPronto = todasMissoesConcluidas();
    const bonusResgatado = !!missoesDiariasData.bonusReivindicado;
    const mod = obterModificadorGrade(gradeAtual);
    const bonusPreview = {
        adenas: Math.floor(12000 * mod),
        ancientCoins: Math.floor(10 * mod)
    };
    const ultimoHistorico = (missoesDiariasData.historicoEncerrado && missoesDiariasData.historicoEncerrado[0]) ? missoesDiariasData.historicoEncerrado[0] : null;
    const txtHistorico = ultimoHistorico
        ? ((typeof window.t === 'function')
            ? window.t('game.daily.historyGradeChange', { prev: ultimoHistorico.gradeAnterior, next: ultimoHistorico.gradeNova })
            : `Last safe grade change: ${ultimoHistorico.gradeAnterior} -> ${ultimoHistorico.gradeNova}`)
        : ((typeof window.t === 'function') ? window.t('game.daily.historyNone') : 'No grade change logged today.');

    const gradeEncant = normalizarGradeParaRecompensa(gradeAtual) === 'No-Grade' ? 'NG' : normalizarGradeParaRecompensa(gradeAtual);
    const linhaExtras = (typeof window.t === 'function')
        ? window.t('game.daily.bonusPreviewExtras', { grade: gradeEncant })
        : `1× Enchant Weapon (${gradeEncant}) + extra items`;

    const titBonus = (typeof window.t === 'function') ? window.t('game.daily.finalBonusTitle') : 'DAILY FINAL BONUS';
    const linhaGrade = (typeof window.t === 'function')
        ? window.t('game.daily.activeGradeLine', { grade: gradeAtual, tiers: GRADES_L2_OFICIAIS.join(' > ') })
        : `Active grade: ${gradeAtual} (tiers: ${GRADES_L2_OFICIAIS.join(' > ')})`;
    const btnBonusClaimed = (typeof window.t === 'function') ? window.t('game.daily.bonusClaimed') : 'BONUS CLAIMED';
    const btnClaimFinal = (typeof window.t === 'function') ? window.t('game.daily.claimFinalBonus') : 'CLAIM FINAL BONUS';
    const btnCompleteAll = (typeof window.t === 'function') ? window.t('game.daily.completeAllMissions') : 'Complete all missions';

    bonusBox.innerHTML = `
        <div style="font-weight:bold; color:#c084fc; margin-bottom:4px;">${titBonus}</div>
        <div style="color:#9ca3af; font-size:0.75em; margin-bottom:6px;">${linhaGrade}</div>
        <div style="margin-bottom:8px;">+${bonusPreview.adenas}a | +${bonusPreview.ancientCoins} AC | ${linhaExtras}</div>
        <div style="color:#6ee7b7; font-size:0.72em; margin-bottom:8px;">${txtHistorico}</div>
        ${bonusResgatado
            ? `<button class="btn-l2" style="width:100%; background:#374151;" disabled>${btnBonusClaimed}</button>`
            : bonusPronto
                ? `<button class="btn-l2" style="width:100%; background:#7e22ce;" onclick="reivindicarBonusMissaoDiaria()">${btnClaimFinal}</button>`
                : `<button class="btn-l2" style="width:100%; background:#444;" disabled>${btnCompleteAll}</button>`
        }
    `;
};

window.renderizarMissoesDiarias = renderizarMissoesDiarias;

window.abrirMissoesDiarias = function() {
    if (!charName) return;
    if (!missoesDiariasData) inicializarMissoesDiarias();
    aplicarRotacaoPorGradeSeNecessario();
    renderizarMissoesDiarias();
    abrirModal('janela-missoes-diarias', 1500);
};

window.fecharMissoesDiarias = function() {
    fecharModal('janela-missoes-diarias');
};
