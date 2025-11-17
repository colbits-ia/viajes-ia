from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
import requests
from dotenv import load_dotenv
from pathlib import Path

# Obtener la ruta del directorio donde está este archivo
BASE_DIR = Path(__file__).resolve().parent

# Cargar variables de entorno desde el archivo .env en el mismo directorio
load_dotenv(dotenv_path=BASE_DIR / '.env')

app = Flask(__name__)
CORS(app)  # Permitir peticiones desde el frontend

# Almacenar historial de conversaciones por sesión
# En producción, usar una base de datos o Redis
historial_conversaciones = {}

# Configurar la API key de Gemini
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
***REMOVED***
# API key de Unsplash
***REMOVED***
# API key de ExchangeRate-API
***REMOVED***

model = None
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    # Usar el modelo Gemini 2.5 Flash
    try:
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        print("✅ Modelo configurado: models/gemini-2.5-flash")
    except Exception as e:
        print(f"⚠️ Error al configurar el modelo: {str(e)}")
        model = None
else:
    print("⚠️ ADVERTENCIA: No se encontró GEMINI_API_KEY. La aplicación funcionará sin IA.")

def obtener_clima(ciudad):
    """
    Obtiene el clima actual de una ciudad usando OpenWeatherMap API
    """
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather"
        params = {
            'q': ciudad,
            'appid': OPENWEATHER_API_KEY,
            'units': 'metric',  # Temperatura en Celsius
            'lang': 'es'  # Respuestas en español
        }
        
        response = requests.get(url, params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            # Calcular diferencia horaria (timezone offset en segundos)
            timezone_offset = data.get('timezone', 0)  # Offset en segundos
            horas_diferencia = timezone_offset / 3600
            
            clima = {
                'ciudad': data['name'],
                'pais': data['sys']['country'],
                'temperatura': data['main']['temp'],
                'sensacion_termica': data['main']['feels_like'],
                'descripcion': data['weather'][0]['description'].capitalize(),
                'humedad': data['main']['humidity'],
                'viento': data['wind']['speed'] if 'wind' in data else 0,
                'icono': data['weather'][0]['icon'],
                'diferencia_horaria': horas_diferencia,
                'codigo_pais': data['sys']['country']
            }
            return clima
        else:
            return None
    except Exception as e:
        print(f"Error al obtener clima: {str(e)}")
        return None

def obtener_tipo_cambio(codigo_moneda_destino='USD'):
    """
    Obtiene el tipo de cambio usando ExchangeRate-API
    """
    try:
        # Primero obtener el tipo de cambio base (USD)
        url = f"https://v6.exchangerate-api.com/v6/{EXCHANGERATE_API_KEY}/latest/USD"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('result') == 'success':
                tasas = data.get('conversion_rates', {})
                # Obtener tasa para la moneda del destino
                tasa_destino = tasas.get(codigo_moneda_destino, 1)
                return {
                    'moneda_base': 'USD',
                    'moneda_destino': codigo_moneda_destino,
                    'tasa_cambio': tasa_destino,
                    'fecha': data.get('time_last_update_utc', '')
                }
        return None
    except Exception as e:
        print(f"Error al obtener tipo de cambio: {str(e)}")
        return None

def obtener_codigo_moneda_por_pais(codigo_pais):
    """
    Mapea código de país a código de moneda
    """
    mapeo_monedas = {
        'US': 'USD', 'MX': 'MXN', 'CA': 'CAD', 'GB': 'GBP', 'FR': 'EUR',
        'ES': 'EUR', 'IT': 'EUR', 'DE': 'EUR', 'JP': 'JPY', 'CN': 'CNY',
        'IN': 'INR', 'BR': 'BRL', 'AR': 'ARS', 'CL': 'CLP', 'CO': 'COP',
        'PE': 'PEN', 'CH': 'CHF', 'AU': 'AUD', 'NZ': 'NZD', 'KR': 'KRW',
        'TH': 'THB', 'SG': 'SGD', 'MY': 'MYR', 'ID': 'IDR', 'PH': 'PHP',
        'VN': 'VND', 'TR': 'TRY', 'RU': 'RUB', 'ZA': 'ZAR', 'EG': 'EGP',
        'AE': 'AED', 'SA': 'SAR', 'IL': 'ILS', 'NO': 'NOK', 'SE': 'SEK',
        'DK': 'DKK', 'PL': 'PLN', 'CZ': 'CZK', 'HU': 'HUF', 'GR': 'EUR',
        'PT': 'EUR', 'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR', 'FI': 'EUR',
        'IE': 'EUR', 'LU': 'EUR'
    }
    return mapeo_monedas.get(codigo_pais, 'USD')

def obtener_fotos_unsplash(destino, cantidad=3):
    """
    Obtiene fotos hermosas de un destino usando Unsplash API
    """
    try:
        url = "https://api.unsplash.com/search/photos"
        headers = {
            'Authorization': f'Client-ID {UNSPLASH_ACCESS_KEY}'
        }
        params = {
            'query': destino,
            'per_page': cantidad,
            'orientation': 'landscape',
            'order_by': 'popularity'
        }
        
        response = requests.get(url, headers=headers, params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            fotos = []
            for foto in data.get('results', [])[:cantidad]:
                fotos.append({
                    'url': foto['urls']['regular'],
                    'url_pequeña': foto['urls']['small'],
                    'url_grande': foto['urls']['full'],
                    'autor': foto['user']['name'],
                    'descripcion': foto.get('description', '') or foto.get('alt_description', '')
                })
            return fotos
        else:
            print(f"Error en Unsplash API: {response.status_code}")
            # Si falla, intentar con Pixabay como respaldo
            return obtener_fotos_pixabay(destino, cantidad)
    except Exception as e:
        print(f"Error al obtener fotos de Unsplash: {str(e)}")
        # Intentar con Pixabay como alternativa
        return obtener_fotos_pixabay(destino, cantidad)

def obtener_fotos_pixabay(destino, cantidad=3):
    """
    Obtiene fotos de un destino usando Pixabay API (no requiere key para uso básico)
    """
    try:
        # Pixabay permite acceso sin key con límites
        url = "https://pixabay.com/api/"
        params = {
            'key': '9656065-a4094594c34c9ac8c8dfde6dc',  # Key pública de demo
            'q': destino,
            'image_type': 'photo',
            'orientation': 'horizontal',
            'category': 'travel',
            'per_page': cantidad,
            'safesearch': 'true'
        }
        
        response = requests.get(url, params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            fotos = []
            for foto in data.get('hits', [])[:cantidad]:
                fotos.append({
                    'url': foto['webformatURL'],
                    'url_pequeña': foto['previewURL'],
                    'url_grande': foto['largeImageURL'],
                    'autor': foto.get('user', 'Desconocido'),
                    'descripcion': foto.get('tags', destino)
                })
            return fotos
        else:
            return None
    except Exception as e:
        print(f"Error al obtener fotos de Pixabay: {str(e)}")
        return None

@app.route('/api/planificar', methods=['POST'])
def planificar_viaje():
    """
    Endpoint para recibir preguntas del usuario sobre planificación de viajes
    y obtener respuestas de Gemini
    """
    data = request.get_json()
    pregunta = data.get('pregunta', '')
    datos_viaje = data.get('datosViaje', {})
    session_id = data.get('session_id', 'default')
    historial = data.get('historial', [])
    
    if not pregunta:
        return jsonify({'error': 'No se proporcionó una pregunta'}), 400
    
    # Si no hay API key configurada, devolver mensaje de error
    if not model:
        return jsonify({
            'error': 'API key de Gemini no configurada. Por favor, configura GEMINI_API_KEY en el archivo .env'
        }), 500
    
    try:
        # Construir contexto del formulario si está disponible
        contexto_formulario = ""
        info_clima = ""
        contexto_historial = ""
        destino = ""
        
        # Construir contexto del historial de conversación
        es_pregunta_adicional = historial and len(historial) > 0
        
        if es_pregunta_adicional:
            # Extraer información del destino de conversaciones anteriores
            destino_anterior = ""
            for conversacion in historial:
                if 'destino' in conversacion or datos_viaje.get('destino'):
                    destino_anterior = datos_viaje.get('destino', '')
                    break
            
            contexto_historial = "\nCONTEXTO DE CONVERSACIONES ANTERIORES:\n"
            contexto_historial += f"El usuario ya ha consultado sobre un viaje a {destino_anterior if destino_anterior else 'un destino'}.\n"
            contexto_historial += "Últimas conversaciones:\n"
            for i, conversacion in enumerate(historial[-3:]):  # Últimas 3 conversaciones
                contexto_historial += f"- Usuario: {conversacion.get('pregunta', '')}\n"
                contexto_historial += f"  Alex: {conversacion.get('respuesta', '')[:150]}...\n"
            contexto_historial += "\nIMPORTANTE: Si el usuario pregunta sobre 'allí', 'ese lugar', 'el destino', 'el transporte allí', etc., se refiere al destino mencionado en las conversaciones anteriores.\n"
        
        if datos_viaje:
            destino = datos_viaje.get('destino', '')
            fecha = datos_viaje.get('fecha', '')
            presupuesto = datos_viaje.get('presupuesto', '')
            preferencia = datos_viaje.get('preferencia', '')
            
            if destino or fecha or presupuesto or preferencia:
                contexto_formulario = f"""
INFORMACIÓN DEL VIAJE DEL USUARIO:
- Destino: {destino if destino else 'No especificado'}
- Fecha: {fecha if fecha else 'No especificada'}
- Presupuesto: {presupuesto if presupuesto else 'No especificado'}
- Preferencia: {preferencia if preferencia else 'No especificada'}

Usa esta información para personalizar tus respuestas y hacer recomendaciones más específicas.
"""
        
        # Obtener clima del destino si está disponible
        info_panel = {}
        if destino:
            clima = obtener_clima(destino)
            if clima:
                info_clima = f"""
CLIMA ACTUAL EN {clima['ciudad'].upper()}, {clima['pais']}:
- Temperatura: {clima['temperatura']}°C
- Sensación térmica: {clima['sensacion_termica']}°C
- Condiciones: {clima['descripcion']}
- Humedad: {clima['humedad']}%
- Viento: {clima['viento']} km/h

Incluye esta información del clima en tu respuesta, especialmente en la sección de CONSEJOS LOCALES para dar recomendaciones sobre qué ropa llevar o actividades según el clima.
"""
                # Preparar información para el panel lateral
                codigo_moneda = obtener_codigo_moneda_por_pais(clima.get('codigo_pais', 'US'))
                tipo_cambio = obtener_tipo_cambio(codigo_moneda)
                
                info_panel = {
                    'temperatura': round(clima['temperatura'], 1),
                    'descripcion_clima': clima['descripcion'],
                    'icono_clima': clima['icono'],
                    'diferencia_horaria': round(clima.get('diferencia_horaria', 0), 1),
                    'tipo_cambio': tipo_cambio,
                    'moneda': codigo_moneda,
                    'ciudad': clima['ciudad'],
                    'pais': clima['pais']
                }
        
        # Crear el prompt para Gemini con personalidad de Alex
        if es_pregunta_adicional:
            # Para preguntas adicionales: respuesta concisa y directa
            prompt = f"""Eres Alex, un consultor personal de viajes entusiasta y amigable. 

INSTRUCCIONES PARA ESTA RESPUESTA:
- Esta es una pregunta adicional del usuario, NO repitas la información completa del viaje
- Responde de forma CONCISA y DIRECTA a la pregunta específica
- Usa markdown para formatear: **negritas**, *cursivas*, listas con - o números
- Incluye emojis relevantes
- Sé entusiasta pero breve
- NO uses la estructura completa de CLIMA, ALOJAMIENTO, etc. a menos que la pregunta lo requiera específicamente

{contexto_historial}
{contexto_formulario}
{info_clima}

PREGUNTA DEL USUARIO:
{pregunta}

Responde como Alex de forma CONCISA y DIRECTA a esta pregunta específica. Si pregunta sobre "allí", "ese lugar", "el transporte allí", etc., se refiere al destino mencionado en conversaciones anteriores. NO repitas toda la información del viaje, solo responde lo que se pregunta."""
        else:
            # Para la primera pregunta: respuesta completa con estructura
            prompt = f"""Eres Alex, un consultor personal de viajes entusiasta y amigable. 

INSTRUCCIONES DE PERSONALIDAD:
- Preséntate siempre como **Alex, tu consultor personal de viajes** 🧳 (usa markdown para negritas: **texto**)
- Sé entusiasta, amigable y cercano en todas tus respuestas
- Haz preguntas para conocer mejor las preferencias del usuario (presupuesto, tipo de viaje, fechas, intereses, etc.)
- Incluye emojis de viajes relevantes en tus respuestas (✈️ 🏖️ 🗺️ 🎒 🌍 🏨 🍽️ 🎫 📸 etc.)
- Muestra pasión por los viajes y la aventura
- Usa markdown para formatear: **negritas**, *cursivas*, listas con - o números

FORMATO OBLIGATORIO DE RESPUESTA:
SIEMPRE debes estructurar tu respuesta usando esta estructura exacta (puedes usar emojis):

**CLIMA ACTUAL** 🌤️
[Información del clima actual del destino con temperatura, condiciones y recomendaciones sobre qué ropa llevar]

**ALOJAMIENTO** 🏨
[Recomendaciones de hoteles, hostales, o lugares para quedarse con bullets]

**COMIDA LOCAL** 🍽️
[Recomendaciones de restaurantes, platos típicos, lugares para comer con bullets]

**LUGARES IMPERDIBLES** 📸
[Atracciones, sitios turísticos, lugares que no se pueden perder con bullets]

**CONSEJOS LOCALES** 💡
[Tips especiales, recomendaciones locales, cosas que saber con bullets. Si hay información del clima, inclúyela aquí]

**ESTIMACIÓN DE COSTOS** 💰
[Breakdown aproximado de gastos, presupuesto estimado con bullets]

{contexto_formulario}
{info_clima}
{contexto_historial}
PREGUNTA DEL USUARIO:
{pregunta}

Responde como Alex, siendo entusiasta, y SIEMPRE usa la estructura de formato obligatorio indicada arriba. Si tienes información del clima, inclúyela en la sección CLIMA ACTUAL. Si tienes información del formulario, úsala para personalizar tu respuesta. Organiza cada sección con bullets (•) y emojis relevantes."""
        
        # Obtener respuesta de Gemini
        response = model.generate_content(prompt)
        respuesta = response.text
        
        # Obtener fotos del destino
        fotos = []
        if destino:
            fotos = obtener_fotos_unsplash(destino, cantidad=3)
        
        return jsonify({
            'respuesta': respuesta,
            'pregunta': pregunta,
            'fotos': fotos if fotos else [],
            'info_panel': info_panel if info_panel else {}
        })
    
    except Exception as e:
        return jsonify({
            'error': f'Error al comunicarse con Gemini: {str(e)}'
        }), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Endpoint de salud para verificar que el servidor está funcionando"""
    return jsonify({'status': 'ok', 'message': 'Servidor funcionando correctamente'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)

