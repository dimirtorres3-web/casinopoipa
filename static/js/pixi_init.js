document.addEventListener('DOMContentLoaded', function () {
    const hasPixi = typeof PIXI !== 'undefined';
    if (!hasPixi) {
        console.warn('PIXI not loaded; using canvas fallback for the slot games');
    }

    function createPixiIn(container) {
        if (!container || !hasPixi) return null;

        const gamePage = container.closest('.game-page');
        const gameSlug = (gamePage && gamePage.dataset && gamePage.dataset.game) || 'frutas-de-fuego-777';

        container.innerHTML = '';
        const app = new PIXI.Application({
            antialias: true,
            backgroundAlpha: 0,
            // resize to the container so renderer size matches the visible element
            resizeTo: container,
            autoDensity: true,
            resolution: window.devicePixelRatio || 1,
        });
        app.view.style.maxWidth = '100%';
        app.view.style.width = '100%';
        app.view.style.height = 'auto';
        app.view.style.display = 'block';
        app.view.style.margin = '0 auto';
        app.view.style.objectFit = 'contain';
        // Ensure container doesn't force overflow and centers its child
        container.style.width = '100%';
        container.style.boxSizing = 'border-box';
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.appendChild(app.view);

        const stage = new PIXI.Container();
        app.stage.addChild(stage);

        const colorPalette = {
            'frutas-de-fuego-777': { bg: 0x3d1a1f, accent: 0xffd700 },
            'palacio-arlequin': { bg: 0x0c0810, accent: 0xbf55ec },
            'mansion-embrujada': { bg: 0x141018, accent: 0x2ecc71 },
            'coronas-fortuna': { bg: 0x081c14, accent: 0xff4d4d },
            'ruleta-imperial': { bg: 0x071a11, accent: 0xffa500 },
        };

        const symbolsBySlug = {
            'frutas-de-fuego-777': ['👑7️⃣🔥', '🍉', '🍋', '🍒', '🪙⭐', '🍇', '🍊', '🍑'],
            'palacio-arlequin': ['🃏✨', '🔔', '💎', '❤️', '🟪', '🎭', '🎲', '🎴'],
            'mansion-embrujada': ['👻💖', '☎️👑', '🕯️🔱', '💚💎', '👻💙', '📖🔮', '💜💎', '👻💚'],
            'coronas-fortuna': ['👑A️⃣', '👑K️⃣', '👑Q️⃣', '👑J️⃣', '🍒', '🍋', '🍊', '🍉'],
            'ruleta-imperial': ['🔄🎡', '🔴1️⃣', '⚫2️⃣', '🟢0️⃣', '🎰', '🔴3️⃣', '⚫4️⃣', '🔴5️⃣'],
        };

        function rebuild() {
            stage.removeChildren();
            const w = app.renderer.width;
            const h = app.renderer.height;
            stage.x = w / 2;
            stage.y = h / 2;

            const palette = colorPalette[gameSlug] || { bg: 0x0a0a0f, accent: 0xffffff };
            const symbolList = symbolsBySlug[gameSlug] || symbolsBySlug['frutas-de-fuego-777'];

            app.renderer.backgroundColor = palette.bg;

            const bg = new PIXI.Graphics();
            bg.beginFill(palette.bg, 1);
            bg.drawRoundedRect(-w / 2, -h / 2, w, h, 24);
            bg.endFill();
            stage.addChild(bg);

            const cols = 4;
            const rows = 2;
            const cellW = Math.min(140, w * 0.18);
            const cellH = Math.min(110, h * 0.18);
            const gapX = 18;
            const gapY = 16;
            const startX = -((cols - 1) * (cellW + gapX)) / 2;
            const startY = -((rows - 1) * (cellH + gapY)) / 2;

            symbolList.forEach((emoji, index) => {
                const col = index % cols;
                const row = Math.floor(index / cols);
                const card = new PIXI.Graphics();
                card.beginFill(0x11131c, 0.94);
                card.drawRoundedRect(0, 0, cellW, cellH, 20);
                card.endFill();
                card.lineStyle(2, palette.accent, 0.2);
                card.drawRoundedRect(0, 0, cellW, cellH, 20);
                card.x = startX + col * (cellW + gapX) - cellW / 2;
                card.y = startY + row * (cellH + gapY) - cellH / 2;
                stage.addChild(card);

                const text = new PIXI.Text(emoji, {
                    fontFamily: ['Segoe UI Emoji', 'Apple Color Emoji', 'Arial', 'sans-serif'],
                    fontSize: Math.round(cellH * 0.6),
                    fill: '#ffffff',
                    align: 'center',
                    dropShadow: true,
                    dropShadowColor: '#000000',
                    dropShadowBlur: 8,
                    dropShadowDistance: 4,
                });
                text.anchor.set(0.5);
                text.x = card.x + cellW / 2;
                text.y = card.y + cellH / 2;
                stage.addChild(text);
            });
        }

        rebuild();

        app.ticker.add((delta) => {
            stage.rotation += 0.008 * delta;
        });

        window.addEventListener('resize', rebuild);
        window.rebuild = rebuild;

        return app;
    }

    // Initialize PIXI only for slot containers (elements intended for PIXI scenes)
    document.querySelectorAll('.slot-canvas, .five-star-pixi-stage, .joker-jackpot-pixi-stage, .betty-boris-boo-pixi-stage').forEach((el) => {
        if (hasPixi) createPixiIn(el);
    });

    const gamePage = document.querySelector('.game-page');
    if (gamePage) {
        const slug = gamePage.dataset.game;
        if (slug === 'frutas-de-fuego-777' || slug === 'coronas-fortuna') {
            initFiveStarScene(document.getElementById('five-star-reel-stage'));
        } else if (slug === 'poker') {
            initPokerScene(document.getElementById('poker-pixi-stage'));
        } else if (slug === 'palacio-arlequin') {
            initJokerJackpotScene(document.getElementById('joker-jackpot-stage'));
        } else if (slug === 'mansion-embrujada') {
            initBettyBorisBooScene(document.getElementById('betty-boris-boo-stage'));
        }
    }
});

function initPokerScene(container) {
    if (!container || typeof PIXI === 'undefined') return;

    container.innerHTML = '';
    const app = new PIXI.Application({
        antialias: true,
        backgroundAlpha: 0,
        resizeTo: container,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
    });
    app.view.style.maxWidth = '100%';
    app.view.style.width = '100%';
    app.view.style.height = 'auto';
    app.view.style.display = 'block';
    app.view.style.margin = '0 auto';
    app.view.style.objectFit = 'contain';
    container.style.width = '100%';
    container.style.boxSizing = 'border-box';
    container.style.height = '100%';
    container.style.display = 'flex';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.appendChild(app.view);

    const width = Math.max(320, app.renderer.width || container.clientWidth || 640);
    const height = Math.max(280, app.renderer.height || container.clientHeight || 480);
    const stage = app.stage;

    const background = new PIXI.Graphics();
    background.beginFill(0x0b1d15);
    background.drawRect(0, 0, width, height);
    background.endFill();
    stage.addChild(background);

    const tableGlow = new PIXI.Graphics();
    tableGlow.beginFill(0x4cc995, 0.16);
    tableGlow.drawEllipse(width / 2, height * 0.56, width * 0.42, height * 0.3);
    tableGlow.endFill();
    stage.addChild(tableGlow);

    const table = new PIXI.Graphics();
    table.beginFill(0x11231a);
    table.drawRoundedRect(0, height * 0.08, width, height * 0.82, 34);
    table.endFill();
    stage.addChild(table);

    const felt = new PIXI.Graphics();
    felt.beginFill(0x142b1f);
    felt.drawRoundedRect(width * 0.06, height * 0.16, width * 0.88, height * 0.66, 28);
    felt.endFill();
    stage.addChild(felt);

    const tableEdge = new PIXI.Graphics();
    tableEdge.lineStyle(6, 0x6cd7ac, 0.28);
    tableEdge.drawRoundedRect(width * 0.06, height * 0.16, width * 0.88, height * 0.66, 28);
    stage.addChild(tableEdge);

    const title = new PIXI.Text('Poker Royale', {
        fontFamily: 'Inter, sans-serif',
        fontSize: 26,
        fontWeight: '700',
        fill: '#f8e8c2',
        letterSpacing: 1.2,
    });
    title.anchor.set(0.5);
    title.x = width / 2;
    title.y = height * 0.14;
    stage.addChild(title);

    const subtitle = new PIXI.Text('Mesa clásica con cartas de lujo', {
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
        fill: '#c7ceb7',
    });
    subtitle.anchor.set(0.5);
    subtitle.x = width / 2;
    subtitle.y = height * 0.18;
    stage.addChild(subtitle);

    const cardValues = ['A', 'K', 'Q', 'J', '10', '9', '8'];
    const cardSuits = ['♠', '♥', '♦', '♣'];
    const cardColors = { '♠': 0xffffff, '♣': 0xffffff, '♥': 0xff5454, '♦': 0xff5454 };
    const cardSize = {
        width: Math.min(132, Math.max(86, width * 0.12)),
        height: Math.min(180, Math.max(120, height * 0.24)),
    };
    const cardAssetBase = '/static/img/cards';
    const cardAssetCache = {};
    const cardSuitCode = { '♠': 's', '♥': 'h', '♦': 'd', '♣': 'c' };

    function getCardAssetName(value, suit) {
        const suitCode = cardSuitCode[suit] || 'c';
        const rankCode = value === '10' ? '10' : value;
        return `${suitCode}_${rankCode}.png`;
    }

    function getCardTexture(value, suit) {
        const assetName = getCardAssetName(value, suit);
        if (cardAssetCache[assetName] !== undefined) {
            return Promise.resolve(cardAssetCache[assetName]);
        }

        const url = `${cardAssetBase}/${assetName}`;
        return new Promise((resolve) => {
            if (PIXI.Assets && typeof PIXI.Assets.load === 'function') {
                PIXI.Assets.load(url).then((resource) => {
                    const texture = resource && resource.texture ? resource.texture : resource;
                    cardAssetCache[assetName] = texture || null;
                    resolve(texture || null);
                }).catch(() => {
                    cardAssetCache[assetName] = null;
                    resolve(null);
                });
                return;
            }

            try {
                const texture = PIXI.Texture.from(url);
                const resource = texture.baseTexture && texture.baseTexture.resource;
                const hasError = resource && resource.error;
                cardAssetCache[assetName] = hasError ? null : texture;
                resolve(cardAssetCache[assetName]);
            } catch (error) {
                cardAssetCache[assetName] = null;
                resolve(null);
            }
        });
    }

    function buildCardFace(value, suit, width, height) {
        const faceContainer = new PIXI.Container();
        const fallback = new PIXI.Container();
        const face = new PIXI.Graphics();
        face.beginFill(0xf8f2df);
        face.drawRoundedRect(0, 0, width, height, 20);
        face.endFill();
        const faceBorder = new PIXI.Graphics();
        faceBorder.lineStyle(4, 0x2d4a3d, 0.22);
        faceBorder.drawRoundedRect(0, 0, width, height, 20);
        fallback.addChild(face, faceBorder);

        const topValue = new PIXI.Text(value + suit, {
            fontFamily: 'Inter, sans-serif',
            fontSize: 24,
            fontWeight: '800',
            fill: cardColors[suit],
        });
        topValue.x = 18;
        topValue.y = 16;
        const bottomValue = new PIXI.Text(value + suit, {
            fontFamily: 'Inter, sans-serif',
            fontSize: 24,
            fontWeight: '800',
            fill: cardColors[suit],
        });
        bottomValue.anchor.set(1, 1);
        bottomValue.x = width - 18;
        bottomValue.y = height - 16;
        const centerSuit = new PIXI.Text(suit, {
            fontFamily: 'Inter, sans-serif',
            fontSize: 64,
            fontWeight: '900',
            fill: cardColors[suit],
            stroke: '#111111',
            strokeThickness: 4,
        });
        centerSuit.anchor.set(0.5);
        centerSuit.x = width / 2;
        centerSuit.y = height / 2;
        fallback.addChild(topValue, bottomValue, centerSuit);
        faceContainer.addChild(fallback);

        getCardTexture(value, suit).then((texture) => {
            if (!texture || !faceContainer.parent) return;
            faceContainer.removeChildren();
            const sprite = new PIXI.Sprite(texture);
            sprite.width = width;
            sprite.height = height;
            sprite.anchor.set(0);
            faceContainer.addChild(sprite);
        });

        return faceContainer;
    }

    function makePokerCard(value, suit) {
        const card = new PIXI.Container();
        const width = cardSize.width;
        const height = cardSize.height;
        card.width = width;
        card.height = height;
        card.pivot.set(width / 2, height / 2);

        const back = new PIXI.Container();
        const backShape = new PIXI.Graphics();
        backShape.beginFill(0x233836);
        backShape.drawRoundedRect(0, 0, width, height, 20);
        backShape.endFill();
        const backPattern = new PIXI.Graphics();
        backPattern.beginFill(0xffffff, 0.08);
        backPattern.drawRoundedRect(width * 0.12, height * 0.16, width * 0.76, height * 0.68, 16);
        backPattern.endFill();
        const backBorder = new PIXI.Graphics();
        backBorder.lineStyle(3, 0xf4e6a8, 0.7);
        backBorder.drawRoundedRect(0, 0, width, height, 20);
        back.addChild(backShape, backPattern, backBorder);

        const front = buildCardFace(value, suit, width, height);
        front.visible = false;
        card.addChild(back, front);
        card.backFace = back;
        card.frontFace = front;
        card.faceUp = false;
        card.width = width;
        card.height = height;
        return card;
    }

    const pokerCards = [];
    const cardPositions = [
        { xRatio: 0.3, yRatio: 0.42 },
        { xRatio: 0.42, yRatio: 0.42 },
        { xRatio: 0.58, yRatio: 0.42 },
        { xRatio: 0.7, yRatio: 0.42 },
    ];

    cardPositions.forEach((pos, index) => {
        const value = cardValues[index % cardValues.length];
        const suit = cardSuits[index % cardSuits.length];
        const card = makePokerCard(value, suit);
        card.x = width * pos.xRatio;
        card.y = height * pos.yRatio;
        stage.addChild(card);
        pokerCards.push(card);
    });

    function swapCardFaces(card, value, suit) {
        card.frontFace.removeChildren();
        const face = buildCardFace(value, suit, card.width, card.height);
        card.frontFace.addChild(face);
    }

    function animateCardFlip(card, value, suit, callback) {
        const duration = 330;
        const start = performance.now();
        let halfway = false;

        function step(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            card.scale.x = progress < 0.5 ? 1 - progress * 2 : (progress - 0.5) * 2;
            if (progress >= 0.5 && !halfway) {
                halfway = true;
                swapCardFaces(card, value, suit);
                card.backFace.visible = false;
                card.frontFace.visible = true;
                playPokerAudio('flip');
            }
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                card.scale.x = 1;
                if (callback) callback();
            }
        }

        requestAnimationFrame(step);
    }

    function dialogMessage(text, type) {
        const status = document.getElementById('poker-status');
        if (!status) return;
        status.textContent = text;
        status.classList.remove('text-emerald-300', 'text-amber-300', 'text-red-300', 'bg-slate-950');
        if (type === 'win') {
            status.classList.add('text-emerald-300');
        } else if (type === 'alert') {
            status.classList.add('text-amber-300');
        }
    }

    const pokerAudio = {
        deal: typeof Howl !== 'undefined' ? new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/card_flip.ogg'] }) : null,
        flip: typeof Howl !== 'undefined' ? new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg'] }) : null,
        win: typeof Howl !== 'undefined' ? new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg'] }) : null,
    };

    function playPokerAudio(name) {
        if (!pokerAudio[name] || typeof pokerAudio[name].play !== 'function') return;
        pokerAudio[name].play();
    }

    function dealPokerHand() {
        playPokerAudio('deal');
        dialogMessage('Repartiendo mano premium...', 'alert');
        pokerCards.forEach((card, index) => {
            const value = cardValues[Math.floor(Math.random() * cardValues.length)];
            const suit = cardSuits[Math.floor(Math.random() * cardSuits.length)];
            setTimeout(() => {
                animateCardFlip(card, value, suit, () => {
                    if (index === pokerCards.length - 1) {
                        dialogMessage('Mano lista. ¡Apuesta y gana a lo grande!', 'win');
                        playPokerAudio('win');
                    }
                });
            }, index * 180);
        });
    }

    const dealButton = document.getElementById('poker-deal-btn');
    if (dealButton) {
        dealButton.addEventListener('click', () => {
            dealPokerHand();
        });
    }

    function resizeTable() {
        const nextWidth = Math.max(320, container.clientWidth || 640);
        const nextHeight = Math.max(280, container.clientHeight || 480);
        app.renderer.resize(nextWidth, nextHeight);

        table.clear();
        felt.clear();
        tableEdge.clear();
        table.beginFill(0x11231a);
        table.drawRoundedRect(0, nextHeight * 0.08, nextWidth, nextHeight * 0.82, 34);
        table.endFill();

        felt.beginFill(0x142b1f);
        felt.drawRoundedRect(nextWidth * 0.06, nextHeight * 0.16, nextWidth * 0.88, nextHeight * 0.66, 28);
        felt.endFill();
        tableEdge.lineStyle(6, 0x6cd7ac, 0.28);
        tableEdge.drawRoundedRect(nextWidth * 0.06, nextHeight * 0.16, nextWidth * 0.88, nextHeight * 0.66, 28);

        tableGlow.clear();
        tableGlow.beginFill(0x4cc995, 0.16);
        tableGlow.drawEllipse(nextWidth / 2, nextHeight * 0.56, nextWidth * 0.42, nextHeight * 0.3);
        tableGlow.endFill();

        title.x = nextWidth / 2;
        title.y = nextHeight * 0.14;
        subtitle.x = nextWidth / 2;
        subtitle.y = nextHeight * 0.18;

        pokerCards.forEach((card, index) => {
            const position = cardPositions[index];
            if (position) {
                card.x = nextWidth * position.xRatio;
                card.y = nextHeight * position.yRatio;
            }
        });
    }

    window.addEventListener('resize', resizeTable);
}

function initJokerJackpotScene(container) {
    if (!container) return;

    container.innerHTML = '';
    const width = Math.max(320, container.clientWidth || 360);
    const height = Math.max(280, container.clientHeight || 360);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const symbols = ['🃏', '💎', '🍀', '7️⃣', '🔔', '⭐', '💰', '🎴', '🍒', '🎲', '🔮', '🥇'];
    const reelCount = 3;
    const padding = 24;
    const reelWidth = (width - padding * 2 - 24) / reelCount;
    const reelHeight = height * 0.58;
    const reelY = 78;
    const reels = [];
    const spinState = { running: false, animationId: null };
    const spinConfig = { autoMode: false, turboMode: false, autoTimerId: null };

    function drawBackdrop() {
        ctx.clearRect(0, 0, width, height);
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#14061f');
        gradient.addColorStop(1, '#06020c');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(255, 145, 255, 0.28)';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, width - 4, height - 4);
        ctx.fillStyle = '#f9a8ff';
    }

    function roundRect(context, x, y, w, h, radius) {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.arcTo(x + w, y, x + w, y + h, radius);
        context.arcTo(x + w, y + h, x, y + h, radius);
        context.arcTo(x, y + h, x, y, radius);
        context.arcTo(x, y, x + w, y, radius);
        context.closePath();
    }

    function drawCard(x, y, w, h, label, accent) {
        ctx.save();
        ctx.fillStyle = '#221132';
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        roundRect(ctx, x, y, w, h, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y + h / 2 + 2);
        ctx.restore();
    }

    function buildReels() {
        reels.length = 0;
        for (let i = 0; i < reelCount; i += 1) {
            const x = padding + i * (reelWidth + 12);
            reels.push({ x, y: reelY, label: symbols[0] });
        }
    }

    function drawReels() {
        drawBackdrop();
        reels.forEach((reel) => {
            drawCard(reel.x, reel.y, reelWidth, reelHeight, reel.label, '#ff91ff');
        });
    }

    function randomSymbol() {
        return symbols[Math.floor(Math.random() * symbols.length)];
    }

    function setStatus(text) {
        const status = document.getElementById('slots-status');
        if (status) status.textContent = text;
    }

    function clearAutoTimer() {
        if (spinConfig.autoTimerId) {
            window.clearTimeout(spinConfig.autoTimerId);
            spinConfig.autoTimerId = null;
        }
    }

    function scheduleNextSpin() {
        clearAutoTimer();
        if (!spinConfig.autoMode) return;
        const delay = spinConfig.turboMode ? 4000 : 7000;
        spinConfig.autoTimerId = window.setTimeout(() => {
            spinConfig.autoTimerId = null;
            triggerSpin();
        }, delay);
    }

    function startJokerSpin() {
        if (spinState.running) return;
        spinState.running = true;
        spinState.pendingResult = null;
        setStatus(spinConfig.turboMode ? 'Turbo: giro rápido' : 'Giro en curso');

        const startTime = performance.now();
        const duration = spinConfig.turboMode ? 4000 : 7000;
        const frameStep = spinConfig.turboMode ? 45 : 70;
        window.currentSlotVisualDuration = duration;

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const frame = Math.floor(elapsed / frameStep) % (symbols.length * 5);
            reels.forEach((reel, index) => {
                reel.label = symbols[(frame + index * 2 + Math.floor(elapsed / 180)) % symbols.length];
            });
            drawReels();

            if (progress < 1) {
                spinState.animationId = window.requestAnimationFrame(step);
            } else {
                const finalSymbols = spinState.pendingResult || [];
                if (finalSymbols.length === 3) {
                    reels.forEach((reel, index) => {
                        reel.label = finalSymbols[index] || reel.label;
                    });
                    drawReels();
                    const win = finalSymbols.every((symbol) => symbol === finalSymbols[0]);
                    setStatus(win ? '¡Ganaste! Los 3 coinciden' : 'No coincide');
                } else {
                    const results = reels.map((reel) => reel.label);
                    const win = results.every((symbol) => symbol === results[0]);
                    setStatus(win ? '¡Ganaste! Los 3 coinciden' : 'Perdiste. No coinciden');
                }
                spinState.running = false;
                spinState.pendingResult = null;
                scheduleNextSpin();
            }
        }

        spinState.animationId = window.requestAnimationFrame(step);
    }

    function normalizeFinalReels(finalReels) {
        if (!Array.isArray(finalReels)) return [];
        return finalReels.map((reel) => {
            if (Array.isArray(reel)) {
                return reel[1] ?? reel[0] ?? '';
            }
            return reel;
        }).filter(Boolean);
    }

    function stopJokerSpin(finalReels) {
        if (spinState.running) {
            spinState.pendingResult = normalizeFinalReels(finalReels);
            return;
        }

        const finalSymbols = normalizeFinalReels(finalReels);
        if (finalSymbols.length === 3) {
            reels.forEach((reel, index) => {
                reel.label = finalSymbols[index] || reel.label;
            });
            drawReels();
            const win = finalSymbols.every((symbol) => symbol === finalSymbols[0]);
            setStatus(win ? '¡Ganaste! Los 3 coinciden' : 'No coincide');
        } else {
            drawReels();
        }
    }

    function triggerSpin() {
        if (spinState.running) {
            stopJokerSpin();
        }
        reels.forEach((reel) => {
            reel.label = randomSymbol();
        });
        drawReels();
        startJokerSpin();
    }

    buildReels();
    drawReels();

    window.jokerSpinVisual = startJokerSpin;
    window.jokerStopVisual = stopJokerSpin;
    window.currentSlotSpinTrigger = triggerSpin;

    const autoButton = document.getElementById('slot-auto-btn');
    if (autoButton) {
        autoButton.addEventListener('click', () => {
            spinConfig.autoMode = !spinConfig.autoMode;
            autoButton.classList.toggle('is-active', spinConfig.autoMode);
            if (!spinConfig.autoMode) {
                clearAutoTimer();
                setStatus('Auto detenido');
            } else {
                setStatus('Auto activo');
                if (!spinState.running) {
                    triggerSpin();
                }
            }
        });
    }

    const turboButton = document.getElementById('slot-turbo-btn');
    if (turboButton) {
        turboButton.addEventListener('click', () => {
            spinConfig.turboMode = !spinConfig.turboMode;
            turboButton.classList.toggle('is-active', spinConfig.turboMode);
            if (spinState.running) {
                stopJokerSpin();
                triggerSpin();
            } else if (spinConfig.autoMode) {
                triggerSpin();
            } else {
                setStatus(spinConfig.turboMode ? 'Turbo activado' : 'Turbo desactivado');
            }
        });
    }
}

function initBettyBorisBooScene(container) {
    if (!container) return;

    container.innerHTML = '';
    const width = Math.max(320, container.clientWidth || 360);
    const height = Math.max(280, container.clientHeight || 360);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const symbols = ['👻', '🕯️', '📖', '📞', '♣️', '🕷️', '🗝️', '🦇', '🧿', '🌙', '🪦', '🦉'];
    const reelCount = 3;
    const padding = 24;
    const reelWidth = (width - padding * 2 - 24) / reelCount;
    const reelHeight = height * 0.58;
    const reelY = 78;
    const reels = [];
    const spinState = { running: false, animationId: null };
    const spinConfig = { autoMode: false, turboMode: false, autoTimerId: null };

    function drawBackdrop() {
        ctx.clearRect(0, 0, width, height);
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#21071b');
        gradient.addColorStop(1, '#060208');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(255, 147, 255, 0.24)';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, width - 4, height - 4);
        ctx.fillStyle = '#ffb4ff';
    }

    function roundRect(context, x, y, w, h, radius) {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.arcTo(x + w, y, x + w, y + h, radius);
        context.arcTo(x + w, y + h, x, y + h, radius);
        context.arcTo(x, y + h, x, y, radius);
        context.arcTo(x, y, x + w, y, radius);
        context.closePath();
    }

    function drawCard(x, y, w, h, label, accent) {
        ctx.save();
        ctx.fillStyle = '#2b102d';
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        roundRect(ctx, x, y, w, h, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y + h / 2 + 2);
        ctx.restore();
    }

    function buildReels() {
        reels.length = 0;
        for (let i = 0; i < reelCount; i += 1) {
            const x = padding + i * (reelWidth + 12);
            reels.push({ x, y: reelY, label: symbols[0] });
        }
    }

    function drawReels() {
        drawBackdrop();
        reels.forEach((reel) => {
            drawCard(reel.x, reel.y, reelWidth, reelHeight, reel.label, '#ff93ff');
        });
    }

    function randomSymbol() {
        return symbols[Math.floor(Math.random() * symbols.length)];
    }

    function setStatus(text) {
        const status = document.getElementById('slots-status');
        if (status) status.textContent = '';
    }

    function clearAutoTimer() {
        if (spinConfig.autoTimerId) {
            window.clearTimeout(spinConfig.autoTimerId);
            spinConfig.autoTimerId = null;
        }
    }

    function scheduleNextSpin() {
        clearAutoTimer();
        if (!spinConfig.autoMode) return;
        const delay = spinConfig.turboMode ? 4000 : 7000;
        spinConfig.autoTimerId = window.setTimeout(() => {
            spinConfig.autoTimerId = null;
            triggerSpin();
        }, delay);
    }

    function startBettySpinVisual() {
        if (spinState.running) return;
        spinState.running = true;
        spinState.pendingResult = null;
        setStatus(spinConfig.turboMode ? 'Turbo: giro rápido' : 'Giro en curso');

        const startTime = performance.now();
        const duration = spinConfig.turboMode ? 4000 : 7000;
        const frameStep = spinConfig.turboMode ? 45 : 70;
        window.currentSlotVisualDuration = duration;

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const frame = Math.floor(elapsed / frameStep) % (symbols.length * 5);
            reels.forEach((reel, index) => {
                reel.label = symbols[(frame + index * 2 + Math.floor(elapsed / 180)) % symbols.length];
            });
            drawReels();

            if (progress < 1) {
                spinState.animationId = window.requestAnimationFrame(step);
            } else {
                const finalSymbols = spinState.pendingResult || [];
                if (finalSymbols.length === 3) {
                    reels.forEach((reel, index) => {
                        reel.label = finalSymbols[index] || reel.label;
                    });
                    drawReels();
                    const win = finalSymbols.every((symbol) => symbol === finalSymbols[0]);
                    setStatus(win ? '¡Ganaste! Los 3 coinciden' : 'No coincide');
                } else {
                    const results = reels.map((reel) => reel.label);
                    const win = results.every((symbol) => symbol === results[0]);
                    setStatus(win ? '¡Ganaste! Los 3 coinciden' : 'Perdiste. No coinciden');
                }
                spinState.running = false;
                spinState.pendingResult = null;
                scheduleNextSpin();
            }
        }

        spinState.animationId = window.requestAnimationFrame(step);
    }

    function normalizeFinalReels(finalReels) {
        if (!Array.isArray(finalReels)) return [];
        return finalReels.map((reel) => {
            if (Array.isArray(reel)) {
                return reel[1] ?? reel[0] ?? '';
            }
            return reel;
        }).filter(Boolean);
    }

    function stopBettySpinVisual(finalReels) {
        if (spinState.running) {
            spinState.pendingResult = normalizeFinalReels(finalReels);
            return;
        }

        const finalSymbols = normalizeFinalReels(finalReels);
        if (finalSymbols.length === 3) {
            reels.forEach((reel, index) => {
                reel.label = finalSymbols[index] || reel.label;
            });
            drawReels();
            const win = finalSymbols.every((symbol) => symbol === finalSymbols[0]);
            setStatus(win ? '¡Ganaste! Los 3 coinciden' : 'No coincide');
        } else {
            drawReels();
        }
    }

    function triggerSpin() {
        if (spinState.running) {
            stopBettySpinVisual();
        }
        reels.forEach((reel) => {
            reel.label = randomSymbol();
        });
        drawReels();
        startBettySpinVisual();
    }

    buildReels();
    drawReels();

    window.bettySpinVisual = startBettySpinVisual;
    window.bettyStopVisual = stopBettySpinVisual;
    window.currentSlotSpinTrigger = triggerSpin;

    const autoButton = document.getElementById('slot-auto-btn');
    if (autoButton) {
        autoButton.addEventListener('click', () => {
            spinConfig.autoMode = !spinConfig.autoMode;
            autoButton.classList.toggle('is-active', spinConfig.autoMode);
            if (!spinConfig.autoMode) {
                clearAutoTimer();
                setStatus('Auto detenido');
            } else {
                setStatus('Auto activo');
                if (!spinState.running) {
                    triggerSpin();
                }
            }
        });
    }

    const turboButton = document.getElementById('slot-turbo-btn');
    if (turboButton) {
        turboButton.addEventListener('click', () => {
            spinConfig.turboMode = !spinConfig.turboMode;
            turboButton.classList.toggle('is-active', spinConfig.turboMode);
            if (spinState.running) {
                stopBettySpinVisual();
                triggerSpin();
            } else if (spinConfig.autoMode) {
                triggerSpin();
            } else {
                setStatus(spinConfig.turboMode ? 'Turbo activado' : 'Turbo desactivado');
            }
        });
    }
}

function initFiveStarScene(container) {
    if (!container) return;

    container.innerHTML = '';
    const width = Math.max(320, container.clientWidth || 360);
    const height = Math.max(280, container.clientHeight || 360);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameSlugLocal = window.gameSlug || (container && container.closest && container.closest('.game-page') && container.closest('.game-page').dataset.game) || 'frutas-de-fuego-777';
    const emojiSets = {
        'frutas-de-fuego-777': ['🍒', '7', '🍋', '🔔', '🍉', '⭐', '🍊', '💎', '🔥', '🥇', '🌟', '🎰', '💥', '🪙', '🧨', '⚡', '🌈', '🎯'],
        'palacio-arlequin': ['🃏', '🔔', '💎', '❤️', '🎴', '🎲', '🪄', '🌈', '⭐', '💍', '🪙', '🔮', '🪄', '🎭', '✨', '🔱', '🎁', '💫'],
        'mansion-embrujada': ['👻', '🕯️', '📖', '💚', '🕷️', '🗝️', '🦇', '🌙', '🪦', '🧿', '🦉', '🕯️', '🧯', '🕸️', '🗡️', '🌫️', '🪦', '🛸'],
        'coronas-fortuna': ['👑', '🍒', '🍋', '🍊', '⭐', '💰', '🌟', '🎀', '🔮', '🪙', '🍇', '✨', '🏆', '💎', '🧿', '⚜️', '🪩', '🎇'],
    };
    const symbols = (emojiSets[gameSlugLocal] || emojiSets['frutas-de-fuego-777']).map((s) => s);

    const reelCount = 3;
    const padding = 24;
    const reelWidth = (width - padding * 2 - 24) / reelCount;
    const reelHeight = height * 0.62;
    const reelY = 78;
    const reels = [];
    const spinState = { running: false, animationId: null };
    const spinConfig = { autoMode: false, turboMode: false, autoTimerId: null };

    function drawBackdrop() {
        ctx.clearRect(0, 0, width, height);
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#111827');
        gradient.addColorStop(1, '#020617');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(255,191,71,0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, width - 4, height - 4);
        ctx.fillStyle = '#f59e0b';
    }

    function roundRect(context, x, y, w, h, radius) {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.arcTo(x + w, y, x + w, y + h, radius);
        context.arcTo(x + w, y + h, x, y + h, radius);
        context.arcTo(x, y + h, x, y, radius);
        context.arcTo(x, y, x + w, y, radius);
        context.closePath();
    }

    function drawCard(x, y, w, h, label, accent) {
        ctx.save();
        ctx.fillStyle = '#1f2937';
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        roundRect(ctx, x, y, w, h, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + w / 2, y + h / 2 + 2);
        ctx.restore();
    }

    function buildReels() {
        reels.length = 0;
        for (let i = 0; i < reelCount; i += 1) {
            const x = padding + i * (reelWidth + 12);
            reels.push({ x, y: reelY, label: symbols[0] });
        }
    }

    function drawReels() {
        drawBackdrop();
        reels.forEach((reel) => {
            const y = reel.y || reelY;
            drawCard(reel.x, y, reelWidth, reelHeight, reel.label, '#f59e0b');
        });
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(width / 2, height * 0.84, width * 0.3, height * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function randomSymbol() {
        return symbols[Math.floor(Math.random() * symbols.length)];
    }

    function setStatus(text) {
        const status = document.getElementById('slots-status');
        if (status) status.textContent = '';
    }

    function clearAutoTimer() {
        if (spinConfig.autoTimerId) {
            window.clearTimeout(spinConfig.autoTimerId);
            spinConfig.autoTimerId = null;
        }
    }

    function scheduleNextSpin() {
        clearAutoTimer();
        if (!spinConfig.autoMode) return;
        const delay = spinConfig.turboMode ? 4000 : 7000;
        spinConfig.autoTimerId = window.setTimeout(() => {
            spinConfig.autoTimerId = null;
            triggerSpin();
        }, delay);
    }

    function startSpinVisual() {
        if (spinState.running) return;
        spinState.running = true;
        spinState.pendingResult = null;
        setStatus(spinConfig.turboMode ? 'Turbo: giro rápido' : 'Giro en curso');

        const startTime = performance.now();
        const duration = spinConfig.turboMode ? 4000 : 7000;
        const frameStep = spinConfig.turboMode ? 45 : 70;
        window.currentSlotVisualDuration = duration;

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentFrame = Math.floor(elapsed / frameStep) % (symbols.length * 5);
            const motion = Math.sin(elapsed / 240) * 8;

            reels.forEach((reel, index) => {
                const offset = (currentFrame + index * 2 + Math.floor(elapsed / 160)) % symbols.length;
                reel.label = symbols[offset];
                reel.y = reelY + motion * (index === 1 ? 1 : 0.6);
            });
            drawReels();

            if (progress < 1) {
                spinState.animationId = window.requestAnimationFrame(step);
            } else {
                const finalSymbols = spinState.pendingResult || [];
                if (finalSymbols.length === 3) {
                    reels.forEach((reel, index) => {
                        reel.label = finalSymbols[index] || reel.label;
                        reel.y = reelY;
                    });
                    drawReels();
                    const win = finalSymbols.every((symbol) => symbol === finalSymbols[0]);
                    setStatus(win ? '¡Ganaste! Los 3 coinciden' : 'No coincide');
                } else {
                    const results = reels.map((reel) => reel.label);
                    const win = results.every((symbol) => symbol === results[0]);
                    setStatus(win ? '¡Ganaste! Los 3 coinciden' : 'Perdiste. No coinciden');
                }
                spinState.running = false;
                spinState.pendingResult = null;
                scheduleNextSpin();
            }
        }

        spinState.animationId = window.requestAnimationFrame(step);
    }

    function normalizeFinalReels(finalReels) {
        if (!Array.isArray(finalReels)) return [];
        return finalReels.map((reel) => {
            if (Array.isArray(reel)) {
                return reel[1] ?? reel[0] ?? '';
            }
            return reel;
        }).filter(Boolean);
    }

    function stopSpinVisual(finalReels) {
        if (spinState.running) {
            spinState.pendingResult = normalizeFinalReels(finalReels);
            return;
        }

        const finalSymbols = normalizeFinalReels(finalReels);
        if (finalSymbols.length === 3) {
            reels.forEach((reel, index) => {
                reel.label = finalSymbols[index] || reel.label;
            });
            drawReels();
            const win = finalSymbols.every((symbol) => symbol === finalSymbols[0]);
            setStatus(win ? '¡Ganaste! Los 3 coinciden' : 'No coincide');
        } else {
            drawReels();
        }
    }

    function triggerSpin() {
        if (spinState.running) {
            stopSpinVisual();
        }
        reels.forEach((reel) => {
            reel.label = randomSymbol();
        });
        drawReels();
        startSpinVisual();
    }

    buildReels();
    drawReels();

    window.fiveStarSpinVisual = startSpinVisual;
    window.fiveStarStopVisual = stopSpinVisual;
    window.currentSlotSpinTrigger = triggerSpin;

    const autoButton = document.getElementById('slot-auto-btn');
    if (autoButton) {
        autoButton.addEventListener('click', () => {
            spinConfig.autoMode = !spinConfig.autoMode;
            autoButton.classList.toggle('is-active', spinConfig.autoMode);
            if (!spinConfig.autoMode) {
                clearAutoTimer();
                setStatus('Auto detenido');
            } else {
                setStatus('Auto activo');
                if (!spinState.running) {
                    triggerSpin();
                }
            }
        });
    }

    const turboButton = document.getElementById('slot-turbo-btn');
    if (turboButton) {
        turboButton.addEventListener('click', () => {
            spinConfig.turboMode = !spinConfig.turboMode;
            turboButton.classList.toggle('is-active', spinConfig.turboMode);
            if (spinState.running) {
                stopSpinVisual();
                triggerSpin();
            } else if (spinConfig.autoMode) {
                triggerSpin();
            } else {
                setStatus(spinConfig.turboMode ? 'Turbo activado' : 'Turbo desactivado');
            }
        });
    }
}
