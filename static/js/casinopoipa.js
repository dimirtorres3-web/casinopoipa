document.addEventListener('DOMContentLoaded', function () {
    // Development/testing helper: when undefined default to false so real spins deduct balance
    if (typeof window.NO_DEDUCT_ON_SPIN === 'undefined') window.NO_DEDUCT_ON_SPIN = false;
    // Track authoritative known balance and any optimistic pending deductions
    if (typeof window._knownBalance === 'undefined') {
        const raw = (document.getElementById('balance-value')?.textContent || document.querySelector('.balance-value')?.textContent || '0').replace(/[^0-9]/g, '');
        window._knownBalance = Number(raw || 0);
        // store the initial raw string so we can find server-rendered balance nodes that may not have a known selector
        try { window._initialBalanceRaw = String(raw || '0'); } catch (e) { window._initialBalanceRaw = '0'; }
    }
    if (typeof window._pendingSlotDeductions === 'undefined') window._pendingSlotDeductions = 0;

    const floatButton = document.querySelector('.floating-control');
    const sideMenu = document.querySelector('.side-menu');
    if (floatButton && sideMenu) {
        floatButton.addEventListener('click', function () {
            sideMenu.classList.toggle('active');
            sideMenu.style.display = sideMenu.classList.contains('active') ? 'grid' : 'none';
        });
    }

    function fetchPlay(game, apuesta, bonusSpin = false, extra = {}) {
        return fetch('/api/play/', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({ game, apuesta, bonus_spin: bonusSpin, ...extra }),
        }).then((response) => response.json());
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    function getBalanceValue() {
        // Prefer internal known balance if available and no pending deductions
        const domText = (document.getElementById('balance-value')?.textContent || document.querySelector('.balance-value')?.textContent || document.getElementById('corner-balance-value')?.textContent || document.getElementById('header-balance')?.textContent || '0').replace(/[^0-9]/g, '');
        const domVal = Number(domText || 0);
        if (typeof window._knownBalance === 'number') {
            // return authoritative known balance minus any pending optimistic deductions
            return Math.max(0, window._knownBalance - (window._pendingSlotDeductions || 0));
        }
        return domVal;
    }

    function updateBalance(value) {
        const balanceEls = Array.from(document.querySelectorAll('.balance-value'));
        const compactEls = Array.from(document.querySelectorAll('.compact-balance'));
        const cornerEl = document.getElementById('corner-balance-value');
        const formatted = `Gs. ${new Intl.NumberFormat('es-PY').format(value)}`;
        if (balanceEls.length) {
            balanceEls.forEach((el) => {
                el.textContent = formatted;
            });
        }
        if (compactEls.length) {
            compactEls.forEach((el) => {
                el.textContent = formatted;
            });
        }
        const mainBalanceEl = document.getElementById('balance-value');
        const headerBalanceEl = document.getElementById('header-balance');
        if (mainBalanceEl) {
            mainBalanceEl.textContent = formatted;
        }
        if (headerBalanceEl) {
            headerBalanceEl.textContent = formatted;
        }
        if (cornerEl) {
            cornerEl.textContent = formatted;
        }
        // Keep authoritative known balance in sync when explicit updates happen
        try { window._knownBalance = Number(String(value).replace(/[^0-9]/g, '')) || Number(value); } catch (e) { window._knownBalance = Number(value); }

        // Dispatch a custom event other modules can listen to
        try {
            const ev = new CustomEvent('casino:balance-changed', { detail: { balance: Number(window._knownBalance) } });
            window.dispatchEvent(ev);
        } catch (e) {}

        // As a fallback, replace any text nodes that still show the original server-rendered balance (helps panels that lack an id/class)
        try {
            const raw = window._initialBalanceRaw || (String(window._knownBalance) || '0');
            if (raw && raw.length > 0) {
                const formattedText = formatted;
                // limit scan to body children for performance
                const candidates = Array.from(document.querySelectorAll('body *'));
                let checks = 0;
                for (const el of candidates) {
                    // only check elements without child elements (likely text containers)
                    if (el.childElementCount === 0) {
                        const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
                        if (txt && txt.indexOf(raw) >= 0 && checks < 300) {
                            // avoid altering buttons or labels that include the same number by checking for currency marker nearby
                            if (txt.indexOf('Gs.') >= 0 || txt.match(/\d{1,3}(?:[\s\.,]\d{3})+/)) {
                                el.textContent = formattedText;
                            }
                            checks += 1;
                        }
                    }
                    if (checks >= 300) break;
                }
            }
        } catch (e) {}
    }

    function bindGameCardNavigation() {
        document.querySelectorAll('.game-card').forEach((card) => {
            const link = card.querySelector('.game-cover-link');
            if (!link) return;
            card.addEventListener('click', (event) => {
                const target = event.target;
                if (target instanceof HTMLAnchorElement || target.closest('a')) {
                    return;
                }
                window.location.href = link.href;
            });
        });
    }

    bindGameCardNavigation();

    function showInsufficientFunds() {
        if (document.getElementById('insufficient-popup')) return;
        const popup = document.createElement('div');
        popup.id = 'insufficient-popup';
        popup.className = 'insufficient-popup';
        popup.textContent = 'Saldo insuficiente. Por favor, realiza un depósito';
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 2200);
    }

    function openQuickDeposit() {
        window.location.href = '/cajero/?tab=deposito';
    }

    function animateBalanceChange(current, target) {
        let steps = 30;
        const delta = (target - current) / steps;
        let value = current;
        const interval = setInterval(() => {
            value += delta;
            updateBalance(Math.round(value));
            steps -= 1;
            if (steps <= 0 || Math.abs(target - value) < Math.abs(delta)) {
                clearInterval(interval);
                updateBalance(target);
            }
        }, 15);
    }

    function showStatus(message, type = 'default') {
        const status = document.getElementById('game-status') || document.getElementById('slots-status');
        if (!status) return;
        status.textContent = message;
        status.classList.remove('text-emerald-300', 'text-amber-300', 'text-red-300', 'bg-slate-950', 'bg-yellow-500/10', 'bg-green-500/10');
        if (type === 'success') {
            status.classList.add('text-emerald-300');
        } else if (type === 'warning') {
            status.classList.add('text-amber-300');
        } else if (type === 'danger') {
            status.classList.add('text-red-300');
        }
    }

    function showResultEffects(won, jackpot = false) {
        const status = document.getElementById('game-status') || document.getElementById('slots-status');
        if (!status) return;
        status.classList.toggle('win', won);
        status.classList.toggle('lose', !won);
        if (jackpot) {
            status.classList.add('text-yellow-300');
            status.classList.add('font-black');
        }
    }

    function playAudioCue(type = 'spin') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        const context = window.__casinoAudioContext || new AudioCtx();
        window.__casinoAudioContext = context;

        if (context.state === 'suspended') {
            context.resume().catch(() => {});
        }

        const now = context.currentTime;
        const master = context.createGain();
        master.connect(context.destination);
        master.gain.setValueAtTime(0.001, now);
        master.gain.exponentialRampToValueAtTime(0.08, now + 0.01);

        if (type === 'spin') {
            const osc = context.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(520, now + 0.35);
            osc.connect(master);
            osc.start(now);
            osc.stop(now + 0.35);
            master.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        } else if (type === 'win') {
            const osc1 = context.createOscillator();
            const osc2 = context.createOscillator();
            osc1.type = 'sine';
            osc2.type = 'triangle';
            osc1.frequency.setValueAtTime(523.25, now);
            osc2.frequency.setValueAtTime(783.99, now);
            osc1.connect(master);
            osc2.connect(master);
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.35);
            osc2.stop(now + 0.35);
            master.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        } else if (type === 'fail') {
            const osc = context.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.25);
            osc.connect(master);
            osc.start(now);
            osc.stop(now + 0.25);
            master.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        }
    }

    function showCelebration(message) {
        return null;
    }

    let currentSlotBonus = null;
    // Guard to prevent concurrent slot spins being triggered (protects against double-clicks / duplicate requests)
    let slotSpinInProgress = false;
    window.autoSlotRunning = false;
    window.autoSpinTimer = null;
    const slotBonusIndicator = document.getElementById('slots-bonus');

    function updateSlotBonusIndicator(state) {
        if (!slotBonusIndicator) return;
        if (state && state.remaining > 0) {
            slotBonusIndicator.textContent = `GIROS GRATIS: ${state.remaining} restantes`;
            slotBonusIndicator.classList.remove('hidden');
            slotBonusIndicator.classList.add('ring-1', 'ring-amber-400', 'bg-amber-500/15', 'text-amber-200');
        } else {
            slotBonusIndicator.classList.add('hidden');
        }
    }

    function resetSlotBonusSession() {
        currentSlotBonus = null;
        updateSlotBonusIndicator(null);
        if (slotButton) {
            slotButton.textContent = 'Apostar';
        }
    }

    const slotCanvasIds = ['slot-canvas-1', 'slot-canvas-2', 'slot-canvas-3'];
    const slotCanvases = slotCanvasIds.map((id) => document.getElementById(id)).filter(Boolean);
    const tableCanvas = document.getElementById('table-canvas');
    const tableOverlay = document.querySelector('.table-overlay');
    const bingoCanvas = document.getElementById('bingo-canvas');
    const bingoSelectedBallEl = document.getElementById('bingo-selected-ball');
    const bingoCalledNumbersEl = document.getElementById('bingo-called-numbers');
    const slotButton = document.getElementById('slot-bet-button');
    const pokerButton = document.getElementById('poker-bet-button');
    const blackjackButton = document.getElementById('blackjack-bet-button');
    const bingoButton = document.getElementById('bingo-bet-button');
    const ruletaButton = document.getElementById('ruleta-bet-button');
    const ruletaApuestaInput = document.getElementById('ruleta-apuesta');
    const rouletteUndoBtn = document.getElementById('roulette-undo-btn');
    const rouletteDoubleBtn = document.getElementById('roulette-double-btn');
    const quickDepositButtons = document.querySelectorAll('#quick-deposit-btn');
    const rouletteCanvas = document.getElementById('roulette-canvas');
    const rouletteGrid = document.getElementById('roulette-grid');
    const selectedRouletteChoiceEl = document.getElementById('selected-roulette-choice');
    const selectedRouletteListEl = document.getElementById('selected-roulette-list');
    let selectedRouletteChoices = [];
    let slotAnimationFrame = null;
    let slotSpinning = false;
    let tableAnimationFrame = null;
    let bingoAnimationFrame = null;
    let rouletteAnimationFrame = null;
    let rouletteSpinState = {
            angle: 0, // will be set to initialRouletteAngle below after it's calculated
        velocity: 0,
        targetAngle: null,
        highlightNumber: null,
        spinning: false,
        idleEnabled: false,
    };
    const slotSymbols = ['🍒', '🔔', '7', '🍋', '⭐', '🍉'];
    const rouletteNumbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    const rouletteSegmentAngle = (Math.PI * 2) / rouletteNumbers.length;
    const initialRouletteAngle = -Math.PI / 2 - rouletteSegmentAngle / 2;
        // ensure rouletteSpinState picks up the calculated initial angle
        try { if (typeof rouletteSpinState !== 'undefined') rouletteSpinState.angle = initialRouletteAngle; } catch(e) {}
    const rouletteSlotColors = {
        0: 'green',
        1: 'red',
        2: 'black',
        3: 'red',
        4: 'black',
        5: 'red',
        6: 'black',
        7: 'red',
        8: 'black',
        9: 'red',
        10: 'black',
        11: 'black',
        12: 'red',
        13: 'black',
        14: 'red',
        15: 'black',
        16: 'red',
        17: 'black',
        18: 'red',
        19: 'red',
        20: 'black',
        21: 'red',
        22: 'black',
        23: 'red',
        24: 'black',
        25: 'red',
        26: 'black',
        27: 'red',
        28: 'black',
        29: 'black',
        30: 'red',
        31: 'black',
        32: 'red',
        33: 'black',
        34: 'red',
        35: 'black',
        36: 'red',
    };

    function setupCanvas(canvas) {
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return ctx;
    }

    function drawSlotReel(canvas, symbol, blur = false) {
        const ctx = canvas && canvas.getContext('2d');
        if (!ctx) return;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        ctx.clearRect(0, 0, width, height);
        // background panel with subtle vignette
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#16161a');
        bgGrad.addColorStop(1, '#0f0f12');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
        // reel inner card
        ctx.save();
        const pad = 12;
        const innerW = width - pad * 2;
        const innerH = height - pad * 2;
        const x = pad;
        const y = pad;
        const corner = 18;
        // outer frame
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        roundRect(ctx, x, y, innerW, innerH, corner, true, false);
        // glow
        ctx.shadowColor = 'rgba(255,183,77,0.18)';
        ctx.shadowBlur = blur ? 24 : 12;
        ctx.fillStyle = 'rgba(255,183,77,0.03)';
        roundRect(ctx, x + 2, y + 2, innerW - 4, innerH - 4, corner - 4, true, false);
        ctx.shadowBlur = 0;
        // draw symbol badge
        const badgeW = innerW * 0.72;
        const badgeH = innerH * 0.48;
        const bx = x + (innerW - badgeW) / 2;
        const by = y + (innerH - badgeH) / 2;
        // badge background with radial shine
        const rg = ctx.createRadialGradient(bx + badgeW * 0.3, by + badgeH * 0.2, 10, bx + badgeW / 2, by + badgeH / 2, badgeW);
        rg.addColorStop(0, 'rgba(255,255,255,0.08)');
        rg.addColorStop(1, 'rgba(255,255,255,0.00)');
        ctx.fillStyle = rg;
        roundRect(ctx, bx, by, badgeW, badgeH, 14, true, false);
        // drop shadow for symbol
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 18;
        // symbol text
        ctx.font = Math.round(badgeH * 0.7) + 'px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(symbol, bx + badgeW / 2, by + badgeH / 2 + (blur ? 4 : 0));
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    function roundRect(ctx, x, y, w, h, r, fill, stroke) {
        if (typeof r === 'undefined') r = 5;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    function getRouletteStakeTotal() {
        const apuesta = Number(ruletaApuestaInput?.value || 0);
        // Single-stake per spin: the stake is the value entered, independent of number of selections
        return apuesta;
    }

    function updateRouletteBetTotal() {
        const betTotalEl = document.getElementById('bet-total');
        if (!betTotalEl) return;
        const total = getRouletteStakeTotal();
        betTotalEl.textContent = `Apuesta total: Gs. ${new Intl.NumberFormat('es-PY').format(total)}`;
    }

    function updateRouletteSelectionLabel() {
        if (!selectedRouletteChoiceEl) return;
        if (!selectedRouletteChoices.length) {
            selectedRouletteChoiceEl.textContent = 'Ninguna apuesta';
            return;
        }
        // If there's a color-only selection, show the color explicitly
        const colorChoice = selectedRouletteChoices.find((v) => typeof v === 'string');
        if (colorChoice) {
            const displayColor = String(colorChoice).charAt(0).toUpperCase() + String(colorChoice).slice(1);
            selectedRouletteChoiceEl.textContent = `Apuesta por ${displayColor}`;
            return;
        }
        // otherwise show number of selections
        selectedRouletteChoiceEl.textContent = `Apuestas: ${selectedRouletteChoices.length}`;
    }

    function renderSelectedRouletteChips() {
        if (!selectedRouletteListEl) return;
        selectedRouletteListEl.innerHTML = '';
        selectedRouletteChoices.forEach((value) => {
            const chip = document.createElement('span');
                let color = 'black';
                let text = String(value);
                if (typeof value === 'number') {
                    color = rouletteSlotColors[value] || 'black';
                    text = String(value);
                } else if (typeof value === 'string') {
                    // color names expected
                    color = value.replace(/^color:/, '') || value;
                            // for color bets show a colored dot instead of text
                            chip.className = `roulette-selected-chip roulette-selected-chip--${color} roulette-selected-chip--dot`;
                            chip.textContent = '';
                        } else {
                            chip.className = `roulette-selected-chip roulette-selected-chip--${color}`;
                            chip.textContent = text;
                        }
                        selectedRouletteListEl.appendChild(chip);
                    });

            // also update active state of color buttons if present
            document.querySelectorAll('.roulette-color-button').forEach((b) => {
                const c = b.dataset.color;
                const norm = normalizeColorName(c);
                b.classList.toggle('active', selectedRouletteChoices.findIndex((v) => String(v) === String(norm)) >= 0);
            });
        }

    function updateRouletteSelectionState() {
        updateRouletteSelectionLabel();
        updateRouletteBetTotal();
        document.querySelectorAll('.roulette-tile').forEach((tileEl) => {
            const tileValue = Number(tileEl.textContent);
            tileEl.classList.toggle('roulette-tile--selected', selectedRouletteChoices.includes(tileValue));
        });
    }

    function resetRouletteSelections() {
        selectedRouletteChoices = [];
        renderSelectedRouletteChips();
        updateRouletteSelectionState();
    }

    function setRouletteInteractionState(isEnabled) {
        if (ruletaButton) {
            ruletaButton.disabled = !isEnabled;
            ruletaButton.textContent = isEnabled ? 'Apostar' : 'Girando...';
        }
        // also disable the bottom button if present
        const ruletaBottomBtn = document.getElementById('ruleta-bet-button-bottom');
        if (ruletaBottomBtn) {
            ruletaBottomBtn.disabled = !isEnabled;
            ruletaBottomBtn.textContent = isEnabled ? (ruletaBottomBtn.getAttribute('data-label') || 'Girar') : 'Girando...';
        }
        if (ruletaApuestaInput) {
            ruletaApuestaInput.disabled = !isEnabled;
        }
        if (rouletteUndoBtn) {
            rouletteUndoBtn.disabled = !isEnabled;
        }
        if (rouletteDoubleBtn) {
            rouletteDoubleBtn.disabled = !isEnabled;
        }

        // Color buttons: support multiple class names used in different templates
        const colorSelectors = ['.roulette-color-button', '.roulette-color-dot', '.roulette-color'];
        colorSelectors.forEach((sel) => {
            document.querySelectorAll(sel).forEach((btn) => {
                try {
                    btn.disabled = !isEnabled;
                    if (!isEnabled) {
                        btn.setAttribute('aria-disabled', 'true');
                        btn.classList.add('disabled');
                    } else {
                        btn.removeAttribute('aria-disabled');
                        btn.classList.remove('disabled');
                    }
                } catch (e) {
                    // ignore
                }
            });
        });

        // tiles (numbers)
        document.querySelectorAll('.roulette-tile').forEach((tileEl) => {
            try { tileEl.disabled = !isEnabled; } catch (e) {}
        });
    }

    function normalizeColorName(val) {
            if (!val) return val;
            const s = String(val).toLowerCase();
            if (s === 'blue' || s === 'azul') return 'green';
            if (s === 'verde' || s === 'green') return 'green';
            if (s === 'red' || s === 'rojo') return 'red';
            if (s === 'black' || s === 'negro') return 'black';
            return s;
        }

        window.addRouletteChoice = function(value) {
            // Prevent selecting while a spin is active (use the button's disabled state as source of truth)
            try {
                if (ruletaButton && ruletaButton.disabled) {
                    showStatus('Espera a que termine el giro.', 'warning');
                    return;
                }
            } catch (e) {}

            // value can be a number (0-36) or a color string like 'red','black','blue','green'
            // normalize color strings before storing
            if (typeof value === 'string') {
                value = normalizeColorName(value);
            }
            if (selectedRouletteChoices.length >= 3) {
                showStatus('Máximo 3 apuestas en ruleta.');
                return;
            }
            // toggle if already selected
            const exists = selectedRouletteChoices.findIndex((v) => String(v) === String(value));
            if (exists >= 0) {
                selectedRouletteChoices.splice(exists, 1);
                updateRouletteSelectionState();
                return;
            }
            selectedRouletteChoices.push(value);
            updateRouletteSelectionState();
            };

    function removeLastRouletteSelection() {
        if (!selectedRouletteChoices.length) {
            showStatus('No hay apuestas para deshacer.');
            return;
        }
        selectedRouletteChoices.pop();
        updateRouletteSelectionState();
    }

    function doubleLastRouletteSelection() {
        if (!selectedRouletteChoices.length) {
            showStatus('Selecciona un número antes de duplicar.');
            return;
        }
        if (selectedRouletteChoices.length >= 3) {
            showStatus('Máximo 3 apuestas en ruleta.');
            return;
        }
        selectedRouletteChoices.push(selectedRouletteChoices[selectedRouletteChoices.length - 1]);
        updateRouletteSelectionState();
    }

    function renderRouletteGrid() {
        if (!rouletteGrid) return;
        rouletteGrid.innerHTML = '';
        const numbers = Array.from({ length: 37 }, (_, idx) => idx);
        numbers.forEach((number) => {
            const color = rouletteSlotColors[number] || 'black';
            const tile = document.createElement('button');
            tile.type = 'button';
            tile.className = `roulette-tile roulette-tile--${color}`;
            tile.textContent = number;
            tile.addEventListener('click', () => {
                        addRouletteChoice(number);
            });
            rouletteGrid.appendChild(tile);
        });
    }

    function normalizeRouletteAngle(angle) {
        const full = Math.PI * 2;
        angle = angle % full;
        if (angle < 0) angle += full;
        return angle;
    }

    function getRouletteAngleDelta(target, current) {
        const full = Math.PI * 2;
        let delta = normalizeRouletteAngle(target - current);
        if (delta > Math.PI) delta -= full;
        return delta;
    }

    function drawRouletteWheel(angle, highlightNumber = null) {
        const canvas = rouletteCanvas;
        const ctx = canvas && canvas.getContext('2d');
        if (!ctx) return;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        ctx.clearRect(0, 0, width, height);
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 16;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);

        const segmentCount = rouletteNumbers.length;
        const segmentAngle = (Math.PI * 2) / segmentCount;

        rouletteNumbers.forEach((number, index) => {
            const start = index * segmentAngle;
            const end = start + segmentAngle;
            const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(number);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, start, end);
            ctx.closePath();
            ctx.fillStyle = number === 0 ? '#0d3b5b' : isRed ? '#c0392b' : '#111214';
            ctx.fill();
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.save();
            const textAngle = start + segmentAngle / 2;
            ctx.rotate(textAngle);
            ctx.translate(radius - 28, 0);
            ctx.rotate(Math.PI / 2);
            ctx.fillStyle = '#f7f7f9';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(number.toString(), 0, 0);
            ctx.restore();
        });

        ctx.restore();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 44, 0, Math.PI * 2);
        ctx.fillStyle = '#0f0f12';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius - 2);
        ctx.lineTo(centerX - 14, centerY - radius + 24);
        ctx.lineTo(centerX + 14, centerY - radius + 24);
        ctx.closePath();
        ctx.fillStyle = '#f3f3f3';
        ctx.fill();

        if (highlightNumber !== null) {
            ctx.fillStyle = 'rgba(255, 210, 160, 0.12)';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius - 34, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function getRandomSlotSymbol() {
        return slotSymbols[Math.floor(Math.random() * slotSymbols.length)];
    }

    function startSlotSpin() {
        if (!slotCanvases.length) return;
        slotSpinning = true;
        const duration = 1400; // ms
        const start = performance.now();
        slotCanvases.forEach((canvas) => canvas.classList.add('blur'));

        function spin(now) {
            if (!slotSpinning) return;
            const t = Math.min(1, (now - start) / duration);
            // ease out
            const eased = 1 - Math.pow(1 - t, 3);
            slotCanvases.forEach((canvas) => {
                // while spinning, use random symbols and a motion blur effect
                drawSlotReel(canvas, getRandomSlotSymbol(), true);
            });
            if (t < 1) {
                slotAnimationFrame = requestAnimationFrame(spin);
            } else {
                // leave spinning state until stopped by stopSlotSpin
                slotAnimationFrame = null;
            }
        }
        slotAnimationFrame = requestAnimationFrame(spin);
    }

    function stopSlotSpin(symbols) {
        slotSpinning = false;
        if (slotAnimationFrame) {
            cancelAnimationFrame(slotAnimationFrame);
            slotAnimationFrame = null;
        }
        slotCanvases.forEach((canvas, index) => {
            canvas.classList.remove('blur');
            drawSlotReel(canvas, symbols[index], false);
        });
    }
    // no global exposure of fallback spin functions here (restore original state)

    function startRouletteSpin() {
        if (!rouletteCanvas) return;
        if (rouletteAnimationFrame) {
            cancelAnimationFrame(rouletteAnimationFrame);
            rouletteAnimationFrame = null;
        }
        rouletteSpinState.spinning = true;
        rouletteSpinState.idleEnabled = false;
        rouletteSpinState.velocity = 0.22;
        rouletteSpinState.targetAngle = null;
        rouletteSpinState.angle = normalizeRouletteAngle(rouletteSpinState.angle);
        rouletteCanvas.classList.add('blur');

        function rotate() {
            if (!rouletteSpinState.spinning) return;
            rouletteSpinState.angle += rouletteSpinState.velocity;
            rouletteSpinState.velocity *= 0.994;

                if (rouletteSpinState.targetAngle !== null) {
                const delta = getRouletteAngleDelta(rouletteSpinState.targetAngle, rouletteSpinState.angle);
                const speed = Math.max(0.005, Math.abs(delta) * 0.018);
                rouletteSpinState.velocity = Math.sign(delta) * speed;
                if (Math.abs(delta) < 0.025 && Math.abs(rouletteSpinState.velocity) < 0.012) {
                    rouletteSpinState.spinning = false;
                    rouletteCanvas.classList.remove('blur');
                    drawRouletteWheel(rouletteSpinState.targetAngle, rouletteSpinState.highlightNumber);
                    // Re-enable interactions immediately when the wheel comes to rest visually
                    try { setRouletteInteractionState(true); } catch (e) { console.warn('setRouletteInteractionState not available', e); }
                    return;
                }
            }

            drawRouletteWheel(rouletteSpinState.angle);
            rouletteAnimationFrame = requestAnimationFrame(rotate);
        }
        rotate();
    }

    // idle subtle rotation for roulette wheel when not actively spinning
    (function setupRouletteIdle() {
        let last = performance.now();
        function idle(now) {
            const dt = now - last;
            last = now;
            if (!rouletteSpinState.spinning && rouletteCanvas && rouletteSpinState.idleEnabled) {
                rouletteSpinState.angle += (dt / 1000) * 0.06; // slow rotation
                drawRouletteWheel(rouletteSpinState.angle);
            }
            requestAnimationFrame(idle);
        }
        requestAnimationFrame(idle);
    })();

    function stopRouletteSpin(result) {
        if (!rouletteCanvas) return;
        const index = rouletteNumbers.indexOf(Number(result.roulette.number));
        if (index < 0) {
            rouletteSpinState.spinning = false;
            rouletteCanvas.classList.remove('blur');
            return;
        }
        const target = -Math.PI / 2 - index * rouletteSegmentAngle - rouletteSegmentAngle / 2;
        rouletteSpinState.targetAngle = target;
        rouletteSpinState.highlightNumber = Number(result.roulette.number);
        rouletteSpinState.idleEnabled = false;
    }

    function handleSlotResult(result, balanceOverride = null) {
        if (!result) return;

        if (slotCanvases.length) {
            stopSlotSpin(result.reels);
        }

        if (result.bonus_final) {
            currentSlotBonus = null;
            updateSlotBonusIndicator(null);
            setAllSlotButtonsText('Apostar');
            showStatus(result.message, result.jackpot_hit ? 'success' : 'warning');
            showResultEffects(result.win, result.jackpot_hit);
            if (result.win) {
                playAudioCue('win');
                showCelebration(result.jackpot_hit ? '¡JACKPOT!' : '¡Ganaste!');
            } else {
                playAudioCue('fail');
            }
        } else if (result.bonus_active) {
            currentSlotBonus = {
                remaining: result.bonus_spins,
                total_spins: result.total_spins || 0,
                wager: result.bonus_wager || Number(document.getElementById('slot-apuesta').value || 0),
            };
            updateSlotBonusIndicator(currentSlotBonus);
            setAllSlotButtonsText('Giro Gratis');
            showStatus('', 'warning');
            showResultEffects(true);
            playAudioCue('spin');
        } else {
            currentSlotBonus = null;
            updateSlotBonusIndicator(null);
            setAllSlotButtonsText('Apostar');
            showStatus('', result.win ? 'success' : 'danger');
            showResultEffects(result.win, result.jackpot_hit);
            if (result.win) {
                playAudioCue('win');
                showCelebration(result.jackpot_hit ? '¡JACKPOT!' : '¡Ganaste!');
            } else {
                playAudioCue('fail');
            }
        }

        if (balanceOverride !== null && typeof balanceOverride !== 'undefined') {
            const displayed = getBalanceValue();
            const target = Number(balanceOverride);
            // clear pending deductions because server authoritative result arrived
            window._pendingSlotDeductions = 0;
            if (displayed !== target) animateBalanceChange(displayed, target);
            else updateBalance(target);
        } else if (typeof result.new_balance !== 'undefined') {
            const displayed = getBalanceValue();
            const target = Number(result.new_balance);
            window._pendingSlotDeductions = 0;
            if (displayed !== target) animateBalanceChange(displayed, target);
            else updateBalance(target);
        }

        const status = document.getElementById('slots-status');
        if (status) {
            status.textContent = '';
        }

        // Restore slot interaction state after result processed
        try {
            // Remove one pending deduction (the spin that just finished)
            if (typeof window._pendingSlotDeductions !== 'undefined') {
                const apuestaInput = document.getElementById('slot-apuesta');
                const lastWager = (currentSlotBonus && currentSlotBonus.remaining > 0) ? currentSlotBonus.wager : Number(apuestaInput?.value || 0);
                window._pendingSlotDeductions = Math.max(0, window._pendingSlotDeductions - lastWager);
            }

            unlockSlotAfterResult();
            scheduleAutoSlotSpin();
        } catch (e) {
            console.warn('Failed to fully restore slot controls state', e);
        }
    }

    function finalizeSlotSpin(result, currentBalance, projectedBalance, isBonusSpin) {
        const finalBalance = typeof result.new_balance !== 'undefined'
            ? Number(result.new_balance)
            : (!isBonusSpin ? projectedBalance : currentBalance);

        window.setTimeout(() => {
            handleSlotResult(result, finalBalance);
            window.setTimeout(() => {
                unlockSlotAfterResult();
            }, 200);
        }, 800);
    }

    function createCardElement(cardValue) {
        const card = document.createElement('div');
        card.className = 'card';

        const inner = document.createElement('div');
        inner.className = 'card__inner';

        const front = document.createElement('div');
        front.className = 'card__face card__face--front';
        front.textContent = cardValue;

        const back = document.createElement('div');
        back.className = 'card__face card__face--back';
        back.textContent = '🂠';

        inner.appendChild(front);
        inner.appendChild(back);
        card.appendChild(inner);

        requestAnimationFrame(() => {
            card.classList.add('flip');
        });
        return card;
    }

    function handleCardResult(result, gameType) {
        const dealer = document.getElementById('dealer-cards');
        const player = document.getElementById('player-cards');
        if (!dealer || !player) return;
        dealer.innerHTML = '';
        player.innerHTML = '';

        result.dealer_cards.forEach((cardValue) => {
            dealer.appendChild(createCardElement(cardValue));
        });
        result.player_cards.forEach((cardValue) => {
            player.appendChild(createCardElement(cardValue));
        });
        showStatus(result.message);
        showResultEffects(result.win);
        updateBalance(result.new_balance);
    }

    function handleRouletteResult(result) {
        stopRouletteSpin(result);
        const selectedNumbers = Array.isArray(result.selected_numbers)
            ? result.selected_numbers.join(', ')
            : result.selected_number || 'sin selección';

        // compute win amount for UI messaging if possible
        const projected = typeof window._lastProjectedBalance !== 'undefined' ? Number(window._lastProjectedBalance) : null;
        const newBal = typeof result.new_balance !== 'undefined' ? Number(result.new_balance) : null;
        let winAmount = null;
        if (projected !== null && newBal !== null) {
            winAmount = Math.max(0, newBal - projected);
        }

        // Debug: compute landed color/number and payout for visibility
        let landedNum = null;
        let landedColor = null;
        let computedPayout = null;
        try {
            landedNum = result && result.roulette && typeof result.roulette.number !== 'undefined' ? Number(result.roulette.number) : null;
            if (landedNum !== null && typeof rouletteSlotColors[landedNum] !== 'undefined') {
                landedColor = normalizeColorName(rouletteSlotColors[landedNum]);
            }

            // compute payout same as earlier logic (in case server didn't supply)
            let payout = 0;
            selectedRouletteChoices.forEach((choice) => {
                if (typeof choice === 'string' && landedColor) {
                    const normalizedChoice = normalizeColorName(choice);
                    const mult = (normalizedChoice === 'green') ? 35 : 2;
                    if (normalizedChoice === landedColor) {
                        payout += (Number(ruletaApuestaInput?.value || 0) || 0) * mult;
                    }
                } else if (typeof choice === 'number' && landedNum !== null) {
                    if (Number(choice) === landedNum) {
                        payout += (Number(ruletaApuestaInput?.value || 0) || 0) * 36;
                    }
                }
            });
            computedPayout = payout;
        } catch (e) {
            console.warn('debug payout compute failed', e);
        }

        // show debug panel so you can see landed color, choices and computed payout
        const debugPanel = document.getElementById('roulette-debug');
        if (debugPanel) {
            const landedEl = document.getElementById('roulette-debug-landed');
            const choicesEl = document.getElementById('roulette-debug-choices');
            const payoutEl = document.getElementById('roulette-debug-payout');
            landedEl.textContent = landedNum !== null ? `Cayó: ${landedNum} (${landedColor || 'color desconocido'})` : 'Cayó: -';
            choicesEl.textContent = `Tus selecciones: ${selectedRouletteChoices.length ? selectedRouletteChoices.join(', ') : 'Ninguna'}`;
            payoutEl.textContent = `Pago calculado: ${computedPayout ? 'Gs. ' + new Intl.NumberFormat('es-PY').format(computedPayout) : 'Gs. 0'}`;
            debugPanel.style.display = 'block';
        }

        let outcomeText;
        if (result.win) {
            outcomeText = `Cae ${result.roulette.number}. Apostaste ${selectedNumbers} y ganaste` + (winAmount ? ` Gs. ${new Intl.NumberFormat('es-PY').format(winAmount)}` : '.') ;
        } else {
            outcomeText = `Pierde. Cae ${result.roulette.number}. Apostaste ${selectedNumbers}.`;
        }

        showStatus(outcomeText, result.win ? 'success' : 'danger');
        showResultEffects(result.win);
        if (result.win) {
            playAudioCue('win');
            showCelebration('¡Apuesta ganadora!');
        } else {
            playAudioCue('fail');
            showCelebration('¡Sigue intentando!');
        }
        if (newBal !== null) updateBalance(newBal);
        setTimeout(() => {
            resetRouletteSelections();
            setRouletteInteractionState(true);
        }, 600);
    }

    function handleBingoResult(result) {
        const cardContainer = document.getElementById('bingo-card');
        if (!cardContainer) return;
        cardContainer.innerHTML = result.bingo_cards
            .flat()
            .map((num) => `<div class="bingo-cell">${num}</div>`)
            .join('');
        showStatus(result.message);
        showResultEffects(result.win);
        updateBalance(result.new_balance);
    }

    quickDepositButtons.forEach((button) => {
        button.addEventListener('click', openQuickDeposit);
    });

    function clearSlotSpinLock() {
        unlockSlotAfterResult();
    }

    function bindSlotSpinButtons() {
        const buttons = Array.from(document.querySelectorAll('#slot-bet-button, .btn-action-spin'));
        buttons.forEach((button) => {
            if (button.dataset.slotBound === '1') return;
            button.addEventListener('click', function (event) {
                event.preventDefault();
                if (typeof window.slotButtonHandler === 'function') {
                    window.slotButtonHandler(event);
                } else {
                    slotButtonHandler(event);
                }
            });
            button.dataset.slotBound = '1';
        });
    }

    function scheduleAutoSlotSpin() {
        if (!window.autoSlotRunning) return;

        const apuestaInput = document.getElementById('slot-apuesta');
        const nextWager = Number(apuestaInput?.value || 0);
        const nextBalance = getBalanceValue();

        if (nextBalance <= 0 || nextBalance < nextWager || nextWager < 500) {
            window.autoSlotRunning = false;
            const autoBtn = document.getElementById('slot-auto-btn');
            if (autoBtn) {
                autoBtn.classList.remove('is-active');
                autoBtn.setAttribute('aria-pressed', 'false');
            }
            showStatus('Auto detenido: saldo insuficiente.', 'warning');
            return;
        }

        if (window.autoSpinTimer) {
            clearTimeout(window.autoSpinTimer);
        }
        window.autoSpinTimer = window.setTimeout(() => {
            if (window.autoSlotRunning && !window.slotSpinInProgress && !slotSpinInProgress) {
                const spinButton = document.getElementById('slot-bet-button');
                if (spinButton) {
                    spinButton.click();
                }
            }
        }, 250);
    }

    function bindAutoSlotButton() {
        const autoBtn = document.getElementById('slot-auto-btn');
        if (!autoBtn || autoBtn.dataset.autoBound === '1') return;

        autoBtn.addEventListener('click', function () {
            if (!autoBtn) return;
            window.autoSlotRunning = !window.autoSlotRunning;
            autoBtn.classList.toggle('is-active', window.autoSlotRunning);
            autoBtn.setAttribute('aria-pressed', window.autoSlotRunning ? 'true' : 'false');

            if (window.autoSlotRunning) {
                const apuestaInput = document.getElementById('slot-apuesta');
                const wager = Number(apuestaInput?.value || 0);
                const currentBalance = getBalanceValue();
                if (wager < 500) {
                    window.autoSlotRunning = false;
                    autoBtn.classList.remove('is-active');
                    autoBtn.setAttribute('aria-pressed', 'false');
                    showStatus('La apuesta mínima para Auto es de 500 Gs.', 'warning');
                    return;
                }
                if (currentBalance < wager) {
                    window.autoSlotRunning = false;
                    autoBtn.classList.remove('is-active');
                    autoBtn.setAttribute('aria-pressed', 'false');
                    showInsufficientFunds();
                    return;
                }
                showStatus('Auto activado', 'warning');
                scheduleAutoSlotSpin();
            } else {
                if (window.autoSpinTimer) {
                    clearTimeout(window.autoSpinTimer);
                    window.autoSpinTimer = null;
                }
                showStatus('Auto detenido', 'default');
            }
        });

        autoBtn.dataset.autoBound = '1';
    }

    function unlockSlotAfterResult() {
        window.slotSpinInProgress = false;
        slotSpinInProgress = false;
        setAllSlotButtonsDisabled(false);
        const apuestaInput = document.getElementById('slot-apuesta');
        if (apuestaInput) apuestaInput.disabled = false;
        document.querySelectorAll('#slot-bet-button, .btn-action-spin').forEach((button) => {
            button.disabled = false;
            button.removeAttribute('aria-disabled');
        });
    }

    bindSlotSpinButtons();
    bindAutoSlotButton();

    try {
        const observer = new MutationObserver(function () {
            bindSlotSpinButtons();
            bindAutoSlotButton();
        });
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch (e) {
        console.warn('slot mutation observer failed', e);
    }

    function slotButtonHandler(ev) {
        const btnEl = ev && (ev.currentTarget || ev.target);
        ev && ev.preventDefault && ev.preventDefault();

        try { window.slotButtonHandler = slotButtonHandler; } catch (e) { }

        // debounce accidental duplicate events (protects against duplicate bindings or rapid double events)
        const now = Date.now();
        if (!window._lastSlotClick) window._lastSlotClick = 0;
        if (now - window._lastSlotClick < 300) {
            // ignore near-duplicate event
            return;
        }
        window._lastSlotClick = now;

        const apuestaInput = document.getElementById('slot-apuesta');
        const storedWager = currentSlotBonus && currentSlotBonus.remaining > 0 ? currentSlotBonus.wager : Number(apuestaInput?.value || 0);
        const isBonusSpin = currentSlotBonus && currentSlotBonus.remaining > 0;

        if (!isBonusSpin && storedWager < 500) {
            showStatus('La apuesta mínima es de 500 Gs.', 'warning');
            return;
        }

        const betTotalEl = document.getElementById('bet-total');
        if (betTotalEl) betTotalEl.textContent = `Apuesta: Gs. ${new Intl.NumberFormat('es-PY').format(storedWager)}`;

        // Use authoritative available balance (known - pending) to check funds so we don't double-deduct
        const availableBalance = (typeof window._knownBalance === 'number' ? window._knownBalance : getBalanceValue()) - (window._pendingSlotDeductions || 0);
        if (storedWager > availableBalance && !isBonusSpin) {
            showInsufficientFunds();
            return;
        }

        if (!isBonusSpin) {
            if (typeof window._pendingSlotDeductions === 'undefined') window._pendingSlotDeductions = 0;
            window._pendingSlotDeductions += storedWager;
            // display authoritative known minus pending
            const displayValue = Math.max(0, (typeof window._knownBalance === 'number' ? window._knownBalance : getBalanceValue()) - window._pendingSlotDeductions);
            updateBalance(displayValue);
        }

        // mark a logical spin-in-progress but do not visually disable controls
        window.slotSpinInProgress = true;
        slotSpinInProgress = true;

        showStatus(isBonusSpin ? 'Ejecutando giro gratis...' : 'GIRANDO...', 'success');
        const status = document.getElementById('slots-status');
        if (status) {
            status.textContent = isBonusSpin ? 'Giro gratis en curso' : 'Giro en curso';
        }

        const activeVisualSpin = typeof window.currentSlotSpinTrigger === 'function'
            ? window.currentSlotSpinTrigger
            : (typeof window.fiveStarSpinVisual === 'function'
                ? window.fiveStarSpinVisual
                : (typeof window.jokerSpinVisual === 'function'
                    ? window.jokerSpinVisual
                    : (typeof window.bettySpinVisual === 'function'
                        ? window.bettySpinVisual
                        : null)));
        if (activeVisualSpin) {
            try { activeVisualSpin(); } catch (e) { }
        } else if (slotCanvases.length) {
            slotCanvases.forEach(setupCanvas);
            startSlotSpin();
        }

        playAudioCue('spin');

        fetchPlay('tragamonedas', storedWager, isBonusSpin).then((result) => {
            if (!result.success) {
                if (!window.NO_DEDUCT_ON_SPIN) updateBalance(currentBalance);
                showStatus(result.error || 'No se pudo ejecutar la jugada.', 'danger');
                clearSlotSpinLock();
                if (slotCanvases.length) {
                    slotCanvases.forEach((canvas) => canvas.classList.remove('blur'));
                }
                return;
            }

            const backendReels = Array.isArray(result.reels) ? result.reels : [];
            const nested = [[], [], []];
            for (let i = 0; i < 3; i++) {
                const center = backendReels[i] || slotSymbols[i % slotSymbols.length] || '⭐';
                const top = slotSymbols[(i * 2 + 1) % slotSymbols.length] || center;
                const bottom = slotSymbols[(i * 3 + 2) % slotSymbols.length] || center;
                nested[i] = [top, center, bottom];
            }

            const activeVisualStop = typeof window.fiveStarStopVisual === 'function'
                ? window.fiveStarStopVisual
                : (typeof window.jokerStopVisual === 'function'
                    ? window.jokerStopVisual
                    : (typeof window.bettyStopVisual === 'function'
                        ? window.bettyStopVisual
                        : null));
            if (activeVisualStop) {
                try { activeVisualStop(nested); } catch (e) { }
            } else if (slotCanvases.length) {
                stopSlotSpin(backendReels);
            }

            finalizeSlotSpin(result, currentBalance, projectedBalance, isBonusSpin);
        }).catch((err) => {
            console.error('Play request failed', err);
            if (!window.NO_DEDUCT_ON_SPIN) updateBalance(currentBalance);
            showStatus('Error de red al ejecutar la jugada.', 'danger');
            clearSlotSpinLock();
            if (slotCanvases.length) {
                slotCanvases.forEach((canvas) => canvas.classList.remove('blur'));
            }
        });
    }

    try { window.slotButtonHandler = slotButtonHandler; } catch (e) { }

    if (pokerButton) {
        pokerButton.addEventListener('click', function () {
            const apuesta = Number(document.getElementById('poker-apuesta').value || 0);
            showStatus('Repartiendo cartas...');
            fetchPlay('poker', apuesta).then((result) => {
                if (!result.success) {
                    showStatus(result.error);
                    return;
                }
                setTimeout(() => handleCardResult(result, 'poker'), 1200);
            });
        });
    }

    if (blackjackButton) {
        blackjackButton.addEventListener('click', function () {
            const apuesta = Number(document.getElementById('blackjack-apuesta').value || 0);
            showStatus('Repartiendo cartas...');
            fetchPlay('blackjack', apuesta).then((result) => {
                if (!result.success) {
                    showStatus(result.error);
                    return;
                }
                setTimeout(() => handleCardResult(result, 'blackjack'), 1200);
            });
        });
    }

    if (bingoButton) {
        bingoButton.addEventListener('click', function () {
            const apuesta = Number(document.getElementById('bingo-apuesta').value || 0);
            showStatus('Generando cartilla...');
            fetchPlay('bingo', apuesta).then((result) => {
                if (!result.success) {
                    showStatus(result.error);
                    return;
                }
                setTimeout(() => handleBingoResult(result), 800);
            });
        });
    }

    function performRouletteBet() { console.debug('[roulette] performRouletteBet triggered');
            const apuesta = Number(ruletaApuestaInput?.value || 0);
            const currentBalance = getBalanceValue();
            // Only deduct the single stake value per spin (user choice): do not multiply by number of selections
            const totalStake = apuesta;
            if (!selectedRouletteChoices.length) {
                showStatus('Selecciona al menos un número o color antes de apostar.');
                return;
            }
            if (totalStake > currentBalance) {
                showInsufficientFunds();
                return;
            }

            // Deduct stake immediately (optimistic UI) and restore on error
            const originalBalance = currentBalance;
            const projectedBalance = Math.max(0, currentBalance - totalStake);
            // store for result display
            window._lastProjectedBalance = projectedBalance;
            updateBalance(projectedBalance);

            setRouletteInteractionState(false);
            showStatus('Girando la ruleta...');
            if (rouletteCanvas) {
                setupCanvas(rouletteCanvas);
                startRouletteSpin();
            }
            // prepare payload: separate numbers and colors
            const selectedNumbers = selectedRouletteChoices.filter(v => typeof v === 'number');
            const selectedColors = selectedRouletteChoices.filter(v => typeof v === 'string');
            const extraPayload = {};
            if (selectedNumbers.length) extraPayload.selected_numbers = selectedNumbers;
            if (selectedColors.length) extraPayload.selected_colors = selectedColors;

            fetchPlay('ruleta', apuesta, false, extraPayload).then((result) => {
                if (!result.success) {
                    // restore balance on failure
                    updateBalance(originalBalance);
                    showStatus(result.error);
                    if (rouletteCanvas) rouletteCanvas.classList.remove('blur');
                    setRouletteInteractionState(true);
                    return;
                }

                // Compute payouts locally based on the landed number/color so color bets are always honored client-side
                try {
                    const landedNum = result && result.roulette && typeof result.roulette.number !== 'undefined' ? Number(result.roulette.number) : null;
                    let landedColor = (landedNum !== null && typeof rouletteSlotColors[landedNum] !== 'undefined') ? rouletteSlotColors[landedNum] : null;
                    landedColor = normalizeColorName(landedColor);
                    let payout = 0;
                    selectedRouletteChoices.forEach((choice) => {
                        if (typeof choice === 'string' && landedColor) {
                            const normalizedChoice = normalizeColorName(choice);
                            // color bet payout: Rojo/Negro = 2x, Verde (azul UI) = 35x
                            const mult = (normalizedChoice === 'green') ? 35 : 2;
                            if (normalizedChoice === landedColor) {
                                payout += apuesta * mult;
                            }
                        } else if (typeof choice === 'number' && landedNum !== null) {
                            // number bet fallback: 36x
                            if (Number(choice) === landedNum) {
                                payout += apuesta * 36;
                            }
                        }
                    });

                    if (payout > 0) {
                        result.win = true; // mark win
                        result.local_payout = payout;
                        // prefer server new_balance if it's sensible, otherwise set to projected + payout
                        if (typeof result.new_balance === 'undefined' || Number(result.new_balance) <= projectedBalance) {
                            result.new_balance = projectedBalance + payout;
                        }
                    } else {
                        if (typeof result.new_balance === 'undefined') result.new_balance = projectedBalance;
                    }
                } catch (e) {
                    if (typeof result.new_balance === 'undefined') result.new_balance = projectedBalance;
                }

                setTimeout(() => handleRouletteResult(result), 1400);
            }).catch(() => {
                // network error: restore balance and UI
                updateBalance(originalBalance);
                if (rouletteCanvas) rouletteCanvas.classList.remove('blur');
                setRouletteInteractionState(true);
                showStatus('Error de red al ejecutar la jugada.', 'danger');
            });
        }

        // attach to existing main button if present
        if (ruletaButton) {
            ruletaButton.addEventListener('click', performRouletteBet);
        }
        // attach to bottom button (always present in the new layout)
        const ruletaBottomBtn = document.getElementById('ruleta-bet-button-bottom');
        if (ruletaBottomBtn) {
            ruletaBottomBtn.addEventListener('click', performRouletteBet);
        }
        // also allow event-driven trigger
        document.addEventListener('ruleta-bottom-spin', performRouletteBet);

        // bind double and undo UI controls if present
        if (typeof rouletteDoubleBtn !== 'undefined' && rouletteDoubleBtn) {
            rouletteDoubleBtn.addEventListener('click', function () {
                const input = document.getElementById('ruleta-apuesta');
                if (!input) return;
                const current = Number(input.value || 0);
                input.value = String(current * 2);
                updateRouletteBetTotal();
            });
        }
        if (typeof rouletteUndoBtn !== 'undefined' && rouletteUndoBtn) {
            rouletteUndoBtn.addEventListener('click', function () {
                removeLastRouletteSelection();
            });
        }
    

    if (rouletteGrid) {
        renderRouletteGrid();
    }

        // bind color choice buttons under roulette
        const rouletteColorContainer = document.querySelector('.roulette-color-choices');
        if (rouletteColorContainer) {
            rouletteColorContainer.querySelectorAll('button[data-color]').forEach((btn) => {
                btn.addEventListener('click', function () {
                    const color = this.dataset.color;
                    // If data-optional present and not supported, ignore (UI-only)
                    if (this.dataset.optional === 'true') {
                        // optionally hide behavior can be added server-side; for now allow toggle
                    }
                    addRouletteChoice(color);
                });
            });
    }

        if (rouletteUndoBtn) {
            rouletteUndoBtn.addEventListener('click', removeLastRouletteSelection);
        }
        if (rouletteDoubleBtn) {
            rouletteDoubleBtn.addEventListener('click', doubleLastRouletteSelection);
        }
        if (ruletaApuestaInput) {
            ruletaApuestaInput.addEventListener('input', updateRouletteBetTotal);
        }

        if (rouletteCanvas) {
            setupCanvas(rouletteCanvas);
            drawRouletteWheel(rouletteSpinState.angle);
        }
        updateRouletteSelectionState();
        setRouletteInteractionState(true);

        window.addEventListener('resize', function () {
            slotCanvases.forEach((canvas) => setupCanvas(canvas));
            if (rouletteCanvas) setupCanvas(rouletteCanvas);
        });

        // Fallback event-delegation: ensure any visible spin button triggers the same handler
        try {
            document.addEventListener('click', function(e){
                const t = e.target;
                if (!t) return;
                try {
                    if (t.id === 'slot-bet-button' || t.classList && t.classList.contains('btn-action-spin')) {
                        slotButtonHandler(e);
                    }
                } catch (err) { /* ignore */ }
            });
        } catch (err) { console.warn('failed to attach delegated slot click', err); }

});
