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

                            # If the email already exists, give clearer guidance to the user

                            form.add_error("email", "Este correo ya está registrado. Si es tu correo, intenta iniciar sesión o recuperar la contraseña.")

                            return render(request, "casino/registro.html", {"form": form})



            is_gift_eligible = Player.objects.count() < 50

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

                # normalize email for consistent lookups

                identity = form.cleaned_data["email"].strip().lower()

                password = form.cleaned_data["password"]



                user = None
                player = None

                try:
                    player = Player.objects.get(email__iexact=identity)
                except Player.DoesNotExist:
                    try:
                        player = Player.objects.get(username__iexact=identity)
                    except Player.DoesNotExist:
                        player = None

                if player is not None:
                    user = authenticate(request, username=player.username, password=password)
                    if user is None and player.email:
                        user = authenticate(request, username=player.email, password=password)
                    if user is None and player.check_password(password):
                        user = player
                        user.backend = (
                            settings.AUTHENTICATION_BACKENDS[0]
                            if hasattr(settings, "AUTHENTICATION_BACKENDS") and settings.AUTHENTICATION_BACKENDS
                            else "django.contrib.auth.backends.ModelBackend"
                        )

                if user is None:
                    user = authenticate(request, username=identity, password=password)

                if user is None:
                    messages.error(request, "Usuario o contrase?a incorrectos.")
                    return render(request, "casino/login.html", {"form": form})

                if not getattr(user, "is_active", True):
                    user.is_active = True
                    user.save(update_fields=["is_active"])

                login(request, user)

                token = generar_jwt({"user_id": user.id, "username": user.username})
                request.session["jwt_token"] = token

                if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
                    return redirect("casino:admin_panel")

                return redirect("casino:dashboard")

            else:

                messages.error(request, "Por favor completa todos los campos correctamente.")

        except Exception as e:

            import logging, traceback

            logger = logging.getLogger(__name__)

            logger.exception("Error al iniciar sesión para %s: %s", request.POST.get('email'), e)

            # Also include full traceback in debug logs

            logger.debug(traceback.format_exc())

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

            "titulo": "FRUTAS DE FUEGO 777",

            "icono": "🔥",

            "slug": "frutas-de-fuego-777",

            "url": reverse("casino:tragamonedas_slug", kwargs={"slug": "frutas-de-fuego-777"}),

            "cover": "/static/img/games/777-strike.svg",

        },

        {

            "titulo": "EL PALACIO DEL ARLEQUÍN",

            "icono": "🃏",

            "slug": "palacio-arlequin",

            "url": reverse("casino:tragamonedas_slug", kwargs={"slug": "palacio-arlequin"}),

            "cover": "/static/img/games/joker-jackpot.svg",

        },

        {

            "titulo": "MANSIÓN EMBRUJADA",

            "icono": "👻",

            "slug": "mansion-embrujada",

            "url": reverse("casino:tragamonedas_slug", kwargs={"slug": "mansion-embrujada"}),

            "cover": "/static/img/games/betty-boris-boo.svg",

        },

        {

            "titulo": "CORONAS DE LA FORTUNA",

            "icono": "👑",

            "slug": "coronas-fortuna",

            "url": reverse("casino:tragamonedas_slug", kwargs={"slug": "coronas-fortuna"}),

            "cover": "/static/img/games/five-star.svg",

        },

        {

            "titulo": "RULETA IMPERIAL",

            "icono": "🎡",

            "slug": "ruleta-imperial",

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



SLOT_WIN_PROBABILITY = 0.25

SLOT_BONUS_TRIGGER_PROBABILITY = 0.03

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

    # Per-game minimums: tragamonedas (500 Gs), ruleta (2000 Gs), default 2000
    if game == "tragamonedas":
        min_bet = 500
    elif game == "ruleta":
        min_bet = 2000
    else:
        min_bet = 2000

    if apuesta < min_bet:
        return JsonResponse({"success": False, "error": f"La apuesta mínima es de {min_bet:,} Gs."})

    if game not in GAME_MULTIPLIERS:
        return JsonResponse({"success": False, "error": "Juego desconocido."})

    # Adjust odds for players with very high balances to make large wins rarer
    effective_slot_prob = SLOT_WIN_PROBABILITY
    effective_jackpot_prob = JACKPOT_PROBABILITY
    try:
        user_balance = float(player.saldo)
    except Exception:
        user_balance = 0.0
    # If player has reached or exceeded 200_000 Gs, make wins much rarer
    if user_balance >= 200000:
        effective_slot_prob = max(0.01, effective_slot_prob * 0.1)  # reduce chance to 10% of base, min 1%
        effective_jackpot_prob = max(0.0001, effective_jackpot_prob * 0.05)  # make jackpot extremely rare



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

                if is_jackpot_eligible(player) and secure_bool(effective_jackpot_prob):

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

            win = secure_bool(effective_slot_prob)

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

        if payload is None:

            payload = {}



        # Parse selected numbers and colors (support both)

        selected_numbers = payload.get("selected_numbers", payload.get("selected_number"))

        selected_colors = payload.get("selected_colors", [])



        # normalize inputs to lists

        if isinstance(selected_numbers, (str, int)):

            selected_numbers = [selected_numbers]

        elif selected_numbers is None:

            selected_numbers = []

        elif not isinstance(selected_numbers, list):

            return JsonResponse({"success": False, "error": "Formato de apuesta para la ruleta inválido."})



        if isinstance(selected_colors, (str, int)):

            selected_colors = [selected_colors]

        elif not isinstance(selected_colors, list):

            selected_colors = []



        # Validate numbers

        validated_numbers = []

        for number in selected_numbers:

            try:

                number = int(number)

            except (ValueError, TypeError):

                return JsonResponse({"success": False, "error": "Selecciona números válidos para la ruleta."})

            if number < 0 or number > 36:

                return JsonResponse({"success": False, "error": "Número de ruleta inválido."})

            validated_numbers.append(number)



        # Normalize color names (support 'azul','verde','green','rojo','negro')

        def normalize_color_name(val):

            if not val:

                return None

            s = str(val).strip().lower()

            if s in ("blue", "azul"):

                return "green"

            if s in ("verde", "green"):

                return "green"

            if s in ("red", "rojo"):

                return "red"

            if s in ("black", "negro"):

                return "black"

            return s



        validated_colors = []

        for c in selected_colors:

            nc = normalize_color_name(c)

            if nc:

                validated_colors.append(nc)



        # Require at least one selection (number or color)

        if not validated_numbers and not validated_colors:

            return JsonResponse({"success": False, "error": "Selecciona al menos un número o color para la ruleta."})



        # Single-stake policy: one apuesta per spin regardless of how many selections

        total_stake = int(apuesta)

        if total_stake <= 0:

            return JsonResponse({"success": False, "error": "La apuesta debe ser mayor que cero."})

        if total_stake > player.saldo:

            return JsonResponse({"success": False, "error": "Saldo insuficiente para esta apuesta."})



        # Pick result

        result = pick_roulette_result()



        # Determine payouts

        payout_net = 0  # net gain to add to player's saldo (excludes stake)
        payout_gross = 0  # gross amount awarded on successful bets

        landed_num = result["number"]

        landed_color = result.get("color")

        # normalize landed color

        landed_color = normalize_color_name(landed_color)



        # For number bets: if any selected number matches landed number, pay number multiplier (36x gross)

        if validated_numbers:

            if landed_num in validated_numbers:

                # Single-number bets keep the full 36x return. Multi-number tickets use a reduced
                # effective multiplier to preserve the intended house edge while still allowing
                # a single stake to cover several selections.
                multiplier = 36 if len(validated_numbers) <= 1 else 32.25
                gross = int(Decimal(apuesta) * Decimal(multiplier))

                payout_gross += gross
                payout_net += gross



        # For color bets: pay per matching color

        for col in validated_colors:

            if col == landed_color:

                mult = 35 if col == 'green' else 2

                gross = int(Decimal(apuesta) * Decimal(mult))

                payout_gross += gross
                payout_net += gross



        # Apply result to player balance

        if payout_net > 0:

            player.saldo += Decimal(payout_net)

            win = True

            message = f"¡Victoria en Ruleta! Salió {landed_num} ({landed_color}) y ganaste Gs. {int(payout_net)}"

        else:

            # no payout -> player loses the stake

            player.saldo -= Decimal(total_stake)

            win = False

            message = f"Derrota en Ruleta. Salió {landed_num} ({landed_color}) y perdiste Gs. {total_stake}"



        player.save()



        response = {

            "game": game,

            "win": win,

            "payout": int(payout_gross) if payout_gross > 0 else -int(total_stake),

            "message": message,

            "animation": "roulette",

            "roulette": result,

            "selected_numbers": validated_numbers,

            "selected_colors": validated_colors,

            "selected_number": result["number"],

            "selected_color": result.get("color"),

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

        "frutas-de-fuego-777": {"title": "FRUTAS DE FUEGO 777", "theme": "fruits", "jackpots": ["FUEGO","CORONADO","DORADO","MENOR"]},

        "palacio-arlequin": {"title": "EL PALACIO DEL ARLEQUÍN", "theme": "harlequin", "jackpots": ["JOKER","GRAND","MAJOR","MINOR"]},

        "mansion-embrujada": {"title": "MANSIÓN EMBRUJADA", "theme": "gothic", "jackpots": ["ESPECTRO","PLATA","BRONCE","MENOR"]},

        "coronas-fortuna": {"title": "CORONAS DE LA FORTUNA", "theme": "crowns", "jackpots": ["CORONA","REAL","FORTUNAS","MENOR"]},

    }

    meta = default.get(slug, default["frutas-de-fuego-777"]) if slug else default["frutas-de-fuego-777"]

    return render(request, "casino/tragamonedas.html", {"player": request.user, "game_slug": slug or "frutas-de-fuego-777", "game_meta": meta})

@login_required

def ruleta(request):

    return render(request, "casino/ruleta.html", {"player": request.user})



# Poker removed by request; the poker page is disabled and the poker route is no longer available.



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







