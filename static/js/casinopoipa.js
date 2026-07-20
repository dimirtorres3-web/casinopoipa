document.addEventListener('DOMContentLoaded', function () {
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

    function updateBalance(value) {
        const balanceEl = document.getElementById('balance-value');
        const cornerEl = document.getElementById('corner-balance-value');
        const formatted = `Gs. ${new Intl.NumberFormat('es-PY').format(value)}`;
        if (balanceEl) {
            balanceEl.textContent = formatted;
        }
        if (cornerEl) {
            cornerEl.textContent = formatted;
        }
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
        if (typeof window.Howl === 'undefined') return;
        const cues = {
            spin: ['https://actions.google.com/sounds/api/alarms/ogg'],
            win: ['https://actions.google.com/sounds/api/sounds/celebration/ogg'],
            fail: ['https://actions.google.com/sounds/api/sounds/negative/ogg'],
        };
        const path = cues[type] && cues[type][0];
        if (!path) return;
        const sound = new window.Howl({ src: [path] });
        sound.play();
    }

    function showCelebration(message) {
        if (document.querySelector('.celebration-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'celebration-overlay';
        overlay.innerHTML = `<div class="celebration-overlay__box">${message}</div>`;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 900);
    }

    let currentSlotBonus = null;
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
        angle: 0,
        velocity: 0,
        targetAngle: null,
        highlightNumber: null,
        spinning: false,
    };
    const slotSymbols = ['🍒', '🔔', '7', '🍋', '⭐', '🍉'];
    const rouletteNumbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
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

    function renderSelectedRouletteChips() {
        if (!selectedRouletteListEl) return;
        selectedRouletteListEl.innerHTML = '';
        selectedRouletteChoices.forEach((value) => {
            const chip = document.createElement('span');
            const color = rouletteSlotColors[value] || 'black';
            chip.className = `roulette-selected-chip roulette-selected-chip--${color}`;
            chip.textContent = value;
            selectedRouletteListEl.appendChild(chip);
        });
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
                const index = selectedRouletteChoices.indexOf(number);
                if (index >= 0) {
                    selectedRouletteChoices.splice(index, 1);
                } else if (selectedRouletteChoices.length < 3) {
                    selectedRouletteChoices.push(number);
                } else {
                    showStatus('Máximo 3 números seleccionados.');
                    return;
                }

                if (selectedRouletteChoiceEl) {
                    selectedRouletteChoiceEl.textContent = selectedRouletteChoices.length
                        ? 'Seleccionado:'
                        : 'Ninguno';
                }
                renderSelectedRouletteChips();

                document.querySelectorAll('.roulette-tile').forEach((tileEl) => {
                    const tileValue = Number(tileEl.textContent);
                    tileEl.classList.toggle('roulette-tile--selected', selectedRouletteChoices.includes(tileValue));
                });
            });
            rouletteGrid.appendChild(tile);
        });
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

    function startRouletteSpin() {
        if (!rouletteCanvas) return;
        rouletteSpinState.spinning = true;
        rouletteSpinState.velocity = 0.28;
        rouletteSpinState.targetAngle = null;
        rouletteCanvas.classList.add('blur');

        function rotate() {
            if (!rouletteSpinState.spinning) return;
            rouletteSpinState.angle += rouletteSpinState.velocity;
            rouletteSpinState.velocity *= 0.996;

            if (rouletteSpinState.targetAngle !== null) {
                const delta = (rouletteSpinState.targetAngle - rouletteSpinState.angle) % (Math.PI * 2);
                rouletteSpinState.velocity = Math.max(0.01, Math.abs(delta) * 0.02);
                if (Math.abs(delta) < 0.03 && rouletteSpinState.velocity < 0.02) {
                    rouletteSpinState.spinning = false;
                    rouletteCanvas.classList.remove('blur');
                    drawRouletteWheel(rouletteSpinState.targetAngle, rouletteSpinState.highlightNumber);
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
            if (!rouletteSpinState.spinning && rouletteCanvas) {
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
        const target = -index * ((Math.PI * 2) / rouletteNumbers.length) + Math.PI / 2;
        rouletteSpinState.targetAngle = target;
        rouletteSpinState.highlightNumber = Number(result.roulette.number);
    }

    function handleSlotResult(result) {
        if (!slotCanvases.length) return;
        stopSlotSpin(result.reels);

        if (result.bonus_final) {
            currentSlotBonus = null;
            updateSlotBonusIndicator(null);
            slotButton.textContent = 'Apostar';
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
            slotButton.textContent = 'Giro Gratis';
            showStatus(result.message, 'warning');
            showResultEffects(true);
            playAudioCue('spin');
        } else {
            currentSlotBonus = null;
            updateSlotBonusIndicator(null);
            slotButton.textContent = 'Apostar';
            showStatus(result.message, result.win ? 'success' : 'danger');
            showResultEffects(result.win, result.jackpot_hit);
            if (result.win) {
                playAudioCue('win');
                showCelebration(result.jackpot_hit ? '¡JACKPOT!' : '¡Ganaste!');
            } else {
                playAudioCue('fail');
            }
        }

        if (result.accumulated_percentage !== undefined) {
            const status = document.getElementById('slots-status');
            if (status) {
                status.textContent = `Acumulado: ${result.accumulated_percentage}%`;
            }
        }

        updateBalance(result.new_balance);
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

        let outcomeText;
        if (result.win) {
            outcomeText = `Cae ${result.roulette.number}. Apostaste ${selectedNumbers} y ganaste.`;
        } else {
            outcomeText = `Pierde. Cae ${result.roulette.number}. Apostaste ${selectedNumbers}.`;
        }

        showStatus(outcomeText);
        showResultEffects(result.win);
        if (result.win) {
            playAudioCue('win');
            showCelebration('¡Apuesta ganadora!');
        } else {
            playAudioCue('fail');
        }
        updateBalance(result.new_balance);
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

    if (slotButton) {
        slotButton.addEventListener('click', function () {
            const apuestaInput = document.getElementById('slot-apuesta');
            const storedWager = currentSlotBonus && currentSlotBonus.remaining > 0 ? currentSlotBonus.wager : Number(apuestaInput?.value || 0);
            const isBonusSpin = currentSlotBonus && currentSlotBonus.remaining > 0;
            if (!isBonusSpin && storedWager < 2000) {
                showStatus('La apuesta mínima es de 2.000 Gs.', 'warning');
                return;
            }

            const betTotalEl = document.getElementById('bet-total');
            if (betTotalEl) betTotalEl.textContent = `Apuesta: Gs. ${new Intl.NumberFormat('es-PY').format(storedWager)}`;

            const currentBalance = Number(document.getElementById('balance-value')?.textContent?.replace(/[^0-9]/g, '') || 0);
            if (storedWager > currentBalance) {
                showInsufficientFunds();
                return;
            }

            showStatus(isBonusSpin ? 'Ejecutando giro gratis...' : 'GIRANDO...', 'success');

            // Start visual spin: prefer PIXI scene if present, otherwise canvas fallback
            if (typeof window.fiveStarSpinVisual === 'function') {
                try { window.fiveStarSpinVisual(); } catch (e) { console.warn('fiveStarSpinVisual failed', e); }
            } else if (slotCanvases.length) {
                slotCanvases.forEach(setupCanvas);
                startSlotSpin();
            }

            // Play spin audio cue
            playAudioCue('spin');

            fetchPlay('tragamonedas', storedWager, isBonusSpin).then((result) => {
                if (!result.success) {
                    showStatus(result.error, 'danger');
                    // stop visual blur
                    slotCanvases.forEach((canvas) => canvas.classList.remove('blur'));
                    return;
                }

                // Convert backend flat reels (['🍒','7','🍉']) into per-reel 3-slot arrays for PIXI visual
                const backendReels = result.reels || [];
                const nested = [[], [], []];
                for (let i = 0; i < 3; i++) {
                    const center = backendReels[i] || slotSymbols[i % slotSymbols.length] || '⭐';
                    // pick neighbor symbols for top/bottom
                    const top = slotSymbols[(i * 2 + 1) % slotSymbols.length] || center;
                    const bottom = slotSymbols[(i * 3 + 2) % slotSymbols.length] || center;
                    nested[i] = [top, center, bottom];
                }

                // Stop the PIXI visual with final symbols if available
                if (typeof window.fiveStarStopVisual === 'function') {
                    try { window.fiveStarStopVisual(nested); } catch (e) { console.warn('fiveStarStopVisual failed', e); }
                } else {
                    // fallback to canvas-based display
                    stopSlotSpin(backendReels);
                }

                // Let the visual finish then process result effects
                setTimeout(() => {
                    handleSlotResult(result);
                }, 800);
            }).catch((err) => {
                console.error('Play request failed', err);
                showStatus('Error de red al ejecutar la jugada.', 'danger');
                slotCanvases.forEach((canvas) => canvas.classList.remove('blur'));
            });
        });
    }

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

    if (ruletaButton) {
        ruletaButton.addEventListener('click', function () {
            const apuesta = Number(document.getElementById('ruleta-apuesta').value || 0);
            const currentBalance = Number(document.getElementById('balance-value')?.textContent?.replace(/[^0-9]/g, '') || 0);
            if (!selectedRouletteChoices.length) {
                showStatus('Selecciona al menos un número de ruleta antes de apostar.');
                return;
            }
            if (apuesta > currentBalance) {
                showInsufficientFunds();
                return;
            }
            showStatus('Girando la ruleta...');
            if (rouletteCanvas) {
                setupCanvas(rouletteCanvas);
                startRouletteSpin();
            }
            fetchPlay('ruleta', apuesta, false, { selected_numbers: selectedRouletteChoices }).then((result) => {
                if (!result.success) {
                    showStatus(result.error);
                    if (rouletteCanvas) rouletteCanvas.classList.remove('blur');
                    return;
                }
                setTimeout(() => handleRouletteResult(result), 1400);
            });
        });
    }

    if (rouletteGrid) {
        renderRouletteGrid();
    }

    window.addEventListener('resize', function () {
        slotCanvases.forEach((canvas) => setupCanvas(canvas));
        if (rouletteCanvas) setupCanvas(rouletteCanvas);
    });
});
