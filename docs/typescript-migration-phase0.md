# Fase 0 — Rede de segurança (migração TypeScript)

Objetivo: ter uma baseline reproduzível **antes** de alterar runtime ou migrar ficheiros para `.ts`. Correr os testes automatizados e o checklist manual após cada onda de migração.

## Testes automatizados (Playwright)

```bash
npm install
npx playwright install chromium
npm run test:smoke
```

Relatório HTML (após falha ou sucesso):

```bash
npx playwright show-report
```

**Nova feature (pós-migração TS):** ver **`docs/new-feature-checklist.md`**.

| Ficheiro | O que valida |
|----------|----------------|
| `tests/smoke/01-boot.spec.ts` | Ecrã de login, i18n (sem chaves literais), troca EN/PT |
| `tests/smoke/02-core-apis.spec.ts` | `InventoryManager`, stats, defesa |
| `tests/smoke/03-save-roundtrip.spec.ts` | `salvarJogo` / `carregarJogo` + migração de save |
| `tests/smoke/04-navigation.spec.ts` | `irPara` perfil e inventário |
| `tests/smoke/05-item-security.spec.ts` | UID único via `ItemSecurity` |

**Nota:** os testes E2E **não** dependem de login na nuvem — injectam save mínimo em `localStorage` e chamam `carregarJogo` directamente.

## Checklist manual (smoke completo)

Marcar ✅ após validar no browser (dev local ou deploy). Repetir antes de merge de cada PR de migração TS.

### Auth & personagem

- [ ] Login (conta nuvem ou local offline)
- [ ] Registo / logout
- [ ] Selecção de personagem
- [ ] Criação de personagem (raça → classe → nome)
- [ ] Troca de idioma EN / PT-BR persiste após reload

### Core gameplay

- [ ] Entrar na zona de caça (`floresta`), spawn de mob, auto-ataque
- [ ] Skill na barra, cooldown, poção HP/MP
- [ ] Level up e save silencioso
- [ ] Abrir perfil, paperdoll, modal **Sources & Breakdown**

### Economia & itens

- [ ] Equipar / desequipar (UID preservado — sem duplicar item)
- [ ] Encantar arma ou armadura (fluxo UI)
- [ ] Loja NPC (compra stackable)
- [ ] Craft (se receita desbloqueada)

### Social & online (se Supabase activo)

- [ ] Chat global envia mensagem
- [ ] Marketplace: listar / comprar / correio de entrega
- [ ] Inspecionar jogador (perfil cloud)
- [ ] Grand Olympiad: abrir lobby (duelo opcional)

### Persistência

- [ ] **Save Game** manual no perfil
- [ ] Reload da página — personagem e adenas iguais
- [ ] Com sessão cloud: alteração sincroniza (sem rollback estranho após reload)

### Regressões conhecidas a vigiar

- [ ] UI mostra chaves `login.*` / `game.*` (bundle i18n partido → `node --check src/i18n/locales_bundle.ts`)
- [ ] Véu escuro órfão ao mudar aba (`fecharTodosModaisBackdropStack`)
- [ ] Modal cortado dentro de `#screen-game` (modais devem estar no `body`)

## Git (recomendado)

Se ainda não tens repositório:

```bash
git init
git add .
git commit -m "chore: phase 0 smoke tests for TypeScript migration"
```

Trabalhar migração em branches curtas: `feat/ts-wave-1-combat-math`, etc.

## Fase 1 — Typecheck (activa)

Infraestrutura de tipos **sem alterar** o runtime (`index.html` intacto).

```bash
npm run typecheck          # só valida .ts / .d.ts
npm run test:ci            # typecheck + smoke Playwright
```

| Ficheiro | Função |
|----------|--------|
| `src/types/game.ts` | `CharacterSave`, `EquipInstance`, `PlayerStats`, APIs |
| `src/types/global.d.ts` | `Window` + funções globais do jogo |
| `src/types/vendor.d.ts` | CDN (`socket.io`) |
| `tsconfig.json` | `allowJs`, `checkJs: false`, `strict: false` |

**Regra:** ao migrar um `.js` → `.ts`, expandir tipos em `game.ts` / `global.d.ts` no mesmo PR.

## Fase 2 — Vite + primeiro módulo TS (activa)

O jogo passa a arrancar via **Vite**. Abrir `index.html` directo no browser **já não funciona** (falta o bundler).

### Desenvolvimento

```bash
npm run dev          # http://localhost:5173
```

### Produção / deploy (GitHub Pages, etc.)

```bash
npm run build        # gera pasta dist/
npm run preview      # testar build localmente
```

Publicar o conteúdo de **`dist/`** (não a raiz do repo).

### Arquitectura

| Ficheiro | Função |
|----------|--------|
| `src/main.ts` | Boot canónico — imports dinâmicos por fase (GDD **§14.3**) |
| `src/core/inventory_manager.ts` | InventoryManager (era `js/core_inventory_logic.js`) |
| `src/core/core.ts` | Loop principal + HUD (era `js/core.js`) |
| `src/core/core_stats.ts` | Stats + breakdown (era `js/core_stats.js`) |
| `src/core/core_persistence.ts` | Save/load (era `js/core_persistence.js`) |
| `src/core/core_globals.ts` | Globals + helpers (era `js/core_globals.js`) |
| `src/combat/combat_math.ts` | **1.º ficheiro migrado** (era `js/combat_math.js`) |
| `src/core/item_security.ts` | ItemSecurity / RG (era `js/core_security.js`) |
| `src/paperdoll/paperdoll_config.ts` | Paperdoll presets (era `js/paperdoll_config.js`) |
| `src/ui/grade_ui.ts` | Grade UI helpers (era `js/grade_ui.js`) |
| `src/systems/tutorial_engine.ts` | Tutorial onboarding (era `js/tutorial_engine.js`) |
| `src/ui/ui_main.ts` | Navegação, modais, criação de personagem (era `js/ui_main.js`) |
| `src/combat/combat.ts` | Caçada / spawn / loot na floresta (era `js/combat.js`) |
| `src/combat/skills_engine.ts` | Execução de skills na caçada (era `js/skills_engine.js`) |
| `src/game/classes.ts` | Modificadores, evolução e UI de troca de classe (era `js/classes.js`) |
| `src/ui/ui_inventory.ts` | Bolsa, perfil, breakdown de stats (era `js/ui_inventory.js`) |
| `src/ui/pwa_install.ts` | PWA install + fullscreen (era `js/pwa_install.js`) |
| `src/ui/ui_smartbar.ts` | Barra de atalhos + cooldowns (era `js/ui_smartbar.js`) |
| `src/ui/ui_enchant.ts` | Enchant + augment (era `js/ui_enchant.js`) |
| `src/ui/ui_shop.ts` | Lojas NPC compra/venda (era `js/ui_shop.js`) |
| `src/ui/ui_market.ts` | Marketplace global (era `js/ui_market.js`) |
| `src/ui/ui_chat.ts` | Chat global/clã + inspeção (era `js/ui_chat.js`) |
| `src/ui/ui_clans.ts` | Clan Hall / gestão de clãs (era `js/ui_clans.js`) |
| `src/systems/endgame_pursuits.ts` | Ascensão / elite hunt (era `js/endgame_pursuits.js`) |
| `src/systems/raid_engine.ts` | Raid mundial (era `js/raid_engine.js`) |
| `src/systems/olympiad_bots.ts` | Bots de arena/raid (era `js/olympiad_bots.js`) |
| `src/systems/olympiad_engine.ts` | PvP semi-online / MMR / arena (era `js/olympiad_engine.js`) |
| `src/systems/auth_engine.ts` | Login, personagens, auth |
| `src/data/database.ts` | Sons + status iniciais por raça |
| `src/db/db_*.ts` | Catálogos (itens, mobs, bosses, bots, castelos, zonas) |
| `src/i18n/i18n.ts`, `locales_bundle.ts` | Runtime i18n + strings EN/PT-BR |
| `src/systems/castle_engine.ts` … `ranking_seasons.ts` | Castelo, guerra, mercado cloud, GM, rewards, mailbox, sync, presença, ranking |
| `vite.config.ts` | Dev server + copy de `css/`, `assets/`, `index.html` → `dist/` |

**Migração concluída (Fases 3–4):** todo o runtime do jogo está em `src/**/*.ts`; catálogos em `src/db/`, i18n em `src/i18n/`. Loader `src/legacy/*` removido — boot só via `src/main.ts`.

### Testes

```bash
npm run test:smoke   # Playwright + Vite (porta 4173)
npm run test:ci      # typecheck + build + smoke (modo CI)
```

## Fase 3 — Runtime 100% TypeScript (concluída)

Ondas finais migradas para `src/`:

| Destino | Era |
|---------|-----|
| `src/data/database.ts` | `js/database.js` |
| `src/db/db_*.ts` | `js/db_*.js`, `db/db_*.js` |
| `src/i18n/i18n.ts`, `locales_bundle.ts` | `js/i18n/*.js` |
| `src/systems/castle_engine.ts` … `ranking_seasons.ts` | `js/systems/*.js` |

Validação i18n após editar strings: `node --check src/i18n/locales_bundle.ts`

## Fase 4 — Tipos reais (concluída)

Endurecer tipos **módulo a módulo** (`@ts-nocheck` → tipos explícitos + `import`). **Estado:** zero `@ts-nocheck` em `src/`. Referência operacional pós-migração: **§14** do GDD (`l2mini-project-rules.mdc`).

| Módulo | Estado |
|--------|--------|
| `src/runtime/register-global.ts` | Helper ponte `window` / `globalThis` |
| `src/systems/cloud_sync.ts` | ✅ Fase 4 |
| `src/systems/ranking_manager.ts` | ✅ Fase 4 |
| `src/systems/multiplayer_visuals.ts` | ✅ Fase 4 |
| `src/systems/ranking_seasons.ts` | ✅ Fase 4 |
| `src/systems/reward_engine.ts` | ✅ Fase 4 |
| `src/systems/market_cloud.ts` | ✅ Fase 4 |
| `src/systems/mailbox_engine.ts` | ✅ Fase 4 |
| `src/systems/supabase_api.ts` | ✅ Fase 4 |
| `src/systems/auth_engine.ts` | ✅ Fase 4 |
| `src/systems/castle_engine.ts` | ✅ Fase 4 |
| `src/systems/clan_war_engine.ts` | ✅ Fase 4 |
| `src/systems/olympiad_engine.ts` | ✅ Fase 4 |
| `src/systems/olympiad_bots.ts` | ✅ Fase 4 |
| `src/systems/endgame_pursuits.ts` | ✅ Fase 4 |
| `src/systems/raid_engine.ts` | ✅ Fase 4 |
| `src/systems/gm_engine.ts` | ✅ Fase 4 |
| `src/ui/ui_chat.ts` | ✅ Fase 4 |
| `src/ui/ui_market.ts` | ✅ Fase 4 |
| `src/ui/ui_clans.ts` | ✅ Fase 4 |
| `src/ui/ui_inventory.ts` | ✅ Fase 4 |
| `src/ui/ui_shop.ts` | ✅ Fase 4 |
| `src/ui/ui_craft.ts` | ✅ Fase 4 |
| `src/ui/ui_enchant.ts` | ✅ Fase 4 |
| `src/ui/ui_daily_boss.ts` | ✅ Fase 4 |
| `src/ui/ui_daily_missions.ts` | ✅ Fase 4 |
| `src/ui/ui_smartbar.ts` | ✅ Fase 4 |
| `src/paperdoll/ui_paperdoll.ts` | ✅ Fase 4 |
| `src/db/db_zones.ts` | ✅ Fase 4 |
| `src/db/db_castles.ts` | ✅ Fase 4 |
| `src/db/db_mobs.ts` | ✅ Fase 4 |
| `src/db/db_bosses.ts` | ✅ Fase 4 |
| `src/db/db_bots.ts` | ✅ Fase 4 |
| `src/db/db_items.ts` | ✅ Fase 4 |
| `src/data/database.ts` | ✅ Fase 4 |
| `src/i18n/i18n.ts` | ✅ Fase 4 |
| `src/i18n/locales_bundle.ts` | ✅ Fase 4 |
| `src/game/skills.ts` | ✅ Fase 4 (`Object.assign` — chaves duplicadas, última vence) |
| Restantes `@ts-nocheck` | — (Fase 4 concluída em `src/`) |

Validação após cada onda: `npm run typecheck` + smoke manual ou `npm run test:smoke`.

## Fase 5 — Endurecimento de tipos (roadmap)

Ver **§14.5** do GDD (`l2mini-project-rules.mdc`): partir `src/types/`, `strict` gradual, reduzir novos `window.*`, CI/README/validate — prioridade incremental, não big-bang.
