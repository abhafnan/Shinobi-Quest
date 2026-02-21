const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameState = 'menu'; // menu, playing, gameover
let score = 0;
let lastTime = 0;
let chakra = 100;
let health = 100;
let screenShake = 0;
let invincibilityFrames = 0;
let isBossFight = false;

// Character data
const CHARACTERS = {
    naruto: {
        color: '#ff3131', hair: '#FFD700', suit: '#ff3131', headband: '#003399',
        special: 'RASENGAN', specialColor: '#0088FF',
        eyeColor: '#444', powerName: 'KURAMA MODE', ability: 'FAST REGEN'
    },
    sasuke: {
        color: '#1a1a1a', hair: '#111', suit: '#1a1a1a', headband: '#333',
        special: 'CHIDORI', specialColor: '#fff',
        eyeColor: '#ff0000', powerName: 'SHARINGAN', ability: 'PREDICTION'
    },
    sakura: {
        color: '#ff6699', hair: '#ffc0cb', suit: '#ff0033', headband: '#111',
        special: 'IMPACT', specialColor: '#ffcccc',
        eyeColor: '#444', powerName: 'BYAKUGOU', ability: 'HEALING'
    },
    kakashi: {
        color: '#4a5d5c', hair: '#ccc', suit: '#4a5d5c', headband: '#111',
        special: 'CHIDORI', specialColor: '#00ffff',
        eyeColor: '#ff0000', powerName: 'KAMUI', ability: 'PHASE'
    }
};

let selectedChar = 'naruto';

// Difficulty settings (Easy Mode)
const DIFFICULTY = {
    enemySpawnRate: 0.01,
    enemySpeedBase: 3.5,
    chakraRegen: 0.5,
    autoChargeRegen: 1.5,
    damageTaken: 5,
    rasenganCost: 20,
    invincibilityDuration: 90,
    bossSpawnScore: 2000,
};

// Physics and State
let impactFlash = 0;

// Parallax Layers
const mountains = [];
const trees = [];

function spawnParallax() {
    if (Math.random() < 0.05) {
        mountains.push({ x: canvas.width, y: canvas.height - 200, w: 200 + Math.random() * 200, h: 100 + Math.random() * 100 });
    }
    if (Math.random() < 0.1) {
        trees.push({ x: canvas.width, y: canvas.height - 120, w: 40, h: 60 });
    }
}

const boss = {
    active: false,
    x: 0,
    y: 0,
    width: 120,
    height: 160,
    maxHealth: 2000,
    health: 2000,
    phase: 1,
    attackTimer: 0,
    projectiles: [],
    floatY: 0,

    init() {
        this.active = true;
        this.x = canvas.width + 200;
        this.y = 200;
        this.health = this.maxHealth;
        isBossFight = true;
    },

    draw() {
        if (!this.active) return;

        ctx.save();
        this.floatY = Math.sin(Date.now() * 0.002) * 20;
        let bx = this.x;
        let by = this.y + this.floatY;

        // Boss Aura (Uchiha Susanoo Purple)
        const auraGrad = ctx.createRadialGradient(bx + 60, by + 80, 20, bx + 60, by + 80, 120);
        auraGrad.addColorStop(0, 'rgba(128, 0, 255, 0.4)');
        auraGrad.addColorStop(1, 'rgba(128, 0, 255, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(bx + 60, by + 80, 100 + Math.sin(Date.now() * 0.01) * 10, 0, Math.PI * 2);
        ctx.fill();

        // Face/Skin
        ctx.fillStyle = '#fce2c4';
        ctx.fillRect(bx + 40, by, 40, 40);

        // Armor Plates (More realistic)
        ctx.fillStyle = '#800000';
        ctx.fillRect(bx + 20, by + 40, 80, 100); // Chest
        ctx.fillStyle = '#600000';
        ctx.fillRect(bx + 15, by + 45, 10, 80); // Shoulder Plate L
        ctx.fillRect(bx + 95, by + 45, 10, 80); // Shoulder Plate R
        ctx.fillRect(bx + 25, by + 140, 70, 15); // Belt

        // Long Spiky Hair (Black)
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.moveTo(bx + 30, by);
        ctx.lineTo(bx + 10, by + 50);
        ctx.lineTo(bx + 40, by + 30);
        ctx.lineTo(bx + 60, by + 120);
        ctx.lineTo(bx + 80, by + 30);
        ctx.lineTo(bx + 110, by + 50);
        ctx.lineTo(bx + 90, by);
        ctx.fill();

        // Sharingan Eyes
        ctx.fillStyle = 'red';
        ctx.fillRect(bx + 50, by + 15, 4, 4);
        ctx.fillRect(bx + 66, by + 15, 4, 4);

        // Boss Health Bar
        const barWidth = 400;
        const hPercent = this.health / this.maxHealth;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(canvas.width / 2 - barWidth / 2, 50, barWidth, 20);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(canvas.width / 2 - barWidth / 2, 50, barWidth * hPercent, 20);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(canvas.width / 2 - barWidth / 2, 50, barWidth, 20);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Outfit';
        ctx.fillText('MADARA UCHIHA', canvas.width / 2 - 60, 40);

        ctx.restore();

        // Draw Boss Projectiles (Fireballs)
        this.projectiles.forEach(p => {
            const fGrad = ctx.createRadialGradient(p.x, p.y, 5, p.x, p.y, 20);
            fGrad.addColorStop(0, '#fff');
            fGrad.addColorStop(0.5, '#f00');
            fGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = fGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    update() {
        if (!this.active) return;

        // Movement
        if (this.x > canvas.width - 250) {
            this.x -= 2;
        }

        this.attackTimer++;
        if (this.attackTimer > 100) {
            this.attackTimer = 0;
            // Shoot fireball
            this.projectiles.push({
                x: this.x,
                y: this.y + 80 + this.floatY,
                vx: -7,
                vy: (player.y - this.y) * 0.01 // Home in slightly
            });
        }

        this.projectiles.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;

            // Collision with player
            if (invincibilityFrames <= 0 &&
                Math.hypot(p.x - (player.x + 30), p.y - (player.y + 40)) < 40) {
                health -= DIFFICULTY.damageTaken * 2;
                invincibilityFrames = DIFFICULTY.invincibilityDuration;
                this.projectiles.splice(index, 1);
                screenShake = 20;
                if (health <= 0) gameOver();
            }

            if (p.x < -50) this.projectiles.splice(index, 1);
        });

        // Collision with player projectiles
        player.shurikens.forEach((s, index) => {
            if (s.x > this.x && s.x < this.x + this.width &&
                s.y > this.y + this.floatY && s.y < this.y + this.floatY + this.height) {
                this.health -= 20;
                impactFlash = 5; // Flash on hit
                player.shurikens.splice(index, 1);
                this.checkDeath();
            }
        });

        player.rasengans.forEach((r, index) => {
            if (r.x + 30 > this.x && r.x - 30 < this.x + this.width &&
                r.y + 30 > this.y + this.floatY && r.y - 30 < this.y + this.floatY + this.height) {
                this.health -= 50;
                impactFlash = 10; // Bigger flash for Rasengan
                screenShake = 5;
                this.checkDeath();
            }
        });
    },

    checkDeath() {
        if (this.health <= 0) {
            this.active = false;
            isBossFight = false;
            score += 5000;
            screenShake = 50;
            impactFlash = 20;
            // Delay victory screen for cinematic effect
            setTimeout(() => {
                if (gameState === 'playing') victory();
            }, 2000);
        }
    }
};

// ... (rest of the objects/resize)

// Inside gameLoop, add boss logic:
// boss.update();
// boss.draw();
// if (score > DIFFICULTY.bossSpawnScore && !boss.active && !isBossFight) boss.init();

// Inside startGame, reset boss:
// boss.active = false;
// boss.projectiles = [];
// isBossFight = false;

// Set canvas dimensions
function resize() {
    const wrapper = document.getElementById('game-wrapper');
    if (!wrapper) return;
    canvas.width = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
}
window.addEventListener('resize', resize);
resize();

// Player object
const player = {
    character: 'naruto',
    x: 100,
    y: 0,
    width: 60,
    height: 80,
    vy: 0,
    gravity: 0.7,
    jumpStrength: -16,
    isJumping: false,
    shurikens: [],
    rasengans: [],
    isCharging: false,

    tick: 0,
    frame: 0,

    draw() {
        const char = CHARACTERS[this.character];
        this.tick++;
        if (this.tick % 10 === 0) this.frame = (this.frame + 1) % 4;

        const groundY = canvas.height - 70;
        ctx.save();

        if (invincibilityFrames > 0 && Math.floor(this.tick / 5) % 2 === 0) ctx.globalAlpha = 0.5;

        let tilt = (!this.isJumping && !this.isCharging) ? 0.2 : 0;
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(tilt);
        ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));

        // Power Aura
        if (this.isCharging || (this.character === 'naruto' && chakra > 80)) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = char.specialColor;
            const auraGrad = ctx.createRadialGradient(this.x + 30, this.y + 40, 10, this.x + 30, this.y + 40, 90);
            let auraColor = char.specialColor;
            if (this.character === 'naruto' && chakra > 80) auraColor = '#FFD700';
            auraGrad.addColorStop(0, auraColor + 'AA');
            auraGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = auraGrad;
            ctx.beginPath();
            ctx.arc(this.x + 30, this.y + 40, 75 + Math.sin(this.tick * 0.2) * 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Draw Character Components
        const px = this.x;
        const py = this.y;

        // 1. LEGS (Running Animation)
        ctx.fillStyle = (this.character === 'sakura') ? '#FFCCAA' : '#333'; // Sakura has bare legs mostly
        let legL = Math.sin(this.tick * 0.2) * 15;
        let legR = -legL;
        ctx.fillRect(px + 10, py + 60 + (this.frame % 2 === 0 ? 5 : -5), 18, 20); // Left Leg
        ctx.fillRect(px + 32, py + 60 + (this.frame % 2 === 0 ? -5 : 5), 18, 20); // Right Leg

        // 2. BODY/SUIT
        ctx.fillStyle = char.suit;
        ctx.fillRect(px + 5, py + 20, 50, 45);

        // Character Specific Suit Details
        if (this.character === 'naruto') {
            ctx.fillStyle = '#111'; // Black shoulders
            ctx.fillRect(px + 5, py + 20, 50, 10);
            ctx.fillRect(px + 22, py + 30, 6, 35); // Zipper
        } else if (this.character === 'sasuke') {
            ctx.fillStyle = '#eee'; // Uchiha crest spot
            ctx.beginPath();
            ctx.arc(px + 30, py + 35, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f00';
            ctx.fillRect(px + 25, py + 35, 10, 5); // Red part of crest
        } else if (this.character === 'kakashi') {
            ctx.fillStyle = '#4a5d5c'; // Vest details
            ctx.fillRect(px + 10, py + 25, 40, 35);
            ctx.strokeStyle = '#2d3b3a';
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 15, py + 30, 30, 25); // Pockets
        }

        // 3. FACE & HEAD
        ctx.fillStyle = '#FFCCAA';
        ctx.fillRect(px + 15, py, 30, 25);

        // Character Specific Face Details
        if (this.character === 'kakashi') {
            ctx.fillStyle = '#444'; // Mask
            ctx.fillRect(px + 15, py + 12, 30, 13);
        } else if (this.character === 'naruto') {
            // Whiskers
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px + 35, py + 12); ctx.lineTo(px + 42, py + 11);
            ctx.moveTo(px + 35, py + 14); ctx.lineTo(px + 42, py + 14);
            ctx.moveTo(px + 35, py + 16); ctx.lineTo(px + 42, py + 17);
            ctx.stroke();
        } else if (this.character === 'sakura') {
            ctx.fillStyle = '#8000FF'; // Forehead seal
            ctx.beginPath();
            ctx.arc(px + 30, py + 8, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 4. EYES (Sharingan/Kurama)
        ctx.fillStyle = char.eyeColor;
        if (this.character === 'naruto' && chakra > 80) ctx.fillStyle = 'red';
        ctx.fillRect(px + 32, py + 10, 5, 2);
        if (this.character === 'kakashi' || this.character === 'sasuke') {
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'red';
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(px + 32, py + 10, 5, 3);
            ctx.shadowBlur = 0;
        }

        // 5. HEADBAND
        ctx.fillStyle = char.headband;
        ctx.fillRect(px + 12, py + 2, 36, 8);
        ctx.fillStyle = '#aaa'; // Metal Plate
        ctx.fillRect(px + 24, py + 3, 12, 6);

        // 6. HAIR
        ctx.fillStyle = char.hair;
        ctx.beginPath();
        const hx = px + 12;
        const hy = py + 3;
        ctx.moveTo(hx, hy);
        if (this.character === 'kakashi') {
            // Slanted Kakashi hair
            ctx.lineTo(hx - 10, hy - 30);
            ctx.lineTo(hx + 10, hy - 20);
            ctx.lineTo(hx + 20, hy - 35);
            ctx.lineTo(hx + 30, hy - 15);
            ctx.lineTo(hx + 36, hy);
        } else if (this.character === 'naruto') {
            // Spiky Naruto hair
            for (let i = 0; i < 6; i++) {
                ctx.lineTo(hx + i * 6 + 3, hy - 15);
                ctx.lineTo(hx + (i + 1) * 6, hy);
            }
        } else if (this.character === 'sasuke') {
            // Sasuke spiky back hair
            ctx.lineTo(hx, hy - 20);
            ctx.lineTo(hx + 15, hy - 10);
            ctx.lineTo(hx + 30, hy - 25);
            ctx.lineTo(hx + 36, hy);
        } else {
            // Sakura long hair
            ctx.lineTo(hx, hy - 10);
            ctx.lineTo(hx + 18, hy - 15);
            ctx.lineTo(hx + 36, hy - 10);
            ctx.lineTo(hx + 36, hy + 40); // Long hair down
            ctx.lineTo(hx, hy + 40);
        }
        ctx.fill();

        ctx.restore();
    },

    update() {
        if (gameState !== 'playing') return;
        if (invincibilityFrames > 0) invincibilityFrames--;

        const char = CHARACTERS[this.character];
        const groundY = canvas.height - 70 - this.height;

        // --- UNIQUE CHARACTER PASSIVE ABILITIES ---

        // Naruto: Excess Chakra (charges faster when active or high)
        let regenMod = 1.0;
        if (this.character === 'naruto' && chakra > 50) regenMod = 1.5;

        // Sakura: Health Regen (Regen 1% health if chakra > 70)
        if (this.character === 'sakura' && chakra > 70 && health < 100 && this.tick % 60 === 0) {
            health = Math.min(100, health + 2);
        }

        // Kakashi: Longer invincibility duration handled by setting it higher later

        if (this.y === groundY && !this.isCharging) {
            chakra = Math.min(100, chakra + DIFFICULTY.autoChargeRegen * regenMod);
        }

        if (this.isCharging) {
            chakra = Math.min(100, chakra + 3.0 * regenMod);
            this.vy *= 0.8;
        } else {
            this.y += this.vy;
            this.vy += this.gravity;
        }

        if (this.y > groundY) { this.y = groundY; this.vy = 0; this.isJumping = false; }

        this.shurikens.forEach((s, idx) => {
            s.x += 12; s.rotation += 0.5;
            if (s.x > canvas.width) this.shurikens.splice(idx, 1);
        });

        this.rasengans.forEach((r, idx) => {
            r.x += 8; r.rotation += 0.2;
            if (r.x > canvas.width) this.rasengans.splice(idx, 1);
        });
    },

    jump() { if (!this.isJumping) { this.vy = this.jumpStrength; this.isJumping = true; } },
    shoot() {
        if (chakra >= 5) {
            this.shurikens.push({ x: this.x + this.width, y: this.y + this.height / 2, rotation: 0 });
            chakra -= 5; updateHUD();
        }
    },
    rasengan() {
        if (chakra >= DIFFICULTY.rasenganCost) {
            const char = CHARACTERS[this.character];
            this.rasengans.push({
                x: this.x + this.width,
                y: this.y + this.height / 2,
                color: char.specialColor,
                name: char.special
            });
            chakra -= DIFFICULTY.rasenganCost;
            screenShake = 10;
            updateHUD();
        }
    }
};

// Character selection logic
document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.char-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedChar = card.dataset.char;
    });
});

// Enemies
const enemies = [];
function spawnEnemy() {
    if (gameState !== 'playing') return;
    const groundY = canvas.height - 70 - 80;
    enemies.push({
        x: canvas.width + 100,
        y: groundY,
        width: 50,
        height: 80,
        speed: DIFFICULTY.enemySpeedBase + (score / 2000) + Math.random() * 2,
        color: '#333'
    });
}

// Background elements
const bgElements = [];
function spawnCloud() {
    bgElements.push({
        x: canvas.width + 100,
        y: Math.random() * 200,
        speed: 1 + Math.random(),
        width: 100 + Math.random() * 100,
        opacity: 0.1 + Math.random() * 0.2
    });
}

// UI Elements
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const chakraBar = document.getElementById('chakra-bar');
const healthBar = document.getElementById('health-bar');
const scoreDisplay = document.getElementById('score-display');
const finalScoreDisplay = document.getElementById('final-score');
const victoryScreen = document.getElementById('victory-screen');
const victoryScoreDisplay = document.getElementById('victory-score');
const winMenuBtn = document.getElementById('win-menu-btn');

// Mobile Buttons
const jumpBtn = document.getElementById('jump-btn');
const chargeBtn = document.getElementById('charge-btn');
const shurikenBtn = document.getElementById('shuriken-btn');
const rasenganBtn = document.getElementById('rasengan-btn');

function updateHUD() {
    chakraBar.style.width = `${chakra}%`;
    healthBar.style.width = `${health}%`;
    scoreDisplay.innerText = `SCORE: ${Math.floor(score)}`;
}

function startGame() {
    gameState = 'playing';
    score = 0;
    health = 100;
    chakra = 100;
    invincibilityFrames = 0;
    player.character = selectedChar;
    player.x = 100;
    player.y = canvas.height - 150;
    player.shurikens = [];
    player.rasengans = [];
    boss.active = false;
    boss.projectiles = [];
    isBossFight = false;

    menuScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    victoryScreen.classList.remove('active');
    gameScreen.classList.add('active');

    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState = 'gameover';
    finalScoreDisplay.innerText = `SCORE: ${Math.floor(score)}`;
    gameScreen.classList.remove('active');
    gameOverScreen.classList.add('active');
}

function victory() {
    gameState = 'victory';
    victoryScoreDisplay.innerText = `SCORE: ${Math.floor(score)}`;
    gameScreen.classList.remove('active');
    victoryScreen.classList.add('active');
}

// Main Game Loop
function gameLoop(time) {
    if (gameState !== 'playing') return;
    lastTime = time;

    // Apply Impact Flash
    if (impactFlash > 0) impactFlash--;

    ctx.save();
    if (screenShake > 0) {
        ctx.translate(Math.random() * screenShake - screenShake / 2, Math.random() * screenShake - screenShake / 2);
        screenShake *= 0.9;
        if (screenShake < 0.1) screenShake = 0;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. SKY GRADIENT
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, '#001133'); skyGrad.addColorStop(1, '#1a0033');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. PARALLAX: MOUNTAINS (Slow)
    ctx.fillStyle = '#0a0a2a';
    mountains.forEach((m, i) => {
        m.x -= 0.5; // Very slow
        ctx.beginPath();
        ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + m.w / 2, m.y - m.h); ctx.lineTo(m.x + m.w, m.y);
        ctx.fill();
        if (m.x + m.w < 0) mountains.splice(i, 1);
    });

    // 3. PARALLAX: TREES (Medium)
    ctx.fillStyle = '#051a05';
    trees.forEach((t, i) => {
        t.x -= 2; // Medium speed
        ctx.fillRect(t.x, t.y, 10, 50); // Trunk
        ctx.beginPath();
        ctx.moveTo(t.x - 20, t.y); ctx.lineTo(t.x + 5, t.y - 40); ctx.lineTo(t.x + 30, t.y);
        ctx.fill();
        if (t.x + 40 < 0) trees.splice(i, 1);
    });
    spawnParallax();

    // 4. THE GROUND
    const groundY = canvas.height - 70;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, groundY, canvas.width, 70);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.strokeRect(i, groundY, 50, 70); // Ground grid
    }

    // Impact Flash Overlay
    if (impactFlash > 0) {
        ctx.save(); // Save context before applying flash style
        ctx.fillStyle = `rgba(255,255,255,${impactFlash / 10})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore(); // Restore context after flash
    }

    // Update and Draw Clouds
    bgElements.forEach((el, index) => {
        el.x -= el.speed;
        ctx.fillStyle = `rgba(255,255,255,${el.opacity})`;
        ctx.beginPath();
        ctx.arc(el.x, el.y, el.width / 2, 0, Math.PI * 2);
        ctx.fill();
        if (el.x + el.width < 0) bgElements.splice(index, 1);
    });
    if (Math.random() < 0.01) spawnCloud();

    player.update();
    player.draw();

    // Draw Shurikens
    player.shurikens.forEach((s, index) => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.fillStyle = '#777';
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            ctx.lineTo(0, -12);
            ctx.rotate(Math.PI / 2);
            ctx.lineTo(4, 0);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    });

    // Draw Special Attacks (Rasengan/Chidori/etc)
    player.rasengans.forEach((r, index) => {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rotation);

        const rGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 30);
        rGrad.addColorStop(0, '#fff');
        rGrad.addColorStop(0.5, r.color || '#0088FF');
        rGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();

        // Inner swirls / Lightning effects
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (r.name === 'CHIDORI') {
            // Jagged lightning lines
            for (let i = 0; i < 5; i++) {
                ctx.moveTo(0, 0);
                ctx.lineTo((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40);
            }
        } else {
            ctx.arc(0, 0, 15, 0, Math.PI * 1.5);
        }
        ctx.stroke();

        ctx.restore();
    });

    // Update and Draw Enemies
    enemies.forEach((enemy, index) => {
        enemy.x -= enemy.speed;

        // Ninja Enemy
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(enemy.x, enemy.y + 20, enemy.width, 60);
        ctx.fillStyle = '#FFCCAA';
        ctx.fillRect(enemy.x + 10, enemy.y, 30, 20);
        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.x + 10, enemy.y + 10, 30, 10);

        // Collision with Shuriken (More forgiving)
        player.shurikens.forEach((shuriken, sIndex) => {
            if (shuriken.x > enemy.x - 20 && shuriken.x < enemy.x + enemy.width + 20 &&
                shuriken.y > enemy.y - 20 && shuriken.y < enemy.y + enemy.height + 20) {

                const particles = 5;
                for (let i = 0; i < particles; i++) {
                    ctx.fillStyle = 'rgba(200,200,200,0.8)';
                    ctx.beginPath();
                    ctx.arc(enemy.x + 25 + (Math.random() - 0.5) * 40, enemy.y + 40 + (Math.random() - 0.5) * 40, 10 + Math.random() * 10, 0, Math.PI * 2);
                    ctx.fill();
                }

                enemies.splice(index, 1);
                player.shurikens.splice(sIndex, 1);
                score += 100;
                impactFlash = 8; // Flash on hit
            }
        });

        // Collision with Rasengan
        player.rasengans.forEach((r, rIndex) => {
            if (r.x + 40 > enemy.x && r.x - 40 < enemy.x + enemy.width &&
                r.y + 40 > enemy.y && r.y - 40 < enemy.y + enemy.height) {
                enemies.splice(index, 1);
                score += 200;
                impactFlash = 12; // Brighter flash
                screenShake = 10;
            }
        });

        // Collision with Player (Check invincibility)
        if (invincibilityFrames <= 0 &&
            enemy.x < player.x + player.width - 10 &&
            enemy.x + enemy.width > player.x + 10 &&
            enemy.y < player.y + player.height - 10 &&
            enemy.y + enemy.height > player.y + 10) {

            health -= DIFFICULTY.damageTaken;
            // Kakashi Passive: Longer Invincibility
            invincibilityFrames = player.character === 'kakashi' ? DIFFICULTY.invincibilityDuration * 2 : DIFFICULTY.invincibilityDuration;
            enemies.splice(index, 1);
            screenShake = 15;
            if (health <= 0) gameOver();
        }

        // Sasuke Passive: Prediction (Slowing down enemies nearby)
        if (player.character === 'sasuke' && Math.abs(enemy.x - player.x) < 300) {
            enemy.speed *= 0.95; // Gradual slow
        }

        if (enemy.x + enemy.width < 0) enemies.splice(index, 1);
    });

    if (!isBossFight && Math.random() < DIFFICULTY.enemySpawnRate) spawnEnemy();

    if (score > DIFFICULTY.bossSpawnScore && !boss.active && !isBossFight) {
        boss.init();
    }

    boss.update();
    boss.draw();

    score += 0.1;
    if (!player.isCharging) chakra = Math.min(100, chakra + DIFFICULTY.chakraRegen);
    updateHUD();

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

// Inputs
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') player.jump();
    if (e.code === 'KeyF') player.shoot();
    if (e.code === 'KeyD') player.rasengan();
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') player.isCharging = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') player.isCharging = false;
});

// Mouse Controls
canvas.addEventListener('mousedown', (e) => {
    if (gameState !== 'playing') return;
    if (e.button === 0) { // Left Click
        // If clicking top half, jump. Bottom half, shoot.
        if (e.offsetY < canvas.height / 2) player.jump();
        else player.shoot();
    }
    if (e.button === 2) { // Right Click
        player.isCharging = true;
    }
    if (e.button === 1) { // Middle Click
        player.rasengan();
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 2) {
        player.isCharging = false;
    }
});

// Prevent right-click menu on the game
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Touch Inputs
jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); player.jump(); });
shurikenBtn.addEventListener('touchstart', (e) => { e.preventDefault(); player.shoot(); });
rasenganBtn.addEventListener('touchstart', (e) => { e.preventDefault(); player.rasengan(); });

chargeBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    player.isCharging = true;
});
chargeBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    player.isCharging = false;
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
winMenuBtn.addEventListener('click', () => {
    gameState = 'menu';
    victoryScreen.classList.remove('active');
    menuScreen.classList.add('active');
});

// Init
updateHUD();

