# ViajeIA - Asistente Personal de Viajes

Una aplicación web que utiliza inteligencia artificial para ayudarte a planificar viajes personalizados con información del clima, fotos de destinos, tipos de cambio y recomendaciones detalladas.

## 🚀 Despliegue en Vercel

### Prerrequisitos

1. Una cuenta en [Vercel](https://vercel.com)
2. Claves de API para los servicios externos

### API Keys Requeridas

Necesitas configurar las siguientes variables de entorno en Vercel:

- `GEMINI_API_KEY`: Clave de API de Google Gemini (requerida)
- `OPENWEATHER_API_KEY`: Clave de API de OpenWeatherMap
- `UNSPLASH_ACCESS_KEY`: Clave de API de Unsplash
- `EXCHANGERATE_API_KEY`: Clave de API de ExchangeRate

### Pasos para el despliegue

1. **Conecta tu repositorio a Vercel**
   - Ve a [vercel.com](https://vercel.com) y haz login
   - Haz clic en "New Project"
   - Importa tu repositorio de GitHub/GitLab

2. **Configura las variables de entorno**
   - En el dashboard de Vercel, ve a tu proyecto
   - Ve a "Settings" > "Environment Variables"
   - Agrega cada variable de entorno con sus valores correspondientes

3. **Despliega**
   - Vercel detectará automáticamente la configuración y desplegará la aplicación
   - El frontend se construirá usando Vite
   - Las funciones serverless se desplegarán en `/api/`

### Estructura del proyecto

```
/api/
  ├── planificar.py    # Endpoint principal para planificación de viajes
  ├── health.py        # Endpoint de salud
  └── requirements.txt # Dependencias de Python

/src/
  ├── App.jsx          # Componente principal de React
  ├── App.css          # Estilos CSS
  └── ...              # Otros archivos del frontend

vercel.json           # Configuración de Vercel
package.json          # Dependencias de Node.js
.env.example          # Ejemplo de variables de entorno
```

### URLs de la aplicación desplegada

- **Frontend**: `https://tu-proyecto.vercel.app`
- **API de planificación**: `https://tu-proyecto.vercel.app/api/planificar`
- **API de salud**: `https://tu-proyecto.vercel.app/api/health`

### Desarrollo local

Para desarrollo local, necesitas tener tanto el backend como el frontend ejecutándose:

1. **Backend** (Flask):
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```

2. **Frontend** (Vite):
   ```bash
   npm install
   npm run dev
   ```

### Tecnologías utilizadas

- **Frontend**: React + Vite
- **Backend**: Python + Flask (convertido a serverless functions)
- **IA**: Google Gemini 2.5 Flash
- **APIs externas**:
  - OpenWeatherMap (clima)
  - Unsplash (fotos)
  - ExchangeRate-API (tipos de cambio)
  - Pixabay (fotos alternativas)

### Funcionalidades

- ✈️ Planificación de viajes personalizada con IA
- 🌤️ Información del clima en tiempo real
- 📸 Galería de fotos del destino
- 💱 Tipos de cambio actualizados
- 💰 Estimaciones de costos
- 📥 Exportación de itinerarios a PDF
- ❤️ Sistema de favoritos
- 💬 Conversaciones adicionales con la IA

¡Disfruta planificando tus viajes con ViajeIA! 🌍