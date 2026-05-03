const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// Configuração de CORS robusta para Express
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

// Rota de Health Check para diagnóstico
app.get('/', (req, res) => {
    res.send('L2 Mini Arena Server is running!');
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', players: io.engine.clientsCount });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permite qualquer origem para evitar bloqueios no Vercel/GitHub Pages
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true // Compatibilidade extra
});

// --- ESTADO DO SERVIDOR (MMO STYLE) ---
// No Node.js, os dados ficam na memória, blindados contra F5 do jogador
const rooms = new Map(); // roomId -> { players: Map, state: 'waiting'|'fighting' }
const playerToRoom = new Map(); // socket.id -> roomId

io.on('connection', (socket) => {
    console.log(`⚡ Novo jogador conectado: ${socket.id}`);

    // 1. ENTRAR NO LOBBY / PROCURAR LUTA
    socket.on('oly_join_lobby', (playerData) => {
        const roomId = 'olympiad_global'; // Para simplificar, todos na mesma "sala" de espera
        socket.join(roomId);
        playerToRoom.set(socket.id, roomId);
        
        socket.charName = playerData.nome;
        console.log(`⚔️ ${playerData.nome} entrou no lobby da Olympiada`);

        // Notifica outros jogadores que alguém entrou (Broadcast)
        socket.to(roomId).emit('oly_player_entered', playerData);
    });

    // 2. ENVIAR DESAFIO DIRETO
    socket.on('oly_send_challenge', (data) => {
        // No Node, enviamos apenas para quem interessa
        console.log(`📣 Desafio de ${socket.charName} enviado.`);
        socket.broadcast.emit('oly_challenge_received', data);
    });

    // 3. CONFIRMAÇÃO DE LUTA (A BARREIRA DE OURO)
    // Aqui é onde o Node.js brilha: ele guarda quem confirmou
    socket.on('oly_confirm_ready', (data) => {
        const roomId = playerToRoom.get(socket.id);
        if (!rooms.has(roomId)) {
            rooms.set(roomId, { readyPlayers: new Set() });
        }
        
        const room = rooms.get(roomId);
        room.readyPlayers.add(socket.charName);

        console.log(`✅ ${socket.charName} está pronto na sala ${roomId}`);

        // O Servidor avisa a todos quem já confirmou
        io.to(roomId).emit('oly_player_ready_sync', {
            nome: socket.charName,
            allReady: room.readyPlayers.size >= 2
        });

        // Se os dois estão prontos, o SERVIDOR manda começar
        if (room.readyPlayers.size >= 2) {
            console.log("🚀 BARREIRA VENCIDA: Iniciando duelo autoritativo!");
            io.to(roomId).emit('oly_start_duel_now');
            room.readyPlayers.clear(); // Limpa para a próxima
        }
    });

    // 4. COMBATE EM TEMPO REAL (RETRANSMISSÃO ULTRA-RÁPIDA)
    socket.on('oly_combat_event', (payload) => {
        // Retransmite ataques e skills instantaneamente
        socket.broadcast.emit('oly_combat_update', payload);
    });

    // 5. DESCONEXÃO (A TOLERÂNCIA DE 5 MINUTOS)
    socket.on('disconnect', () => {
        console.log(`❌ Jogador desconectado: ${socket.charName || socket.id}`);
        // Aqui poderíamos implementar a lógica de "esperar 5 minutos" 
        // antes de remover o personagem do mundo.
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
    ==========================================
    L2 MINI - ARENA SERVER (NODE.JS)
    Status: ONLINE na porta ${PORT}
    ==========================================
    `);
});
