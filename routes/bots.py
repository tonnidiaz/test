import json
from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from bunnet import PydanticObjectId
from models.bot_model import Bot
from models.user_model import User
from utils.funcs.auth import validate
from utils.funcs.orders import OrderPlacer
from utils.functions import bot_log, err_handler, tuned_err
from utils.constants import scheduler
from models.order_model import Order
from utils.functions2 import add_bot_job

router = Blueprint("bots", __name__, url_prefix="/bots")

cnt = 0

@router.post('/create')
@jwt_required()
def create_bot_route():
    try:
        sub = validate(request)['sub']
        user = User.find_one(User.email == sub['email']).run()
        body = request.json
        if not user:
            return tuned_err(401, "Unautorized")
        user = User.find_one(User.username == body.get("user")).run()
        base, ccy = body.get('pair') if body.get('pair') else body.get('symbol')

        bot = Bot(
            name=body.get('name'),
            desc=body.get('desc') if body.get("desc") else "",
            interval=int(body.get('interval')),
            strategy=int(body.get('strategy')),
            base=base, ccy=ccy,
            demo=body.get('demo'),
            user=user.id,
            start_amt=float(body.get("start_amt"))
        )
 
        bot.save()
        print("BOT SAVED")
        user.bots.append(bot.id)
        user.save()
        print("USER SAVED")
        
        add_bot_job(bot)
        if not bot.active:
            scheduler.pause_job(str(bot.id))
        print("JOB ADDED")

        return json.loads(bot.model_dump_json())

    except Exception as e:
        err_handler(e)
        return tuned_err()


@router.get("/")
def get_apps_route():
    try:
        print("GET BOTS") 
        username = request.args.get('user')
        user = User.find_one(User.username == username).run()
        print(username)
        if username and not user:
            return tuned_err(404, "Page not found")

        bots = Bot.find(Bot.user == user.id).run() if username else Bot.find().run()
        bots = map(lambda x: json.loads(x.model_dump_json()), bots )
        bots = list(bots)
        return bots
    except Exception as e:
        err_handler(e)
        return tuned_err()

def populate_orders(bot: Bot):
    orders = Order.find(Order.bot == bot.id).run()
    orders = list(map(lambda x: json.loads(x.model_dump_json()), orders))
    return orders

@router.post("/<id>/edit")
@jwt_required()
def edit_bot_route(id):
    try:
        bot = Bot.find_one(Bot.id == PydanticObjectId(id)).run()
        if not bot:
            return tuned_err(404, "Bot not found")
        job_id = str(bot.id)
        fd = request.json
        key = fd.get('key')
        val = fd.get('val')
        
        if key == 'active':
            

            # check if scheduler contains job
            bl = scheduler.get_job(job_id)

            # If deactivating n job is avail
            if bl and val == False:
                scheduler.pause_job(job_id)
                bot_log(bot, "JOB PAUSED")

            elif val == True:
                bot_log(bot, "RESUMING JOB")
                if not bl:
                    # Add job if it does not exist already
                    add_bot_job(bot)
                else:
                    scheduler.resume_job(job_id)
            bot.set({key: val})


        elif key == "multi":
            for k, v in val.items():

                if k == "pair" or k == 'symbol':
                    bot.set({"base": v[0], "ccy": v[1]})

                bot.set({k: v})
        else:
            bot.set({fd.get('key'): fd.get('val')})
        bot.save()

        if key == 'multi' and bot.active:
            """ RESCHEDULE JOB BASED ON INTERVAL """
            if scheduler.get_job(job_id):
                scheduler.remove_job(job_id)
            add_bot_job(bot)   
            
            bot_log(bot, "JOB RESCHEDULED")
        bot.save()
        return {**json.loads(bot.model_dump_json()), "orders": populate_orders(bot)}
    
    except Exception as e:
        err_handler(e)
        return tuned_err()
    
@router.get('/<id>')
def get_bot_by_id(id):

    try:
        bot = Bot.find_one(Bot.id == PydanticObjectId(id)).run()
        if not bot:
            return tuned_err(404, "Bot not found")
        orders = populate_orders(bot)
        return {**json.loads(bot.model_dump_json()), "orders": orders}

    except Exception as e:
        err_handler(e)
        return tuned_err()
    
@router.post("/<id>/clear-orders")
@jwt_required()
def clear_orders_route(id):
    try:
        bot = Bot.find_one(Bot.id == PydanticObjectId(id)).run()
        if not bot:
            return tuned_err(404, "Bot not found")
        for oid in bot.orders:
            ord = Order.find_one(Order.id == oid).run()
            if ord:
                print(f"DELETING ORDER: {oid}...")
                ord.delete()
                bot.orders = list(filter( lambda x: x != oid, bot.orders))
                bot.save()
                print("ORDER DELEED\n")
        orders = populate_orders(bot)
        return {**json.loads(bot.model_dump_json()), "orders": orders}
    except Exception as e:
        err_handler(e)
        return tuned_err()