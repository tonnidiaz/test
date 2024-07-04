from flask import Blueprint

router = Blueprint("apps", __name__)

@router.post('/apps/create')
def create_app_route():
    return 'Hold...'