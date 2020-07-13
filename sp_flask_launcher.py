from sp_app import app, db
# from sp_app.models import User, DataSet
from sp_app.models import User


@app.shell_context_processor
def make_shell_context():
    return {'db':db, 'User':User}
