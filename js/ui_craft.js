// ==========================================
// UI - CRAFTING SYSTEM (MAESTRO REORIN)
// ==========================================

let receitaSelecionada = null;
let categoriaSelecionada = 'special';
/** idBase escolhido em receitas com `escolhasResultado` (Vesper arma/joia unificadas). */
let craftVesperEscolhaIdBase = null;

function abrirJanelaCraft(categoria = 'special') {
    abrirModal('janela-craft', 1500);
    mudarAbaCraft(categoria);
}

function fecharJanelaCraft() {
    fecharModal('janela-craft');
    receitaSelecionada = null;
    craftVesperEscolhaIdBase = null;
}

function mudarAbaCraft(categoria) {
    categoriaSelecionada = categoria;
    craftVesperEscolhaIdBase = null;

    document.getElementById('tab-craft-special').style.background = (categoria === 'special') ? 'linear-gradient(180deg, #ca8a04 0%, #854d0e 100%)' : '#222';
    document.getElementById('tab-craft-mats').style.background = (categoria === 'mats') ? 'linear-gradient(180deg, #ca8a04 0%, #854d0e 100%)' : '#222';

    const grid = document.getElementById('craft-receitas-grid');
    grid.innerHTML = '';

    let filtradas = typeof catalogoReceitas !== 'undefined' ? catalogoReceitas[categoria] : [];

    if (!filtradas || filtradas.length === 0) {
        const emptyMsg = (typeof window.t === 'function') ? window.t('game.craft.emptyCategory') : 'No recipes available in this category.';
        grid.innerHTML = '<span style="color:#aaa; font-size:0.8em; grid-column: span 4; text-align:center; padding-top: 10px;">' + emptyMsg + '</span>';
    } else {
        filtradas.forEach(rec => {
            grid.innerHTML += `<div class="store-item-slot" onclick="selecionarReceita('${rec.idReceita}')"><img src="${rec.img}" title="${rec.nome}" onerror="this.src='assets/itens/item_generic.png'"></div>`;
        });
    }

    document.getElementById('craft-detalhe-texto').innerHTML = (typeof window.t === 'function') ? window.t('game.craft.selectRecipeHint') : 'Select a recipe from the grid above.';
    document.getElementById('craft-ingredientes').innerHTML = '';
    document.getElementById('btn-executar-craft').style.display = 'none';
    receitaSelecionada = null;
    const wrapEsc = document.getElementById('craft-escolha-vesper');
    if (wrapEsc) {
        wrapEsc.style.display = 'none';
        wrapEsc.innerHTML = '';
    }
}

function obterQtdIngrediente(id) {
    if (id === 'Ancient Coin') return typeof ancientCoins !== 'undefined' ? ancientCoins : 0;
    if (id === 'Adena') return typeof adenas !== 'undefined' ? adenas : 0;
    return inventario[id] || 0;
}

function consumirIngrediente(id, qtd) {
    if (id === 'Ancient Coin') {
        ancientCoins -= qtd;
    } else if (id === 'Adena') {
        adenas -= qtd;
    } else {
        inventario[id] -= qtd;
        if (inventario[id] <= 0) delete inventario[id];
    }
}

function renderPainelEscolhaVesper() {
    const wrap = document.getElementById('craft-escolha-vesper');
    if (!wrap) return;

    if (receitaSelecionada && Array.isArray(receitaSelecionada.escolhasResultado) && receitaSelecionada.escolhasResultado.length > 0) {
        const choices = receitaSelecionada.escolhasResultado;
        if (!craftVesperEscolhaIdBase || noneMatch(choices, craftVesperEscolhaIdBase)) {
            craftVesperEscolhaIdBase = choices[0].idBase;
        }
        const lab = (typeof window.t === 'function') ? window.t('game.craft.outputLabel') : 'Output';
        let opts = choices.map(o => `<option value="${o.idBase}">${o.label}</option>`).join('');
        wrap.style.display = 'block';
        wrap.innerHTML = `
            <label style="color:#e5e7eb;font-size:0.85em;display:block;margin-bottom:4px;">${lab}</label>
            <select id="craft-select-vesper" class="btn-l2" style="width:100%;padding:8px;font-size:0.85em;background:#1a1410;color:#facc15;border:1px solid #854d0e;box-sizing:border-box;" onchange="craftOnVesperVariantChange(this.value)">${opts}</select>`;
        const sel = document.getElementById('craft-select-vesper');
        if (sel) sel.value = craftVesperEscolhaIdBase;
    } else {
        wrap.style.display = 'none';
        wrap.innerHTML = '';
        craftVesperEscolhaIdBase = null;
    }
}

function noneMatch(choices, idBase) {
    return !choices.some(o => o.idBase === idBase);
}

window.craftOnVesperVariantChange = function (idBase) {
    craftVesperEscolhaIdBase = idBase;
    atualizarListaIngredientesCraft();
};

function atualizarListaIngredientesCraft() {
    if (!receitaSelecionada) return;

    let htmlIngredientes = '';
    let podeCraftar = true;

    receitaSelecionada.ingredientes.forEach(ing => {
        let qtdPossui = obterQtdIngrediente(ing.id);
        let corQtd = qtdPossui >= ing.qtd ? '#10b981' : '#ef4444';
        if (qtdPossui < ing.qtd) podeCraftar = false;

        let icone = ing.id === 'Ancient Coin' ? '🪙 ' : (ing.id === 'Adena' ? '💰 ' : '');

        htmlIngredientes += `
            <div style="display:flex; justify-content:space-between; font-size:0.85em; background:#1a1410; padding:4px 6px; border-radius:2px; border: 1px solid #3d2b1f;">
                <span style="color:#d4c4a8;">${icone}${ing.id}</span>
                <span style="color:${corQtd}; font-weight:bold; text-shadow:1px 1px 0 #000;">${qtdPossui.toLocaleString()} / ${ing.qtd.toLocaleString()}</span>
            </div>
        `;
    });

    document.getElementById('craft-ingredientes').innerHTML = htmlIngredientes;

    let btnExecutar = document.getElementById('btn-executar-craft');
    btnExecutar.style.display = 'block';

    if (podeCraftar) {
        btnExecutar.disabled = false;
        btnExecutar.style.background = 'linear-gradient(180deg, #ca8a04 0%, #854d0e 100%)';
        btnExecutar.style.borderColor = '#eab308';
        btnExecutar.style.color = '#fff';
        btnExecutar.innerText = (typeof window.t === 'function') ? window.t('game.craft.forgeItem') : 'FORGE ITEM';
    } else {
        btnExecutar.disabled = true;
        btnExecutar.style.background = '#3d2b1f';
        btnExecutar.style.borderColor = '#241710';
        btnExecutar.style.color = '#88745c';
        btnExecutar.innerText = (typeof window.t === 'function') ? window.t('game.craft.needMaterials') : 'NEED MATERIALS';
    }
}

function buscarBaseDoEquipamento(idBase) {
    let equipamento = null;
    if (typeof catalogoArmaduras !== 'undefined') equipamento = catalogoArmaduras.find(a => a.id === idBase);
    if (!equipamento && typeof catalogoArmas !== 'undefined') equipamento = catalogoArmas.find(a => a.id === idBase);
    if (!equipamento && typeof catalogoJoias !== 'undefined') equipamento = catalogoJoias.find(a => a.id === idBase);
    return equipamento;
}

function selecionarReceita(id) {
    let lista = catalogoReceitas[categoriaSelecionada] || [];
    receitaSelecionada = lista.find(r => r.idReceita === id);
    if (!receitaSelecionada) return;

    craftVesperEscolhaIdBase = null;

    const rateLine = (typeof window.t === 'function') ? window.t('game.craft.successRate') : 'Success rate: 100%';
    document.getElementById('craft-detalhe-texto').innerHTML = `
        <b style="color:#ffcc00; font-size:1.1em; font-family: 'Cinzel', serif;">${receitaSelecionada.nome}</b><br>
        <span style="color:#ccc; font-size:0.85em;">${receitaSelecionada.desc}</span><br>
        <span style="color:#10b981; font-weight:bold; font-size:0.9em;">${rateLine}</span>
    `;

    renderPainelEscolhaVesper();
    atualizarListaIngredientesCraft();
}

async function executarCraft() {
    if (!receitaSelecionada) return;

    let qtdGerada = 1;
    let tipoGerado = null;
    let idBaseGerado = null;

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
        if (typeof mostrarAviso === 'function') {
            mostrarAviso((typeof window.t === 'function') ? window.t('game.craft.invalidRecipe') : 'Invalid recipe.');
        }
        return;
    }

    let podeCraftar = true;
    receitaSelecionada.ingredientes.forEach(ing => {
        if (obterQtdIngrediente(ing.id) < ing.qtd) podeCraftar = false;
    });

    if (!podeCraftar) {
        if (typeof mostrarAviso === 'function') {
            mostrarAviso(typeof window.t === 'function' ? window.t('game.craft.notEnoughMaterials') : 'Not enough materials to craft!');
        }
        return;
    }

    let btnExecutar = document.getElementById('btn-executar-craft');
    if (btnExecutar) {
        btnExecutar.disabled = true;
        btnExecutar.innerText = (typeof window.t === 'function') ? window.t('game.craft.forging') : 'FORGING...';
    }

    // MODO MULTIPLAYER (SUPABASE)
    if (window.SupabaseAPI && window.SupabaseAPI.getUser() && window.charName) {
        try {
            const { data, error } = await window.SupabaseAPI.craftItem(window.charName, receitaSelecionada.idReceita, craftVesperEscolhaIdBase);
            
            if (error) {
                console.error('[Craft RPC Error]', error);
                if (typeof window.l2Alert === 'function') window.l2Alert(typeof window.t === 'function' ? window.t('game.cloud.error') + ': ' + (error.message || error) : 'Cloud Error: ' + (error.message || error));
                if (btnExecutar) {
                    btnExecutar.disabled = false;
                    btnExecutar.innerText = (typeof window.t === 'function') ? window.t('game.craft.forgeItem') : 'FORGE ITEM';
                }
                return;
            }

            if (data && data.success) {
                // Consome ingredientes localmente para sincronia visual
                receitaSelecionada.ingredientes.forEach(ing => {
                    consumirIngrediente(ing.id, ing.qtd);
                });

                let nomeGerado = '';
                let imgGerada = receitaSelecionada.img;
                let itemServidor = data.item_crafted;

                // O servidor devolve uma instância básica. Precisamos hidratar com os dados da base local.
                let baseEquip = buscarBaseDoEquipamento(itemServidor.idBase);
                if (baseEquip) {
                    let itemParaAdicionar = {
                        ...itemServidor,
                        base: baseEquip
                    };
                    InventoryManager.adicionarEquipamento(itemParaAdicionar);
                    nomeGerado = baseEquip.nome;
                    imgGerada = baseEquip.img;
                }

                if (typeof fecharJanelaCraft === 'function') fecharJanelaCraft();
                if (typeof mostrarResultadoCraft === 'function') mostrarResultadoCraft(nomeGerado, imgGerada, qtdGerada);
                
                if (typeof escreverLog === 'function') {
                    const logLine = (typeof window.t === 'function') ? window.t('game.craft.logForged', { item: nomeGerado }) : (`🔨 DWARVEN CRAFT: You forged ${nomeGerado}!`);
                    escreverLog(`<span style="color:#facc15; font-weight:bold; text-shadow: 1px 1px 0 #000;">${logLine}</span>`);
                }
                if (typeof atualizar === 'function') atualizar();
            }
        } catch (err) {
            console.error('[Craft RPC Exception]', err);
            if (btnExecutar) btnExecutar.disabled = false;
        }
        return;
    }

    // MODO LOCAL (OFFLINE)
    receitaSelecionada.ingredientes.forEach(ing => {
        consumirIngrediente(ing.id, ing.qtd);
    });

    let nomeGerado = '';
    let imgGerada = receitaSelecionada.img;

    if (tipoGerado === 'material') {
        inventario[idBaseGerado] = (inventario[idBaseGerado] || 0) + qtdGerada;
        nomeGerado = idBaseGerado;
    } else {
        let baseEquip = buscarBaseDoEquipamento(idBaseGerado);

        if (baseEquip) {
            let itemParaAdicionar = {
                tipo: tipoGerado,
                base: baseEquip,
                enchant: 0,
                augmented: false,
                origin: 'Craft'
            };

            InventoryManager.adicionarEquipamento(itemParaAdicionar);

            nomeGerado = baseEquip.nome;
            imgGerada = baseEquip.img;
        } else {
            console.error('Error: Base gear not found in DB! ID:', idBaseGerado);
            nomeGerado = 'Mystery Item';
        }
    }

    if (typeof fecharJanelaCraft === 'function') fecharJanelaCraft();

    if (typeof mostrarResultadoCraft === 'function') {
        mostrarResultadoCraft(nomeGerado, imgGerada, qtdGerada);
    }

    if (typeof escreverLog === 'function') {
        const logLine = (typeof window.t === 'function') ? window.t('game.craft.logForged', { item: nomeGerado }) : (`🔨 DWARVEN CRAFT: You forged ${nomeGerado}!`);
        escreverLog(`<span style="color:#facc15; font-weight:bold; text-shadow: 1px 1px 0 #000;">${logLine}</span>`);
    }
    if (typeof atualizar === 'function') atualizar();
    if (typeof salvarJogo === 'function') salvarJogo();
}

function mostrarResultadoCraft(nomeItem, imgItem, qtd) {
    document.getElementById('craft-res-img').src = imgItem || 'assets/itens/item_generic.png';
    document.getElementById('craft-res-nome').innerText = nomeItem;
    document.getElementById('craft-res-qtd').innerText = (typeof window.t === 'function') ? window.t('game.craft.craftedQty', { qtd }) : (`Crafted x${qtd}`);

    if (typeof tocarSom === 'function') tocarSom('enchant_success');

    abrirModal('janela-craft-resultado', 1800);
}

function fecharCraftResultado() {
    fecharModal('janela-craft-resultado');
    if (typeof atualizar === 'function') atualizar();

    if (typeof renderizarInventario === 'function') renderizarInventario();
}
