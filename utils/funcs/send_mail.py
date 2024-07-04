from utils.constants import details
from flask_mail import Message, Mail
from utils.functions import err_handler

mail = Mail()

def send_mail(subject, body, recipients, res=None):
    mail_html = f"""
                        <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style type="text/css">
              .tb {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif  !important;
                margin: auto;
                padding: 10px;
                color: black;
              }}
        
              .btn {{
                cursor: pointer;
                display: inline-block;
                min-height: 1em;
                outline: 0;
                border: none;
                vertical-align: baseline;
                background: #e0e1e2 none;
                color: rgba(0, 0, 0, 0.6);
                font-family: Lato, "Helvetica Neue", Arial, Helvetica, sans-serif;
                margin: 0 0.25em 0 0;
                padding: 10px 16px;
                text-transform: none;
                text-shadow: none;
                font-weight: 600;
                line-height: 1em;
                font-style: normal;
                text-align: center;
                text-decoration: none;
                border-radius: 0.28571429rem;
                box-shadow: inset 0 0 0 1px transparent,
                  inset 0 0 0 0 rgba(34, 36, 38, 0.15);
                -webkit-user-select: none;
                -ms-user-select: none;
                user-select: none;
                transition: opacity 0.1s ease, background-color 0.1s ease,
                  color 0.1s ease, box-shadow 0.1s ease, background 0.1s ease;
                will-change: "";
                -webkit-tap-highlight-color: transparent;
              }}
              .btn-primary {{
                color: #fff !important;
                background-color: #0d6efd !important;
                border-color: #0d6efd !important;
              }}
              .btn-danger {{
                color: #fff !important;
                background-color: #fd950d !important;
                border-color: #fd950d !important;
             }}
        a{{
          color: #f08800 !important;
          font-weight: 600 !important;
        }}
              table {{
                width: 100%;
                border-radius: 10px !important;
                padding: 5px;
                border-collapse: collapse;
              }}
        
              td,
              th {{
                border: 2px solid #8f8f8f;
                text-align: left;
                padding: 8px;
              }}
        
              tr:nth-child(even) {{
                background-color: #e6e6e6;
              }}
        
              .otp {{
                /*background-color: #c4c4c4;
                border: 2px dashed #d37305;
                padding: 10px;
                border-radius: 5px;
                width: 150px;
                text-align: center;
                font-weight: 700;
                letter-spacing: 6;
                font-family: monospace;
                font-size: 20px;*/
              }}
              .text-c{{
                text-align: center !important;
              }}

              .m-auto{{
                margin: 0 auto;
              }}
            </style>
          </head>
          <body>
  
              <div class="tb">
              <h2>{details['title']}</h2>
              {body}
              <p>For support please contact the Developer at <a href="mailto:{details['developer']['email']}">{details['developer']['email']}</a></p>
              </div>
  
          </body>
          </html>
            """
    msg = Message(
    subject= subject,
    sender=details['admin_email'],
    recipients=recipients)

    msg.html = mail_html
    try:
        mail.send(msg)
        return {"message" :'Email sent successfully'} if res is None else res
    except Exception as e:
        err_handler(e)
        return {'msg': "Could not send email"}, 500
