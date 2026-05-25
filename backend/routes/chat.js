import Groq from 'groq-sdk'
import { Router } from 'express'
import { creditTools } from './creditTools.js'

const router = Router()
// Lazy-initialized so the server starts even without GROQ_API_KEY set
let groq = null
const getGroq = () => {
  if (!groq) groq = new Groq()
  return groq
}

router.post('/', async (req, res) => {
  const { messages, simulacion } = req.body

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const systemPrompt = `Eres un asesor financiero experto en créditos vehiculares colombianos.
${simulacion ? `Simulación activa: cuota mensual ${simulacion.resultado?.cuota?.toFixed(0)} COP, tasa mensual ${simulacion.params?.tasaMensual}%, plazo ${simulacion.params?.plazoMeses} meses, total intereses ${simulacion.resultado?.totalIntereses?.toFixed(0)} COP.` : ''}
Puedes usar herramientas para ajustar parámetros de la simulación.
Responde siempre en español. Sé conciso y útil.`

  try {
    const stream = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      tools: creditTools,
      tool_choice: 'auto',
      stream: true,
      max_tokens: 1024
    })

    let toolCallsBuffer = {}

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta

      if (!delta) continue

      // Text content
      if (delta.content) {
        res.write(`data: ${JSON.stringify({ type: 'text', text: delta.content })}\n\n`)
      }

      // Tool calls (streamed in chunks)
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index
          if (!toolCallsBuffer[idx]) {
            toolCallsBuffer[idx] = { id: tc.id || '', name: tc.function?.name || '', arguments: '' }
            res.write(`data: ${JSON.stringify({ type: 'tool_start', name: tc.function?.name || '' })}\n\n`)
          }
          if (tc.function?.arguments) {
            toolCallsBuffer[idx].arguments += tc.function.arguments
          }
        }
      }

      // Finish reason
      const finishReason = chunk.choices[0]?.finish_reason
      if (finishReason === 'tool_calls') {
        for (const tc of Object.values(toolCallsBuffer)) {
          try {
            const input = JSON.parse(tc.arguments)
            res.write(`data: ${JSON.stringify({ type: 'tool_call', name: tc.name, input })}\n\n`)
          } catch {}
        }
        toolCallsBuffer = {}
      }

      if (finishReason === 'stop') {
        break
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
    res.end()
  }
})

export default router
