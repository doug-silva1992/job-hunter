import { useEffect, useState } from 'react'
import './App.css'

type Health = { status: string }

function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<Health>
      })
      .then(setHealth)
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <section id="center">
      <h1>Job Hunter</h1>
      <p>
        Backend:{' '}
        {error ? `erro (${error})` : health ? health.status : 'conectando...'}
      </p>
      <p>
        <a href="/api/docs" target="_blank" rel="noreferrer">
          Abrir documentação Swagger
        </a>
      </p>
    </section>
  )
}

export default App
