import { useEffect, useState } from 'react'

// A success/info alert that clears itself after a few seconds.
export default function useAutoAlert(ms = 5000) {
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    if (!alert) return undefined
    const t = setTimeout(() => setAlert(null), ms)
    return () => clearTimeout(t)
  }, [alert, ms])

  return [alert, setAlert]
}
