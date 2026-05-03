/**
 * BANCO DE DADOS DE ZONAS DE FARM
 */
const catalogoZonas = {
    'No-Grade': {
        nome: 'Talking Island',
        descricao: 'The starting point for every adventurer. A peaceful isle—yet corrupted beasts stalk its shores.',
        nivelSugerido: '1 - 20',
        custo: 0,
        img: 'assets/npcs/gatekeeper.png', // Placeholder ou imagem da zona se houver
        monstros: ['Spider', 'Wolf', 'Orc Archer'],
        recompensas: ['Adenas', 'Animal Skin', 'Iron Ore'],
        cor: '#fff'
    },
    'D': {
        nome: 'Ruins of Despair',
        descricao: 'Ancient ruins overrun by skeleton hosts and restless dead.',
        nivelSugerido: '20 - 40',
        custo: 100,
        img: 'assets/npcs/gatekeeper.png',
        monstros: ['Skeleton', 'Zombie', 'Shield Skeleton'],
        recompensas: ['Adenas', 'Animal Bone', 'Coal'],
        cor: '#60a5fa'
    },
    'C': {
        nome: 'Death Pass',
        descricao: 'A narrow, shadowed gorge—travelers say the wind still carries the cries of the ambushed.',
        nivelSugerido: '40 - 52',
        custo: 500,
        img: 'assets/npcs/gatekeeper.png',
        monstros: ['Wyvern', 'Guardian Tree', 'Ghost'],
        recompensas: ['Adenas', 'Charcoal', 'Ancient Coin'],
        cor: '#93c5fd'
    },
    'B': {
        nome: 'Dragon Valley',
        descricao: 'A scorching volcanic vale—home to lesser drakes and beasts of molten stone.',
        nivelSugerido: '52 - 61',
        custo: 2000,
        img: 'assets/npcs/gatekeeper.png',
        monstros: ['Drake', 'Cave Maiden', 'Dragon Guard'],
        recompensas: ['Adenas', 'Recipes', 'Ancient Coin'],
        cor: '#fca5a5'
    },
    'A': {
        nome: 'Tower of Insolence',
        descricao: 'A colossal tower that defies the heavens—each floor deadlier than the last.',
        nivelSugerido: '61 - 76',
        custo: 10000,
        img: 'assets/npcs/gatekeeper.png',
        monstros: ['Angel', 'Halt', 'Messenger'],
        recompensas: ['Adenas', 'S-Grade Mats', 'Ancient Coin'],
        cor: '#fde047'
    },
    'S': {
        nome: 'Imperial Tomb',
        descricao: 'The final resting hall of long-fallen emperors—only the strongest heroes endure here.',
        nivelSugerido: '76 - 80+',
        custo: 50000,
        img: 'assets/npcs/gatekeeper.png',
        monstros: ['Imperial Guard', 'Lich', 'Harik'],
        recompensas: ['Adenas', 'Elite Recipes', 'Ancient Coin'],
        cor: '#c084fc'
    }
};

window.catalogoZonas = catalogoZonas;
