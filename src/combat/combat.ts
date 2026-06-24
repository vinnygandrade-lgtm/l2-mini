/**
 * Sistema de combate e caçada (floresta)
 * Migrado: js/combat.js
 */
import type { ZonalMobTuneEntry } from '../types/game';
import { formatMobCardName, itemDropDisplayName, mobDisplayName } from './combat_i18n';

interface ForestMob {
  idUnico?: string;
  nome?: string;
  hp?: number;
  maxHp?: number;
  atk?: number;
  def?: number;
  lvl?: number;
  nivel?: number;
  dropAd?: number;
  xp?: number;
  idImg?: string;
  atkSpd?: number;
  progresso?: number;
  isChampion?: boolean;
  debuffs?: { preso?: boolean; spoil?: boolean; [key: string]: unknown };
  __forestDeathProcessing?: boolean;
}

type MobTemplate = {
  nome?: string;
  hpMax?: number;
  atk?: number;
  def?: number;
  lvl?: number;
  nivel?: number;
  dropAd?: number;
  xp?: number;
  idImg?: string;
  atkSpd?: number;
  chance?: number;
};

let loopAtaqueMonstro: ReturnType<typeof setInterval> | null = null;
let timeoutCacada: ReturnType<typeof setTimeout> | null = null;
let lootTurno: { adenas: number; xp: number; drops: Record<string, number> } = { adenas: 0, xp: 0, drops: {} };

// Partilhado com skills_engine.ts
window.motorBuffsEspeciais = window.motorBuffsEspeciais ?? { critMult: 2.0, esquiva: 0 };
window.motorPet = window.motorPet ?? null;

function prepararTelaCacada() {
    travarFlorestaResumoVitoria(false);
    pararAtaqueMonstro();
    window.monstrosAtivos.length = 0;
    document.getElementById('area-cacada').style.display = 'flex';
    document.getElementById('btn-iniciar-caca').style.display = 'block';
    document.getElementById('texto-procurando').style.display = 'none';
    document.getElementById('mobs-container').style.display = 'none';
    document.getElementById('botoes-combate').style.display = 'none';

    let containerBuffs = document.getElementById('player-combat-buffs');
    if(containerBuffs) containerBuffs.innerHTML = '';
}

function procurarMonstros() {
    if (window.cacadaResumoVitoriaAtivo) return;
    document.getElementById('btn-iniciar-caca').style.display = 'none';
    let texto = document.getElementById('texto-procurando');
    texto.style.display = 'block';
    texto.innerText = (typeof window.t === 'function') ? window.t('game.combat.searchingTracks') : 'Searching for tracks in the zone...';

    lootTurno = { adenas: 0, xp: 0, drops: {} };
    let tempoSuspense = 1500 + (Math.random() * 1500);

    if (timeoutCacada) clearTimeout(timeoutCacada);

    timeoutCacada = setTimeout(() => {
        timeoutCacada = null;
        let telaFloresta = document.getElementById('tela-floresta');
        if(telaFloresta && telaFloresta.style.display === 'flex') {
            document.getElementById('area-cacada').style.display = 'none';
            document.getElementById('mobs-container').style.display = 'flex';
            document.getElementById('botoes-combate').style.display = 'flex';

            spawnMonstros();
            iniciarAtaqueMonstro();
            try {
                if (typeof window.TutorialEngine !== 'undefined' && typeof window.TutorialEngine.notifyHuntSearch === 'function') {
                    window.TutorialEngine.notifyHuntSearch();
                }
            } catch (e) { /* ignore */ }
        }
    }, tempoSuspense);
}

function sortearMob(zona) {
    if (!zona.mobs) return { nome: 'ERROR', hpMax: 1, atk: 1, def: 1, dropAd: 0, xp: 0, idImg: 'spider', atkSpd: 2000 };
    let roll = Math.random() * 100;
    let acc = 0;
    for (let mob of zona.mobs) {
        acc += mob.chance;
        if (roll <= acc) return mob;
    }
    return zona.mobs[0];
}

/** XP aplicado no abate para o HUD acompanhar; lootTurno.xp acumula só o total do turno (modal). */
function aplicarXpGanhoFloresta(quantia) {
    const q = Number(quantia);
    if (!isFinite(q) || q <= 0) return;
    window.xpAtual = (Number(window.xpAtual) || 0) + q;
    if (typeof window.calcularXpNecessario !== 'function') {
        if (typeof window.atualizar === 'function') window.atualizar();
        return;
    }
    let xpNec = window.xpNecessario;
    if (typeof xpNec !== 'number' || xpNec < 1) {
        xpNec = window.calcularXpNecessario(Number(window.nivel) || 1);
        window.xpNecessario = xpNec;
    }
    while (window.xpAtual >= window.xpNecessario) {
        window.nivel = (Number(window.nivel) || 1) + 1;
        window.xpAtual -= window.xpNecessario;
        window.xpNecessario = window.calcularXpNecessario(window.nivel);
        if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
        if (typeof window.playerStats !== 'undefined' && window.playerStats) {
            window.playerHP = window.playerStats.maxHp;
            window.playerMP = window.playerStats.maxMp;
        }
        if (typeof window.tocarSom === 'function') window.tocarSom('lvlup');
        if (typeof window.escreverLog === 'function') {
            const msg = (typeof window.t === 'function')
                ? window.t('game.combat.levelUp', { level: window.nivel })
                : ('LEVEL UP! Level ' + window.nivel + '!');
            window.escreverLog(`<span style="color:#ffcc00; font-weight:bold;">${msg}</span>`);
        }
        const nl = window.nivel;
        if (nl === 20 || nl === 40 || nl === 76) {
            if (typeof window.escreverLog === 'function') {
                const hint = (typeof window.t === 'function')
                    ? window.t('game.combat.classTransferHint')
                    : '✨ You can class transfer! Visit the Grand Master in town.';
                window.escreverLog(`<span style="color:#a855f7; font-weight:bold; text-shadow: 1px 1px 0 #000;">${hint}</span>`);
            }
        }
    }
    if (typeof window.atualizar === 'function') window.atualizar();
}

function spawnMonstros() {
    let maxMobs = 1;
    let zonaID = window.zonaAtual.id || 'No-Grade';

    switch(zonaID) {
        case 'No-Grade': maxMobs = 3; break; // 1–3 por pull (tuning NG + mob stats seguram para quem inicia)
        case 'D': maxMobs = 4; break;
        case 'C': maxMobs = 5; break;
        case 'B': maxMobs = 7; break;
        case 'A': maxMobs = 8; break;
        case 'S': maxMobs = 10; break;
    }

    let qtd = Math.floor(Math.random() * maxMobs) + 1;
    window.monstrosAtivos.length = 0; // Limpa o array mantendo a referência global
    let nomesSorteados = [];

    const zonaKey = (window.zonaAtual && window.zonaAtual.id) ? window.zonaAtual.id : 'No-Grade';
    const tuneDefault: ZonalMobTuneEntry = { hp: 1, atk: 1, def: 1 };
    const tune: ZonalMobTuneEntry = (typeof window.L2MINI_ZONAL_MOB_TUNING === 'object' && window.L2MINI_ZONAL_MOB_TUNING[zonaKey])
        ? window.L2MINI_ZONAL_MOB_TUNING[zonaKey]
        : tuneDefault;
    const thp = (typeof tune.hp === 'number' && tune.hp > 0) ? tune.hp : 1;
    let tatk = (typeof tune.atk === 'number' && tune.atk > 0) ? tune.atk : 1;
    const tdef = (typeof tune.def === 'number' && tune.def > 0) ? tune.def : 1;
    const packMult = (typeof tune.packAtkMult === 'number' && tune.packAtkMult > 0 && tune.packAtkMult <= 1 && qtd >= 3)
        ? tune.packAtkMult
        : 1;
    if (packMult !== 1) tatk *= packMult;

    const defChampChance = 0.05;
    const defChampHp = 10;
    const defChampAtk = 1.5;
    const champChance = (typeof tune.championChance === 'number' && tune.championChance >= 0 && tune.championChance <= 1)
        ? tune.championChance
        : defChampChance;
    const champHpMult = (typeof tune.championHpMult === 'number' && tune.championHpMult > 0)
        ? tune.championHpMult
        : defChampHp;
    const champAtkMult = (typeof tune.championAtkMult === 'number' && tune.championAtkMult > 0)
        ? tune.championAtkMult
        : defChampAtk;
    const champOnePerPull = tune.championOnePerPull === true;
    let jaTemCampeaoNesteSpawn = false;

    for (let i = 0; i < qtd; i++) {
        let mobEscolhido = sortearMob(window.zonaAtual);
        
        // Champion: defaults 5% / ×10 HP / ×1.5 atk; zonas podem override (ex.: No-Grade).
        let isChampion = Math.random() < champChance;
        if (champOnePerPull && jaTemCampeaoNesteSpawn && isChampion) isChampion = false;
        if (isChampion) jaTemCampeaoNesteSpawn = true;
        let multHP = isChampion ? champHpMult : 1;
        let multAtk = isChampion ? champAtkMult : 1;
        const champLabel = (typeof window.t === 'function') ? window.t('game.combat.championTag') : 'CHAMPION';
        const plainName = mobDisplayName(mobEscolhido.idImg, mobEscolhido.nome);
        let nomeFinal = plainName;

        nomesSorteados.push(isChampion ? `${champLabel} ${plainName}` : plainName);
        
        const baseHpMax = Math.max(1, Math.floor(Number(mobEscolhido.hpMax) * thp || 1));
        const instMaxHp = Math.max(1, Math.floor(baseHpMax * multHP));
        const atkAjustado = Math.max(1, Math.floor(Number(mobEscolhido.atk) * tatk * multAtk));
        const defAjustada = Math.max(1, Math.floor(Number(mobEscolhido.def) * tdef));
        window.monstrosAtivos.push({
            idUnico: 'mob_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 9),
            nome: nomeFinal,
            hp: instMaxHp,
            maxHp: instMaxHp,
            atk: atkAjustado,
            def: defAjustada,
            lvl: mobEscolhido.lvl || mobEscolhido.nivel || 1, // Garante que o nível existe para os cálculos
            dropAd: mobEscolhido.dropAd,
            xp: mobEscolhido.xp,
            idImg: mobEscolhido.idImg,
            atkSpd: mobEscolhido.atkSpd || 2000,
            progresso: 0, 
            isChampion: isChampion, // Identificador para loot e visual
            debuffs: {}
        });
    }

    let resumoNomes = nomesSorteados.reduce((acc, curr) => { acc[curr] = (acc[curr] || 0) + 1; return acc; }, {});
    let msgNomes = Object.entries(resumoNomes).map(([n, q]) => `${q}x ${n}`).join(', ');

    const ambushLine = (typeof window.t === 'function') ? window.t('game.combat.ambush', { list: msgNomes }) : (`AMBUSH! ${msgNomes} appeared!`);
    window.escreverLog(`<span style="color:#ef4444; font-weight:bold;">${ambushLine}</span>`);
    renderizarMonstros();
    if (typeof window.syncAllForestMobHpBars === 'function') window.syncAllForestMobHpBars();
}

function renderizarMonstros() {
    const container = document.getElementById('mobs-container');
    if(!container) return;
    
    let htmlFinal = '';

    window.monstrosAtivos.forEach((mobRaw, index) => {
        const mob = mobRaw as ForestMob;
        const capHp = Math.max(1, Number(mob.maxHp) || 1);
        let hpVal = Number(mob.hp);
        if (!Number.isFinite(hpVal)) hpVal = capHp;
        hpVal = Math.max(0, hpVal);
        let hpPorcento = (hpVal / capHp) * 100;
        if (hpPorcento < 0) hpPorcento = 0;
        if (hpPorcento > 100) hpPorcento = 100;

        let imgSrc = `assets/mobs/${mob.idImg}_idle.png`;
        let transform = 'translateY(0)';
        if (hpPorcento < 50 && hpPorcento > 0) { transform = 'translateY(5px) rotate(3deg)'; }

        let marker = (index === 0 && window.monstrosAtivos.length > 1) ? '<span style="color:#ef4444; margin-left:2px;">▼</span>' : '';
        let exibicaoHp = Math.max(0, Math.floor(hpVal));

        let filtroVisual = mob.isChampion ? 
            'filter: sepia(1) saturate(8) hue-rotate(-50deg) drop-shadow(0 0 8px gold);' : 
            'filter: drop-shadow(0 0 5px rgba(255,0,0,0.5));';

        htmlFinal += `
        <div id="mob-card-${mob.idUnico}" style="display:flex; flex-direction:column; align-items:center; flex: 1 1 18%; min-width: 60px; max-width: 90px;">
            <div style="width: 100%; margin-bottom: 5px; text-align:center;">
                <div style="color: #ffcc00; font-size: 0.55em; font-weight: bold; text-shadow: 1px 1px 0 #000; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${formatMobCardName(mob)}${marker}</div>
                <div style="width: 100%; background: #222; height: 3px; border-radius: 2px; overflow: hidden; border: 1px solid #444;">
                    <div id="mob-cd-fill-${mob.idUnico}" style="background: #ef4444; width: ${mob.progresso}%; height: 100%;"></div>
                </div>
            </div>
            <img id="monster-img-${mob.idUnico}" src="${imgSrc}" style="width:100%; object-fit:contain; ${filtroVisual} transition: transform 0.1s ease-out; transform: ${transform}; opacity: ${hpVal > 0 ? 1 : 0};">
            <div class="hp-bar" style="margin-top: 5px; margin-bottom: 5px; width:100%;">
                <div id="mob-hp-fill-${mob.idUnico}" class="mob-hunt-hp-fill" style="width: ${hpPorcento}%;"></div>
                <small id="mob-hp-text-${mob.idUnico}" class="mob-hunt-hp-text" style="position:absolute; width:100%; left:0; top:0; color:white; font-size:8px; z-index:2;">${exibicaoHp}</small>
            </div>
            <div id="mob-debuffs-${mob.idUnico}" style="display:flex; gap:3px; justify-content:center; margin-top:2px; height:20px;"></div>
        </div>`;
    });

    container.innerHTML = htmlFinal;
}

function iniciarAtaqueMonstro() {
    if (loopAtaqueMonstro) clearInterval(loopAtaqueMonstro);

    loopAtaqueMonstro = setInterval(() => {
        if (window.monstrosAtivos.length === 0 || window.playerHP <= 0) return;

        // Tutorial: O monstro espera o primeiro ataque do jogador no Step 8
        if (typeof window.TutorialEngine !== 'undefined' && window.TutorialEngine.isRunning()) {
            if (window.tutorialProgress.step === 8 && !window.tutorialFirstAttackDone) {
                return; // Espera o jogador atacar
            }
        }

        window.monstrosAtivos.forEach((mobRaw) => {
            const mob = mobRaw as ForestMob;
            if (!mob || mob.__forestDeathProcessing) return;
            if (Math.floor(Number(mob.hp)) <= 0) return;

            let velocidadeMonstro = mob.atkSpd;
            if (mob.debuffs && mob.debuffs.preso) velocidadeMonstro *= 1.5;

            mob.progresso += (50 / velocidadeMonstro) * 100;

            if (mob.progresso >= 100) {
                mob.progresso = 0; 

                const mobImg = document.getElementById(`monster-img-${mob.idUnico}`) as HTMLImageElement | null;
                if (mobImg) {
                    mobImg.src = `assets/mobs/${mob.idImg}_atk.png`;
                    setTimeout(() => {
                        const mAtual = document.getElementById(`monster-img-${mob.idUnico}`) as HTMLImageElement | null;
                        if (mAtual && mAtual.src.includes('_atk')) mAtual.src = `assets/mobs/${mob.idImg}_idle.png`;
                    }, 300);
                }

                window.executarDanoDeUmMonstro?.(mob);
            }

            let fill = document.getElementById(`mob-cd-fill-${mob.idUnico}`);
            if (fill) fill.style.width = mob.progresso + '%';
        });

        if (typeof reconciliarMobsFlorestHpZero === 'function') reconciliarMobsFlorestHpZero();
    }, 50);
}

function pararAtaqueMonstro() {
    if (loopAtaqueMonstro) { clearInterval(loopAtaqueMonstro); loopAtaqueMonstro = null; }
    if (timeoutCacada) { clearTimeout(timeoutCacada); timeoutCacada = null; }
    if (window.motorPet) { clearInterval(window.motorPet); window.motorPet = null; }
}

window.dispararAnimacaoCooldown = function dispararAnimacaoCooldown(nome: string, tempoMs: number) {
    if (typeof window.cooldownsAtivos !== 'undefined') window.cooldownsAtivos[nome] = Date.now() + tempoMs;
};

/** Loot + modal de vitória quando não restam mobs (um único lugar para evitar softlock). */
function iniciarFechamentoVitoriaCacada() {
    pararAtaqueMonstro();
    setTimeout(() => {
        let mobsContainer = document.getElementById('mobs-container');
        if (mobsContainer) mobsContainer.innerHTML = '';
        window.adenas = (Number(window.adenas) || 0) + lootTurno.adenas;
        for (let itemDrop in lootTurno.drops) {
            if (itemDrop === 'Ancient Coin') {
                window.ancientCoins = (Number(window.ancientCoins) || 0) + lootTurno.drops[itemDrop];
                continue;
            }
            if(window.InventoryManager && typeof window.InventoryManager.adicionarStack === 'function') {
                window.InventoryManager.adicionarStack(itemDrop, lootTurno.drops[itemDrop]);
            } else if(window.inventario[itemDrop]) window.inventario[itemDrop] += lootTurno.drops[itemDrop];
            else window.inventario[itemDrop] = lootTurno.drops[itemDrop];
        }
        if (typeof window.atualizar === 'function') window.atualizar();
        if (typeof salvarJogo === 'function') window.salvarJogo();
        mostrarResumoVitoria();
    }, 800);
}

/**
 * Último recurso: mob morto ainda na lista (anti-softlock). Sem loot deste mob.
 */
function forceRemoveStuckDeadForestMob(monstro: ForestMob | null | undefined) {
    const list = window.monstrosAtivos;
    if (!Array.isArray(list)) return;
    let idx = monstro ? list.indexOf(monstro) : -1;
    if (idx < 0 && monstro && monstro.idUnico) {
        idx = list.findIndex((m) => m && (m as ForestMob).idUnico === monstro.idUnico);
    }
    if (idx < 0 || idx >= list.length) return;
    console.warn('[Combat] forceRemoveStuckDeadForestMob — mob was dead but not removed from fight list');
    list.splice(idx, 1);
    if (typeof renderizarMonstros === 'function') renderizarMonstros();
    if (list.length === 0) iniciarFechamentoVitoriaCacada();
    else setTimeout(() => { if (window.monstrosAtivos.length > 0 && typeof renderizarMonstros === 'function') renderizarMonstros(); }, 50);
}

function tryProcessForestMobDeath(monstro: ForestMob | null | undefined) {
    if (!monstro || typeof monstro !== 'object') return;
    if (monstro.__forestDeathProcessing) return;
    const list = window.monstrosAtivos;
    if (!Array.isArray(list)) return;
    const idx = list.indexOf(monstro);
    if (idx < 0) return;
    if (Math.floor(Number(monstro.hp)) > 0) return;
    monstro.hp = 0;

    monstro.__forestDeathProcessing = true;
    try {
        processarMorteMonstro(idx, monstro);
    } catch (err) {
        console.error('[tryProcessForestMobDeath]', err);
    } finally {
        monstro.__forestDeathProcessing = false;
    }
    if (list.indexOf(monstro) >= 0 && Math.floor(Number(monstro.hp)) <= 0) {
        if (typeof forceRemoveStuckDeadForestMob === 'function') forceRemoveStuckDeadForestMob(monstro);
    }
};

function reconciliarMobsFlorestHpZero() {
    const list = window.monstrosAtivos;
    if (!Array.isArray(list) || !list.length) return;
    for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i] as ForestMob;
        if (!m || m.__forestDeathProcessing) continue;
        if (Math.floor(Number(m.hp)) <= 0) {
            m.hp = 0;
            if (typeof tryProcessForestMobDeath === 'function') tryProcessForestMobDeath(m);
        }
    }
};

function processarMorteMonstro(index: number, mobRef?: ForestMob | null) {
    const list = window.monstrosAtivos;
    if (!Array.isArray(list) || list.length === 0) return;

    let resolvedIdx = index;
    if (mobRef != null && typeof mobRef === 'object') {
        const found = list.indexOf(mobRef);
        if (found < 0) return;
        resolvedIdx = found;
    }
    if (resolvedIdx < 0 || resolvedIdx >= list.length) return;
    let mobMorto = list[resolvedIdx] as ForestMob;
    if (!mobMorto) return;
    if (mobRef != null && mobMorto !== mobRef) {
        const sameId = mobRef.idUnico && mobMorto.idUnico && mobRef.idUnico === mobMorto.idUnico;
        if (!sameId) return;
    }

    if(typeof tocarSom === 'function') tocarSom('adenas');
    
    // --- MULTIPLICADORES DE RECOMPENSA (CHAMPION & SPOIL) ---
    let multiplicadorChampion = mobMorto.isChampion ? 5 : 1;
    
    // A MÁGICA DO SPOIL: Se o monstro morrer com o debuff do Spoil, dobra o loot!
    let multiplicadorSpoil = (mobMorto.debuffs && mobMorto.debuffs.spoil) ? 2 : 1; 
    let msgSpoil = multiplicadorSpoil > 1 ? `<span style="color:#facc15; font-weight:bold;"> ${(typeof window.t === 'function') ? window.t('game.combat.spoiled') : '[SPOILED]'}</span>` : "";
    
    // O Anão passivo já ganha 1.5x de Adena. Com Spoil ele ganha o dobro disso!
    let baseAdena = (window.charRace === "Dwarf") ? (mobMorto.dropAd * 1.5) : mobMorto.dropAd;
    let progMult = 1;
    if (typeof window.EconomyBalance !== 'undefined' && typeof window.EconomyBalance.adenaLootMult === 'function') {
        const zid = (typeof window.zonaAtual !== 'undefined' && window.zonaAtual && window.zonaAtual.id) ? window.zonaAtual.id : 'No-Grade';
        progMult = window.EconomyBalance.adenaLootMult(typeof window.nivel !== 'undefined' ? window.nivel : 1, zid);
    }
    let ganhoAdena = Math.floor(baseAdena * multiplicadorChampion * multiplicadorSpoil * progMult);
    let ganhoCoinsDoMob = 0;
    
    let chanceDrop = (window.charRace === "Dwarf") ? 100 : 80;

    lootTurno.adenas += ganhoAdena;
    const xpGanhoMob = mobMorto.xp * multiplicadorChampion;
    lootTurno.xp += xpGanhoMob;
    aplicarXpGanhoFloresta(xpGanhoMob);

    // --- 1. DROP NORMAL (Materiais) ---
    if (Math.random() * 100 <= chanceDrop) {
        const itensPossiveis = ["Animal Skin", "Animal Bone", "Coal", "Charcoal", "Iron Ore"];
        let drop = itensPossiveis[Math.floor(Math.random() * itensPossiveis.length)];
        
        // Champions dropam mais materiais, e o Spoil dobra a quantidade final!
        let qtdDrop = mobMorto.isChampion ? 3 : 1;
        qtdDrop = qtdDrop * multiplicadorSpoil; 
        
        lootTurno.drops[drop] = (lootTurno.drops[drop] || 0) + qtdDrop;
    }

    // Variável de zona — grade canónica para lógica; nome canónico (EN catálogo) para RPC na nuvem
    const zonaGrade =
        typeof window.zonaAtual !== 'undefined' && window.zonaAtual && window.zonaAtual.id
            ? window.zonaAtual.id
            : 'No-Grade';
    const zonaNomeRpc =
        typeof window.zoneCanonicalName === 'function'
            ? window.zoneCanonicalName(zonaGrade)
            : typeof window.zonaAtual !== 'undefined' && window.zonaAtual && window.zonaAtual.nome
              ? window.zonaAtual.nome
              : '';

    // --- 2. Ancient Coin — só no mundo se EconomyBalance.allowAncientCoinWorldDrops (padrão: craft) ---
    const acDropMundo = typeof window.EconomyBalance !== 'undefined'
        && typeof window.EconomyBalance.isAncientCoinWorldDropEnabled === 'function'
        && window.EconomyBalance.isAncientCoinWorldDropEnabled();
    let levelDoMob = mobMorto.lvl || mobMorto.nivel || 1;
    let antiAbuso = (window.nivel - levelDoMob >= 20);

    if (acDropMundo && window.SupabaseAPI && typeof window.SupabaseAPI.validateMobLoot === 'function'
        && window.SupabaseAPI.getUser() && window.charName && !antiAbuso) {
        // Chamada assíncrona para a nuvem (não bloqueia o fluxo visual de morte)
        window.SupabaseAPI.validateMobLoot(
            window.charName, 
            mobMorto.idUnico, 
            zonaNomeRpc, 
            mobMorto.isChampion, 
            !!(mobMorto.debuffs && mobMorto.debuffs.spoil),
            levelDoMob
        ).then(({ data, error }) => {
            if (error) {
                console.warn('[Loot RPC Error]', error);
                return;
            }
            if (data && data.success) {
                // Sincroniza a Adena com o valor calculado pelo servidor (Autoridade Máxima)
                if (data.adena_reward !== undefined) {
                    // Ajusta o ganho de adena do turno para o valor real do servidor
                    const diff = data.adena_reward - ganhoAdena;
                    lootTurno.adenas += diff;
                    console.log(`💰 [Authority] Adena ajustada pelo servidor: ${data.adena_reward}`);
                }

                // Se o servidor deu Ancient Coins
                if (data.ancient_coins > 0) {
                    let qtd = data.ancient_coins;
                    lootTurno.drops["Ancient Coin"] = (lootTurno.drops["Ancient Coin"] || 0) + qtd;
                    if(typeof escreverLog === 'function') {
                        window.escreverLog(`<span style="color:#a855f7; font-weight:bold; text-shadow: 1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.combat.rareDrop', { qty: qtd, item: itemDropDisplayName('Ancient Coin') }) : ('💎 RARE DROP! You found ' + qtd + '× Ancient Coin!')}</span>`);
                    }
                    if(typeof tocarSom === 'function') tocarSom('enchant');
                }
                // Se o servidor deu uma Receita
                if (data.recipe_dropped) {
                    let rec = data.recipe_dropped;
                    lootTurno.drops[rec] = (lootTurno.drops[rec] || 0) + 1;
                    if(typeof escreverLog === 'function') {
                        window.escreverLog(`<span style="color:#f97316; font-weight:bold; text-shadow: 1px 1px 2px #000;">${(typeof window.t === 'function') ? window.t('game.combat.legendaryDrop', { item: itemDropDisplayName(rec) }) : ('🔥 LEGENDARY DROP: ' + rec + '!')}</span>`);
                    }
                    if(typeof tocarSom === 'function') tocarSom('lvlup');
                }
            }
        }).catch(err => console.error('[Loot RPC Exception]', err));
    } else if (acDropMundo) {
        // MODO LOCAL (Offline ou Anti-Abuso)
        let chanceMoeda = (mobMorto.debuffs && mobMorto.debuffs.spoil) ? 7 : 3.5;
        if (antiAbuso) { chanceMoeda = 0; }

        if (Math.random() * 100 <= chanceMoeda) {
            let baseCoins = 1;
            if (zonaGrade === 'D') baseCoins = 2;
            else if (zonaGrade === 'C') baseCoins = 5;
            else if (zonaGrade === 'B') baseCoins = 10;
            else if (zonaGrade === 'A') baseCoins = 22;
            else if (zonaGrade === 'S') baseCoins = 52;
            
            let qtdMoeda = mobMorto.isChampion ? (baseCoins * 2) : baseCoins; 
            lootTurno.drops["Ancient Coin"] = (lootTurno.drops["Ancient Coin"] || 0) + qtdMoeda;
            
            if(typeof escreverLog === 'function') window.escreverLog(`<span style="color:#a855f7; font-weight:bold; text-shadow: 1px 1px 0 #000;">${(typeof window.t === 'function') ? window.t('game.combat.rareDrop', { qty: qtdMoeda, item: itemDropDisplayName('Ancient Coin') }) : ('💎 RARE DROP! You found ' + qtdMoeda + '× Ancient Coin!')}</span>`);
            if(typeof tocarSom === 'function') tocarSom('enchant'); 
        }

        // --- 3. DROP LENDÁRIO LOCAL ---
        if (zonaGrade === 'B' || zonaGrade === 'S') {
            let chanceRecipe = mobMorto.isChampion ? 0.5 : 0.1;
            if (Math.random() * 100 <= chanceRecipe) {
                let listaRecs = ['Recipe: Vesper Noble Heavy', 'Recipe: Vesper Noble Light', 'Recipe: Vesper Noble Robe', 'Recipe: Vesper Weapon', 'Recipe: Vesper Jewel'];
                let recSorteada = listaRecs[Math.floor(Math.random() * listaRecs.length)];
                lootTurno.drops[recSorteada] = (lootTurno.drops[recSorteada] || 0) + 1;
                if(typeof escreverLog === 'function') window.escreverLog(`<span style="color:#f97316; font-weight:bold; text-shadow: 1px 1px 2px #000;">${(typeof window.t === 'function') ? window.t('game.combat.legendaryDrop', { item: itemDropDisplayName(recSorteada) }) : ('🔥 LEGENDARY DROP: ' + recSorteada + '!')}</span>`);
                if(typeof tocarSom === 'function') tocarSom('lvlup');
            }
        }
    }
    // ----------------------------------------

    const mobImgDie = document.getElementById(`monster-img-${mobMorto.idUnico}`) as HTMLImageElement | null;
    if (mobImgDie) {
        mobImgDie.src = `assets/mobs/${mobMorto.idImg}_die.png`;
        mobImgDie.classList.remove('tomando-dano');
        void mobImgDie.offsetWidth;
        mobImgDie.classList.add('mob-desintegrando');
    }

    // Aviso no log se o monstro foi farmado com Spoil
    const defeatedLine = (typeof window.t === 'function') ? window.t('game.combat.monsterDefeated') : 'The monster was defeated!';
    if(typeof escreverLog === 'function') window.escreverLog(`<span style="color:#aaa;">${defeatedLine}${msgSpoil}</span>`);

    if (typeof window.registrarProgressoMissaoDiaria === 'function') {
        window.registrarProgressoMissaoDiaria('matar_monstros', 1);
        if (mobMorto.isChampion) window.registrarProgressoMissaoDiaria('matar_champions', 1);
        if (ganhoAdena > 0) window.registrarProgressoMissaoDiaria('ganhar_adena', ganhoAdena);
        if (ganhoCoinsDoMob > 0) window.registrarProgressoMissaoDiaria('coletar_coins', ganhoCoinsDoMob);
    }
    if (mobMorto.isChampion && typeof window.EndgamePursuits !== 'undefined' && typeof window.EndgamePursuits.onChampionKill === 'function') {
        window.EndgamePursuits.onChampionKill();
    }

    window.monstrosAtivos.splice(resolvedIdx, 1);

    if (window.monstrosAtivos.length === 0) {
        iniciarFechamentoVitoriaCacada();
    } else {
        setTimeout(() => { if (window.monstrosAtivos.length > 0) renderizarMonstros(); }, 700);
    }
}

// ==========================================
// SISTEMA VISUAL DE BUFFS/DEBUFFS
// ==========================================
function atualizarIconesBuffPlayer(nome, duracaoMs, iconeHtml) {
    const container = document.getElementById('player-combat-buffs');
    if (!container) return;
    let idIcone = `buff-${nome.replace(/\s+/g, '-')}`;
    if (document.getElementById(idIcone)) {
        let divAntiga = document.getElementById(idIcone);
        const overlay = divAntiga.querySelector('.buff-timer-overlay') as HTMLElement | null;
        if (overlay) { overlay.style.animation = 'none'; void overlay.offsetWidth; overlay.style.animation = `drain-buff ${duracaoMs}ms linear forwards`; }
        return;
    }
    let div = document.createElement('div'); div.id = idIcone; div.className = 'mini-icon-buff';
    div.innerHTML = `${iconeHtml}<div class="buff-timer-overlay" style="animation: drain-buff ${duracaoMs}ms linear forwards;"></div>`;
    container.appendChild(div);
    setTimeout(() => { if (div.parentNode) div.parentNode.removeChild(div); }, duracaoMs);
}

function atualizarIconesDebuffMonstro(indexMonstro: number, nome: string, duracaoMs: number, iconeHtml: string) {
    const monstro = window.monstrosAtivos[indexMonstro] as ForestMob | undefined;
    if(!monstro) return;
    const container = document.getElementById(`mob-debuffs-${monstro.idUnico}`);
    if (!container) return;
    let idIcone = `debuff-${nome.replace(/\s+/g, '-')}-mob-${monstro.idUnico}`;
    if (document.getElementById(idIcone)) return;
    let div = document.createElement('div'); div.id = idIcone; div.className = 'mini-icon-buff'; div.style.width = '16px'; div.style.height = '16px';
    div.innerHTML = `${iconeHtml}<div class="buff-timer-overlay" style="animation: drain-buff ${duracaoMs}ms linear forwards;"></div>`;
    container.appendChild(div);
    setTimeout(() => { if (div.parentNode) div.parentNode.removeChild(div); }, duracaoMs);
}

function travarFlorestaResumoVitoria(ativo) {
    window.cacadaResumoVitoriaAtivo = !!ativo;
    const floresta = document.getElementById('tela-floresta');
    if (floresta) floresta.classList.toggle('forest-hunt-summary-open', !!ativo);
    const botoes = document.getElementById('botoes-combate');
    if (botoes) botoes.style.display = ativo ? 'none' : '';
}

function mostrarResumoVitoria() {
    let containerLoot = document.getElementById('vitoria-loot');
    const labAdena = (typeof window.t === 'function') ? window.t('game.combat.victoryAdena') : 'Adena:';
    const labXp = (typeof window.t === 'function') ? window.t('game.combat.victoryXp') : 'XP:';
    const labDrops = (typeof window.t === 'function') ? window.t('game.combat.victoryDrops') : 'Drops:';
    let htmlLoot = `<div style="display:flex; justify-content:space-between;"><span>${labAdena}</span> <b style="color:#ffcc00;">+${lootTurno.adenas}</b></div><div style="display:flex; justify-content:space-between;"><span>${labXp}</span> <b style="color:#10b981;">+${lootTurno.xp}</b></div><hr style="border:0.5px solid #444; margin:5px 0;"><div style="color:#a855f7; font-weight:bold;">${labDrops}</div>`;
    for (let item in lootTurno.drops) { htmlLoot += `<div style="display:flex; justify-content:space-between;"><span>${itemDropDisplayName(item)}:</span> <b>x${lootTurno.drops[item]}</b></div>`; }
    containerLoot.innerHTML = htmlLoot;
    travarFlorestaResumoVitoria(true);
    abrirModal('janela-vitoria', 1500);
}

function fecharVitoriaEProcurar() {
    travarFlorestaResumoVitoria(false);
    fecharModal('janela-vitoria');
    prepararTelaCacada();
    procurarMonstros();
}

function fecharVitoriaEVoltar() {
    travarFlorestaResumoVitoria(false);
    fecharModal('janela-vitoria');
    window.irPara('cidade');
}

function showForestFleeFailFloat() {
    const host = document.getElementById('tela-floresta');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'forest-flee-fail-float';
    el.setAttribute('role', 'status');
    const msg = (typeof window.t === 'function')
        ? window.t('game.hunt.fleeFailFloat')
        : 'Retreat blocked!';
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
    }, 2600);
}

function showForestFleeSuccessScreen() {
    const ov = document.getElementById('forest-flee-success-overlay');
    if (!ov) {
        if (typeof irPara === 'function') window.irPara('cidade');
        return;
    }
    if (ov.dataset.active === '1') return;
    ov.dataset.active = '1';
    ov.classList.add('forest-flee-success-overlay--visible');
    ov.setAttribute('aria-hidden', 'false');
    if (window.I18n && typeof window.I18n.refreshDom === 'function') {
        try { window.I18n.refreshDom(ov); } catch (e) {}
    }
}

function confirmForestFleeReturnToTown() {
    const ov = document.getElementById('forest-flee-success-overlay');
    if (ov) {
        ov.classList.remove('forest-flee-success-overlay--visible');
        ov.setAttribute('aria-hidden', 'true');
        delete ov.dataset.active;
    }
    if (typeof atualizar === 'function') atualizar();
    if (typeof irPara === 'function') window.irPara('cidade');
    if (typeof salvarJogo === 'function') window.salvarJogo();
};

function tentarFugir() {
    if (window.cacadaResumoVitoriaAtivo) return;
    if (!window.podeAtacar || window.monstrosAtivos.length === 0) return;
    window.podeAtacar = false;
    window.escreverLog(`<span style="color:#fcd34d;">${(typeof window.t === 'function') ? window.t('game.combat.fleeing') : 'Trying to escape...'}</span>`);
    setTimeout(() => {
        if (Math.random() * 100 <= 50) {
            window.escreverLog(`<span style="color:#10b981;">${(typeof window.t === 'function') ? window.t('game.combat.escaped') : 'You got away safely!'}</span>`);
            prepararTelaCacada();
            showForestFleeSuccessScreen();
        } else {
            window.escreverLog(`<span style="color:#ef4444;">${(typeof window.t === 'function') ? window.t('game.combat.escapeFailed') : 'Escape failed!'}</span>`);
            showForestFleeFailFloat();
        }
        window.podeAtacar = true;
    }, 800);
}

/** Morte na caça: painel estilo crônica L2; HP já reduzido em combat_math. */
function showForestDeathScreen() {
    const ov = document.getElementById('forest-death-overlay');
    if (!ov) {
        if (typeof prepararTelaCacada === 'function') prepararTelaCacada();
        if (typeof irPara === 'function') window.irPara('cidade');
        return;
    }
    if (ov.dataset.active === '1') return;
    ov.dataset.active = '1';
    lootTurno = { adenas: 0, xp: 0, drops: {} };
    prepararTelaCacada();
    const mobC = document.getElementById('mobs-container');
    if (mobC) mobC.innerHTML = '';
    ov.classList.add('forest-death-overlay--visible');
    ov.setAttribute('aria-hidden', 'false');
    if (window.I18n && typeof window.I18n.refreshDom === 'function') {
        try { window.I18n.refreshDom(ov); } catch (e) {}
    }
};

function confirmForestDeathReturnToTown() {
    const ov = document.getElementById('forest-death-overlay');
    if (ov) {
        ov.classList.remove('forest-death-overlay--visible');
        ov.setAttribute('aria-hidden', 'true');
        delete ov.dataset.active;
    }
    if (typeof atualizar === 'function') atualizar();
    if (typeof irPara === 'function') window.irPara('cidade');
    if (typeof salvarJogo === 'function') window.salvarJogo();
};

// --- Globals (HTML onclick + scripts legados) ---
window.pararAtaqueMonstro = pararAtaqueMonstro;
window.iniciarAtaqueMonstro = iniciarAtaqueMonstro;
window.prepararTelaCacada = prepararTelaCacada;
window.procurarMonstros = procurarMonstros;
window.renderizarMonstros = renderizarMonstros;
window.tentarFugir = tentarFugir;
window.fecharVitoriaEProcurar = fecharVitoriaEProcurar;
window.fecharVitoriaEVoltar = fecharVitoriaEVoltar;
window.atualizarIconesBuffPlayer = atualizarIconesBuffPlayer;
window.atualizarIconesDebuffMonstro = atualizarIconesDebuffMonstro;
window.forceRemoveStuckDeadForestMob = forceRemoveStuckDeadForestMob;
window.tryProcessForestMobDeath = tryProcessForestMobDeath;
window.reconciliarMobsFlorestHpZero = reconciliarMobsFlorestHpZero;
window.confirmForestFleeReturnToTown = confirmForestFleeReturnToTown;
window.showForestDeathScreen = showForestDeathScreen;
window.confirmForestDeathReturnToTown = confirmForestDeathReturnToTown;

export {};
