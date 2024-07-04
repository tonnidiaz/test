import json
from flask import Blueprint, request
import pandas as pd
from utils.funcs2 import on_backtest
from utils.functions import err_handler, tu_path
from utils.constants import dfs_dir

router = Blueprint('backtest', __name__)
test = False

@router.post('/backtest')
def backtest_route():
    try:
        return on_backtest(request.json, is_io=False)
    except Exception as e:
        err_handler(e)
        return 'Something went wrong', 500