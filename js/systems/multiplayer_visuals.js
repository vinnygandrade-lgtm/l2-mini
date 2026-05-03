/**
 * MULTIPLAYER_VISUALS.JS - Motor Gráfico para Jogadores Online
 * Responsável por renderizar outros jogadores na Praça da Cidade.
 */

const MultiplayerVisuals = {
    containerId: 'online-players-area',
    
    init() {
        console.log("👥 Motor de Visualização Multiplayer iniciado.");
        this.createContainer();
        
        // Escuta atualizações de presença vindas do SupabaseAPI
        window.addEventListener('l2-presence-update', (e) => {
            this.renderPlayers(e.detail);
        });
    },

    createContainer() {
        const praca = document.getElementById('praca-cidade');
        if (!praca) return;

        // Se já existe, não cria de novo
        if (document.getElementById(this.containerId)) return;

        const onlineArea = document.createElement('div');
        onlineArea.id = this.containerId;
        onlineArea.className = 'online-players-grid';
        
        // Inserir após o título da Town Square
        const title = praca.querySelector('h4');
        if (title) {
            title.insertAdjacentElement('afterend', onlineArea);
        } else {
            praca.prepend(onlineArea);
        }
    },

    renderPlayers(presenceState) {
        const wrap = document.getElementById('multiplayer-status');
        if (!wrap) return;

        function rosterLines(state) {
            const out = [];
            if (!state || typeof state !== 'object') return out;
            const selfName = typeof window.charName === 'string' ? window.charName.toLowerCase() : '';
            Object.keys(state).forEach((key) => {
                const bucket = state[key];
                if (!Array.isArray(bucket)) return;
                bucket.forEach((item) => {
                    if (!item || typeof item !== 'object') return;
                    const meta =
                        item.charName != null || item.char_name != null
                            ? item
                            : item.presences && item.presences[0] && typeof item.presences[0] === 'object'
                              ? item.presences[0]
                              : item;
                    if (!meta || typeof meta !== 'object') return;
                    const name = meta.charName || meta.char_name || key;
                    if (selfName && String(name).toLowerCase() === selfName) return;
                    const tit = meta.ascensionTitle || '';
                    const line = tit ? `${name} · ${tit}` : String(name);
                    if (out.indexOf(line) === -1) out.push(line);
                });
            });
            return out;
        }

        const lines = rosterLines(presenceState);
        const n = lines.length;
        const tFn = typeof window.t === 'function' ? window.t : null;
        if (n === 0) {
            wrap.setAttribute('title', tFn ? tFn('game.multiplayer.presenceNoOthers') : '');
            return;
        }
        const header = tFn ? tFn('game.multiplayer.onlineRosterTitle', { n }) : `Other players online (${n})`;
        const body = lines.slice(0, 12).join('\n');
        const suffix = n > 12 ? (tFn ? '\n' + tFn('game.multiplayer.andMore') : '\n…') : '';
        wrap.setAttribute('title', header + '\n' + body + suffix);
    },

    createPlayerCard(player) {
        const div = document.createElement('div');
        div.className = 'player-online-card';
        
        // Pega o avatar correto baseado no AuthEngine (que já tem o mapeamento)
        const avatarImg = typeof AuthEngine !== 'undefined' ? 
            AuthEngine.getAvatarForClass(player.charClass, player.race, player.gender) : 
            'assets/chars/homem.png';

        div.innerHTML = `
            <div class="player-online-avatar">
                <img src="${avatarImg}">
                <div class="online-indicator"></div>
            </div>
            <div class="player-online-info">
                <div class="player-name">${player.charName}</div>
                <div class="player-sub">${player.charClass.replace('_', ' ')} (Lv.${player.level})</div>
            </div>
        `;

        div.onclick = () => {
            if (typeof abrirPerfilJogadorRanking === 'function') {
                // Como não temos o objeto completo do bot, passamos os dados mínimos
                // para o sistema de perfil que já existe.
                window.l2Alert(typeof window.t === 'function' ? window.t('game.mp.viewingPlayer', { name: player.charName }) : `Viewing details of ${player.charName}...`);
                // No futuro, podemos buscar os dados completos no banco aqui
            }
        };

        return div;
    }
};

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Aguarda um pouco para garantir que o SupabaseAPI e outros estejam prontos
    setTimeout(() => MultiplayerVisuals.init(), 1000);
});
