/**
 * Mercado player-to-player via Supabase (listagens, RPCs de compra/publicação/payout).
 * Migrado: js/systems/market_cloud.js — Fase 4: tipos explícitos.
 */
import type {
  ItemCatalogBase,
  MarketCloudApi,
  MarketListingDisplayItem,
  MarketListingEntry,
  MarketListingRow,
  MarketOperationResult,
  MarketPublishPayload,
  MarketRpcPayload,
  SupabaseClientLite,
} from '../types/game';
import { registerGlobal } from '../runtime/register-global';

type RealtimeChannel = {
  on: (
    type: string,
    filter: Record<string, unknown>,
    cb: () => void,
  ) => RealtimeChannel;
  subscribe: () => unknown;
};

function rpcErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

let listingsRealtimeChannel: RealtimeChannel | null = null;
let listingsDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function marketListingsTable(client: SupabaseClientLite) {
  return client.from('market_listings') as unknown as {
    select: (cols: string) => {
      eq: (
        col: string,
        val: boolean | string,
      ) => {
        order: (
          col: string,
          opts: { ascending: boolean },
        ) => Promise<{ data: MarketListingRow[] | null; error: { message: string } | null }>;
      };
    };
    update: (patch: Record<string, unknown>) => {
      eq: (
        col: string,
        val: string | boolean,
      ) => {
        eq: (
          col2: string,
          val2: string | boolean,
        ) => {
          eq: (
            col3: string,
            val3: boolean,
          ) => {
            select: () => {
              maybeSingle: () => Promise<{
                data: MarketListingRow | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    };
  };
}

function parseJsonField<T>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  return raw as T;
}

export const MarketCloud: MarketCloudApi = {
  LISTING_FEE_ADENA: 1000,

  isAvailable() {
    return (
      window.SUPABASE_CONFIG.enabled &&
      window.SupabaseAPI.client != null &&
      typeof window.SupabaseAPI.getUser === 'function' &&
      !!window.SupabaseAPI.getUser() &&
      typeof window.charName === 'string' &&
      window.charName.length > 0
    );
  },

  displayItemFromRow(row: MarketListingRow | null | undefined): MarketListingDisplayItem {
    const rawObj = parseJsonField<Record<string, unknown>>(row?.item_data) ?? {};
    const snap = parseJsonField<Record<string, unknown>>(row?.item_snapshot);
    const base =
      rawObj.base && typeof rawObj.base === 'object'
        ? (rawObj.base as ItemCatalogBase)
        : null;

    const out: MarketListingDisplayItem = {};
    if (snap) {
      out.nome = snap.nome as string | undefined;
      out.img = snap.img as string | undefined;
      out.icone = snap.icone as string | undefined;
      out.grade = snap.grade as string | undefined;
      out.tipo = snap.tipo as string | undefined;
      out.tipoItem = snap.tipoItem as string | undefined;
      out.preco = snap.preco as number | undefined;
    }
    if (base) {
      if (out.nome == null || String(out.nome).trim() === '') out.nome = base.nome;
      if (out.img == null) out.img = base.img;
      if (out.icone == null) out.icone = base.icone != null ? String(base.icone) : undefined;
      if (out.grade == null) out.grade = base.grade;
      if (out.tipoItem == null) out.tipoItem = String(base.tipo ?? '');
      if (out.tipo == null) out.tipo = (rawObj.tipo as string | undefined) ?? base.tipo;
      if (out.preco == null) out.preco = base.preco as number | undefined;
    } else if (Object.keys(rawObj).length) {
      if (out.nome == null) out.nome = rawObj.nome as string | undefined;
      if (out.img == null) out.img = rawObj.img as string | undefined;
      if (out.icone == null) out.icone = rawObj.icone as string | undefined;
      if (out.grade == null) out.grade = rawObj.grade as string | undefined;
      if (out.tipo == null) out.tipo = rawObj.tipo as string | undefined;
      if (out.tipoItem == null) out.tipoItem = rawObj.tipoItem as string | undefined;
    }
    if (out.nome == null || String(out.nome).trim() === '') {
      out.nome = row?.item_name ? String(row.item_name) : 'Item';
    }
    return out;
  },

  isListingActiveRow(row: MarketListingRow | null | undefined): boolean {
    if (!row || row.sold === true) return false;
    const st = row.status != null ? String(row.status).toLowerCase() : '';
    if (st === 'cancelled' || st === 'canceled') return false;
    return true;
  },

  mapRowToEntry(row: MarketListingRow | null | undefined): MarketListingEntry | null {
    if (!row) return null;

    let rawData = parseJsonField<Record<string, unknown>>(row.item_data) ?? {};
    const displayItem = this.displayItemFromRow(row);
    const fullItem =
      row.full_item ?? row.fullItem ?? (Object.keys(rawData).length ? rawData : null);

    let enchant = row.enchant != null ? Number(row.enchant) : 0;
    if (!enchant && rawData.enchant != null) enchant = Number(rawData.enchant);
    if (!enchant && rawData.enchantLevel != null) enchant = Number(rawData.enchantLevel);

    let qtd = row.qtd != null ? Number(row.qtd) : 1;
    if (qtd <= 0 && rawData.qtd != null) qtd = Math.max(1, Number(rawData.qtd) || 1);

    const cur = String(row.currency || 'adena').toLowerCase();
    const isCoin = cur === 'coin' || cur === 'ancient' || cur === 'ancientcoin';

    return {
      id: row.id,
      vendedor: row.seller_char_name || row.seller_name || 'Unknown',
      isBot: false,
      item: displayItem,
      fullItem,
      enchant,
      preco: Number(row.price) || 0,
      moeda: isCoin ? 'coin' : 'adena',
      categoria: row.categoria || row.category || 'mats',
      qtd,
      _cloud: true,
      _createdAt: row.created_at,
    };
  },

  async fetchListingsWithMeta(): Promise<{ listings: MarketListingEntry[]; error?: string }> {
    if (!this.isAvailable() || !window.SupabaseAPI.client) {
      return { listings: [], error: 'cloud_unavailable' };
    }

    const client = window.SupabaseAPI.client;
    const { data, error } = await marketListingsTable(client)
      .select('*')
      .eq('sold', false)
      .order('created_at', { ascending: false });

    if (error && String(error.message || '').toLowerCase().includes('column')) {
      const fallback = await marketListingsTable(client)
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (fallback.error) {
        console.error('[MarketCloud] fetchListings:', fallback.error.message);
        return { listings: [], error: 'rpc_error' };
      }
      const listings = (fallback.data ?? [])
        .filter((r) => this.isListingActiveRow(r))
        .map((r) => this.mapRowToEntry(r))
        .filter((e): e is MarketListingEntry => e != null);
      return { listings };
    }

    if (error) {
      console.error('[MarketCloud] fetchListings:', error.message);
      return { listings: [], error: 'rpc_error' };
    }

    const listings = (data ?? [])
      .filter((r) => this.isListingActiveRow(r))
      .map((r) => this.mapRowToEntry(r))
      .filter((e): e is MarketListingEntry => e != null);
    return { listings };
  },

  async fetchListings(): Promise<MarketListingEntry[]> {
    const result = await this.fetchListingsWithMeta();
    return result.listings;
  },

  async publishListing(payload: MarketPublishPayload): Promise<MarketOperationResult> {
    if (!this.isAvailable() || !window.SupabaseAPI.client) {
      return { ok: false, error: 'cloud_unavailable' };
    }
    if (!payload?.seller_char_name || payload.price == null) {
      return { ok: false, error: 'invalid_params' };
    }

    const { data, error } = await window.SupabaseAPI.client.rpc('market_publish_listing', {
      p_seller_char_name: payload.seller_char_name,
      p_price: Math.floor(Number(payload.price)) || 0,
      p_currency: payload.currency === 'coin' ? 'coin' : 'adena',
      p_categoria: payload.categoria || 'mats',
      p_qtd: Math.max(1, Math.floor(Number(payload.qtd) || 1)),
      p_enchant: Math.floor(Number(payload.enchant) || 0),
      p_item_snapshot: payload.item_snapshot || {},
      p_full_item: payload.full_item ?? null,
      p_fee: this.LISTING_FEE_ADENA,
    });

    if (error) {
      console.error('[MarketCloud] publishListing RPC:', rpcErrorMessage(error));
      return { ok: false, error: 'rpc_error', message: rpcErrorMessage(error) };
    }

    const rpc = (data ?? {}) as MarketRpcPayload;
    const okPub = !!(rpc.ok === true || rpc.success === true);
    if (!okPub) {
      const code = rpc.error || rpc.message ? String(rpc.error || rpc.message) : 'publish_failed';
      console.warn('[MarketCloud] publishListing denied:', code, rpc);
      return { ok: false, error: code, details: rpc };
    }

    const entry = rpc.listing ? this.mapRowToEntry(rpc.listing) : null;
    if (!entry) {
      return { ok: false, error: 'invalid_listing_payload', details: rpc };
    }

    return {
      ok: true,
      entry,
      listingFeeAdena: Number(rpc.listing_fee_adena) || this.LISTING_FEE_ADENA,
      balances: {
        adenas: Number(rpc.seller_adenas) || 0,
        ancientCoins: Number(rpc.seller_ancient_coins) || 0,
      },
    };
  },

  async cancelListing(listingId: string, sellerCharName: string): Promise<MarketOperationResult> {
    if (!this.isAvailable() || !window.SupabaseAPI.client) {
      return { ok: false, error: 'cloud_unavailable' };
    }

    const client = window.SupabaseAPI.client;
    const { data: rpcData, error: rpcError } = await client.rpc('market_cancel_listing', {
      p_listing_id: listingId,
      p_seller_char_name: sellerCharName,
    });

    const rpc = rpcData as MarketRpcPayload | null;
    if (!rpcError && rpc && (rpc.ok === true || rpc.success === true)) {
      return { ok: true, cancelled: true };
    }
    if (rpc && (rpc.ok === false || rpc.success === false)) {
      const code = rpc.error ? String(rpc.error) : 'cancel_failed';
      return { ok: false, error: code, details: rpc };
    }
    if (
      rpcError &&
      !rpcErrorMessage(rpcError).toLowerCase().includes('could not find the function')
    ) {
      console.error('[MarketCloud] cancelListing RPC:', rpcErrorMessage(rpcError));
      return { ok: false, error: 'rpc_error', message: rpcErrorMessage(rpcError) };
    }

    const { data, error } = await marketListingsTable(client)
      .update({ sold: true, payout_claimed: true, buyer_name: null })
      .eq('id', listingId)
      .eq('seller_char_name', sellerCharName)
      .eq('sold', false)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[MarketCloud] cancelListing:', error.message);
      return { ok: false, error: 'rpc_error', message: error.message };
    }
    if (!data) {
      return { ok: false, error: 'listing_not_available' };
    }
    return { ok: true, cancelled: true };
  },

  async completePurchase(
    listingId: string,
    buyerCharName: string,
  ): Promise<MarketOperationResult> {
    if (!this.isAvailable() || !window.SupabaseAPI.client) {
      return { ok: false, error: 'cloud_unavailable' };
    }
    if (!buyerCharName || !listingId) {
      return { ok: false, error: 'invalid_params' };
    }

    const { data, error } = await window.SupabaseAPI.client.rpc('market_purchase_listing', {
      p_listing_id: listingId,
      p_buyer_name: buyerCharName,
    });

    if (error) {
      console.error('[MarketCloud] completePurchase RPC:', rpcErrorMessage(error));
      return { ok: false, error: 'rpc_error', message: rpcErrorMessage(error) };
    }

    const rpc = (data ?? {}) as MarketRpcPayload;
    const ok = !!(rpc.ok === true || rpc.success === true);
    if (!ok) {
      const code = rpc.error || rpc.message ? String(rpc.error || rpc.message) : 'purchase_failed';
      console.warn('[MarketCloud] completePurchase denied:', code, rpc);
      return { ok: false, error: code, details: rpc };
    }

    const row =
      rpc.listing && typeof rpc.listing === 'object'
        ? rpc.listing
        : null;
    const entry = this.mapRowToEntry(
      row && row.id != null ? row : row ? { ...row, id: listingId } : null,
    );
    if (!entry) {
      return { ok: false, error: 'invalid_listing_payload', details: rpc };
    }

    return {
      ok: true,
      entry,
      balances: {
        adenas: Number(rpc.buyer_adenas) || 0,
        ancientCoins: Number(rpc.buyer_ancient_coins) || 0,
      },
    };
  },

  async claimPendingPayouts(sellerCharName: string): Promise<MarketOperationResult> {
    if (!this.isAvailable() || !window.SupabaseAPI.client || !sellerCharName) {
      return { ok: false, error: 'cloud_unavailable' };
    }

    const { data, error } = await window.SupabaseAPI.client.rpc('market_claim_payouts', {
      p_seller_char_name: sellerCharName,
    });

    if (error) {
      console.error('[MarketCloud] claimPendingPayouts RPC:', rpcErrorMessage(error));
      return { ok: false, error: 'rpc_error', message: rpcErrorMessage(error) };
    }

    const rpc = (data ?? {}) as MarketRpcPayload;
    if (!rpc || rpc.ok === false) {
      return { ok: false, error: rpc?.error || 'claim_failed', details: rpc || {} };
    }

    let payouts: unknown[] = [];
    const rawPayouts = rpc.payouts;
    if (typeof rawPayouts === 'string') {
      payouts = parseJsonField<unknown[]>(rawPayouts) ?? [];
    } else if (Array.isArray(rawPayouts)) {
      payouts = rawPayouts;
    }

    return { ok: true, payouts };
  },

  subscribeListings(onRefresh: () => void) {
    if (!this.isAvailable() || !window.SupabaseAPI.client || listingsRealtimeChannel) return;

    const client = window.SupabaseAPI.client as SupabaseClientLite & {
      channel: (name: string) => RealtimeChannel;
      removeChannel: (ch: RealtimeChannel) => void;
    };

    listingsRealtimeChannel = client
      .channel('market-listings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_listings' }, () => {
        if (listingsDebounceTimer) clearTimeout(listingsDebounceTimer);
        listingsDebounceTimer = setTimeout(() => onRefresh(), 280);
      });
    listingsRealtimeChannel.subscribe();
  },

  unsubscribeListings() {
    const client = window.SupabaseAPI.client as (SupabaseClientLite & {
      removeChannel: (ch: RealtimeChannel) => void;
    }) | null;
    if (listingsRealtimeChannel && client) {
      try {
        client.removeChannel(listingsRealtimeChannel);
      } catch {
        /* ignore */
      }
      listingsRealtimeChannel = null;
    }
  },
};

registerGlobal('MarketCloud', MarketCloud);

export {};
