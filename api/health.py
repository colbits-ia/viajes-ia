import json

def handler(request):
    """
    Handler para el endpoint de salud
    """
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'status': 'ok',
            'message': 'Servidor funcionando correctamente'
        })
    }