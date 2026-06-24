/**
 * UI — inventário (bolsa e perfil)
 * Migrado: js/ui_inventory.js — Fase 4: tipos explícitos.
 * Bolsa: docs/inventory-grid-layout.md — usar _l2AppendInvGridSlot (inv-grid-cell > inv-slot)
 */

import type {
  EquipInstance,
  GradeEquipValidation,
  InventarioBagFilter,
  ItemCatalogBase,
  PlayerStatBreakdown,
  PlayerStats,
} from '../types/game';

/** Equipamento na bolsa com campos legados (enchantArmor, tipoItem, …). */
interface InventoryBagEquip extends EquipInstance {
  enchantJewel?: number;
  enchantArmor?: number;
  tipoItem?: string;
  nome?: string;
}

function _invNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type StackCatalogEntry = Pick<ItemCatalogBase, 'id' | 'nome' | 'img'>;

function _l2InvIconFrameHtml(src: string, imgClass?: string): string {
    var cls = imgClass || 'inv-img';
    var fallback = 'assets/itens/item_generic.png';
    return '<div class="inv-icon-frame" aria-hidden="true">' +
        '<img src="' + src + '" class="' + cls + '" decoding="async" loading="lazy" draggable="false" alt="" ' +
        'onerror="this.onerror=null;this.src=\'' + fallback + '\';">' +
        '</div>';
}

function _l2AppendInvGridSlot(
    grid: HTMLElement,
    slotClass: string,
    innerHtml: string,
    onClick?: (() => void) | null,
    title?: string
): HTMLDivElement {
    var cell = document.createElement('div');
    cell.className = 'inv-grid-cell';
    var slot = document.createElement('div');
    slot.className = slotClass || 'inv-slot';
    slot.setAttribute('role', 'button');
    slot.innerHTML = innerHtml;
    if (title) slot.title = title;
    if (typeof onClick === 'function') slot.onclick = onClick;
    cell.appendChild(slot);
    grid.appendChild(cell);
    return slot;
}

function _inventarioFiltroTexto(filterId: string): string {
    var key = 'game.inventoryUi.filter.' + (filterId || 'recent');
    if (typeof window.t === 'function') return window.t(key);
    return filterId || 'recent';
}

function _fecharInventarioFiltroMenu(): void {
    var wrap = document.getElementById('inventario-filtro-wrap');
    var menu = document.getElementById('inventario-filtro-menu');
    var trigger = document.getElementById('btn-inventario-filtro');
    if (!wrap || !menu) return;
    wrap.classList.remove('is-open');
    menu.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

function _initInventarioFiltros(): void {
    var wrap = document.getElementById('inventario-filtro-wrap');
    var menu = document.getElementById('inventario-filtro-menu');
    var trigger = document.getElementById('btn-inventario-filtro');
    if (!wrap || !menu || !trigger || wrap.dataset.bound === '1') return;
    wrap.dataset.bound = '1';

    if (typeof window.inventarioBagFilter !== 'string' || !window.inventarioBagFilter) {
        window.inventarioBagFilter = 'recent';
    }

    trigger.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var open = !wrap.classList.contains('is-open');
        if (open) {
            wrap.classList.add('is-open');
            menu.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
        } else {
            _fecharInventarioFiltroMenu();
        }
    });

    menu.addEventListener('click', function (ev) {
        var target = ev.target instanceof Element ? ev.target : null;
        var btn = target?.closest('[data-inv-filter]');
        if (!btn) return;
        ev.stopPropagation();
        window.inventarioBagFilter = (btn.getAttribute('data-inv-filter') || 'recent') as InventarioBagFilter;
        _syncInventarioFiltroAtivo();
        _fecharInventarioFiltroMenu();
        renderizarInventario();
    });

    if (!window._inventarioFiltroDocBound) {
        window._inventarioFiltroDocBound = true;
        document.addEventListener('click', function () {
            _fecharInventarioFiltroMenu();
        });
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') _fecharInventarioFiltroMenu();
        });
    }
}

function _syncInventarioFiltroAtivo(): void {
    var menu = document.getElementById('inventario-filtro-menu');
    var labelEl = document.getElementById('inventario-filtro-label');
    if (!menu) return;
    var active = window.inventarioBagFilter || 'recent';
    menu.querySelectorAll('[data-inv-filter]').forEach(function (btn) {
        var isActive = btn.getAttribute('data-inv-filter') === active;
        btn.classList.toggle('inv-filter-option--active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    if (labelEl) {
        labelEl.textContent = _inventarioFiltroTexto(active);
        labelEl.removeAttribute('data-i18n');
    }
}

function renderizarInventario(): void {
    const grid = document.getElementById('grid-inventario'); 
    if(!grid) return;
    _initInventarioFiltros();
    _syncInventarioFiltroAtivo();
    grid.innerHTML = '';

    var filter = window.inventarioBagFilter || 'recent';
    if (typeof window.InventarioRecent !== 'undefined') {
        window.InventarioRecent.pruneMissing();
    }

    var kMoedaAd = (window.L2MINI_CURRENCY_BAG_KEYS && window.L2MINI_CURRENCY_BAG_KEYS.adena) || 'Adena';
    var kMoedaAc = (window.L2MINI_CURRENCY_BAG_KEYS && window.L2MINI_CURRENCY_BAG_KEYS.ancient) || 'Ancient Coin';

    const renderSlotEquip = function (equip: InventoryBagEquip, index: number): void {
        if (!equip) return;
        const itemBase = (equip.base ? equip.base : equip) as ItemCatalogBase;
        if (!itemBase.nome) return;

        const nivelEnchant = equip.enchant !== undefined
            ? equip.enchant
            : Number(equip.enchantArmor || equip.enchantJewel || 0);
        let labelPlus = nivelEnchant > 0 ? `<div class="enchant-label">+${nivelEnchant}</div>` : '';
        let badgeAugment = (equip.augmented || itemBase.augmented) ? `<div class="augment-label" style="background:#a855f7;"></div>` : '';

        let slotClass = 'inv-slot';
        let badgeLock = '';
        let slotTitle = '';
        if (typeof window.validarEquipPorGrade === 'function') {
            const vGr = window.validarEquipPorGrade(equip);
            if (!vGr.permitido) {
                slotClass += ' inv-slot--grade-locked';
                const gLabel = vGr.grade || 'NO-GRADE';
                slotTitle = (typeof window.t === 'function')
                    ? window.t('game.inventoryUi.slotLockedTitle', {
                        grade: gLabel,
                        level: vGr.nivelMinimo,
                        yours: vGr.nivelAtual
                    })
                    : ('[' + gLabel + '] Requires level ' + vGr.nivelMinimo + ' (yours: ' + vGr.nivelAtual + ')');
                badgeLock = '<div class="inv-slot-lock" aria-hidden="true">🔒</div>';
            }
        }

        _l2AppendInvGridSlot(
            grid,
            slotClass,
            `${badgeAugment}${badgeLock}${_l2InvIconFrameHtml(itemBase.img)}${labelPlus}`,
            () => abrirAcaoInventario(index),
            slotTitle || undefined
        );
    };

    const renderSlotStack = function (nome: string): void {
        const qtd = window.inventario[nome];
        if (!qtd || qtd <= 0) return;
        const isCurrency = (nome === kMoedaAd || nome === kMoedaAc);
        const slotClass = isCurrency ? 'inv-slot inv-slot-currency' : 'inv-slot';

        let imgSrc = 'assets/itens/item_generic.png';
        let dadosItem: StackCatalogEntry | null = null;
        if (typeof window.InventoryStackKeys !== 'undefined' && window.InventoryStackKeys.findStackCatalogEntry) {
            dadosItem = window.InventoryStackKeys.findStackCatalogEntry(nome) as StackCatalogEntry | null;
        }
        if (!dadosItem && typeof window.catalogoMateriais !== 'undefined') {
            dadosItem = window.catalogoMateriais.find((m) => {
                const row = m as StackCatalogEntry;
                return row.id === nome || row.nome === nome;
            }) as StackCatalogEntry | undefined ?? null;
        }
        if (!dadosItem && typeof window.catalogoConsumiveis !== 'undefined') {
            dadosItem = window.catalogoConsumiveis.find((c) => c.id === nome || c.nome === nome) ?? null;
        }
        if (!dadosItem && typeof window.catalogoScrolls !== 'undefined') {
            dadosItem = window.catalogoScrolls.find((s) => s.id === nome || s.nome === nome) ?? null;
        }

        if (dadosItem && dadosItem.img) imgSrc = dadosItem.img;
        else {
            if (nome.includes('Potion')) imgSrc = 'assets/itens/pot_hp.png';
            else if (nome.includes('Recipe')) imgSrc = 'assets/itens/recipe_s.png';
            else if (nome.includes('Ancient')) imgSrc = 'assets/itens/ancient_coin.png';
            else if (nome === kMoedaAd) imgSrc = 'assets/itens/adena_coin.png';
        }

        var innerHtml = isCurrency
            ? `${_l2InvIconFrameHtml(imgSrc, 'inv-img l2-coin-img')}<div class="inv-qtd">${qtd}</div>`
            : `${_l2InvIconFrameHtml(imgSrc)}<div class="inv-qtd">${qtd}</div>`;

        var slotTitle = (dadosItem && dadosItem.nome) ? dadosItem.nome : nome;

        _l2AppendInvGridSlot(grid, slotClass, innerHtml, function () {
            if (typeof window.abrirAcaoItemGeral === 'function') window.abrirAcaoItemGeral(nome);
        }, slotTitle);
    };

    try {
        if (typeof window.InventarioRecent !== 'undefined' && typeof window.InventarioRecent.buildDisplayPlan === 'function') {
            var plan = window.InventarioRecent.buildDisplayPlan(filter);
            plan.forEach(function (entry) {
                if (entry.kind === 'currency') renderSlotStack(entry.name);
                else if (entry.kind === 'equip') {
                    const eq = window.inventarioEquips[entry.index] as InventoryBagEquip | undefined;
                    if (eq) renderSlotEquip(eq, entry.index);
                } else if (entry.kind === 'stack') renderSlotStack(entry.name);
            });
            return;
        }
    } catch (e) { console.error('Erro ao renderizar inventário (recent):', e); }

    // Fallback legado
    try {
        if (typeof window.inventarioEquips !== 'undefined') {
            window.inventarioEquips.forEach((equip, index) => { renderSlotEquip(equip as InventoryBagEquip, index); });
        }
    } catch (e) { console.error("Erro ao renderizar equipamentos:", e); }

    let keysMoeda = [kMoedaAd, kMoedaAc];
    keysMoeda.forEach(renderSlotStack);
    let nomesDosItens = Object.keys(window.inventario).filter(n => keysMoeda.indexOf(n) === -1);
    nomesDosItens.forEach(nome => { renderSlotStack(nome); });
}

function _jewelSubTipoFromEquip(equip: InventoryBagEquip | null | undefined): string {
    if (!equip) return '';
    const sub = window.InventoryManager.resolveEquipSubTipo(equip);
    return (sub === 'neck' || sub === 'ear' || sub === 'ring') ? sub : '';
}

function _profileSlotMatchesJewelSubTipo(profileSlot: string, subTipo: string): boolean {
    if (subTipo === 'ear') return profileSlot === 'ear1' || profileSlot === 'ear2';
    if (subTipo === 'ring') return profileSlot === 'ring1' || profileSlot === 'ring2';
    return false;
}

function _labelEquipProfileJewelSlot(profileSlot: string): string {
    const keys: Record<string, string> = {
        ear1: 'game.inventoryUi.equipEarLeft',
        ear2: 'game.inventoryUi.equipEarRight',
        ring1: 'game.inventoryUi.equipRingLeft',
        ring2: 'game.inventoryUi.equipRingRight'
    };
    const fallbacks: Record<string, string> = {
        ear1: 'EQUIP — LEFT EAR',
        ear2: 'EQUIP — RIGHT EAR',
        ring1: 'EQUIP — LEFT RING',
        ring2: 'EQUIP — RIGHT RING'
    };
    const key = keys[profileSlot];
    if (key && typeof window.t === 'function') return window.t(key);
    return fallbacks[profileSlot] || ((typeof window.t === 'function') ? window.t('game.inventoryUi.equip') : 'EQUIP');
}

function _isDualSideJewelSubTipo(subTipo: string): boolean {
    return subTipo === 'ear' || subTipo === 'ring';
}

function _limparBotoesAcaoExtra(): void {
    var container = document.getElementById('btn-acao-item');
    if (!container || !container.parentElement) return;
    container.parentElement.querySelectorAll('.btn-acao-extra').forEach(function (btn) {
        btn.remove();
    });
}

function _configurarBotoesEquipJoiaLado(indexBolsa: number, subTipo: string): void {
    var btnAcao = document.getElementById('btn-acao-item');
    if (!btnAcao || !btnAcao.parentElement) return;
    _limparBotoesAcaoExtra();
    btnAcao.style.display = 'none';
    btnAcao.onclick = null;

    var isEar = subTipo === 'ear';
    var slots = isEar ? ['ear1', 'ear2'] : ['ring1', 'ring2'];
    var labelKeys = isEar
        ? ['game.inventoryUi.equipEarLeft', 'game.inventoryUi.equipEarRight']
        : ['game.inventoryUi.equipRingLeft', 'game.inventoryUi.equipRingRight'];
    var fallbacks = isEar
        ? ['EQUIP — LEFT EAR', 'EQUIP — RIGHT EAR']
        : ['EQUIP — LEFT RING', 'EQUIP — RIGHT RING'];

    slots.forEach(function (slotId, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-l2 btn-acao-extra btn-jewel-side';
        btn.style.background = '#15803d';
        btn.innerText = (typeof window.t === 'function') ? window.t(labelKeys[i]) : fallbacks[i];
        btn.onclick = function () {
            btn.onclick = null;
            equiparDaBolsa(indexBolsa, slotId);
        };
        btnAcao.parentElement.insertBefore(btn, btnAcao);
    });
}

function _indicesJoiasNaBolsaPorSubTipo(subTipo: string): number[] {
    if (!Array.isArray(window.inventarioEquips)) return [];
    const out: number[] = [];
    window.inventarioEquips.forEach(function (equip, index) {
        if (_jewelSubTipoFromEquip(equip as InventoryBagEquip) === subTipo) out.push(index);
    });
    return out;
}

function abrirSeletorJoiaSlotPerfil(profileSlot: string): void {
    const map: Record<string, string> = { ear1: 'ear', ear2: 'ear', ring1: 'ring', ring2: 'ring' };
    var subTipo = map[profileSlot];
    if (!subTipo) return;

    var indices = _indicesJoiasNaBolsaPorSubTipo(subTipo);
    if (!indices.length) {
        if (typeof window.l2Alert === 'function') {
            window.l2Alert((typeof window.t === 'function')
                ? window.t('game.inventoryUi.noJewelInBag')
                : 'No matching jewelry in your inventory.');
        }
        return;
    }

    if (indices.length === 1) {
        abrirAcaoInventario(indices[0], profileSlot);
        return;
    }

    window.abrirModal('janela-item-acao', 2100);
    const tituloEl = document.getElementById('acao-titulo');
    const desc = document.getElementById('acao-desc');
    const btnAcao = document.getElementById('btn-acao-item') as HTMLButtonElement | null;
    if (tituloEl) {
        tituloEl.innerText = (typeof window.t === 'function')
            ? window.t('game.inventoryUi.selectJewelTitle')
            : 'SELECT JEWELRY';
    }
    const acaoImg = document.getElementById('acao-img') as HTMLImageElement | null;
    if (acaoImg) acaoImg.src = '';
    if (!desc || !btnAcao) return;
    var hint = (typeof window.t === 'function')
        ? window.t('game.inventoryUi.equipSideHint')
        : 'Choose an item, then left or right slot.';
    var html = '<p class="jewel-pick-hint">' + hint + '</p><div class="jewel-pick-grid">';
    indices.forEach(function (idx) {
        var equip = window.inventarioEquips[idx] as InventoryBagEquip | undefined;
        if (!equip) return;
        var itemBase = (equip.base ? equip.base : equip) as ItemCatalogBase;
        var img = itemBase.img || '';
        var nome = itemBase.nome || '';
        var enc = _invNum(equip.enchantJewel ?? equip.enchant);
        var encLbl = enc > 0 ? ('+' + enc + ' ') : '';
        html += '<button type="button" class="jewel-pick-row btn-l2" data-idx="' + idx + '">'
            + '<img src="' + img + '" alt="" class="jewel-pick-row__img">'
            + '<span>' + encLbl + nome + '</span></button>';
    });
    html += '</div>';
    desc.innerHTML = html;
    desc.style.width = '100%';

    btnAcao.style.display = 'none';
    btnAcao.onclick = null;
    _limparBotoesAcaoExtra();

    desc.querySelectorAll('.jewel-pick-row').forEach(function (row) {
        const rowEl = row as HTMLElement;
        rowEl.onclick = function () {
            var pick = parseInt(rowEl.getAttribute('data-idx') || '', 10);
            if (!Number.isFinite(pick)) return;
            abrirAcaoInventario(pick, profileSlot);
        };
    });
}

function fecharJanelaAcao(): void {
    var btnAcao = document.getElementById('btn-acao-item');
    if (btnAcao) {
        btnAcao.onclick = null;
        btnAcao.style.display = 'block';
    }
    _limparBotoesAcaoExtra();
    try {
        const acImg = document.getElementById('acao-img');
        if (acImg) acImg.classList.remove('l2-coin-modal');
        const imgSlotEl = document.getElementById('acao-img-slot');
        if (imgSlotEl) imgSlotEl.classList.remove('l2-currency-modal-slot');
    } catch (e) { /* noop */ }

    let container = document.getElementById('btn-acao-item')?.parentElement;
    if (!container) return;
    let botoes = container.querySelectorAll('.btn-l2');
    botoes.forEach(btn => {
        if (btn.id !== 'btn-acao-item' && !btn.classList.contains('btn-acao-close')) {
            btn.remove();
        }
    });

    if (typeof window.fecharModal === 'function') window.fecharModal('janela-item-acao');
    else {
        document.getElementById('janela-item-acao').style.display = 'none';
        if (typeof window.toggleModalBackdrop === 'function') window.toggleModalBackdrop('janela-item-acao', false);
    }
}

window.abrirJanelaBloqueioGrade = function(item: unknown, nivelMinimo: number, gradeNormalizada?: string): void {
    const janela = document.getElementById('janela-bloqueio-grade');
    const desc = document.getElementById('bloqueio-grade-desc');
    const titulo = document.getElementById('bloqueio-grade-titulo');
    if (!janela || !desc || !titulo) {
        if (typeof window.mostrarAviso === 'function') window.mostrarAviso(typeof window.t === 'function' ? window.t('game.inventory.needLevelToEquip', { level: nivelMinimo }) : `You need level ${nivelMinimo} to equip this item.`);
        return;
    }

    const itemRec = item as Record<string, unknown> | null | undefined;
    const itemBaseRec = itemRec?.base as Record<string, unknown> | undefined;
    const nomeItem = String(itemRec?.nome || itemBaseRec?.nome || 'Item');
    const grade = gradeNormalizada || String(itemRec?.grade || 'No-Grade');
    const nivelAtual = typeof window.nivel !== 'undefined' ? window.nivel : 1;

    titulo.innerHTML = (typeof window.t === 'function') ? window.t('game.inventoryUi.reqTitle') : 'Equipment requirement';
    desc.innerHTML = `
        <div style="font-size:13px; color:#e5e7eb; margin-bottom:8px;"><b style="color:#fde047;">${nomeItem}</b></div>
        <div style="font-size:12px; color:#cbd5e1;">${(typeof window.t === 'function') ? window.t('game.inventoryUi.gradeLabel') : 'Grade:'} ${(typeof window.buildGradeTagHtml === 'function') ? window.buildGradeTagHtml(grade) : ('<b>[' + grade + ']</b>')}</div>
        <div style="font-size:12px; color:#fca5a5; margin-top:6px;">${(typeof window.t === 'function') ? window.t('game.inventoryUi.requiredLevel') : 'Required level:'} <b>${nivelMinimo}</b></div>
        <div style="font-size:12px; color:#93c5fd; margin-top:4px;">${(typeof window.t === 'function') ? window.t('game.inventoryUi.yourLevel') : 'Your level:'} <b>${nivelAtual}</b></div>
    `;
    window.abrirModal('janela-bloqueio-grade', 2000);
};

window.fecharJanelaBloqueioGrade = function(): void {
    window.fecharModal('janela-bloqueio-grade');
};

// ======================================================
// LEITOR UNIVERSAL DE STATUS E FERRAMENTAS
// ======================================================
function formatarTooltipEquipamento(
    base: ItemCatalogBase,
    lvlEncante: number,
    isAugment: boolean,
    tipoOriginal: string,
    itemCompleto: InventoryBagEquip | null = null
): string {
    let corGrade = (typeof window.getGradeColor === 'function') ? window.getGradeColor(base.grade) : '#b5b3ae';
    let titulo = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="color:white; font-size:1.15em; text-shadow: 1px 1px 2px #000;">${lvlEncante > 0 ? '+'+lvlEncante+' ' : ''}${base.nome}</b>
            <span style="color:${corGrade}; font-size:0.75em; font-weight:bold; border: 1px solid ${corGrade}; padding: 2px 5px; border-radius: 4px; background: rgba(0,0,0,0.5);">[${base.grade}]</span>
        </div>`;
    let divisor = `<hr style="border: 0; height: 1px; background: linear-gradient(to right, transparent, #555, transparent); margin: 8px 0;">`;
    let detalhes = `<div style="text-align: left; padding: 6px; width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.3); border-radius: 5px; border: 1px solid #333;">`;
    const addLinha = (label: string, val: string | number, color: string) =>
        `<div style="display:flex; justify-content:space-between; font-size: 0.85em; margin-bottom: 4px;"><span style="color: #888;">${label}</span> <span style="color: ${color}; font-weight:bold;">${val}</span></div>`;

    let tipo = 'misc';
    if (['neck', 'ear', 'ring', 'jewel', 'ear1', 'ear2', 'ring1', 'ring2'].includes(tipoOriginal)) tipo = 'jewel';
    else if (['Heavy', 'Light', 'Robe', 'armor'].includes(tipoOriginal)) tipo = 'armor';
    else if (['Sword', 'Dagger', 'Bow', 'Fist', 'Mace', 'Magic Sword', 'weapon'].includes(tipoOriginal)) tipo = 'weapon';

    let basePAtk = _invNum(base.atk ?? base.pAtk);
    let baseMAtk = _invNum(base.matk ?? base.mAtk);
    let basePDef = _invNum(base.def ?? base.pDef);
    let baseMDef = _invNum(base.mDef);

    let linhaReqNivel = '';
    if (typeof window.validarEquipPorGrade === 'function') {
        const gradeProbe = { base, uid: itemCompleto?.uid || '', tipo: tipoOriginal, enchant: lvlEncante } as EquipInstance;
        let vReq = window.validarEquipPorGrade(gradeProbe);
        let corReq = vReq.permitido ? '#22c55e' : '#ef4444';
        let txtReq = vReq.permitido ? 'Liberado' : 'Bloqueado';
        linhaReqNivel = `<div style="margin-bottom:6px; text-align:center; font-size:0.82em; color:${corReq}; border:1px solid ${corReq}; border-radius:4px; padding:4px 6px; background:rgba(0,0,0,0.35);">Requires Level ${vReq.nivelMinimo} <span style="color:#94a3b8;">(Your level: ${vReq.nivelAtual})</span> - <b>${txtReq}</b></div>`;
    }

    if (linhaReqNivel) detalhes += linhaReqNivel;

    if (tipo === 'weapon') {
        let bonusPAtk = Math.floor(basePAtk * 0.10 * lvlEncante);
        let totalPAtk = basePAtk + bonusPAtk + (isAugment ? _invNum(base.augPAtk) : 0);
        detalhes += `<div style="display:flex; justify-content:space-between; margin-bottom: 8px; border-bottom: 1px solid #444; padding-bottom: 4px;"><span style="color:#ccc; font-weight:bold;">P. Atk (Total):</span> <b style="color:#ef4444; font-size:1.2em; text-shadow: 1px 1px 0 #000;">${totalPAtk}</b></div>`;
        if(basePAtk > 0) detalhes += addLinha('➥ Base P. Atk:', basePAtk, '#aaa');
        if(baseMAtk > 0) detalhes += addLinha('➥ Base M. Atk:', baseMAtk, '#3b82f6');
        if(lvlEncante > 0) detalhes += addLinha(`➥ Encante (+${lvlEncante}):`, `+${bonusPAtk}`, '#3b82f6');
    } else if (tipo === 'armor') {
        let bonusPDef = Math.floor(basePDef * 0.10 * lvlEncante);
        let totalPDef = basePDef + bonusPDef;
        detalhes += `<div style="display:flex; justify-content:space-between; margin-bottom: 8px; border-bottom: 1px solid #444; padding-bottom: 4px;"><span style="color:#ccc; font-weight:bold;">P. Def (Total):</span> <b style="color:#fde047; font-size:1.2em; text-shadow: 1px 1px 0 #000;">${totalPDef}</b></div>`;
        if(base.tipo) detalhes += addLinha('➥ Armor Type:', base.tipo, '#10b981');
        if(basePDef > 0) detalhes += addLinha('➥ Base P. Def:', basePDef, '#aaa');
        if(lvlEncante > 0) detalhes += addLinha(`➥ Encante (+${lvlEncante}):`, `+${bonusPDef}`, '#3b82f6');
    } else if (tipo === 'jewel') {
        let bonusMDef = Math.floor(baseMDef * 0.10 * lvlEncante);
        let totalMDef = baseMDef + bonusMDef;
        detalhes += `<div style="display:flex; justify-content:space-between; margin-bottom: 8px; border-bottom: 1px solid #444; padding-bottom: 4px;"><span style="color:#ccc; font-weight:bold;">M. Def (Total):</span> <b style="color:#a855f7; font-size:1.2em; text-shadow: 1px 1px 0 #000;">${totalMDef}</b></div>`;
        if(baseMDef > 0) detalhes += addLinha('➥ Base M. Def:', baseMDef, '#aaa');
        if(lvlEncante > 0) detalhes += addLinha(`➥ Encante (+${lvlEncante}):`, `+${bonusMDef}`, '#3b82f6');
    }

    let dicStatus = [
        { k: 'pAtk', lbl: '↳ Extra P.Atk:', cor: '#ef4444', pfx: '+' },
        { k: 'mAtk', lbl: '↳ Extra M.Atk:', cor: '#3b82f6', pfx: '+' },
        { k: 'bonusHp', lbl: '↳ Max HP:', cor: '#10b981', pfx: '+' },
        { k: 'bonusMp', lbl: '↳ Max MP:', cor: '#3b82f6', pfx: '+' },
        { k: 'bonusSpd', lbl: '↳ Atk. Speed:', cor: '#fcd34d', pfx: 'Fast +' },
        { k: 'bonusCrit', lbl: '↳ Crit Rate:', cor: '#ef4444', pfx: '+', sfx: '%' },
        { k: 'bonusMDef', lbl: '↳ Extra M.Def:', cor: '#a855f7', pfx: '+' }
    ];

    let htmlBonusExtra = '';
    dicStatus.forEach(st => {
        const statVal = _invNum(base[st.k]);
        if (statVal > 0) {
            if ((st.k === 'pAtk' || st.k === 'atk') && tipo === 'weapon') return;
            if ((st.k === 'mAtk' || st.k === 'matk') && tipo === 'weapon') return;
            if (st.k === 'bonusMDef' && tipo === 'jewel') return; 
            htmlBonusExtra += addLinha(st.lbl, `${st.pfx || ''}${statVal}${st.sfx || ''}`, st.cor);
        }
    });

    if (htmlBonusExtra !== '') {
        let tituloBonus = tipo === 'weapon' ? 'SPECIAL ABILITY' : (tipo === 'jewel' ? 'EPIC POWER / BÔNUS' : 'EQUIPMENT BÔNUS');
        let corTitulo = tipo === 'weapon' ? '#eab308' : (tipo === 'jewel' ? '#f87171' : '#aaa');
        detalhes += `<div style="margin-top: 8px; padding-top: 5px; border-top: 1px dashed #666;">`;
        detalhes += `<div style="text-align:center; color:${corTitulo}; font-size: 0.8em; margin-bottom:6px; font-weight:bold;">${tituloBonus}</div>`;
        detalhes += htmlBonusExtra;
        detalhes += `</div>`;
    }

    if (isAugment) {
        let augLvl = _invNum(base.augLevel) || 1; let coresLvl = ['#aaa', '#10b981', '#3b82f6', '#ef4444', '#facc15']; let corAug = coresLvl[augLvl - 1] || '#a855f7'; let txtLvl = augLvl === 5 ? 'MAX' : `LVL ${augLvl}`;
        detalhes += `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed ${corAug}; background: rgba(0,0,0,0.2); border-radius: 4px; padding: 5px;">`;
        detalhes += `<div style="text-align:center; color:${corAug}; font-weight:bold; margin-bottom:6px; text-shadow: 0 0 5px ${corAug}; letter-spacing: 1px;">✦ AUGMENT ${txtLvl} ✦</div>`;
        let dicAug = [
            { k: 'augPAtk', lbl: '↳ P. Atk:', cor: corAug, pfx: '+' }, { k: 'augMAtk', lbl: '↳ M. Atk:', cor: corAug, pfx: '+' },
            { k: 'augPDef', lbl: '↳ P. Def:', cor: corAug, pfx: '+' }, { k: 'augMDef', lbl: '↳ M. Def:', cor: corAug, pfx: '+' },
            { k: 'augSpd', lbl: '↳ Atk. Speed:', cor: corAug, pfx: 'Fast +' }, { k: 'augCrit', lbl: '↳ Crit Rate:', cor: corAug, pfx: '+', sfx: '%' }
        ];
        dicAug.forEach(st => { const augVal = _invNum(base[st.k]); if (augVal) detalhes += addLinha(st.lbl, `${st.pfx || ''}${augVal}${st.sfx || ''}`, st.cor); });
        detalhes += `</div>`;
    }

    if (base.desc) detalhes += `<div style="color:#d4c4a8; font-size:0.75em; font-style:italic; margin-top:8px; border-top:1px dashed #444; padding-top:6px; text-align:center;">"${base.desc}"</div>`;
    // Informações de Segurança (RG do Item) no Rodapé
    if (itemCompleto && itemCompleto.uid) {
        detalhes += `<div style="margin-top: 10px; padding-top: 6px; border-top: 1px solid #333; font-family: monospace; font-size: 7px; color: #555; text-align: center; letter-spacing: 0.5px;">`;
        detalhes += `OWNER: ${itemCompleto.owner || 'UNKNOWN'} | RG: ${itemCompleto.uid}`;
        detalhes += `</div>`;
    }

    detalhes += `</div>`;
    return titulo + divisor + detalhes;
}

function abrirAcaoInventario(index: number, slotPerfilPref?: string): void {
    const equip = window.inventarioEquips[index] as InventoryBagEquip | undefined;
    if (!equip) return;
    const itemBase = (equip.base ? equip.base : equip) as ItemCatalogBase;
    const tipoBruto = window.InventoryManager.resolveEquipSubTipo(equip)
        || String(equip.tipo || itemBase.tipoItem || itemBase.tipo || 'misc');
    var btnReset = document.getElementById('btn-acao-item');
    if (btnReset) {
        _limparBotoesAcaoExtra();
        btnReset.style.display = 'block';
    }
    
    let nivelEnchant = 0;
    if (['weapon', 'Sword', 'Dagger', 'Bow', 'Fist', 'Mace', 'Magic Sword'].includes(tipoBruto)) {
        nivelEnchant = _invNum(equip.enchant ?? itemBase.enchant);
    } else if (['neck', 'ear', 'ring', 'jewel', 'ear1', 'ear2', 'ring1', 'ring2'].includes(tipoBruto)) {
        nivelEnchant = _invNum(equip.enchantJewel ?? itemBase.enchantJewel ?? equip.enchant ?? itemBase.enchant);
    } else {
        nivelEnchant = _invNum(equip.enchantArmor ?? itemBase.enchantArmor ?? equip.enchant ?? itemBase.enchant);
    }

    const isAugment = !!(equip.augmented || itemBase.augmented);

    window.abrirModal('janela-item-acao', 2100);
    const tituloEl = document.getElementById('acao-titulo');
    const imgEl = document.getElementById('acao-img') as HTMLImageElement | null;
    if (tituloEl) tituloEl.innerText = (typeof window.t === 'function') ? window.t('game.inventoryUi.itemInfoTitle') : 'ITEM INFO';
    if (imgEl && itemBase.img) imgEl.src = itemBase.img;

    const info = formatarTooltipEquipamento(itemBase, nivelEnchant, isAugment, tipoBruto, equip);
    const descContainer = document.getElementById('acao-desc');
    if (!descContainer) return;
    descContainer.innerHTML = info;
    descContainer.style.width = '100%';

    const btnAcao = document.getElementById('btn-acao-item') as HTMLButtonElement | null;
    if (!btnAcao) return;
    btnAcao.style.display = 'block';

    const vGr: GradeEquipValidation = typeof window.validarEquipPorGrade === 'function'
        ? window.validarEquipPorGrade(equip)
        : { permitido: true, nivelMinimo: 0, nivelAtual: window.nivel || 1, grade: '' };
    if (!vGr.permitido) {
        btnAcao.style.display = 'block';
        btnAcao.innerText = (typeof window.t === 'function')
            ? window.t('game.inventoryUi.equipBlockedButton', { level: vGr.nivelMinimo })
            : ('Lvl ' + vGr.nivelMinimo + ' required');
        btnAcao.style.background = '#64748b';
        btnAcao.disabled = false;
        btnAcao.onclick = function() {
            btnAcao.onclick = null;
            if (typeof window.fecharJanelaAcao === 'function') window.fecharJanelaAcao();
            const forModal = itemBase;
            if (typeof window.abrirJanelaBloqueioGrade === 'function') window.abrirJanelaBloqueioGrade(forModal, vGr.nivelMinimo, vGr.grade);
        };
    } else if (_isDualSideJewelSubTipo(tipoBruto)) {
        var hintSide = (typeof window.t === 'function')
            ? window.t('game.inventoryUi.equipSideHint')
            : 'Choose left or right slot.';
        descContainer.innerHTML = '<p class="jewel-pick-hint">' + hintSide + '</p>' + info;
        if (slotPerfilPref && _profileSlotMatchesJewelSubTipo(slotPerfilPref, tipoBruto)) {
            btnAcao.style.display = 'block';
            btnAcao.innerText = _labelEquipProfileJewelSlot(slotPerfilPref);
            btnAcao.style.background = '#15803d';
            btnAcao.disabled = false;
            btnAcao.onclick = function () {
                btnAcao.onclick = null;
                equiparDaBolsa(index, slotPerfilPref);
            };
        } else {
            _configurarBotoesEquipJoiaLado(index, tipoBruto);
        }
    } else {
        btnAcao.style.display = 'block';
        btnAcao.innerText = (typeof window.t === 'function') ? window.t('game.inventoryUi.equip') : 'EQUIP';
        btnAcao.style.background = "#15803d";
        btnAcao.disabled = false;
        btnAcao.onclick = function() { btnAcao.onclick = null; equiparDaBolsa(index); };
    }

    // Botão para colocar no atalho (Adicionado para Equipamentos)
    let btnAtalho = document.createElement('button');
    btnAtalho.className = 'btn-l2 btn-acao-extra';
    btnAtalho.innerText = (typeof window.t === 'function') ? window.t('game.smartbar.pinToShortcut') : 'ASSIGN TO SHORTCUT';
    btnAtalho.style.background = "#ca8a04";
    btnAtalho.style.marginTop = "8px";
    btnAtalho.onclick = function() {
        window.fecharJanelaAcao();
        window.abrirSeletorAtalhoGlobal(itemBase.nome || '', (slotIdx: number) => {
            window.barraAtalhos[slotIdx] = itemBase.nome || '';
            const logLine = (typeof window.t === 'function')
                ? window.t('game.smartbar.itemPinnedToSlot', { item: itemBase.nome, slot: slotIdx + 1 })
                : (`${itemBase.nome} pinned to slot ${slotIdx + 1}!`);
            window.escreverLog(`<span style="color:#10b981;">${logLine}</span>`);
            window.renderizarBarraAtalhos();
            if (typeof window.salvarJogo === 'function') window.salvarJogo();
        });
    };
    const btnParent = document.getElementById('btn-acao-item')?.parentElement;
    if (btnParent) btnParent.insertBefore(btnAtalho, document.getElementById('btn-acao-item')?.nextSibling ?? null);
}

function abrirAcaoPerfil(tipo: string): void {
    let fullItem: InventoryBagEquip | null = null;
    let enc = 0;
    let aug = false;
    let tipoBruto = '';

    if (tipo === 'weapon') {
        fullItem = window.armaEquipadaBase as InventoryBagEquip | null;
        enc = fullItem?.enchant || window.enchant || 0;
        aug = !!(fullItem?.augmented || window.isAugmented);
        tipoBruto = 'weapon';
    } else if (tipo === 'armor') {
        fullItem = window.armaduraEquipada as InventoryBagEquip | null;
        enc = fullItem?.enchant || window.enchantArmor || 0;
        tipoBruto = 'armor';
    } else if (tipo === 'neck') {
        fullItem = window.colarEquipado as InventoryBagEquip | null;
        enc = fullItem?.enchant || Number(fullItem?.enchantJewel) || 0;
        tipoBruto = 'neck';
    } else if (tipo === 'ear1') {
        fullItem = window.brincoEquipado1 as InventoryBagEquip | null;
        enc = fullItem?.enchant || Number(fullItem?.enchantJewel) || 0;
        tipoBruto = 'ear';
    } else if (tipo === 'ear2') {
        fullItem = window.brincoEquipado2 as InventoryBagEquip | null;
        enc = fullItem?.enchant || Number(fullItem?.enchantJewel) || 0;
        tipoBruto = 'ear';
    } else if (tipo === 'ring1') {
        fullItem = window.anelEquipado1 as InventoryBagEquip | null;
        enc = fullItem?.enchant || Number(fullItem?.enchantJewel) || 0;
        tipoBruto = 'ring';
    } else if (tipo === 'ring2') {
        fullItem = window.anelEquipado2 as InventoryBagEquip | null;
        enc = fullItem?.enchant || Number(fullItem?.enchantJewel) || 0;
        tipoBruto = 'ring';
    }

    if (tipo === 'weapon' && !fullItem) {
        if (typeof window.l2Alert === 'function') {
            window.l2Alert((typeof window.t === 'function') ? window.t('game.inventoryUi.bareHandsHint') : 'You have no weapon equipped. Open your inventory and equip one.');
        }
        return;
    }

    if (!fullItem && (tipo === 'ear1' || tipo === 'ear2' || tipo === 'ring1' || tipo === 'ring2')) {
        abrirSeletorJoiaSlotPerfil(tipo);
        return;
    }

    if (!fullItem) return;

    const itemBase = (fullItem.base || fullItem) as ItemCatalogBase;

    window.abrirModal('janela-item-acao', 2100);
    const tituloEl = document.getElementById('acao-titulo');
    const imgEl = document.getElementById('acao-img') as HTMLImageElement | null;
    if (tituloEl) tituloEl.innerText = (typeof window.t === 'function') ? window.t('game.inventoryUi.itemInfoTitle') : 'ITEM INFO';
    if (imgEl && itemBase.img) imgEl.src = itemBase.img;

    const info = formatarTooltipEquipamento(itemBase, enc, aug, tipoBruto, fullItem);
    const descContainer = document.getElementById('acao-desc');
    if (!descContainer) return;
    descContainer.innerHTML = info;
    descContainer.style.width = '100%';
    const btnAcao = document.getElementById('btn-acao-item') as HTMLButtonElement | null;
    if (!btnAcao) return;
    _limparBotoesAcaoExtra();
    btnAcao.innerText = (typeof window.t === 'function') ? window.t('game.inventoryUi.unequip') : 'UNEQUIP';
    btnAcao.style.background = '#b91d1d';
    btnAcao.style.display = 'block';
    btnAcao.onclick = function() {
        btnAcao.onclick = null;
        window.InventoryManager.desequiparGarantido(tipo);
        window.fecharJanelaAcao();
    };

    // Botão para colocar no atalho (Adicionado para itens já equipados)
    let btnAtalho = document.createElement('button');
    btnAtalho.className = 'btn-l2 btn-acao-extra';
    btnAtalho.innerText = (typeof window.t === 'function') ? window.t('game.smartbar.pinToShortcut') : 'ASSIGN TO SHORTCUT';
    btnAtalho.style.background = "#ca8a04";
    btnAtalho.style.marginTop = "8px";
    btnAtalho.onclick = function() {
        window.fecharJanelaAcao();
        window.abrirSeletorAtalhoGlobal(itemBase.nome || '', (slotIdx: number) => {
            window.barraAtalhos[slotIdx] = itemBase.nome || '';
            const logLine = (typeof window.t === 'function')
                ? window.t('game.smartbar.itemPinnedToSlot', { item: itemBase.nome, slot: slotIdx + 1 })
                : (`${itemBase.nome} pinned to slot ${slotIdx + 1}!`);
            window.escreverLog(`<span style="color:#10b981;">${logLine}</span>`);
            window.renderizarBarraAtalhos();
            if (typeof window.salvarJogo === 'function') window.salvarJogo();
        });
    };
    const btnParent2 = document.getElementById('btn-acao-item')?.parentElement;
    if (btnParent2) btnParent2.insertBefore(btnAtalho, document.getElementById('btn-acao-item')?.nextSibling ?? null);
}

function equiparDaBolsa(index: number, slotAlvo?: string): void {
    const ok = window.InventoryManager.equiparGarantido(index, slotAlvo);
    if (!ok && typeof window.l2Alert === 'function') {
        window.l2Alert((typeof window.t === 'function')
            ? window.t('game.inventoryUi.equipFailed')
            : 'Could not equip this item.');
        return;
    }
    fecharJanelaAcao();
}

function desequiparItem(tipo: string): void {
    window.InventoryManager.desequiparGarantido(tipo);
    window.fecharJanelaAcao();
}

// ==========================================
// RENDERIZAÇÃO DO PERFIL E STATUS DETALHADO
// ==========================================

function _parseProfileEnchantBadge(val: unknown): number {
    if (val === undefined || val === null || val === '') return 0;
    var n = Number(val);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function _equipCatalogBase(item: InventoryBagEquip | EquipInstance | null | undefined): ItemCatalogBase {
    if (!item) return {};
    if ('base' in item && item.base) return item.base;
    return item as unknown as ItemCatalogBase;
}

function _resolvePaperdollItemImgSrc(item: InventoryBagEquip | EquipInstance | null | undefined): string {
    if (!item) return '';
    var b = _equipCatalogBase(item);
    var imgStr = b.img && String(b.img).trim();
    if (imgStr) return imgStr;
    if (b.id) return 'assets/equips/' + String(b.id) + '.png';
    return '';
}

function _buildPaperdollSlotFilledHtml(imgSrc: string, enchantLevel: unknown, itemTitle: string): string {
    var enc = _parseProfileEnchantBadge(enchantLevel);
    var badge = enc > 0
        ? '<span class="paperdoll-slot__enchant">+' + enc + '</span>'
        : '';
    var titleAttr = itemTitle
        ? ' title="' + String(itemTitle).replace(/"/g, '&quot;') + '"'
        : '';
    return '<img class="paperdoll-slot__img" src="' + imgSrc + '" alt=""' + titleAttr + '>' + badge;
}

function _buildPaperdollSlotEmptyHtml(glyph: string, label: string): string {
    return '<span class="paperdoll-slot__empty" aria-hidden="true">'
        + '<span class="paperdoll-slot__glyph">' + glyph + '</span>'
        + '<span class="paperdoll-slot__label">' + label + '</span>'
        + '</span>';
}

function _fillProfilePaperdollSlot(
    slotEl: HTMLElement | null,
    fullItem: InventoryBagEquip | EquipInstance | null | undefined,
    emptyGlyph: string,
    emptyLabel: string,
    fallbackImg: string
): void {
    if (!slotEl) return;
    if (fullItem) {
        var item = _equipCatalogBase(fullItem);
        var bagItem = fullItem as InventoryBagEquip;
        var encVal: unknown = fullItem.enchant;
        if (encVal === undefined || encVal === null || encVal === '') {
            encVal = bagItem.enchantJewel;
        }
        var imgSrc = _resolvePaperdollItemImgSrc(fullItem) || fallbackImg || 'assets/itens/item_generic.png';
        var nome = (item.nome || item.name) ? String(item.nome || item.name) : '';
        slotEl.innerHTML = _buildPaperdollSlotFilledHtml(imgSrc, encVal, nome);
        var im = slotEl.querySelector('.paperdoll-slot__img') as HTMLImageElement | null;
        if (im && fallbackImg) {
            im.onerror = function () {
                im!.onerror = null;
                im!.src = fallbackImg;
            };
        }
    } else {
        slotEl.innerHTML = _buildPaperdollSlotEmptyHtml(emptyGlyph, emptyLabel);
    }
}

function renderizarPerfil(): void {
    // Atualiza o título do perfil com o nome do personagem real
    const profileHeader = document.querySelector('#tela-perfil h4') as HTMLElement | null;
    const tInv = typeof window.t === 'function' ? window.t : null;
    const L = (k, fb) => {
        if (!tInv) return fb;
        const v = tInv(k);
        return (v && v !== k) ? v : fb;
    };
    if (profileHeader) {
        const tFn = typeof window.t === 'function' ? window.t : null;
        profileHeader.innerText = window.charName
            ? (tFn ? tFn('game.inventoryUi.profileWithName', { name: window.charName.toUpperCase() }) : `${window.charName.toUpperCase()} - PROFILE`)
            : (tFn ? tFn('game.inventoryUi.profileGeneric') : 'CHARACTER PROFILE');
    }

    var paperdollRoot = document.querySelector('.l2-paperdoll');
    if (paperdollRoot) {
        var ariaPd = L('game.inventoryUi.paperdollAria', 'Character equipment');
        if (ariaPd && ariaPd !== 'game.inventoryUi.paperdollAria') {
            paperdollRoot.setAttribute('aria-label', ariaPd);
        }
    }

    var weaponWrap = document.getElementById('profile-slot-weapon');
    if (weaponWrap) {
        _fillProfilePaperdollSlot(
            weaponWrap,
            typeof window.armaEquipadaBase !== 'undefined' ? window.armaEquipadaBase : null,
            '⚔️',
            L('game.inventoryUi.slotWeapon', 'WEAPON'),
            'assets/armas/wpn_ng_trainee_blade.png'
        );
        var slotWeapon = weaponWrap.querySelector('.paperdoll-slot__img');
        if (slotWeapon) {
            slotWeapon.id = 'slot-weapon';
            if (typeof window.isAugmented !== 'undefined' && window.isAugmented) slotWeapon.classList.add('augmented');
        }
    }

    // Chama o motor de visual (layers/sprites) oficial
    if (typeof window.atualizarVisualPaperdoll === 'function') {
        window.atualizarVisualPaperdoll();
    }

    _fillProfilePaperdollSlot(
        document.getElementById('slot-armor-perfil'),
        typeof window.armaduraEquipada !== 'undefined' ? window.armaduraEquipada : null,
        '🛡️',
        L('game.inventoryUi.slotArmor', 'ARMOR'),
        'assets/icons/wooden_armor.png'
    );

    var fallbackJoia = (typeof window.catalogJewelIconPath === 'function')
        ? window.catalogJewelIconPath('j_ng_ring')
        : 'assets/joias/j_ng_ring.png';
    _fillProfilePaperdollSlot(document.getElementById('slot-neck-perfil'), window.colarEquipado, '📿', L('game.inventoryUi.slotNeck', 'NECK'), fallbackJoia);
    _fillProfilePaperdollSlot(document.getElementById('slot-ear1-perfil'), window.brincoEquipado1, '💎', L('game.inventoryUi.slotEarL', 'EAR L'), fallbackJoia);
    _fillProfilePaperdollSlot(document.getElementById('slot-ear2-perfil'), window.brincoEquipado2, '💎', L('game.inventoryUi.slotEarR', 'EAR R'), fallbackJoia);
    _fillProfilePaperdollSlot(document.getElementById('slot-ring1-perfil'), window.anelEquipado1, '💍', L('game.inventoryUi.slotRingL', 'RING L'), fallbackJoia);
    _fillProfilePaperdollSlot(document.getElementById('slot-ring2-perfil'), window.anelEquipado2, '💍', L('game.inventoryUi.slotRingR', 'RING R'), fallbackJoia);

    try {
        if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
        if (typeof window.renderProfileStatsPreview === 'function') window.renderProfileStatsPreview();
    } catch (eRp) {}
    if (typeof window.syncProfileEquipmentSlotGlows === 'function') window.syncProfileEquipmentSlotGlows();
}

/** Display name for equipped instance (supports .base) */
window.nomeEquipDisplay = function (fullItem: EquipInstance | null | undefined): string {
    if (!fullItem) return '';
    try {
        var b = _equipCatalogBase(fullItem);
        return (b.nome || b.name) ? String(b.nome || b.name) : '';
    } catch (eN) {
        return '';
    }
};

/**
 * Big stat grid shown on profile & top of breakdown modal — always mirrors playerStats after calcularStatusGlobais.
 * @param {'profile'|'modal'} placement
 */
window.buildCombatStatsHeroBlockHtml = function (placement) {
    var ps = window.playerStats;
    if (!ps) return '';
    var tFn = typeof window.t === 'function' ? window.t : null;
    var label = function (sub, fb) {
        if (!tFn) return fb;
        var path = 'game.inventoryUi.profilePreview.stats.' + sub;
        try {
            var v = tFn(path);
            if (v && v !== path) return v;
        } catch (e) {}
        return fb;
    };
    var atkSec = (typeof ps.atkSpeed === 'number' ? ps.atkSpeed : 250) / 1000;
    var tiles = [
        { sub: 'hp', val: String(ps.maxHp), mod: 'combat-stats-hero__cell--hp' },
        { sub: 'mp', val: String(ps.maxMp), mod: 'combat-stats-hero__cell--mp' },
        { sub: 'cp', val: String(ps.maxCp), mod: 'combat-stats-hero__cell--cp' },
        { sub: 'pAtk', val: String(ps.pAtk), mod: 'combat-stats-hero__cell--patk' },
        { sub: 'mAtk', val: String(ps.mAtk), mod: 'combat-stats-hero__cell--matk' },
        { sub: 'pDef', val: String(ps.pDef), mod: 'combat-stats-hero__cell--pdef' },
        { sub: 'mDef', val: String(ps.mDef), mod: 'combat-stats-hero__cell--mdef' },
        { sub: 'crit', val: (typeof ps.critRate !== 'undefined' ? ps.critRate : 0) + '%', mod: 'combat-stats-hero__cell--crit' },
        { sub: 'atkSpd', val: atkSec.toFixed(2) + 's', mod: 'combat-stats-hero__cell--spd' }
    ];
    var extraClass = placement === 'profile' ? 'combat-stats-hero--profile' : 'combat-stats-hero--modal';
    var parts = [];
    parts.push('<div class="combat-stats-hero ' + extraClass + '" role="group">');
    parts.push('<div class="combat-stats-hero__grid">');
    for (var i = 0; i < tiles.length; i++) {
        var tm = tiles[i];
        parts.push(
            '<div class="combat-stats-hero__cell ' + tm.mod + '">'
            + '<span class="combat-stats-hero__lab">' + label(tm.sub, tm.sub) + '</span>'
            + '<span class="combat-stats-hero__val">' + tm.val + '</span>'
            + '</div>'
        );
    }
    parts.push('</div></div>');
    return parts.join('');
};

window.renderProfileStatsPreview = function () {
    var host = document.getElementById('profile-stats-preview');
    if (!host) return;
    var tFn = typeof window.t === 'function' ? window.t : null;
    try {
        if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
    } catch (eC) {}
    var headline = tFn ? tFn('game.inventoryUi.profilePreview.headline') : 'Your combat totals';
    if (!headline || headline === 'game.inventoryUi.profilePreview.headline') headline = 'Your combat totals';
    var badgeTxt = tFn ? tFn('game.inventoryUi.profilePreview.badge') : 'MATCHES HUD';
    if (!badgeTxt || badgeTxt === 'game.inventoryUi.profilePreview.badge') badgeTxt = 'MATCHES HUD';
    var trust = tFn ? tFn('game.inventoryUi.profilePreview.sameAsHud') : '';
    var aria = tFn ? tFn('game.inventoryUi.profilePreview.ariaLabel') : 'Live combat statistics';
    if (!aria || aria === 'game.inventoryUi.profilePreview.ariaLabel') aria = 'Live combat statistics';
    host.setAttribute('aria-label', aria);
    var hero = typeof window.buildCombatStatsHeroBlockHtml === 'function' ? window.buildCombatStatsHeroBlockHtml('profile') : '';
    host.innerHTML = ''
        + '<div class="profile-stats-preview__head">'
        + '<span class="profile-stats-preview__title">' + escapeStatHtml(headline) + '</span>'
        + '<span class="profile-stats-preview__badge">' + escapeStatHtml(badgeTxt) + '</span>'
        + '</div>'
        + hero
        + (trust && trust !== 'game.inventoryUi.profilePreview.sameAsHud'
            ? '<p class="profile-stats-preview__trust">' + escapeStatHtml(trust) + '</p>'
            : '<p class="profile-stats-preview__trust">' + escapeStatHtml('These are the values used on your status bars and in battle. They update when you change gear, level up, or receive buffs.') + '</p>');
    try {
        if (typeof window.I18n !== 'undefined' && window.I18n.refreshDom) window.I18n.refreshDom(host);
    } catch (eR) {}
};

/** Plain-text escape for user-facing names rendered into HTML snippets */
function escapeStatHtml(text) {
    return String(text == null ? '' : text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

/**
 * Detailed status modal — dados espelham window.playerStatBreakdown (core_stats.js).
 */
window.renderPainelStatsDetalhado = function (): void {
    var root = document.getElementById('stat-detail-root');
    var b = window.playerStatBreakdown as PlayerStatBreakdown | undefined;
    if (!root) return;
    if (!b || !window.playerStats) {
        root.innerHTML = '';
        return;
    }
    var L: (sub: string, fb: string, params?: Record<string, string | number>) => string = function (sub, fb, params) {
        try {
            if (typeof window.t === 'function') {
                var v = window.t('game.inventoryUi.detail.' + sub, params || {});
                if (v && v !== ('game.inventoryUi.detail.' + sub)) return v;
            }
        } catch (eL) { /* noop */ }
        return fb;
    };
    function rowFb(labelHtml: string, val: string | number): string {
        return '<div class="status-detail__row"><span>' + labelHtml + '</span><b>' + val + '</b></div>';
    }
    function rowKey(subKey: string, fb: string, val: string | number, params?: Record<string, string | number>): string {
        var lab = L(subKey, fb, params);
        return rowFb(lab, val);
    }

    function slotLabel(code: string): string {
        var km = {
            neck: 'game.inventoryUi.slotNeck',
            ear1: 'game.inventoryUi.slotEarL',
            ear2: 'game.inventoryUi.slotEarR',
            ring1: 'game.inventoryUi.slotRingL',
            ring2: 'game.inventoryUi.slotRingR'
        };
        try {
            if (typeof window.t === 'function' && km[code]) return window.t(km[code]);
        } catch (eS) {}
        return code || '';
    }

    function jewelAbbr(stId: string): string {
        return L('abbr_' + stId, String(stId), {});
    }

    var clsDisp = String(b.charClass || '').replace(/_/g, ' ');
    var pctArm = Math.round(b.armorEnchant * 10);
    var pctWpn = Math.round(b.weaponEnchant * 10);
    var castleAtkPct = Math.round(Math.max(0, (b.castle.pAtk - 1) * 1000) / 10) / 10;

    function wrapDetails(openCls: boolean, summaryHtml: string, innerParts: string[]): string {
        var openAttr = openCls ? ' open' : '';
        var innerHtml = innerParts.join('');
        return '<details class="status-detail-acc"' + openAttr + '>'
            + '<summary class="status-detail-acc__summary">' + summaryHtml + '</summary>'
            + '<div class="status-detail-acc__body">'
            + '<div class="status-detail-acc__scroll" tabindex="-1">' + innerHtml + '</div>'
            + '</div></details>';
    }

    var atkMultExplain = '(×class ' + (b.classMod.atk || 1).toFixed(2)
        + ' ×blessing P.Atk ' + b.buffs.pAtkMult.toFixed(2)
        + ' ×clan ' + b.clan.pAtk.toFixed(3)
        + ' ×castle ' + b.castle.pAtk.toFixed(3) + ')';
    var matMultExplain = '(×class ' + (b.classMod.atk || 1).toFixed(2)
        + ' ×blessing M.Atk ' + b.buffs.mAtkMult.toFixed(2)
        + ' ×clan ' + b.clan.mAtk.toFixed(3)
        + ' ×castle ' + b.castle.mAtk.toFixed(3) + ')';
    var defMultExplain = '(×class ' + (b.classMod.def || 1).toFixed(2)
        + ' ×blessing P.Def ' + b.buffs.pDefMult.toFixed(2)
        + ' ×clan ' + b.clan.pDef.toFixed(3)
        + ' ×castle ' + b.castle.pDef.toFixed(3) + ')';
    var mdefMultExplain = '(×class ' + (b.classMod.def || 1).toFixed(2)
        + ' ×blessing M.Def ' + b.buffs.mDefMult.toFixed(2)
        + ' ×castle ' + b.castle.mDef.toFixed(3) + ')';

    var h = [];

    if (typeof window.buildCombatStatsHeroBlockHtml === 'function') {
        h.push(window.buildCombatStatsHeroBlockHtml('modal'));
    }

    h.push('<div class="status-detail__intro">');
    h.push('<p class="status-detail__trust">' + escapeStatHtml(L('hudTrustLine', 'The totals at the top are the same ones the game uses in combat.')) + '</p>');
    var lineageFb = b.charRace + ' · Lv.' + b.nivel + ' · ' + clsDisp;
    var lineage = L('subtitle', lineageFb, { race: b.charRace, level: String(b.nivel), cls: clsDisp });
    h.push('<div class="status-detail__lineage">' + escapeStatHtml(lineage) + '</div>');
    if (pctArm !== 0 || pctWpn !== 0 || b.armorEnchant || b.weaponEnchant) {
        h.push('<div class="status-detail__pill">' + escapeStatHtml(L(
            'enchSummary',
            'Armor affix strength +{armPct}% · weapon +{wpnPct}% · enchant ranks: armor +{armLv} · weapon +{wpnLv}',
            { armPct: String(pctArm), wpnPct: String(pctWpn), armLv: String(b.armorEnchant), wpnLv: String(b.weaponEnchant) }
        )) + '</div>');
    }
    h.push('</div>');

    if (b.buffs.fighter || b.buffs.mage) {
        h.push('<div class="status-detail__pill status-detail__pill--buff">'
            + escapeStatHtml((b.buffs.mage ? L('pillMageBuffLine', 'Grand Master mystic blessing active — stronger spells and tougher against magic.')
                : L('pillFighterBuffLine', 'Grand Master fighter blessing active — melee-focused bonuses.')))
            + '</div>');
    }

    var wpnName = window.nomeEquipDisplay ? window.nomeEquipDisplay(window.armaEquipadaBase) : '';
    var armName = window.nomeEquipDisplay ? window.nomeEquipDisplay(window.armaduraEquipada) : '';
    var gearInner = [];
    gearInner.push('<div class="status-detail__gear-head">');
    gearInner.push('<span class="status-detail__gear-slot"><b>' + escapeStatHtml(L('lblGearWeapon', 'Weapon')) + '</b> — '
        + escapeStatHtml(wpnName || L('lblNoEquip', '(none)')) + '</span>');
    gearInner.push('<span class="status-detail__gear-slot"><b>' + escapeStatHtml(L('lblGearArmor', 'Armor')) + '</b> — '
        + escapeStatHtml(armName || L('lblNoEquip', '(none)')) + '</span>');
    gearInner.push('</div>');
    gearInner.push('<p class="status-detail__gear-hint">' + escapeStatHtml(L('gearBulletsLead', 'Equipped items — notable bonuses:', {})) + '</p>');

    if (wpnName && (b.pAtk.weaponEnchant || b.mAtk.weaponEnchantM)) {
        gearInner.push('<div class="status-detail__bullets">');
        if (b.pAtk.weaponEnchant) {
            gearInner.push('<div>' + escapeStatHtml(L('contribWpnEnchantPAtk', '+{n} P.Atk from weapon enchant level', { n: String(b.pAtk.weaponEnchant) })) + '</div>');
        }
        if (b.mAtk.weaponEnchantM) {
            gearInner.push('<div>' + escapeStatHtml(L('contribWpnEnchantMAtk', '+{n} M.Atk from weapon enchant level', { n: String(b.mAtk.weaponEnchantM) })) + '</div>');
        }
        gearInner.push('</div>');
    }

    if (b.hp.armor > 0) gearInner.push(rowKey('contribHpArmor', '+{n} HP from armor sheet', '+' + String(b.hp.armor), { n: String(b.hp.armor) }));
    if (b.hp.weapon > 0) gearInner.push(rowKey('contribHpWeapon', '+{n} HP from weapon bonuses', '+' + String(b.hp.weapon), { n: String(b.hp.weapon) }));
    if (b.mp.armor > 0) gearInner.push(rowKey('contribMpArmor', '+{n} MP from armor sheet', '+' + String(b.mp.armor), { n: String(b.mp.armor) }));
    if (b.mp.weapon > 0) gearInner.push(rowKey('contribMpWeapon', '+{n} MP from weapon bonuses', '+' + String(b.mp.weapon), { n: String(b.mp.weapon) }));
    if (b.pAtk.armorEquip > 0) gearInner.push(rowKey('contribArmorPAtk', '+{n} P.Atk from armor', '+' + String(b.pAtk.armorEquip), { n: String(b.pAtk.armorEquip) }));
    if (b.mAtk.armorEquip > 0) gearInner.push(rowKey('contribArmorMAtk', '+{n} M.Atk from armor', '+' + String(b.mAtk.armorEquip), { n: String(b.mAtk.armorEquip) }));
    if (b.pDef.armorPDef > 0) gearInner.push(rowKey('contribArmorPDef', '+{n} P.Def from armor', '+' + String(b.pDef.armorPDef), { n: String(b.pDef.armorPDef) }));
    if (b.mDef.armorBonusMDef > 0) {
        gearInner.push(rowKey('contribArmorMDefBonus',
            '+{n} magic defense from robe/armor bonus (scaled by armor enchant)',
            '+' + String(b.mDef.armorBonusMDef),
            { n: String(b.mDef.armorBonusMDef) }));
    }
    if (b.mDef.armorFlatMDef > 0) gearInner.push(rowKey('contribArmorMDefFlat', '+{n} magic defense from armor base stat', '+' + String(b.mDef.armorFlatMDef), { n: String(b.mDef.armorFlatMDef) }));
    if (b.hp.jewels > 0) gearInner.push(rowKey('contribJewelsHp', '+{n} HP from jewelry', '+' + String(b.hp.jewels), { n: String(b.hp.jewels) }));
    if (b.mp.jewels > 0) gearInner.push(rowKey('contribJewelsMp', '+{n} MP from jewelry', '+' + String(b.mp.jewels), { n: String(b.mp.jewels) }));
    if (b.pAtk.jewelsEquip > 0) gearInner.push(rowKey('contribJewelsPAtk', '+{n} P.Atk from jewelry', '+' + String(b.pAtk.jewelsEquip), { n: String(b.pAtk.jewelsEquip) }));
    if (b.mAtk.jewelsEquip > 0) gearInner.push(rowKey('contribJewelsMAtk', '+{n} M.Atk from jewelry', '+' + String(b.mAtk.jewelsEquip), { n: String(b.mAtk.jewelsEquip) }));
    if (b.mDef.jewelsFlat > 0) gearInner.push(rowKey('contribJewelsMDef', '+{n} magic defense from jewelry', '+' + String(b.mDef.jewelsFlat), { n: String(b.mDef.jewelsFlat) }));

    gearInner.push('<div class="status-detail__muted">' + escapeStatHtml(L('motorHintCompact', 'Robe armor usually raises M.Def through the armor «bonus M.Def» stat, boosted by armor enchant.')) + '</div>');

    h.push(wrapDetails(false,
        '<span class="status-detail-acc__ttl">' + L('gearSummaryTitle', 'Your gear — what it adds') + '</span>'
        + '<span class="status-detail-acc__chev" aria-hidden="true"></span>',
        gearInner));

    var vitParts = [];
    vitParts.push(rowKey('lblHpRaceBase', 'Race base HP', String(b.hp.raceBaseHp)));
    vitParts.push(rowKey('lblHpFromLevels', 'HP from levels', '+' + String(b.hp.hpPerLevels)));
    if (b.hp.augmentFromWeapon > 0) vitParts.push(rowKey('lblHpAugWeapon', '+ HP (weapon augment)', '+' + String(b.hp.augmentFromWeapon)));
    vitParts.push(rowKey('lblClassHpMult', 'Class HP multiplier', '×' + (typeof b.hp.classHpMult === 'number' ? b.hp.classHpMult.toFixed(2) : '1')));
    vitParts.push(rowKey('lblHpCharPool', 'Subtotal · character pool', String(b.hp.characterPool)));
    vitParts.push(rowKey('lblHpArmor', '+ Armor (flat HP)', '+' + String(b.hp.armor)));
    vitParts.push(rowKey('lblHpWeapon', '+ Weapon (flat HP)', '+' + String(b.hp.weapon)));
    vitParts.push(rowKey('lblHpJewels', '+ Jewelry (flat HP)', '+' + String(b.hp.jewels)));
    if (b.hp.clanMultOnSum && b.hp.clanMultOnSum !== 1) {
        vitParts.push(rowKey('lblHpClan', 'Clan multiplier (applied here)', '×' + b.hp.clanMultOnSum.toFixed(3)));
    }
    vitParts.push(rowKey('lblTotalHp', '= Max HP', String(b.hp.total)));
    vitParts.push(rowKey('lblMpRace', 'Race base MP (scaled)', String(b.mp.raceBaseMp)));
    vitParts.push(rowKey('lblMpLevels', '+ MP from levels', '+' + String(b.mp.mpPerLevels)));
    vitParts.push(rowKey('lblClassMpMult', 'Class MP multiplier', '×' + (typeof b.mp.classMpMult === 'number' ? b.mp.classMpMult.toFixed(2) : '1')));
    vitParts.push(rowKey('lblMpPool', 'MP pool', String(b.mp.mpBaseDaClasse)));
    vitParts.push(rowKey('lblMpArmor', '+ Armor MP', '+' + String(b.mp.armor)));
    vitParts.push(rowKey('lblMpWeapon', '+ Weapon MP', '+' + String(b.mp.weapon)));
    vitParts.push(rowKey('lblMpJewels', '+ Jewelry MP', '+' + String(b.mp.jewels)));
    vitParts.push(rowKey('lblMpTotal', '= Max MP', String(b.mp.total)));
    vitParts.push(rowKey('lblCp', '= Max CP', '(' + window.playerStats.maxHp + ' × ' + b.cpMult.toFixed(2) + ') → ' + b.cpTotal));
    h.push(wrapDetails(false,
        '<span class="status-detail-acc__ttl">' + L('secDeepVitality', 'Life & mana — detailed') + '</span><span class="status-detail-acc__chev" aria-hidden="true"></span>',
        vitParts));

    var offParts = [];
    offParts.push('<div class="status-detail__sub">' + escapeStatHtml(L('lblPatkAddendsLead', 'Adds up step by step (then % modifiers apply):')) + '</div>');
    offParts.push(rowKey('lblPatkMeleeRace', '· racial stance', String(b.pAtk.raceBaseMelee)));
    offParts.push(rowKey('lblPatkWpnSheet', '· weapon (item atk)', '+' + String(b.pAtk.weaponBase)));
    offParts.push(rowKey('lblPatkWpnEnc', '· weapon enchant', '+' + String(b.pAtk.weaponEnchant)));
    if (b.pAtk.augment) offParts.push(rowKey('lblPatkAug', '· augment', '+' + String(b.pAtk.augment)));
    offParts.push(rowKey('lblPatkLevel', '· from level', '+' + String(b.pAtk.levelPts)));
    offParts.push(rowFb(L('lblPatkPieces', '= Subtotal (before modifiers)'), String(Math.floor(b.pAtk.atkTotalCore))));
    offParts.push('<div class="status-detail__formula">' + escapeStatHtml(atkMultExplain) + '</div>');
    offParts.push(rowKey('lblPatkAfterMultNoEquip', 'After modifiers (before armor/jewelry)', String(b.pAtk.afterMultsNoEquip)));
    offParts.push(rowKey('lblArmorPatkEquip', '+ from armor', '+' + String(b.pAtk.armorEquip)));
    offParts.push(rowKey('lblJewelPatk', '+ from jewelry', '+' + String(b.pAtk.jewelsEquip)));
    offParts.push(rowFb(L('lblPatkTotal', 'Physical attack'), String(b.pAtk.total)));

    offParts.push('<div class="status-detail__sub status-detail__sub--gap">' + escapeStatHtml(L('lblMatkAddendsLead', 'Magic side — adds up first (then % modifiers apply):')) + '</div>');
    offParts.push(rowKey('lblMatkMagicRace', '· racial stance', String(b.mAtk.raceBaseMagic)));
    offParts.push(rowKey('lblMatkWpnSheet', '· weapon (item matk)', '+' + String(b.mAtk.weaponBaseM)));
    offParts.push(rowKey('lblMatkWpnEnc', '· weapon enchant', '+' + String(b.mAtk.weaponEnchantM)));
    if (b.mAtk.augment) offParts.push(rowKey('lblMatkAug', '· augment', '+' + String(b.mAtk.augment)));
    offParts.push(rowKey('lblMatkLevel', '· from level', '+' + String(b.mAtk.levelPts)));
    offParts.push(rowFb(L('lblMatkPieces', '= Subtotal (before modifiers)'), String(Math.floor(b.mAtk.matkTotalCore))));
    offParts.push('<div class="status-detail__formula">' + escapeStatHtml(matMultExplain) + '</div>');
    offParts.push(rowKey('lblMatkAfterMultNoEquip', 'After modifiers (before armor/jewelry)', String(b.mAtk.afterMultsNoEquip)));
    offParts.push(rowKey('lblArmorMatkEquip', '+ from armor', '+' + String(b.mAtk.armorEquip)));
    offParts.push(rowKey('lblJewelMatk', '+ from jewelry', '+' + String(b.mAtk.jewelsEquip)));
    offParts.push(rowFb(L('lblMatkTotal', 'Magic attack'), String(b.mAtk.total)));
    if (b.castle.pAtk > 1.001 && b.castle.castlesOwned) {
        offParts.push('<div class="status-detail__pill">' + escapeStatHtml(L(
            'castleRough',
            'Clan castles: roughly +{pct}% attack (~{n} castles)',
            { pct: String(castleAtkPct), n: String(b.castle.castlesOwned) }
        )) + '</div>');
    }
    h.push(wrapDetails(false,
        '<span class="status-detail-acc__ttl">' + L('secDeepOffense', 'Attack — detailed') + '</span><span class="status-detail-acc__chev" aria-hidden="true"></span>',
        offParts));

    var defParts = [];
    defParts.push(rowKey('lblPdefFlat30', 'Base layers (physical)', String(b.pDef.flatMeleeBlock)));
    defParts.push(rowKey('lblPdefFlatCore', '+ Universal layer', String(b.pDef.flatCore)));
    if (b.pDef.armorPDef) defParts.push(rowKey('lblPdefArmor', '+ Armor', '+' + String(b.pDef.armorPDef)));
    defParts.push(rowKey('lblPdefLevel', '+ Levels', '+' + String(b.pDef.levelPts)));
    if (b.pDef.augment) defParts.push(rowKey('lblPdefAug', '+ Weapon augment', '+' + String(b.pDef.augment)));
    defParts.push(rowKey('lblPdefRawSum', '= Added up before % boosts', String(Math.floor(b.pDef.rawSumBeforeMult))));
    defParts.push('<div class="status-detail__formula">' + escapeStatHtml(defMultExplain) + '</div>');
    defParts.push(rowKey('lblPdefFinal', '= P.Def total', String(b.pDef.total)));
    defParts.push(rowKey('lblMdefFlat', 'Base magic defense', '+' + String(b.mDef.flatBase)));
    if (b.mDef.armorBonusMDef) defParts.push(rowKey('lblMdefArmorBonus', '+ Robe/armor bonus M.Def', '+' + String(b.mDef.armorBonusMDef)));
    if (b.mDef.armorFlatMDef) defParts.push(rowKey('lblMdefArmorFlat', '+ Armor sheet M.Def', '+' + String(b.mDef.armorFlatMDef)));
    defParts.push(rowKey('lblMdefJewSum', '+ Jewelry M.Def', '+' + String(b.mDef.jewelsFlat)));
    defParts.push(rowKey('lblMdefLvl', '+ Levels', '+' + String(b.mDef.levelPts)));
    if (b.mDef.augment) defParts.push(rowKey('lblMdefAug', '+ Augment', '+' + String(b.mDef.augment)));
    defParts.push(rowKey('lblMdefRawSum', '= Added up before % boosts', String(Math.floor(b.mDef.rawSumBeforeMult))));
    defParts.push('<div class="status-detail__formula">' + escapeStatHtml(mdefMultExplain) + '</div>');
    defParts.push(rowKey('lblMdefFloorInner', '= After class & blessings', String(b.mDef.afterClassBuffClanCastle)));
    defParts.push(rowKey('lblMdefTotalShown', '= M.Def total · same as HUD', String(b.mDef.total)));
    h.push(wrapDetails(false,
        '<span class="status-detail-acc__ttl">' + L('secDeepDefense', 'Defense — detailed') + '</span><span class="status-detail-acc__chev" aria-hidden="true"></span>',
        defParts));

    var otherParts = [];
    otherParts.push(rowFb(L('lblCritTotal', 'Critical chance'), b.critRate + '%'));
    otherParts.push(rowKey('lblCritBase', '  · race', '+' + String(b.critParts.base)));
    if (b.critParts.modClass) otherParts.push(rowKey('lblCritMod', '  · class', '+' + String(b.critParts.modClass)));
    if (b.critParts.augment) otherParts.push(rowKey('lblCritAug', '  · augment', '+' + String(b.critParts.augment)));
    if (b.critParts.armor) otherParts.push(rowKey('lblCritArmor', '  · armor', '+' + String(b.critParts.armor)));
    if (b.critParts.weapon) otherParts.push(rowKey('lblCritWeapon', '  · weapon', '+' + String(b.critParts.weapon)));
    if (b.critParts.jewels) otherParts.push(rowKey('lblCritJewels', '  · jewelry', '+' + String(b.critParts.jewels)));
    if (typeof b.critParts.rawBeforeCap === 'number' && typeof b.critParts.cap === 'number' && b.critParts.rawBeforeCap > b.critRate) {
        otherParts.push('<div class="status-detail__muted">' + escapeStatHtml(L(
            'lblCritCapApplied',
            'Added bonuses reached {raw}% — global crit cap {cap}% applies in combat (same as the total above).',
            { raw: String(b.critParts.rawBeforeCap), cap: String(b.critParts.cap) }
        )) + '</div>');
    }
    otherParts.push(rowFb(L('lblAtkSpdShown', 'Time between hits (lower = faster)'), (b.atkSpeed.totalMs / 1000).toFixed(2) + 's'));
    if (b.atkSpeed.floored250) {
        otherParts.push('<div class="status-detail__muted">' + escapeStatHtml(L('lblAtkFloor', 'Floored at 250ms minimum delay')) + '</div>');
    }
    if (Array.isArray(b.joiasPorStat) && b.joiasPorStat.length > 0) {
        otherParts.push('<div class="status-detail__h-sm">' + L('secJewelry', 'Each jewelry piece') + '</div>');
        b.joiasPorStat.forEach(function (jn) {
            var line = '+' + String(jn.value) + ' ' + jewelAbbr(jn.stat) + ' · ' +
                escapeStatHtml(jn.nome) + ' · ' + escapeStatHtml(slotLabel(jn.slot));
            otherParts.push('<div class="status-detail__jewel">' + line + '</div>');
        });
    }
    h.push(wrapDetails(false,
        '<span class="status-detail-acc__ttl">' + L('secDeepOther', 'Crit & speed — detailed') + '</span><span class="status-detail-acc__chev" aria-hidden="true"></span>',
        otherParts));

    root.innerHTML = h.join('');
    try {
        if (typeof window.I18n !== 'undefined' && window.I18n.refreshDom) {
            window.I18n.refreshDom(root);
        }
    } catch (eR) {}
};

function abrirStatusDetalhado(): void {
    try {
        if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
        if (typeof window.renderPainelStatsDetalhado === 'function') window.renderPainelStatsDetalhado();
    } catch (eA) {
        console.warn('[abrirStatusDetalhado]', eA);
    }
    window.abrirModal('janela-status-detalhado', 1600);
}
function fecharStatusDetalhado(): void { window.fecharModal('janela-status-detalhado'); }

// === EQUIP LOGIC SEGURA ===
function equiparItemSeguro(indexNaBolsa: number): void {
    const itemNovo = window.inventarioEquips[indexNaBolsa] as InventoryBagEquip | undefined;
    if (!itemNovo) return;
    const slot = String(itemNovo.tipoItem || itemNovo.tipo || '');
    if (['weapon', 'arma', 'armor', 'armadura', 'neck', 'ear', 'ring'].includes(slot)) {
        const val: GradeEquipValidation = typeof window.validarEquipPorGrade === 'function'
            ? window.validarEquipPorGrade(itemNovo)
            : { permitido: true, nivelMinimo: 0, nivelAtual: window.nivel || 1, grade: '' };
        if (!val.permitido) {
            if (typeof window.abrirJanelaBloqueioGrade === 'function') window.abrirJanelaBloqueioGrade(itemNovo, val.nivelMinimo || 0, val.grade);
            else if (typeof window.mostrarAviso === 'function') window.mostrarAviso(typeof window.t === 'function' ? window.t('game.inventory.levelRequired', { level: val.nivelMinimo || 0 }) : `Level ${val.nivelMinimo} required.`);
            return;
        }
    }
    let itemAntigoRemovido: InventoryBagEquip | null = null;
    if (slot === 'weapon' || slot === 'arma') {
        if (window.armaEquipadaBase) itemAntigoRemovido = window.armaEquipadaBase as InventoryBagEquip;
        window.armaEquipadaBase = itemNovo;
    } else if (slot === 'armor' || slot === 'armadura') {
        if (window.armaduraEquipada) itemAntigoRemovido = window.armaduraEquipada as InventoryBagEquip;
        window.armaduraEquipada = itemNovo;
    } else if (slot === 'neck') {
        if (window.colarEquipado) itemAntigoRemovido = window.colarEquipado as InventoryBagEquip;
        itemNovo.enchantJewel = Number(itemNovo.enchantJewel) || 0;
        window.colarEquipado = itemNovo;
    } else if (slot === 'ear' || slot === 'ring') {
        window.abrirAcaoInventario(indexNaBolsa);
        return;
    } else if (slot === 'ear1' || slot === 'ear2' || slot === 'ring1' || slot === 'ring2') {
        itemNovo.enchantJewel = Number(itemNovo.enchantJewel) || 0;
        window.InventoryManager.equiparGarantido(indexNaBolsa, slot);
        return;
    } else {
        return;
    }
    window.inventarioEquips.splice(indexNaBolsa, 1);
    if (itemAntigoRemovido) {
        window.InventoryManager.adicionarEquipamento(itemAntigoRemovido);
        const nomeAntigo = String((itemAntigoRemovido.base as ItemCatalogBase)?.nome || itemAntigoRemovido.nome || 'item');
        const storedMsg = (typeof window.t === 'function')
            ? window.t('game.inventoryUi.logStored', { item: nomeAntigo })
            : `Stored ${nomeAntigo}.`;
        window.escreverLog(`<span style="color:#aaa;">${storedMsg}</span>`);
    }
    const nomeNovo = String((itemNovo.base as ItemCatalogBase)?.nome || itemNovo.nome || 'item');
    const equippedMsg = (typeof window.t === 'function')
        ? window.t('game.inventoryUi.logEquipped', { item: nomeNovo })
        : `Equipped ${nomeNovo}.`;
    window.escreverLog(`<span style="color:#facc15; font-weight:bold;">${equippedMsg}</span>`);
    if (typeof window.calcularStatusGlobais === 'function') window.calcularStatusGlobais();
    if (typeof window.atualizar === 'function') window.atualizar();
    if (typeof window.salvarJogo === 'function') window.salvarJogo();
}

window._l2InvIconFrameHtml = _l2InvIconFrameHtml;
window._l2AppendInvGridSlot = _l2AppendInvGridSlot;
window.renderizarInventario = renderizarInventario;
window.renderizarPerfil = renderizarPerfil;
window.abrirStatusDetalhado = abrirStatusDetalhado;
window.fecharStatusDetalhado = fecharStatusDetalhado;
window.abrirAcaoInventario = abrirAcaoInventario;
window.abrirAcaoPerfil = abrirAcaoPerfil;
window.formatarTooltipEquipamento = formatarTooltipEquipamento;
window.fecharJanelaAcao = fecharJanelaAcao;
window.equiparItemSeguro = equiparItemSeguro;

export {};
