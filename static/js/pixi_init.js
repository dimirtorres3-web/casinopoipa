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
});
