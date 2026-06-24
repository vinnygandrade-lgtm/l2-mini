# Checklist — nova feature (L2 Mini / cliente TS)

Use esta lista **antes de abrir PR** ou quando pedires ao agente uma feature nova. Não substitui o GDD (`.cursor/rules/l2mini-project-rules.mdc`); resume o caminho **oficial** no cliente híbrido **Vite + TypeScript + legado `window.*`**.

---

## 0. Escopo (1 minuto)

- [ ] Feature toca **economia**, **PvP**, **social**, **save**, **UI modal** ou **nuvem**? → Ler o `.md` em `docs/` desse domínio (índice na **§2** do GDD).
- [ ] Há fluxo SQL/RPC? → Ler script modular + secção correspondente em `supabase_MASTER_SETUP.sql` (**§13** GDD).
- [ ] Feature nova é **só cliente** ou precisa **autoridade no servidor**? → Se cria/move valor global, planear RPC (ponte client-only só se documentado como dívida — **§9 / §12.7**).

---

## 1. Código e ficheiros

- [ ] Lógica nova em **`src/`** (`.ts`), não em `js/` legado, salvo ponte temporária inevitável.
- [ ] Módulo expõe API via **`window.NomeMotor`** se HTML/`onclick` ou legado ainda consome.
- [ ] **`src/main.ts`**: `import` na ordem certa (DB → segurança → inventário → persistência → UI).
- [ ] Tipos em **`src/types/game.ts`** + contrato em **`src/types/global.d.ts`**.
- [ ] Ficheiro grande (>400–500 linhas úteis)? → Considerar módulo novo (GDD **§2 — modularização**).
- [ ] CSS novo: ficheiro em `css/` existente ou novo; **`index.html`** actualizado se novo `.css`/`.js`.

---

## 2. Itens, bolsa e economia

- [ ] **Equipamento** → `ItemSecurity.createInstance()` + **`InventoryManager.adicionarEquipamento`** / equip / desequip. **Nunca** `JSON.parse(JSON.stringify(item))` para mover instância.
- [ ] **Stack** (materiais, scrolls, poções) → **`InventoryManager.adicionarStack(nomeOuId, qtd)`** — **não** `window.inventario[x] +=` directo em feature nova.
- [ ] Chave de stack: catálogo resolve para **`nome`** canónico (`InventoryStackKeys` / `resolveInventarioStackKey`) — loot pode usar `id` (`sc_w_ng`), loja usa `nome`.
- [ ] **Moedas** (Adena / Ancient Coin) → carteira + `syncMoedasInventarioComCarteira` quando aplicável; nuvem activa → **RPC** para alterar saldo (**§3 / §7**).
- [ ] Recompensa grande (raid, guerra, GM)? → **`enviarMail`** ou **`RewardEngine`** conforme GDD **§3.7 / §7** — daily boss / loot directo só se producto o exigir (documentar).

---

## 3. Persistência (save)

- [ ] Campo novo no JSON do personagem?
  1. Incrementar **`L2MINI_SAVE_VERSION`** em `src/types/game.ts`.
  2. Passo em **`migrarDadosSave`** (`src/core/core_persistence.ts`) — **só** conversão `N-1 → N`.
  3. Gravar em **`salvarJogo`** e hidratar em **`carregarJogo`**.
- [ ] Saves antigos sem o campo devem **continuar a carregar** (defaults seguros).
- [ ] Nuvem: mesmo objecto em `characters.data` — migração corre no **load**, próximo save grava versão actual.

---

## 4. UI / UX

- [ ] Texto visível → **`t('chave')`** + **`locales_bundle.js`** (**`en`** e **`pt-BR`** na mesma alteração).
- [ ] Sem `alert()` / `confirm()` → **`l2Alert`** / **`l2Confirm`**.
- [ ] Modal com véu → **`abrirModal` / `fecharModal`**; elemento **irmão** de `#modal-overlay` no **`body`** (**§5**).
- [ ] Navegação (`irPara`, `mudarTela`) → **`fecharTodosModaisBackdropStack()`**.
- [ ] Lista longa → `flex: 1`, `min-height: 0`, `overflow-y: auto`.
- [ ] Bolsa / grelha → **`docs/inventory-grid-layout.md`** + `_l2AppendInvGridSlot`.

---

## 5. Combate, PvP e motores especiais

- [ ] Dano → fórmula asintótica em **`combat_math.js`**; PvP raid/olympiad/guerra com multiplicador do **motor respectivo**.
- [ ] Auto-ataque / barra → raid: `RaidEngine` + `atacar()`; floresta: `monstrosAtivos`; não assumir um só caminho.
- [ ] Realtime (chat, Olympiad, presença) → canal partilhado, **`tabSessionId`**, teardown ao trocar personagem (**§7 — Multiplayer Realtime**).

---

## 6. Nuvem (se Supabase activo)

- [ ] Script SQL versionado na raiz (`supabase_*.sql`) + espelho no MASTER quando estável.
- [ ] Método em **`js/systems/supabase_api.js`** (ou TS migrado equivalente).
- [ ] RLS + `auth.uid()` / posse do recurso na RPC.
- [ ] Cliente: estado `loading`, erro com código estável, **sem** creditar duas vezes (idempotência / retry).
- [ ] Deploy manual no SQL Editor — remoto **não** segue Git (**§12.6**).

---

## 7. i18n e identidade

- [ ] `node --check src/i18n/locales_bundle.ts` → exit **0**.
- [ ] Nomes próprios de mundo **originais** (**§11**); IDs técnicos estáveis no save.
- [ ] Ícones novos: **256×256** PNG quadrado (**§11.3**).

---

## 8. Verificação antes de merge

```bash
npm run validate          # typecheck + i18n bundle + build
npm run test:smoke        # opcional — regressão E2E local
npm run test:ci           # CI completo (validate implícito + smoke)
```

- [ ] Teste manual mínimo da feature (happy path + falha de rede se online).
- [ ] Regressão: bolsa, save/reload, modais, i18n (UI sem chaves literais).
- [ ] Alterou contrato sensível? → Actualizar **`docs/<domínio>.md`** e linha no **índice §2** do GDD.

---

## Atalhos por tipo de feature

| Tipo | Onde começar |
|------|----------------|
| Item / loot / craft | `InventoryManager`, `InventoryStackKeys`, `db_items.js` |
| UI ecrã / modal | `ui_main.ts`, `index.html`, `css/`, `docs/ui-shell-spec.md` |
| Progressão / contador | `core_persistence.ts`, RPC se nuvem |
| Social / correio | `mailbox_engine.js`, `ui_chat.ts`, Realtime §7 |
| Mercado | `market_cloud.js`, `ui_market.ts`, SQL mercado |
| Boss / raid | `raid_engine.ts`, `db_bosses.js` |
| i18n só | `locales_bundle.js` + `data-i18n` no HTML |

---

## Referências

- GDD completo: `.cursor/rules/l2mini-project-rules.mdc`
- i18n: `.cursor/rules/l2mini-i18n.mdc`
- Smoke pós-migração: `docs/typescript-migration-phase0.md`
- Inventário / bolsa: `docs/inventory-grid-layout.md`
