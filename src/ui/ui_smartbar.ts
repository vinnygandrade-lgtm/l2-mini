/**
 * UI — smart bar (atalhos, soulshots, cooldowns visuais)
 * Migrado: js/ui_smartbar.js — Fase 4: tipos explícitos.
 */

import type { ItemCatalogBase, ShopCatalogItem, SkillCatalogEntry } from '../types/game';

const HOTBAR_SLOT_COUNT = 20;
const LONG_PRESS_MS = 600;

type HotbarPinCallback = (index: number) => void;
type CatalogRow = ItemCatalogBase | ShopCatalogItem;

let modoAtalhoItem: string | null = null;
let timerSegurarDedo: ReturnType<typeof setTimeout> | undefined;
let segurouDedo = false;

window.autoShotAtivo = window.autoShotAtivo ?? false;

function smartbarT(key: string, params?: Record<string, string | number>): string {
  return typeof window.t === 'function' ? window.t(key, params) : key;
}

function hotbarLabel(slotKey: string): string {
  if (!slotKey) return '';
  return typeof window.hotbarDisplayName === 'function' ? window.hotbarDisplayName(slotKey) : slotKey;
}

function resolveSmartbarItemDesc(nome: string, itemData: CatalogRow | undefined): string {
  if (typeof window.consumableDescText === 'function') {
    const fromConsumable = window.consumableDescText(nome);
    if (fromConsumable) return fromConsumable;
  }
  if (itemData?.desc) return String(itemData.desc);

  const kAd = window.L2MINI_CURRENCY_BAG_KEYS?.adena || 'Adena';
  const kAc = window.L2MINI_CURRENCY_BAG_KEYS?.ancient || 'Ancient Coin';
  if (nome === 'HP Potion') return smartbarT('game.smartbar.itemDesc.hpPotion');
  if (nome === 'Mana Potion' || nome === 'MP Potion') return smartbarT('game.smartbar.itemDesc.manaPotion');
  if (nome.includes('Recipe')) return smartbarT('game.smartbar.itemDesc.recipe');
  if (nome.includes('Ancient Coin') || nome === kAc) return smartbarT('game.smartbar.itemDesc.ancientCoin');
  if (nome === kAd || nome === 'Adena') return smartbarT('game.smartbar.itemDesc.adena');
  if (nome.includes('Soulshot')) return smartbarT('game.smartbar.itemDesc.soulshot');
  if (nome.includes('Spiritshot')) return smartbarT('game.smartbar.itemDesc.spiritshot');
  return smartbarT('game.smartbar.itemDesc.generic');
}

function smartbarCatalogRows(includeEquips = false): CatalogRow[] {
  const out: CatalogRow[] = [];
  if (window.catalogoConsumiveis) out.push(...(window.catalogoConsumiveis as CatalogRow[]));
  if (window.catalogoScrolls) out.push(...(window.catalogoScrolls as CatalogRow[]));
  if (window.catalogoMateriais) out.push(...(window.catalogoMateriais as CatalogRow[]));
  if (includeEquips) {
    if (window.catalogoArmaduras) out.push(...(window.catalogoArmaduras as CatalogRow[]));
    if (window.catalogoArmas) out.push(...(window.catalogoArmas as CatalogRow[]));
    if (window.catalogoJoias) out.push(...(window.catalogoJoias as CatalogRow[]));
  }
  return out;
}

function findCatalogRow(nome: string): CatalogRow | undefined {
  return smartbarCatalogRows(true).find((i) => i.nome === nome || i.id === nome);
}

function abrirAcaoItemGeral(nome: string): void {
  if (typeof window.abrirModal === 'function') window.abrirModal('janela-item-acao', 2100);
  else {
    const janela = document.getElementById('janela-item-acao');
    if (janela) janela.style.display = 'flex';
  }

  const titulo = document.getElementById('acao-titulo');
  const desc = document.getElementById('acao-desc');
  const img = document.getElementById('acao-img') as HTMLImageElement | null;
  const btnAcao = document.getElementById('btn-acao-item') as HTMLButtonElement | null;
  if (!titulo || !desc || !img || !btnAcao) return;

  titulo.innerText = smartbarT('game.smartbar.itemOptions');

  const kAd = window.L2MINI_CURRENCY_BAG_KEYS?.adena || 'Adena';
  const kAc = window.L2MINI_CURRENCY_BAG_KEYS?.ancient || 'Ancient Coin';
  const isCurrency = (nome === kAd || nome === kAc);

  const imgSlotEl = document.getElementById('acao-img-slot');
  if (imgSlotEl) {
    if (isCurrency) imgSlotEl.classList.add('l2-currency-modal-slot');
    else imgSlotEl.classList.remove('l2-currency-modal-slot');
  }

  const itemData = findCatalogRow(nome);

  let imgItem = 'assets/npcs/grocer.png';
  if (itemData?.img) imgItem = itemData.img;
  else if (nome.includes('Potion')) imgItem = 'assets/itens/pot_hp.png';
  else if (nome.includes('Recipe')) imgItem = 'assets/itens/recipe_s.png';
  else if (nome.includes('Ancient Coin')) imgItem = 'assets/itens/ancient_coin.png';
  else if (nome === 'Adena') imgItem = 'assets/itens/adena_coin.png';
  else if (nome.includes('Soulshot') || nome.includes('Spiritshot')) imgItem = 'assets/itens/shot_ng.png';

  const displayName = hotbarLabel(nome);
  const textoDesc = resolveSmartbarItemDesc(nome, itemData);

  const descricao = `<div style="color:#d4c4a8; font-size:0.85em; font-style:italic; margin-top:8px; border-top:1px dashed #444; padding-top:6px; text-align:center;">"${textoDesc}"</div>`;

  img.src = imgItem;
  if (isCurrency) img.classList.add('l2-coin-modal');
  else img.classList.remove('l2-coin-modal');

  const qtyLabel = smartbarT('game.smartbar.quantity');
  let extraBag = '';
  if (isCurrency) {
    extraBag = `<div style="color:#94a3b8;font-size:0.78em;margin-top:8px;text-align:center;">${smartbarT('game.smartbar.currencyNoShortcut')}</div>`;
  }
  const owned = window.inventario[nome] ?? 0;
  desc.innerHTML = `<b style="color:#fff">${displayName}</b><br><span style="color:#aaa; font-size:0.9em;">${qtyLabel} ${owned}</span>${descricao}${extraBag}`;

  btnAcao.style.display = 'block';
  if (isCurrency) {
    btnAcao.innerText = smartbarT('game.smartbar.closeDetails');
    btnAcao.style.background = 'linear-gradient(180deg, #404040 0%, #262626 100%)';
    btnAcao.style.borderColor = '#737373';
    btnAcao.onclick = function () {
      if (typeof window.fecharJanelaAcao === 'function') window.fecharJanelaAcao();
    };
  } else {
    btnAcao.innerText = smartbarT('game.smartbar.pinToShortcut');
    btnAcao.style.background = 'linear-gradient(180deg, #ca8a04 0%, #854d0e 100%)';
    btnAcao.style.borderColor = '#eab308';
    btnAcao.onclick = function () {
      window.fecharJanelaAcao?.();
      window.abrirSeletorAtalhoGlobal(nome, (index: number) => {
        window.barraAtalhos[index] = nome;
        if (typeof window.escreverLog === 'function') {
          window.escreverLog(`<span style="color:#10b981;">${smartbarT('game.smartbar.itemPinnedToSlot', { item: hotbarLabel(nome), slot: String(index + 1) })}</span>`);
        }
        renderizarBarraAtalhos();
        if (typeof window.salvarJogo === 'function') window.salvarJogo();
      });
    };
  }
}

window.abrirSeletorAtalhoGlobal = function (nomeItem: string, callback: HotbarPinCallback): void {
  const modal = document.getElementById('janela-seletor-atalho-global');
  const grid = document.getElementById('grid-seletor-global');
  const imgPreview = document.getElementById('seletor-global-img') as HTMLImageElement | null;
  const nomePreview = document.getElementById('seletor-global-nome');

  if (!modal || !grid || !imgPreview || !nomePreview) return;

  imgPreview.src = obterImgItemDinamico(nomeItem);
  nomePreview.innerText = hotbarLabel(nomeItem);

  grid.innerHTML = '';
  for (let i = 0; i < HOTBAR_SLOT_COUNT; i++) {
    const nomeSlot = window.barraAtalhos[i];
    let visualSlot = '';

    if (nomeSlot) {
      const skill = window.bancoDeSkills?.[nomeSlot];
      if (skill?.icone) {
        visualSlot = `<div style="font-size: 1.2em; filter: drop-shadow(0 0 2px #000);">${skill.icone}</div>`;
      } else {
        visualSlot = `<img src="${obterImgItemDinamico(nomeSlot)}" style="width: 26px; height: 26px; object-fit: contain; filter: drop-shadow(0 0 2px #000);">`;
      }
    }

    const slot = document.createElement('div');
    slot.className = 'shortcut-slot';
    slot.style.width = '100%';
    slot.style.aspectRatio = '1/1';
    slot.style.border = '1px solid #4a3623';
    slot.style.background = 'linear-gradient(135deg, #1a1410 0%, #0a0806 100%)';
    slot.style.position = 'relative';
    slot.style.borderRadius = '3px';
    slot.style.cursor = 'pointer';
    slot.style.minWidth = '32px';

    slot.innerHTML = `
            <span style="position: absolute; top: 1px; left: 2px; font-size: 7px; color: ${i >= 10 ? '#facc15' : '#88745c'}; font-weight: bold;">${i + 1}</span>
            <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                ${visualSlot}
            </div>
        `;

    slot.onclick = () => {
      callback(i);
      window.fecharSeletorGlobal();
      if (typeof window.tocarSom === 'function') window.tocarSom('enchant');
    };

    grid.appendChild(slot);
  }

  if (typeof window.abrirModal === 'function') window.abrirModal('janela-seletor-atalho-global', 3000);
  else modal.style.display = 'flex';
};

window.fecharSeletorGlobal = function (): void {
  if (typeof window.fecharModal === 'function') window.fecharModal('janela-seletor-atalho-global');
  else {
    const modal = document.getElementById('janela-seletor-atalho-global');
    if (modal) modal.style.display = 'none';
  }
};

function obterImgItemDinamico(nome: string | null | undefined): string {
  if (!nome) return 'assets/itens/item_generic.png';

  const itemEncontrado = findCatalogRow(nome);
  if (itemEncontrado?.img) return itemEncontrado.img;

  if (nome.includes('Potion')) return 'assets/itens/pot_hp.png';
  if (nome.includes('Recipe')) return 'assets/itens/recipe_s.png';
  if (nome.includes('Soulshot')) return 'assets/itens/shot_ng.png';
  if (nome.includes('Spiritshot')) return 'assets/itens/shot_ng.png';
  if (nome.includes('Ancient Coin')) return 'assets/itens/ancient_coin.png';
  if (nome === 'Adena') return 'assets/itens/adena_coin.png';

  return 'assets/itens/item_generic.png';
}

function applyHotbarCombatDockStyles(container: HTMLElement): void {
  container.style.setProperty('display', 'grid', 'important');
  container.style.position = 'relative';
  container.style.bottom = 'auto';
  container.style.left = 'auto';
  container.style.transform = 'none';
  container.style.width = '100%';
  container.style.zIndex = '1000';
}

function resetHotbarDockStyles(container: HTMLElement): void {
  container.style.removeProperty('position');
  container.style.removeProperty('bottom');
  container.style.removeProperty('left');
  container.style.removeProperty('transform');
  container.style.removeProperty('width');
  container.style.removeProperty('z-index');
}

function getSkillCdTotal(nomeSlot: string): number {
  if (nomeSlot === 'Attack') return window.playerStats?.atkSpeed ?? 1000;
  const skill = window.bancoDeSkills?.[nomeSlot];
  if (skill?.cd) return skill.cd;
  if (nomeSlot.includes('Potion')) return 15000;
  return 1000;
}

function renderizarBarraAtalhos(): void {
  try {
    const container = document.getElementById('barra-de-atalhos-dinamica');
    const raidHook = document.getElementById('raid-atalhos-hook');
    const olyHook = document.getElementById('olympiad-atalhos-hook');
    const hotbarHome = document.getElementById('hotbar-home-anchor');

    const arenaRaid = document.getElementById('tela-raid-arena');
    const arenaOly = document.getElementById('tela-olympiad-arena');
    const estaNaRaid = arenaRaid && (arenaRaid.style.display === 'flex' || arenaRaid.style.display === 'block');
    const estaNaOlympiad = arenaOly && arenaOly.style.display === 'flex';

    if (container) {
      if (estaNaRaid && raidHook) {
        if (container.parentElement !== raidHook) raidHook.appendChild(container);
        applyHotbarCombatDockStyles(container);
      } else if (estaNaOlympiad && olyHook) {
        if (container.parentElement !== olyHook) olyHook.appendChild(container);
        applyHotbarCombatDockStyles(container);
      } else if (hotbarHome) {
        if (container.parentElement !== hotbarHome) hotbarHome.appendChild(container);
        resetHotbarDockStyles(container);
      }
    }

    if (!container) return;

    let novoHtml = '';
    const agora = Date.now();

    for (let i = 0; i < HOTBAR_SLOT_COUNT; i++) {
      const nomeSlot = window.barraAtalhos[i];
      const numDisplay = i + 1;
      let conteudo = '';
      let classExtra = '';
      let styleExtra = '';

      if (nomeSlot) {
        let pct = 0;
        const cdEnd = window.cooldownsAtivos[nomeSlot];
        if (cdEnd && cdEnd > agora) {
          const cdTotal = getSkillCdTotal(nomeSlot);
          pct = ((cdEnd - agora) / cdTotal) * 100;
          if (pct < 0) pct = 0;
          if (pct > 100) pct = 100;
        }

        const htmlTimer = `<div class="cd-timer-text" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:#ffcc00; font-weight:900; font-size:14px; font-family:monospace; text-shadow:1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0px 0px 5px #000; z-index:10; pointer-events:none; display:none;"></div>`;

        if (nomeSlot === 'Attack') {
          let auraAtiva = window.autoAtaqueAtivo === true;
          if (window.ClanWarEngine?.ativo) {
            auraAtiva = !!window.ClanWarEngine.autoAtaqueAtivo;
          }
          if (auraAtiva) classExtra = 'auto-attack-active';

          const isMage = typeof window.isClasseMagica === 'function'
            ? window.isClasseMagica(window.charClass)
            : false;
          const imgAtaque = isMage ? 'assets/skills/ataque_mago.png' : 'assets/skills/ataque_guerreiro.png';

          conteudo = `
                        <div class="cd-overlay" data-cd="Attack" style="height: ${pct}%;"></div>
                        ${htmlTimer}
                        <img src="${imgAtaque}" style="width:80%; height:80%; object-fit:contain; filter: drop-shadow(0 0 2px #000); z-index: 1;">
                        <span class="shortcut-key" style="${i >= 10 ? 'color: #facc15; font-size: 6px;' : ''}">${numDisplay}</span>
                    `;
        } else {
          const skill = window.bancoDeSkills?.[nomeSlot];
          if (skill) {
            conteudo = `
                        <div class="cd-overlay" data-cd="${nomeSlot}" style="height: ${pct}%;"></div>
                        ${htmlTimer}
                        <span style="font-size:1.4em; filter: drop-shadow(0 0 3px #000); z-index: 1;">${skill.icone || ''}</span>
                        <span class="shortcut-key" style="${i >= 10 ? 'color: #facc15; font-size: 6px;' : ''}">${numDisplay}</span>
                    `;
            styleExtra = `border-color: ${skill.cor || '#888'}88; box-shadow: inset 0 0 8px ${skill.cor || '#888'}20;`;
          } else {
            let qtd = 0;
            if (nomeSlot === 'MP Potion' && window.inventario['Mana Potion']) qtd = window.inventario['Mana Potion'];
            else if (nomeSlot === 'Mana Potion' && window.inventario['MP Potion']) qtd = window.inventario['MP Potion'];
            else qtd = window.inventario[nomeSlot] || 0;

            const imgItem = obterImgItemDinamico(nomeSlot);
            if (window.autoShotAtivo && (nomeSlot.includes('Soulshot') || nomeSlot.includes('Spiritshot'))) {
              classExtra = 'auto-shot-active';
            }

            conteudo = `
                        <div class="cd-overlay" data-cd="${nomeSlot}" style="height: ${pct}%;"></div>
                        ${htmlTimer}
                        <img src="${imgItem}" style="width:70%; height:70%; object-fit:contain; filter: drop-shadow(0 0 2px #000); z-index: 1;">
                        <span class="shortcut-count">${qtd}</span>
                        <span class="shortcut-key" style="${i >= 10 ? 'color: #facc15; font-size: 6px;' : ''}">${numDisplay}</span>
                    `;
          }
        }
      } else {
        conteudo = `<span class="shortcut-key" style="color:#333; ${i >= 10 ? 'font-size: 6px;' : ''}">${numDisplay}</span>`;
      }

      novoHtml += `
                <div class="shortcut-slot ${classExtra}" style="${styleExtra}"
                     ${nomeSlot ? `title="${hotbarLabel(nomeSlot).replace(/"/g, '&quot;')}"` : ''}
                     onmousedown="iniciarToqueAtalho(${i})"
                     onmouseup="soltarToqueAtalho(${i})"
                     onmouseleave="cancelarToqueAtalho()"
                     ontouchstart="iniciarToqueAtalho(${i})"
                     ontouchend="event.preventDefault(); soltarToqueAtalho(${i})">
                    ${conteudo}
                </div>
            `;
    }
    container.innerHTML = novoHtml;
  } catch (erro) {
    console.error('Error drawing shortcuts:', erro);
  }
}

function iniciarToqueAtalho(index: number): void {
  if (timerSegurarDedo) clearTimeout(timerSegurarDedo);
  segurouDedo = false;

  timerSegurarDedo = setTimeout(() => {
    const telaFloresta = document.getElementById('tela-floresta');
    const telaRaid = document.getElementById('tela-raid-arena');
    const telaOlympiad = document.getElementById('tela-olympiad-arena');

    const estaNaFloresta = telaFloresta && telaFloresta.style.display === 'flex';
    const estaNaRaid = telaRaid && telaRaid.style.display === 'flex';
    const estaNaOlympiad = telaOlympiad && telaOlympiad.style.display === 'flex';
    const estaNaGuerra = !!window.ClanWarEngine?.ativo;

    if (estaNaFloresta || estaNaRaid || estaNaOlympiad || estaNaGuerra || (window.monstrosAtivos && window.monstrosAtivos.length > 0)) {
      if (typeof window.escreverLog === 'function') {
        window.escreverLog(`<span style="color:#fcd34d; font-size:0.9em;">${smartbarT('game.smartbar.shortcutsLocked')}</span>`);
      }
      segurouDedo = true;
      return;
    }

    segurouDedo = true;
    const slotItem = window.barraAtalhos[index];
    if (slotItem && !modoAtalhoItem) {
      if (slotItem.includes('shot')) window.autoShotAtivo = false;
      if (typeof window.escreverLog === 'function') {
        window.escreverLog(`<span style="color:#ef4444;">${smartbarT('game.smartbar.removedFromSlot', { item: hotbarLabel(slotItem), slot: String(index + 1) })}</span>`);
      }
      window.barraAtalhos[index] = null;
      renderizarBarraAtalhos();
      if (typeof window.salvarJogo === 'function') window.salvarJogo();
      if (typeof window.tocarSom === 'function') window.tocarSom('ataque');
    }
  }, LONG_PRESS_MS);
}

function executarSkillNaRaid(nomeSlot: string, skill: SkillCatalogEntry): void {
  const agora = Date.now();
  if (window.cooldownsAtivos[nomeSlot] && window.cooldownsAtivos[nomeSlot] > agora) return;
  if (window.playerMP < (skill.mp || 0)) {
    if (typeof window.escreverLog === 'function') {
      window.escreverLog(`<span style="color:#3b82f6; font-size:10px;">${smartbarT('game.smartbar.insufficientMp', { skill: hotbarLabel(nomeSlot) })}</span>`);
    }
    return;
  }

  window.playerMP -= skill.mp || 0;
  if (typeof window.atualizar === 'function') window.atualizar();
  window.dispararAnimacaoCooldown(nomeSlot, skill.cd || 1000);
  if (typeof window.escreverLog === 'function') {
    window.escreverLog(`<span style="color:${skill.cor || '#fff'}; font-weight:bold;">${smartbarT('game.smartbar.youCast', { skill: hotbarLabel(nomeSlot) })}</span>`);
  }

  const raid = window.RaidEngine;
  const bossData = raid?.bossData;
  if (!raid || !bossData) return;

  if (skill.tipo !== 'cura' && skill.tipo !== 'buff') {
    const isMage = typeof window.isClasseMagica === 'function'
      ? window.isClasseMagica(window.charClass)
      : false;
    const danoBruto = isMage ? window.playerStats.mAtk : window.playerStats.pAtk;
    const multSkill = skill.danoMult || 1.5;
    const defDoBoss = isMage ? bossData.mDef : bossData.pDef;

    const multiplicadorDefesa = 1000 / (1000 + defDoBoss);
    let danoFinal = Math.floor(danoBruto * multSkill * multiplicadorDefesa);

    if (Math.random() * 100 <= window.playerStats.critRate) {
      danoFinal *= isMage ? 1.5 : 2;
      raid.escreverLogRaid(`<span style="color:${skill.cor || '#fff'}; font-weight:bold;">${smartbarT('game.raid.criticalSkillDamage', { damage: danoFinal })}</span>`);
    } else {
      raid.escreverLogRaid(smartbarT('game.raid.magicDamageBoss', { damage: danoFinal }));
    }
    raid.receberDanoBoss(danoFinal, true);
  } else if (skill.tipo === 'cura') {
    const cura = skill.curaFixa || Math.floor(window.playerStats.mAtk * (skill.curaMult || 1));
    window.playerHP += cura;
    if (window.playerHP > window.playerStats.maxHp) window.playerHP = window.playerStats.maxHp;
    raid.escreverLogRaid(`<span style="color:#10b981; font-weight:bold;">${smartbarT('game.raid.healFor', { amount: cura })}</span>`);
    if (typeof window.atualizar === 'function') window.atualizar();
  }
}

function soltarToqueAtalho(index: number): void {
  if (timerSegurarDedo) clearTimeout(timerSegurarDedo);
  if (!segurouDedo) {
    if (modoAtalhoItem) {
      window.barraAtalhos[index] = modoAtalhoItem;
      modoAtalhoItem = null;
      const barra = document.getElementById('barra-de-atalhos-dinamica');
      if (barra) barra.classList.remove('glow-yellow');
      if (typeof window.escreverLog === 'function') {
        window.escreverLog(`<span style="color:#10b981;">${smartbarT('game.smartbar.pinnedToSlot', { slot: String(index + 1) })}</span>`);
      }
      renderizarBarraAtalhos();
      if (typeof window.salvarJogo === 'function') window.salvarJogo();
    } else {
      const nomeSlot = window.barraAtalhos[index];
      if (!nomeSlot) return;

      const naRaid = !!window.RaidEngine?.ativo;
      const naOlympiad = !!window.OlympiadEngine?.ativo;
      const naGuerra = !!window.ClanWarEngine?.ativo;

      if (nomeSlot === 'Attack') {
        if (naOlympiad) window.OlympiadEngine?.playerAtaca?.();
        else if (naRaid) {
          if (typeof window.atacar === 'function') window.atacar();
          else window.RaidEngine?.playerAtaca?.();
        } else if (naGuerra) window.ClanWarEngine?.usarSkillPlayer?.('Attack');
        else {
          window.atacar?.();
          renderizarBarraAtalhos();
        }
      } else {
        const skill = window.bancoDeSkills?.[nomeSlot];
        if (skill) {
          if (naOlympiad) window.OlympiadEngine?.playerUsaSkill?.(nomeSlot);
          else if (naGuerra) window.ClanWarEngine?.usarSkillPlayer?.(nomeSlot);
          else if (naRaid) executarSkillNaRaid(nomeSlot, skill);
          else if (typeof window.usarSkill === 'function') window.usarSkill(nomeSlot);
        } else {
          let nomeReal = nomeSlot;
          if (nomeSlot === 'MP Potion' && window.inventario['Mana Potion']) nomeReal = 'Mana Potion';
          if (nomeSlot === 'Mana Potion' && window.inventario['MP Potion']) nomeReal = 'MP Potion';

          const qtdAtual = window.inventario[nomeReal] || 0;

          if (qtdAtual <= 0 && !nomeSlot.includes('shot')) {
            if (typeof window.escreverLog === 'function') {
              window.escreverLog(`<span style="color:#ef4444; font-weight:bold; font-size:0.9em;">${smartbarT('game.smartbar.emptyStock', { item: hotbarLabel(nomeSlot) })}</span>`);
            }
            return;
          }

          if (nomeSlot === 'HP Potion') {
            if (typeof window.usarPocao === 'function') window.usarPocao();
          } else if (nomeSlot === 'Mana Potion' || nomeSlot === 'MP Potion') {
            if (typeof window.usarPocaoMP === 'function') window.usarPocaoMP(nomeSlot);
          } else if (nomeSlot.includes('Soulshot') || nomeSlot.includes('Spiritshot')) {
            const telaOly = document.getElementById('tela-olympiad-arena');
            if (telaOly && telaOly.style.display === 'flex') {
              if (typeof window.escreverLog === 'function') {
                window.escreverLog('<span style="color:#facc15;">Soulshots/Spiritshots are disabled in the Olympiad Arena!</span>');
              }
              window.autoShotAtivo = false;
              renderizarBarraAtalhos();
              return;
            }

            window.autoShotAtivo = !window.autoShotAtivo;
            if (typeof window.escreverLog === 'function') {
              if (window.autoShotAtivo) {
                window.escreverLog(`<span style="color:#60a5fa; font-weight:bold;">${smartbarT('game.smartbar.autoShotOn')}</span>`);
              } else {
                window.escreverLog(`<span style="color:#aaa;">${smartbarT('game.smartbar.autoShotOff')}</span>`);
              }
            }
            renderizarBarraAtalhos();
          }
        }
      }
    }
  }
}

function cancelarToqueAtalho(): void {
  if (timerSegurarDedo) clearTimeout(timerSegurarDedo);
}

window.dispararAnimacaoCooldown = function (nome: string, tempoMs: number): void {
  window.cooldownsAtivos[nome] = Date.now() + tempoMs;
};

window.dispararAnimacaoGCD = function (tempoMs: number, nome: string): void {
  window.dispararAnimacaoCooldown(nome, tempoMs);
};

setInterval(() => {
  const overlays = document.querySelectorAll('.cd-overlay');
  const agora = Date.now();

  overlays.forEach((overlay) => {
    const el = overlay as HTMLElement;
    const nome = el.getAttribute('data-cd');
    if (!nome) return;
    const tempoFim = window.cooldownsAtivos[nome] || 0;
    const timerText = el.nextElementSibling as HTMLElement | null;

    if (tempoFim > agora) {
      const restamMs = tempoFim - agora;
      const cdTotal = getSkillCdTotal(nome);

      let porcentagem = (restamMs / cdTotal) * 100;
      if (porcentagem < 0) porcentagem = 0;
      if (porcentagem > 100) porcentagem = 100;

      el.style.height = porcentagem + '%';
      el.style.width = '100%';

      if (timerText?.classList.contains('cd-timer-text')) {
        if (nome !== 'Attack') {
          timerText.innerText = (restamMs / 1000).toFixed(1);
          timerText.style.display = 'block';
        } else {
          timerText.style.display = 'none';
        }
      }
    } else {
      el.style.height = '0%';
      if (timerText?.classList.contains('cd-timer-text')) {
        timerText.style.display = 'none';
      }
    }
  });
}, 50);

window.renderizarBarraAtalhos = renderizarBarraAtalhos;
window.iniciarToqueAtalho = iniciarToqueAtalho;
window.soltarToqueAtalho = soltarToqueAtalho;
window.cancelarToqueAtalho = cancelarToqueAtalho;
window.abrirAcaoItemGeral = abrirAcaoItemGeral;

export {};
