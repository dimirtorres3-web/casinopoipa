document.addEventListener('DOMContentLoaded', function () {
    if (typeof PIXI === 'undefined') {
        console.warn('PIXI not loaded');
        return;
    }

    function createPixiIn(containerSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) return null;

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

        const ring = new PIXI.Graphics();
        ring.beginFill(0x000000, 0.15);
        ring.drawEllipse(0, 0, 1, 1);
        ring.endFill();
        rotor.addChild(ring);

        function rebuild() {
            rotor.removeChildren();
            const w = app.renderer.width;
            const h = app.renderer.height;
            rotor.x = w / 2;
            rotor.y = h / 2;

            const radius = Math.min(w, h) * 0.36;

            const bg = new PIXI.Graphics();
            bg.beginFill(0x000000, 0.12);
            bg.drawRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 18);
            bg.endFill();
            app.stage.addChild(bg);

            const ringG = new PIXI.Graphics();
            ringG.lineStyle(4, 0xffb94d, 0.18);
            ringG.drawCircle(0, 0, radius + 6);
            rotor.addChild(ringG);

            for (let i = 0; i < 10; i++) {
                const mark = new PIXI.Graphics();
                mark.beginFill(0xffd9a8);
                mark.drawRoundedRect(-6, -radius, 12, 24, 6);
                mark.endFill();
                const ang = (i / 10) * Math.PI * 2;
                mark.x = Math.cos(ang) * radius;
                mark.y = Math.sin(ang) * radius;
                mark.rotation = ang + Math.PI / 2;
                rotor.addChild(mark);
            }

            const center = new PIXI.Graphics();
            center.beginFill(0xffffff, 0.95);
            center.drawCircle(0, 0, Math.max(6, Math.floor(radius * 0.08)));
            center.endFill();
            rotor.addChild(center);
        }

        rebuild();

        app.ticker.add((delta) => {
            rotor.rotation += 0.01 * delta;
        });

        window.addEventListener('resize', () => {
            rebuild();
        });

        return app;
    }

    createPixiIn('.slot-canvas');
    createPixiIn('.roulette-canvas');
});
