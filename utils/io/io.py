from flask_socketio import SocketIO


socketio : SocketIO = SocketIO(ping_interval=25, ping_timeout=120 * 1000)