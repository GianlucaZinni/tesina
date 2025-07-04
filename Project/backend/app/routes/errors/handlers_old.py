# ~/backend.app /backend/src/Routes/errores/handlers.py
from flask import Blueprint, render_template

errors = Blueprint('errors', __name__)

"""
En esta hoja se encuentran los handler con redireccionamiento a templates de error.
"""


"""
Error 404 - Not Found
la URL a la que está intentando acceder no existe. 
"""
@errors.app_errorhandler(404)
def error_404(error):
    return render_template('errors/404.html'), 404


"""
Error 403 - Forbidden 
significa que se ha intentado acceder a una pagina o recurso del cual
el usuario no tiene acceso.
"""
@errors.app_errorhandler(403)
def error_403(error):
    return render_template('errors/403.html'), 403


"""
Error 500 - Internal server error 
significa que ha sucedido un error al intentar acceder al servidor, 
pero no se puede dar mas detalles sobre lo que ha ocurrido.
"""
@errors.app_errorhandler(500)
def error_500(error):
    return render_template('errors/500.html'), 500

""" 
Error 401 - Unauthorized
el servidor ha podido ser contactado, y ha recibido una petición válida, 
pero ha denegado el acceso a la acción que se solicita.
"""
@errors.app_errorhandler(401)
def error_401(error):
    return render_template('errors/401.html'), 401

""" 
Error 501 - Code Expired
el request reset password token ha vencido
"""
@errors.app_errorhandler(501)
def error_501(error):
    return render_template('errors/501.html'), 501