// --- DOM ---
const blockCanvas = document.getElementById('game-canvas');
const blockCtx = blockCanvas.getContext('2d');
const triCanvas = document.getElementById('game-canvas-triangle');
const triCtx = triCanvas.getContext('2d');
const wrapperEl = document.getElementById('experience-wrapper');
const gameAreaEl = document.getElementById('game-area');
const toggleBtn = document.getElementById('game-toggle');
const instructionsEl = document.getElementById('game-instructions');

// --- Constants ---
const TRIANGLE_WIDTH = 40;
const TRIANGLE_HEIGHT = 35;
const TRIANGLE_SPEED = 400;       // px/sec
const PROJECTILE_SPEED = 700;     // px/sec
const PROJECTILE_RADIUS = 4;
const FIRE_COOLDOWN = 80;         // ms
const TARGET_BLOCK_SIZE = 50;     // px (approx)
const SPLASH_RADIUS = 2;          // blocks (5x5 area per hit)
const MAX_FALLING = 400;
const GRAVITY = 600;              // px/sec^2

// --- Block color ---
const BLOCK_COLOR = '#c05010';

// --- Game state ---
let gameActive = true;
let lastTime = 0;
let lastFireTime = 0;

const keys = {};

const triangle = { x: 0, y: 0 };

let projectiles = [];    // { x, y } — y is in "world" coords: 0 = top of triCanvas, continues into blockCanvas
let fallingBlocks = [];  // { x, y, w, h, color, vx, vy, alpha } — y relative to blockCanvas

let blockGrid = [];
let blockCols = 0;
let blockRows = 0;
let blockW = 0;
let blockH = 0;
let remainingBlocks = 0;

// Geometry
let triCanvasH = 0;
let blockCanvasH = 0;
let totalWidth = 0;

// --- Canvas sizing ---
function sizeCanvases() {
    // Triangle canvas fills the game-area div
    triCanvas.width = gameAreaEl.offsetWidth;
    triCanvas.height = gameAreaEl.offsetHeight;
    triCanvasH = triCanvas.height;

    // Block canvas fills the experience-wrapper
    blockCanvas.width = wrapperEl.offsetWidth;
    blockCanvas.height = wrapperEl.offsetHeight;
    blockCanvasH = blockCanvas.height;

    totalWidth = blockCanvas.width;
}

// --- Block grid ---
function initBlocks() {
    const availH = blockCanvas.height;
    const availW = blockCanvas.width;

    blockCols = Math.round(availW / TARGET_BLOCK_SIZE);
    blockRows = Math.round(availH / TARGET_BLOCK_SIZE);
    if (blockCols < 1) blockCols = 1;
    if (blockRows < 1) blockRows = 1;

    blockW = availW / blockCols;
    blockH = availH / blockRows;

    blockGrid = [];
    for (let r = 0; r < blockRows; r++) {
        const row = [];
        for (let c = 0; c < blockCols; c++) {
            row.push({ color: BLOCK_COLOR });
        }
        blockGrid.push(row);
    }
    remainingBlocks = blockRows * blockCols;
}

function resetGame() {
    triangle.x = totalWidth / 2;
    triangle.y = (triCanvasH - TRIANGLE_HEIGHT) / 2;
    projectiles = [];
    fallingBlocks = [];
    lastFireTime = 0;
    initBlocks();
}

// --- Init ---
function init() {
    sizeCanvases();
    resetGame();

    const ro = new ResizeObserver(() => {
        sizeCanvases();
    });
    ro.observe(wrapperEl);
    ro.observe(gameAreaEl);
}

init();

// --- Input ---
window.addEventListener('keydown', (e) => {
    if (!gameActive) return;
    keys[e.key] = true;

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// --- Toggle ---
toggleBtn.addEventListener('click', () => {
    gameActive = !gameActive;
    toggleBtn.textContent = gameActive ? 'Game: ON' : 'Game: OFF';
    toggleBtn.classList.toggle('off', !gameActive);

    if (gameActive) {
        blockCanvas.style.display = 'block';
        gameAreaEl.classList.remove('hidden');
        sizeCanvases();
        resetGame();
        lastTime = 0;
        requestAnimationFrame(gameLoop);
    } else {
        blockCanvas.style.display = 'none';
        gameAreaEl.classList.add('hidden');
        for (const k in keys) keys[k] = false;
    }
});

// --- Update ---
function update(dt) {
    // Triangle movement
    let dx = 0;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;
    triangle.x += dx * TRIANGLE_SPEED * dt;

    // Clamp to canvas
    const halfW = TRIANGLE_WIDTH / 2;
    if (triangle.x < halfW) triangle.x = halfW;
    if (triangle.x > totalWidth - halfW) triangle.x = totalWidth - halfW;

    // Fire projectile — y starts at triangle tip in "world" space
    // World space: 0 to triCanvasH is the triangle canvas, triCanvasH onwards is the block canvas
    if (keys[' '] && (performance.now() - lastFireTime >= FIRE_COOLDOWN)) {
        lastFireTime = performance.now();
        projectiles.push({
            x: triangle.x,
            y: triangle.y + TRIANGLE_HEIGHT  // tip of downward-pointing triangle
        });
    }

    // Update projectiles and check collisions
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.y += PROJECTILE_SPEED * dt;

        // World y relative to block canvas
        const blockY = p.y - triCanvasH;

        // Off-screen (past bottom of block canvas)
        if (blockY > blockCanvasH) {
            projectiles.splice(i, 1);
            continue;
        }

        // Only check collisions once projectile enters block canvas
        if (blockY < 0) continue;

        const col = Math.floor(p.x / blockW);
        const row = Math.floor(blockY / blockH);

        if (row >= 0 && row < blockRows && col >= 0 && col < blockCols && blockGrid[row][col]) {
            // Splash damage
            for (let dr = -SPLASH_RADIUS; dr <= SPLASH_RADIUS; dr++) {
                for (let dc = -SPLASH_RADIUS; dc <= SPLASH_RADIUS; dc++) {
                    const nr = row + dr;
                    const nc = col + dc;
                    if (nr >= 0 && nr < blockRows && nc >= 0 && nc < blockCols && blockGrid[nr][nc]) {
                        if (fallingBlocks.length < MAX_FALLING) {
                            fallingBlocks.push({
                                x: nc * blockW,
                                y: nr * blockH,
                                w: blockW,
                                h: blockH,
                                color: blockGrid[nr][nc].color,
                                vx: (Math.random() - 0.5) * 60,
                                vy: 0,
                                alpha: 1,
                            });
                        }
                        blockGrid[nr][nc] = null;
                        remainingBlocks--;
                    }
                }
            }
            projectiles.splice(i, 1);
        }
    }

    // Update falling blocks
    for (let i = fallingBlocks.length - 1; i >= 0; i--) {
        const fb = fallingBlocks[i];
        fb.vy += GRAVITY * dt;
        fb.y += fb.vy * dt;
        fb.x += fb.vx * dt;
        fb.alpha -= dt * 0.8;

        if (fb.y > blockCanvasH || fb.alpha <= 0) {
            fallingBlocks.splice(i, 1);
        }
    }

    // Win state
    if (remainingBlocks === 0 && fallingBlocks.length === 0) {
        gameActive = false;
        blockCanvas.style.display = 'none';
        gameAreaEl.classList.add('hidden');
        toggleBtn.textContent = 'Game: OFF';
        toggleBtn.classList.add('off');
    }
}

// --- Render ---
function render() {
    // Clear both canvases
    triCtx.clearRect(0, 0, triCanvas.width, triCanvas.height);
    blockCtx.clearRect(0, 0, blockCanvas.width, blockCanvas.height);

    // Draw blocks on block canvas
    for (let r = 0; r < blockRows; r++) {
        for (let c = 0; c < blockCols; c++) {
            const block = blockGrid[r][c];
            if (!block) continue;
            blockCtx.fillStyle = block.color;
            blockCtx.fillRect(c * blockW, r * blockH, blockW, blockH);
        }
    }

    // Draw falling blocks on block canvas
    for (const fb of fallingBlocks) {
        blockCtx.globalAlpha = Math.max(0, fb.alpha);
        blockCtx.fillStyle = fb.color;
        blockCtx.fillRect(fb.x, fb.y, fb.w, fb.h);
    }
    blockCtx.globalAlpha = 1;

    // Draw triangle on triangle canvas
    triCtx.fillStyle = '#e07020';
    triCtx.beginPath();
    triCtx.moveTo(triangle.x - TRIANGLE_WIDTH / 2, triangle.y);
    triCtx.lineTo(triangle.x + TRIANGLE_WIDTH / 2, triangle.y);
    triCtx.lineTo(triangle.x, triangle.y + TRIANGLE_HEIGHT);
    triCtx.closePath();
    triCtx.fill();

    // Draw projectiles — they may span both canvases
    const projColor = '#ffaa33';

    for (const p of projectiles) {
        if (p.y < triCanvasH) {
            // Projectile is still in the triangle canvas area
            triCtx.fillStyle = projColor;
            triCtx.beginPath();
            triCtx.arc(p.x, p.y, PROJECTILE_RADIUS, 0, Math.PI * 2);
            triCtx.fill();
        }

        // Projectile in block canvas area
        const blockY = p.y - triCanvasH;
        if (blockY > -PROJECTILE_RADIUS) {
            blockCtx.fillStyle = projColor;
            blockCtx.beginPath();
            blockCtx.arc(p.x, blockY, PROJECTILE_RADIUS, 0, Math.PI * 2);
            blockCtx.fill();
        }
    }
}

// --- Game loop ---
function gameLoop(timestamp) {
    if (!gameActive) return;

    const dt = lastTime ? (timestamp - lastTime) / 1000 : 1 / 60;
    lastTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
