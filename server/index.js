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
        socket.charName = playerData.nome;
        const roomId = 'olympiad_global'; 
        socket.join(roomId);
        playerToRoom.set(socket.id, roomId);
        
        console.log(`⚔️ ${playerData.nome} entrou no lobby global`);

        // Notifica TODOS que alguém entrou para forçar o pareamento visual
        io.to(roomId).emit('oly_player_entered', playerData);
    });

    // SAIR DO LOBBY
    socket.on('oly_leave_lobby', (data) => {
        const roomId = 'olympiad_global';
        if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            if (socket.charName) room.readyPlayers.delete(socket.charName.toLowerCase());
        }
        socket.leave(roomId);
        console.log(`🚪 ${socket.charName || socket.id} saiu do lobby`);
    });

    // 2. ENVIAR DESAFIO DIRETO (Broadcast para todos no lobby)
    socket.on('oly_send_challenge', (data) => {
        console.log(`📣 Desafio de ${socket.charName} enviado para todos.`);
        // Usamos io.emit para garantir que chegue em todas as abas, inclusive mobile
        io.emit('oly_challenge_received', data);
    });

    // 3. CONFIRMAÇÃO DE LUTA
    socket.on('oly_confirm_ready', (data) => {
        const roomId = 'olympiad_global';
        if (!rooms.has(roomId)) {
            rooms.set(roomId, { readyPlayers: new Map() });
        }
        
        const room = rooms.get(roomId);
        room.readyPlayers.set(socket.charName.toLowerCase(), true);

        console.log(`✅ ${socket.charName} está pronto.`);

        // Sincroniza o estado de pronto para todos
        io.emit('oly_player_ready_sync', {
            nome: socket.charName,
            readyCount: room.readyPlayers.size
        });

        // Se houver 2 ou mais prontos, manda começar
        if (room.readyPlayers.size >= 2) {
            console.log("🚀 Iniciando duelo para todos os prontos!");
            io.emit('oly_start_duel_now');
            room.readyPlayers.clear(); 
        }
    });

    // Limpeza de sala ao desconectar para evitar que o servidor "se perca"
    socket.on('disconnect', () => {
        const roomId = 'olympiad_global';
        const room = rooms.get(roomId);
        if (room && socket.charName) {
            room.readyPlayers.delete(socket.charName.toLowerCase());
        }
        console.log(`❌ Jogador desconectado: ${socket.charName || socket.id}`);
    });

    // 4. COMBATE EM TEMPO REAL (Retransmissão Global)
    socket.on('oly_combat_event', (payload) => {
        // Envia para todos exceto o remetente
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
