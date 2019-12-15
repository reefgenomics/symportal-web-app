import os

class Config(object):
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'there_was_a_lady_from_nantucket'