document.addEventListener('DOMContentLoaded', function () {
    if (typeof PIXI === 'undefined') {
        console.warn('PIXI not loaded');
        return;
    }

    function createPixiIn(container) {
        // container is an Element
        if (!container) return null;

        // find game slug from closest .game-page or data attribute
        const gamePage = container.closest('.game-page');
        const gameSlug = (gamePage && gamePage.dataset && gamePage.dataset.game) || 'five-star';

        // Clear and prepare
        container.innerHTML = '';

        const app = new PIXI.Application({
            antialias: true,
            backgroundAlpha: 0,
            resizeTo: container,
            autoDensity: true,
        });
        app.view.style.width = '100%';
        app.view.style.height = '100%';
        container.appendChild(app.view);

        const rotor = new PIXI.Container();
        app.stage.addChild(rotor);

        function rebuild() {
            rotor.removeChildren();
            const w = app.renderer.width;
            const h = app.renderer.height;
            rotor.x = w / 2;
            rotor.y = h / 2;

            const radius = Math.min(w, h) * 0.36;

            const palette = {
                'five-star': {accent: 0xffb94d, marks: 0xffd9a8, bg: 0x0b0b10},
                'joker-jackpot': {accent: 0xd86aff, marks: 0xff6ad1, bg: 0x2b0b2e},
                'betty-boris-boo': {accent: 0xd9c27a, marks: 0xffe3b8, bg: 0x0c0810},
                '777-strike': {accent: 0xff4d4d, marks: 0xffb4b4, bg: 0x12090a},
            }[gameSlug] || {accent: 0xffb94d, marks: 0xffd9a8, bg: 0x0b0b10};

            const bg = new PIXI.Graphics();
            bg.beginFill(palette.bg, 0.9);
            bg.drawRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 18);
            bg.endFill();
            app.stage.addChild(bg);

            const ringG = new PIXI.Graphics();
            ringG.lineStyle(4, palette.accent, 0.18);
            ringG.drawCircle(0, 0, radius + 6);
            rotor.addChild(ringG);

            for (let i = 0; i < 12; i++) {
                const mark = new PIXI.Graphics();
                mark.beginFill(palette.marks);
                mark.drawRoundedRect(-6, -radius, 12, 28, 6);
                mark.endFill();
                const ang = (i / 12) * Math.PI * 2;
                mark.x = Math.cos(ang) * radius;
                mark.y = Math.sin(ang) * radius;
                mark.rotation = ang + Math.PI / 2;
                rotor.addChild(mark);
            }

            const center = new PIXI.Graphics();
            center.beginFill(0xffffff, 0.98);
            center.drawCircle(0, 0, Math.max(6, Math.floor(radius * 0.08)));
            center.endFill();
            rotor.addChild(center);
        }

        rebuild();

        app.ticker.add((delta) => {
            rotor.rotation += 0.008 * delta;
        });

        window.addEventListener('resize', () => {
            rebuild();
        });

        return app;
    }

    document.querySelectorAll('.slot-canvas, .roulette-canvas').forEach((el) => createPixiIn(el));

    const gamePage = document.querySelector('.game-page');
    if (gamePage && gamePage.dataset.game === 'five-star') {
        initFiveStarScene(document.getElementById('five-star-reel-stage'));
    }
});

function initFiveStarScene(container) {
    if (!container || typeof PIXI === 'undefined') return;

    container.innerHTML = '';
    const app = new PIXI.Application({
        antialias: true,
        backgroundAlpha: 0,
        resizeTo: container,
        autoDensity: true,
    });
    app.view.style.width = '100%';
    app.view.style.height = '100%';
    container.appendChild(app.view);

    const symbols = [
        { key: 'seven', label: '7', color: 0xff3b3b, accent: 0xffd8d8 },
        { key: 'coin', label: '★', color: 0xffd23c, accent: 0xfff2a2 },
        { key: 'watermelon', label: '🍉', color: 0x27c76f, accent: 0x67f9a4 },
        { key: 'grapes', label: '🍇', color: 0x9d42d1, accent: 0xd48aff },
        { key: 'plum', label: '🍑', color: 0x8a3cb4, accent: 0xc37ce1 },
        { key: 'orange', label: '🍊', color: 0xff8d08, accent: 0xffc045 },
        { key: 'lemon', label: '🍋', color: 0xffe73a, accent: 0xfff27a },
        { key: 'cherries', label: '🍒', color: 0xe82b44, accent: 0xff7e9b },
    ];

    const reelCount = 3;
    const reels = [];

    function makeReel(index) {
        const reel = new PIXI.Container();
        reel.index = index;
        reel.y = app.renderer.height * 0.12;
        reel.symbols = [];    
        app.stage.addChild(reel);
        return reel;
    }

    for (let i = 0; i < reelCount; i++) {
        reels.push(makeReel(i));
    }

    const padding = 28;
    const reelWidth = (app.renderer.width - padding * 2 - 32) / 3;
    const reelHeight = app.renderer.height * 0.72;

    function symbolCard(symbol, width, height) {
        const container = new PIXI.Container();
        const bg = new PIXI.Graphics();
        bg.beginFill(0x12131c);
        bg.drawRoundedRect(0, 0, width, height, 22);
        bg.endFill();
        bg.lineStyle(4, 0xffffff, 0.08);
        bg.drawRoundedRect(0, 0, width, height, 22);
        bg.filters = [new PIXI.filters.BlurFilter(0.7)];
        container.addChild(bg);

        const shine = new PIXI.Graphics();
        shine.beginFill(0xffffff, 0.22);
        shine.drawEllipse(width * 0.6, height * 0.25, width * 0.34, height * 0.22);
        shine.endFill();
        shine.alpha = 0.7;
        container.addChild(shine);

        const badge = new PIXI.Graphics();
        badge.beginFill(symbol.color, 1);
        badge.drawRoundedRect(0, 0, width * 0.78, height * 0.78, 18);
        badge.endFill();
        badge.x = (width - badge.width) / 2;
        badge.y = (height - badge.height) / 2;
        container.addChild(badge);

        const icon = new PIXI.Text(symbol.label, {
            fontFamily: 'Inter, sans-serif',
            fontSize: Math.round(height * 0.55),
            fontWeight: '900',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
        });
        icon.anchor.set(0.5);
        icon.x = width / 2;
        icon.y = height / 2;
        container.addChild(icon);

        const glow = new PIXI.Graphics();
        glow.beginFill(symbol.accent, 0.12);
        glow.drawEllipse(width / 2, height / 2, width * 0.56, height * 0.35);
        glow.endFill();
        container.addChildAt(glow, 0);

        return container;
    }

    function buildReelSymbols(reel, offsetIndex) {
        reel.removeChildren();
        reel.symbols = [];
        for (let j = 0; j < 6; j++) {
            const item = symbols[(offsetIndex + j) % symbols.length];
            reel.symbols.push(item);
            const card = symbolCard(item, reelWidth, reelHeight / 3.3);
            card.y = j * (reelHeight / 3.3) - reelHeight * 0.11;
            reel.addChild(card);
        }
    }

    function layoutReels() {
        const spacing = 16;
        for (let i = 0; i < reels.length; i++) {
            const reel = reels[i];
            reel.x = padding + i * (reelWidth + spacing);
            reel.y = app.renderer.height * 0.12;
            buildReelSymbols(reel, i * 3);
        }
    }

    function drawFrame() {
        const frame = new PIXI.Graphics();
        frame.lineStyle(8, 0xffb23c, 0.75);
        frame.beginFill(0x12131c, 0.0);
        frame.drawRoundedRect(padding - 12, app.renderer.height * 0.12 - 12, reelCount * reelWidth + (reelCount - 1) * 16 + 24, reelHeight + 24, 30);
        frame.endFill();
        app.stage.addChildAt(frame, 0);
    }

    function rebuild() {
        app.stage.removeChildren();
        layoutReels();
        drawFrame();
    }

    function randomReelSymbols() {
        return symbols.sort(() => 0.5 - Math.random()).slice(0, 3);
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    let running = false;
    let stopTimeout;

    function startSpinVisual() {
        if (running) return;
        running = true;
        const startTime = performance.now();
        const spinDurations = [1500, 1900, 2300];

        reels.forEach((reel, index) => {
            reel.originalY = reel.y;
            reel.speed = 12 + index * 4;
            reel.blurFilter = new PIXI.filters.BlurFilter(0);
            reel.filters = [reel.blurFilter];
        });

        function animate(now) {
            const elapsed = now - startTime;
            reels.forEach((reel, index) => {
                const progress = Math.min(elapsed / spinDurations[index], 1);
                const eased = easeOutCubic(progress);
                reel.y = reel.originalY + eased * 40;
                reel.blurFilter.blur = 26 * (1 - progress);
                reel.x += reel.speed * 0.02;
                if (reel.x > padding + index * (reelWidth + 16) + 8) {
                    reel.x = padding + index * (reelWidth + 16) - 8;
                }
            });
            if (elapsed < spinDurations[2]) {
                currentAnimation = requestAnimationFrame(animate);
            } else {
                stopSpinVisual();
            }
        }
        currentAnimation = requestAnimationFrame(animate);
    }

    function stopSpinVisual(finalSymbols) {
        if (!running) return;
        running = false;
        if (currentAnimation) {
            cancelAnimationFrame(currentAnimation);
            currentAnimation = null;
        }
        reels.forEach((reel, index) => {
            reel.symbols = [];
            const finalSet = finalSymbols && finalSymbols[index] ? finalSymbols[index] : randomReelSymbols();
            reel.removeChildren();
            for (let j = 0; j < 3; j++) {
                const symbol = finalSet[j] || symbols[(index * 2 + j) % symbols.length];
                const card = symbolCard(symbol, reelWidth, reelHeight / 3.3);
                card.y = j * (reelHeight / 3.3) + 12;
                reel.addChild(card);
            }
            reel.y = app.renderer.height * 0.12;
            reel.filters = [];
        });
        rebuild();
    }

    window.fiveStarSpinVisual = startSpinVisual;
    window.fiveStarStopVisual = stopSpinVisual;

    rebuild();

    const depositBtn = document.getElementById('quick-deposit-btn');
    const depositModal = document.getElementById('quick-deposit-modal');
    const depositClose = document.getElementById('deposit-modal-close');
    const depositConfirm = document.getElementById('deposit-confirm-btn');

    function toggleDepositModal(show) {
        if (!depositModal) return;
        depositModal.classList.toggle('hidden', !show);
        depositModal.setAttribute('aria-hidden', String(!show));
    }

    if (depositBtn) depositBtn.addEventListener('click', () => toggleDepositModal(true));
    if (depositClose) depositClose.addEventListener('click', () => toggleDepositModal(false));
    if (depositConfirm) depositConfirm.addEventListener('click', () => toggleDepositModal(false));
}

function initFiveStarScene(container) {
    if (!container || typeof PIXI === 'undefined') return;

    const app = new PIXI.Application({
        antialias: true,
        backgroundAlpha: 0,
        resizeTo: container,
        autoDensity: true,
    });
    container.appendChild(app.view);

    const symbols = [
        { key: 'seven', label: '7', color: 0xff2a2a },
        { key: 'coin', label: '★', color: 0xffd54f },
        { key: 'watermelon', label: '🍉', color: 0x40c76e },
        { key: 'grapes', label: '🍇', color: 0x8f35cc },
        { key: 'plum', label: '🍑', color: 0x833f9f },
        { key: 'orange', label: '🍊', color: 0xff8c09 },
        { key: 'lemon', label: '🍋', color: 0xffef3b },
        { key: 'cherries', label: '🍒', color: 0xf4375c },
    ];

    const reelCount = 3;
    const reels = [];
    const maskContainer = new PIXI.Container();
    app.stage.addChild(maskContainer);

    const reelWidth = app.renderer.width / 3.4;
    const reelHeight = app.renderer.height * 0.72;
    const reelSpacing = reelWidth * 0.12;

    for (let i = 0; i < reelCount; i++) {
        const reel = new PIXI.Container();
        reel.x = i * (reelWidth + reelSpacing) + 40;
        reel.y = app.renderer.height * 0.14;
        reel.reelIndex = i;
        reel.symbols = [];
        for (let j = 0; j < 6; j++) {
            const symbolIndex = (i * 2 + j) % symbols.length;
            reel.symbols.push(symbols[symbolIndex]);
        }
        reels.push(reel);
        app.stage.addChild(reel);
    }

    const frameStyle = new PIXI.Graphics();
    frameStyle.lineStyle(6, 0xffbe4c, 0.85);
    frameStyle.drawRoundedRect(28, app.renderer.height * 0.12 - 8, reelCount * (reelWidth + reelSpacing) - reelSpacing + 16, reelHeight + 16, 28);
    app.stage.addChild(frameStyle);

    function drawSymbol(symbol, x, y, width, height) {
        const container = new PIXI.Container();
        const bg = new PIXI.Graphics();
        bg.beginFill(0x1c1c24);
        bg.drawRoundedRect(0, 0, width, height, 18);
        bg.endFill();
        bg.lineStyle(3, 0xffffff, 0.1);
        bg.drawRoundedRect(0, 0, width, height, 18);
        container.addChild(bg);

        const shine = new PIXI.Graphics();
        shine.beginFill(0xffffff, 0.14);
        shine.drawEllipse(width * 0.55, height * 0.25, width * 0.4, height * 0.25);
        shine.endFill();
        container.addChild(shine);

        const badge = new PIXI.Graphics();
        badge.beginFill(symbol.color, 1);
        badge.drawRoundedRect(0, 0, width * 0.86, height * 0.86, 20);
        badge.endFill();
        badge.x = (width - badge.width) / 2;
        badge.y = (height - badge.height) / 2;
        badge.filters = [new PIXI.filters.BlurFilter(2)];
        container.addChild(badge);

        const label = new PIXI.Text(symbol.label, {
            fontFamily: 'Inter, sans-serif',
            fontSize: Math.round(height * 0.55),
            fontWeight: '900',
            fill: '#ffffff',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 8,
            dropShadowDistance: 6,
        });
        label.anchor.set(0.5);
        label.x = width / 2;
        label.y = height / 2;
        container.addChild(label);

        container.x = x;
        container.y = y;
        return container;
    }

    function rebuildReels() {
        app.stage.removeChildren();
        app.stage.addChild(frameStyle);
        for (let i = 0; i < reels.length; i++) {
            const reel = reels[i];
            reel.removeChildren();
            const x = 40 + i * (reelWidth + reelSpacing);
            const y = app.renderer.height * 0.14;
            reel.x = x;
            reel.y = y;
            for (let j = 0; j < reel.symbols.length; j++) {
                const symbol = reel.symbols[j];
                const sy = j * (reelHeight / 3.4) - reelHeight * 0.12;
                const card = drawSymbol(symbol, 0, sy, reelWidth, reelHeight / 3.2);
                reel.addChild(card);
            }
            app.stage.addChild(reel);
        }
    }

    function shuffleArray(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    function wheelEase(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    let spinning = false;
    let currentAnimation = null;

    function startSlotSpinPhase() {
        if (spinning) return;
        spinning = true;
        const startTime = performance.now();
        const speed = [1.8, 1.4, 1.0];
        const reelPositions = reels.map((_, index) => index * 0.3);

        function animate(now) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / 1400, 1);
            reels.forEach((reel, index) => {
                const phase = wheelEase(Math.max(0, Math.min(1, (t - index * 0.1) / 0.9)));
                reel.y = app.renderer.height * 0.14 + phase * 24;
                reel.alpha = 0.9 + 0.1 * (1 - phase);
                reel.filters = [new PIXI.filters.BlurFilter(8 * (1 - phase))];
                reel.symbols = shuffleArray(symbols).slice(0, 6);
            });
            rebuildReels();
            if (t < 1) {
                currentAnimation = requestAnimationFrame(animate);
            } else {
                stopSlotSpinPhase();
            }
        }
        currentAnimation = requestAnimationFrame(animate);
    }

    function stopSlotSpinPhase() {
        if (currentAnimation) {
            cancelAnimationFrame(currentAnimation);
            currentAnimation = null;
        }
        reels.forEach((reel, index) => {
            const finalSymbols = shuffleArray(symbols).slice(0, 3);
            reel.symbols = [...finalSymbols, ...symbols.slice(0, 3)];
            reel.filters = [];
            reel.alpha = 1;
        });
        rebuildReels();
        spinning = false;
    }

    rebuildReels();

    const spinButton = document.getElementById('slot-bet-button');
    if (spinButton) {
        spinButton.addEventListener('click', () => {
            if (spinning) return;
            startSlotSpinPhase();
        });
    }

    const depositBtn = document.getElementById('quick-deposit-btn');
    const depositModal = document.getElementById('quick-deposit-modal');
    const depositClose = document.getElementById('deposit-modal-close');
    const depositConfirm = document.getElementById('deposit-confirm-btn');

    function toggleDepositModal(show) {
        if (!depositModal) return;
        depositModal.classList.toggle('hidden', !show);
        depositModal.setAttribute('aria-hidden', String(!show));
    }

    if (depositBtn) depositBtn.addEventListener('click', () => toggleDepositModal(true));
    if (depositClose) depositClose.addEventListener('click', () => toggleDepositModal(false));
    if (depositConfirm) depositConfirm.addEventListener('click', () => toggleDepositModal(false));
}
