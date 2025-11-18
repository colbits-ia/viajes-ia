import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import './App.css'

// Función para crear un resumen de la respuesta de la IA
const crearResumenAI = (respuestaCompleta) => {
  // Limpiar el texto de markdown
  const textoLimpio = respuestaCompleta
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/•/g, '-')
    .replace(/\n+/g, ' ')
    .trim()

  let resumen = 'Resumen del itinerario recomendado por Alex:\n\n'

  // Buscar secciones principales por palabras clave
  const textoLower = textoLimpio.toLowerCase()

  // Extraer información de clima
  if (textoLower.includes('clima') || textoLower.includes('temperatura')) {
    const climaMatch = textoLimpio.match(/(?:CLIMA ACTUAL|CLIMA|TEMPERATURA)[^.!?]*/i)
    if (climaMatch) {
      resumen += `• Clima: ${climaMatch[0].trim()}\n`
    }
  }

  // Extraer información de alojamiento
  if (textoLower.includes('alojamiento') || textoLower.includes('hotel')) {
    const alojamientoMatch = textoLimpio.match(/(?:ALOJAMIENTO|HOTEL)[^.!?]*/i)
    if (alojamientoMatch) {
      resumen += `• Alojamiento: ${alojamientoMatch[0].trim()}\n`
    }
  }

  // Extraer información de comida
  if (textoLower.includes('comida') || textoLower.includes('restaurante')) {
    const comidaMatch = textoLimpio.match(/(?:COMIDA|RESTAURANTES)[^.!?]*/i)
    if (comidaMatch) {
      resumen += `• Comida: ${comidaMatch[0].trim()}\n`
    }
  }

  // Extraer información de lugares
  if (textoLower.includes('lugares') || textoLower.includes('atracciones')) {
    const lugaresMatch = textoLimpio.match(/(?:LUGARES IMPERDIBLES|ATRACCIONES)[^.!?]*/i)
    if (lugaresMatch) {
      resumen += `• Lugares imperdibles: ${lugaresMatch[0].trim()}\n`
    }
  }

  // Extraer información de consejos
  if (textoLower.includes('consejos') || textoLower.includes('tips')) {
    const consejosMatch = textoLimpio.match(/(?:CONSEJOS LOCALES|TIPS)[^.!?]*/i)
    if (consejosMatch) {
      resumen += `• Consejos locales: ${consejosMatch[0].trim()}\n`
    }
  }

  // Extraer información de costos
  if (textoLower.includes('costos') || textoLower.includes('estimación')) {
    const costosMatch = textoLimpio.match(/(?:ESTIMACIÓN DE COSTOS|COSTOS)[^.!?]*/i)
    if (costosMatch) {
      resumen += `• Estimación de costos: ${costosMatch[0].trim()}\n`
    }
  }

  // Si no se encontraron secciones específicas, crear un resumen general
  if (resumen === 'Resumen del itinerario recomendado por Alex:\n\n') {
    const primerasLineas = textoLimpio.split(/[.!?]+/).slice(0, 3).join('. ').trim()
    resumen += primerasLineas + '...\n\n'
    resumen += 'Este itinerario incluye recomendaciones personalizadas de alojamiento, comida, lugares para visitar y consejos locales.'
  }

  // Limpiar emojis y caracteres extraños del resumen final
  return resumen
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
    .replace(/•/g, '-') // Ensure bullets are dashes
}

function App() {
  const [formularioCompletado, setFormularioCompletado] = useState(false)
  const [datosViaje, setDatosViaje] = useState({
    destino: '',
    fecha: '',
    presupuesto: '',
    preferencia: ''
  })
  
  const [respuesta, setRespuesta] = useState('')
  const [fotos, setFotos] = useState([])
  const [infoPanel, setInfoPanel] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(false)
  const [historial, setHistorial] = useState([])
  const [preguntaActual, setPreguntaActual] = useState('')
  const [sessionId] = useState(() => `session_${Date.now()}`)

  const handlePreguntaAdicional = async (e) => {
    e.preventDefault()
    
    if (!preguntaActual.trim()) {
      return
    }

    setCargando(true)
    setError(false)

    try {
      const response = await fetch('http://localhost:5000/api/planificar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          pregunta: preguntaActual,
          datosViaje: datosViaje,
          session_id: sessionId,
          historial: historial
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setRespuesta(data.respuesta)
        setFotos(data.fotos || [])
        setInfoPanel(data.info_panel || null)
        setError(false)
        
        // Agregar al historial
        const nuevaConversacion = {
          pregunta: preguntaActual,
          respuesta: data.respuesta,
          fecha: new Date().toLocaleString()
        }
        setHistorial([...historial, nuevaConversacion])
        setPreguntaActual('')
      } else {
        setRespuesta(data.error || 'No se pudo procesar la solicitud')
        setFotos([])
        setInfoPanel(null)
        setError(true)
      }
    } catch (error) {
      setRespuesta('Error al conectar con el servidor. Asegúrate de que el backend esté ejecutándose.')
      setError(true)
      console.error('Error:', error)
    } finally {
      setCargando(false)
    }
  }

  const descargarPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let yPosition = 20

      // Configurar fuente por defecto para consistencia
      pdf.setFont('helvetica', 'normal')

      // Logo y título
      pdf.setFontSize(24)
      pdf.setTextColor(30, 64, 175)
      pdf.text('ViajeIA', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 10

      pdf.setFontSize(14)
      pdf.setTextColor(100, 116, 139)
      pdf.text('Tu Asistente Personal de Viajes', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 20

      // 1. Nombre del destino
      pdf.setFontSize(18)
      pdf.setTextColor(30, 64, 175)
      pdf.text(datosViaje.destino, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 15

      // 2. Opciones seleccionadas por el usuario
      pdf.setFontSize(14)
      pdf.setTextColor(30, 64, 175)
      pdf.text('Opciones Seleccionadas por el Usuario', 20, yPosition)
      yPosition += 10

      pdf.setFontSize(12)
      pdf.setTextColor(0, 0, 0)
      pdf.text(`Fecha: ${datosViaje.fecha}`, 20, yPosition)
      yPosition += 8
      pdf.text(`Presupuesto: ${datosViaje.presupuesto}`, 20, yPosition)
      yPosition += 8
      pdf.text(`Preferencia: ${datosViaje.preferencia}`, 20, yPosition)
      yPosition += 15

      // 3. Imágenes del destino
      if (fotos && fotos.length > 0) {
        pdf.setFontSize(14)
        pdf.setTextColor(30, 64, 175)
        pdf.text('Imágenes del Destino', 20, yPosition)
        yPosition += 10

        for (let i = 0; i < Math.min(fotos.length, 3); i++) {
          try {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.src = fotos[i].url

            await new Promise((resolve, reject) => {
              img.onload = () => {
                const imgWidth = 170
                const imgHeight = (img.height * imgWidth) / img.width

                if (yPosition + imgHeight > pageHeight - 20) {
                  pdf.addPage()
                  yPosition = 20
                }

                pdf.addImage(img, 'JPEG', 20, yPosition, imgWidth, imgHeight)
                yPosition += imgHeight + 10
                resolve()
              }
              img.onerror = reject
            })
          } catch (err) {
            console.error('Error al cargar imagen:', err)
          }
        }
        yPosition += 10
      }

      // 4. Resumen con lo que ha dicho la IA
      if (historial.length > 0) {
        pdf.setFontSize(14)
        pdf.setTextColor(30, 64, 175)
        pdf.text('Resumen del Itinerario', 20, yPosition)
        yPosition += 10

        // Tomar la primera respuesta de Alex y crear un resumen
        const primeraRespuesta = historial[0].respuesta
        const resumen = crearResumenAI(primeraRespuesta)

        pdf.setFontSize(11)
        pdf.setTextColor(0, 0, 0)
        const resumenLineas = pdf.splitTextToSize(resumen, pageWidth - 40)
        for (let i = 0; i < resumenLineas.length; i++) {
          if (yPosition > pageHeight - 20) {
            pdf.addPage()
            yPosition = 20
          }
          pdf.text(resumenLineas[i], 20, yPosition)
          yPosition += 6
        }
        yPosition += 15
      }

      // 5. Preguntas adicionales si las hay
      const preguntasAdicionales = historial.slice(1) // Todas menos la primera
      if (preguntasAdicionales.length > 0) {
        pdf.setFontSize(14)
        pdf.setTextColor(30, 64, 175)
        pdf.text('Preguntas Adicionales', 20, yPosition)
        yPosition += 10

        preguntasAdicionales.forEach((item, index) => {
          if (yPosition > pageHeight - 50) {
            pdf.addPage()
            yPosition = 20
          }

          pdf.setFontSize(12)
          pdf.setTextColor(30, 64, 175)
          pdf.text(`Pregunta ${index + 1}:`, 20, yPosition)
          yPosition += 8

          pdf.setFontSize(10)
          pdf.setTextColor(0, 0, 0)
          const preguntaLimpia = item.pregunta
            .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis
            .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
          const preguntaLineas = pdf.splitTextToSize(preguntaLimpia, pageWidth - 40)
          for (let i = 0; i < preguntaLineas.length; i++) {
            if (yPosition > pageHeight - 15) {
              pdf.addPage()
              yPosition = 20
            }
            pdf.text(preguntaLineas[i], 20, yPosition)
            yPosition += 6
          }

          yPosition += 5
          pdf.setFontSize(11)
          pdf.setTextColor(30, 64, 175)
          pdf.text('Respuesta:', 20, yPosition)
          yPosition += 7

          const respuestaTexto = item.respuesta
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/#{1,6}\s/g, '')
            .replace(/•/g, '-')
            .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '') // Remove emojis
            .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters

          pdf.setFontSize(10)
          pdf.setTextColor(0, 0, 0)
          const respuestaLineas = pdf.splitTextToSize(respuestaTexto, pageWidth - 40)
          for (let i = 0; i < respuestaLineas.length; i++) {
            if (yPosition > pageHeight - 15) {
              pdf.addPage()
              yPosition = 20
            }
            pdf.text(respuestaLineas[i], 20, yPosition)
            yPosition += 6
          }

          yPosition += 10
        })
      }

      // Guardar PDF
      pdf.save(`Itinerario_${datosViaje.destino}_${Date.now()}.pdf`)
    } catch (error) {
      console.error('Error al generar PDF:', error)
      alert('Error al generar el PDF. Por favor, intenta de nuevo.')
    }
  }

  const handleFormularioSubmit = async (e) => {
    e.preventDefault()
    if (datosViaje.destino && datosViaje.fecha && datosViaje.presupuesto && datosViaje.preferencia) {
      setFormularioCompletado(true)
      setCargando(true)
      setError(false)
      setFotos([])
      setInfoPanel(null)
      
      // Crear pregunta automática basada en el formulario
      const preguntaAutomatica = `Quiero planificar un viaje a ${datosViaje.destino} para ${datosViaje.fecha}. Mi presupuesto es ${datosViaje.presupuesto} y prefiero ${datosViaje.preferencia}. Por favor, ayúdame con recomendaciones detalladas.`
      
      try {
        const response = await fetch('http://localhost:5000/api/planificar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            pregunta: preguntaAutomatica,
            datosViaje: datosViaje,
            session_id: sessionId,
            historial: historial
          }),
        })

        const data = await response.json()
        
        if (response.ok) {
          setRespuesta(data.respuesta)
          setFotos(data.fotos || [])
          setInfoPanel(data.info_panel || null)
          setError(false)
          
          // Agregar al historial
          const nuevaConversacion = {
            pregunta: preguntaAutomatica,
            respuesta: data.respuesta,
            fecha: new Date().toLocaleString()
          }
          setHistorial([...historial, nuevaConversacion])
        } else {
          setRespuesta(data.error || 'No se pudo procesar la solicitud')
          setFotos([])
          setInfoPanel(null)
          setError(true)
        }
      } catch (error) {
        setRespuesta('Error al conectar con el servidor. Asegúrate de que el backend esté ejecutándose.')
        setError(true)
        console.error('Error:', error)
      } finally {
        setCargando(false)
      }
    }
  }


  if (!formularioCompletado) {
    return (
      <div className="app">
        <div className="container">
          <h1 className="titulo">ViajeIA - Tu Asistente Personal de Viajes</h1>
          
          <div className="formulario-inicial">
            <h2 className="subtitulo-formulario">Cuéntanos sobre tu viaje ideal ✈️</h2>
            <p className="descripcion-formulario">Completa este formulario rápido para personalizar tu experiencia</p>
            
            <form onSubmit={handleFormularioSubmit} className="formulario-encuesta">
              <div className="campo-formulario">
                <label htmlFor="destino" className="label-formulario">
                  ¿A dónde quieres viajar? 🗺️
                </label>
                <input
                  type="text"
                  id="destino"
                  className="input-formulario"
                  placeholder="Ej: París, Tokio, Cancún..."
                  value={datosViaje.destino}
                  onChange={(e) => setDatosViaje({...datosViaje, destino: e.target.value})}
                  required
                />
              </div>

              <div className="campo-formulario">
                <label htmlFor="fecha" className="label-formulario">
                  ¿Cuándo? 📅
                </label>
                <input
                  type="date"
                  id="fecha"
                  className="input-formulario"
                  value={datosViaje.fecha}
                  onChange={(e) => setDatosViaje({...datosViaje, fecha: e.target.value})}
                  required
                />
              </div>

              <div className="campo-formulario">
                <label htmlFor="presupuesto" className="label-formulario">
                  ¿Cuál es tu presupuesto aproximado? 💰
                </label>
                <select
                  id="presupuesto"
                  className="input-formulario"
                  value={datosViaje.presupuesto}
                  onChange={(e) => setDatosViaje({...datosViaje, presupuesto: e.target.value})}
                  required
                >
                  <option value="">Selecciona un rango</option>
                  <option value="economico">Económico (menos de $500)</option>
                  <option value="medio">Medio ($500 - $1,500)</option>
                  <option value="alto">Alto ($1,500 - $3,000)</option>
                  <option value="premium">Premium (más de $3,000)</option>
                </select>
              </div>

              <div className="campo-formulario">
                <label className="label-formulario">
                  ¿Prefieres? 🎯
                </label>
                <div className="opciones-preferencia">
                  <label className={`opcion-preferencia ${datosViaje.preferencia === 'aventura' ? 'seleccionada' : ''}`}>
                    <input
                      type="radio"
                      name="preferencia"
                      value="aventura"
                      checked={datosViaje.preferencia === 'aventura'}
                      onChange={(e) => setDatosViaje({...datosViaje, preferencia: e.target.value})}
                      required
                    />
                    <span className="opcion-texto">🏔️ Aventura</span>
                  </label>
                  <label className={`opcion-preferencia ${datosViaje.preferencia === 'relajacion' ? 'seleccionada' : ''}`}>
                    <input
                      type="radio"
                      name="preferencia"
                      value="relajacion"
                      checked={datosViaje.preferencia === 'relajacion'}
                      onChange={(e) => setDatosViaje({...datosViaje, preferencia: e.target.value})}
                      required
                    />
                    <span className="opcion-texto">🏖️ Relajación</span>
                  </label>
                  <label className={`opcion-preferencia ${datosViaje.preferencia === 'cultura' ? 'seleccionada' : ''}`}>
                    <input
                      type="radio"
                      name="preferencia"
                      value="cultura"
                      checked={datosViaje.preferencia === 'cultura'}
                      onChange={(e) => setDatosViaje({...datosViaje, preferencia: e.target.value})}
                      required
                    />
                    <span className="opcion-texto">🏛️ Cultura</span>
                  </label>
                </div>
              </div>

              <button type="submit" className="boton-formulario">
                ¡Empezar a planificar! 🚀
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="contenedor-principal">
        <div className="container">
          <h1 className="titulo">ViajeIA - Tu Asistente Personal de Viajes</h1>
          
          {cargando && (
            <div className="cargando-container">
              <p className="texto-cargando">Planificando tu viaje perfecto... ✈️</p>
            </div>
          )}

          {respuesta && (
            <div className={`area-respuesta ${error ? 'area-error' : ''}`} id="area-respuesta-pdf">
              <div className="respuesta-header">
                <h2 className="respuesta-titulo">{error ? 'Error:' : 'Tu Plan de Viaje:'}</h2>
                {!error && (
                  <button onClick={descargarPDF} className="boton-descargar-pdf">
                    📥 Descargar mi itinerario en PDF
                  </button>
                )}
              </div>
              
              {fotos && fotos.length > 0 && (
                <div className="galeria-fotos" id="galeria-fotos-pdf">
                  {fotos.map((foto, index) => (
                    <div key={index} className="foto-container">
                      <img 
                        src={foto.url} 
                        alt={foto.descripcion || `Foto de ${datosViaje.destino}`}
                        className="foto-destino"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
              
              <div className="respuesta-texto">
                <ReactMarkdown>{respuesta}</ReactMarkdown>
              </div>
            </div>
          )}

          {respuesta && !error && (
            <>
              <div className="area-pregunta-adicional">
                <form onSubmit={handlePreguntaAdicional} className="formulario-pregunta">
                  <div className="input-group">
                    <textarea
                      className="input-texto"
                      placeholder="Haz una pregunta adicional sobre tu viaje... (ej: '¿y qué tal el transporte allí?')"
                      value={preguntaActual}
                      onChange={(e) => setPreguntaActual(e.target.value)}
                      rows="3"
                      disabled={cargando}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="boton-pregunta"
                    disabled={cargando || !preguntaActual.trim()}
                  >
                    {cargando ? 'Preguntando...' : 'Preguntar a Alex 💬'}
                  </button>
                </form>
              </div>

              {historial.length > 0 && (
                <div className="historial-conversaciones">
                  <h3 className="historial-titulo">Historial de Conversación 💬</h3>
                  <div className="historial-lista">
                    {historial.map((item, index) => (
                      <div key={index} className="historial-item">
                        <div className="historial-pregunta">
                          <strong>Tu:</strong> {item.pregunta}
                        </div>
                        <div className="historial-respuesta">
                          <strong>Alex:</strong>
                          <div className="historial-respuesta-texto">
                            <ReactMarkdown>{item.respuesta}</ReactMarkdown>
                          </div>
                        </div>
                        <div className="historial-fecha">
                          {item.fecha}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {infoPanel && (
          <div className="panel-lateral">
            <h3 className="panel-titulo">Información Actual 📊</h3>
            <div className="panel-contenido">
              <div className="panel-item">
                <div className="panel-icono">🌡️</div>
                <div className="panel-info">
                  <div className="panel-label">Temperatura</div>
                  <div className="panel-valor">{infoPanel.temperatura}°C</div>
                  <div className="panel-descripcion">{infoPanel.descripcion_clima}</div>
                </div>
              </div>

              <div className="panel-item">
                <div className="panel-icono">🕐</div>
                <div className="panel-info">
                  <div className="panel-label">Diferencia Horaria</div>
                  <div className="panel-valor">
                    {infoPanel.diferencia_horaria > 0 ? '+' : ''}{infoPanel.diferencia_horaria}h
                  </div>
                  <div className="panel-descripcion">vs. tu ubicación</div>
                </div>
              </div>

              {infoPanel.tipo_cambio && (
                <div className="panel-item">
                  <div className="panel-icono">💱</div>
                  <div className="panel-info">
                    <div className="panel-label">Tipo de Cambio</div>
                    <div className="panel-valor">
                      1 USD = {infoPanel.tipo_cambio.tasa_cambio.toFixed(2)} {infoPanel.moneda}
                    </div>
                    <div className="panel-descripcion">{infoPanel.ciudad}, {infoPanel.pais}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App

