/**
 * REWARD_ENGINE.JS
 * Reward Hub — modern GM reward inbox.
 * Manages rewards sent by GMs via a dedicated table.
 */

function rewardT(key, params) {
    return typeof window.t === 'function' ? window.t(key, params) : key;
}

const RewardEngine = {
    rewards: [],
    claiming: false,
    /** Last badge count (used to animate when new rewards arrive) */
    lastPendingCount: 0,

    /**
     * Escape text for safe HTML insertion (DB-sourced messages).
     */
    escapeHtml(text) {
        if (text == null) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    /**
     * Normalize items field (JSONB may be array, JSON string, or single object).
     */
    normalizeRewardItems(items) {
        if (items == null) return [];
        let raw = items;
        if (typeof raw === 'string') {
            try {
                raw = JSON.parse(raw);
            } catch (e) {
                return [];
            }
        }
        if (!Array.isArray(raw)) {
            if (typeof raw === 'object' && raw !== null && (raw.id != null || raw.nome != null)) {
                raw = [raw];
            } else {
                return [];
            }
        }
        return raw
            .map((item) => ({
                id: item.id != null ? item.id : item.nome,
                qtd: Number(item.qtd != null ? item.qtd : item.qty != null ? item.qty : item.quantity != null ? item.quantity : 0),
                tipo: item.tipo
            }))
            .filter((item) => item.id != null && String(item.id).length > 0 && !isNaN(item.qtd) && item.qtd > 0);
    },

    /**
     * Start reward polling
     */
    async init() {
        if (!window.charName) return;
        console.log("🎁 Reward Hub: Fetching rewards...");
        await this.checkRewards();
        
        // Poll every 60s for new rewards
        setInterval(() => this.checkRewards(), 60000);
    },

    /**
     * Fetch unclaimed rewards from Supabase
     */
    async checkRewards() {
        if (!window.charName || typeof SupabaseAPI === 'undefined' || !SupabaseAPI.client) return;

        try {
            const { data, error } = await SupabaseAPI.client
                .from('rewards')
                .select('*')
                .ilike('char_name', window.charName)
                .eq('claimed', false);

            if (error) throw error;

            this.rewards = data || [];
            this.updateBadge();

            const hub = document.getElementById('janela-reward-hub');
            if (this.rewards.length > 0 && hub && hub.style.display === 'flex') {
                this.render();
            }
        } catch (err) {
            console.error("Reward Hub fetch error:", err.message);
        }
    },

    /**
     * Update HUD badge
     */
    updateBadge() {
        let btn = document.getElementById('btn-reward-hub-hud');
        if (!btn) {
            this.createHUDBtn();
            btn = document.getElementById('btn-reward-hub-hud');
            if (!btn) return;
        }

        const inner = btn.querySelector('.reward-hub-hud-inner');
        const badge = document.getElementById('reward-badge');
        const n = this.rewards.length;
        const prev = this.lastPendingCount;

        if (n > 0) {
            btn.style.display = 'flex';
            if (inner) {
                inner.classList.add('reward-hud--pending');
                const titlePending = n === 1
                    ? rewardT('reward.hubPendingOne')
                    : rewardT('reward.hubPendingMany', { n: n });
                inner.setAttribute('title', titlePending);
                inner.setAttribute('aria-label', inner.getAttribute('title'));
            }
            if (badge) {
                badge.innerText = n > 99 ? '99+' : String(n);
                badge.classList.add('is-visible');
                if (n > prev) {
                    badge.classList.remove('reward-badge--ping');
                    void badge.offsetWidth;
                    badge.classList.add('reward-badge--ping');
                }
            }
        } else {
            if (inner) {
                inner.classList.remove('reward-hud--pending');
                const idleTitle = rewardT('reward.hubTitle');
                inner.setAttribute('title', idleTitle);
                inner.setAttribute('aria-label', idleTitle);
            }
            if (badge) {
                badge.classList.remove('is-visible', 'reward-badge--ping');
                badge.innerText = '';
            }
        }

        this.lastPendingCount = n;
    },

    /**
     * Create Reward Hub HUD button if missing
     */
    createHUDBtn() {
        let container = document.getElementById('hud-top-bar') || document.body;
        if (document.getElementById('btn-reward-hub-hud')) return;

        const btn = document.createElement('div');
        btn.id = 'btn-reward-hub-hud';
        btn.setAttribute('role', 'presentation');
        const ht = rewardT('reward.hubTitle');
        btn.innerHTML = `
            <div class="reward-hub-hud-inner" title="${this.escapeHtml(ht)}" role="button" tabindex="0" aria-label="${this.escapeHtml(ht)}"
                 onclick="RewardEngine.open()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();RewardEngine.open();}">
                <span class="reward-hub-hud-icon" aria-hidden="true">🎁</span>
                <span id="reward-badge" class="reward-hub-hud-badge" aria-live="polite"></span>
            </div>
        `;

        btn.style.cssText = 'position:fixed; top:10px; right:120px; z-index:1001;';
        container.appendChild(btn);
    },

    open() {
        window.abrirModal('janela-reward-hub', 2500);
        this.render();
    },

    /**
     * Render reward list UI
     */
    render() {
        const cont = document.getElementById('reward-hub-content');
        if (!cont) return;

        if (this.rewards.length === 0) {
            cont.innerHTML = `
                <div style="text-align:center; padding:40px; color:#555;">
                    <div style="font-size:3em; margin-bottom:10px; opacity:0.2;">🎁</div>
                    <p style="font-family:'Cinzel'; font-size:12px;">${rewardT('reward.emptyState')}</p>
                </div>
            `;
            return;
        }

        let html = '<div style="display:flex; flex-direction:column; gap:15px;">';
        this.rewards.forEach(reward => {
            const date = new Date(reward.created_at).toLocaleDateString();
            const senderRaw = reward.sender || rewardT('reward.fallbackSender');
            const sender = this.escapeHtml(senderRaw);
            const msg = this.escapeHtml(reward.message || '').replace(/\n/g, '<br>');

            html += `
                <div style="background:linear-gradient(145deg, #0f172a 0%, #020617 50%, #0c1a2e 100%); border:1px solid rgba(212,175,55,0.35); border-radius:10px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.55), 0 0 28px rgba(212,175,55,0.06);">
                    <div style="padding:11px 14px; background:linear-gradient(90deg, rgba(180,130,40,0.14), rgba(30,58,138,0.22)); border-bottom:1px solid rgba(212,175,55,0.22);">
                        <div style="font-size:8px; letter-spacing:0.28em; color:#d4af37; font-family:'Cinzel',serif; font-weight:700; text-transform:uppercase; opacity:0.95;">${rewardT('reward.gmGiftHeader')}</div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                            <span style="font-size:11px; color:#93c5fd; font-family:'Cinzel',serif; font-weight:bold;">✦ ${sender}</span>
                            <span style="font-size:9px; color:#64748b;">${this.escapeHtml(date)}</span>
                        </div>
                    </div>
                    <div style="padding:16px 15px 15px;">
                        <p style="font-size:12px; color:#cbd5e1; margin:0 0 14px 0; line-height:1.55; font-family: Georgia, 'Times New Roman', serif; font-style:italic;">${msg}</p>
                        <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
                            ${this.renderItems(this.normalizeRewardItems(reward.items))}
                        </div>
                        <button class="btn-l2" style="width:100%; height:38px; background:linear-gradient(180deg, #ca8a04, #a16207); border:1px solid rgba(212,175,55,0.5); font-weight:bold; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; font-family:'Cinzel',serif;"
                                onclick="RewardEngine.claim('${reward.id}')">${rewardT('reward.claimGift')}</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        cont.innerHTML = html;
    },

    renderItems(items) {
        if (!Array.isArray(items) || items.length === 0) return '';
        return items.map(item => {
            let icon = '📦';
            let color = '#fff';
            
            // Dynamic icon for currency vs gear vs mats
            const idLower = String(item.id).toLowerCase();
            if (idLower === 'adena') { icon = '💰'; color = '#facc15'; }
            else if (idLower === 'ancient coin' || idLower === 'ancientcoin') { icon = '💎'; color = '#60a5fa'; }
            else if (this.isEquipment(item.id)) { icon = '🛡️'; color = '#fff'; }
            else { icon = '📦'; color = '#aaa'; } // Materials & consumables
            
            return `
                <div style="display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.05); padding:6px 12px; border-radius:20px; border:1px solid rgba(255,255,255,0.1);">
                    <span style="font-size:14px;">${icon}</span>
                    <span style="font-size:11px; color:${color}; font-weight:bold;">${Number(item.qtd).toLocaleString()} ${item.id}</span>
                </div>
            `;
        }).join('');
    },

    /**
     * Claim a reward
     */
    async claim(id) {
        if (this.claiming) return;
        
        const rewardIndex = this.rewards.findIndex(r => r.id === id);
        if (rewardIndex === -1) return;

        const reward = this.rewards[rewardIndex];
        this.claiming = true;

        try {
            const itemsEntrega = this.normalizeRewardItems(reward.items);
            if (itemsEntrega.length === 0) {
                console.warn('RewardEngine.claim: empty or invalid items after normalize', reward.id);
                if (typeof window.l2Alert === 'function') {
                    window.l2Alert(rewardT('reward.invalidData'));
                }
                return;
            }

            // 1. Mark claimed in Supabase
            const { error } = await SupabaseAPI.client
                .from('rewards')
                .update({ claimed: true })
                .eq('id', id);

            if (error) throw error;

            // 2. Remove from local list immediately
            this.rewards.splice(rewardIndex, 1);
            this.updateBadge();
            this.render();

            // 3. Deliver items (currency vs equip vs stackables)
            itemsEntrega.forEach(item => {
                const qty = Number(item.qtd);
                const idLower = String(item.id).toLowerCase();
                
                // --- Currency detection ---
                if (idLower === 'adena') {
                    window.adenas = (Number(window.adenas) || 0) + qty;
                    escreverLog(`<span style="color:#facc15; font-weight:bold;">+${qty.toLocaleString()} Adena (Reward Hub)</span>`);
                } 
                else if (idLower === 'ancient coin' || idLower === 'ancientcoin' || idLower === 'ancient coins') {
                    window.ancientCoins = (Number(window.ancientCoins) || 0) + qty;
                    escreverLog(`<span style="color:#60a5fa; font-weight:bold;">+${qty.toLocaleString()} Ancient Coins (Reward Hub)</span>`);
                } 
                else {
                    // --- Gear vs stackables ---
                    const isEquip = this.isEquipment(item.id);
                    
                    if (isEquip) {
                        for(let i=0; i<qty; i++) {
                            this.addEquip(item.id);
                        }
                        escreverLog(`<span style="color:#fff;">+${qty}x ${item.id} (Reward Hub)</span>`);
                    } else {
                        // Material or consumable
                        if (!window.inventario) window.inventario = {};
                        window.inventario[item.id] = (Number(window.inventario[item.id]) || 0) + qty;
                        escreverLog(`<span style="color:#aaa;">+${qty}x ${item.id} (Reward Hub)</span>`);
                    }
                }
            });

            // 4. Save and refresh UI
            if (typeof window.atualizar === 'function') window.atualizar();
            if (typeof window.salvarJogo === 'function') window.salvarJogo();
            
            window.mostrarAviso(rewardT('reward.claimedToast'));

        } catch (err) {
            console.error("Reward claim error:", err);
            if (typeof window.l2Alert === 'function') {
                window.l2Alert(rewardT('reward.errorGeneric', { message: err.message || err }));
            }
        } finally {
            this.claiming = false;
        }
    },

    isEquipment(itemKey) {
        const cats = [
            typeof catalogoArmas !== 'undefined' ? catalogoArmas : [],
            typeof catalogoArmaduras !== 'undefined' ? catalogoArmaduras : [],
            typeof catalogoJoias !== 'undefined' ? catalogoJoias : []
        ];
        return cats.some(cat => cat.find(i => i.id === itemKey || i.nome === itemKey));
    },

    addEquip(itemKey) {
        const allCats = [
            typeof catalogoArmas !== 'undefined' ? catalogoArmas : [],
            typeof catalogoArmaduras !== 'undefined' ? catalogoArmaduras : [],
            typeof catalogoJoias !== 'undefined' ? catalogoJoias : []
        ];
        
        let info = null;
        for (const cat of allCats) {
            info = cat.find(i => i.id === itemKey || i.nome === itemKey);
            if (info) break;
        }

        if (info && window.inventarioEquips) {
            window.inventarioEquips.push({
                uid: 'RW-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                idBase: itemKey,
                tipo: info.tipoItem || info.tipo || 'item',
                enchant: 0,
                augmented: false,
                base: info
            });
        }
    }
};

window.RewardEngine = RewardEngine;

// Init when charName is available
window.addEventListener('load', () => {
    const checkChar = setInterval(() => {
        if (window.charName) {
            clearInterval(checkChar);
            RewardEngine.init();
        }
    }, 1000);
});
