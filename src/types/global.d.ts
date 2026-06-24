/**
 * Contrato global do runtime (script tags + window.*).
 * Expandir incrementalmente ao migrar cada módulo JS → TS.
 */
import type {
  AuthEngineApi,
  BuffsAtivos,
  CarregarJogoOptions,
  CharacterSave,
  EconomyBalanceApi,
  EndgameData,
  RaidEngineApi,
  GmEngineApi,
  EndgamePursuitsApi,
  EquipInstance,
  GradeEquipKey,
  GradeEquipValidation,
  GradeUiInfo,
  I18nApi,
  PaperdollConfig,
  PaperdollPresetId,
  InventarioStack,
  InventarioRecentEntry,
  InventoryManagerApi,
  InventarioRecentApi,
  InventoryStackKeysApi,
  InventarioBagFilter,
  ItemSecurityApi,
  HotbarSlot,
  PlayerStats,
  PlayerStatBreakdown,
  SalvarJogoOptions,
  StatPerLevel,
  SupabaseApi,
  SupabaseConfig,
  TutorialProgress,
  ZonalMobTuneEntry,
  CloudRankingPlayer,
  MergedRankingEntry,
  RankingManagerApi,
  MultiplayerVisualsApi,
  PresenceState,
  RankingSeasonsApi,
  RewardEngineApi,
  MarketCloudApi,
  MailboxEngineApi,
  EnviarMailFn,
  OlympiadEngineApi,
  CastleEngineApi,
  ClanWarEngineApi,
  CastleDbEntry,
  L2ConfirmFn,
  SeasonRewardBundle,
} from './game';

export {};

declare global {
  interface Window {
    // --- Personagem & economia ---
    charName: string;
    charRace: string;
    charGender: string;
    charClass: string;
    indexSelecao?: number;
    etapaAtual?: string;
    cacadaResumoVitoriaAtivo?: boolean;
    botAtualVisualizado?: ChatInspectProfileData | Record<string, unknown> | null;
    getInspectionCacheEntry?: (nome: string) => import('./game').InspectionCachePreview | null;
    abrirAcaoItemBot?: (tipo: string, index?: number) => void;
    fecharNpc?: () => void;
    fecharNpcSocial?: () => void;
    navegarSelecao?: (direcao: number) => void;
    setGender?: (sexo: string) => void;
    proximaEtapa?: () => Promise<void>;
    voltarEtapa?: () => void;
    atualizarPreview?: () => void;
    validarLogin?: () => void;
    verificarLimitePersonagem?: () => boolean;
    abrirDetalhesZona?: (grade: string) => void;
    teleportarParaZona?: (grade: string) => void;
    zoneDisplayName?: (grade: string | null | undefined) => string;
    zoneCanonicalName?: (grade: string) => string;
    refreshHuntZoneHud?: () => void;
    recolherLootRaid?: () => void;
    abrirPerfilJogadorRanking?: (nome: string, isBot?: boolean) => void;
    renderizarSocial?: () => void;
    abrirOlympiad?: () => void;
    sairOlympiad?: (forcarSaida?: boolean) => void;
    atualizarRelogioSeason?: () => void;
    carregarMailbox?: () => Promise<void>;
    playerData?: {
      raca?: string;
      visual?: { isFem?: boolean; armorId?: string; weaponId?: string };
    };
    mudarAbaSocial?: (aba: string) => void;
    renderizarRankingMundial?: () => Promise<void>;
    renderizarPremiosRanking?: () => void;
    OlympiadBots?: import('./game').OlympiadBotsApi;
    nivel: number;
    adenas: number;
    ancientCoins: number;
    xpAtual: number;
    xpNecessario: number;
    playerHP: number;
    playerMP: number;
    playerCP: number;
    isAugmented: boolean;
    enchant: number;
    enchantArmor: number;

    // --- Inventário & equip ---
    inventario: InventarioStack;
    inventarioEquips: EquipInstance[];
    inventarioRecentLog?: InventarioRecentEntry[];
    inventarioBagFilter?: InventarioBagFilter;
    catalogoScrolls?: Array<{ id?: string; nome: string; preco?: number; moeda?: string; desc?: string; img?: string }>;
    catalogoConsumiveis?: Array<{ id?: string; nome: string; preco?: number; img?: string; desc?: string }>;
    catalogoMateriais?: unknown[];
    catalogoArmas?: import('./game').ItemCatalogBase[];
    catalogoArmaduras?: import('./game').ItemCatalogBase[];
    catalogoJoias?: import('./game').ItemCatalogBase[];
    catalogoReceitas?: Record<string, import('./game').CraftRecipe[]>;
    catalogoBosses?: Record<string, Record<string, unknown>>;
    catalogoBossesDiarios?: Record<string, Record<string, unknown>>;
    dbCastles?: CastleDbEntry[];
    dbBotsRanking?: import('./game').BotRankingSeed[];
    precosVenda?: Record<string, number>;
    armaEquipadaBase: EquipInstance | null;
    armaduraEquipada: EquipInstance | null;
    colarEquipado: EquipInstance | null;
    brincoEquipado1: EquipInstance | null;
    brincoEquipado2: EquipInstance | null;
    anelEquipado1: EquipInstance | null;
    anelEquipado2: EquipInstance | null;

    // --- Stats & combate ---
    playerStats: PlayerStats;
    playerStatBreakdown?: PlayerStatBreakdown;
    monstrosAtivos: unknown[];
    globalCooldownAtivo: number;
    autoAtaqueAtivo: boolean;
    podeAtacar: boolean;
    cooldownsAtivos: Record<string, number>;
    barraAtalhos: HotbarSlot[];

    // --- Meta / endgame ---
    endgameData: EndgameData;
    olympiadPoints: number;
    olympiadWins: number;
    olympiadLosses: number;
    tutorialProgress?: TutorialProgress;
    tempoFimBuffGuerreiro: number;
    tempoFimBuffMistico: number;
    buffsAtivos: BuffsAtivos;
    labelTipoHUD: HTMLElement | null;
    labelValorHUD: HTMLElement | null;

    L2MINI_STAT_PER_LEVEL: StatPerLevel;
    L2MINI_BARE_HAND_WEAPON_ATK: number;
    L2MINI_ITEM_ICON_PX: number;
    L2MINI_TRAINING_SWORD_ATK: number;
    L2MINI_CRIT_RATE_CAP: number;
    L2MINI_ZONAL_MOB_TUNING: Record<string, ZonalMobTuneEntry>;
    L2MINI_STARTER_WEAPON_IDS: { fighter: string; mage: string };
    TRAVAS_GRADE_NIVEL: Record<GradeEquipKey, number>;
    normalizarGradeEquip: (grade: unknown) => GradeEquipKey;
    obterNivelMinimoGradeEquip: (grade: unknown) => number;
    playerClanId?: number | string | null;
    clans?: Array<{ id: number | string; membros?: string[]; lider?: string; level?: number; [key: string]: unknown }>;
    statusIniciais?: Record<string, import('./game').RaceInitialStats>;
    classModifiers?: Record<string, { hp: number; mp: number; atk: number; def: number; spd: number; crit: number }>;
    classEvolutions?: Record<string, Array<{ nome: string; reqLvl: number; desc: string; cor: string }>>;
    bancoDeSkills?: Record<string, import('./game').SkillCatalogEntry>;
    arvoreDeSkills?: Record<string, import('./game').SkillTreeEntry[]>;
    linhagemClasses?: Record<string, string[]>;
    L2MINI_CURRENCY_BAG_KEYS: { adena: string; ancient: string };
    syncMoedasInventarioComCarteira: () => void;
    enrichEquipBaseFromCatalogIfNeeded: (item: unknown) => EquipInstance | unknown;
    formatClassDisplayName: (raw: unknown) => string;
    coerceInspectEquipItem: (item: unknown, tipoPadrao?: string) => EquipInstance | null;
    unwrapCloudCharacterJsonb: (raw: unknown) => CharacterSave;
    pickInspectSaveEquip: (rd: Record<string, unknown> | null | undefined, keys: string[]) => unknown;
    normalizarInventarioEquipsParaInstancias: (arr: unknown[]) => EquipInstance[];
    dispararSincronizacaoCloud?: () => void;
    MailboxEngine?: MailboxEngineApi;

    // --- Motores (namespace objects) ---
    InventoryManager: InventoryManagerApi;
    InventarioRecent: InventarioRecentApi;
    InventoryStackKeys: InventoryStackKeysApi;
    ItemSecurity: ItemSecurityApi;
    EconomyBalance: EconomyBalanceApi;
    AuthEngine: AuthEngineApi;
    SupabaseAPI: SupabaseApi;
    SUPABASE_CONFIG: SupabaseConfig;
    I18n: I18nApi;
    GMEngine?: import('./game').GmEngineApi;
    RewardEngine?: RewardEngineApi;
    MarketCloud?: MarketCloudApi;
    OlympiadEngine?: OlympiadEngineApi;
    MultiplayerVisuals?: MultiplayerVisualsApi;
    RaidEngine?: RaidEngineApi;
    RankingManager?: RankingManagerApi;
    CastleEngine?: CastleEngineApi;
    RankingSeasons?: RankingSeasonsApi;
    ClanWarEngine?: ClanWarEngineApi;
    EndgamePursuits?: import('./game').EndgamePursuitsApi;
    usarPocao: () => void;
    usarPocaoMP: (nomeDaPocao: string) => void;
    escreverLog: (html: string) => void;
    aplicarNotifBadgeVisual?: () => void;
    enviarMail?: EnviarMailFn;
    abrirRewardHubFechandoCorreio?: () => void;
    aplicarHudMissoesBadge?: () => void;
    schedulePaperdollFootShadowSyncWithRetries?: () => void;
    _pdFootShadowVisBound?: boolean;
    renderProfileStatsPreview?: () => void;

    // --- CDN (index.html) ---
    supabase?: { createClient: (...args: unknown[]) => SupabaseApi['client'] };

    // --- Funções expostas no window ---
    t: (key: string, params?: Record<string, string | number>) => string;
    cloudRpcMessage: (code: unknown, options?: { prefix?: string; fallbackKey?: string; keyStyle?: 'error_' | 'dot' }) => string;
    slugRpcErrorCode: (raw: string) => string;
    calcularStatusGlobais: () => void;
    calcularStatusGlobaisFromData: (
      saveLike: Partial<CharacterSave>,
    ) => Partial<PlayerStats> | null;
    calcularDefesaDoPlayer: (ataqueMagicoDoMonstro: boolean) => number;
    calcularXpNecessario: (lvl: number) => number;
    salvarJogo: (opts?: SalvarJogoOptions) => void;
    carregarJogo: (nome: string, opts?: CarregarJogoOptions) => Promise<boolean>;
    mudarTela: (id: string) => void;
    irPara: (lugar: string) => void;
    abrirSpellbook?: () => void;
    spellbookTipoLabel?: (tipo: string) => string;
    spellbookFormatPowerCell?: (skill: Record<string, unknown> | null | undefined) => string;
    spellbookIconInnerHtml?: (iconeHtml: string, px?: number) => string;
    obterSkillsAprendidas?: () => import('./game').LearnedSkillMeta[];
    selecionarSkillSpellbook?: (nomeSkill: string) => void;
    mostrarSeletorSlot?: () => void;
    equiparSkillNaBarra?: (indexSlot: number) => void;
    atualizar: () => void;
    iniciarJogo: () => void;
    abrirModal: (id: string, zIndex?: number) => void;
    fecharModal: (id: string) => void;
    fecharTopModal: () => void;
    fecharTodosModaisBackdropStack: () => void;
    l2Alert: (mensagem: string, tituloOrOnClose?: string | (() => void), maybeOnClose?: () => void) => void;
    l2Confirm: L2ConfirmFn;
    applyCritRateCap: (value: number) => number;
    isClasseMagica: (charClass: string) => boolean;
    createStarterWeaponInstance: (charClass: string) => EquipInstance | null;

    normalizeL2GradeSlug: (grade: unknown) => import('./game').GradeSlug;
    getGradeUi: (grade: unknown) => GradeUiInfo;
    getGradeColor: (grade: unknown) => string;
    getCorGrade: (grade: unknown) => string;
    buildGradeTagHtml: (grade: unknown, label?: unknown) => string;
    applyGradeAccentToElement: (el: Element | null, grade: unknown) => void;
    applyShopGradeChrome: (grade: unknown) => void;
    clearShopGradeChrome: () => void;

    PAPERDOLL_FOOT_SHADOW_STANDARD: 'v1';
    PAPERDOLL_ART: PaperdollConfig['art'];
    PAPERDOLL_CONFIG: PaperdollConfig;
    PAPERDOLL_PRESET_META: Record<
      PaperdollPresetId,
      { race: string; archetype: string; gender: string }
    >;
    PAPERDOLL_PRESET_LEGACY: Partial<Record<PaperdollPresetId, string>>;
    PAPERDOLL_PRESETS_ROOT: string;
    PAPERDOLL_REQUIRE_MASTER_CANVAS: boolean;
    paperdollPresetLegacyId: (presetId: PaperdollPresetId) => string | null;
    resolvePaperdollPresetId: () => PaperdollPresetId;
    resolvePaperdollPresetIdFor: (
      race?: unknown,
      charClass?: unknown,
      gender?: unknown,
    ) => PaperdollPresetId;
    getPaperdollPresetRoot: (presetId?: PaperdollPresetId | string) => string;
    getPaperdollBodySrcList: (presetId?: PaperdollPresetId | string) => string[];
    isPaperdollMasterCanvasSize: (width: number, height: number) => boolean;
    getPaperdollEquipSrcList: (
      presetId: PaperdollPresetId | string | undefined,
      catalogId: string | undefined,
    ) => string[];
    getPaperdollWeaponGripSrcList: (
      presetId: PaperdollPresetId | string | undefined,
      weaponCatalogId: string | undefined,
    ) => string[];
    paperdollPresetHasBareHands: (presetId?: PaperdollPresetId | string) => boolean;
    getPaperdollArmorHandsSrcList: (
      presetId: PaperdollPresetId | string | undefined,
      armorCatalogId: string | undefined,
    ) => string[];
    getPaperdollBareHandsSrcList: (presetId?: PaperdollPresetId | string) => string[];
    getPaperdollHandsSrcList: (
      presetId: PaperdollPresetId | string | undefined,
      armorCatalogId?: string,
    ) => string[];
    presetUsesPaperdollHands: (presetId?: PaperdollPresetId | string) => boolean;
    applyPaperdollScenery: (root: HTMLElement | null) => void;
    applyPaperdollConfig: (
      root: HTMLElement | null,
      overrides?: Partial<PaperdollConfig>,
      context?: { presetId?: PaperdollPresetId | string },
    ) => void;
    applyPaperdollConfigAll: () => void;
    validarEquipPorGrade: (
      item: import('./game').EquipInstance | import('./game').ItemCatalogBase | import('./game').EquipRawInput | null | undefined,
    ) => GradeEquipValidation;
    fecharJanelaAcao?: () => void;
    abrirJanelaBloqueioGrade?: (item: unknown, nivelMinimo: number, grade: string) => void;
    mostrarAviso: (mensagem: string) => void;
    mostrarResultadoCraft?: (nomeItem: string, imgItem: string | undefined, qtd: number) => void;
    abrirInfoEquipEnchantFromGrid?: (el: HTMLElement | null) => void;
    abrirInfoScrollEnchantFromGrid?: (el: HTMLElement | null) => void;
    renderizarPerfil?: () => void;
    renderizarInventario?: () => void;
    _inventarioFiltroDocBound?: boolean;
    catalogJewelIconPath?: (jewelId: string) => string;
    catalogArmorIconPath?: (armorId: string) => string;
    catalogWeaponIconPath?: (weaponId: string) => string;
    toggleModalBackdrop?: (id: string, show: boolean, zIndex?: number) => void;
    nomeEquipDisplay?: (fullItem: EquipInstance | null | undefined) => string;
    buildCombatStatsHeroBlockHtml?: (placement: 'profile' | 'modal') => string;
    renderPainelStatsDetalhado?: () => void;
    PwaInstall?: { isStandalone: () => boolean; refreshUi: () => void };
    refreshGameSettingsUi?: () => void;
    abrirGameSettings?: () => void;
    _l2InvIconFrameHtml?: (src: string, imgClass?: string) => string;
    _l2AppendInvGridSlot?: (
      grid: HTMLElement,
      slotClass: string,
      innerHtml: string,
      onClick?: () => void,
      title?: string,
    ) => HTMLElement;
    isPaperdollFistWeaponTipo: (tipo: unknown) => boolean;
    isPaperdollFistWeaponItem: (item: EquipInstance | null | undefined) => boolean;
    syncPaperdollFistWeaponLayerClass: (
      weaponLayerEl: HTMLElement | null,
      weaponItem: EquipInstance | null | undefined,
    ) => void;

    /** Interno: evita reset Olympiad em reload do mesmo char */
    _l2miniLastCarregarChar?: string | null;
    /** true após main.ts concluir boot de scripts */
    __L2MINI_BOOT_READY?: boolean;
    __L2MINI_BOOT_PROGRESS?: number;
    hideLoadingOverlay?: () => void;
    showLoadingOverlay?: (message?: string) => void;

    motorBuffsEspeciais?: { critMult: number; esquiva: number };
    motorPet?: ReturnType<typeof setInterval> | null;
    usarSkill?: (nomeSkill: string) => void;
    iniciarAtaqueMonstro?: () => void;
    autoShotAtivo?: boolean;
    zonaAtual?: import('./game').HuntZoneData;
    tutorialFirstAttackDone?: boolean;
    TutorialEngine?: {
      isRunning?: () => boolean;
      notifyFirstAttack?: () => void;
      afterCharacterLoad?: () => void;
      bootstrapNewCharacter?: () => void;
      onNav?: (lugar: string) => void;
      notifySpellbookOpened?: () => void;
      notifySkillAssignedFromSpellbook?: () => void;
      notifyHuntSearch?: () => void;
      skipTutorial?: () => void;
      render?: () => void;
    };
    executarDanoDeUmMonstro?: (mob: unknown) => void;
    showForestDeathScreen?: () => void;
    tryProcessForestMobDeath?: (mob: unknown) => void;
    reconciliarMobsFlorestHpZero?: () => void;
    forceRemoveStuckDeadForestMob?: (monstro: unknown) => void;
    confirmForestFleeReturnToTown?: () => void;
    confirmForestDeathReturnToTown?: () => void;
    procurarMonstros?: () => void;
    tentarFugir?: () => void;
    fecharVitoriaEProcurar?: () => void;
    fecharVitoriaEVoltar?: () => void;
    atualizarIconesBuffPlayer?: (nome: string, duracaoMs: number, iconeHtml: string) => void;
    atualizarIconesDebuffMonstro?: (indexMonstro: number, nome: string, duracaoMs: number, iconeHtml: string) => void;
    refreshMobHpUI?: (monstro: unknown) => void;
    syncAllForestMobHpBars?: () => void;
    getForestTargetMobIndex?: () => number;
    aplicarDanoNoMonstro?: (index: number, dano: number, isCrit?: boolean) => void;
    atacar?: () => void;
    isAutoAtaqueLigado?: () => boolean;
    pararAutoAtaque?: () => void;

    I18N_LOCALES?: Record<import('./game').UiLocale, Record<string, unknown>>;
  }

  /** Funções globais (script tags — também acessíveis via window). */
  function salvarJogo(opts?: SalvarJogoOptions): void;
  function carregarJogo(nome: string, opts?: CarregarJogoOptions): Promise<boolean>;
  function mudarTela(id: string): void;
  function irPara(lugar: string): void;
  function atualizar(): void;
  function iniciarJogo(): void;
  function escreverLog(html: string): void;
  function iniciarAtaqueMonstro(): void;
  function pararAtaqueMonstro(): void;
  function usarSkill(nomeSkill: string): void;
  function prepararTelaCacada(): void;
  function procurarMonstros(): void;
  function tentarFugir(): void;
  function fecharVitoriaEProcurar(): void;
  function fecharVitoriaEVoltar(): void;
  function atualizarIconesBuffPlayer(nome: string, duracaoMs: number, iconeHtml: string): void;
  function atualizarIconesDebuffMonstro(indexMonstro: number, nome: string, duracaoMs: number, iconeHtml: string): void;
  function reconciliarMobsFlorestHpZero(): void;
  function forceRemoveStuckDeadForestMob(monstro: unknown): void;
  function confirmForestFleeReturnToTown(): void;
  function confirmForestDeathReturnToTown(): void;
  function renderizarMonstros(): void;
  function renderizarBarraAtalhos(): void;
  function dispararAnimacaoGCD(ms: number, skillName: string): void;
  function tocarSom(nome: import('./game').GameSoundKey): void;
  function renderizarMailbox(): void;

  /** Legado (script tags) — espelham window.* após core_globals */
  var globalCooldownAtivo: number;
  var autoAtaqueAtivo: boolean;
  var podeAtacar: boolean;
  var cooldownsAtivos: Record<string, number>;
  var tempoFimBuffGuerreiro: number;
  var tempoFimBuffMistico: number;
  var catalogoArmas: import('./game').ItemCatalogBase[];
  var catalogoArmaduras: import('./game').ItemCatalogBase[];
  var catalogoJoias: import('./game').ItemCatalogBase[];
  var clans: Array<{ id: number | string; level?: number; membros?: string[]; lider?: string; [key: string]: unknown }>;
  var playerClanId: number | string | null;
  var CastleEngine: CastleEngineApi;
  var ClanWarEngine: ClanWarEngineApi;
  var OlympiadEngine: OlympiadEngineApi;
  var EndgamePursuits: EndgamePursuitsApi;
  var GMEngine: GmEngineApi;
  var RaidEngine: RaidEngineApi;
  function installRaidAttackHook(): void;
  var _raidAttackHookInstalled: boolean;
  function abrirLobbyRaid(id?: string): void;
  function fecharLobbyRaid(): void;
  function inscreverRaid(): void;
  function entrarNaBatalhaRaid(): void;
  var RankingManager: RankingManagerApi;
  var RankingSeasons: RankingSeasonsApi;
  var RewardEngine: RewardEngineApi;
  var MarketCloud: MarketCloudApi;
  var dbBotsRanking: import('./game').BotRankingSeed[];
  var dbCastles: CastleDbEntry[];
  var catalogoZonas: Record<string, import('./game').ZoneCatalogEntry>;
  var zonasDeCaca: Record<string, import('./game').HuntZoneData>;
  var zonaAtual: import('./game').HuntZoneData;
  function getOlympiadRank(pts: number): import('./game').OlympiadRankInfo;
  function abrirPerfilChat(nome: string, source?: string): void;
  function switchLogTab(tab: string): void;
  function enviarMensagemPlayer(): void;
  function adicionarMensagemChat(
    autor: string,
    mensagem: string,
    tipo?: string,
    canal?: string,
    pularPersistencia?: boolean,
    forcedTimestamp?: number | null,
    ascensionTitle?: string,
  ): void;
  function buscarRankingGlobalReal(): Promise<CloudRankingPlayer[] | null>;
  function formatarTooltipEquipamento(
    base: unknown,
    enc: number,
    aug: boolean,
    tipo: string,
    itemRaw?: unknown,
  ): string;
  function renderizarClans(aba?: string): void | Promise<void>;
  function abrirCriacaoClan(): void;
  function selecionarLogoClan(el: HTMLElement, icon: string): void;
  function abrirListaClans(): void;
  function abrirDetalhesClan(id: string | number): void;
  function abrirPerfilMembroClan(nome: string, skipCloudInspect?: boolean): void;
  function entrarNoClan(id: string | number): void | Promise<void>;
  function confirmarCriacaoClan(): void | Promise<void>;
  function responderSolicitacao(nome: string, aceito: boolean, applicationId?: string | null): boolean | Promise<boolean>;
  function expulsarMembro(membroNome: string): void | Promise<void>;
  function convidarMembroBot(): void;
  function sairDoClan(): void | Promise<void>;
  function abrirConfiguracoesClan(): void;
  function atualizarNivelMinClan(): void;
  function atualizarLogoClan(el: HTMLElement, icon: string): void;
  function atualizarDescricaoClan(): void;
  function subirNivelClan(): void | Promise<void>;
  function abrirSegurancaClan(acao: string, alvo?: string | null): void;
  function dissolverClan(): void | Promise<void>;
  function mudarAbaMarket(aba: string): void;
  function filtrarMarket(categoria: string): void;
  function filtrarMarketGrade(grade: string): void;
  function filtrarMarketSubtipo(subtipo: string): void;
  function toggleSortMarket(): void;
  function abrirAcaoItemMarket(id: string | number): void;
  function executarCompraMarket(id: string | number): void;
  function cancelarLeilao(id: string | number): void;
  function abrirModalRegistrarMercado(): void;
  function cliqueSlotRegistroMarket(): void;
  function confirmarRegistroMarket(): void;
  function setMarketRegMaxQtd(): void;
  function filtrarHistorico(tipo: string): void;
  function refreshMarketUiI18n(): void;
  function refreshHuntZoneHud(): void;
  function zoneDisplayName(grade: string | null | undefined): string;
  function zoneCanonicalName(grade: string): string;
  function fecharJanelaAcao(): void;
  function fecharModalRegistrarMercado(): void;
  function fecharSeletorItemMarket(): void;
  function fecharVenda(): void;
  function fecharLoja(): void;
  function abrirLojaGrocer(categoria: string): void;
  function selecionarConsumivel(id: string, categoria: string, elemento: HTMLElement | null): void;
  function alterarQtdCompra(delta: number): void;
  function setQtdCompraMax(): void;
  function mostrarGradesEquipment(): void;
  function voltarMenuEquipment(): void;
  function abrirMegaLoja(grade: string): void;
  function mudarAbaLoja(tipo: string): void;
  function selecionarItemLoja(id: string, tipo: string, elemento: HTMLElement | null): void;
  function abrirLojaVenda(): void;
  function selecionarItemVenda(nome: string, elemento: HTMLElement | null): void;
  function alterarQtdVenda(delta: number): void;
  function setQtdVendaMax(): void;
  function comprarBuff(tipo: 'fighter' | 'mage' | string): void;
  function fecharEnchant(): void;
  function fecharAugment(): void;
  function fecharAugmentAcao(): void;
  function fecharAugmentResultado(): void;
  function fecharJanelaCraft(): void;
  function fecharCraftResultado(): void;
  function fecharLobbyRaid(): void;
  function fecharMenuClasses(): void;
  function abrirMenuClasses(): void;
  function confirmarTrocaClasse(novaClasse: string): void;
  function executarTrocaClasse(novaClasse: string): void;
  function fecharJanelaBloqueioGrade(): void;
  function fecharSpellbook(): void;
  function fecharMissoesDiarias(): void;
  function fecharJanelaDailyBoss(): void;
  function abrirJanelaDailyBoss(): void;
  function confirmarInicioDailyBoss(): void;
  function dailyBossSelecionarAnterior(): void;
  function dailyBossSelecionarProximo(): void;
  function dailyBossJaConsumiuHoje(): boolean;
  function fecharStatusDetalhado(): void;
  function abrirStatusDetalhado(): void;
  function abrirAcaoPerfil(tipo: string): void;
  function abrirAcaoInventario(index: number, slotPerfilPref?: string): void;
  function fecharJanelaAcao(): void;
  function equiparItemSeguro(indexNaBolsa: number): void;
  function abrirGameSettings(): void;
  function refreshGameSettingsUi(): void;
  function abrirJanelaEnchant(): void;
  function abrirInfoEquipEnchantFromGrid(el: HTMLElement | null): void;
  function abrirInfoScrollEnchantFromGrid(el: HTMLElement | null): void;
  function executarEnchant(): void | Promise<void>;
  function abrirJanelaAugment(): void;
  function executarAugment(): void | Promise<void>;
  function abrirAugmentAcao(indexInventario: number | 'equipped'): void;
  function selecionarAugmentStone(): void;
  function iniciarToqueAtalho(index: number): void;
  function soltarToqueAtalho(index: number): void;
  function cancelarToqueAtalho(): void;
  function abrirAcaoItemGeral(nome: string): void;
  function abrirSeletorAtalhoGlobal(nomeItem: string, callback: (index: number) => void): void;
  function fecharSeletorGlobal(): void;
  function fecharGameSettings(): void;
  function fecharSeletorGlobal(): void;
  function abrirModal(id: string, zIndex?: number): void;
  function fecharModal(id: string): void;
  function fecharTopModal(): void;
  function abrirDetalhesZona(grade: string): void;
  function teleportarParaZona(grade: string): void;
  function recolherLootRaid(): void;
  function abrirPerfilJogadorRanking(nome: string, isBot?: boolean): void;
  function renderizarSocial(): void;
  function mudarAbaSocial(aba: string): void;
  function renderizarPremiosRanking(): void;
  function renderizarRankingMundial(): Promise<void>;
  function navegarSelecao(direcao: number): void;
  function proximaEtapa(): Promise<void>;
  function voltarEtapa(): void;
  function atualizarPreview(): void;
  function verificarLimitePersonagem(): boolean;
  function abrirNpc(npcId: string): void;
  function abrirNpc(npcId: string): void;
  function abrirMenuSocial(menu: string): void;
  var charName: string;
  var charClass: string;
  var charRace: string;
  var nivel: number;
  var barraAtalhos: HotbarSlot[];
  var playerHP: number;
  var playerMP: number;
  var playerStats: PlayerStats;
  var inventario: InventarioStack;
  function renderizarInventario(): void;
  function renderizarPerfil(): void;
  function iniciarSistemaClans(): void | Promise<void>;
  function iniciarChatAutomatico(): void;
  function registrarProgressoMissaoDiaria(tipo: string, qty: number): void;
  function reivindicarMissaoDiaria(index: number): void;
  function reivindicarBonusMissaoDiaria(): void;
  function dispararAnimacaoCooldown(nome: string, tempoMs: number): void;
  function usarPocao(): void;
  function usarPocaoMP(nomeDaPocao: string): void;
  var SupabaseAPI: SupabaseApi;
  var SUPABASE_CONFIG: SupabaseConfig;
  function atualizarVisualPaperdoll(): void;
  function atualizarPaperdollCharSelect(charData: import('./game').PaperdollCharSelectData): void;
  function atualizarBrilhoArma(): void;
  function syncProfileEquipmentSlotGlows(): void;
  function syncPaperdollFootShadow(): void;
  function getEnchantTierGlowColor(lvl: number | string): string;
  function getEnchantPulseSpeedSeconds(lvl: number | string): number;
  function abrirJanelaCraft(categoria?: string): void;
  function fecharJanelaCraft(): void;
  function mudarAbaCraft(categoria: string): void;
  function selecionarReceita(id: string): void;
  function executarCraft(): Promise<void>;
  function fecharCraftResultado(): void;
  function mostrarResultadoCraft(nomeItem: string, imgItem: string | undefined, qtd: number): void;
  function craftOnVesperVariantChange(idBase: string): void;
  function buscarBaseDoEquipamento(idBase: string): import('./game').ItemCatalogBase | null;
  function inicializarMissoesDiarias(): void;
  function abrirMissoesDiarias(): void;
  function renderizarMissoesDiarias(): void;
  function fecharMissoesDiarias(): void;
  function aplicarHudMissoesBadge(): void;
  function atualizarWorldDailyBossUI(): void;
  function iniciarSistemaMercado(): void;
  function atualizarIconeMailbox(): void | Promise<void>;
  function verificarPagamentosPendentes(): void;
  var radarDeRacas: Record<string, { imgHomem: string; imgMulher: string; imgDestaque?: string; classesBase?: string[]; desc?: string }>;
}
