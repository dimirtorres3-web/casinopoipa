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
        const gameSlug = (gamePage && gamePage.dataset && gamePage.dataset.game) || 'frutas-de-fuego-777';

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

    // --- 1. MATRICES DE EMOJIS PARA TODOS LOS JUEGOS (INCLUYE RULETA) ---
    let symbols = [];
    
    if (!gameSlug || gameSlug.includes('frutas') || gameSlug.includes('777')) {
        symbols = [
            ["👑7️⃣🔥", "🍉", "🍋", "🍒"],
            ["🪙⭐", "🍒", "🍇", "🍊"],
            ["👑7️⃣🔥", "🍇", "🍉", "🪙⭐"]
        ];
    } else if (gameSlug.includes('arlequin') || gameSlug.includes('palacio')) {
        symbols = [
            ["🃏✨", "🔔", "💎", "❤️"],
            ["🟪", "🔔", "🃏✨", "💎"],
            ["🃏✨", "❤️", "🟪", "🔔"]
        ];
    } else if (gameSlug.includes('mansion') || gameSlug.includes('embrujada')) {
        symbols = [
            ["👻💖", "☎️👑", "🕯️🔱", "💚💎"],
            ["👻💙", "📖🔮", "💜💎", "☎️👑"],
            ["👻💚", "🕯️🔱", "📖🔮", "👻💖"]
        ];
    } else if (gameSlug.includes('coronas') || gameSlug.includes('fortuna')) {
        symbols = [
            ["👑A️⃣", "👑K️⃣", "🍋", "🍒"],
            ["👑Q️⃣", "👑J️⃣", "🍒", "👑A️⃣"],
            ["👑K️⃣", "👑A️⃣", "👑Q️⃣", "🍋"]
        ];
    } else if (gameSlug.includes('ruleta') || gameSlug.includes('imperial')) {
        // --- AQUÍ ESTÁ TU RULETA IMPERIAL ---
        symbols = [
            ["🔄🎡", "🔴1️⃣", "⚫2️⃣", "🟢0️⃣"],
            ["🎰 fichas", "🔴3️⃣", "⚫4️⃣", "🔴5️⃣"],
            ["🔄 de giro", "⚫6️⃣", "🔴7️⃣", "⚫8️⃣"]
        ];
    }

    // --- 2. RENDERIZADOR UNIVERSAL DE FIGURAS ---
    if (symbols.length > 0) {
        symbols.forEach((column, columnIndex) => {
            column.forEach((emoji, rowIndex) => {
                const style = new PIXI.TextStyle({
                    fontSize: 52,
                    fontFamily: ['Segoe UI Emoji', 'Apple Color Emoji', 'Arial', 'sans-serif']
                });
                const textIcon = new PIXI.Text(emoji, style);
                textIcon.anchor.set(0.5);
                textIcon.x = (columnIndex * (w / 3)) + (w / 6);
                textIcon.y = (rowIndex * (h / 4)) + (h / 8) + 10;
                rotor.addChild(textIcon);
            });
        });
    }

    // --- 3. PALETA DE COLORES DE FONDO (LÍNEA 117 DE TU FOTO) ---
    const palette = {
        'frutas-de-fuego-777': { bg: 0x3d1a1f, accent: 0xffd700 },
        'palacio-arlequin': { bg: 0x0c0810, accent: 0xbf55ec },
        'mansion-embrujada': { bg: 0x141018, accent: 0x2ecc71 },
        'coronas-fortuna': { bg: 0x081c14, accent: 0xff4d4d },
        'ruleta-imperial': { bg: 0x071a11, accent: 0xffa500 }
    };

    const currentPalette = palette[gameSlug] || { bg: 0x0a0a0f, accent: 0xffffff };
    
    // Pinta el fondo del juego correspondiente
    if (app.renderer.background) {
        app.renderer.background.color = currentPalette.bg;
    } else {
        app.renderer.backgroundColor = currentPalette.bg;
    }

    // Dibuja el fondo interno del Canvas usando el color de la paleta
    const bg = new PIXI.Graphics();
    bg.beginFill(currentPalette.bg, 0.9);
    bg.drawRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 16);
    bg.endFill();
    rotor.addChild(bg);
}

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
    

    document.querySelectorAll('.slot-canvas, .roulette-canvas').forEach((el) => createPixiIn(el));

    const gamePage = document.querySelector('.game-page');
    if (gamePage) {
        if (gamePage.dataset.game === 'frutas-de-fuego-777') {
            initFiveStarScene(document.getElementById('five-star-reel-stage'));
        } else if (gamePage.dataset.game === 'poker') {
            initPokerScene(document.getElementById('poker-pixi-stage'));
        } else if (gamePage.dataset.game === 'palacio-arlequin') {
            initJokerJackpotScene(document.getElementById('joker-jackpot-stage'));
        } else if (gamePage.dataset.game === 'mansion-embrujada') {
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
    });
    app.view.style.width = '100%';
    app.view.style.height = '100%';
    container.appendChild(app.view);

    const tableGlow = new PIXI.Graphics();
    tableGlow.beginFill(0x4cc995, 0.16);
    tableGlow.drawEllipse(app.renderer.width / 2, app.renderer.height * 0.56, app.renderer.width * 0.42, app.renderer.height * 0.3);
    tableGlow.endFill();
    app.stage.addChild(tableGlow);

    const table = new PIXI.Graphics();
    table.beginFill(0x11231a);
    table.drawRoundedRect(0, app.renderer.height * 0.08, app.renderer.width, app.renderer.height * 0.82, 34);
    table.endFill();
    app.stage.addChild(table);

    const felt = new PIXI.Graphics();
    felt.beginFill(0x142b1f);
    felt.drawRoundedRect(app.renderer.width * 0.06, app.renderer.height * 0.16, app.renderer.width * 0.88, app.renderer.height * 0.66, 28);
    felt.endFill();
    felt.filters = [new PIXI.filters.BlurFilter(0.7)];
    app.stage.addChild(felt);

    const tableEdge = new PIXI.Graphics();
    tableEdge.lineStyle(6, 0x6cd7ac, 0.28);
    tableEdge.drawRoundedRect(app.renderer.width * 0.06, app.renderer.height * 0.16, app.renderer.width * 0.88, app.renderer.height * 0.66, 28);
    app.stage.addChild(tableEdge);

    const title = new PIXI.Text('Poker Royale', {
        fontFamily: 'Inter, sans-serif',
        fontSize: 26,
        fontWeight: '700',
        fill: '#f8e8c2',
        letterSpacing: 1.2,
    });
    title.anchor.set(0.5);
    title.x = app.renderer.width / 2;
    title.y = app.renderer.height * 0.14;
    app.stage.addChild(title);

    const subtitle = new PIXI.Text('Mesa clásica con cartas de lujo', {
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
        fill: '#c7ceb7',
    });
    subtitle.anchor.set(0.5);
    subtitle.x = app.renderer.width / 2;
    subtitle.y = app.renderer.height * 0.18;
    app.stage.addChild(subtitle);

    const cardValues = ['A', 'K', 'Q', 'J', '10', '9', '8'];
    const cardSuits = ['♠', '♥', '♦', '♣'];
    const cardColors = { '♠': 0xffffff, '♣': 0xffffff, '♥': 0xff5454, '♦': 0xff5454 };
    const cardSize = {
        width: Math.min(132, app.renderer.width * 0.12),
        height: Math.min(180, app.renderer.height * 0.24),
    };

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
        back.addChild(backShape, backPattern);

        const front = new PIXI.Container();
        const face = new PIXI.Graphics();
        face.beginFill(0xf8f2df);
        face.drawRoundedRect(0, 0, width, height, 20);
        face.endFill();
        const faceBorder = new PIXI.Graphics();
        faceBorder.lineStyle(4, 0x2d4a3d, 0.22);
        faceBorder.drawRoundedRect(0, 0, width, height, 20);
        front.addChild(face, faceBorder);

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
        front.addChild(topValue, bottomValue, centerSuit);

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
        { x: app.renderer.width * 0.3, y: app.renderer.height * 0.42 },
        { x: app.renderer.width * 0.42, y: app.renderer.height * 0.42 },
        { x: app.renderer.width * 0.58, y: app.renderer.height * 0.42 },
        { x: app.renderer.width * 0.7, y: app.renderer.height * 0.42 },
    ];

    cardPositions.forEach((pos) => {
        const value = cardValues[Math.floor(Math.random() * cardValues.length)];
        const suit = cardSuits[Math.floor(Math.random() * cardSuits.length)];
        const card = makePokerCard(value, suit);
        card.x = pos.x;
        card.y = pos.y;
        app.stage.addChild(card);
        pokerCards.push(card);
    });

    function swapCardFaces(card, value, suit) {
        card.frontFace.removeChildren();
        const face = new PIXI.Graphics();
        face.beginFill(0xf8f2df);
        face.drawRoundedRect(0, 0, card.width, card.height, 20);
        face.endFill();
        const faceBorder = new PIXI.Graphics();
        faceBorder.lineStyle(4, 0x2d4a3d, 0.22);
        faceBorder.drawRoundedRect(0, 0, card.width, card.height, 20);
        card.frontFace.addChild(face, faceBorder);
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
        bottomValue.x = card.width - 18;
        bottomValue.y = card.height - 16;
        const centerSuit = new PIXI.Text(suit, {
            fontFamily: 'Inter, sans-serif',
            fontSize: 64,
            fontWeight: '900',
            fill: cardColors[suit],
            stroke: '#111111',
            strokeThickness: 4,
        });
        centerSuit.anchor.set(0.5);
        centerSuit.x = card.width / 2;
        centerSuit.y = card.height / 2;
        card.frontFace.addChild(topValue, bottomValue, centerSuit);
    }

    function animateCardFlip(card, value, suit, callback) {
        const duration = 330;
        const start = performance.now();
        let halfway = false;

        function step(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const scale = progress < 0.5 ? 1 - progress * 2 : (progress - 0.5) * 2;
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
        const chosen = [];
        pokerCards.forEach((card, index) => {
            const value = cardValues[Math.floor(Math.random() * cardValues.length)];
            const suit = cardSuits[Math.floor(Math.random() * cardSuits.length)];
            chosen.push({ value, suit });
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
        table.clear();
        felt.clear();
        tableEdge.clear();
        table.beginFill(0x11231a);
        table.drawRoundedRect(0, app.renderer.height * 0.08, app.renderer.width, app.renderer.height * 0.82, 34);
        table.endFill();

        felt.beginFill(0x142b1f);
        felt.drawRoundedRect(app.renderer.width * 0.06, app.renderer.height * 0.16, app.renderer.width * 0.88, app.renderer.height * 0.66, 28);
        felt.endFill();
        tableEdge.lineStyle(6, 0x6cd7ac, 0.28);
        tableEdge.drawRoundedRect(app.renderer.width * 0.06, app.renderer.height * 0.16, app.renderer.width * 0.88, app.renderer.height * 0.66, 28);

        tableGlow.clear();
        tableGlow.beginFill(0x4cc995, 0.16);
        tableGlow.drawEllipse(app.renderer.width / 2, app.renderer.height * 0.56, app.renderer.width * 0.42, app.renderer.height * 0.3);
        tableGlow.endFill();

        title.x = app.renderer.width / 2;
        title.y = app.renderer.height * 0.14;
        subtitle.x = app.renderer.width / 2;
        subtitle.y = app.renderer.height * 0.18;

        cardPositions.forEach((pos, index) => {
            const card = pokerCards[index];
            card.x = pos.x;
            card.y = app.renderer.height * 0.42;
        });
    }

    window.addEventListener('resize', resizeTable);
}

function initJokerJackpotScene(container) {
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

    const bg = new PIXI.Graphics();
    bg.beginFill(0x110717);
    bg.drawRect(0, 0, app.renderer.width, app.renderer.height);
    bg.endFill();
    app.stage.addChild(bg);

    const neonGrid = new PIXI.Graphics();
    neonGrid.lineStyle(1, 0x8f4de1, 0.16);
    for (let x = 0; x < app.renderer.width; x += 40) {
        neonGrid.moveTo(x, 0);
        neonGrid.lineTo(x, app.renderer.height);
    }
    for (let y = 0; y < app.renderer.height; y += 40) {
        neonGrid.moveTo(0, y);
        neonGrid.lineTo(app.renderer.width, y);
    }
    app.stage.addChild(neonGrid);

    const boardColors = {
        joker: 0xae46ff,
        grand: 0xff4d67,
        major: 0x48de92,
        minor: 0x4ab7ff,
    };

    const jackpotBoards = [];
    const labels = ['joker', 'grand', 'major', 'minor'];
    labels.forEach((label, index) => {
        const board = new PIXI.Container();
        const width = app.renderer.width * 0.22;
        const height = 84;
        const x = app.renderer.width * 0.045 + index * (width + 14);
        const y = 24;

        const panel = new PIXI.Graphics();
        panel.beginFill(0x1d092a, 0.88);
        panel.drawRoundedRect(0, 0, width, height, 22);
        panel.endFill();
        panel.lineStyle(3, boardColors[label], 0.8);
        panel.drawRoundedRect(0, 0, width, height, 22);

        const accent = new PIXI.Graphics();
        accent.beginFill(boardColors[label], 0.9);
        accent.drawRoundedRect(0, 0, 10, height, 12);
        accent.endFill();
        accent.x = width - 16;

        const title = new PIXI.Text(label.toUpperCase(), {
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            fontWeight: '700',
            fill: '#e6d5ff',
            letterSpacing: 1.2,
        });
        title.x = 18;
        title.y = 14;

        const value = new PIXI.Text('0', {
            fontFamily: 'Inter, sans-serif',
            fontSize: 24,
            fontWeight: '800',
            fill: boardColors[label],
            stroke: '#23041a',
            strokeThickness: 4,
        });
        value.x = 18;
        value.y = 40;
        value.name = `${label}-amount`;

        board.addChild(panel, accent, title, value);
        board.x = x;
        board.y = y;
        app.stage.addChild(board);
        jackpotBoards.push({ label, value });
    });

    const reelContainer = new PIXI.Container();
    app.stage.addChild(reelContainer);
    const reelWidth = Math.min(180, app.renderer.width * 0.17);
    const reelHeight = app.renderer.height * 0.62;
    const reelSpace = 22;
    const reelCount = 3;
    const reels = [];

    const slotSymbols = [
        { label: '777', color: 0xff68d4, type: 'seven' },
        { label: '🔔', color: 0xffd94c, type: 'bell' },
        { label: '💎', color: 0x6ad2ff, type: 'gem' },
        { label: 'JOKER', color: 0xff91ff, type: 'joker' },
        { label: '🍀', color: 0x5be38a, type: 'lucky' },
    ];

    function makeSymbolCard(symbol, width, height) {
        const container = new PIXI.Container();
        const bg = new PIXI.Graphics();
        bg.beginFill(0x251033, 0.94);
        bg.drawRoundedRect(0, 0, width, height, 24);
        bg.endFill();
        bg.lineStyle(3, 0xffffff, 0.12);
        bg.drawRoundedRect(0, 0, width, height, 24);
        container.addChild(bg);

        const light = new PIXI.Graphics();
        light.beginFill(symbol.color, 0.16);
        light.drawRoundedRect(14, 14, width - 28, height - 28, 18);
        light.endFill();
        container.addChild(light);

        const blur = new PIXI.Graphics();
        blur.beginFill(symbol.color, 0.14);
        blur.drawEllipse(width / 2, height / 2, width * 0.78, height * 0.58);
        blur.endFill();
        blur.filters = [new PIXI.filters.BlurFilter(14)];
        container.addChild(blur);

        if (symbol.type === 'joker') {
            const hat = new PIXI.Graphics();
            hat.beginFill(0xffb0ff);
            hat.moveTo(width * 0.5, height * 0.18);
            hat.lineTo(width * 0.33, height * 0.35);
            hat.quadraticCurveTo(width * 0.5, height * 0.08, width * 0.67, height * 0.35);
            hat.lineTo(width * 0.5, height * 0.18);
            hat.endFill();
            container.addChild(hat);
            const face = new PIXI.Graphics();
            face.beginFill(0xffffff, 0.96);
            face.drawEllipse(width * 0.5, height * 0.58, width * 0.24, height * 0.18);
            face.endFill();
            container.addChild(face);
            const eyes = new PIXI.Graphics();
            eyes.beginFill(0x3b0d45);
            eyes.drawEllipse(width * 0.44, height * 0.58, 6, 10);
            eyes.drawEllipse(width * 0.56, height * 0.58, 6, 10);
            eyes.endFill();
            container.addChild(eyes);
            const mouth = new PIXI.Graphics();
            mouth.lineStyle(4, 0xff3dfb, 0.95);
            mouth.arc(width * 0.5, height * 0.64, 14, 0.35 * Math.PI, 0.65 * Math.PI);
            container.addChild(mouth);
        } else if (symbol.type === 'seven') {
            const text = new PIXI.Text('777', {
                fontFamily: 'Inter, sans-serif',
                fontSize: Math.round(height * 0.44),
                fontWeight: '900',
                fill: '#ffffff',
                stroke: '#b01f85',
                strokeThickness: 8,
            });
            text.anchor.set(0.5);
            text.x = width / 2;
            text.y = height / 2;
            container.addChild(text);
        } else if (symbol.type === 'bell') {
            const bell = new PIXI.Graphics();
            bell.beginFill(0xffd94c);
            bell.drawEllipse(width / 2, height * 0.5, width * 0.22, height * 0.18);
            bell.endFill();
            bell.beginFill(0xffd94c);
            bell.arc(width / 2, height * 0.5, width * 0.27, Math.PI, 0);
            bell.endFill();
            const clapper = new PIXI.Graphics();
            clapper.beginFill(0x9b6d05);
            clapper.drawCircle(width / 2, height * 0.68, 8);
            clapper.endFill();
            container.addChild(bell, clapper);
        } else if (symbol.type === 'gem') {
            const gem = new PIXI.Graphics();
            gem.beginFill(0x6ad2ff);
            gem.moveTo(width / 2, height * 0.18);
            gem.lineTo(width * 0.78, height * 0.48);
            gem.lineTo(width / 2, height * 0.82);
            gem.lineTo(width * 0.22, height * 0.48);
            gem.closePath();
            gem.endFill();
            gem.lineStyle(3, 0xffffff, 0.18);
            gem.moveTo(width / 2, height * 0.18);
            gem.lineTo(width * 0.78, height * 0.48);
            gem.lineTo(width / 2, height * 0.82);
            gem.lineTo(width * 0.22, height * 0.48);
            gem.closePath();
            container.addChild(gem);
        } else {
            const icon = new PIXI.Text(symbol.label, {
                fontFamily: 'Inter, sans-serif',
                fontSize: Math.round(height * 0.42),
                fontWeight: '900',
                fill: symbol.color,
                stroke: '#0c0511',
                strokeThickness: 6,
            });
            icon.anchor.set(0.5);
            icon.x = width / 2;
            icon.y = height / 2;
            container.addChild(icon);
        }

        return container;
    }

    function createReel(index) {
        const reel = new PIXI.Container();
        reel.x = app.renderer.width * 0.1 + index * (reelWidth + reelSpace);
        reel.y = app.renderer.height * 0.16;
        reel.symbols = [];
        reel.positions = [];
        for (let j = 0; j < 6; j += 1) {
            const symbol = slotSymbols[(index * 2 + j) % slotSymbols.length];
            const card = makeSymbolCard(symbol, reelWidth, reelWidth * 1.02);
            card.y = j * (reelWidth * 1.05);
            reel.symbols.push(card);
            reel.addChild(card);
        }
        reelContainer.addChild(reel);
        reels.push(reel);
        return reel;
    }

    for (let i = 0; i < reelCount; i++) {
        createReel(i);
    }

    const multiplierText = new PIXI.Text('', {
        fontFamily: 'Inter, sans-serif',
        fontSize: 40,
        fontWeight: '800',
        fill: '#f5a2ff',
        stroke: '#2b0525',
        strokeThickness: 6,
    });
    multiplierText.anchor.set(0.5);
    multiplierText.x = app.renderer.width * 0.5;
    multiplierText.y = app.renderer.height * 0.55;
    multiplierText.alpha = 0;
    app.stage.addChild(multiplierText);

    function emitMultiplier(value) {
        multiplierText.text = `x${value}`;
        multiplierText.alpha = 1;
        multiplierText.scale.set(0.8);
        const start = performance.now();
        function animate(now) {
            const t = Math.min((now - start) / 800, 1);
            multiplierText.y = app.renderer.height * 0.55 - t * 40;
            multiplierText.alpha = 1 - t;
            multiplierText.scale.set(0.8 + 0.4 * t);
            if (t < 1) requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
    }

    function pulseBoard(valueLabel, from) {
        const text = app.stage.children.find((child) => child.name === `${valueLabel}-amount`);
        if (!text) return;
        const originalScale = text.scale.x;
        const start = performance.now();
        function blink(now) {
            const t = Math.min((now - start) / 450, 1);
            text.scale.set(originalScale + Math.sin(t * Math.PI * 2) * 0.05);
            if (t < 1) requestAnimationFrame(blink);
        }
        requestAnimationFrame(blink);
    }

    let spinActive = false;
    let spinTicker = null;

    function startJokerSpin() {
        if (spinActive) return;
        spinActive = true;
        const spinStart = performance.now();
        const baseline = [32, 28, 24];
        const spinDelay = [1300, 1650, 2000];

        function animate(now) {
            const elapsed = now - spinStart;
            reels.forEach((reel, index) => {
                const progress = Math.min(elapsed / spinDelay[index], 1);
                reel.y = app.renderer.height * 0.16 + Math.sin(elapsed * 0.015 + index) * 4;
                reel.alpha = 0.95 + 0.05 * (1 - progress);
                reel.children.forEach((card, cardIndex) => {
                    card.y = cardIndex * (reelWidth * 1.05) + Math.sin((elapsed + cardIndex * 60) * 0.02) * 8 * (1 - progress);
                    card.filters = [new PIXI.filters.BlurFilter(18 * (1 - progress))];
                });
                if (progress === 1) {
                    const finalSymbols = [
                        slotSymbols[(index * 3 + 1) % slotSymbols.length],
                        slotSymbols[(index * 3 + 2) % slotSymbols.length],
                        slotSymbols[(index * 3 + 3) % slotSymbols.length],
                        slotSymbols[(index * 3 + 4) % slotSymbols.length],
                        slotSymbols[(index * 3 + 5) % slotSymbols.length],
                        slotSymbols[(index * 3 + 0) % slotSymbols.length],
                    ];
                    reel.removeChildren();
                    finalSymbols.forEach((symbol, symbolIndex) => {
                        const card = makeSymbolCard(symbol, reelWidth, reelWidth * 1.02);
                        card.y = symbolIndex * (reelWidth * 1.05);
                        reel.addChild(card);
                    });
                }
            });
            if (elapsed < spinDelay[2]) {
                spinTicker = requestAnimationFrame(animate);
            } else {
                stopJokerSpin();
            }
        }
        spinTicker = requestAnimationFrame(animate);
        emitMultiplier([2, 3, 5][Math.floor(Math.random() * 3)]);
    }

    function stopJokerSpin() {
        spinActive = false;
        if (spinTicker) {
            cancelAnimationFrame(spinTicker);
            spinTicker = null;
        }
        reels.forEach((reel, index) => {
            reel.children.forEach((card) => {
                card.filters = [];
            });
        });
        const multiplier = [2, 3, 5][Math.floor(Math.random() * 3)];
        emitMultiplier(multiplier);
        pulseBoard('joker');
    }

    function randomJackpotValue(base) {
        const variation = Math.floor(Math.random() * 12000);
        return base + variation;
    }

    function refreshJackpots() {
        const values = {
            joker: randomJackpotValue(6420000),
            grand: randomJackpotValue(14300000),
            major: randomJackpotValue(4220000),
            minor: randomJackpotValue(920000),
        };
        labels.forEach((label) => {
            const text = app.stage.children.find((child) => child.name === `${label}-amount`);
            if (text) {
                text.text = `Gs. ${values[label].toLocaleString('es-PY')}`;
            }
        });
    }

    const jackpotRefresh = setInterval(refreshJackpots, 3100);

    const spinButton = document.getElementById('slot-bet-button');
    if (spinButton) {
        spinButton.addEventListener('click', () => {
            startJokerSpin();
        });
    }

    function resizeScene() {
        app.renderer.resize(container.clientWidth, container.clientHeight);
        bg.clear();
        bg.beginFill(0x110717);
        bg.drawRect(0, 0, app.renderer.width, app.renderer.height);
        bg.endFill();
        neonGrid.clear();
        neonGrid.lineStyle(1, 0x8f4de1, 0.16);
        for (let x = 0; x < app.renderer.width; x += 40) {
            neonGrid.moveTo(x, 0);
            neonGrid.lineTo(x, app.renderer.height);
        }
        for (let y = 0; y < app.renderer.height; y += 40) {
            neonGrid.moveTo(0, y);
            neonGrid.lineTo(app.renderer.width, y);
        }
        jackpotBoards.forEach(({ label }, index) => {
            const board = app.stage.children[index + 2];
            board.x = app.renderer.width * 0.045 + index * (app.renderer.width * 0.22 + 14);
        });
        reelContainer.x = 0;
        reelContainer.y = app.renderer.height * 0.18;
        reels.forEach((reel, index) => {
            reel.x = app.renderer.width * 0.1 + index * (reelWidth + reelSpace);
        });
        multiplierText.x = app.renderer.width * 0.5;
        multiplierText.y = app.renderer.height * 0.55;
    }

    window.addEventListener('resize', resizeScene);
    refreshJackpots();
}

function initBettyBorisBooScene(container) {
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

    const bgLayer = new PIXI.Container();
    const bg = new PIXI.Graphics();
    const mistLayer = new PIXI.Container();
    const reelContainer = new PIXI.Container();
    bgLayer.addChild(bg);
    app.stage.addChild(bgLayer, reelContainer, mistLayer);

    const jackpotValues = {
        gold: document.getElementById('betty-jackpot-gold'),
        silver: document.getElementById('betty-jackpot-silver'),
        bronze: document.getElementById('betty-jackpot-bronze'),
        minor: document.getElementById('betty-jackpot-minor'),
    };

    const slotSymbols = [
        { type: 'betty', color: 0xff98ff },
        { type: 'boris', color: 0x6acfef },
        { type: 'boo', color: 0x8cff8e },
        { type: 'book', color: 0xe1d3a2 },
        { type: 'candle', color: 0xffd16c },
        { type: 'phone', color: 0xd19cff },
        { type: 'spade', color: 0x8b8dff },
        { type: 'heart', color: 0xff5678 },
        { type: 'diamond', color: 0x6ae0ff },
        { type: 'club', color: 0x9af3d6 },
    ];

    const reels = [];
    const reelCount = 3;
    const reelWidth = Math.min(180, app.renderer.width * 0.18);
    const reelHeight = app.renderer.height * 0.64;
    const reelGap = 20;

    function drawBackground() {
        const w = app.renderer.width;
        const h = app.renderer.height;
        bgLayer.removeChildren();
        bg.clear();
        bg.beginFill(0x10040c);
        bg.drawRect(0, 0, w, h);
        bg.endFill();

        const wall = new PIXI.Graphics();
        wall.beginFill(0x1a091a);
        wall.drawRect(0, 0, w, h * 0.55);
        wall.endFill();

        const panel = new PIXI.Graphics();
        panel.beginFill(0x0f0610, 0.92);
        panel.drawRoundedRect(w * 0.06, h * 0.14, w * 0.88, h * 0.65, 42);
        panel.endFill();
        panel.lineStyle(2, 0xffffff, 0.08);
        panel.drawRoundedRect(w * 0.06, h * 0.14, w * 0.88, h * 0.65, 42);

        const rug = new PIXI.Graphics();
        rug.beginFill(0x2d082c);
        rug.drawRoundedRect(w * 0.10, h * 0.64, w * 0.80, h * 0.28, 80);
        rug.endFill();
        rug.lineStyle(3, 0xff93ff, 0.12);
        rug.drawRoundedRect(w * 0.10, h * 0.64, w * 0.80, h * 0.28, 80);

        const coins = new PIXI.Container();
        for (let i = 0; i < 8; i += 1) {
            const coin = new PIXI.Graphics();
            const size = 18 + Math.random() * 18;
            coin.beginFill(0xffd444);
            coin.drawCircle(0, 0, size);
            coin.endFill();
            coin.x = w * 0.12 + (i * 1.2 + Math.random() * 0.13) * w * 0.08;
            coin.y = h * 0.85 + Math.sin(i * 0.8) * 10;
            coin.alpha = 0.92;
            coin.filters = [new PIXI.filters.BlurFilter(0.6)];
            coins.addChild(coin);
        }

        const candelabraBase = new PIXI.Graphics();
        candelabraBase.beginFill(0x1b0918);
        candelabraBase.drawRect(w * 0.42, h * 0.04, w * 0.16, h * 0.07);
        candelabraBase.endFill();

        const branch = new PIXI.Graphics();
        branch.lineStyle(5, 0x6b2556, 0.9);
        branch.moveTo(w * 0.50, h * 0.1);
        branch.lineTo(w * 0.50, h * 0.22);
        branch.moveTo(w * 0.50, h * 0.13);
        branch.lineTo(w * 0.35, h * 0.18);
        branch.moveTo(w * 0.50, h * 0.13);
        branch.lineTo(w * 0.65, h * 0.18);

        for (let i = 0; i < 3; i += 1) {
            const flame = new PIXI.Graphics();
            flame.beginFill(0xffd865, 0.2);
            flame.drawEllipse(w * (0.44 + i * 0.06), h * (0.22 + i * 0.004), 16, 28);
            flame.endFill();
            flame.beginFill(0xffb424, 0.95);
            flame.drawPolygon([
                w * (0.44 + i * 0.06), h * (0.18 + i * 0.004),
                w * (0.445 + i * 0.06), h * (0.24 + i * 0.004),
                w * (0.435 + i * 0.06), h * (0.24 + i * 0.004),
            ]);
            flame.endFill();
            app.stage.addChildAt(flame, 5);
        }

        const glow = new PIXI.Graphics();
        glow.beginFill(0xf13cff, 0.06);
        glow.drawEllipse(w * 0.5, h * 0.16, w * 0.5, h * 0.12);
        glow.endFill();

        bgLayer.addChild(bg, wall, panel, rug, coins, candelabraBase, branch, glow);
    }

    function makeSymbolCard(symbol, width, height) {
        const card = new PIXI.Container();
        const frame = new PIXI.Graphics();
        frame.beginFill(0x180915, 0.92);
        frame.drawRoundedRect(0, 0, width, height, 28);
        frame.endFill();
        frame.lineStyle(4, 0xe6baff, 0.18);
        frame.drawRoundedRect(0, 0, width, height, 28);
        card.addChild(frame);

        const inner = new PIXI.Graphics();
        inner.beginFill(0x2a112f, 0.88);
        inner.drawRoundedRect(12, 12, width - 24, height - 24, 22);
        inner.endFill();
        card.addChild(inner);

        const filigree = new PIXI.Graphics();
        filigree.lineStyle(2, 0xffd1ff, 0.16);
        filigree.drawRoundedRect(16, 16, width - 32, height - 32, 18);
        card.addChild(filigree);

        const glow = new PIXI.Graphics();
        glow.beginFill(symbol.color, 0.12);
        glow.drawEllipse(width / 2, height / 2, width * 0.68, height * 0.68);
        glow.endFill();
        glow.filters = [new PIXI.filters.BlurFilter(18)];
        card.addChild(glow);

        const shape = new PIXI.Container();
        if (symbol.type === 'betty' || symbol.type === 'boris' || symbol.type === 'boo') {
            const ghost = new PIXI.Graphics();
            ghost.beginFill(symbol.color, 0.24);
            ghost.drawEllipse(width / 2, height * 0.46, width * 0.28, height * 0.26);
            ghost.endFill();
            ghost.beginFill(symbol.color, 0.45);
            ghost.drawEllipse(width / 2, height * 0.42, width * 0.18, height * 0.18);
            ghost.endFill();
            ghost.beginFill(0xffffff, 0.88);
            ghost.drawCircle(width * 0.44, height * 0.38, 6);
            ghost.drawCircle(width * 0.56, height * 0.38, 6);
            ghost.endFill();
            const mist = new PIXI.Graphics();
            mist.beginFill(symbol.color, 0.14);
            mist.drawEllipse(width / 2, height * 0.65, width * 0.34, height * 0.16);
            mist.endFill();
            mist.filters = [new PIXI.filters.BlurFilter(14)];
            shape.addChild(mist, ghost);
        } else if (symbol.type === 'book') {
            const bookCover = new PIXI.Graphics();
            bookCover.beginFill(0x3c1b4c);
            bookCover.drawRoundedRect(width * 0.29, height * 0.24, width * 0.42, height * 0.42, 12);
            bookCover.endFill();
            const page = new PIXI.Graphics();
            page.beginFill(0xf8e7cb, 0.92);
            page.drawRoundedRect(width * 0.31, height * 0.26, width * 0.38, height * 0.38, 8);
            page.endFill();
            const rune = new PIXI.Graphics();
            rune.lineStyle(3, 0xddc57e, 0.94);
            rune.moveTo(width * 0.42, height * 0.32);
            rune.lineTo(width * 0.58, height * 0.32);
            rune.moveTo(width * 0.47, height * 0.36);
            rune.lineTo(width * 0.53, height * 0.36);
            rune.moveTo(width * 0.50, height * 0.36);
            rune.lineTo(width * 0.50, height * 0.52);
            shape.addChild(bookCover, page, rune);
        } else if (symbol.type === 'candle') {
            const base = new PIXI.Graphics();
            base.beginFill(0x3d2435);
            base.drawRoundedRect(width * 0.38, height * 0.48, width * 0.24, height * 0.28, 10);
            base.endFill();
            const flame = new PIXI.Graphics();
            flame.beginFill(0xffb84c, 0.95);
            flame.drawEllipse(width * 0.50, height * 0.36, width * 0.08, height * 0.12);
            flame.endFill();
            shape.addChild(base, flame);
        } else if (symbol.type === 'phone') {
            const body = new PIXI.Graphics();
            body.beginFill(0x8f5cff);
            body.drawRoundedRect(width * 0.32, height * 0.36, width * 0.36, height * 0.24, 14);
            body.endFill();
            const dial = new PIXI.Graphics();
            dial.beginFill(0x2b0f3f);
            dial.drawCircle(width * 0.50, height * 0.47, width * 0.10);
            dial.endFill();
            shape.addChild(body, dial);
        } else {
            const suit = new PIXI.Graphics();
            suit.beginFill(symbol.color, 0.98);
            const cx = width / 2;
            const cy = height * 0.48;
            const size = width * 0.18;
            if (symbol.type === 'spade') {
                suit.moveTo(cx, cy - size * 1.1);
                suit.bezierCurveTo(cx + size, cy - size, cx + size * 0.85, cy + size * 0.35, cx, cy + size);
                suit.bezierCurveTo(cx - size * 0.85, cy + size * 0.35, cx - size, cy - size, cx, cy - size * 1.1);
                suit.endFill();
                suit.beginFill(symbol.color, 1);
                suit.drawRect(cx - size * 0.16, cy + size * 0.8, size * 0.32, size * 0.6);
                suit.endFill();
            } else if (symbol.type === 'heart') {
                suit.moveTo(cx, cy + size * 0.4);
                suit.bezierCurveTo(cx + size, cy - size * 0.25, cx + size * 0.12, cy - size * 0.9, cx, cy - size * 0.4);
                suit.bezierCurveTo(cx - size * 0.12, cy - size * 0.9, cx - size, cy - size * 0.25, cx, cy + size * 0.4);
                suit.endFill();
            } else if (symbol.type === 'diamond') {
                suit.moveTo(cx, cy - size);
                suit.lineTo(cx + size, cy);
                suit.lineTo(cx, cy + size);
                suit.lineTo(cx - size, cy);
                suit.closePath();
                suit.endFill();
            } else if (symbol.type === 'club') {
                suit.drawCircle(cx, cy - size * 0.5, size * 0.38);
                suit.drawCircle(cx - size * 0.42, cy + size * 0.05, size * 0.28);
                suit.drawCircle(cx + size * 0.42, cy + size * 0.05, size * 0.28);
                suit.beginFill(symbol.color, 1);
                suit.drawRect(cx - size * 0.1, cy + size * 0.2, size * 0.2, size * 0.78);
                suit.endFill();
            }
            shape.addChild(suit);
        }
        card.addChild(shape);
        shape.x = 0;
        shape.y = 0;
        return card;
    }

    function createReel(index) {
        const reel = new PIXI.Container();
        reel.x = app.renderer.width * 0.09 + index * (reelWidth + reelGap);
        reel.y = app.renderer.height * 0.18;
        reel.symbols = [];
        for (let j = 0; j < 5; j += 1) {
            const symbol = slotSymbols[(index * 3 + j) % slotSymbols.length];
            const card = makeSymbolCard(symbol, reelWidth, reelWidth * 1.05);
            card.y = j * (reelWidth * 1.03);
            reel.addChild(card);
            reel.symbols.push(card);
        }
        reelContainer.addChild(reel);
        reels.push(reel);
        return reel;
    }

    for (let i = 0; i < reelCount; i += 1) {
        createReel(i);
    }

    function buildFog() {
        mistLayer.removeChildren();
        const fogCount = 4;
        for (let i = 0; i < fogCount; i += 1) {
            const fog = new PIXI.Graphics();
            fog.beginFill(0xff9bff, 0.08);
            fog.drawEllipse(app.renderer.width * (0.18 + i * 0.22), app.renderer.height * (0.38 + (i % 2) * 0.08), app.renderer.width * 0.22, app.renderer.height * 0.10);
            fog.endFill();
            fog.filters = [new PIXI.filters.BlurFilter(30)];
            mistLayer.addChild(fog);
        }
    }

    function randomJackpotValue(base) {
        const variation = Math.floor(Math.random() * 10200);
        return base + variation;
    }

    function refreshJackpots() {
        if (jackpotValues.gold) jackpotValues.gold.textContent = `Gs. ${randomJackpotValue(9125000).toLocaleString('es-PY')}`;
        if (jackpotValues.silver) jackpotValues.silver.textContent = `Gs. ${randomJackpotValue(4920000).toLocaleString('es-PY')}`;
        if (jackpotValues.bronze) jackpotValues.bronze.textContent = `Gs. ${randomJackpotValue(2450000).toLocaleString('es-PY')}`;
        if (jackpotValues.minor) jackpotValues.minor.textContent = `Gs. ${randomJackpotValue(780000).toLocaleString('es-PY')}`;
    }

    let spinActive = false;
    let spinAnimation = null;

    function startBettySpin() {
        if (spinActive) return;
        spinActive = true;
        const startTime = performance.now();
        const durations = [1500, 1900, 2300];

        reels.forEach((reel) => {
            reel.initialY = reel.y;
        });

        function animate(now) {
            const elapsed = now - startTime;
            reels.forEach((reel, index) => {
                const duration = durations[index];
                const progress = Math.min(elapsed / duration, 1);
                const blur = 20 * (1 - progress);
                reel.children.forEach((card, cardIndex) => {
                    card.y = cardIndex * (reelWidth * 1.03) + Math.sin(elapsed * 0.022 + cardIndex * 0.8) * 18 * (1 - progress);
                    card.filters = [new PIXI.filters.BlurFilter(blur)];
                });
                reel.alpha = 0.92 + 0.08 * progress;
                if (progress >= 1) {
                    reel.stopped = true;
                }
            });
            if (elapsed < durations[2]) {
                spinAnimation = requestAnimationFrame(animate);
            } else {
                stopBettySpin();
            }
        }
        buildFog();
        spinAnimation = requestAnimationFrame(animate);
    }

    function stopBettySpin() {
        spinActive = false;
        if (spinAnimation) {
            cancelAnimationFrame(spinAnimation);
            spinAnimation = null;
        }
        reels.forEach((reel, index) => {
            reel.removeChildren();
            const finalSymbols = [];
            for (let j = 0; j < 5; j += 1) {
                finalSymbols.push(slotSymbols[(index * 4 + j) % slotSymbols.length]);
            }
            finalSymbols.forEach((symbol, j) => {
                const card = makeSymbolCard(symbol, reelWidth, reelWidth * 1.05);
                card.y = j * (reelWidth * 1.03);
                reel.addChild(card);
            });
            reel.alpha = 1;
            reel.filters = [];
        });
    }

    const spinButton = document.getElementById('slot-bet-button');
    if (spinButton) {
        spinButton.addEventListener('click', () => {
            startBettySpin();
        });
    }

    function resizeScene() {
        app.renderer.resize(container.clientWidth, container.clientHeight);
        drawBackground();
        const newWidth = app.renderer.width;
        reels.forEach((reel, index) => {
            reel.x = newWidth * 0.09 + index * (reelWidth + reelGap);
        });
        mistLayer.children.forEach((fog, index) => {
            fog.x = app.renderer.width * (0.18 + index * 0.22);
            fog.y = app.renderer.height * (0.38 + (index % 2) * 0.08);
        });
    }

    window.addEventListener('resize', resizeScene);
    drawBackground();
    refreshJackpots();
}

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
        const s = (typeof symbol === 'string') ? { label: symbol, color: 0x333333, accent: 0x666666 } : symbol;

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
        badge.beginFill(s.color || 0x222222, 1);
        badge.drawRoundedRect(0, 0, width * 0.78, height * 0.78, 18);
        badge.endFill();
        badge.x = (width - badge.width) / 2;
        badge.y = (height - badge.height) / 2;
        container.addChild(badge);

        const icon = new PIXI.Text(s.label || '', {
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
        glow.beginFill(s.accent || 0x666666, 0.12);
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
// --- INYECTOR MANUAL DE LIENZO GRÁFICO PARA EL CONTENEDOR ---
const slotDisplay = document.querySelector('.slot-canvas') || document.getElementById('joker-root');
if (slotDisplay) {
    slotDisplay.style.backgroundColor = '#0d0d18'; // Quita el fondo blanco molesto
    slotDisplay.style.border = '2px solid #ff8a00';   // Borde naranja premium
    slotDisplay.style.borderRadius = '16px';
    slotDisplay.style.minHeight = '320px';
    
    // Forzamos al motor a reconstruir los emojis adentro del recuadro
    if (typeof rebuild === 'function') {
        rebuild();
    }
}
