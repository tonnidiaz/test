import eventlet
eventlet.monkey_patch()
import server_reloader
from datetime import timedelta
import json
import os
from dotenv import load_dotenv
from flask import Flask, request
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from models.bot_model import Bot
from models.user_model import User
from routes.backtest import router as backtest_bp
from routes.auth import router as auth_bp
from routes.otp import router as otp_bp
from routes.bots import router as bots_bp
from flask_cors import CORS
from utils.functions2 import add_bot_job
from utils.mongo import TuMongo
from utils.io.io import socketio
from utils.constants import scheduler
import gunicorn
from models.order_model import Order
from models.bot_model import Bot
from strategies.main import strategies
from utils.consts import platforms
from utils.io.functions import *
load_dotenv()
g = gunicorn
# Init mongo
TuMongo()


def configure(app: Flask):
    app.config["JWT_SECRET_KEY"] = os.getenv('JWT_SECRET_KEY')
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=48)

    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['MAIL_SERVER'] = "smtp.gmail.com"
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USE_SSL'] = False
    #app.config['MAIL_DEBUG'] = True
    app.config['MAIL_USERNAME'] = os.getenv('ADMIN_EMAIL')
    app.config['MAIL_PASSWORD'] = os.getenv('ADMIN_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('ADMIN_EMAIL')

def init():

    # Create app if not present
    if os.environ['ENV'] == "prod":
        return
    
    """ apps = App.find().run()
    if not len(apps):
        # Creating new
        App().save()
    else:
        print(apps[0]) """
    
app = Flask(__name__)

CORS(app, origins="*")


app.register_blueprint(backtest_bp)
app.register_blueprint(auth_bp) 
app.register_blueprint(otp_bp)
app.register_blueprint(bots_bp)

class Config:
    SCHEDULER_API_ENABLED = True
app.config.from_object(Config)

configure(app)
mail = Mail(app)
JWTManager(app)

socketio.init_app(app, cors_allowed_origins="*", logger=False, engineio_logger=False)



""" @socketio.on('backtest')
def _on_backtest(data):
    print('\nON BACKTEST\n')
    on_backtest(data) """


init()

cnt = 0



TIME_CHECKER_JOB_ID = "TIME_CHECKER_JOB"


""" @scheduler.task("interval", id=TIME_CHECKER_JOB_ID, seconds=1, misfire_grace_time=900)
def tc_job():

    with scheduler.app.app_context():
        global cnt
        print(cnt)
        cnt += 1 """
 
scheduler.app = app
scheduler.init_app(app)


@app.get("/")
def index_route():
    return 'OHK'

@app.get("/orders")
def orders_route():
    orders: list[Order] = Order.find().run()
    orders = list(map(lambda x: json.loads(x.model_dump_json()), orders))
    return orders

@app.get('/strategies')
def strategies_route():
    return strategies

@app.get('/platforms')
def platforms_routes_route():
    data = list(map( lambda x: x.name.lower(), platforms))
    return data

""" @app.get('/backtest')
def strategies_route():
    try:
        return on_backtest(request.json, is_io=False)
    except Exception as e:
        err_handler(e)
        return 'Something went wrong', 500 """


def resume_bots():
    # Check for active bots and add jobs for 'em
    active_bots = Bot.find(Bot.active == True).run()
    for bot in active_bots:
        add_bot_job(bot)
scheduler.start()
resume_bots()
def start_app():
    
    socketio.run( app, debug=False, port=8000)

def on_reload():
    print("\nRELOADING...\n")
    os.system('cls' if os.name == 'nt' else 'clear')

def main():
    print("MAIN") 
    """ start_app()
    return """
    server_reloader.main(start_app, before_reload=on_reload)
    #start_app()

#main()
if __name__ == '__main__':
    main()

    