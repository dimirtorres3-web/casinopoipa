import json
import random
from decimal import Decimal, InvalidOperation
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.core.mail import send_mail
from django.db import transaction as db_transaction
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
from .utils import generar_jwt


def is_admin(user):
    return user.is_superuser or user.is_staff


def register(request):
    if request.method == "POST":
        form = PlayerRegistrationForm(request.POST, request.FILES)
        if form.is_valid():
            is_gift_eligible = Player.objects.count() < 20
            player = form.save(commit=False)
            player.is_active = False
            if is_gift_eligible:
                player.saldo += Decimal(10000)
                player.recibio_regalo = True
            player.save()

            verification_code = "".join(random.choices("0123456789", k=6))
            request.session["verification_email"] = player.email
            request.session["verification_code"] = verification_code
            request.session["unverified_user_id"] = player.id
            request.session["debug_verification_code"] = verification_code

            email_subject = "Código de verificación Casinopoipa"
            email_message = (
                f"Hola {player.nombre},\n\n"
                f"Tu código de verificación es: {verification_code}\n\n"
                "Ingresa el código en el sitio para activar tu cuenta."
            )
            email_sent = False
            try:
                send_mail(
                    email_subject,
                    email_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [player.email],
                    fail_silently=False,
                )
                email_sent = True
                if settings.DEBUG or "console" in settings.EMAIL_BACKEND:
                    messages.info(
                        request,
                        "El código de verificación también está disponible aquí porque el correo está en modo desarrollo.",
                    )
            except Exception:
                messages.warning(
                    request,
                    "No se pudo enviar el correo. Usa el código que aparece más abajo para verificar tu cuenta.",
                )

            request.session["show_verification_code"] = not email_sent or settings.DEBUG
            messages.info(request, "Te enviamos un código de verificación a tu correo electrónico.")
            if request.session.get("show_verification_code"):
                messages.info(request, f"Tu código de verificación es: {verification_code}")
            return redirect("casino:verify_email")
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
    # If already authenticated, redirect immediately to dashboard
    if request.user.is_authenticated:
        return redirect("casino:dashboard")

    if request.method == "POST":
        form = LoginForm(request, data=request.POST)
        try:
            if form.is_valid():
                email = form.cleaned_data["username"].strip().lower()
                password = form.cleaned_data["password"]
                user = authenticate(
                    request,
                    username=email,
                    password=password,
                )
                if user is not None:
                    login(request, user)
                    token = generar_jwt({"user_id": user.id, "username": user.username})
                    request.session["jwt_token"] = token
                    if user.is_staff or user.is_superuser:
                        return redirect("casino:admin_panel")
                    return redirect("casino:dashboard")

                try:
                    player = Player.objects.get(email__iexact=email)
                except Player.DoesNotExist:
                    messages.error(request, "Usuario o contraseña incorrectos.")
                else:
                    if not player.check_password(password):
                        messages.error(request, "Usuario o contraseña incorrectos.")
                    elif not player.is_active:
                        request.session["verification_email"] = player.email
                        request.session["unverified_user_id"] = player.id
                        messages.error(
                            request,
                            "Tu cuenta no está verificada. Revisa el correo o vuelve a generar el código.",
                        )
                        return redirect("casino:verify_email")
                    else:
                        login(request, player)
                        token = generar_jwt({"user_id": player.id, "username": player.username})
                        request.session["jwt_token"] = token
                        if player.is_staff or player.is_superuser:
                            return redirect("casino:admin_panel")
                        return redirect("casino:dashboard")
            else:
                messages.error(request, "Por favor completa todos los campos correctamente.")
        except Exception:
            # Avoid raising 500 on unexpected auth errors; show generic message
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

    saldo_real = player.saldo
    juegos = [
        {
            "titulo": "Tragamonedas",
            "icono": "🎰",
            "url": reverse("casino:tragamonedas"),
            "description": "Gira los rodillos y busca la combinación perfecta.",
        },
        {
            "titulo": "Póker",
            "icono": "🂡",
            "url": reverse("casino:poker"),
            "description": "Estrategia, faroles y cartas altas.",
        },
        {
            "titulo": "Blackjack",
            "icono": "🃏",
            "url": reverse("casino:blackjack"),
            "description": "Acércate a 21 sin pasarte para vencer a la banca.",
        },
        {
            "titulo": "Bingo",
            "icono": "🎱",
            "url": reverse("casino:bingo"),
            "description": "Marca tus números y completa la cartilla primero.",
        },
        {
            "titulo": "Ruleta",
            "icono": "🎡",
            "url": reverse("casino:ruleta"),
            "description": "Apuesta al rojo, negro o al número ganador.",
        },
    ]
    return render(request, "casino/index.html", {
        "player": player,
        "saldo_real": saldo_real,
        "juegos": juegos,
    })

GAME_MULTIPLIERS = {
    "tragamonedas": 2.5,
    "poker": 2.2,
    "blackjack": 2.0,
    "bingo": 2.4,
    "ruleta": 2.3,
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
        symbol = random.choice(SLOT_SYMBOLS)
        return [symbol, symbol, symbol]
    return random.sample(SLOT_SYMBOLS + ["⭐", "🍊"], 3)


def deal_cards(count=2):
    ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
    suits = ["♠", "♥", "♦", "♣"]
    deck = [f"{rank}{suit}" for rank in ranks for suit in suits]
    random.shuffle(deck)
    return [deck.pop() for _ in range(count)]


def pick_roulette_result():
    return random.choice(ROULETTE_SLOTS)


def get_slots_bonus_state(request):
    return request.session.get("slots_bonus_state")


def set_slots_bonus_state(request, state):
    request.session["slots_bonus_state"] = state


def clear_slots_bonus_state(request):
    if "slots_bonus_state" in request.session:
        del request.session["slots_bonus_state"]


def select_slot_bonus_percentage():
    options, weights = zip(*SLOT_BONUS_DISTRIBUTION)
    return random.choices(options, weights=weights, k=1)[0]


def is_jackpot_eligible(player):
    return getattr(player, "slot_play_count", 0) >= JACKPOT_THRESHOLD_PLAYS


def build_response_payload(player, **extra):
    return JsonResponse({
        "success": True,
        "new_balance": int(player.saldo),
        **extra,
    })


def first_withdrawal_threshold(player):
    return 100000 if player.recibio_regalo else 50000


def has_existing_withdrawals(player):
    return Transaction.objects.filter(player=player, tipo="retiro").exists()


def process_game_result(request, game, apuesta, bonus_spin=False, payload=None):
    player = request.user
    if apuesta < 2000:
        return JsonResponse({"success": False, "error": "La apuesta mínima es de 2.000 Gs."})
    if game not in GAME_MULTIPLIERS:
        return JsonResponse({"success": False, "error": "Juego desconocido."})

    if game == "tragamonedas":
        bonus_state = get_slots_bonus_state(request)
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
                if is_jackpot_eligible(player) and random.random() < JACKPOT_PROBABILITY:
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
                player.save(update_fields=["slot_play_count"])
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
            win = random.random() < 0.40
            payout = 0
            bonus_active = False
            bonus_info = None
            if win:
                payout = int(apuesta * GAME_MULTIPLIERS[game])
                player.saldo += Decimal(payout)
                bonus_active = random.random() < 0.05
                if bonus_active:
                    free_spins = random.randint(1, 5)
                    bonus_info = {
                        "free_spins": free_spins,
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

        win = random.random() < 0.40
        if win:
            matching_slots = [slot for slot in ROULETTE_SLOTS if slot["number"] in cleaned_numbers]
            result = random.choice(matching_slots) if matching_slots else pick_roulette_result()
        else:
            non_matching_slots = [slot for slot in ROULETTE_SLOTS if slot["number"] not in cleaned_numbers]
            result = random.choice(non_matching_slots)

        payout = int(apuesta * 36) if win else 0
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
    win = random.random() < 0.40
    payout = 0
    if win:
        payout = int(apuesta * GAME_MULTIPLIERS[game])
        player.saldo += Decimal(payout)
        message = f"¡Victoria en {game.capitalize()}! Ganaste {payout} Gs."
    else:
        player.saldo -= Decimal(apuesta)
        message = f"Derrota en {game.capitalize()}. Perdiste {apuesta} Gs."
    player.save()

    response = {
        "game": game,
        "win": win,
        "payout": payout,
        "message": message,
        "animation": "cards" if game in ["poker", "blackjack"] else "roulette",
    }
    if game in ["poker", "blackjack"]:
        response["player_cards"] = deal_cards(2)
        response["dealer_cards"] = deal_cards(2)
    if game == "bingo":
        response["bingo_cards"] = [random.sample([str(i) for i in range(1, 76)], 5) for _ in range(2)]
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
    return JsonResponse({"success": True, "transaction_id": transaction_id, "status": transaccion.status})

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

    if request.method == "POST":
        action = request.POST.get("action")
        if action == "recarga":
            recarga_form = TransactionForm(request.POST, request.FILES)
            if recarga_form.is_valid():
                transaction = recarga_form.save(commit=False)
                transaction.player = player
                transaction.estado = "pendiente"
                transaction.status = "pendiente"
                transaction.save()
                messages.success(request, "Solicitud de recarga enviada. Espera aprobación del cajero.")
                return redirect("casino:dashboard")
        elif action == "guardar_banco":
            bank_form = BankAccountForm(request.POST, instance=bank_account)
            if bank_form.is_valid():
                bank = bank_form.save(commit=False)
                bank.player = player
                bank.save()
                messages.success(request, "Método de pago guardado correctamente.")
                return redirect("casino:cajero")
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
        },
    )

@login_required
def tragamonedas(request):
    return render(request, "casino/tragamonedas.html", {"player": request.user})


@login_required
def poker(request):
    return render(request, "casino/poker.html", {"player": request.user})


@login_required
def blackjack(request):
    return render(request, "casino/blackjack.html", {"player": request.user})


@login_required
def bingo(request):
    return render(request, "casino/bingo.html", {"player": request.user})


@login_required
def ruleta(request):
    return render(request, "casino/ruleta.html", {"player": request.user})


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
    transacciones = Transaction.objects.filter(estado="pendiente").order_by("-creado_en")
    total_balance = sum((player.saldo or Decimal(0)) for player in Player.objects.all())
    stats = {
        "total_users": Player.objects.count(),
        "total_transactions": Transaction.objects.count(),
        "pending_transactions": Transaction.objects.filter(estado="pendiente").count(),
        "approved_transactions": Transaction.objects.filter(estado="aprobado").count(),
        "total_balance": int(total_balance),
        "jugadores": Player.objects.all().order_by("username"),
    }
    return render(request, "casino/admin_panel.html", {"transacciones": transacciones, **stats})


@login_required
@user_passes_test(is_admin)
def clientes(request):
    jugadores = Player.objects.all().order_by("username")
    return render(request, "casino/clientes.html", {"jugadores": jugadores})


@login_required
@user_passes_test(is_admin)
def approve_transaction(request, transaction_id):
    transaccion = get_object_or_404(Transaction, id=transaction_id, estado="pendiente")
    with db_transaction.atomic():
        transaccion.estado = "aprobado"
        transaccion.save()
        if transaccion.tipo == "recarga":
            player = transaccion.player
            player.saldo += transaccion.monto
            player.save()
    messages.success(request, "Carga aprobada y saldo acreditado.")
    return redirect("casino:admin_panel")

@login_required
@user_passes_test(is_admin)
def refund_transaction(request, transaction_id):
    transaccion = get_object_or_404(Transaction, id=transaction_id, estado="pendiente")
    with db_transaction.atomic():
        transaccion.estado = "reembolsado"
        transaccion.save()
        if transaccion.tipo == "recarga":
            pass
    messages.warning(request, "Transacción reembolsada y cancelada.")
    return redirect("casino:admin_panel")
