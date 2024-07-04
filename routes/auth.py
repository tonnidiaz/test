import json
import os
from random import randint
from flask import Blueprint, request
from flask_bcrypt import Bcrypt
from pydantic import validate_email
from classes.binance import Binance
from models.user_model import User
from utils.funcs.auth import gen_token, validate
from utils.funcs.send_mail import send_mail
from utils.functions import err_handler, tuned_err
from utils.constants import details
from flask_jwt_extended import  jwt_required

from utils.functions2 import is_email

router = Blueprint('auth', __name__)
bcrypt = Bcrypt()

@router.post('/auth/signup')
def signup_route():

    body = request.json
    try:
        email = body.get('email')
        username = body.get('username')
        password = body.get('password')
        existing_email = User.find_one(User.email == email).run()
        existing_username = User.find_one(User.username == username).run()
        hashed_pass = bcrypt.generate_password_hash(password)

        if existing_email:
            if existing_email.is_verified:
                return tuned_err(400, f'User with email {email} already exists!')
            else:
                existing_email.delete()

        if existing_username:
            if existing_username.is_verified:
                return tuned_err(400, f'User with username {username} already exists!')
            else:
                existing_username.delete()

        otp = randint(1000, 9999)
        print(f"\n{otp}\n")
        user = User(email=email, username = username,
                    password=hashed_pass, otp=otp)
        user.save()

        return send_mail(subject=f"{details['title']} signup email", body=f"""<h2 style="font-weight: 500; font-size: 1.2rem;">Here is your signup verification OTP:</h2>
                    <p style="font-size: 20px; font-weight: 600">{user.otp}</p>""", recipients=[email], res={'msg':  'Signup successful'}) if os.environ['ENV'] == 'prod' else {'msg': 'Email sent successfully'}

    except Exception as e:
        err_handler(e)
        return tuned_err(msg="Signup failed")

@router.post('/auth/login')
@jwt_required(optional=True)
def login_route():

    try:
        body = request.json
        username = body.get('username')
        password = body.get('password')
        print(username)
        if not password:
            #Loging in with token
            sub = validate(request)['sub']
            user = User.find_one(User.email == sub['email']).run()
            
            if not user:
                return tuned_err(401, "Unauthorized")

            return {"user": json.loads(user.model_dump_json()) }
           
        elif (username and password):
            m_is_email = is_email(username)
            user = User.find_one(User.email == username if m_is_email else User.username == username).run()

            if (not user):
                return tuned_err(401, "Account does not exists.")
            
            pass_valid = bcrypt.check_password_hash(bytes(user.password, encoding='utf-8'), password)

            if not pass_valid:
                return tuned_err(401, "Incorrect password")

            token = gen_token({ 'email': user.email })

            return { 'user': { **json.loads(user.model_dump_json()), 'password': password }, 'token': token }
        else:
            return tuned_err(400, "Provide all fields")
    
    except Exception as e:
        err_handler(e)
        return tuned_err()
    
@router.post('/auth/verify-email')
def verify_email_route():
     
    body = request.json
    email = body.get('email')
    otp = body.get('otp')

    try:
        user = User.find_one(User.email == email ).run()
        if not user:
            return tuned_err(400, 'Restart the signup process')

        if not otp:
            otp = randint(1000, 9999)
            #TODO: Send real pin
            print(otp)
            user.otp = otp
        
        else:
            if user.otp == int(otp):
                user.is_verified = True

            else:
                return tuned_err(400, "Incorrect OTP")

        user.save()
        token = gen_token({'email': user.email})
        return {"user": json.loads(user.model_dump_json()), "token": token}

    except Exception as e:
        err_handler(e)
        return tuned_err(500, 'Something went wrong')
