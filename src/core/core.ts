/**
 * GAME ENGINE & MAIN LOOP
 * Migrado: js/core.js
 */
import type { ItemCatalogBase } from '../types/game';

function writeGameLog(msg: string): void {
    const log = document.getElementById('log');
    if (!log) return;
    log.innerHTML = msg + "<br>" + log.innerHTML;
    log.scrollTop = 0;
}

function iniciarJogo(): void {
    window.adenas = 0; window.ancientCoins = 0; window.enchant = 0; window.enchantArmor = 0; window.nivel = 1; window.xpAtual = 0; window.isAugmented = false;
    window.olympiadPoints = 0; window.olympiadWins = 0; window.olympiadLosses = 0;
    window.endgameData = { weeklyChampionKills: 0, weeklyWeekKey: '', lastClaimedWeekKey: '', lifetimeChampionKills: 0, renown: 0 };
    window.inventario = { 'HP Potion': 20, 'Mana Potion': 5 };
    
    // Boot do tutorial ANTES de definir a barra, para que a condição abaixo funcione
    if (typeof window.TutorialEngine !== 'undefined' && window.TutorialEngine.bootstrapNewCharacter) {
        window.TutorialEngine.bootstrapNewCharacter();
    }

    let initialSkill = window.isClasseMagica(window.charClass) ? 'Wind Strike' : 'Power Strike';
    // Se o tutorial estiver ativo, começamos com a barra MAIS LIMPA ainda (só Attack e Potion, slot 2 vazio para o tutorial)
    if (window.tutorialProgress && window.tutorialProgress.active) {
        console.log("🎓 [Tutorial] Iniciando com barra limpa para aprendizado.");
        window.barraAtalhos = ['Attack', null, 'HP Potion', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
    } else {
        window.barraAtalhos = ['Attack', initialSkill, 'HP Potion', 'Mana Potion', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]; 
    }
    window.tempoFimBuffGuerreiro = 0; 
    window.tempoFimBuffMistico = 0;
    window.inventarioEquips = []; 
    window.armaEquipadaBase = typeof window.createStarterWeaponInstance === 'function'
        ? window.createStarterWeaponInstance(window.charClass)
        : null; 
    window.armaduraEquipada = null;
    window.colarEquipado = null; window.brincoEquipado1 = null; window.brincoEquipado2 = null; window.anelEquipado1 = null; window.anelEquipado2 = null;
    
    if (typeof window.calcularXpNecessario === 'function') {
        window.xpNecessario = window.calcularXpNecessario(window.nivel);
    }
    
    if (typeof window.calcularStatusGlobais === 'function') {
        window.calcularStatusGlobais(); 
    }
    
    window.playerHP = (window.playerStats && window.playerStats.maxHp) ? window.playerStats.maxHp : 100; 
    window.playerMP = (window.playerStats && window.playerStats.maxMp) ? window.playerStats.maxMp : 50; 
    window.playerCP = (window.playerStats && window.playerStats.maxCp) ? window.playerStats.maxCp : 60;
    
    mudarTela('screen-game'); 
    try { writeGameLog(`Aventure-se em Aden! HP: ${window.playerStats.maxHp}`); } catch(e) {}
    if (typeof window.iniciarSistemaClans === 'function') window.iniciarSistemaClans();
    if (typeof CastleEngine !== 'undefined' && CastleEngine.init) CastleEngine.init();
    
    if (typeof salvarJogo === 'function') salvarJogo({ silent: true });
    if (typeof window.inicializarMissoesDiarias === 'function') window.inicializarMissoesDiarias();
    if (typeof iniciarSistemaMercado === 'function') iniciarSistemaMercado();
    if (typeof RankingSeasons !== 'undefined' && RankingSeasons.init) RankingSeasons.init();
    if (typeof ClanWarEngine !== 'undefined' && ClanWarEngine.init) ClanWarEngine.init();
    if (typeof verificarPagamentosPendentes === 'function') verificarPagamentosPendentes();
    
    const initialDest = (window.tutorialProgress && window.tutorialProgress.active) ? 'inventario' : 'perfil';
    atualizar(); irPara(initialDest); 
    
    // Força atualização de presença logo ao iniciar
    if (window.SupabaseAPI && window.charName) {
        window.SupabaseAPI.updatePresence(window.charName, {});
        if (typeof window.SupabaseAPI.getUser === 'function' && window.SupabaseAPI.getUser()) {
            void window.SupabaseAPI.ensureChatConnected?.(window.charName, {});
        }
    }

    // --- SISTEMA DE PERSISTÊNCIA MOBILE (RESUME) ---
    const lastLoc = localStorage.getItem('l2mini_last_location');
    const lastNpc = localStorage.getItem('l2mini_last_npc');
    const lastSocial = localStorage.getItem('l2mini_last_social_menu');

    if (lastLoc) {
        console.log("📱 [Mobile] Retornando para última localização:", lastLoc);
        irPara(lastLoc);
        
        // Se estava em um NPC ou menu social, reabre
        if (lastLoc === 'cidade' && lastNpc) {
            abrirNpc(lastNpc);
        } else if (lastLoc === 'social' && lastSocial && lastSocial !== 'ranking') {
            abrirMenuSocial(lastSocial);
        } else if (lastLoc === 'social' && lastSocial === 'ranking') {
            localStorage.removeItem('l2mini_last_social_menu');
        }
    } else {
        const initialDest = (window.tutorialProgress && window.tutorialProgress.active) ? 'inventario' : 'perfil';
        atualizar(); irPara(initialDest); 
    }

    if (typeof window.atualizarWorldDailyBossUI === 'function') window.atualizarWorldDailyBossUI();
    if (typeof window.iniciarChatAutomatico === 'function') window.iniciarChatAutomatico();

    try {
        if (typeof window.TutorialEngine !== 'undefined' && typeof window.TutorialEngine.afterCharacterLoad === 'function') {
            window.TutorialEngine.afterCharacterLoad();
        }
    } catch (eTut) { /* ignore */ }

    // Limpeza periódica de sessões antigas (Heartbeat Global)
    setInterval(() => {
        const olySession = localStorage.getItem('l2mini_oly_session');
        if (olySession) {
            const session = JSON.parse(olySession);
            if (Date.now() - session.timestamp > 300000) {
                localStorage.removeItem('l2mini_oly_session');
            }
        }
    }, 60000);
}

function atualizar(): void {
    if (typeof window.syncMoedasInventarioComCarteira === 'function') window.syncMoedasInventarioComCarteira();
    const safeAdena = (typeof window.adenas === 'number' && !isNaN(window.adenas)) ? window.adenas : 0;
    const safeCoins = (typeof window.ancientCoins === 'number' && !isNaN(window.ancientCoins)) ? window.ancientCoins : 0;
    const safeNivel = (typeof window.nivel === 'number' && !isNaN(window.nivel)) ? window.nivel : 1;
    const safeXp = (typeof window.xpAtual === 'number' && !isNaN(window.xpAtual)) ? window.xpAtual : 0;
    const safeXpNec = (typeof window.xpNecessario === 'number' && !isNaN(window.xpNecessario) && window.xpNecessario > 0) ? window.xpNecessario : 100;

    const elAdena = document.getElementById('minha-adena'); if (elAdena) elAdena.innerText = safeAdena.toLocaleString(); 
    const elCoins = document.getElementById('minhas-coins'); if (elCoins) elCoins.innerText = safeCoins.toLocaleString();
    const nameEl = document.getElementById('char-display-name-top'); if (nameEl) nameEl.innerText = window.charName || (typeof window.t === 'function' ? window.t('game.core.unknownPlayer') : 'Unknown Player');
    
    // Atualiza Avatar do HUD (raça/gênero primeiro; fallback sem loop de 404)
    const hudAvatarImg = document.getElementById('hud-avatar-img') as HTMLImageElement | null;
    if (hudAvatarImg && window.charClass) {
        const classKey = `${window.charClass}|${window.charRace || ''}|${window.charGender || ''}`;
        let raceFallback = 'assets/chars/base_fighter.png';
        if (typeof radarDeRacas !== 'undefined' && window.charRace && radarDeRacas[window.charRace]) {
            raceFallback =
                window.charGender === 'Female'
                    ? radarDeRacas[window.charRace].imgMulher
                    : radarDeRacas[window.charRace].imgHomem;
        }
        const primarySrc =
            window.AuthEngine && typeof window.AuthEngine.getAvatarForClass === 'function'
                ? window.AuthEngine.getAvatarForClass(
                      window.charClass,
                      window.charRace || 'Human',
                      window.charGender || 'Male'
                  )
                : `assets/classes/${window.charClass.toLowerCase().replace(/\s+/g, '_')}.png`;
        const lastResort = 'assets/chars/base_fighter.png';

        if (hudAvatarImg.dataset.l2HudKey !== classKey) {
            hudAvatarImg.dataset.l2HudKey = classKey;
            hudAvatarImg.removeAttribute('data-l2HudStage');
            const imgEl = hudAvatarImg;
            imgEl.onerror = function () {
                const stage = imgEl.dataset.l2HudStage || '0';
                if (stage === '0') {
                    imgEl.dataset.l2HudStage = '1';
                    imgEl.src = raceFallback;
                    return;
                }
                if (stage === '1' && raceFallback !== lastResort) {
                    imgEl.dataset.l2HudStage = '2';
                    imgEl.src = lastResort;
                    return;
                }
                imgEl.onerror = null;
            };
            imgEl.src = primarySrc;
        }
    }

    const elLvl = document.getElementById('meu-lvl'); if (elLvl) elLvl.innerText = String(window.nivel || 1);
    const pctXp = Math.min(100, Math.max(0, (safeXp / safeXpNec) * 100));
    const elExpFill = document.getElementById('exp-fill');
    if (elExpFill) elExpFill.style.width = pctXp + '%';
    const elExpWrap = document.getElementById('hud-exp-wrap');
    if (elExpWrap) {
        elExpWrap.setAttribute('aria-valuenow', String(Math.round(pctXp)));
        const expAria = (typeof window.t === 'function') ? window.t('hud.expAriaLabel') : 'Experience to next level';
        elExpWrap.setAttribute('aria-label', expAria + ': ' + Math.floor(safeXp) + ' / ' + Math.floor(safeXpNec));
    }
    const elExpText = document.getElementById('hud-exp-text');
    if (elExpText) {
        const curStr = Math.max(0, Math.floor(safeXp)).toLocaleString();
        const needStr = Math.max(1, Math.floor(safeXpNec)).toLocaleString();
        elExpText.textContent = (typeof window.t === 'function')
            ? window.t('hud.expProgress', { current: curStr, needed: needStr })
            : (curStr + ' / ' + needStr + ' XP');
    }
    
    let exibicaoCp = Math.max(0, Math.floor(window.playerCP || 0));
    let exibicaoHp = Math.max(0, Math.floor(window.playerHP || 0));
    let exibicaoMp = Math.max(0, Math.floor(window.playerMP || 0));
    const maxHp = (window.playerStats && window.playerStats.maxHp > 0) ? window.playerStats.maxHp : 100;
    const maxMp = (window.playerStats && window.playerStats.maxMp > 0) ? window.playerStats.maxMp : 50;
    const maxCp = (window.playerStats && window.playerStats.maxCp > 0) ? window.playerStats.maxCp : 60;

    const cpFill = document.getElementById('player-cp-fill'); if (cpFill) cpFill.style.width = Math.min(100, (exibicaoCp / maxCp * 100)) + "%";
    const cpText = document.getElementById('player-cp-text'); if (cpText) cpText.innerText = `${exibicaoHp}/${maxHp}`; // Wait, this was CP/maxCP? Fix if needed.
    // Fixed: cpText.innerText = `${exibicaoCp}/${maxCp}`;
    if (cpText) cpText.innerText = `${exibicaoCp}/${maxCp}`;

    const hpFill = document.getElementById('player-hp-fill'); if (hpFill) hpFill.style.width = Math.min(100, (exibicaoHp / maxHp * 100)) + "%"; 
    const hpText = document.getElementById('player-hp-text'); if (hpText) hpText.innerText = `${exibicaoHp}/${maxHp}`; 
    const mpFill = document.getElementById('player-mp-fill'); if (mpFill) mpFill.style.width = Math.min(100, (exibicaoMp / maxMp * 100)) + "%"; 
    const mpText = document.getElementById('player-mp-text'); if (mpText) mpText.innerText = `${exibicaoMp}/${maxMp}`;

    // Sincroniza o badge: correio (memória) + Reward Hub (memória), sem rede
    if (typeof window.aplicarNotifBadgeVisual === 'function') {
        window.aplicarNotifBadgeVisual();
    }
    if (typeof window.aplicarHudMissoesBadge === 'function') {
        window.aplicarHudMissoesBadge();
    }

    // Raid HUD
    let raidHpFill = document.getElementById('raid-player-hp-fill');
    if (raidHpFill) {
        raidHpFill.style.width = Math.min(100, (exibicaoHp / maxHp * 100)) + '%';
        let raidHpText = document.getElementById('raid-player-hp-text'); if (raidHpText) raidHpText.innerText = `${exibicaoHp}/${maxHp}`;
        let raidLvl = document.getElementById('raid-player-lvl'); if (raidLvl) raidLvl.innerText = String(safeNivel);
    }
    let raidMpFill = document.getElementById('raid-player-mp-fill');
    if (raidMpFill) {
        raidMpFill.style.width = Math.min(100, (exibicaoMp / maxMp * 100)) + '%';
        let raidMpText = document.getElementById('raid-player-mp-text'); if (raidMpText) raidMpText.innerText = `${exibicaoMp}/${maxMp}`;
    }
    
    let isMageLocal = typeof window.isClasseMagica === 'function' ? window.isClasseMagica(window.charClass) : false;
    const pAtk = (window.playerStats && window.playerStats.pAtk) || 0;
    const mAtk = (window.playerStats && window.playerStats.mAtk) || 0;
    const atkValor = isMageLocal ? mAtk : pAtk;
    const augmentHtml = window.isAugmented ? " <span style='color:#22c55e;font-weight:800;font-size:7px'>+Aug</span>" : "";
    if (window.labelTipoHUD) { window.labelTipoHUD.textContent = isMageLocal ? 'M.ATK' : 'P.ATK'; window.labelTipoHUD.style.color = isMageLocal ? '#93c5fd' : '#facc15'; }
    if (window.labelValorHUD) { window.labelValorHUD.style.color = isMageLocal ? '#60a5fa' : '#fcd34d'; window.labelValorHUD.innerHTML = String(atkValor) + augmentHtml; }

    const armaHud = document.getElementById('arma-img') as HTMLImageElement | null;
    if (armaHud) {
        if (!window.armaEquipadaBase) {
            armaHud.removeAttribute('src');
            armaHud.dataset.hudWeapon = '';
            armaHud.className = '';
        } else {
            const bHud = (window.armaEquipadaBase.base || window.armaEquipadaBase) as ItemCatalogBase;
            const srcArma = (bHud.img && String(bHud.img).trim()) || (bHud.id ? `assets/equips/${bHud.id}.png` : '') || 'assets/armas/wpn_ng_trainee_blade.png';
            if (armaHud.dataset.hudWeapon !== srcArma) {
                armaHud.dataset.hudWeapon = srcArma;
                armaHud.src = srcArma;
                armaHud.onerror = function () {
                    this.onerror = null;
                    this.dataset.hudWeapon = '';
                    this.src = 'assets/armas/wpn_ng_trainee_blade.png';
                };
            }
            armaHud.className = '';
            if (window.isAugmented) armaHud.classList.add('augmented');
        }
    }
    if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
    if (typeof window.atualizarVisualPaperdoll === 'function') window.atualizarVisualPaperdoll();
    if (window.EndgamePursuits && typeof window.EndgamePursuits.refreshPublicAscensionHUD === 'function') {
        window.EndgamePursuits.refreshPublicAscensionHUD();
    }
    try {
        var navPerf = document.getElementById('btn-tab-perfil');
        if (navPerf && navPerf.classList && navPerf.classList.contains('active') && typeof window.renderProfileStatsPreview === 'function') {
            window.renderProfileStatsPreview();
        }
    } catch (ePrv) {}
}

// === INTERVALS & REGEN ===
setInterval(() => {
    let container = document.getElementById('buffs-ativos-container'); if (!container) return;
    let agora = Date.now(); let html = ''; let temBuff = false;
    
    // Usando window. para evitar ReferenceError caso o arquivo de globals atrase
    const tfGuerreiro = window.tempoFimBuffGuerreiro || 0;
    const tfMistico = window.tempoFimBuffMistico || 0;

    if (tfGuerreiro > agora) {
        temBuff = true; let restam = Math.floor((tfGuerreiro - agora) / 1000); let min = Math.floor(restam / 60); let sec = restam % 60;
        html += `<div style="display:flex; align-items:center; gap:6px; font-size:11px; color:#10b981; font-weight:bold;"><img src="assets/npcs/magister.png" style="width:18px; height:18px; background:#111; border:1px solid #10b981; object-fit:cover; border-radius:3px;" alt="F"> ${(typeof window.t === 'function' ? window.t('game.core.buffMightHaste') : 'Might/Haste:')} ${min}:${sec < 10 ? '0'+sec : sec}</div>`;
    }
    if (tfMistico > agora) {
        temBuff = true; let restam = Math.floor((tfMistico - agora) / 1000); let min = Math.floor(restam / 60); let sec = restam % 60;
        html += `<div style="display:flex; align-items:center; gap:6px; font-size:11px; color:#3b82f6; font-weight:bold;"><img src="assets/npcs/magister.png" style="width:18px; height:18px; background:#111; border:1px solid #3b82f6; object-fit:cover; border-radius:3px; filter:hue-rotate(220deg);" alt="M"> ${(typeof window.t === 'function' ? window.t('game.core.buffEmpowerAcumen') : 'Empower/Acumen:')} ${min}:${sec < 10 ? '0'+sec : sec}</div>`;
    }
    if (temBuff) { container.style.display = 'flex'; container.innerHTML = html; } 
    else {
        container.style.display = 'none'; container.innerHTML = '';
        if (window.tempoFimBuffGuerreiro !== 0 || window.tempoFimBuffMistico !== 0) {
            window.tempoFimBuffGuerreiro = 0; window.tempoFimBuffMistico = 0; 
            if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
            atualizar();
            escreverLog(`<span style="color:#fde047; font-style:italic;">${typeof window.t === 'function' ? window.t('game.core.buffsFaded') : '⏳ Your buffs faded. Stats returned to normal.'}</span>`);
        }
    }
}, 1000); 

setInterval(() => {
    let telaFloresta = document.getElementById('tela-floresta');
    if (telaFloresta && telaFloresta.style.display !== 'flex') {
        if (window.playerHP < window.playerStats.maxHp || window.playerMP < window.playerStats.maxMp || window.playerCP < window.playerStats.maxCp) {
            window.playerHP = Math.min(window.playerStats.maxHp, window.playerHP + Math.max(1, Math.floor(window.playerStats.maxHp * 0.05)));
            window.playerMP = Math.min(window.playerStats.maxMp, window.playerMP + Math.max(1, Math.floor(window.playerStats.maxMp * 0.05)));
            window.playerCP = Math.min(window.playerStats.maxCp, window.playerCP + Math.max(1, Math.floor(window.playerStats.maxCp * 0.03))); 
            atualizar();
        }
    }
}, 10000);

let pocaoHpInterval: ReturnType<typeof setInterval> | null = null;
let pocaoMpInterval: ReturnType<typeof setInterval> | null = null;

function usarPocao(): void {
    const olyArena = document.getElementById('tela-olympiad-arena');
    if (typeof window.OlympiadEngine !== 'undefined' && olyArena?.style.display === 'flex') {
        if (!window.OlympiadEngine.ativo) {
            escreverLog(`<span style="color:#facc15;">${typeof window.t === 'function' ? window.t('game.core.potionsLocked') : 'Potions are locked until the fight starts!'}</span>`);
            return;
        }
    }

    if (window.playerHP <= 0 || !window.inventario['HP Potion'] || window.inventario['HP Potion'] <= 0) {
        if (window.inventario['HP Potion'] <= 0) { window.inventario['HP Potion'] = 0; escreverLog(`<span style="color:#ef4444; font-weight:bold;">${typeof window.t === 'function' ? window.t('game.core.noHpPotions') : 'You have no HP Potions!'}</span>`); if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos(); }
        return;
    }
    window.inventario['HP Potion']--;
    if (typeof window.registrarProgressoMissaoDiaria === 'function') window.registrarProgressoMissaoDiaria('usar_pocoes', 1);
    if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos(); if (typeof salvarJogo === 'function') salvarJogo();
    escreverLog(`<span style="color:#10b981; font-weight:bold;">${typeof window.t === 'function' ? window.t('game.core.drankHpPotion') : '🍷 You used an HP Potion. HP is regenerating...'}</span>`);
    if (typeof dispararAnimacaoCooldown === 'function') dispararAnimacaoCooldown('HP Potion', 15000); if (typeof tocarSom === 'function') tocarSom('potion'); 
    if (pocaoHpInterval) clearInterval(pocaoHpInterval);
    let ticks = 0; pocaoHpInterval = setInterval(() => {
        if (window.playerHP <= 0) { clearInterval(pocaoHpInterval); return; }
        window.playerHP = Math.min(window.playerStats.maxHp, window.playerHP + Math.max(1, Math.floor(window.playerStats.maxHp * 0.05)));
        atualizar(); ticks++; if (ticks >= 15) { clearInterval(pocaoHpInterval); pocaoHpInterval = null; escreverLog(`<span style="color:#aaa; font-style:italic;">${typeof window.t === 'function' ? window.t('game.core.hpPotionEffectEnd') : 'The HP Potion effect ended.'}</span>`); }
    }, 1000); 
}

function usarPocaoMP(nomeDaPocao: string): void {
    const olyArena = document.getElementById('tela-olympiad-arena');
    if (typeof window.OlympiadEngine !== 'undefined' && olyArena?.style.display === 'flex') {
        if (!window.OlympiadEngine.ativo) {
            escreverLog(`<span style="color:#facc15;">${typeof window.t === 'function' ? window.t('game.core.potionsLocked') : 'Potions are locked until the fight starts!'}</span>`);
            return;
        }
    }

    if (window.playerHP <= 0) return; let nomeCerto = null; 
    for (let item in window.inventario) { if ((item === 'Mana Potion' || item === 'MP Potion' || item.includes('Mana')) && window.inventario[item] > 0) { nomeCerto = item; break; } }
    if (window.inventario[nomeDaPocao] < 0) window.inventario[nomeDaPocao] = 0;
    if (nomeCerto) {
        window.inventario[nomeCerto]--; if (typeof window.registrarProgressoMissaoDiaria === 'function') window.registrarProgressoMissaoDiaria('usar_pocoes', 1);
        if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos(); if (typeof salvarJogo === 'function') salvarJogo();
        escreverLog(`<span style="color:#3b82f6; font-weight:bold;">${typeof window.t === 'function' ? window.t('game.core.drankManaPotion', { potion: nomeCerto }) : ('🧪 You used a ' + nomeCerto + '. Mana is recovering...')}</span>`);
        if (typeof dispararAnimacaoCooldown === 'function') dispararAnimacaoCooldown(nomeCerto, 15000); if (typeof tocarSom === 'function') tocarSom('potion'); 
        if (pocaoMpInterval) clearInterval(pocaoMpInterval);
        let ticks = 0; pocaoMpInterval = setInterval(() => {
            if (window.playerHP <= 0) { clearInterval(pocaoMpInterval); return; }
            window.playerMP = Math.min(window.playerStats.maxMp, window.playerMP + Math.max(1, Math.floor(window.playerStats.maxMp * 0.05)));
            atualizar(); ticks++; if (ticks >= 15) { clearInterval(pocaoMpInterval); pocaoMpInterval = null; escreverLog(`<span style="color:#aaa; font-style:italic;">${typeof window.t === 'function' ? window.t('game.core.manaPotionEffectEnd') : 'The Mana Potion effect has worn off.'}</span>`); }
        }, 1000); 
    } else { escreverLog(`<span style="color:#ef4444; font-weight:bold;">${typeof window.t === 'function' ? window.t('game.core.noManaPotions') : 'You have no Mana Potions!'}</span>`); if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos(); }
}

window.iniciarJogo = iniciarJogo;
window.escreverLog = writeGameLog;
window.atualizar = atualizar;
window.usarPocao = usarPocao;
window.usarPocaoMP = usarPocaoMP;

export {};
