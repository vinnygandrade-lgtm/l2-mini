/* ========================================== */
/* SKILLS EXECUTION ENGINE                   */
/* ========================================== */

function usarSkill(nomeSkill) {
    if (playerHP <= 0) return; 
    if (typeof monstrosAtivos === 'undefined' || monstrosAtivos.length === 0) return;

    if (nomeSkill === 'Attack') {
        atacar();
        return;
    }

    if (typeof globalCooldownAtivo !== 'undefined' && Date.now() < globalCooldownAtivo) return;

    let skill = bancoDeSkills[nomeSkill];
    if (!skill || (cooldownsAtivos[nomeSkill] > Date.now())) return;
    if (playerMP < skill.mp) {
        const msg = (typeof window.t === 'function') ? window.t('game.skills.insufficientMana') : 'Not enough MP!';
        escreverLog(`<span style="color:#3b82f6; font-weight:bold;">${msg}</span>`);
        return;
    }

    globalCooldownAtivo = Date.now() + 1200; 
    playerMP -= skill.mp;
    dispararAnimacaoCooldown(nomeSkill, skill.cd); 
    
    if(typeof tocarSom === 'function') tocarSom('enchant');
    atualizar();
    
    let monstro = monstrosAtivos[0];
    let isMagico = (typeof window.isClasseMagica === 'function' && window.isClasseMagica(charClass)) || charClass === "Dark Avenger" || charClass === "Hell Knight";
    
   switch(skill.tipo) {
        case "ataque":
        case "ataque_area":
        case "ataque_cura":
        case "ataque_ultimate":
        case "ataque_dreno":
            let atkBase = isMagico ? playerStats.mAtk : playerStats.pAtk;
            let defAlvo = isMagico ? (monstro.mDef || (monstro.def * 0.8)) : (monstro.pDef || monstro.def);
            if (monstro.debuffs && monstro.debuffs.defMult) defAlvo = Math.floor(defAlvo * monstro.debuffs.defMult);
            let danoHabilidade = Math.floor(atkBase * skill.poder);
            let danoFinal = Math.floor((danoHabilidade * 880) / (400 + (defAlvo || 1)));
            let lvlMobSkill = monstro.lvl || monstro.nivel || 1;
            if (nivel > lvlMobSkill) {
                let diff = nivel - lvlMobSkill;
                let bonus = Math.min(0.5, diff * 0.02); 
                danoFinal = Math.floor(danoFinal * (1 + bonus));
            }
            if (danoFinal < 1) danoFinal = 1;
            if (nomeSkill === "Mortal Strike" || nomeSkill === "Deadly Blow") {
                let chanceCrit = playerStats.critRate + 15; 
                if ((Math.random() * 100) < chanceCrit) { danoFinal = Math.floor(danoFinal * motorBuffsEspeciais.critMult); escreverLog(`<span style="color:#ff3333; font-weight:bold;">🗡️ CRITICAL BLOW!</span>`); }
            }
            if (nomeSkill === "Backstab") {
                if ((Math.random() * 100) < 35) { escreverLog(`<span style="color:#aaa; font-weight:bold;">The monster turned! (Backstab failed)</span>`); return; }
                else { danoFinal = Math.floor(danoFinal * motorBuffsEspeciais.critMult); escreverLog(`<span style="color:#ef4444; font-weight:bold; font-size:1.1em;">🩸 FATAL! Perfect strike from behind!</span>`); }
            }
            if (nomeSkill === "Lethal Blow" && Math.random() * 100 <= 15) { 
                let vidaArrancada = Math.floor(monstro.hp / 2); monstro.hp -= vidaArrancada;
                escreverLog(`<span style="color:#000; background:#10b981; font-weight:bold; padding:2px 5px; border-radius:3px;">⚡ LETHAL STRIKE! The monster lost half its HP!</span>`);
            }
            if ((nomeSkill === "Stun Shot" || nomeSkill === "Shield Stun" || nomeSkill === "Hammer Crush") && Math.random() * 100 <= 60) { 
                if (!monstro.debuffs) monstro.debuffs = {}; monstro.debuffs.stun = true;
                escreverLog(`<span style="color:#facc15; font-weight:bold;">💫 The monster is STUNNED!</span>`);
                atualizarIconesDebuffMonstro(0, "Stun", 5000, "💫"); 
                let velOriginal = monstro.atkSpd; monstro.atkSpd = 999999; 
                setTimeout(() => { if (monstrosAtivos.includes(monstro)) { monstro.debuffs.stun = false; monstro.atkSpd = velOriginal; escreverLog(`<span style="color:#aaa;">The stun wore off.</span>`); } }, 5000);
            }
            if (nomeSkill === "Sting" && (!monstro.debuffs || !monstro.debuffs.sangrando)) {
                if (!monstro.debuffs) monstro.debuffs = {}; monstro.debuffs.sangrando = true;
                escreverLog(`<span style="color:#b91c1c; font-weight:bold;">🩸 The strike opened a deep wound! The monster is bleeding.</span>`);
                let ticks = 0;
                let sangramentoTimer = setInterval(() => {
                    let indexMonstro = monstrosAtivos.indexOf(monstro);
                    if (indexMonstro === -1 || ticks >= 5) { clearInterval(sangramentoTimer); if (monstro.debuffs) monstro.debuffs.sangrando = false; return; }
                    let danoBleed = Math.floor(playerStats.pAtk * 0.15); 
                    escreverLog(`<span style="color:#b91c1c;">🩸 Bleed: the monster lost ${danoBleed} HP!</span>`);
                    aplicarDanoNoMonstro(indexMonstro, danoBleed); ticks++;
                }, 3000);
            }
            if (skill.tipo === "ataque_area") {
                escreverLog(`🌪️ <b style='color:${skill.cor}'>${nomeSkill}</b> hits EVERYONE for <b style='color:#ef4444'>${danoFinal}</b>!`);
                for (let i = monstrosAtivos.length - 1; i >= 0; i--) { aplicarDanoNoMonstro(i, danoFinal); }
            } else if (skill.tipo === "ataque_ultimate") {
                escreverLog(`☠️ <b style='color:${skill.cor}; font-size: 1.2em;'>ULTIMATE: ${nomeSkill}</b> obliterated the target for <b style='color:#ef4444'>${danoFinal}</b> damage!`);
                aplicarDanoNoMonstro(0, danoFinal);
            } else {
                escreverLog(`Spell <b style='color:${skill.cor}'>${nomeSkill}</b> dealt <b style='color:#ef4444'>${danoFinal}</b>!`);
                aplicarDanoNoMonstro(0, danoFinal);
                if (skill.tipo === "ataque_cura" || skill.tipo === "ataque_dreno") {
                    let porcentagemCura = (skill.tipo === "ataque_dreno") ? 0.5 : 0.4;
                    let cura = Math.floor(danoFinal * porcentagemCura);
                    playerHP = Math.min(playerStats.maxHp, playerHP + cura);
                    escreverLog(`<span style="color:#e11d48; font-weight:bold;">🩸 Blood Drain: +${cura} HP!</span>`);
                    atualizar();
                }
            }
            break;

        case "buff_spd":
            escreverLog(`<span style='color:${skill.cor}; font-weight:bold;'>${nomeSkill} ACTIVE! Speed increased.</span>`);
            atualizarIconesBuffPlayer(nomeSkill, 30000, skill.icone);
            playerStats.atkSpeed = Math.floor(playerStats.atkSpeed / skill.poder);
            atualizar();
            setTimeout(() => { calcularStatusGlobais(); atualizar(); }, 30000);
            break;

        case "utilidade": 
            escreverLog(`<span style='color:${skill.cor}; font-weight:bold;'>${nomeSkill} activated!</span>`);
            atualizarIconesBuffPlayer(nomeSkill, 20000, skill.icone);
            pararAtaqueMonstro(); 
            setTimeout(() => { 
                if (monstrosAtivos.length > 0 && document.getElementById('tela-floresta').style.display === 'flex') {
                    iniciarAtaqueMonstro(); 
                    escreverLog(`<span style='color:#ef4444;'>Effect ended! The monsters attack again!</span>`);
                }
            }, 20000);
            break;
            
        case "pet":
            if (motorPet) clearInterval(motorPet);
            let nomePet = "PET"; let iconePet = "🐾"; let corFundoPet = "#111"; let baseAtaquePet = playerStats.pAtk; let multDano = 1.5; let corTextoAtk = "#ccc";
            if (nomeSkill === "Summon Zombie") { nomePet = "ZOMBIE"; iconePet = "🧟"; corFundoPet = "#166534"; baseAtaquePet = playerStats.mAtk; corTextoAtk = "#4ade80"; multDano = 1.5; }
            else if (nomeSkill === "Summon Kai the Cat") { nomePet = "KAI THE CAT"; iconePet = "🐱"; corFundoPet = "#ca8a04"; baseAtaquePet = playerStats.mAtk; corTextoAtk = "#fef08a"; multDano = 2.0; }
            else if (nomeSkill === "Summon Feline King") { nomePet = "FELINE KING"; iconePet = "🦁"; corFundoPet = "#b91c1c"; baseAtaquePet = playerStats.mAtk; corTextoAtk = "#fca5a5"; multDano = 3.5; }
            else if (nomeSkill === "Summon Silhouette") { nomePet = "SILHOUETTE"; iconePet = "👤"; corFundoPet = "#475569"; baseAtaquePet = playerStats.mAtk; corTextoAtk = "#94a3b8"; multDano = 2.5; }
            else if (nomeSkill === "Summon Spectral Lord") { nomePet = "SPECTRAL LORD"; iconePet = "🗡️"; corFundoPet = "#1e293b"; baseAtaquePet = playerStats.mAtk; corTextoAtk = "#cbd5e1"; multDano = 4.5; }
            else if (nomeSkill === "Summon Storm Cubic") { nomePet = "STORM CUBIC"; iconePet = "🧊"; corFundoPet = "#0284c7"; baseAtaquePet = playerStats.mAtk; corTextoAtk = "#7dd3fc"; multDano = 2.0; }
            else if (nomeSkill === "Summon Mirage the Unicorn") { nomePet = "MIRAGE UNICORN"; iconePet = "🦄"; corFundoPet = "#0ea5e9"; baseAtaquePet = playerStats.mAtk; corTextoAtk = "#7dd3fc"; multDano = 2.2; }
            else if (nomeSkill === "Summon Aqua Cubic") { nomePet = "AQUA CUBIC"; iconePet = "🧊"; corFundoPet = "#2563eb"; baseAtaquePet = playerStats.mAtk; corTextoAtk = "#60a5fa"; multDano = 1.8; }
            else if (nomeSkill === "Summon Magnus the Unicorn") { nomePet = "MAGNUS"; iconePet = "👑"; corFundoPet = "#3730a3"; baseAtaquePet = playerStats.mAtk; corTextoAtk = "#a5b4fc"; multDano = 4.0; }
            else if (nomeSkill === "Summon Mechanic Golem") { nomePet = "MECHANIC GOLEM"; iconePet = "🤖"; corFundoPet = "#475569"; baseAtaquePet = playerStats.pAtk; corTextoAtk = "#94a3b8"; multDano = 1.8; }
            else if (nomeSkill === "Summon Big Boom") { nomePet = "BIG BOOM"; iconePet = "💣"; corFundoPet = "#991b1b"; baseAtaquePet = playerStats.pAtk; corTextoAtk = "#fca5a5"; multDano = 3.0; }
            else if (nomeSkill === "Summon Siege Golem") { nomePet = "SIEGE GOLEM"; iconePet = "🏰"; corFundoPet = "#1e293b"; baseAtaquePet = playerStats.pAtk; corTextoAtk = "#cbd5e1"; multDano = 5.0; }
            else { nomePet = "PANTERA"; iconePet = "🐆"; corFundoPet = "#111827"; baseAtaquePet = playerStats.pAtk; corTextoAtk = "#52525b"; multDano = 1.5; }
            escreverLog(`<span style="color:#fff; background:${corFundoPet}; font-weight:bold; padding:2px;">${iconePet} ${nomePet} SUMMONED!</span>`);
            atualizarIconesBuffPlayer(nomeSkill, 120000, skill.icone);
            motorPet = setInterval(() => {
                if (monstrosAtivos.length > 0) {
                    let monstro = monstrosAtivos[0]; let defAlvo = monstro.pDef || monstro.def;
                    if (monstro.debuffs && monstro.debuffs.defMult) defAlvo = Math.floor(defAlvo * monstro.debuffs.defMult);
                    let danoP = Math.floor((baseAtaquePet * multDano * 70) / (defAlvo || 1));
                    if (danoP < 1) danoP = 1; escreverLog(`<span style="color:${corTextoAtk}; font-weight:bold;">${nomePet} attacks: ${danoP}!</span>`);
                    aplicarDanoNoMonstro(0, danoP);
                }
            }, 2000);
            setTimeout(() => { if (motorPet) { clearInterval(motorPet); motorPet = null; escreverLog(`<span style="color:#aaa;">${nomePet} returned to its realm.</span>`); } }, 120000);
            break;

        case "debuff_spoil":
            if (!monstro.debuffs) monstro.debuffs = {}; monstro.debuffs.spoil = true;
            escreverLog(`<span style="color:#3b82f6; font-weight:bold;">✨ The monster was swallowed by Spoil's blue light!</span>`);
            atualizarIconesDebuffMonstro(0, nomeSkill, 20000, skill.icone);
            if (nomeSkill === "Spoil Festival") { monstro.debuffs.defMult = 0.85; escreverLog(`<span style='color:${skill.cor};'>The monster's defense fell.</span>`); }
            break;

       case "debuff":
            if (!monstro.debuffs) monstro.debuffs = {}; escreverLog(`<span style="color:${skill.cor}; font-weight:bold;">Monster cursed: ${nomeSkill}!</span>`);
            if (["Hex", "Curse Weakness", "Curse Gloom", "Surrender To Fire", "Poison Arrow", "Poison Dance", "Surrender To Water", "Crippling Blow"].includes(nomeSkill)) { monstro.debuffs.defMult = 0.7; escreverLog(`<span style='color:${skill.cor}; font-weight:bold;'>The enemy's defense shattered!</span>`); }
            if (["Howl", "Freezing Strike", "Sand Bomb", "Wind Shackle"].includes(nomeSkill)) { monstro.debuffs.atkMult = 0.7; escreverLog(`<span style='color:${skill.cor}; font-weight:bold;'>The enemy is slowed and weakened.</span>`); }
            if (["Hamstring", "Dryad Root", "Arrest", "Stun Shot"].includes(nomeSkill)) { monstro.debuffs.preso = true; escreverLog(`<span style='color:${skill.cor}; font-weight:bold;'>The monster is pinned in place!</span>`); }
            if ((nomeSkill === "Poison Arrow" || nomeSkill === "Poison Dance") && !monstro.debuffs.envenenado) {
                monstro.debuffs.envenenado = true; escreverLog(`<span style="color:#10b981; font-weight:bold;">🐍 The monster was poisoned and started losing HP!</span>`);
                let ticksVeneno = 0;
                let venenoTimer = setInterval(() => {
                    let indexMonstro = monstrosAtivos.indexOf(monstro);
                    if (indexMonstro === -1 || ticksVeneno >= 5) { clearInterval(venenoTimer); if (monstro.debuffs) monstro.debuffs.envenenado = false; return; }
                    let danoVeneno = Math.max(5, Math.floor((isMagico ? playerStats.mAtk : playerStats.pAtk) * 0.10));
                    escreverLog(`<span style="color:#10b981;">🧪 Poison: the monster took ${danoVeneno} toxic damage!</span>`);
                    aplicarDanoNoMonstro(indexMonstro, danoVeneno); ticksVeneno++;
                }, 3000); 
            }
            if (nomeSkill === "Entangle") {
                if (!monstro.debuffs) monstro.debuffs = {}; monstro.debuffs.defMult = 0.8;
                let velOriginal = monstro.atkSpd; monstro.atkSpd *= 1.5;
                escreverLog(`<span style='color:${skill.cor}; font-weight:bold;'>🌱 The monster is entangled! Slow and vulnerable.</span>`);
                atualizarIconesDebuffMonstro(0, "Entangle", 15000, "🌱");
                setTimeout(() => { if (monstrosAtivos.includes(monstro)) { monstro.debuffs.defMult = 1.0; if (monstro.atkSpd > velOriginal) monstro.atkSpd = velOriginal; escreverLog(`<span style='color:#aaa;'>The vines snapped away.</span>`); } }, 15000);
            }
            atualizarIconesDebuffMonstro(0, nomeSkill, 15000, skill.icone);
            setTimeout(() => { if (monstrosAtivos.includes(monstro)) { monstro.debuffs = {}; escreverLog(`<span style="color:#aaa;">Curse faded.</span>`); } }, 15000);
            break;
            
        case "buff_def":
            escreverLog(`<span style='color:${skill.cor}; font-weight:bold;'>${nomeSkill} ACTIVE!</span>`);
            atualizarIconesBuffPlayer(nomeSkill, 30000, skill.icone);
            if (nomeSkill === "Ultimate Evasion") { motorBuffsEspeciais.esquiva = 40; setTimeout(() => { motorBuffsEspeciais.esquiva = 0; }, 30000); }
            playerStats.pDef = Math.floor(playerStats.pDef * skill.poder); atualizar();
            setTimeout(() => { calcularStatusGlobais(); atualizar(); }, 30000);
            break;

        case "buff_atk":
            let poderFinal = skill.poder;
            if ((nomeSkill === "Frenzy" || nomeSkill === "Bison Spirit Totem") && (playerHP / playerStats.maxHp) * 100 <= 30) {
                poderFinal = 5.0; escreverLog(`<span style="color:#ff0000; font-weight:bold; font-size:1.2em; text-shadow: 1px 1px 0 #000;">🩸 LIMIT BREAK! MAX FURY!</span>`);
            }
            escreverLog(`<span style='color:${skill.cor}; font-weight:bold;'>${nomeSkill} ACTIVE!</span>`);
            atualizarIconesBuffPlayer(nomeSkill, 30000, skill.icone);
            if (nomeSkill === "Vicious Stance") { let oldMult = motorBuffsEspeciais.critMult; motorBuffsEspeciais.critMult = 2.5; setTimeout(() => { motorBuffsEspeciais.critMult = oldMult; }, 30000); }
            else { if (isMagico) playerStats.mAtk = Math.floor(playerStats.mAtk * poderFinal); else playerStats.pAtk = Math.floor(playerStats.pAtk * poderFinal); if (nomeSkill === "Focus Attack") playerStats.atkSpeed = Math.floor(playerStats.atkSpeed * 0.85); }
            atualizar(); setTimeout(() => { calcularStatusGlobais(); atualizar(); }, 30000);
            break;

       case "cura":
            let hpC = Math.floor(playerStats.maxHp * skill.poder);
            playerHP = Math.min(playerStats.maxHp, playerHP + hpC); escreverLog(`<span style="color:${skill.cor}; font-weight:bold;">Recovered ${hpC} HP!</span>`);
            atualizar();
            break;

        case "cura_mp":
            let curaMana = Math.floor(playerStats.maxMp * skill.poder);
            playerMP = Math.min(playerStats.maxMp, playerMP + curaMana); escreverLog(`<span style="color:${skill.cor}; font-weight:bold;">${skill.icone} Eva's light restored ${curaMana} MP!</span>`);
            atualizar();
            break;
    }   
}
