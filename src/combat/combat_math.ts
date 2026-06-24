/* ========================================== */
/* COMBAT MATH ENGINE (DAMAGE CALCULATION)    */
/* Migrado: js/combat_math.js → TypeScript    */
/* ========================================== */

interface ForestMob {
  idUnico?: string;
  hp?: number;
  maxHp?: number;
  atk?: number;
  tipo?: string;
  lvl?: number;
  nivel?: number;
  def?: number;
  mDef?: number;
  pDef?: number;
  isChampion?: boolean;
  debuffs?: { defMult?: number };
  __forestDeathProcessing?: boolean;
}

function motorBuffs() {
  return window.motorBuffsEspeciais ?? { critMult: 2.0, esquiva: 0 };
}

/** Atualiza barra/texto de HP do mob (scoped ao card para evitar IDs duplicados / CSS global .hp-fill). */
window.refreshMobHpUI = function (monstro: ForestMob) {
  if (!monstro || !monstro.idUnico) return;
  let maxRef = Number(monstro.maxHp);
  if (!Number.isFinite(maxRef) || maxRef < 1) {
    const h = Number(monstro.hp);
    maxRef = Math.max(1, Math.floor(Number.isFinite(h) && h > 0 ? h : 1));
    monstro.maxHp = maxRef;
  }
  let hpVal = Number(monstro.hp);
  if (!Number.isFinite(hpVal)) hpVal = maxRef;
  hpVal = Math.max(0, hpVal);
  monstro.hp = hpVal;
  const hpPorcento = Math.min(100, Math.max(0, (hpVal / maxRef) * 100));
  const card = document.getElementById('mob-card-' + monstro.idUnico);
  const fill = card
    ? card.querySelector('.mob-hunt-hp-fill')
    : document.getElementById('mob-hp-fill-' + monstro.idUnico);
  const text = card
    ? card.querySelector('.mob-hunt-hp-text')
    : document.getElementById('mob-hp-text-' + monstro.idUnico);
  if (fill instanceof HTMLElement) fill.style.setProperty('width', hpPorcento + '%', 'important');
  if (text) text.textContent = String(Math.floor(hpVal));
  if (!fill && typeof renderizarMonstros === 'function') renderizarMonstros();
};

window.syncAllForestMobHpBars = function () {
  if (!window.monstrosAtivos || !window.monstrosAtivos.length) return;
  window.monstrosAtivos.forEach(function (m) {
    window.refreshMobHpUI(m as ForestMob);
  });
};

/** First alive mob in hunting zone (index 0 is not always the valid target when multiple mobs spawn). */
window.getForestTargetMobIndex = function () {
  const list = window.monstrosAtivos;
  if (!Array.isArray(list) || list.length === 0) return -1;
  for (let i = 0; i < list.length; i++) {
    const m = list[i] as ForestMob;
    if (m && Math.floor(Number(m.hp)) > 0) return i;
  }
  return -1;
};

window.calcularDefesaDoPlayer = function (ataqueMagicoDoMonstro: boolean) {
  const buffs = motorBuffs();
  const defesaUsada = ataqueMagicoDoMonstro ? window.playerStats.mDef : window.playerStats.pDef;
  if (buffs.esquiva > 0 && Math.random() * 100 < buffs.esquiva) {
    escreverLog(
      `<span style="color:#34d399; font-weight:bold;">${
        typeof window.t === 'function'
          ? window.t('game.combatMath.dodgePerfect')
          : '💨 You dodged the attack perfectly!'
      }</span>`,
    );
    return 999999;
  }
  return defesaUsada > 0 ? defesaUsada : 1;
};

function executarDanoDeUmMonstro(mob: ForestMob) {
  try {
    const isMagico = mob.tipo === 'magico';
    const danoBaseMonstro = Math.floor(Math.random() * ((mob.atk ?? 0) * 0.2)) + ((mob.atk ?? 0) * 0.9);
    const defesaSegura = window.calcularDefesaDoPlayer(isMagico);

    if (defesaSegura !== 999999) {
      let danoRecebido = Math.floor((danoBaseMonstro * 700) / (400 + defesaSegura));
      const danoMinimo = Math.floor((mob.atk ?? 0) * 0.03);
      if (danoRecebido < danoMinimo) danoRecebido = danoMinimo;
      if (isNaN(danoRecebido) || danoRecebido <= 0) danoRecebido = 1;

      const lvlMob = mob.lvl || mob.nivel || 1;
      if (window.nivel > lvlMob) {
        const red = Math.min(0.6, (window.nivel - lvlMob) * 0.03);
        danoRecebido = Math.floor(danoRecebido * (1 - red));
      }

      try {
        if (
          typeof window.zonaAtual !== 'undefined' &&
          window.zonaAtual &&
          window.zonaAtual.id === 'No-Grade' &&
          typeof window.nivel === 'number' &&
          window.nivel <= 5 &&
          !mob.isChampion
        ) {
          danoRecebido = Math.max(danoMinimo, Math.floor(danoRecebido * 0.88));
        }
      } catch {
        /* ignore */
      }

      window.playerHP -= danoRecebido;
      const hpBarFill = document.getElementById('player-hp-fill');
      if (hpBarFill) {
        hpBarFill.classList.remove('player-dano');
        void hpBarFill.offsetWidth;
        hpBarFill.classList.add('player-dano');
      }

      mostrarDanoVisualMob(danoRecebido, 'rival', false, null);
      shakeScreenMob(false);
    }
    if (window.playerHP <= 0) {
      window.playerHP = Math.max(1, Math.floor(window.playerStats.maxHp * 0.1));
      escreverLog(
        `<span style="color:red; font-weight:bold; font-size:1.1em;">${
          typeof window.t === 'function'
            ? window.t('game.combatMath.playerDefeated')
            : '💀 YOU were defeated! Returning...'
        }</span>`,
      );
      pararAtaqueMonstro();
      window.autoAtaqueAtivo = false;
      if (loopAutoAtaque) clearTimeout(loopAutoAtaque);
      if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
      atualizar();
      if (typeof window.showForestDeathScreen === 'function') {
        window.showForestDeathScreen();
      } else {
        setTimeout(() => {
          prepararTelaCacada();
          irPara('cidade');
        }, 1500);
      }
    } else {
      atualizar();
    }
  } catch (error) {
    console.error(error);
  }
}

window.executarDanoDeUmMonstro = executarDanoDeUmMonstro;

function aplicarDanoNoMonstro(index: number, dano: number, isCrit = false) {
  const list = window.monstrosAtivos;
  if (!Array.isArray(list) || index < 0 || index >= list.length) return;
  const monstro = list[index] as ForestMob;
  if (!monstro || typeof monstro !== 'object') return;
  if (monstro.__forestDeathProcessing) return;

  let preHp = Math.floor(Number(monstro.hp));
  if (!Number.isFinite(preHp)) preHp = Math.floor(Number(monstro.maxHp)) || 0;
  if (preHp <= 0) {
    if (typeof window.tryProcessForestMobDeath === 'function') window.tryProcessForestMobDeath(monstro);
    return;
  }

  dano = Math.max(0, Math.floor(Number(dano) || 0));
  monstro.hp = Math.max(0, preHp - dano);

  window.refreshMobHpUI(monstro);

  mostrarDanoVisualMob(dano, 'player', isCrit, monstro.idUnico ?? null);
  if (isCrit) shakeScreenMob(true);

  if (Math.floor(Number(monstro.hp)) <= 0) {
    monstro.hp = 0;
    if (typeof window.tryProcessForestMobDeath === 'function') window.tryProcessForestMobDeath(monstro);
  } else {
    if (typeof renderizarMonstros === 'function') renderizarMonstros();
    else window.syncAllForestMobHpBars();
    const mobImg = document.getElementById('monster-img-' + monstro.idUnico);
    if (mobImg) {
      mobImg.classList.remove('tomando-dano');
      void mobImg.offsetWidth;
      mobImg.classList.add('tomando-dano');
    }
  }
}

window.aplicarDanoNoMonstro = aplicarDanoNoMonstro;

function mostrarDanoVisualMob(
  valor: number,
  alvo: string,
  isCrit: boolean,
  mobId: string | null,
) {
  const cena = document.getElementById('tela-floresta');
  if (!cena) return;

  const el = document.createElement('div');
  el.className = `damage-number ${alvo}${isCrit ? ' critical' : ''}`;
  el.innerText = String(valor);

  const offset = Math.random() * 40 - 20;

  if (alvo === 'player') {
    const mobCard = mobId ? document.getElementById(`mob-card-${mobId}`) : null;
    if (mobCard) {
      const rect = mobCard.getBoundingClientRect();
      el.style.left = rect.left + rect.width / 2 + offset + 'px';
      el.style.top = rect.top + offset + 'px';
      el.style.position = 'fixed';
    } else {
      el.style.left = `calc(50% + ${offset}px)`;
      el.style.top = '40%';
    }
  } else {
    el.style.left = `calc(50% + ${offset}px)`;
    el.style.top = '60%';
  }

  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function shakeScreenMob(isPlayerCausando: boolean) {
  const cena = document.getElementById('tela-floresta');
  if (!cena) return;

  cena.classList.add('screen-shake');

  const flash = document.createElement('div');
  flash.className = 'hit-flash';
  if (!isPlayerCausando) flash.style.background = 'rgba(255,0,0,0.15)';
  cena.appendChild(flash);

  setTimeout(() => {
    cena.classList.remove('screen-shake');
    flash.remove();
  }, 250);
}

let loopAutoAtaque: ReturnType<typeof setTimeout> | null = null;

function estaEmCombateRaid(): boolean {
  const re = window.RaidEngine as { ativo?: boolean; state?: { bossStatus?: string } } | undefined;
  return !!(re && re.ativo && re.state?.bossStatus !== 'dead');
}

function estaEmCombateFloresta(): boolean {
  return typeof window.monstrosAtivos !== 'undefined' && window.monstrosAtivos.length > 0;
}

window.pararAutoAtaque = function () {
  window.autoAtaqueAtivo = false;
  if (loopAutoAtaque) clearTimeout(loopAutoAtaque);
  loopAutoAtaque = null;
  if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
};

window.isAutoAtaqueLigado = function () {
  return window.autoAtaqueAtivo;
};

window.atacar = function () {
  if (window.playerHP <= 0) return;
  const naRaid = estaEmCombateRaid();
  const naFloresta = estaEmCombateFloresta();
  if (!naRaid && !naFloresta) {
    escreverLog(
      `<span style="color:#aaa;">${
        typeof window.t === 'function' ? window.t('game.combat.noTarget') : 'No target to attack!'
      }</span>`,
    );
    return;
  }
  window.autoAtaqueAtivo = !window.autoAtaqueAtivo;
  if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
  if (window.autoAtaqueAtivo) {
    escreverLog(
      `<span style="color:#10b981; font-weight:bold;">${
        typeof window.t === 'function' ? window.t('game.combatMath.autoAttackOn') : '⚔️ Auto-Attack: ON'
      }</span>`,
    );
    realizarGolpeAutoAtaque();
  } else {
    escreverLog(
      `<span style="color:#ef4444; font-weight:bold;">${
        typeof window.t === 'function' ? window.t('game.combatMath.autoAttackOff') : '🛑 Auto-Attack: OFF'
      }</span>`,
    );
    if (loopAutoAtaque) clearTimeout(loopAutoAtaque);
    loopAutoAtaque = null;
  }
};

function realizarGolpeAutoAtaque() {
  if (window.playerHP <= 0 || !window.autoAtaqueAtivo) {
    window.pararAutoAtaque?.();
    return;
  }

  if (estaEmCombateRaid()) {
    if (typeof window.RaidEngine.playerAtaca === 'function') {
      window.RaidEngine.playerAtaca();
    }
    const atkCdMs =
      typeof window.playerStats !== 'undefined' && window.playerStats.atkSpeed > 0
        ? window.playerStats.atkSpeed
        : 3800;
    if (typeof dispararAnimacaoGCD === 'function') dispararAnimacaoGCD(atkCdMs, 'Attack');
    loopAutoAtaque = setTimeout(realizarGolpeAutoAtaque, atkCdMs);
    return;
  }

  if (
    typeof window.monstrosAtivos === 'undefined' ||
    window.monstrosAtivos.length === 0
  ) {
    window.pararAutoAtaque?.();
    return;
  }
  if (typeof window.globalCooldownAtivo !== 'undefined' && Date.now() < window.globalCooldownAtivo) {
    loopAutoAtaque = setTimeout(realizarGolpeAutoAtaque, 100);
    return;
  }
  if (typeof tocarSom === 'function') tocarSom('ataque');
  const isMage = typeof window.isClasseMagica === 'function' ? window.isClasseMagica(window.charClass) : false;
  let tIdx =
    typeof window.getForestTargetMobIndex === 'function' ? window.getForestTargetMobIndex() : 0;
  if (tIdx < 0) {
    window.autoAtaqueAtivo = false;
    if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
    return;
  }
  const monstro = window.monstrosAtivos[tIdx] as ForestMob;
  let defAlvo = isMage ? monstro.mDef || (monstro.def ?? 0) * 0.8 : monstro.pDef || monstro.def;
  if (monstro.debuffs?.defMult) defAlvo = Math.floor((defAlvo ?? 0) * monstro.debuffs.defMult);

  let atkAtual = isMage ? window.playerStats.mAtk : window.playerStats.pAtk;
  let danoBase = (atkAtual * 1100) / (350 + (defAlvo || 1));

  const danoMinimo = Math.floor(atkAtual * 0.08);
  if (danoBase < danoMinimo) danoBase = danoMinimo;

  const lvlMob = monstro.lvl || monstro.nivel || 1;
  if (window.nivel > lvlMob) {
    danoBase *= 1 + Math.min(1.0, (window.nivel - lvlMob) * 0.03);
  }
  let danoFinal = danoBase * (0.9 + Math.random() * 0.2);
  let foiCritico = false;
  const buffs = motorBuffs();
  if (!isMage && Math.random() * 100 < window.playerStats.critRate) {
    danoFinal *= buffs.critMult;
    foiCritico = true;
  }
  danoFinal = Math.max(1, Math.floor(danoFinal));
  const shot = isMage ? 'B. Spiritshot (NG)' : 'Soulshot (NG)';

  const olyEl = document.getElementById('tela-olympiad-arena');
  const naOlympiad = olyEl && olyEl.style.display === 'flex';

  if (typeof window.autoShotAtivo !== 'undefined' && window.autoShotAtivo && !naOlympiad) {
    if (window.inventario[shot] && window.inventario[shot] > 0) {
      window.inventario[shot]--;
      danoFinal = Math.floor(danoFinal * 1.2);
      if (typeof renderizarBarraAtalhos === 'function') renderizarBarraAtalhos();
      if (window.inventario[shot] <= 0) {
        window.autoShotAtivo = false;
        escreverLog(
          `<span style="color:#ef4444; font-weight:bold;">${
            typeof window.t === 'function'
              ? window.t('game.combatMath.shotsDepleted', { item: shot })
              : `${shot} depleted!`
          }</span>`,
        );
      }
    } else {
      window.autoShotAtivo = false;
    }
  }
  escreverLog(
    foiCritico
      ? `<span style="color:#ff3333; font-weight:bold;">${
          typeof window.t === 'function'
            ? window.t('game.combatMath.criticalHit', { damage: danoFinal })
            : `CRITICAL HIT! ${danoFinal}`
        }</span>`
      : typeof window.t === 'function'
        ? window.t('game.combatMath.damageDealt', { damage: danoFinal })
        : `You dealt <span style="color:white">${danoFinal}</span> damage!`,
  );

  if (typeof window.TutorialEngine !== 'undefined' && window.TutorialEngine.isRunning?.()) {
    if (window.tutorialProgress?.step === 8) {
      window.tutorialFirstAttackDone = true;
      if (typeof window.TutorialEngine.notifyFirstAttack === 'function') {
        window.TutorialEngine.notifyFirstAttack();
      }
    }
  }

  window.aplicarDanoNoMonstro(tIdx, danoFinal, foiCritico);
  const atkCdMs =
    typeof window.playerStats !== 'undefined' && window.playerStats.atkSpeed > 0
      ? window.playerStats.atkSpeed
      : 3800;
  if (typeof dispararAnimacaoGCD === 'function') dispararAnimacaoGCD(atkCdMs, 'Attack');
  if (typeof atualizar === 'function') atualizar();
  loopAutoAtaque = setTimeout(realizarGolpeAutoAtaque, atkCdMs);
}

export {};
