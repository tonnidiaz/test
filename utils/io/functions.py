from flask_socketio import emit
from models.user_model import User
from utils.funcs2 import on_backtest
from utils.functions import err_handler
from utils.io.io import socketio
test = False
 
@socketio.on('connect')
def test_connect():
    print(f'Connected')
    return
    if msg:
        uname = msg.get('username')
        user = User.find_one(User.username == uname).run()
        if not user:
            raise ConnectionRefusedError("Unauthorised")

        print(request.sid)
        user.io_id = request.sid
        user.save()
        print("USER IO ID UPDATED")
        

@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected: ')

print("IO FUNCS")


@socketio.on('backtest') 
def _on_backtest(body):
    try:
        print("ON BACKTEST", body)
        on_backtest(body)

    except Exception as e:
        err_handler(e)
        emit('backtest', {"err": "Something went wrong"})
        return 'Something went wrong', 500


@socketio.on_error()
def on_err(err):
    print(f"ON ERR {err}")

