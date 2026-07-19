import json
from decimal import Decimal, InvalidOperation
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.core.mail import send_mail
from django.db import transaction as db_transaction
from django.db.models import Sum
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST
from .forms import (
    BankAccountForm,
    LoginForm,
    PlayerRegistrationForm,
    TransactionForm,
    VerificationCodeForm,
    WithdrawalForm,
)
from .models import BankAccount, Player, Transaction
from .utils import (
    generar_jwt,
    secure_choice,
    secure_sample,
    secure_shuffle,
    secure_weighted_choice,
    secure_randint,
    secure_bool,
)


def is_admin(user):
    return user.is_superuser or user.is_staff


def register(request):
    if request.method == "POST":
        form = PlayerRegistrationForm(request.POST, request.FILES)
        if form.is_valid():
            email = form.cleaned_data["email"].strip().lower()
            existing = Player.objects.filter(email__iexact=email).first()
            if existing:
                form.add_error("email", "Este correo ya está registrado.")
                return render(request, "casino/registro.html", {"form": form})

            is_gift_eligible = Player.objects.count() < 20
            player = form.save(commit=False)
            player.email = email
            player.username = email
            player.is_active = True
            if is_gift_eligible:
                player.saldo += Decimal(10000)
                player.recibio_regalo = True
            player.save()

            login(request, player)
            messages.success(request, "Cuenta creada correctamente. Ya puedes entrar al dashboard y jugar.")
            return redirect("casino:dashboard")
    else:
        form = PlayerRegistrationForm()
    return render(request, "casino/registro.html", {"form": form})


def verify_email(request):
    if request.method == "POST":
        form = VerificationCodeForm(request.POST)
        if form.is_valid():
            code = form.cleaned_data["code"]
            user_id = request.session.get("unverified_user_id")
            expected_email = request.session.get("verification_email")
            expected_code = request.session.get("verification_code")
            if not user_id or not expected_email or not expected_code:
                messages.error(request, "No hay un registro pendiente de verificación.")
                return redirect("casino:registro")

            try:
                player = Player.objects.get(id=user_id, email__iexact=expected_email)
            except Player.DoesNotExist:
                messages.error(request, "No se encontró el usuario para verificar.")
                return redirect("casino:registro")

            if code != expected_code:
                messages.error(request, "Código incorrecto. Verifica el correo y vuelve a intentarlo.")
            else:
                player.is_active = True
                player.save()
                request.session.pop("verification_email", None)
                request.session.pop("verification_code", None)
                request.session.pop("unverified_user_id", None)
                login(request, player)
                messages.success(request, "Correo verificado. Bienvenido al dashboard.")
                return redirect("casino:dashboard")
    else:
        form = VerificationCodeForm()

    context = {"form": form}
    if request.session.get("show_verification_code"):
        context["verification_code"] = request.session.get("debug_verification_code")
    return render(request, "casino/verify_email.html", context)


def login_view(request):
    if request.user.is_authenticated:
        return redirect("casino:dashboard")

    if request.method == "POST":
        form = LoginForm(request.POST)
        try:
            if form.is_valid():
                identity = form.cleaned_data["email"]
                password = form.cleaned_data["password"]

                user = authenticate(request, username=identity, password=password)
                if user is None:
                    user = authenticate(request, username=identity, password=password)

                if user is not None:
                    login(request, user)
                    token = generar_jwt({"user_id": user.id, "username": user.username})
                    request.session["jwt_token"] = token
                    if user.is_staff or user.is_superuser:
                        return redirect("casino:admin_panel")
                    return redirect("casino:dashboard")

                try:
                    player = Player.objects.get(email__iexact=identity)
                except Player.DoesNotExist:
                    messages.error(request, "Usuario o contraseña incorrectos.")
                    return render(request, "casino/login.html", {"form": form})

                if not player.check_password(password):
                    messages.error(request, "Usuario o contraseña incorrectos.")
                    return render(request, "casino/login.html", {"form": form})

                if not player.is_active:
                    player.is_active = True
                    player.save(update_fields=["is_active"])

                login(request, player)
                token = generar_jwt({"user_id": player.id, "username": player.username})
                request.session["jwt_token"] = token
                if player.is_staff or player.is_superuser:
                    return redirect("casino:admin_panel")
                return redirect("casino:dashboard")
            else:
                messages.error(request, "Por favor completa todos los campos correctamente.")
        except Exception:
            messages.error(request, "Error al iniciar sesión. Inténtalo de nuevo.")
    else:
        form = LoginForm()
    return render(request, "casino/login.html", {"form": form})


def logout_view(request):
    logout(request)
    return redirect("casino:login")

@login_required
def dashboard(request):
    player = request.user
    if player.is_staff or player.is_superuser:
        return redirect("casino:admin_panel")

    juegos = [
        {
            "titulo": "Five Star",
            "icono": "⭐",
            "slug": "five-star",
            "url": reverse("casino:tragamonedas_slug", kwargs={"slug": "five-star"}),
            "cover": "/static/img/games/five-star.svg",
        },
        {
            "titulo": "Joker Jackpot",
            "icono": "🃏",
            "slug": "joker-jackpot",
            "url": reverse("casino:tragamonedas_slug", kwargs={"slug": "joker-jackpot"}),
            "cover": "/static/img/games/joker-jackpot.svg",
        },
        {
            "titulo": "Betty, Boris & Boo",
            "icono": "🕯️",
            "slug": "betty-boris-boo",
            "url": reverse("casino:tragamonedas_slug", kwargs={"slug": "betty-boris-boo"}),
            "cover": "/static/img/games/betty-boris-boo.svg",
        },
        {
            "titulo": "777 Strike",
            "icono": "💎",
            "slug": "777-strike",
            "url": reverse("casino:tragamonedas_slug", kwargs={"slug": "777-strike"}),
            "cover": "/static/img/games/777-strike.svg",
        },
        {
            "titulo": "Poker Royale",
            "icono": "♠️",
            "slug": "poker",
            "url": reverse("casino:poker"),
            "cover": "/static/img/games/poker.svg",
        },
        {
            "titulo": "Roulette Pro",
            "icono": "🎡",
            "slug": "ruleta",
            "url": reverse("casino:ruleta"),
            "cover": "/static/img/games/ruleta.svg",
        },
    ]
    return render(request, "casino/player_dashboard.html", {
        "player": player,
        "juegos": juegos,
    })


GAME_MULTIPLIERS = {
    "tragamonedas": 2.5,
    "ruleta": 2.3,
}

SLOT_WIN_PROBABILITY = 0.375
SLOT_BONUS_TRIGGER_PROBABILITY = 0.05
ROULETTE_PAYOUT_BASE = Decimal("35.25")

SLOT_TEMPLATES = [
    {"id": "aurora", "name": "Aurora Glow", "theme": "Brillo nocturno", "symbol": "✨"},
    {"id": "golden", "name": "Golden Rush", "theme": "Oro premium", "symbol": "💰"},
    {"id": "dragon", "name": "Dragon Flame", "theme": "Fuego y fortuna", "symbol": "🐉"},
]

BONUS_RTP_WEIGHTS = {
    "low": [(10, 35), (20, 30), (40, 20), (80, 15)],
    "medium": [(15, 30), (25, 35), (50, 25), (100, 10)],
}

SLOT_SYMBOLS = ["🍒", "7", "🍋", "🔔", "🍉"]
BONUS_SYMBOL = "BONO"
ROULETTE_SLOTS = [
    {"number": 0, "color": "green"},
    {"number": 1, "color": "red"},
    {"number": 2, "color": "black"},
    {"number": 3, "color": "red"},
    {"number": 4, "color": "black"},
    {"number": 5, "color": "red"},
    {"number": 6, "color": "black"},
    {"number": 7, "color": "red"},
    {"number": 8, "color": "black"},
    {"number": 9, "color": "red"},
    {"number": 10, "color": "black"},
    {"number": 11, "color": "black"},
    {"number": 12, "color": "red"},
    {"number": 13, "color": "black"},
    {"number": 14, "color": "red"},
    {"number": 15, "color": "black"},
    {"number": 16, "color": "red"},
    {"number": 17, "color": "black"},
    {"number": 18, "color": "red"},
    {"number": 19, "color": "red"},
    {"number": 20, "color": "black"},
    {"number": 21, "color": "red"},
    {"number": 22, "color": "black"},
    {"number": 23, "color": "red"},
    {"number": 24, "color": "black"},
    {"number": 25, "color": "red"},
    {"number": 26, "color": "black"},
    {"number": 27, "color": "red"},
    {"number": 28, "color": "black"},
    {"number": 29, "color": "black"},
    {"number": 30, "color": "red"},
    {"number": 31, "color": "black"},
    {"number": 32, "color": "red"},
    {"number": 33, "color": "black"},
    {"number": 34, "color": "red"},
    {"number": 35, "color": "black"},
    {"number": 36, "color": "red"},
]

ROULETTE_SLOT_COLORS = {slot['number']: slot['color'] for slot in ROULETTE_SLOTS}

SLOT_BONUS_DISTRIBUTION = [
    (0, 60),
    (10, 20),
    (20, 10),
    (30, 6),
    (50, 3),
    (80, 1),
]
JACKPOT_THRESHOLD_PLAYS = 120
JACKPOT_PROBABILITY = 0.0075
JACKPOT_EXTRA_PERCENTAGE = 150


def draw_slot_reels(win=False, bonus=False):
    if bonus:
        return [BONUS_SYMBOL, BONUS_SYMBOL, BONUS_SYMBOL]
    if win:
        symbol = secure_choice(SLOT_SYMBOLS)
        return [symbol, symbol, symbol]
    return secure_sample(SLOT_SYMBOLS + ["⭐", "🍊"], 3)


def deal_cards(count=2):
    ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    suits = ["♠", "♥", "♦", "♣"]
    deck = [f"{rank}{suit}" for rank in ranks for suit in suits]
    deck = secure_shuffle(deck)
    return [deck.pop() for _ in range(count)]


def pick_roulette_result():
    return secure_choice(ROULETTE_SLOTS)


def get_slots_bonus_state(request):
    return request.session.get("slots_bonus_state")


def set_slots_bonus_state(request, state):
    request.session["slots_bonus_state"] = state


def clear_slots_bonus_state(request):
    if "slots_bonus_state" in request.session:
        del request.session["slots_bonus_state"]


def select_slot_bonus_percentage():
    return secure_weighted_choice(SLOT_BONUS_DISTRIBUTION)


def is_jackpot_eligible(player):
    return getattr(player, "slot_play_count", 0) >= JACKPOT_THRESHOLD_PLAYS


def build_response_payload(player, **extra):
    return JsonResponse({
        "success": True,
        "new_balance": int(player.saldo),
        "bonus_balance": int(player.bonus_balance),
        "free_spins": player.free_spins,
        "bonus_rollover": int(player.bonus_rollover),
        "bonus_rollover_target": int(player.bonus_rollover_target),
        **extra,
    })


def first_withdrawal_threshold(player):
    return 100000 if player.recibio_regalo else 50000


def has_existing_withdrawals(player):
    return Transaction.objects.filter(player=player, tipo="retiro").exists()


def apply_bonus_deposit(player, amount):
    if player.bonus_balance <= 0 and player.bonus_rollover_target <= 0:
        player.bonus_balance += amount * 2
        player.bonus_rollover = 0
        player.bonus_rollover_target = amount * 3
    return player


def process_game_result(request, game, apuesta, bonus_spin=False, payload=None):
    player = request.user
    if apuesta < 2000:
        return JsonResponse({"success": False, "error": "La apuesta mínima es de 2.000 Gs."})
    if game not in GAME_MULTIPLIERS:
        return JsonResponse({"success": False, "error": "Juego desconocido."})

    if game == "tragamonedas":
        bonus_state = get_slots_bonus_state(request)
        if player.free_spins > 0 and not bonus_spin:
            player.free_spins -= 1
            bonus_spin = True

        if bonus_spin:
            if not bonus_state or bonus_state.get("remaining", 0) <= 0:
                clear_slots_bonus_state(request)
                return JsonResponse({"success": False, "error": "No hay giros gratis disponibles."})

            with db_transaction.atomic():
                player.slot_play_count += 1
                bonus_state["remaining"] -= 1
                bonus_state["current_spin"] = bonus_state.get("current_spin", 0) + 1
                wager = Decimal(bonus_state.get("wager", apuesta))
                jackpot_hit = False
                percentage = 0
                if is_jackpot_eligible(player) and secure_bool(JACKPOT_PROBABILITY):
                    jackpot_hit = True
                    percentage = JACKPOT_EXTRA_PERCENTAGE
                else:
                    percentage = select_slot_bonus_percentage()

                bonus_state["accumulated_percentage"] = bonus_state.get("accumulated_percentage", 0) + percentage
                bonus_state["last_percentage"] = percentage
                bonus_state["jackpot_eligible"] = is_jackpot_eligible(player)

                if jackpot_hit or bonus_state["remaining"] <= 0:
                    reward = int(wager * bonus_state["accumulated_percentage"] / 100)
                    player.saldo += Decimal(reward)
                    player.save()
                    clear_slots_bonus_state(request)
                    message = (
                        f"¡Jackpot! Recibiste un {percentage}% extra sobre tu apuesta." if jackpot_hit
                        else f"Giro gratis finalizado. Total acumulado: {bonus_state['accumulated_percentage']}%."
                    )
                    return build_response_payload(
                        player,
                        game=game,
                        win=percentage > 0,
                        payout=reward,
                        message=message,
                        reels=draw_slot_reels(win=percentage > 0),
                        bonus_active=False,
                        bonus_final=True,
                        bonus_spins=0,
                        accumulated_percentage=bonus_state["accumulated_percentage"],
                        last_percentage=percentage,
                        bonus_reward=reward,
                        jackpot_hit=jackpot_hit,
                        animation="slots",
                    )

                set_slots_bonus_state(request, bonus_state)
                player.save(update_fields=["slot_play_count", "free_spins"])
                return build_response_payload(
                    player,
                    game=game,
                    win=percentage > 0,
                    payout=0,
                    message=f"Giro gratis {bonus_state['current_spin']} / {bonus_state['total_spins']}: +{percentage}% acumulado.",
                    reels=draw_slot_reels(win=percentage > 0),
                    bonus_active=True,
                    bonus_spins=bonus_state["remaining"],
                    total_spins=bonus_state["total_spins"],
                    accumulated_percentage=bonus_state["accumulated_percentage"],
                    last_percentage=percentage,
                    bonus_wager=int(wager),
                    jackpot_eligible=is_jackpot_eligible(player),
                    animation="slots",
                )

        if apuesta > player.saldo:
            return JsonResponse({"success": False, "error": "Saldo insuficiente para esta apuesta."})

        with db_transaction.atomic():
            player.slot_play_count += 1
            win = secure_bool(SLOT_WIN_PROBABILITY)
            payout = 0
            bonus_active = False
            bonus_info = None
            if win:
                payout = int(Decimal(apuesta) * Decimal(GAME_MULTIPLIERS[game]))
                player.saldo += Decimal(payout)
                bonus_active = secure_bool(SLOT_BONUS_TRIGGER_PROBABILITY)
                if bonus_active:
                    free_spins = secure_randint(1, 5)
                    player.free_spins += free_spins
                    bonus_info = {
                        "free_spins": int(player.free_spins),
                        "accumulated_percentage": 0,
                        "bonus_wager": int(apuesta),
                    }
                    set_slots_bonus_state(request, {
                        "remaining": free_spins,
                        "total_spins": free_spins,
                        "current_spin": 0,
                        "wager": int(apuesta),
                        "accumulated_percentage": 0,
                    })
            else:
                player.saldo -= Decimal(apuesta)
            player.save()

        return build_response_payload(
            player,
            game=game,
            win=win,
            payout=payout,
            message="¡Ganaste en tragamonedas!" if win else "La casa gana esta ronda.",
            reels=draw_slot_reels(win=win, bonus=bonus_active),
            bonus_active=bonus_active,
            bonus_info=bonus_info,
            animation="slots",
        )

    if game == "ruleta":
        if apuesta > player.saldo:
            return JsonResponse({"success": False, "error": "Saldo insuficiente para esta apuesta."})
        if payload is None:
            payload = {}

        selected_numbers = payload.get("selected_numbers", payload.get("selected_number"))
        if selected_numbers is None:
            return JsonResponse({"success": False, "error": "Selecciona al menos un número válido para la ruleta."})

        if isinstance(selected_numbers, (str, int)):
            selected_numbers = [selected_numbers]
        elif not isinstance(selected_numbers, list):
            return JsonResponse({"success": False, "error": "Formato de apuesta para la ruleta inválido."})

        cleaned_numbers = []
        for number in selected_numbers:
            try:
                number = int(number)
            except (ValueError, TypeError):
                return JsonResponse({"success": False, "error": "Selecciona números válidos para la ruleta."})
            if number < 0 or number > 36:
                return JsonResponse({"success": False, "error": "Número de ruleta inválido."})
            if number not in cleaned_numbers:
                cleaned_numbers.append(number)

        if len(cleaned_numbers) == 0:
            return JsonResponse({"success": False, "error": "Selecciona al menos un número para la ruleta."})
        if len(cleaned_numbers) > 3:
            return JsonResponse({"success": False, "error": "Puedes apostar hasta 3 números en la ruleta."})

        result = pick_roulette_result()
        win = result["number"] in cleaned_numbers
        payout = 0
        if win:
            payout = int(Decimal(apuesta) * ROULETTE_PAYOUT_BASE / Decimal(len(cleaned_numbers)))
        if win:
            player.saldo += Decimal(payout)
            message = f"¡Victoria en Ruleta! Salió {result['number']} {result['color']} y ganaste {payout} Gs."
        else:
            player.saldo -= Decimal(apuesta)
            message = f"Derrota en Ruleta. Salió {result['number']} {result['color']} y perdiste {apuesta} Gs."
        player.save()
        response = {
            "game": game,
            "win": win,
            "payout": payout,
            "message": message,
            "animation": "roulette",
            "roulette": result,
            "selected_numbers": cleaned_numbers,
            "selected_number": result["number"],
            "selected_color": result["color"],
        }
        return build_response_payload(player, **response)

    if apuesta > player.saldo:
        return JsonResponse({"success": False, "error": "Saldo insuficiente para esta apuesta."})
    win = secure_bool(0.40)
    payout = 0
    if win:
        payout = int(Decimal(apuesta) * Decimal(GAME_MULTIPLIERS[game]))
        player.saldo += Decimal(payout)
        message = f"¡Victoria en {game.capitalize()}! Ganaste {payout} Gs."
    else:
        player.saldo -= Decimal(apuesta)
        message = f"Derrota en {game.capitalize()}. Perdiste {apuesta} Gs."
    player.save()

    # Select animation type per game
    animation_type = "roulette"

    response = {
        "game": game,
        "win": win,
        "payout": payout,
        "message": message,
        "animation": animation_type,
    }
    return build_response_payload(player, **response)

@login_required
@require_POST
def api_play(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except ValueError:
        payload = request.POST
    game = payload.get("game")
    apuesta = int(payload.get("apuesta", 0))
    bonus_spin = payload.get("bonus_spin") in [True, "true", "True", "1"]
    return process_game_result(request, game, apuesta, bonus_spin=bonus_spin, payload=payload)

@login_required
@require_POST
def api_withdraw(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except ValueError:
        return JsonResponse({"success": False, "error": "Solicitud inválida."})

    player = request.user
    try:
        monto = Decimal(payload.get("monto", 0))
    except (TypeError, ValueError, InvalidOperation):
        return JsonResponse({"success": False, "error": "Monto de retiro no válido."})

    banco = payload.get("banco", "").strip()
    tipo_cuenta = payload.get("tipo_cuenta", "").strip()
    numero_cuenta = payload.get("numero_cuenta", "").strip()
    titular = payload.get("titular", "").strip()
    cedula = payload.get("cedula", "").strip()
    telefono = payload.get("telefono", "").strip()

    if not all([banco, tipo_cuenta, numero_cuenta, titular, cedula, telefono]):
        return JsonResponse({"success": False, "error": "Todos los datos de retiro son obligatorios."})
    if monto <= 0:
        return JsonResponse({"success": False, "error": "Ingresa un monto válido."})
    if monto > player.saldo:
        return JsonResponse({"success": False, "error": "Saldo insuficiente para este retiro."})

    threshold = 0
    if not has_existing_withdrawals(player):
        threshold = first_withdrawal_threshold(player)
        if monto < threshold:
            message = (
                "Tu primer retiro debe alcanzar los 100.000 Gs. por haber recibido el bono de bienvenida"
                if player.recibio_regalo
                else "El monto mínimo para tu primer retiro es de 50.000 Gs."
            )
            return JsonResponse({"success": False, "error": message})

    bank_account = getattr(player, "bank_account", None)
    if bank_account:
        bank_account.banco = banco
        bank_account.tipo_cuenta = tipo_cuenta
        bank_account.numero_cuenta = numero_cuenta
        bank_account.titular = titular
        bank_account.cedula = cedula
        bank_account.telefono = telefono
        bank_account.save()
    else:
        BankAccount.objects.create(
            player=player,
            banco=banco,
            tipo_cuenta=tipo_cuenta,
            numero_cuenta=numero_cuenta,
            titular=titular,
            cedula=cedula,
            telefono=telefono,
        )

    transaction = Transaction.objects.create(
        player=player,
        tipo="retiro",
        monto=monto,
        estado="pendiente",
        status="pendiente",
        banco=banco,
        tipo_cuenta=tipo_cuenta,
        numero_cuenta=numero_cuenta,
        titular=titular,
        cedula=cedula,
        telefono=telefono,
    )
    player.saldo -= monto
    player.save()
    return JsonResponse({
        "success": True,
        "message": "Retiro registrado y saldo actualizado.",
        "new_balance": int(player.saldo),
    })

@login_required
@user_passes_test(is_admin)
@require_POST
def mark_transaction_paid(request, transaction_id):
    transaccion = get_object_or_404(Transaction, id=transaction_id, tipo="retiro")
    transaccion.status = "pagado"
    transaccion.estado = "aprobado"
    transaccion.save()
    messages.success(request, "Retiro marcado como pagado.")
    if request.headers.get("x-requested-with") == "XMLHttpRequest" or "application/json" in request.headers.get("Accept", ""):
        return JsonResponse({"success": True, "transaction_id": transaction_id, "status": transaccion.status})
    return redirect("casino:admin_panel")

@login_required
def play_game(request):
    return redirect("casino:dashboard")

@login_required
def cashier(request):
    player = request.user
    bank_account = getattr(player, "bank_account", None)
    recarga_form = TransactionForm(initial={"tipo": "recarga"})
    retiro_form = WithdrawalForm()
    bank_form = BankAccountForm(instance=bank_account)

    selected_tab = request.GET.get("tab", "deposito")
    if selected_tab not in ["deposito", "retiro", "forma_pago"]:
        selected_tab = "deposito"

    if request.method == "POST":
        action = request.POST.get("action")
        if action == "deposito":
            selected_tab = "deposito"
        elif action == "retiro":
            selected_tab = "retiro"
        elif action == "guardar_banco":
            selected_tab = "forma_pago"

        if action == "recarga":
            recarga_form = TransactionForm(request.POST, request.FILES)
            if recarga_form.is_valid():
                transaction = recarga_form.save(commit=False)
                transaction.player = player
                transaction.estado = "pendiente"
                transaction.status = "pendiente"
                transaction.save()
                if not player.recibio_regalo and player.transactions.count() <= 1:
                    apply_bonus_deposit(player, int(transaction.monto or 0))
                    player.recibio_regalo = True
                    player.save()
                messages.success(request, "Solicitud de recarga enviada. Espera aprobación del cajero.")
                return redirect("casino:dashboard")
        elif action == "guardar_banco":
            bank_form = BankAccountForm(request.POST, instance=bank_account)
            if bank_form.is_valid():
                bank = bank_form.save(commit=False)
                bank.player = player
                bank.save()
                messages.success(request, "Método de pago guardado correctamente.")
                return redirect(f"{reverse('casino:cajero')}?tab=forma_pago")
        elif action == "retiro":
            bank_form = BankAccountForm(request.POST, instance=bank_account)
            retiro_form = WithdrawalForm(request.POST, request.FILES)
            if bank_form.is_valid() and retiro_form.is_valid():
                bank = bank_form.save(commit=False)
                bank.player = player
                bank.save()

                monto = retiro_form.cleaned_data["monto"]
                threshold = 0
                if not has_existing_withdrawals(player):
                    threshold = first_withdrawal_threshold(player)
                if threshold > 0 and monto < threshold:
                    messages.error(request, f"{'Tu primer retiro debe alcanzar los 100.000 Gs. por haber recibido el bono de bienvenida' if player.recibio_regalo else 'El monto mínimo para tu primer retiro es de 50.000 Gs.'}")
                elif monto > player.saldo:
                    messages.error(request, "Saldo insuficiente para este retiro.")
                else:
                    transaction = retiro_form.save(commit=False)
                    transaction.player = player
                    transaction.estado = "pendiente"
                    transaction.status = "pendiente"
                    transaction.save()
                    player.saldo -= Decimal(monto)
                    player.save()
                    messages.success(request, "Solicitud de retiro enviada y saldo actualizado.")
                    return redirect("casino:dashboard")

    return render(
        request,
        "casino/cajero.html",
        {
            "recarga_form": recarga_form,
            "retiro_form": retiro_form,
            "bank_form": bank_form,
            "bank_account": bank_account,
            "selected_tab": selected_tab,
        },
    )

@login_required
def tragamonedas(request, slug=None):
    # Provide per-game metadata so templates and frontend can render unique visuals
    default = {
        "five-star": {"title": "Five Star Deluxe", "theme": "stars", "jackpots": ["JOKER","GRAND","MAJOR","MINOR"]},
        "joker-jackpot": {"title": "Joker Jackpot", "theme": "joker", "jackpots": ["JOKER","GRAND","MAJOR","MINOR"]},
        "betty-boris-boo": {"title": "Betty, Boris & Boo", "theme": "gothic", "jackpots": ["GOLD","SILVER","BRONZE","MINOR"]},
        "777-strike": {"title": "777 Strike", "theme": "seven", "jackpots": ["CROWN","ROYAL","STRIKE","MINOR"]},
    }
    meta = default.get(slug, default["five-star"]) if slug else default["five-star"]
    return render(request, "casino/tragamonedas.html", {"player": request.user, "game_slug": slug or "five-star", "game_meta": meta})
@login_required
def ruleta(request):
    return render(request, "casino/ruleta.html", {"player": request.user})

@login_required
def poker(request):
    return render(request, "casino/poker.html", {"player": request.user})

@login_required
def blackjack(request):
    return render(request, "casino/tragamonedas.html", {"player": request.user, "game_mode": "blackjack"})

@login_required
def bingo(request):
    return render(request, "casino/tragamonedas.html", {"player": request.user, "game_mode": "bingo"})


@login_required
def health_check(request):
    # Avoid external network calls in health checks; verify DB connectivity instead
    try:
        status = Player.objects.exists()
    except Exception:
        status = False
    return render(request, "casino/health.html", {"status": status})

@login_required
@user_passes_test(is_admin)
def admin_panel(request):
    jugadores = Player.objects.all().order_by("username")
    transacciones = Transaction.objects.order_by("-creado_en")
    total_balance = sum((player.saldo or Decimal(0)) for player in jugadores)

    jugadores_data = []
    for jugador in jugadores:
        recargas = Transaction.objects.filter(player=jugador, tipo="recarga")
        retiros = Transaction.objects.filter(player=jugador, tipo="retiro")
        jugadores_data.append({
            "player": jugador,
            "is_admin": jugador.is_staff or jugador.is_superuser,
            "total_recarga": recargas.aggregate(total=Sum("monto"))["total"] or 0,
            "total_retiro": retiros.aggregate(total=Sum("monto"))["total"] or 0,
            "recarga_pendiente": recargas.filter(estado="pendiente").aggregate(total=Sum("monto"))["total"] or 0,
            "recarga_aprobada": recargas.filter(estado="aprobado").aggregate(total=Sum("monto"))["total"] or 0,
            "retiro_pendiente": retiros.filter(status="pendiente").aggregate(total=Sum("monto"))["total"] or 0,
            "retiro_pagado": retiros.filter(status="pagado").aggregate(total=Sum("monto"))["total"] or 0,
        })

    stats = {
        "total_users": jugadores.count(),
        "total_transactions": transacciones.count(),
        "pending_transactions": transacciones.filter(estado="pendiente").count(),
        "approved_transactions": transacciones.filter(estado="aprobado").count(),
        "total_balance": int(total_balance),
        "jugadores_data": jugadores_data,
        "transacciones": transacciones,
        "admin_panel_url": reverse("casino:admin_panel"),
        "promote_admin_url": reverse("casino:add_admin"),
    }
    return render(request, "casino/admin_panel.html", stats)


@login_required
@user_passes_test(is_admin)
def clientes(request):
    jugadores = Player.objects.all().order_by("username")
    return render(request, "casino/clientes.html", {"jugadores": jugadores})


@login_required
@user_passes_test(is_admin)
def add_admin(request):
    if request.method == "POST":
        email = request.POST.get("email", "").strip().lower()
        if not email:
            messages.error(request, "Ingresa un correo válido.")
            return redirect("casino:add_admin")
        try:
            player = Player.objects.get(email__iexact=email)
        except Player.DoesNotExist:
            messages.error(request, "No se encontró un usuario con ese correo.")
            return redirect("casino:add_admin")

        player.is_staff = True
        player.is_superuser = True
        player.save(update_fields=["is_staff", "is_superuser"])
        messages.success(request, f"{email} ahora tiene privilegios de administrador.")
        return redirect("casino:admin_panel")

    return render(request, "casino/add_admin.html")


@login_required
@user_passes_test(is_admin)
@require_POST
def promote_to_admin(request, player_id):
    player = get_object_or_404(Player, id=player_id)
    if player.is_staff and player.is_superuser:
        messages.info(request, "Ese usuario ya es administrador.")
    else:
        player.is_staff = True
        player.is_superuser = True
        player.save(update_fields=["is_staff", "is_superuser"])
        messages.success(request, f"{player.email} ahora es administrador.")
    return redirect("casino:admin_panel")


@login_required
@user_passes_test(is_admin)
@require_POST
def delete_player(request, player_id):
    player = get_object_or_404(Player, id=player_id)
    if request.user == player:
        messages.error(request, "No puedes eliminar tu propia cuenta.")
    else:
        player.delete()
        messages.success(request, "Jugador eliminado correctamente.")
    return redirect("casino:admin_panel")


@login_required
@user_passes_test(is_admin)
def toggle_player_status(request, player_id):
    player = get_object_or_404(Player, id=player_id)
    player.is_active = not player.is_active
    player.save(update_fields=["is_active"])
    messages.success(request, f"Estado del jugador actualizado a {'activo' if player.is_active else 'inactivo'}.")
    return redirect("casino:clientes")


@login_required
@user_passes_test(is_admin)
@require_POST
def approve_transaction(request, transaction_id):
    transaccion = get_object_or_404(Transaction, id=transaction_id, estado="pendiente")
    with db_transaction.atomic():
        transaccion.estado = "aprobado"
        transaccion.status = "pagado"
        transaccion.save()
        if transaccion.tipo == "recarga":
            player = transaccion.player
            player.saldo += transaccion.monto
            player.save()
    messages.success(request, "Carga aprobada y saldo acreditado.")
    return redirect("casino:admin_panel")

@login_required
@user_passes_test(is_admin)
@require_POST
def refund_transaction(request, transaction_id):
    transaccion = get_object_or_404(Transaction, id=transaction_id, estado="pendiente")
    with db_transaction.atomic():
        transaccion.estado = "reembolsado"
        transaccion.save()
        if transaccion.tipo == "recarga":
            pass
    messages.warning(request, "Transacción reembolsada y cancelada.")
    return redirect("casino:admin_panel")
