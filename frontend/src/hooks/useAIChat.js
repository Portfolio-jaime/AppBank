import { useContext } from 'react'
import { SimContext } from '../App.jsx'

export default function useAIChat() {
  const { state, dispatch } = useContext(SimContext)

  async function sendMessage(userText) {
    const userMsg = { role: 'user', content: userText }

    // 1. Add user message to state
    dispatch({ type: 'ADD_CHAT_MSG', payload: userMsg })
    dispatch({ type: 'SET_CHAT_LOADING', payload: true })

    // 2. Build messages array: existing chat history + new user message
    const messages = [...state.chatMsgs, userMsg]

    // 3. Get active simulation
    const simulacion = state.simulaciones.find(s => s.id === state.activa) ?? null

    let accumulatedText = ''

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, simulacion }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // 4. Read SSE stream
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Split by double newline (SSE event boundary)
        const events = buffer.split('\n\n')
        // Keep last partial event in buffer
        buffer = events.pop() ?? ''

        for (const event of events) {
          // Extract 'data:' line from event
          const dataLine = event
            .split('\n')
            .find(line => line.startsWith('data:'))
          if (!dataLine) continue

          const jsonStr = dataLine.slice('data:'.length).trim()
          if (!jsonStr) continue

          let parsed
          try {
            parsed = JSON.parse(jsonStr)
          } catch {
            continue
          }

          if (parsed.type === 'text') {
            // 4. Accumulate text chunks
            accumulatedText += parsed.text

          } else if (parsed.type === 'tool_call') {
            // 5. Apply tool call to simulation config
            const { name, input } = parsed

            if (name === 'ajustar_tasa') {
              dispatch({
                type: 'APPLY_AI_CONFIG',
                payload: { tasaMensual: input.tasaMensual },
              })
            } else if (name === 'ajustar_plazo') {
              dispatch({
                type: 'APPLY_AI_CONFIG',
                payload: { plazoMeses: input.plazoMeses },
              })
            } else if (name === 'agregar_abono') {
              // Get current abonos from active sim
              const activeSim = state.simulaciones.find(s => s.id === state.activa)
              const currentAbonos = activeSim?.params?.abonos ?? []
              dispatch({
                type: 'APPLY_AI_CONFIG',
                payload: {
                  abonos: [
                    ...currentAbonos,
                    { id: crypto.randomUUID(), ...input },
                  ],
                },
              })
            }

          } else if (parsed.type === 'done') {
            // 6. Dispatch accumulated assistant message
            if (accumulatedText.trim()) {
              dispatch({
                type: 'ADD_CHAT_MSG',
                payload: { role: 'assistant', content: accumulatedText },
              })
            }
            dispatch({ type: 'SET_CHAT_LOADING', payload: false })
            return

          } else if (parsed.type === 'error') {
            // 7. On error: add error message
            dispatch({
              type: 'ADD_CHAT_MSG',
              payload: {
                role: 'assistant',
                content: `Error: ${parsed.message ?? 'Ocurrió un error inesperado.'}`,
              },
            })
            dispatch({ type: 'SET_CHAT_LOADING', payload: false })
            return
          }
        }
      }

      // Stream ended without 'done' event — flush accumulated text
      if (accumulatedText.trim()) {
        dispatch({
          type: 'ADD_CHAT_MSG',
          payload: { role: 'assistant', content: accumulatedText },
        })
      }
    } catch (err) {
      dispatch({
        type: 'ADD_CHAT_MSG',
        payload: {
          role: 'assistant',
          content: `Error de conexión: ${err.message ?? 'No se pudo contactar al asistente.'}`,
        },
      })
    } finally {
      dispatch({ type: 'SET_CHAT_LOADING', payload: false })
    }
  }

  return { sendMessage, loading: state.chatLoading, msgs: state.chatMsgs }
}
