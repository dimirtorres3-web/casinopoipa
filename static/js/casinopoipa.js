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
        if (!balanceEl) return;
        balanceEl.textContent = `Gs. ${new Intl.NumberFormat('es-PY').format(value)}`;
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
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#111214');
        gradient.addColorStop(1, '#17181e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        if (blur) {
            ctx.filter = 'blur(3px)';
        } else {
            ctx.filter = 'none';
        }
        ctx.fillStyle = '#f4f4f8';
        ctx.font = 'bold 4rem Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.35)';
        ctx.shadowBlur = blur ? 24 : 8;
        ctx.fillText(symbol, width / 2, height / 2);
        ctx.shadowBlur = 0;
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
        slotCanvases.forEach((canvas) => canvas.classList.add('blur'));

        function spin() {
            if (!slotSpinning) return;
            slotCanvases.forEach((canvas) => {
                drawSlotReel(canvas, getRandomSlotSymbol(), true);
            });
            slotAnimationFrame = requestAnimationFrame(spin);
        }
        spin();
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
        } else {
            currentSlotBonus = null;
            updateSlotBonusIndicator(null);
            slotButton.textContent = 'Apostar';
            showStatus(result.message, result.win ? 'success' : 'danger');
            showResultEffects(result.win, result.jackpot_hit);
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

    if (slotButton) {
        slotButton.addEventListener('click', function () {
            const storedWager = currentSlotBonus && currentSlotBonus.remaining > 0 ? currentSlotBonus.wager : Number(document.getElementById('slot-apuesta').value || 0);
            const isBonusSpin = currentSlotBonus && currentSlotBonus.remaining > 0;
            if (!isBonusSpin && storedWager < 2000) {
                showStatus('La apuesta mínima es de 2.000 Gs.', 'warning');
                return;
            }
            showStatus(isBonusSpin ? 'Ejecutando giro gratis...' : 'GIRANDO...', 'success');
            if (slotCanvases.length) {
                slotCanvases.forEach(setupCanvas);
                startSlotSpin();
            }
            fetchPlay('tragamonedas', storedWager, isBonusSpin).then((result) => {
                if (!result.success) {
                    showStatus(result.error, 'danger');
                    slotCanvases.forEach((canvas) => canvas.classList.remove('blur'));
                    return;
                }
                setTimeout(() => handleSlotResult(result), 2100);
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
            if (!selectedRouletteChoices.length) {
                showStatus('Selecciona al menos un número de ruleta antes de apostar.');
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
