/**
 * UI — crafting (Maestro Reorin)
 * Migrado: js/ui_craft.js — Fase 4: tipos explícitos.
 */

import type {
  CraftCategory,
  CraftCreditResult,
  CraftItemRpcResult,
  CraftRecipe,
  CraftResultChoice,
  ItemCatalogBase,
} from '../types/game';

let receitaSelecionada: CraftRecipe | null = null;
let categoriaSelecionada: CraftCategory = 'special';
/** idBase escolhido em receitas com `escolhasResultado` (Vesper arma/joia unificadas). */
let craftVesperEscolhaIdBase: string | null = null;

function craftT(key: string, params?: Record<string, string | number>): string {
  return typeof window.t === 'function' ? window.t(key, params) : key;
}

function receitasDaCategoria(categoria: string): CraftRecipe[] {
  if (!window.catalogoReceitas) return [];
  return window.catalogoReceitas[categoria] || [];
}

function abrirJanelaCraft(categoria: CraftCategory = 'special'): void {
  window.abrirModal('janela-craft', 1500);
  mudarAbaCraft(categoria);
}

function fecharJanelaCraft(): void {
  window.fecharModal('janela-craft');
  receitaSelecionada = null;
  craftVesperEscolhaIdBase = null;
}

function mudarAbaCraft(categoria: CraftCategory): void {
  categoriaSelecionada = categoria;
  craftVesperEscolhaIdBase = null;

  const tabSpecial = document.getElementById('tab-craft-special');
  const tabMats = document.getElementById('tab-craft-mats');
  if (tabSpecial) {
    tabSpecial.style.background = (categoria === 'special')
      ? 'linear-gradient(180deg, #ca8a04 0%, #854d0e 100%)'
      : '#222';
  }
  if (tabMats) {
    tabMats.style.background = (categoria === 'mats')
      ? 'linear-gradient(180deg, #ca8a04 0%, #854d0e 100%)'
      : '#222';
  }

  const grid = document.getElementById('craft-receitas-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const filtradas = receitasDaCategoria(categoria);

  if (!filtradas.length) {
    grid.innerHTML = '<span style="color:#aaa; font-size:0.8em; grid-column: span 4; text-align:center; padding-top: 10px;">'
      + craftT('game.craft.emptyCategory', {}) + '</span>';
  } else {
    filtradas.forEach(rec => {
      grid.innerHTML += `<div class="store-item-slot" onclick="selecionarReceita('${rec.idReceita}')"><img src="${rec.img || ''}" title="${rec.nome}" onerror="this.src='assets/itens/item_generic.png'"></div>`;
    });
  }

  const detalhe = document.getElementById('craft-detalhe-texto');
  if (detalhe) detalhe.innerHTML = craftT('game.craft.selectRecipeHint');
  const ingHost = document.getElementById('craft-ingredientes');
  if (ingHost) ingHost.innerHTML = '';
  const btnExec = document.getElementById('btn-executar-craft');
  if (btnExec) btnExec.style.display = 'none';
  receitaSelecionada = null;
  const wrapEsc = document.getElementById('craft-escolha-vesper');
  if (wrapEsc) {
    wrapEsc.style.display = 'none';
    wrapEsc.innerHTML = '';
  }
}

function obterQtdIngrediente(id: string): number {
  if (id === 'Ancient Coin') return typeof window.ancientCoins !== 'undefined' ? window.ancientCoins : 0;
  if (id === 'Adena') return typeof window.adenas !== 'undefined' ? window.adenas : 0;
  return window.inventario[id] || 0;
}

function consumirIngrediente(id: string, qtd: number): void {
  if (id === 'Ancient Coin') {
    window.ancientCoins -= qtd;
  } else if (id === 'Adena') {
    window.adenas -= qtd;
  } else {
    window.inventario[id] -= qtd;
    if (window.inventario[id] <= 0) delete window.inventario[id];
  }
}

function noneMatch(choices: CraftResultChoice[], idBase: string | null): boolean {
  return !choices.some(o => o.idBase === idBase);
}

function renderPainelEscolhaVesper(): void {
  const wrap = document.getElementById('craft-escolha-vesper');
  if (!wrap) return;

  if (receitaSelecionada && Array.isArray(receitaSelecionada.escolhasResultado) && receitaSelecionada.escolhasResultado.length > 0) {
    const choices = receitaSelecionada.escolhasResultado;
    if (!craftVesperEscolhaIdBase || noneMatch(choices, craftVesperEscolhaIdBase)) {
      craftVesperEscolhaIdBase = choices[0].idBase;
    }
    const lab = craftT('game.craft.outputLabel');
    const opts = choices.map(o => `<option value="${o.idBase}">${o.label}</option>`).join('');
    wrap.style.display = 'block';
    wrap.innerHTML = `
            <label style="color:#e5e7eb;font-size:0.85em;display:block;margin-bottom:4px;">${lab}</label>
            <select id="craft-select-vesper" class="btn-l2" style="width:100%;padding:8px;font-size:0.85em;background:#1a1410;color:#facc15;border:1px solid #854d0e;box-sizing:border-box;" onchange="craftOnVesperVariantChange(this.value)">${opts}</select>`;
    const sel = document.getElementById('craft-select-vesper') as HTMLSelectElement | null;
    if (sel && craftVesperEscolhaIdBase) sel.value = craftVesperEscolhaIdBase;
  } else {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    craftVesperEscolhaIdBase = null;
  }
}

function atualizarListaIngredientesCraft(): void {
  if (!receitaSelecionada) return;

  let htmlIngredientes = '';
  let podeCraftar = true;

  receitaSelecionada.ingredientes.forEach(ing => {
    const qtdPossui = obterQtdIngrediente(ing.id);
    const corQtd = qtdPossui >= ing.qtd ? '#10b981' : '#ef4444';
    if (qtdPossui < ing.qtd) podeCraftar = false;

    const icone = ing.id === 'Ancient Coin' ? '🪙 ' : (ing.id === 'Adena' ? '💰 ' : '');

    htmlIngredientes += `
            <div style="display:flex; justify-content:space-between; font-size:0.85em; background:#1a1410; padding:4px 6px; border-radius:2px; border: 1px solid #3d2b1f;">
                <span style="color:#d4c4a8;">${icone}${ing.id}</span>
                <span style="color:${corQtd}; font-weight:bold; text-shadow:1px 1px 0 #000;">${qtdPossui.toLocaleString()} / ${ing.qtd.toLocaleString()}</span>
            </div>
        `;
  });

  const ingHost = document.getElementById('craft-ingredientes');
  if (ingHost) ingHost.innerHTML = htmlIngredientes;

  const btnExecutar = document.getElementById('btn-executar-craft') as HTMLButtonElement | null;
  if (!btnExecutar) return;
  btnExecutar.style.display = 'block';

  if (podeCraftar) {
    btnExecutar.disabled = false;
    btnExecutar.style.background = 'linear-gradient(180deg, #ca8a04 0%, #854d0e 100%)';
    btnExecutar.style.borderColor = '#eab308';
    btnExecutar.style.color = '#fff';
    btnExecutar.innerText = craftT('game.craft.forgeItem');
  } else {
    btnExecutar.disabled = true;
    btnExecutar.style.background = '#3d2b1f';
    btnExecutar.style.borderColor = '#241710';
    btnExecutar.style.color = '#88745c';
    btnExecutar.innerText = craftT('game.craft.needMaterials');
  }
}

function buscarBaseDoEquipamento(idBase: string): ItemCatalogBase | null {
  let equipamento: ItemCatalogBase | null = null;
  if (window.catalogoArmaduras) equipamento = window.catalogoArmaduras.find(a => a.id === idBase) || null;
  if (!equipamento && window.catalogoArmas) equipamento = window.catalogoArmas.find(a => a.id === idBase) || null;
  if (!equipamento && window.catalogoJoias) equipamento = window.catalogoJoias.find(a => a.id === idBase) || null;
  return equipamento;
}

function selecionarReceita(id: string): void {
  const lista = receitasDaCategoria(categoriaSelecionada);
  receitaSelecionada = lista.find(r => r.idReceita === id) || null;
  if (!receitaSelecionada) return;

  craftVesperEscolhaIdBase = null;

  const taxa = receitaSelecionada.taxaSucesso != null ? Number(receitaSelecionada.taxaSucesso) : 100;
  const rateLine = taxa >= 100
    ? craftT('game.craft.successRate')
    : craftT('game.craft.successRatePct', { pct: taxa });
  const warnFail = taxa < 100 ? craftT('game.craft.mintFailWarning') : '';
  const detalhe = document.getElementById('craft-detalhe-texto');
  if (detalhe) {
    detalhe.innerHTML = `
        <b style="color:#ffcc00; font-size:1.1em; font-family: 'Cinzel', serif;">${receitaSelecionada.nome}</b><br>
        <span style="color:#ccc; font-size:0.85em;">${receitaSelecionada.desc || ''}</span><br>
        <span style="color:${taxa < 100 ? '#fbbf24' : '#10b981'}; font-weight:bold; font-size:0.9em;">${rateLine}</span>
        ${warnFail ? `<br><span style="color:#a8a29e; font-size:0.78em;">${warnFail}</span>` : ''}
    `;
  }

  renderPainelEscolhaVesper();
  atualizarListaIngredientesCraft();
}

function consumirIngredientesReceita(): void {
  if (!receitaSelecionada) return;
  receitaSelecionada.ingredientes.forEach(function (ing) {
    consumirIngrediente(ing.id, ing.qtd);
  });
}

function creditarResultadoCraftLocal(tipoGerado: string, idBaseGerado: string, qtdGerada: number): CraftCreditResult {
  let nomeGerado = '';
  let imgGerada = receitaSelecionada?.img;

  if (tipoGerado === 'material') {
    if (idBaseGerado === 'Ancient Coin') {
      window.ancientCoins = (Number(window.ancientCoins) || 0) + qtdGerada;
      nomeGerado = craftT('game.craft.mintResultName');
      imgGerada = 'assets/itens/ancient_coin.png';
    } else {
      if (window.InventoryManager && typeof window.InventoryManager.adicionarStack === 'function') {
        window.InventoryManager.adicionarStack(idBaseGerado, qtdGerada);
      } else {
        window.inventario[idBaseGerado] = (window.inventario[idBaseGerado] || 0) + qtdGerada;
      }
      nomeGerado = idBaseGerado;
    }
  } else {
    const baseEquip = buscarBaseDoEquipamento(idBaseGerado);
    if (baseEquip) {
      let tipoInst = tipoGerado;
      if (tipoGerado === 'jewel' && baseEquip.tipoItem) tipoInst = String(baseEquip.tipoItem);
      window.InventoryManager.adicionarEquipamento({
        tipo: tipoInst,
        base: baseEquip,
        enchant: 0,
        augmented: false,
        origin: 'Craft',
      });
      nomeGerado = String(baseEquip.nome || idBaseGerado);
      imgGerada = baseEquip.img as string | undefined;
    } else {
      console.error('Error: Base gear not found in DB! ID:', idBaseGerado);
      nomeGerado = 'Mystery Item';
    }
  }
  return { nomeGerado, imgGerada };
}

function registrarProgressoMintMissaoSeAplicavel(): void {
  if (receitaSelecionada && receitaSelecionada.idReceita === 'rec_mint_ancient_coin'
    && typeof window.registrarProgressoMissaoDiaria === 'function') {
    window.registrarProgressoMissaoDiaria('tentar_mint', 1);
  }
}

function falhaCraftComMateriaisConsumidos(): void {
  if (typeof window.escreverLog === 'function') {
    const logLine = craftT('game.craft.logMintFailed');
    window.escreverLog('<span style="color:#ef4444; font-weight:bold;">' + logLine + '</span>');
  }
  if (typeof window.atualizar === 'function') window.atualizar();
  if (typeof window.salvarJogo === 'function') window.salvarJogo();
  if (typeof window.l2Alert === 'function') {
    window.l2Alert(craftT('game.craft.mintFailed'));
  }
  renderPainelEscolhaVesper();
  atualizarListaIngredientesCraft();
}

function _rpcErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || error);
  }
  return String(error);
}

async function executarCraft(): Promise<void> {
  if (!receitaSelecionada) return;

  let qtdGerada = 1;
  let tipoGerado: string | null = null;
  let idBaseGerado: string | null = null;

  const ir = receitaSelecionada.itemResultado;
  const esc = receitaSelecionada.escolhasResultado;

  if (ir && ir.tipoBase === 'material') {
    tipoGerado = 'material';
    idBaseGerado = ir.idBase;
    qtdGerada = ir.gerado || 1;
  } else if (Array.isArray(esc) && esc.length > 0) {
    const pick = esc.find(o => o.idBase === craftVesperEscolhaIdBase) || esc[0];
    tipoGerado = pick.tipoBase;
    idBaseGerado = pick.idBase;
  } else if (ir) {
    tipoGerado = ir.tipoBase;
    idBaseGerado = ir.idBase;
    qtdGerada = ir.gerado || 1;
  } else {
    if (typeof window.mostrarAviso === 'function') {
      window.mostrarAviso(craftT('game.craft.invalidRecipe'));
    }
    return;
  }

  if (!tipoGerado || !idBaseGerado) return;

  let podeCraftar = true;
  receitaSelecionada.ingredientes.forEach(ing => {
    if (obterQtdIngrediente(ing.id) < ing.qtd) podeCraftar = false;
  });

  if (!podeCraftar) {
    if (typeof window.mostrarAviso === 'function') {
      window.mostrarAviso(craftT('game.craft.notEnoughMaterials'));
    }
    return;
  }

  const btnExecutar = document.getElementById('btn-executar-craft') as HTMLButtonElement | null;
  if (btnExecutar) {
    btnExecutar.disabled = true;
    btnExecutar.innerText = craftT('game.craft.forging');
  }

  const taxaSucesso = receitaSelecionada.taxaSucesso != null ? Number(receitaSelecionada.taxaSucesso) : 100;
  const recipe = receitaSelecionada;

  if (window.SupabaseAPI && window.SupabaseAPI.getUser() && window.charName && typeof window.SupabaseAPI.craftItem === 'function') {
    try {
      const { data, error } = await window.SupabaseAPI.craftItem(
        window.charName,
        recipe.idReceita,
        craftVesperEscolhaIdBase,
      );

        if (error) {
        console.error('[Craft RPC Error]', error);
        if (typeof window.l2Alert === 'function') {
          const msg = typeof window.cloudRpcMessage === 'function'
            ? window.cloudRpcMessage(error, { prefix: 'game.craft.error', fallbackKey: 'game.craft.error.unknown', keyStyle: 'dot' })
            : craftT('game.craft.error.unknown');
          window.l2Alert(msg);
        }
        if (btnExecutar) {
          btnExecutar.disabled = false;
          btnExecutar.innerText = craftT('game.craft.forgeItem');
        }
        return;
      }

      const payload = data as CraftItemRpcResult | null;

      if (payload && payload.success === false && payload.error === 'mint_failed') {
        window.adenas = Math.max(0, Math.floor(Number(payload.adenas)));
        window.ancientCoins = Math.max(0, Math.floor(Number(payload.ancientCoins)));
        if (payload.inventario && typeof payload.inventario === 'object' && !Array.isArray(payload.inventario)) {
          window.inventario = Object.assign({}, payload.inventario);
        }
        if (typeof window.syncMoedasInventarioComCarteira === 'function') window.syncMoedasInventarioComCarteira();
        fecharJanelaCraft();
        registrarProgressoMintMissaoSeAplicavel();
        falhaCraftComMateriaisConsumidos();
        if (btnExecutar) {
          btnExecutar.disabled = false;
          btnExecutar.innerText = craftT('game.craft.forgeItem');
        }
        return;
      }

      if (payload && payload.success) {
        window.adenas = Math.max(0, Math.floor(Number(payload.adenas)));
        window.ancientCoins = Math.max(0, Math.floor(Number(payload.ancientCoins)));
        if (payload.inventario && typeof payload.inventario === 'object' && !Array.isArray(payload.inventario)) {
          window.inventario = Object.assign({}, payload.inventario);
        }
        let rawEq = payload.inventarioEquips;
        if (typeof rawEq === 'string') {
          try {
            rawEq = JSON.parse(rawEq);
          } catch {
            rawEq = [];
          }
        }
        window.inventarioEquips =
          typeof window.normalizarInventarioEquipsParaInstancias === 'function'
            ? window.normalizarInventarioEquipsParaInstancias(Array.isArray(rawEq) ? rawEq : [])
            : Array.isArray(rawEq)
              ? rawEq
              : [];

        if (typeof window.syncMoedasInventarioComCarteira === 'function') window.syncMoedasInventarioComCarteira();

        const idCrafted = payload.id_base_crafted || idBaseGerado;
        let nomeGerado = '';
        let imgGerada = recipe.img;
        if (payload.tipo_crafted === 'material' && idCrafted === 'Ancient Coin') {
          nomeGerado = craftT('game.craft.mintResultName');
          imgGerada = 'assets/itens/ancient_coin.png';
        } else {
          const baseEquip = buscarBaseDoEquipamento(String(idCrafted));
          if (baseEquip) {
            nomeGerado = String(baseEquip.nome || idCrafted);
            imgGerada = baseEquip.img as string | undefined;
          } else {
            nomeGerado = String(idCrafted || '?');
          }
        }

        registrarProgressoMintMissaoSeAplicavel();
        fecharJanelaCraft();
        mostrarResultadoCraft(nomeGerado, imgGerada, qtdGerada);

        if (typeof window.escreverLog === 'function') {
          const logLine = (recipe.idReceita === 'rec_mint_ancient_coin')
            ? craftT('game.craft.logMintSuccess')
            : craftT('game.craft.logForged', { item: nomeGerado });
          window.escreverLog('<span style="color:#facc15; font-weight:bold; text-shadow: 1px 1px 0 #000;">' + logLine + '</span>');
        }
        if (typeof window.atualizar === 'function') window.atualizar();
        if (typeof window.salvarJogo === 'function') window.salvarJogo();
        if (btnExecutar) {
          btnExecutar.disabled = false;
          btnExecutar.innerText = craftT('game.craft.forgeItem');
        }
      } else {
        const code = (payload && payload.error) ? String(payload.error) : 'unknown';
        const errKey = 'game.craft.error.' + code;
        let msg = craftT(errKey);
        if (msg === errKey) msg = craftT('game.craft.errorGeneric', { code });
        if (typeof window.l2Alert === 'function') window.l2Alert(msg);
        if (btnExecutar) {
          btnExecutar.disabled = false;
          btnExecutar.innerText = craftT('game.craft.forgeItem');
        }
      }
    } catch (err) {
      console.error('[Craft RPC Exception]', err);
      if (btnExecutar) {
        btnExecutar.disabled = false;
        btnExecutar.innerText = craftT('game.craft.forgeItem');
      }
    }
    return;
  }

  consumirIngredientesReceita();
  registrarProgressoMintMissaoSeAplicavel();

  if (taxaSucesso < 100 && Math.random() * 100 >= taxaSucesso) {
    if (btnExecutar) {
      btnExecutar.disabled = false;
      btnExecutar.innerText = craftT('game.craft.forgeItem');
    }
    falhaCraftComMateriaisConsumidos();
    return;
  }

  const out = creditarResultadoCraftLocal(tipoGerado, idBaseGerado, qtdGerada);

  fecharJanelaCraft();
  mostrarResultadoCraft(out.nomeGerado, out.imgGerada, qtdGerada);

  if (typeof window.escreverLog === 'function') {
    const logLine = (recipe.idReceita === 'rec_mint_ancient_coin')
      ? craftT('game.craft.logMintSuccess')
      : craftT('game.craft.logForged', { item: out.nomeGerado });
    window.escreverLog('<span style="color:#facc15; font-weight:bold; text-shadow: 1px 1px 0 #000;">' + logLine + '</span>');
  }
  if (typeof window.atualizar === 'function') window.atualizar();
  if (typeof window.salvarJogo === 'function') window.salvarJogo();
  if (btnExecutar) {
    btnExecutar.disabled = false;
    btnExecutar.innerText = craftT('game.craft.forgeItem');
  }
}

function mostrarResultadoCraft(nomeItem: string, imgItem: string | undefined, qtd: number): void {
  const imgEl = document.getElementById('craft-res-img') as HTMLImageElement | null;
  const nomeEl = document.getElementById('craft-res-nome');
  const qtdEl = document.getElementById('craft-res-qtd');
  if (imgEl) imgEl.src = imgItem || 'assets/itens/item_generic.png';
  if (nomeEl) nomeEl.innerText = nomeItem;
  if (qtdEl) qtdEl.innerText = craftT('game.craft.craftedQty', { qtd });

  if (typeof window.tocarSom === 'function') window.tocarSom('enchant_success');

  window.abrirModal('janela-craft-resultado', 1800);
}

function fecharCraftResultado(): void {
  window.fecharModal('janela-craft-resultado');
  if (typeof window.atualizar === 'function') window.atualizar();
  if (typeof window.renderizarInventario === 'function') window.renderizarInventario();
}

function craftOnVesperVariantChange(idBase: string): void {
  craftVesperEscolhaIdBase = idBase;
  atualizarListaIngredientesCraft();
}

window.abrirJanelaCraft = abrirJanelaCraft;
window.fecharJanelaCraft = fecharJanelaCraft;
window.mudarAbaCraft = mudarAbaCraft;
window.selecionarReceita = selecionarReceita;
window.executarCraft = executarCraft;
window.mostrarResultadoCraft = mostrarResultadoCraft;
window.fecharCraftResultado = fecharCraftResultado;
window.craftOnVesperVariantChange = craftOnVesperVariantChange;
window.buscarBaseDoEquipamento = buscarBaseDoEquipamento;

export {};
