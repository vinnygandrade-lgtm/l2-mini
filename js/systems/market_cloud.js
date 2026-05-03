/**
 * MARKET_CLOUD.JS — Mercado player-to-player via Supabase
 * Listagens globais; compra, publicação (taxa) e payout com RPCs (authority + supabase_market_publish_listing.sql).
 */

const MarketCloud = {
    /** Taxa de registro (Adena) no servidor; manter = `v_fee` em supabase_market_publish_listing.sql */
    LISTING_FEE_ADENA: 1000,
    _channel: null,
    _debounceTimer: null,

    isAvailable() {
        return typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.enabled
            && typeof SupabaseAPI !== 'undefined' && SupabaseAPI.client
            && typeof SupabaseAPI.getUser === 'function' && !!SupabaseAPI.getUser()
            && typeof window.charName === 'string' && window.charName.length > 0;
    },

    mapRowToEntry(row) {
        if (!row) return null;
        const snap = row.item_snapshot || {};
        return {
            id: row.id,
            vendedor: row.seller_char_name,
            isBot: false,
            item: typeof snap === 'object' ? snap : {},
            fullItem: row.full_item || null,
            enchant: row.enchant != null ? row.enchant : 0,
            preco: Number(row.price) || 0,
            moeda: row.currency === 'coin' ? 'coin' : 'adena',
            categoria: row.categoria || 'mats',
            qtd: row.qtd != null ? row.qtd : 1,
            _cloud: true,
            _createdAt: row.created_at
        };
    },

    async fetchListings() {
        if (!this.isAvailable()) return [];
        const { data, error } = await SupabaseAPI.client
            .from('market_listings')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[MarketCloud] fetchListings:', error.message);
            return [];
        }
        return (data || []).map((r) => this.mapRowToEntry(r)).filter(Boolean);
    },

    /**
     * Publica listagem com taxa de registro debitada no JSONB (RPC `market_publish_listing`).
     * Requer `supabase_market_publish_listing.sql` aplicado no projeto Supabase.
     */
    async publishListing(payload) {
        if (!this.isAvailable()) {
            return { ok: false, error: 'cloud_unavailable' };
        }
        if (!payload || !payload.seller_char_name || payload.price == null) {
            return { ok: false, error: 'invalid_params' };
        }

        const { data, error } = await SupabaseAPI.client.rpc('market_publish_listing', {
            p_seller_char_name: payload.seller_char_name,
            p_price: payload.price,
            p_currency: payload.currency === 'coin' ? 'coin' : 'adena',
            p_categoria: payload.categoria,
            p_qtd: payload.qtd,
            p_enchant: payload.enchant || 0,
            p_item_snapshot: payload.item_snapshot || {},
            p_full_item: payload.full_item != null ? payload.full_item : null
        });

        if (error) {
            console.error('[MarketCloud] publishListing RPC:', error.message);
            return { ok: false, error: 'rpc_error', message: error.message };
        }

        if (!data || data.ok === false) {
            const code = data && data.error ? data.error : 'publish_failed';
            console.warn('[MarketCloud] publishListing denied:', code, data);
            return { ok: false, error: code, details: data || {} };
        }

        const listing = data.listing;
        const entry = listing ? this.mapRowToEntry(listing) : null;
        if (!entry) {
            return { ok: false, error: 'invalid_listing_payload', details: data };
        }

        return {
            ok: true,
            entry,
            listingFeeAdena: Number(data.listing_fee_adena) || this.LISTING_FEE_ADENA,
            balances: {
                adenas: Number(data.seller_adenas) || 0,
                ancientCoins: Number(data.seller_ancient_coins) || 0
            }
        };
    },

    async cancelListing(listingId, sellerCharName) {
        if (!this.isAvailable()) return false;
        const { data, error } = await SupabaseAPI.client
            .from('market_listings')
            .update({ status: 'cancelled' })
            .eq('id', listingId)
            .eq('seller_char_name', sellerCharName)
            .eq('status', 'active')
            .select()
            .maybeSingle();

        if (error) {
            console.error('[MarketCloud] cancelListing:', error.message);
            return false;
        }
        return !!data;
    },

    /**
     * Compra autoritávia: debita saldo no JSON do personagem (Postgres) e marca vendido.
     * Requer função public.market_purchase_listing no projeto Supabase.
     * @returns {{ ok: true, entry: object, balances: { adenas: number, ancientCoins: number } } | { ok: false, error?: string, details?: object, message?: string }}
     */
    async completePurchase(listingId, buyerCharName) {
        if (!this.isAvailable()) {
            return { ok: false, error: 'cloud_unavailable' };
        }
        if (!buyerCharName || !listingId) {
            return { ok: false, error: 'invalid_params' };
        }

        const { data, error } = await SupabaseAPI.client.rpc('market_purchase_listing', {
            p_listing_id: listingId,
            p_buyer_char_name: buyerCharName
        });

        if (error) {
            console.error('[MarketCloud] completePurchase RPC:', error.message);
            return { ok: false, error: 'rpc_error', message: error.message };
        }

        if (!data || data.ok === false) {
            const code = data && data.error ? data.error : 'purchase_failed';
            console.warn('[MarketCloud] completePurchase denied:', code, data);
            return { ok: false, error: code, details: data || {} };
        }

        const entry = this.mapRowToEntry(data.listing);
        if (!entry) {
            return { ok: false, error: 'invalid_listing_payload', details: data };
        }

        return {
            ok: true,
            entry,
            balances: {
                adenas: Number(data.buyer_adenas) || 0,
                ancientCoins: Number(data.buyer_ancient_coins) || 0
            }
        };
    },

    /**
     * Marca listagens como payout_claimed; valores são entregues via mailbox no cliente.
     */
    async claimPendingPayouts(sellerCharName) {
        if (!this.isAvailable() || !sellerCharName) {
            return { ok: false, error: 'cloud_unavailable' };
        }

        const { data, error } = await SupabaseAPI.client.rpc('market_claim_payouts', {
            p_seller_char_name: sellerCharName
        });

        if (error) {
            console.error('[MarketCloud] claimPendingPayouts RPC:', error.message);
            return { ok: false, error: 'rpc_error', message: error.message };
        }

        if (!data || data.ok === false) {
            return { ok: false, error: data?.error || 'claim_failed', details: data || {} };
        }

        let payouts = data.payouts;
        if (typeof payouts === 'string') {
            try {
                payouts = JSON.parse(payouts);
            } catch (e) {
                payouts = [];
            }
        }
        if (!Array.isArray(payouts)) payouts = [];

        return { ok: true, payouts };
    },

    subscribeListings(onRefresh) {
        if (!this.isAvailable() || this._channel) return;
        this._channel = SupabaseAPI.client
            .channel('market-listings-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'market_listings' },
                () => {
                    if (this._debounceTimer) clearTimeout(this._debounceTimer);
                    this._debounceTimer = setTimeout(() => {
                        if (typeof onRefresh === 'function') onRefresh();
                    }, 280);
                }
            )
            .subscribe();
    },

    unsubscribeListings() {
        if (this._channel && SupabaseAPI.client) {
            try {
                SupabaseAPI.client.removeChannel(this._channel);
            } catch (e) { /* ignore */ }
            this._channel = null;
        }
    }
};

window.MarketCloud = MarketCloud;
