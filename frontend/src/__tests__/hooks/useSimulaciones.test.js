import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock calcularVehicular before importing the hook
vi.mock('../../engine/vehicular.js', () => ({
  calcularVehicular: vi.fn(({ precio, enganche, tasaMensual, plazoMeses, mesInicio, anioInicio, abonos }) => ({
    cuota: 1000,
    totalPagado: 60000,
    totalIntereses: 10000,
    interesesAhorrados: 0,
    mesesAhorrados: 0,
    tabla: [],
  })),
}))

import useSimulaciones from '../../hooks/useSimulaciones.js'

// Helper: build a minimal simulation object
function makeSim(id, overrides = {}) {
  return {
    id,
    params: {
      precio: 50_000_000,
      enganche: 10_000_000,
      tasaMensual: 1.2,
      plazoMeses: 60,
      mesInicio: 1,
      anioInicio: 2025,
      abonos: [],
    },
    resultado: {
      cuota: 800_000,
      totalPagado: 48_000_000,
      totalIntereses: 8_000_000,
      interesesAhorrados: 0,
      mesesAhorrados: 0,
      tabla: [],
    },
    ...overrides,
  }
}

describe('useSimulaciones', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ── 1. Initial state ────────────────────────────────────────────────────────
  it('initial state matches expected defaults', () => {
    const { result } = renderHook(() => useSimulaciones())
    const { state } = result.current

    expect(state.simulaciones).toEqual([])
    expect(state.activa).toBeNull()
    expect(state.comparar).toEqual([])
    expect(state.chatMsgs).toEqual([])
    expect(state.chatLoading).toBe(false)
  })

  // ── 2. ADD_SIMULACION ───────────────────────────────────────────────────────
  it('ADD_SIMULACION adds to simulaciones and sets activa', () => {
    const { result } = renderHook(() => useSimulaciones())
    const sim = makeSim('sim-1')

    act(() => {
      result.current.dispatch({ type: 'ADD_SIMULACION', payload: sim })
    })

    expect(result.current.state.simulaciones).toHaveLength(1)
    expect(result.current.state.simulaciones[0].id).toBe('sim-1')
    expect(result.current.state.activa).toBe('sim-1')
  })

  // ── 3. ADD_SIMULACION FIFO eviction ────────────────────────────────────────
  it('ADD_SIMULACION FIFO: adding 11 simulaciones keeps only 10 newest', () => {
    const { result } = renderHook(() => useSimulaciones())

    // Add 11 simulations
    for (let i = 1; i <= 11; i++) {
      act(() => {
        result.current.dispatch({ type: 'ADD_SIMULACION', payload: makeSim(`sim-${i}`) })
      })
    }

    const { simulaciones } = result.current.state
    expect(simulaciones).toHaveLength(10)
    // Oldest (sim-1) should have been evicted; newest (sim-11) should be first
    expect(simulaciones[0].id).toBe('sim-11')
    expect(simulaciones.find(s => s.id === 'sim-1')).toBeUndefined()
  })

  // ── 4. SET_ACTIVA ───────────────────────────────────────────────────────────
  it('SET_ACTIVA updates activa', () => {
    const { result } = renderHook(() => useSimulaciones())

    act(() => {
      result.current.dispatch({ type: 'ADD_SIMULACION', payload: makeSim('sim-a') })
      result.current.dispatch({ type: 'ADD_SIMULACION', payload: makeSim('sim-b') })
    })

    act(() => {
      result.current.dispatch({ type: 'SET_ACTIVA', payload: 'sim-a' })
    })

    expect(result.current.state.activa).toBe('sim-a')
  })

  // ── 5. DELETE_SIMULACION ────────────────────────────────────────────────────
  it('DELETE_SIMULACION removes sim and updates activa if deleted was active', () => {
    const { result } = renderHook(() => useSimulaciones())

    act(() => {
      result.current.dispatch({ type: 'ADD_SIMULACION', payload: makeSim('sim-x') })
      result.current.dispatch({ type: 'ADD_SIMULACION', payload: makeSim('sim-y') })
    })

    // activa is now 'sim-y' (most recently added)
    expect(result.current.state.activa).toBe('sim-y')

    act(() => {
      result.current.dispatch({ type: 'DELETE_SIMULACION', payload: 'sim-y' })
    })

    expect(result.current.state.simulaciones.find(s => s.id === 'sim-y')).toBeUndefined()
    // activa should now point to first remaining sim
    expect(result.current.state.activa).toBe('sim-x')
  })

  it('DELETE_SIMULACION sets activa to null when no sims remain', () => {
    const { result } = renderHook(() => useSimulaciones())

    act(() => {
      result.current.dispatch({ type: 'ADD_SIMULACION', payload: makeSim('solo') })
    })

    act(() => {
      result.current.dispatch({ type: 'DELETE_SIMULACION', payload: 'solo' })
    })

    expect(result.current.state.simulaciones).toHaveLength(0)
    expect(result.current.state.activa).toBeNull()
  })

  it('DELETE_SIMULACION removes id from comparar if present', () => {
    const { result } = renderHook(() => useSimulaciones())

    act(() => {
      result.current.dispatch({ type: 'ADD_SIMULACION', payload: makeSim('c1') })
      result.current.dispatch({ type: 'ADD_SIMULACION', payload: makeSim('c2') })
      result.current.dispatch({ type: 'SET_COMPARAR', payload: ['c1', 'c2'] })
    })

    act(() => {
      result.current.dispatch({ type: 'DELETE_SIMULACION', payload: 'c1' })
    })

    expect(result.current.state.comparar).not.toContain('c1')
  })

  // ── 6. SET_COMPARAR ─────────────────────────────────────────────────────────
  it('SET_COMPARAR updates comparar with 2 ids', () => {
    const { result } = renderHook(() => useSimulaciones())

    act(() => {
      result.current.dispatch({ type: 'ADD_SIMULACION', payload: makeSim('p') })
      result.current.dispatch({ type: 'ADD_SIMULACION', payload: makeSim('q') })
      result.current.dispatch({ type: 'SET_COMPARAR', payload: ['p', 'q'] })
    })

    expect(result.current.state.comparar).toEqual(['p', 'q'])
  })

  it('SET_COMPARAR accepts empty array', () => {
    const { result } = renderHook(() => useSimulaciones())

    act(() => {
      result.current.dispatch({ type: 'SET_COMPARAR', payload: [] })
    })

    expect(result.current.state.comparar).toEqual([])
  })

  // ── 7. ADD_CHAT_MSG ─────────────────────────────────────────────────────────
  it('ADD_CHAT_MSG appends messages', () => {
    const { result } = renderHook(() => useSimulaciones())

    act(() => {
      result.current.dispatch({ type: 'ADD_CHAT_MSG', payload: { role: 'user', content: 'hello' } })
      result.current.dispatch({ type: 'ADD_CHAT_MSG', payload: { role: 'assistant', content: 'hi' } })
    })

    expect(result.current.state.chatMsgs).toHaveLength(2)
    expect(result.current.state.chatMsgs[0]).toEqual({ role: 'user', content: 'hello' })
    expect(result.current.state.chatMsgs[1]).toEqual({ role: 'assistant', content: 'hi' })
  })

  it('ADD_CHAT_MSG FIFO evicts oldest when exceeding 50 messages', () => {
    const { result } = renderHook(() => useSimulaciones())

    // Add 50 messages
    for (let i = 0; i < 50; i++) {
      act(() => {
        result.current.dispatch({ type: 'ADD_CHAT_MSG', payload: { role: 'user', content: `msg-${i}` } })
      })
    }

    expect(result.current.state.chatMsgs).toHaveLength(50)

    // Add one more (51st) — should evict oldest
    act(() => {
      result.current.dispatch({ type: 'ADD_CHAT_MSG', payload: { role: 'user', content: 'msg-50' } })
    })

    expect(result.current.state.chatMsgs).toHaveLength(50)
    expect(result.current.state.chatMsgs[0].content).toBe('msg-1')
    expect(result.current.state.chatMsgs[49].content).toBe('msg-50')
  })

  // ── 8. SET_CHAT_LOADING ─────────────────────────────────────────────────────
  it('SET_CHAT_LOADING toggles chatLoading', () => {
    const { result } = renderHook(() => useSimulaciones())

    act(() => {
      result.current.dispatch({ type: 'SET_CHAT_LOADING', payload: true })
    })
    expect(result.current.state.chatLoading).toBe(true)

    act(() => {
      result.current.dispatch({ type: 'SET_CHAT_LOADING', payload: false })
    })
    expect(result.current.state.chatLoading).toBe(false)
  })

  // ── 9. CLEAR_CHAT ───────────────────────────────────────────────────────────
  it('CLEAR_CHAT empties chatMsgs', () => {
    const { result } = renderHook(() => useSimulaciones())

    act(() => {
      result.current.dispatch({ type: 'ADD_CHAT_MSG', payload: { role: 'user', content: 'a' } })
      result.current.dispatch({ type: 'ADD_CHAT_MSG', payload: { role: 'assistant', content: 'b' } })
    })

    act(() => {
      result.current.dispatch({ type: 'CLEAR_CHAT' })
    })

    expect(result.current.state.chatMsgs).toEqual([])
  })

  // ── 10. APPLY_AI_CONFIG ─────────────────────────────────────────────────────
  it('APPLY_AI_CONFIG merges params into active sim and updates resultado', async () => {
    const { calcularVehicular } = await import('../../engine/vehicular.js')
    const mockResult = {
      cuota: 999,
      totalPagado: 59940,
      totalIntereses: 9940,
      interesesAhorrados: 500,
      mesesAhorrados: 1,
      tabla: [],
    }
    calcularVehicular.mockReturnValueOnce(mockResult)

    const { result } = renderHook(() => useSimulaciones())

    act(() => {
      result.current.dispatch({ type: 'ADD_SIMULACION', payload: makeSim('ai-sim') })
    })

    act(() => {
      result.current.dispatch({
        type: 'APPLY_AI_CONFIG',
        payload: { tasaMensual: 0.9, plazoMeses: 48 },
      })
    })

    const updated = result.current.state.simulaciones.find(s => s.id === 'ai-sim')
    expect(updated.params.tasaMensual).toBe(0.9)
    expect(updated.params.plazoMeses).toBe(48)
    expect(updated.resultado).toEqual(mockResult)
    expect(calcularVehicular).toHaveBeenCalledWith(
      expect.objectContaining({ tasaMensual: 0.9, plazoMeses: 48 })
    )
  })

  it('APPLY_AI_CONFIG is a no-op when there is no active simulation', () => {
    const { result } = renderHook(() => useSimulaciones())

    // No sims added, activa is null
    act(() => {
      result.current.dispatch({ type: 'APPLY_AI_CONFIG', payload: { tasaMensual: 0.5 } })
    })

    expect(result.current.state.simulaciones).toHaveLength(0)
  })

  // ── localStorage persistence ────────────────────────────────────────────────
  it('persists state to localStorage on dispatch', () => {
    const { result } = renderHook(() => useSimulaciones())

    act(() => {
      result.current.dispatch({ type: 'ADD_SIMULACION', payload: makeSim('persist-1') })
    })

    const saved = JSON.parse(localStorage.getItem('creditoia_state'))
    expect(saved.simulaciones).toHaveLength(1)
    expect(saved.simulaciones[0].id).toBe('persist-1')
    expect(saved.activa).toBe('persist-1')
    // chatLoading should NOT be persisted
    expect(saved.chatLoading).toBeUndefined()
  })

  it('rehydrates state from localStorage on init', () => {
    const preloaded = {
      simulaciones: [makeSim('pre-1')],
      activa: 'pre-1',
      comparar: [],
      chatMsgs: [{ role: 'user', content: 'old msg' }],
    }
    localStorage.setItem('creditoia_state', JSON.stringify(preloaded))

    const { result } = renderHook(() => useSimulaciones())

    expect(result.current.state.simulaciones[0].id).toBe('pre-1')
    expect(result.current.state.activa).toBe('pre-1')
    expect(result.current.state.chatMsgs[0].content).toBe('old msg')
    expect(result.current.state.chatLoading).toBe(false)
  })
})
