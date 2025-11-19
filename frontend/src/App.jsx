import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import './App.css'

// Limpia texto para que jsPDF lo renderice bien
const limpiarTextoParaPDF = (texto) => {
  return texto
    // quitar markdown básico
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    // bullets y separadores raros → guion
    .replace(/[\u2022\u2023\u25E6\u2043\u2219\u25CF\u25AA\u25AB\u00B7|]/g, '-')
    // unir títulos en MAYÚSCULAS con letras separadas: C L I M A  A C T U A L
    .replace(/((?:[A-ZÁÉÍÓÚÑ]\s+){2,}[A-ZÁÉÍÓÚÑ])/g, (m) =>
      m.replace(/\s+/g, '')
    )
    // quitar emojis y símbolos fuera de Latin-1 (evita que salgan como þ)
    .replace(
      /[^\n\r\t\x20-\x7E\u00A1-\u00FF]/g,
      ''
    )
    // compactar espacios
    .replace(/\s+/g, ' ')
    .trim()
}


// Función para crear un resumen de la respuesta de la IA
const crearResumenAI = (respuestaCompleta) => {
  // Limpiar el texto de markdown
  const textoLimpio = limpiarTextoParaPDF(
    respuestaCompleta
      .replace(/\n+/g, ' ')
  )

  let resumen = 'Resumen del itinerario recomendado por Alex:\n\n'
  const textoLower = textoLimpio.toLowerCase()

  // Extraer información de clima
  if (textoLower.includes('clima') || textoLower.includes('temperatura')) {
    const climaMatch = textoLimpio.match(/(?:CLIMA ACTUAL|CLIMA|TEMPERATURA)[^.!?]*/i)
    if (climaMatch) {
      resumen += `- ${climaMatch[0].trim()}\n`
    }
  }

  // Extraer información de alojamiento
  if (textoLower.includes('alojamiento') || textoLower.includes('hotel')) {
    const alojamientoMatch = textoLimpio.match(/(?:ALOJAMIENTO|HOTEL)[^.!?]*/i)
    if (alojamientoMatch) {
      resumen += `- ${alojamientoMatch[0].trim()}\n`
    }
  }

  // Extraer información de comida
  if (textoLower.includes('comida') || textoLower.includes('restaurante')) {
    const comidaMatch = textoLimpio.match(/(?:COMIDA|RESTAURANTES)[^.!?]*/i)
    if (comidaMatch) {
      resumen += `- ${comidaMatch[0].trim()}\n`
    }
  }

  // Extraer información de lugares
  if (textoLower.includes('lugares') || textoLower.includes('atracciones')) {
    const lugaresMatch = textoLimpio.match(/(?:LUGARES IMPERDIBLES|ATRACCIONES)[^.!?]*/i)
    if (lugaresMatch) {
      resumen += `- ${lugaresMatch[0].trim()}\n`
    }
  }

  // Extraer información de consejos
  if (textoLower.includes('consejos') || textoLower.includes('tips')) {
    const consejosMatch = textoLimpio.match(/(?:CONSEJOS LOCALES|TIPS)[^.!?]*/i)
    if (consejosMatch) {
      resumen += `- ${consejosMatch[0].trim()}\n`
    }
  }

  // Extraer información de costos
  if (textoLower.includes('costos') || textoLower.includes('estimación')) {
    const costosMatch = textoLimpio.match(/(?:ESTIMACIÓN DE COSTOS|COSTOS)[^.!?]*/i)
    if (costosMatch) {
      resumen += `- ${costosMatch[0].trim()}\n`
    }
  }

  // Si no se encontraron secciones específicas, crear un resumen general
  if (resumen === 'Resumen del itinerario recomendado por Alex:\n\n') {
    const primerasLineas = textoLimpio.split(/[.!?]+/).slice(0, 3).join('. ').trim()
    resumen += primerasLineas + '...\n\n'
    resumen += 'Este itinerario incluye recomendaciones personalizadas de alojamiento, comida, lugares para visitar y consejos locales.'
  }

  // Limpiar emojis del resumen final
  return resumen;
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

  // Estados para favoritos
  const [favoritos, setFavoritos] = useState([])
  const [vistaActual, setVistaActual] = useState('planificar') // 'planificar' o 'favoritos'

  // Cargar favoritos del localStorage al montar el componente
  useEffect(() => {
    const favoritosGuardados = localStorage.getItem('viajeia_favoritos')
    if (favoritosGuardados) {
      try {
        setFavoritos(JSON.parse(favoritosGuardados))
      } catch (error) {
        console.error('Error al cargar favoritos:', error)
      }
    }
  }, [])

  // Función para guardar un viaje como favorito
  const guardarFavorito = () => {
    if (!datosViaje.destino) return

    const nuevoFavorito = {
      id: Date.now(),
      destino: datosViaje.destino,
      fecha: datosViaje.fecha,
      presupuesto: datosViaje.presupuesto,
      preferencia: datosViaje.preferencia,
      respuesta: respuesta,
      fotos: fotos,
      fechaGuardado: new Date().toLocaleString()
    }

    const nuevosFavoritos = [...favoritos, nuevoFavorito]
    setFavoritos(nuevosFavoritos)
    localStorage.setItem('viajeia_favoritos', JSON.stringify(nuevosFavoritos))
  }

  // Función para eliminar un favorito
  const eliminarFavorito = (id) => {
    const nuevosFavoritos = favoritos.filter(fav => fav.id !== id)
    setFavoritos(nuevosFavoritos)
    localStorage.setItem('viajeia_favoritos', JSON.stringify(nuevosFavoritos))
  }

  // Función para cargar un favorito en la vista de planificación
  const cargarFavorito = (favorito) => {
    setDatosViaje({
      destino: favorito.destino,
      fecha: favorito.fecha,
      presupuesto: favorito.presupuesto,
      preferencia: favorito.preferencia
    })
    setRespuesta(favorito.respuesta)
    setFotos(favorito.fotos || [])
    setFormularioCompletado(true)
    setVistaActual('planificar')
  }

  const handlePreguntaAdicional = async (e) => {
    e.preventDefault()
    
    if (!preguntaActual.trim()) {
      return
    }

    setCargando(true)
    setError(false)

    try {
      const response = await fetch('/api/planificar', {
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

      // 4. Respuesta completa de la IA
      if (historial.length > 0) {
        pdf.setFontSize(14)
        pdf.setTextColor(30, 64, 175)
        pdf.text('Itinerario Completo', 20, yPosition)
        yPosition += 10

        // Tomar la primera respuesta de Alex completa
        const primeraRespuesta = historial[0].respuesta
        const textoCompleto = limpiarTextoParaPDF(primeraRespuesta)

        pdf.setFontSize(11)
        pdf.setTextColor(0, 0, 0)
        const textoLineas = pdf.splitTextToSize(textoCompleto, pageWidth - 40)
        for (let i = 0; i < textoLineas.length; i++) {
          if (yPosition > pageHeight - 20) {
            pdf.addPage()
            yPosition = 20
          }
          pdf.text(textoLineas[i], 20, yPosition)
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
          const preguntaLimpia = limpiarTextoParaPDF(item.pregunta)

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

          const respuestaTexto = limpiarTextoParaPDF(item.respuesta)

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

      // Agregar pie de página a todas las páginas
      const totalPages = pdf.internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()

        // Configurar fuente para el pie de página
        pdf.setFontSize(8)
        pdf.setTextColor(128, 128, 128) // Color gris

        // Texto del pie de página: "Generado por ViajeIA" - fecha - "Página n de m"
        const fechaActual = new Date().toLocaleDateString('es-ES')
        const footerText = `Generado por ViajeIA by Colbits - ${fechaActual} - Página ${i} de ${totalPages}`
        pdf.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' })
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
        const response = await fetch('/api/planificar', {
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
          <h1 className="titulo">ViajeIA by Colbits - Tu Asistente Personal de Viajes</h1>

          {/* Navegación desde el formulario inicial */}
          <div className="navegacion">
            <button
              className={`boton-navegacion ${vistaActual === 'planificar' ? 'activo' : ''}`}
              onClick={() => setVistaActual('planificar')}
            >
              ✈️ Planificar Viaje
            </button>
            <button
              className={`boton-navegacion ${vistaActual === 'favoritos' ? 'activo' : ''}`}
              onClick={() => setVistaActual('favoritos')}
            >
              ❤️ Mis Viajes Guardados ({favoritos.length})
            </button>
          </div>

          {vistaActual === 'planificar' && (
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
          )}

          {vistaActual === 'favoritos' && (
            <div className="seccion-favoritos">
              <h2 className="titulo-favoritos">Mis Viajes Guardados ❤️</h2>

              {favoritos.length === 0 ? (
                <div className="favoritos-vacios">
                  <p className="texto-vacio">Aún no has guardado ningún viaje.</p>
                  <p className="texto-vacio">¡Planifica un viaje y guarda tus destinos favoritos!</p>
                  <button
                    className="boton-ir-planificar"
                    onClick={() => setVistaActual('planificar')}
                  >
                    Ir a Planificar ✈️
                  </button>
                </div>
              ) : (
                <div className="lista-favoritos">
                  {favoritos.map((favorito) => (
                    <div key={favorito.id} className="tarjeta-favorito">
                      <div className="favorito-header">
                        <h3 className="favorito-destino">{favorito.destino}</h3>
                        <button
                          className="boton-eliminar-favorito"
                          onClick={() => eliminarFavorito(favorito.id)}
                          title="Eliminar de favoritos"
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="favorito-detalles">
                        <div className="favorito-info">
                          <span className="favorito-label">📅 Fecha:</span>
                          <span className="favorito-valor">{favorito.fecha}</span>
                        </div>
                        <div className="favorito-info">
                          <span className="favorito-label">💰 Presupuesto:</span>
                          <span className="favorito-valor">{favorito.presupuesto}</span>
                        </div>
                        <div className="favorito-info">
                          <span className="favorito-label">🎯 Preferencia:</span>
                          <span className="favorito-valor">{favorito.preferencia}</span>
                        </div>
                        <div className="favorito-info">
                          <span className="favorito-label">📝 Guardado:</span>
                          <span className="favorito-valor">{favorito.fechaGuardado}</span>
                        </div>
                      </div>

                      <div className="favorito-acciones">
                        <button
                          className="boton-ver-favorito"
                          onClick={() => {
                            cargarFavorito(favorito);
                            setVistaActual('planificar');
                          }}
                        >
                          Ver Detalles 👁️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="contenedor-principal">
        <div className="container">
          <h1 className="titulo">ViajeIA by Colbits - Tu Asistente Personal de Viajes</h1>

          {/* Navegación entre secciones */}
          {formularioCompletado && (
            <div className="navegacion">
              <button
                className={`boton-navegacion ${vistaActual === 'planificar' ? 'activo' : ''}`}
                onClick={() => setVistaActual('planificar')}
              >
                ✈️ Planificar Viaje
              </button>
              <button
                className={`boton-navegacion ${vistaActual === 'favoritos' ? 'activo' : ''}`}
                onClick={() => setVistaActual('favoritos')}
              >
                ❤️ Mis Viajes Guardados ({favoritos.length})
              </button>
            </div>
          )}

          {vistaActual === 'planificar' && cargando && (
            <div className="cargando-container">
              <p className="texto-cargando">Planificando tu viaje perfecto... ✈️</p>
            </div>
          )}

          {vistaActual === 'planificar' && respuesta && (
            <div className={`area-respuesta ${error ? 'area-error' : ''}`} id="area-respuesta-pdf">
              <div className="respuesta-header">
                <h2 className="respuesta-titulo">{error ? 'Error:' : 'Tu Plan de Viaje:'}</h2>
                 {!error && (
                   <div className="botones-header">
                     <button onClick={guardarFavorito} className="boton-guardar-favorito">
                       ❤️ Guardar en Favoritos
                     </button>
                     <button onClick={descargarPDF} className="boton-descargar-pdf">
                       📥 Descargar mi itinerario en PDF
                     </button>
                   </div>
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

          {vistaActual === 'planificar' && respuesta && !error && (
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

          {vistaActual === 'favoritos' && (
            <div className="seccion-favoritos">
              <h2 className="titulo-favoritos">Mis Viajes Guardados ❤️</h2>

              {favoritos.length === 0 ? (
                <div className="favoritos-vacios">
                  <p className="texto-vacio">Aún no has guardado ningún viaje.</p>
                  <p className="texto-vacio">¡Planifica un viaje y guarda tus destinos favoritos!</p>
                  <button
                    className="boton-ir-planificar"
                    onClick={() => setVistaActual('planificar')}
                  >
                    Ir a Planificar ✈️
                  </button>
                </div>
              ) : (
                <div className="lista-favoritos">
                  {favoritos.map((favorito) => (
                    <div key={favorito.id} className="tarjeta-favorito">
                      <div className="favorito-header">
                        <h3 className="favorito-destino">{favorito.destino}</h3>
                        <button
                          className="boton-eliminar-favorito"
                          onClick={() => eliminarFavorito(favorito.id)}
                          title="Eliminar de favoritos"
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="favorito-detalles">
                        <div className="favorito-info">
                          <span className="favorito-label">📅 Fecha:</span>
                          <span className="favorito-valor">{favorito.fecha}</span>
                        </div>
                        <div className="favorito-info">
                          <span className="favorito-label">💰 Presupuesto:</span>
                          <span className="favorito-valor">{favorito.presupuesto}</span>
                        </div>
                        <div className="favorito-info">
                          <span className="favorito-label">🎯 Preferencia:</span>
                          <span className="favorito-valor">{favorito.preferencia}</span>
                        </div>
                        <div className="favorito-info">
                          <span className="favorito-label">📝 Guardado:</span>
                          <span className="favorito-valor">{favorito.fechaGuardado}</span>
                        </div>
                      </div>

                      <div className="favorito-acciones">
                        <button
                          className="boton-ver-favorito"
                          onClick={() => cargarFavorito(favorito)}
                        >
                          Ver Detalles 👁️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {infoPanel && vistaActual === 'planificar' && (
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

