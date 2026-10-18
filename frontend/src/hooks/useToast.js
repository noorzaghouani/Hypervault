import { useState, useCallback } from 'react'

let nextId = 0

export function useToast() {
  const [toasts, setToasts] = useState([])

  const toast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, type, title, message, duration }])
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}
