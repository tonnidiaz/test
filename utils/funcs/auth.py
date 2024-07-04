import datetime
from dotenv import load_dotenv
from flask_jwt_extended import create_access_token
import jwt, os

load_dotenv()

def validate(request):
    token = request.headers['Authorization'].split(' ')[1]
    info = jwt.decode(token, os.getenv('JWT_SECRET_KEY'), algorithms=['HS256'])
    return info

def gen_token(identity, time={'h' : 24}):
    
    k = list(time.keys())[0] 
    v = list(time.values())[0]
    if k == 'h':
        token = create_access_token(identity=identity, expires_delta=datetime.timedelta(hours=v))

    elif k == 'm':
        token = create_access_token(identity=identity, expires_delta=datetime.timedelta(minutes=v))

    return token