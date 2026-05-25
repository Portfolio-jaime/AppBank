import { useReducer, useEffect } from 'react'
import { calcularVehicular } from '../engine/vehicular.js'

const STORAGE_KEY = 'creditoia_state'
const MAX_SIMS = 10
const MAX_CHAT = 50

// ── Initial state ──────────────────────────────────────────────────────────────

const defaultState = {
  simulaciones: [],
  activa: null,
  comparar: [],
  chatMsgs: [],
  chatLoading: false,
}

/**
 * Load persisted state from localStorage, merging with defaults.
 * chatLoading is always reset to false on load.
 */
function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw)
    return {
      ...defaultState,
      simulaciones: parsed.simulaciones ?? [],
      activa: parsed.activa ?? null,
      comparar: parsed.comparar ?? [],
      chatMsgs: parsed.chatMsgs ?? [],
      chatLoading: false,
    }
  } catch {
    return defaultState
  }
}

// ── Reducer ────────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_SIMULACION': {
      const newSim = action.payload
      const updated = [newSim, ...state.simulaciones]
      // FIFO: keep only the MAX_SIMS most recent (newest at front)
      const evicted = updated.slice(0, MAX_SIMS)
      return {
        ...state,
        simulaciones: evicted,
        activa: newSim.id,
      }
    }

    case 'SET_ACTIVA': {
      return { ...state, activa: action.payload }
    }

    case 'DELETE_SIMULACION': {
      const id = action.payload
      const remaining = state.simulaciones.filter(s => s.id !== id)

      let newActiva = state.activa
      if (state.activa === id) {
        newActiva = remaining.length > 0 ? remaining[0].id : null
      }

      const newComparar = state.comparar.filter(cid => cid !== id)

      return {
        ...state,
        simulaciones: remaining,
        activa: newActiva,
        comparar: newComparar,
      }
    }

    case 'SET_COMPARAR': {
      return { ...state, comparar: action.payload }
    }

    case 'ADD_CHAT_MSG': {
      const msgs = [...state.chatMsgs, action.payload]
      // FIFO: evict oldest if over limit
      const trimmed = msgs.length > MAX_CHAT ? msgs.slice(msgs.length - MAX_CHAT) : msgs
      return { ...state, chatMsgs: trimmed }
    }

    case 'SET_CHAT_LOADING': {
      return { ...state, chatLoading: action.payload }
    }

    case 'APPLY_AI_CONFIG': {
      if (!state.activa) return state

      const mergedParams = {}
      const simulaciones = state.simulaciones.map(sim => {
        if (sim.id !== state.activa) return sim
        const newParams = { ...sim.params, ...action.payload }
        Object.assign(mergedParams, newParams)
        const newResultado = calcularVehicular(newParams)
        return { ...sim, params: newParams, resultado: newResultado }
      })

      return { ...state, simulaciones }
    }

    case 'CLEAR_CHAT': {
      return { ...state, chatMsgs: [] }
    }

    default:
      return state
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * useSimulaciones — manages simulation list, active sim, comparison, and chat.
 *
 * @returns {{ state: object, dispatch: function }}
 */
export default function useSimulaciones() {
  const [state, dispatch] = useReducer(reducer, undefined, loadPersistedState)

  // Persist to localStorage on every state change (exclude chatLoading)
  useEffect(() => {
    try {
      const { chatLoading: _ignored, ...toPersist } = state
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist))
    } catch {
      // Silently ignore quota errors
    }
  }, [state])

  return { state, dispatch }
}
