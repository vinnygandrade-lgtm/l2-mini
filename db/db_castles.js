/**
 * DB_CASTLES.JS
 * Banco de dados estático dos castelos do mundo de Aden
 */
const dbCastles = [
    { 
        id: 'gludio', 
        nome: 'Gludio Castle', 
        descricao: 'The gatekeeper to the western territories. A strategic bastion near the starting lands.',
        img: 'assets/npcs/merchant.png', // Placeholder
        minLevel: 20,
        taxRate: 5,
        baseIncome: 5000 // Adena per cycle
    },
    { 
        id: 'dion', 
        nome: 'Dion Castle', 
        descricao: 'Located in the heart of the fertile Dion territories, known for its scenic views and greenery.',
        img: 'assets/npcs/merchant.png',
        minLevel: 30,
        taxRate: 8,
        baseIncome: 8000
    },
    { 
        id: 'giran', 
        nome: 'Giran Castle', 
        descricao: 'The economic heart of Aden. Owning Giran is a symbol of immense wealth and power.',
        img: 'assets/npcs/merchant.png',
        minLevel: 45,
        taxRate: 15,
        baseIncome: 25000
    },
    { 
        id: 'oren', 
        nome: 'Oren Castle', 
        descricao: 'A cold, mountain fortress. Oren stands as a shield against the northern threats.',
        img: 'assets/npcs/merchant.png',
        minLevel: 55,
        taxRate: 10,
        baseIncome: 12000
    },
    { 
        id: 'aden', 
        nome: 'Aden Castle', 
        descricao: 'The capital city. The most prestigious castle in the land. Only the strongest clan can rule here.',
        img: 'assets/npcs/merchant.png',
        minLevel: 75,
        taxRate: 20,
        baseIncome: 50000
    },
    { 
        id: 'innadril', 
        nome: 'Innadril Castle', 
        descricao: 'The water city. A beautiful castle surrounded by rivers and lakes, near Heine.',
        img: 'assets/npcs/merchant.png',
        minLevel: 50,
        taxRate: 10,
        baseIncome: 10000
    },
    { 
        id: 'goddard', 
        nome: 'Goddard Castle', 
        descricao: 'A massive fortress in the arid north, built to withstand any siege.',
        img: 'assets/npcs/merchant.png',
        minLevel: 70,
        taxRate: 15,
        baseIncome: 30000
    },
    { 
        id: 'rune', 
        nome: 'Rune Castle', 
        descricao: 'A mystical and imposing castle, home to the finest warriors and mages of the north.',
        img: 'assets/npcs/merchant.png',
        minLevel: 65,
        taxRate: 12,
        baseIncome: 20000
    },
    { 
        id: 'schuttgart', 
        nome: 'Schuttgart Castle', 
        descricao: 'The frozen fortress of the far north. Only those who can brave the winter can rule here.',
        img: 'assets/npcs/merchant.png',
        minLevel: 60,
        taxRate: 10,
        baseIncome: 15000
    }
];

window.dbCastles = dbCastles;
