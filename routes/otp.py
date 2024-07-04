import json
from random import randint
from flask import Blueprint, request

from models.user_model import User
from utils.funcs.auth import gen_token
from utils.funcs.send_mail import send_mail
from utils.functions import err_handler, tuned_err
from utils.constants import details

base = "/auth/otp"
router = Blueprint("otp", __name__)

@router.post(f"{base}/resend")
def resend_route():

    try:
        body = request.json
        email = body.get('email')
        user = User.find_one(User.email == email).run()

        if not user:
            return tuned_err(400, "User does not exist")
        
        otp = randint(1000, 9999)
        print(otp)
        user.otp = otp
        user.save()

        try:
            return send_mail(f"{details['title']} Verification Email",
                f"""<h2 style="font-weight: 500; font-size: 1.2rem;">Here is your Email verification OTP:</h2>
                    <p class='m-auto' style="font-size: 20px; font-weight: 600">{otp}</p>""", recipients=[email])
        
        except Exception as e:
            err_handler(e)
            return tuned_err(msg="Failed to send email")
    
    except Exception as e:
        err_handler(e)
        return tuned_err()
    
@router.post(f"{base}/verify")
def verify_route():

    try:

        body = request.json
        otp = body.get('otp')
        email = body.get('email')
        new_email = body.get('new_email')

        if not otp: return tuned_err(400, "tuned:Please provide OTP.")
        if email:
            # Email verification
            
            user = User.find_one(User.email == email).run()
            if (not user):
                return tuned_err(400, f"Account with email: {email} does not exist!")
            
            if user.otp != otp:
                return tuned_err(400, "Incorrect OTP.")
        
            user.is_verified = True

        elif new_email:
            user = User.find_one(User.new_email == new_email).run()
            if not user:
                return tuned_err(400, "Incorrect credentials!")
            
            if user.otp != otp:
                return tuned_err( 400, "tuned:Incorrect OTP");
            #Asign new email to email
            user.email = new_email

        user.save()
        token = gen_token({"email": user.email })
        return { "user": json.loads(user.model_dump_json()), 'token': token }
        
    except Exception as e:
        err_handler(e)
        return tuned_err()