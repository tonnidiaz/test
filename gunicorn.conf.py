# gunicorn.conf.py
import multiprocessing
import gunicorn
# Basic Gunicorn configuration
bind = '0.0.0.0:8000'
workers = 1# multiprocessing.cpu_count() * 2 + 1
worker_class = 'eventlet'  # Use 'eventlet' or 'gevent' for Socket.IO
timeout = 120  # Increase timeout if needed

# Memory management
max_requests = 1000
max_requests_jitter = 50
