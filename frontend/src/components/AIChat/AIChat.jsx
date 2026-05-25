import { useState, useContext, useRef, useEffect } from 'react'
import { SimContext } from '../../App.jsx'
import useAIChat from '../../hooks/useAIChat.js'
import styles from './AIChat.module.css'

export default function AIChat() {
  const { dispatch } = useContext(SimContext)
  const { sendMessage, loading, msgs } = useAIChat()
  const [inputValue, setInputValue] = useState('')
  const msgsEndRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, loading])

  function handleSend() {
    const text = inputValue.trim()
    if (!text || loading) return
    setInputValue('')
    sendMessage(text)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleClear() {
    dispatch({ type: 'CLEAR_CHAT' })
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.msgs}>
        {msgs.map((msg, i) => (
          <div
            key={i}
            className={`${styles.msg} ${msg.role === 'user' ? styles.user : styles.assistant}`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className={`${styles.msg} ${styles.assistant}`}>...</div>
        )}
        <div ref={msgsEndRef} />
      </div>

      <div className={styles.inputRow}>
        <input
          className={styles.input}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu pregunta..."
          disabled={loading}
        />
        <button
          className={styles.btn}
          onClick={handleSend}
          disabled={loading || !inputValue.trim()}
        >
          Enviar
        </button>
        <button
          className={styles.btn}
          onClick={handleClear}
          style={{ background: 'transparent', color: 'var(--text-muted, #8b949e)', fontWeight: 400 }}
        >
          Limpiar
        </button>
      </div>
    </div>
  )
}
