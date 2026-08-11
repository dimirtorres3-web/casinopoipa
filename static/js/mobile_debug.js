(function mobileDebugOverlay() {
    try {
        const enabled = /[?&]mobile_debug=1/.test(window.location.search);
        if (!enabled) return;

        const overlay = document.createElement('div');
        overlay.id = 'mobile-debug-overlay';
        overlay.style.position = 'fixed';
        overlay.style.right = '8px';
        overlay.style.top = '8px';
        overlay.style.zIndex = '99999';
        overlay.style.background = 'rgba(0,0,0,0.66)';
        overlay.style.color = '#fff';
        overlay.style.padding = '8px 10px';
        overlay.style.borderRadius = '8px';
        overlay.style.fontSize = '13px';
        overlay.style.fontFamily = 'Inter, sans-serif';
        overlay.style.backdropFilter = 'blur(6px)';
        overlay.style.maxWidth = 'calc(100vw - 16px)';
        overlay.style.boxSizing = 'border-box';

        const info = document.createElement('div');
        info.id = 'mobile-debug-info';
        overlay.appendChild(info);

        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.gap = '8px';
        btnRow.style.marginTop = '6px';

        const btnToggle = document.createElement('button');
        btnToggle.textContent = 'Forzar móvil';
        btnToggle.className = 'btn-ghost';
        btnToggle.style.padding = '6px 8px';
        btnToggle.style.fontSize = '12px';
        btnToggle.addEventListener('click', function () {
            document.body.classList.toggle('force-mobile');
            updateInfo();
        });

        const btnClose = document.createElement('button');
        btnClose.textContent = 'Cerrar';
        btnClose.className = 'btn-ghost';
        btnClose.style.padding = '6px 8px';
        btnClose.style.fontSize = '12px';
        btnClose.addEventListener('click', function () { overlay.remove(); });

        btnRow.appendChild(btnToggle);
        btnRow.appendChild(btnClose);
        overlay.appendChild(btnRow);

        document.body.appendChild(overlay);

        function fmt(n) { return Math.round(n); }
        function updateInfo() {
            const w = window.innerWidth; const h = window.innerHeight; const dpr = window.devicePixelRatio || 1;
            info.innerHTML = `<div>Viewport: ${fmt(w)} x ${fmt(h)} px (dpr ${dpr})</div>` +
                `<div>Body classes: ${Array.from(document.body.classList).join(', ') || '(none)'}</div>`;
        }

        updateInfo();
        window.addEventListener('resize', updateInfo);
    } catch (e) { console.warn('mobileDebugOverlay failed', e); }
})();