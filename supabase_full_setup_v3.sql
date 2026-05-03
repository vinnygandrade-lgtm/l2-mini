-- ========================================================
-- L2 MINI - SUPABASE MASTER SETUP (V3.0 - FINAL MULTIPLAYER)
-- Este script contém TODA a infraestrutura unificada e segura.
-- Inclui: Mailbox, Clãs, Chat de Clã, Castelos/Siege, Loot, Enchant, Augment, Craft e Status.
-- ========================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. LIMPEZA DE SEGURANÇA (Execute manualmente se houver erro de tipo)
-- DROP TABLE IF EXISTS public.clan_chat_messages CASCADE;
-- DROP TABLE IF EXISTS public.clan_applications CASCADE;
-- DROP TABLE IF EXISTS public.clan_members CASCADE;
-- DROP TABLE IF EXISTS public.clans CASCADE;
-- DROP TABLE IF EXISTS public.mailbox CASCADE;
-- DROP TABLE IF EXISTS public.castles CASCADE;

-- ========================================================
-- 3. TABELAS BASE
-- ========================================================

-- MAILBOX
CREATE TABLE IF NOT EXISTS public.mailbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_name TEXT NOT NULL,
    sender_name TEXT NOT NULL DEFAULT 'System',
    subject TEXT NOT NULL,
    type TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CLANS
CREATE TABLE IF NOT EXISTS public.clans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    tag TEXT NOT NULL UNIQUE,
    logo TEXT NOT NULL DEFAULT '🏰',
    leader_name TEXT NOT NULL REFERENCES public.characters(char_name),
    level INTEGER NOT NULL DEFAULT 1,
    min_level INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clan_members (
    clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    char_name TEXT NOT NULL REFERENCES public.characters(char_name) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (clan_id, char_name)
);

CREATE TABLE IF NOT EXISTS public.clan_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    char_name TEXT NOT NULL REFERENCES public.characters(char_name) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(clan_id, char_name)
);

-- CLAN CHAT
CREATE TABLE IF NOT EXISTS public.clan_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    char_name TEXT NOT NULL,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 100),
    tier TEXT NOT NULL DEFAULT 'Paper',
    ascension_title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CASTLES
CREATE TABLE IF NOT EXISTS public.castles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_clan_id UUID REFERENCES public.clans(id) ON DELETE SET NULL,
    treasury BIGINT NOT NULL DEFAULT 0,
    last_siege_at TIMESTAMPTZ,
    tax_rate INTEGER NOT NULL DEFAULT 5,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================
-- 4. SEGURANÇA (RLS)
-- ========================================================

ALTER TABLE public.mailbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.castles ENABLE ROW LEVEL SECURITY;

-- Mailbox Policies
DROP POLICY IF EXISTS "Recipient can select own mail" ON public.mailbox;
DROP POLICY IF EXISTS "Recipient can update own mail status" ON public.mailbox;
DROP POLICY IF EXISTS "Recipient can delete own mail" ON public.mailbox;
CREATE POLICY "Recipient can select own mail" ON public.mailbox FOR SELECT USING (recipient_name IN (SELECT char_name FROM characters WHERE user_id::text = auth.uid()::text));
CREATE POLICY "Recipient can update own mail status" ON public.mailbox FOR UPDATE USING (recipient_name IN (SELECT char_name FROM characters WHERE user_id::text = auth.uid()::text));
CREATE POLICY "Recipient can delete own mail" ON public.mailbox FOR DELETE USING (recipient_name IN (SELECT char_name FROM characters WHERE user_id::text = auth.uid()::text));

-- Clan Policies
DROP POLICY IF EXISTS "Public clans view" ON public.clans;
DROP POLICY IF EXISTS "Public members view" ON public.clan_members;
DROP POLICY IF EXISTS "Leader can update clan" ON public.clans;
DROP POLICY IF EXISTS "Applications view" ON public.clan_applications;
CREATE POLICY "Public clans view" ON public.clans FOR SELECT USING (true);
CREATE POLICY "Public members view" ON public.clan_members FOR SELECT USING (true);
CREATE POLICY "Leader can update clan" ON public.clans FOR UPDATE USING (leader_name IN (SELECT char_name FROM characters WHERE user_id::text = auth.uid()::text));
CREATE POLICY "Applications view" ON public.clan_applications FOR SELECT USING (char_name IN (SELECT char_name FROM characters WHERE user_id::text = auth.uid()::text) OR clan_id IN (SELECT id FROM clans WHERE leader_name IN (SELECT char_name FROM characters WHERE user_id::text = auth.uid()::text)));

-- Clan Chat Policies
DROP POLICY IF EXISTS "Clan members can view chat" ON public.clan_chat_messages;
DROP POLICY IF EXISTS "Clan members can insert chat" ON public.clan_chat_messages;
CREATE POLICY "Clan members can view chat" ON public.clan_chat_messages FOR SELECT USING (clan_id IN (SELECT cm.clan_id FROM public.clan_members cm JOIN public.characters c ON c.char_name = cm.char_name WHERE c.user_id::text = auth.uid()::text));
CREATE POLICY "Clan members can insert chat" ON public.clan_chat_messages FOR INSERT WITH CHECK (clan_id IN (SELECT cm.clan_id FROM public.clan_members cm JOIN public.characters c ON c.char_name = cm.char_name WHERE c.user_id::text = auth.uid()::text) AND char_name IN (SELECT char_name FROM public.characters WHERE user_id::text = auth.uid()::text));

-- Castle Policies
DROP POLICY IF EXISTS "Public castles view" ON public.castles;
CREATE POLICY "Public castles view" ON public.castles FOR SELECT USING (true);

-- ========================================================
-- 5. RPCs: SISTEMA SEGURO
-- ========================================================

-- COMUNICAÇÃO
CREATE OR REPLACE FUNCTION send_mail_secure(p_recipient_name TEXT, p_subject TEXT, p_type TEXT, p_details JSONB) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_sender_name TEXT;
BEGIN
    IF p_type = 'player' THEN
        SELECT char_name INTO v_sender_name FROM characters WHERE user_id::text = auth.uid()::text LIMIT 1;
        IF v_sender_name IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'sender_not_found'); END IF;
    ELSE v_sender_name := 'System'; END IF;
    INSERT INTO public.mailbox (recipient_name, sender_name, subject, type, details) VALUES (p_recipient_name, v_sender_name, p_subject, p_type, p_details);
    RETURN jsonb_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION claim_mail_reward(p_mail_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_mail_record RECORD; v_char_record RECORD; v_data JSONB; v_inv_equips JSONB; v_inv_mats JSONB; v_details JSONB; v_reward_adena BIGINT := 0; v_reward_ancient INTEGER := 0; v_reward_item JSONB := NULL;
BEGIN
    SELECT * INTO v_mail_record FROM public.mailbox WHERE id = p_mail_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'mail_not_found'); END IF;
    IF v_mail_record.is_claimed THEN RETURN jsonb_build_object('success', false, 'error', 'already_claimed'); END IF;
    SELECT * INTO v_char_record FROM characters WHERE char_name = v_mail_record.recipient_name;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'character_not_found'); END IF;
    IF v_char_record.user_id::text != auth.uid()::text THEN RETURN jsonb_build_object('success', false, 'error', 'not_authorized'); END IF;
    v_data := v_char_record.data; v_inv_equips := COALESCE(v_data->'inventarioEquips', '[]'::JSONB); v_inv_mats := COALESCE(v_data->'inventario', '{}'::JSONB); v_details := v_mail_record.details;
    IF v_mail_record.type = 'market' THEN
        IF v_details->>'marketKind' = 'sale_proceeds' THEN IF v_details->>'moeda' = 'adena' THEN v_reward_adena := (v_details->>'valor')::BIGINT; ELSE v_reward_ancient := (v_details->>'valor')::INTEGER; END IF;
        ELSIF v_details->>'marketKind' = 'purchase_delivery' THEN
            IF v_details->>'categoria' = 'equips' THEN v_reward_item := v_details->'fullItem'; IF v_reward_item->>'uid' IS NULL THEN v_reward_item := v_reward_item || jsonb_build_object('uid', 'uid_' || encode(gen_random_bytes(6), 'hex')); END IF;
            ELSE DECLARE v_item_nome TEXT := v_details->'itemSnapshot'->>'nome'; v_item_qtd INTEGER := (v_details->>'qtd')::INTEGER; BEGIN v_inv_mats := v_inv_mats || jsonb_build_object(v_item_nome, COALESCE((v_inv_mats->>v_item_nome)::INTEGER, 0) + v_item_qtd); END; END IF;
        END IF;
    ELSIF v_mail_record.type = 'player' THEN v_reward_adena := (v_details->>'adena')::BIGINT;
    ELSIF v_mail_record.type = 'system' AND v_details ? 'recompensas' THEN
        DECLARE v_rec JSONB; BEGIN FOR v_rec IN SELECT * FROM jsonb_array_elements(v_details->'recompensas') LOOP
            IF (v_rec->>'id') ILIKE 'ancient%coin%' THEN v_reward_ancient := v_reward_ancient + (v_rec->>'qtd')::INTEGER;
            ELSIF (v_rec->>'id') ILIKE 'adena' THEN v_reward_adena := v_reward_adena + (v_rec->>'qtd')::BIGINT;
            ELSE v_inv_mats := v_inv_mats || jsonb_build_object(v_rec->>'id', COALESCE((v_inv_mats->>v_rec->>'id')::INTEGER, 0) + (v_rec->>'qtd')::INTEGER); END IF;
        END LOOP; END;
    END IF;
    IF v_reward_adena > 0 THEN v_data := v_data || jsonb_build_object('adenas', COALESCE((v_data->>'adenas')::BIGINT, 0) + v_reward_adena); END IF;
    IF v_reward_ancient > 0 THEN v_data := v_data || jsonb_build_object('ancientCoins', COALESCE((v_data->>'ancientCoins')::INTEGER, 0) + v_reward_ancient); END IF;
    IF v_reward_item IS NOT NULL THEN v_inv_equips := v_inv_equips || v_reward_item; END IF;
    v_data := v_data || jsonb_build_object('inventario', v_inv_mats, 'inventarioEquips', v_inv_equips);
    UPDATE characters SET data = v_data, updated_at = NOW() WHERE char_name = v_char_record.char_name;
    UPDATE public.mailbox SET is_claimed = TRUE, is_read = TRUE WHERE id = p_mail_id;
    RETURN jsonb_build_object('success', true, 'reward_adena', v_reward_adena, 'reward_ancient', v_reward_ancient, 'item_added', v_reward_item IS NOT NULL);
END; $$;

-- CLÃS
CREATE OR REPLACE FUNCTION create_clan_secure(p_char_name TEXT, p_clan_name TEXT, p_clan_tag TEXT, p_logo TEXT, p_min_level INTEGER) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_char_record RECORD; v_new_clan_id UUID; v_cost CONSTANT INTEGER := 50000;
BEGIN
    SELECT * INTO v_char_record FROM characters WHERE char_name = p_char_name;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'character_not_found'); END IF;
    IF v_char_record.user_id::text != auth.uid()::text THEN RETURN jsonb_build_object('success', false, 'error', 'not_authorized'); END IF;
    IF EXISTS (SELECT 1 FROM public.clan_members WHERE char_name = p_char_name) THEN RETURN jsonb_build_object('success', false, 'error', 'already_in_clan'); END IF;
    IF (v_char_record.data->>'adenas')::BIGINT < v_cost THEN RETURN jsonb_build_object('success', false, 'error', 'insufficient_adena'); END IF;
    INSERT INTO public.clans (name, tag, logo, leader_name, min_level) VALUES (p_clan_name, p_clan_tag, p_logo, p_char_name, p_min_level) RETURNING id INTO v_new_clan_id;
    INSERT INTO public.clan_members (clan_id, char_name) VALUES (v_new_clan_id, p_char_name);
    UPDATE characters SET data = data || jsonb_build_object('adenas', (data->>'adenas')::BIGINT - v_cost) WHERE char_name = p_char_name;
    RETURN jsonb_build_object('success', true, 'clan_id', v_new_clan_id);
END; $$;

CREATE OR REPLACE FUNCTION apply_to_clan(p_char_name TEXT, p_clan_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_char_record RECORD; v_clan_record RECORD;
BEGIN
    SELECT * INTO v_char_record FROM characters WHERE char_name = p_char_name;
    IF v_char_record.user_id::text != auth.uid()::text THEN RETURN jsonb_build_object('success', false, 'error', 'not_authorized'); END IF;
    SELECT * INTO v_clan_record FROM clans WHERE id = p_clan_id;
    IF (v_char_record.data->>'nivel')::INTEGER < v_clan_record.min_level THEN RETURN jsonb_build_object('success', false, 'error', 'level_too_low'); END IF;
    INSERT INTO public.clan_applications (clan_id, char_name) VALUES (p_clan_id, p_char_name);
    RETURN jsonb_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION respond_clan_application(p_leader_char_name TEXT, p_application_id UUID, p_accept BOOLEAN) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_app_record RECORD; v_clan_record RECORD;
BEGIN
    SELECT * INTO v_app_record FROM clan_applications WHERE id = p_application_id;
    SELECT * INTO v_clan_record FROM clans WHERE id = v_app_record.clan_id;
    IF v_clan_record.leader_name != p_leader_char_name THEN RETURN jsonb_build_object('success', false, 'error', 'not_leader'); END IF;
    IF p_accept THEN INSERT INTO public.clan_members (clan_id, char_name) VALUES (v_app_record.clan_id, v_app_record.char_name) ON CONFLICT DO NOTHING; END IF;
    DELETE FROM clan_applications WHERE id = p_application_id;
    RETURN jsonb_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION insert_clan_chat_secure(p_clan_id UUID, p_body TEXT, p_tier TEXT, p_ascension_title TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_char_name TEXT;
BEGIN
    SELECT cm.char_name INTO v_char_name FROM public.clan_members cm JOIN public.characters c ON c.char_name = cm.char_name WHERE cm.clan_id = p_clan_id AND c.user_id::text = auth.uid()::text LIMIT 1;
    IF v_char_name IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_a_member'); END IF;
    INSERT INTO public.clan_chat_messages (clan_id, char_name, body, tier, ascension_title) VALUES (p_clan_id, v_char_name, p_body, p_tier, p_ascension_title);
    RETURN jsonb_build_object('success', true);
END; $$;

-- DOMINAÇÃO (SIEGE)
CREATE OR REPLACE FUNCTION claim_castle_victory(p_char_name TEXT, p_castle_id TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_char_record RECORD; v_clan_id UUID; v_castle_record RECORD;
BEGIN
    SELECT * INTO v_char_record FROM characters WHERE char_name = p_char_name;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'character_not_found'); END IF;
    IF v_char_record.user_id::text != auth.uid()::text THEN RETURN jsonb_build_object('success', false, 'error', 'not_authorized'); END IF;
    SELECT clan_id INTO v_clan_id FROM clan_members WHERE char_name = p_char_name LIMIT 1;
    IF v_clan_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'no_clan'); END IF;
    SELECT * INTO v_castle_record FROM castles WHERE id = p_castle_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'castle_not_found'); END IF;
    UPDATE public.castles SET owner_clan_id = v_clan_id, last_siege_at = NOW(), updated_at = NOW() WHERE id = p_castle_id;
    RETURN jsonb_build_object('success', true, 'castle_name', v_castle_record.name, 'new_owner_id', v_clan_id);
END; $$;

CREATE OR REPLACE FUNCTION withdraw_castle_treasury(p_char_name TEXT, p_castle_id TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_char_record RECORD; v_clan_record RECORD; v_castle_record RECORD; v_amount BIGINT;
BEGIN
    SELECT * INTO v_char_record FROM characters WHERE char_name = p_char_name;
    IF v_char_record.user_id::text != auth.uid()::text THEN RETURN jsonb_build_object('success', false, 'error', 'not_authorized'); END IF;
    SELECT * INTO v_clan_record FROM clans WHERE leader_name = p_char_name LIMIT 1;
    IF v_clan_record IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_a_leader'); END IF;
    SELECT * INTO v_castle_record FROM castles WHERE id = p_castle_id;
    IF v_castle_record.owner_clan_id != v_clan_record.id THEN RETURN jsonb_build_object('success', false, 'error', 'not_castle_owner'); END IF;
    v_amount := v_castle_record.treasury; IF v_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'treasury_empty'); END IF;
    UPDATE public.castles SET treasury = 0, updated_at = NOW() WHERE id = p_castle_id;
    UPDATE public.characters SET data = data || jsonb_build_object('adenas', (data->>'adenas')::BIGINT + v_amount) WHERE char_name = p_char_name;
    RETURN jsonb_build_object('success', true, 'amount_withdrawn', v_amount);
END; $$;

-- MECÂNICAS DE JOGO
CREATE OR REPLACE FUNCTION validate_mob_loot(p_char_name TEXT, p_mob_id TEXT, p_zone_name TEXT, p_is_champion BOOLEAN, p_is_spoiled BOOLEAN, p_mob_level INTEGER) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_char_record RECORD; v_data JSONB; v_level INTEGER; v_ancient_coins INTEGER := 0; v_chance_coin FLOAT; v_base_coins INTEGER := 1; v_chance_recipe FLOAT := 0.1; v_recipe_dropped TEXT := NULL; v_recipes TEXT[] := ARRAY['Recipe: Vesper Noble Heavy', 'Recipe: Vesper Noble Light', 'Recipe: Vesper Noble Robe', 'Recipe: Vesper Weapon', 'Recipe: Vesper Jewel'];
BEGIN
    SELECT * INTO v_char_record FROM characters WHERE char_name = p_char_name;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'character_not_found'); END IF;
    IF v_char_record.user_id::text != auth.uid()::text THEN RETURN jsonb_build_object('success', false, 'error', 'not_authorized'); END IF;
    v_data := v_char_record.data; v_level := (v_data->>'nivel')::INTEGER;
    IF (v_level - p_mob_level) >= 20 THEN v_chance_coin := 0; ELSE v_chance_coin := CASE WHEN p_is_spoiled THEN 7.0 ELSE 3.5 END; END IF;
    IF v_chance_coin > 0 AND (random() * 100) <= v_chance_coin THEN
        IF p_zone_name LIKE '%Ruins%' THEN v_base_coins := 2; ELSIF p_zone_name LIKE '%Death Pass%' THEN v_base_coins := 5; ELSIF p_zone_name LIKE '%Dragon Valley%' THEN v_base_coins := 10; ELSIF p_zone_name LIKE '%Insolence%' THEN v_base_coins := 22; ELSIF p_zone_name LIKE '%Imperial%' THEN v_base_coins := 52; END IF;
        v_ancient_coins := CASE WHEN p_is_champion THEN (v_base_coins * 2) ELSE v_base_coins END;
    END IF;
    IF p_zone_name LIKE '%Imperial%' OR p_zone_name LIKE '%Dragon%' THEN v_chance_recipe := CASE WHEN p_is_champion THEN 0.5 ELSE 0.1 END; IF (random() * 100) <= v_chance_recipe THEN v_recipe_dropped := v_recipes[floor(random() * array_length(v_recipes, 1)) + 1]; END IF; END IF;
    IF v_ancient_coins > 0 OR v_recipe_dropped IS NOT NULL THEN
        IF v_ancient_coins > 0 THEN v_data := v_data || jsonb_build_object('ancientCoins', (COALESCE((v_data->>'ancientCoins')::INTEGER, 0) + v_ancient_coins)); END IF;
        IF v_recipe_dropped IS NOT NULL THEN DECLARE v_inv JSONB := COALESCE(v_data->'inventario', '{}'::JSONB); BEGIN v_inv := v_inv || jsonb_build_object(v_recipe_dropped, (COALESCE((v_inv->>v_recipe_dropped)::INTEGER, 0) + 1)); v_data := v_data || jsonb_build_object('inventario', v_inv); END; END IF;
        UPDATE characters SET data = v_data, updated_at = NOW() WHERE char_name = p_char_name;
    END IF;
    RETURN jsonb_build_object('success', true, 'ancient_coins', v_ancient_coins, 'recipe_dropped', v_recipe_dropped);
END; $$;

CREATE OR REPLACE FUNCTION enchant_item(p_char_name TEXT, p_item_uid TEXT, p_scroll_name TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_char_record RECORD; v_data JSONB; v_inv_equips JSONB; v_inv_mats JSONB; v_item JSONB := NULL; v_item_idx INTEGER := -1; v_is_equipped BOOLEAN := FALSE; v_slot_key TEXT; v_lvl_atual INTEGER; v_chance INTEGER; v_roll INTEGER; v_success BOOLEAN; v_is_blessed BOOLEAN; v_scroll_grade TEXT; v_scroll_type TEXT; v_item_grade TEXT; v_item_type TEXT; v_chances INTEGER[] := ARRAY[66, 63, 60, 57, 54, 51, 48, 45, 42, 39, 36, 33, 30, 27, 24, 21, 18, 15, 12, 8, 4, 1];
BEGIN
    SELECT * INTO v_char_record FROM characters WHERE char_name = p_char_name;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'character_not_found'); END IF;
    IF v_char_record.user_id::text != auth.uid()::text THEN RETURN jsonb_build_object('success', false, 'error', 'not_authorized'); END IF;
    v_data := v_char_record.data; v_inv_equips := COALESCE(v_data->'inventarioEquips', '[]'::JSONB); v_inv_mats := COALESCE(v_data->'inventario', '{}'::JSONB);
    IF (v_data->'armaEquipadaBase'->>'uid') = p_item_uid THEN v_item := v_data->'armaEquipadaBase'; v_is_equipped := TRUE; v_slot_key := 'armaEquipadaBase';
    ELSIF (v_data->'armaduraEquipada'->>'uid') = p_item_uid THEN v_item := v_data->'armaduraEquipada'; v_is_equipped := TRUE; v_slot_key := 'armaduraEquipada';
    ELSIF (v_data->'colarEquipado'->>'uid') = p_item_uid THEN v_item := v_data->'colarEquipado'; v_is_equipped := TRUE; v_slot_key := 'colarEquipado';
    ELSIF (v_data->'brincoEquipado1'->>'uid') = p_item_uid THEN v_item := v_data->'brincoEquipado1'; v_is_equipped := TRUE; v_slot_key := 'brincoEquipado1';
    ELSIF (v_data->'brincoEquipado2'->>'uid') = p_item_uid THEN v_item := v_data->'brincoEquipado2'; v_is_equipped := TRUE; v_slot_key := 'brincoEquipado2';
    ELSIF (v_data->'anelEquipado1'->>'uid') = p_item_uid THEN v_item := v_data->'anelEquipado1'; v_is_equipped := TRUE; v_slot_key := 'anelEquipado1';
    ELSIF (v_data->'anelEquipado2'->>'uid') = p_item_uid THEN v_item := v_data->'anelEquipado2'; v_is_equipped := TRUE; v_slot_key := 'anelEquipado2'; END IF;
    IF v_item IS NULL THEN FOR i IN 0..jsonb_array_length(v_inv_equips)-1 LOOP IF (v_inv_equips->i->>'uid') = p_item_uid THEN v_item := v_inv_equips->i; v_item_idx := i; EXIT; END IF; END LOOP; END IF;
    IF v_item IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'item_not_found'); END IF;
    IF (v_inv_mats->>p_scroll_name)::INTEGER <= 0 OR v_inv_mats->>p_scroll_name IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'insufficient_scrolls'); END IF;
    v_is_blessed := (p_scroll_name LIKE '%Blessed%'); v_scroll_grade := CASE WHEN p_scroll_name LIKE '%(NG)%' THEN 'No-Grade' WHEN p_scroll_name LIKE '%(D)%' THEN 'D' WHEN p_scroll_name LIKE '%(C)%' THEN 'C' WHEN p_scroll_name LIKE '%(B)%' THEN 'B' WHEN p_scroll_name LIKE '%(A)%' THEN 'A' WHEN p_scroll_name LIKE '%(S)%' THEN 'S' ELSE NULL END;
    v_scroll_type := CASE WHEN p_scroll_name LIKE '%Weapon%' THEN 'weapon' ELSE 'armor' END; v_item_grade := v_item->'base'->>'grade'; v_item_type := v_item->>'tipo';
    IF v_item_grade = 'No-Grade' OR v_scroll_grade != v_item_grade OR (v_scroll_type = 'weapon' AND v_item_type != 'weapon') OR (v_scroll_type = 'armor' AND v_item_type NOT IN ('armor', 'jewel')) THEN RETURN jsonb_build_object('success', false, 'error', 'incompatible_scroll'); END IF;
    v_lvl_atual := COALESCE((v_item->>'enchant')::INTEGER, 0); IF v_lvl_atual >= 25 THEN RETURN jsonb_build_object('success', false, 'error', 'max_level_reached'); END IF;
    v_chance := CASE WHEN v_lvl_atual < 3 THEN 100 ELSE v_chances[v_lvl_atual - 2] END; v_roll := floor(random() * 100) + 1; v_success := (v_roll <= v_chance);
    v_inv_mats := v_inv_mats || jsonb_build_object(p_scroll_name, (v_inv_mats->>p_scroll_name)::INTEGER - 1); IF (v_inv_mats->>p_scroll_name)::INTEGER <= 0 THEN v_inv_mats := v_inv_mats - p_scroll_name; END IF;
    IF v_success THEN v_lvl_atual := v_lvl_atual + 1; v_item := v_item || jsonb_build_object('enchant', v_lvl_atual); IF v_item->'base' IS NOT NULL THEN v_item := jsonb_set(v_item, '{base,enchant}', to_jsonb(v_lvl_atual)); END IF;
    ELSE IF NOT v_is_blessed THEN DECLARE v_ganho_cristais INTEGER := (v_lvl_atual * 10) + 50; BEGIN v_inv_mats := v_inv_mats || jsonb_build_object('Crystals', COALESCE((v_inv_mats->>'Crystals')::INTEGER, 0) + v_ganho_cristais); v_item := NULL; END; END IF; END IF;
    v_data := v_data || jsonb_build_object('inventario', v_inv_mats);
    IF v_is_equipped THEN IF v_item IS NULL THEN v_data := v_data - v_slot_key; ELSE v_data := v_data || jsonb_build_object(v_slot_key, v_item); END IF;
    ELSE IF v_item IS NULL THEN SELECT jsonb_agg(elem) INTO v_inv_equips FROM jsonb_array_elements(v_inv_equips) AS elem WHERE (elem->>'uid') != p_item_uid; ELSE v_inv_equips := jsonb_set(v_inv_equips, ARRAY[v_item_idx::TEXT], v_item); END IF; v_data := v_data || jsonb_build_object('inventarioEquips', COALESCE(v_inv_equips, '[]'::JSONB)); END IF;
    UPDATE characters SET data = v_data, updated_at = NOW() WHERE char_name = p_char_name;
    RETURN jsonb_build_object('success', true, 'enchant_success', v_success, 'new_level', CASE WHEN v_success THEN v_lvl_atual ELSE (CASE WHEN v_is_blessed THEN v_lvl_atual ELSE -1 END) END, 'crystallized', (NOT v_success AND NOT v_is_blessed), 'crystals_gained', CASE WHEN (NOT v_success AND NOT v_is_blessed) THEN (v_lvl_atual * 10) + 50 ELSE 0 END);
END; $$;

CREATE OR REPLACE FUNCTION augment_item(p_char_name TEXT, p_item_uid TEXT, p_stone_name TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_char_record RECORD; v_data JSONB; v_inv_equips JSONB; v_inv_mats JSONB; v_item JSONB := NULL; v_item_idx INTEGER := -1; v_is_equipped BOOLEAN := FALSE; v_slot_key TEXT; v_custo_adena CONSTANT INTEGER := 5000; v_custo_ancient CONSTANT INTEGER := 5; v_custo_stone CONSTANT INTEGER := 1; v_roll_lvl INTEGER; v_aug_level INTEGER; v_stat_pool JSONB[]; v_stat1 JSONB; v_stat2 JSONB; v_mult INTEGER;
BEGIN
    SELECT * INTO v_char_record FROM characters WHERE char_name = p_char_name;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'character_not_found'); END IF;
    IF v_char_record.user_id::text != auth.uid()::text THEN RETURN jsonb_build_object('success', false, 'error', 'not_authorized'); END IF;
    v_data := v_char_record.data; v_inv_equips := COALESCE(v_data->'inventarioEquips', '[]'::JSONB); v_inv_mats := COALESCE(v_data->'inventario', '{}'::JSONB);
    IF (v_data->'armaEquipadaBase'->>'uid') = p_item_uid THEN v_item := v_data->'armaEquipadaBase'; v_is_equipped := TRUE; v_slot_key := 'armaEquipadaBase'; END IF;
    IF v_item IS NULL THEN FOR i IN 0..jsonb_array_length(v_inv_equips)-1 LOOP IF (v_inv_equips->i->>'uid') = p_item_uid THEN v_item := v_inv_equips->i; v_item_idx := i; EXIT; END IF; END LOOP; END IF;
    IF v_item IS NULL OR (v_item->>'tipo') != 'weapon' THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_weapon'); END IF;
    IF COALESCE((v_data->>'adenas')::BIGINT, 0) < v_custo_adena OR COALESCE((v_data->>'ancientCoins')::INTEGER, 0) < v_custo_ancient OR COALESCE((v_inv_mats->>p_stone_name)::INTEGER, 0) < v_custo_stone THEN RETURN jsonb_build_object('success', false, 'error', 'insufficient_resources'); END IF;
    v_roll_lvl := floor(random() * 100) + 1; v_aug_level := CASE WHEN v_roll_lvl <= 50 THEN 1 WHEN v_roll_lvl <= 80 THEN 2 WHEN v_roll_lvl <= 93 THEN 3 WHEN v_roll_lvl <= 98 THEN 4 ELSE 5 END;
    v_mult := v_aug_level; v_stat_pool := ARRAY[jsonb_build_object('prop', 'augPAtk', 'txt', 'P. Atk', 'val', floor(random() * (15 * v_mult)) + (5 * v_mult)), jsonb_build_object('prop', 'augMAtk', 'txt', 'M. Atk', 'val', floor(random() * (15 * v_mult)) + (5 * v_mult)), jsonb_build_object('prop', 'augPDef', 'txt', 'P. Def', 'val', floor(random() * (10 * v_mult)) + (5 * v_mult)), jsonb_build_object('prop', 'augMDef', 'txt', 'M. Def', 'val', floor(random() * (10 * v_mult)) + (5 * v_mult)), jsonb_build_object('prop', 'augSpd', 'txt', 'Speed', 'val', floor(random() * (20 * v_mult)) + (10 * v_mult)), jsonb_build_object('prop', 'augCrit', 'txt', 'Crit Rate', 'val', floor(random() * (2 * v_mult)) + (1 * v_mult))];
    SELECT v_stat_pool[i] INTO v_stat1 FROM (SELECT generate_series(1, 6) AS i ORDER BY random() LIMIT 1) AS s; SELECT v_stat_pool[i] INTO v_stat2 FROM (SELECT generate_series(1, 6) AS i ORDER BY random() LIMIT 1) AS s WHERE v_stat_pool[i]->>'prop' != v_stat1->>'prop'; IF v_stat2 IS NULL THEN v_stat2 := v_stat_pool[CASE WHEN v_stat1->>'prop' = 'augPAtk' THEN 2 ELSE 1 END]; END IF;
    v_data := v_data || jsonb_build_object('adenas', (v_data->>'adenas')::BIGINT - v_custo_adena, 'ancientCoins', (v_data->>'ancientCoins')::INTEGER - v_custo_ancient);
    v_inv_mats := v_inv_mats || jsonb_build_object(p_stone_name, (v_inv_mats->>p_stone_name)::INTEGER - v_custo_stone); IF (v_inv_mats->>p_stone_name)::INTEGER <= 0 THEN v_inv_mats := v_inv_mats - p_stone_name; END IF;
    DECLARE v_base JSONB := v_item->'base'; BEGIN v_base := v_base || jsonb_build_object('augLevel', v_aug_level, 'augPAtk', 0, 'augMAtk', 0, 'augPDef', 0, 'augMDef', 0, 'augSpd', 0, 'augCrit', 0); v_base := v_base || jsonb_build_object(v_stat1->>'prop', (v_stat1->>'val')::INTEGER); v_base := v_base || jsonb_build_object(v_stat2->>'prop', (v_stat2->>'val')::INTEGER); v_item := v_item || jsonb_build_object('base', v_base, 'augmented', true); END;
    IF v_is_equipped THEN v_data := v_data || jsonb_build_object(v_slot_key, v_item); ELSE v_inv_equips := jsonb_set(v_inv_equips, ARRAY[v_item_idx::TEXT], v_item); v_data := v_data || jsonb_build_object('inventarioEquips', v_inv_equips); END IF;
    UPDATE characters SET data = v_data, updated_at = NOW() WHERE char_name = p_char_name;
    RETURN jsonb_build_object('success', true, 'aug_level', v_aug_level, 'stat1', v_stat1, 'stat2', v_stat2, 'item_updated', v_item);
END; $$;

CREATE OR REPLACE FUNCTION craft_item(p_char_name TEXT, p_recipe_id TEXT, p_choice_id_base TEXT DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_char_record RECORD; v_data JSONB; v_inv_equips JSONB; v_inv_mats JSONB; v_tipo_gerado TEXT; v_id_base_gerado TEXT; v_new_uid TEXT; v_item_resultado JSONB;
BEGIN
    SELECT * INTO v_char_record FROM characters WHERE char_name = p_char_name;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'character_not_found'); END IF;
    IF v_char_record.user_id::text != auth.uid()::text THEN RETURN jsonb_build_object('success', false, 'error', 'not_authorized'); END IF;
    v_data := v_char_record.data; v_inv_equips := COALESCE(v_data->'inventarioEquips', '[]'::JSONB); v_inv_mats := COALESCE(v_data->'inventario', '{}'::JSONB);
    IF p_recipe_id = 'rec_vesper_weapon_unified' THEN
        IF p_choice_id_base IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'choice_required'); END IF;
        IF COALESCE((v_inv_mats->>'Recipe: Vesper Weapon')::INTEGER, 0) < 1 OR COALESCE((v_inv_mats->>'Ancient Coin')::INTEGER, 0) < 2400 OR COALESCE((v_data->>'adenas')::BIGINT, 0) < 5800000 OR COALESCE((v_inv_mats->>'Life Stone')::INTEGER, 0) < 24 THEN RETURN jsonb_build_object('success', false, 'error', 'insufficient_mats'); END IF;
        v_tipo_gerado := 'weapon'; v_id_base_gerado := p_choice_id_base;
        v_inv_mats := v_inv_mats || jsonb_build_object('Recipe: Vesper Weapon', (v_inv_mats->>'Recipe: Vesper Weapon')::INTEGER - 1, 'Ancient Coin', (v_inv_mats->>'Ancient Coin')::INTEGER - 2400, 'Life Stone', (v_inv_mats->>'Life Stone')::INTEGER - 24);
        v_data := v_data || jsonb_build_object('adenas', (v_data->>'adenas')::BIGINT - 5800000);
    ELSIF p_recipe_id = 'rec_vesper_heavy' THEN
        IF COALESCE((v_inv_mats->>'Recipe: Vesper Noble Heavy')::INTEGER, 0) < 1 OR COALESCE((v_inv_mats->>'Ancient Coin')::INTEGER, 0) < 1400 OR COALESCE((v_data->>'adenas')::BIGINT, 0) < 2800000 THEN RETURN jsonb_build_object('success', false, 'error', 'insufficient_mats'); END IF;
        v_tipo_gerado := 'armor'; v_id_base_gerado := 'arm_s_vesper_heavy';
        v_inv_mats := v_inv_mats || jsonb_build_object('Recipe: Vesper Noble Heavy', (v_inv_mats->>'Recipe: Vesper Noble Heavy')::INTEGER - 1, 'Ancient Coin', (v_inv_mats->>'Ancient Coin')::INTEGER - 1400);
        v_data := v_data || jsonb_build_object('adenas', (v_data->>'adenas')::BIGINT - 2800000);
    ELSE RETURN jsonb_build_object('success', false, 'error', 'recipe_not_implemented'); END IF;
    v_new_uid := 'uid_' || encode(gen_random_bytes(6), 'hex'); v_item_resultado := jsonb_build_object('uid', v_new_uid, 'tipo', v_tipo_gerado, 'idBase', v_id_base_gerado, 'enchant', 0, 'augmented', false, 'origin', 'Craft');
    v_inv_equips := v_inv_equips || v_item_resultado; v_data := v_data || jsonb_build_object('inventario', v_inv_mats, 'inventarioEquips', v_inv_equips);
    UPDATE characters SET data = v_data, updated_at = NOW() WHERE char_name = p_char_name;
    RETURN jsonb_build_object('success', true, 'item_crafted', v_item_resultado);
END; $$;

CREATE OR REPLACE FUNCTION claim_weekly_ascension(p_char_name TEXT, p_week_key TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_char_record RECORD; v_data JSONB; v_endgame JSONB; v_level INTEGER; v_weekly_kills INTEGER; v_last_claimed TEXT; v_sgrade_level CONSTANT INTEGER := 76; v_target_kills CONSTANT INTEGER := 35; v_reward_adena CONSTANT INTEGER := 1200000; v_reward_ancient CONSTANT INTEGER := 400; v_reward_renown CONSTANT INTEGER := 25;
BEGIN
    SELECT * INTO v_char_record FROM characters WHERE char_name = p_char_name;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'character_not_found'); END IF;
    IF v_char_record.user_id::text != auth.uid()::text THEN RETURN jsonb_build_object('success', false, 'error', 'not_authorized'); END IF;
    v_data := v_char_record.data; v_level := (v_data->>'nivel')::INTEGER; IF v_level < v_sgrade_level THEN RETURN jsonb_build_object('success', false, 'error', 'level_too_low'); END IF;
    v_endgame := v_data->'endgame'; IF v_endgame IS NULL THEN v_endgame := '{}'::JSONB; END IF;
    v_weekly_kills := (v_endgame->>'weeklyChampionKills')::INTEGER; v_last_claimed := v_endgame->>'lastClaimedWeekKey';
    IF v_last_claimed = p_week_key THEN RETURN jsonb_build_object('success', false, 'error', 'already_claimed'); END IF;
    IF v_weekly_kills < v_target_kills THEN RETURN jsonb_build_object('success', false, 'error', 'insufficient_kills'); END IF;
    v_endgame := v_endgame || jsonb_build_object('lastClaimedWeekKey', p_week_key, 'renown', (COALESCE((v_endgame->>'renown')::INTEGER, 0) + v_reward_renown));
    v_data := v_data || jsonb_build_object('endgame', v_endgame, 'adenas', (COALESCE((v_data->>'adenas')::BIGINT, 0) + v_reward_adena), 'ancientCoins', (COALESCE((v_data->>'ancientCoins')::INTEGER, 0) + v_reward_ancient));
    UPDATE characters SET data = v_data, updated_at = NOW() WHERE char_name = p_char_name;
    RETURN jsonb_build_object('success', true, 'new_renown', (v_endgame->>'renown')::INTEGER, 'added_adena', v_reward_adena, 'added_ancient', v_reward_ancient);
END; $$;

CREATE OR REPLACE FUNCTION get_player_stats_autoritativo(p_target_char_name TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_char_record RECORD; v_data JSONB; v_level INTEGER; v_race TEXT; v_hp_base INTEGER := 100; v_mp_base INTEGER := 40; v_atk_base INTEGER := 10; v_bonus_hp INTEGER := 0; v_bonus_mp INTEGER := 0; v_bonus_patk INTEGER := 0; v_bonus_matk INTEGER := 0; v_bonus_pdef INTEGER := 0; v_bonus_mdef INTEGER := 0; v_bonus_crit INTEGER := 0; v_bonus_spd INTEGER := 0; v_item JSONB; v_slots TEXT[] := ARRAY['armaEquipadaBase', 'armaduraEquipada', 'colarEquipado', 'brincoEquipado1', 'brincoEquipado2', 'anelEquipado1', 'anelEquipado2']; v_slot TEXT; v_enchant INTEGER; v_mult_enchant FLOAT; v_final_stats JSONB;
BEGIN
    SELECT * INTO v_char_record FROM characters WHERE char_name = p_target_char_name;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'character_not_found'); END IF;
    v_data := v_char_record.data; v_level := (v_data->>'nivel')::INTEGER; v_race := COALESCE(v_data->>'charRace', 'Human');
    IF v_race = 'Elf' THEN v_hp_base := 80; v_mp_base := 60; ELSIF v_race = 'Orc' THEN v_hp_base := 120; v_mp_base := 30; END IF;
    FOREACH v_slot IN ARRAY v_slots LOOP v_item := v_data->v_slot; IF v_item IS NOT NULL THEN
        v_enchant := COALESCE((v_item->>'enchant')::INTEGER, 0); v_mult_enchant := 1 + (v_enchant * 0.10);
        v_bonus_hp := v_bonus_hp + floor(COALESCE((v_item->'base'->>'bonusHp')::INTEGER, 0) * v_mult_enchant); v_bonus_mp := v_bonus_mp + floor(COALESCE((v_item->'base'->>'bonusMp')::INTEGER, 0) * v_mult_enchant);
        v_bonus_patk := v_bonus_patk + floor(COALESCE((v_item->'base'->>'pAtk')::INTEGER, 0) * v_mult_enchant); v_bonus_matk := v_bonus_matk + floor(COALESCE((v_item->'base'->>'mAtk')::INTEGER, 0) * v_mult_enchant);
        v_bonus_pdef := v_bonus_pdef + floor(COALESCE((v_item->'base'->>'pDef')::INTEGER, 0) * v_mult_enchant); v_bonus_mdef := v_bonus_mdef + floor(COALESCE((v_item->'base'->>'mDef')::INTEGER, 0) * v_mult_enchant);
        v_bonus_crit := v_bonus_crit + floor(COALESCE((v_item->'base'->>'bonusCrit')::INTEGER, 0) * v_mult_enchant); v_bonus_spd := v_bonus_spd + floor(COALESCE((v_item->'base'->>'bonusSpd')::INTEGER, 0) * v_mult_enchant);
        IF v_slot = 'armaEquipadaBase' THEN v_bonus_patk := v_bonus_patk + floor(COALESCE((v_item->'base'->>'atk')::INTEGER, 5) * v_mult_enchant); v_bonus_matk := v_bonus_matk + floor(COALESCE((v_item->'base'->>'matk')::INTEGER, 5) * v_mult_enchant); END IF;
        IF COALESCE((v_item->>'augmented')::BOOLEAN, false) THEN v_bonus_hp := v_bonus_hp + COALESCE((v_item->'base'->>'augHp')::INTEGER, 0); v_bonus_patk := v_bonus_patk + COALESCE((v_item->'base'->>'augPAtk')::INTEGER, 0); v_bonus_matk := v_bonus_matk + COALESCE((v_item->'base'->>'augMAtk')::INTEGER, 0); v_bonus_pdef := v_bonus_pdef + COALESCE((v_item->'base'->>'augPDef')::INTEGER, 0); v_bonus_mdef := v_bonus_mdef + COALESCE((v_item->'base'->>'augMDef')::INTEGER, 0); v_bonus_spd := v_bonus_spd + COALESCE((v_item->'base'->>'augSpd')::INTEGER, 0); v_bonus_crit := v_bonus_crit + COALESCE((v_item->'base'->>'augCrit')::INTEGER, 0); END IF;
    END IF; END LOOP;
    v_final_stats := jsonb_build_object('maxHp', floor(v_hp_base + ((v_level - 1) * 20) + v_bonus_hp), 'maxMp', floor(v_mp_base + ((v_level - 1) * 5) + v_bonus_mp), 'pAtk', floor(v_atk_base + ((v_level - 1) * 3) + v_bonus_patk), 'mAtk', floor(5 + ((v_level - 1) * 4) + v_bonus_matk), 'pDef', floor(30 + ((v_level - 1) * 3.5) + v_bonus_pdef), 'mDef', floor(20 + ((v_level - 1) * 3.0) + v_bonus_mdef), 'critRate', floor(5 + v_bonus_crit), 'atkSpeed', floor(500 - ((v_level - 1) * 15) - v_bonus_spd));
    RETURN jsonb_build_object('success', true, 'char_name', v_char_record.char_name, 'level', v_level, 'stats', v_final_stats);
END; $$;

-- ========================================================
-- 6. HABILITAR REALTIME (FINAL)
-- ========================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clan_chat_messages') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.clan_chat_messages; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mailbox') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.mailbox; END IF;
END $$;

-- 7. INSERIR CASTELOS INICIAIS
INSERT INTO public.castles (id, name) VALUES 
('gludio', 'Gludio Castle'), ('dion', 'Dion Castle'), ('giran', 'Giran Castle'), ('oren', 'Oren Castle'), ('aden', 'Aden Castle'), ('innadril', 'Heine Castle'), ('goddard', 'Goddard Castle'), ('rune', 'Rune Castle'), ('schuttgart', 'Schuttgart Castle')
ON CONFLICT (id) DO NOTHING;
