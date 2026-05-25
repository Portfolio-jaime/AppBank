import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { creditTools } from './creditTools.js'

const router = Router()
const client = new Anthropic()

router.post('/', async (req, res) => {
  const { messages, simulacion } = req.body

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    // Build system prompt
    let systemPrompt = 'Eres un asesor financiero experto en créditos vehiculares colombianos.\n'

    if (simulacion) {
      const { params, resultado } = simulacion
      systemPrompt += `\nSimulación activa:\n`
      if (resultado?.cuota != null) systemPrompt += `- Cuota mensual: $${resultado.cuota.toLocaleString('es-CO')}\n`
      if (resultado?.totalIntereses != null) systemPrompt += `- Total intereses: $${resultado.totalIntereses.toLocaleString('es-CO')}\n`
      if (params?.plazoMeses != null) systemPrompt += `- Plazo: ${params.plazoMeses} meses\n`
      if (params?.tasaMensual != null) systemPrompt += `- Tasa mensual: ${params.tasaMensual}%\n`
    }

    systemPrompt += '\nPuedes usar herramientas para ajustar parámetros de la simulación.\nResponde siempre en español.'

    // Track tool use blocks to emit tool_call when input is complete
    const toolBlocks = {}

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools: creditTools
    })

    for await (const event of stream) {
      const { type } = event

      if (type === 'content_block_start') {
        const block = event.content_block
        if (block.type === 'tool_use') {
          toolBlocks[event.index] = { name: block.name, id: block.id, inputJson: '' }
          sendEvent({ type: 'tool_start', name: block.name, id: block.id })
        }
      } else if (type === 'content_block_delta') {
        const { delta } = event
        if (delta.type === 'text_delta') {
          sendEvent({ type: 'text', text: delta.text })
        } else if (delta.type === 'input_json_delta') {
          if (toolBlocks[event.index]) {
            toolBlocks[event.index].inputJson += delta.partial_json
          }
        }
      } else if (type === 'content_block_stop') {
        const block = toolBlocks[event.index]
        if (block) {
          try {
            const input = block.inputJson ? JSON.parse(block.inputJson) : {}
            sendEvent({ type: 'tool_call', name: block.name, input })
          } catch {
            sendEvent({ type: 'tool_call', name: block.name, input: {} })
          }
          delete toolBlocks[event.index]
        }
      }
    }

    sendEvent({ type: 'done' })
    res.end()
  } catch (err) {
    sendEvent({ type: 'error', message: err.message || 'Unknown error' })
    res.end()
  }
})

export default router
