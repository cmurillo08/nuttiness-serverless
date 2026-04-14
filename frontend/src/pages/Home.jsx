import { useEffect, useState } from 'react'

export default function Home() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let isMounted = true

    async function checkApi() {
      try {
        const response = await fetch('/api/v1/health')
        if (!response.ok) {
          throw new Error('API returned a non-200 response')
        }

        await response.json()
        if (isMounted) {
          setStatus('success')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    checkApi()

    return () => {
      isMounted = false
    }
  }, [])

  const message =
    status === 'loading'
      ? 'Checking API…'
      : status === 'success'
        ? '✓ API is online'
        : '✗ API unreachable'

  const statusStyles =
    status === 'loading'
      ? 'bg-slate-100 text-slate-700 ring-slate-200'
      : status === 'success'
        ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
        : 'bg-rose-100 text-rose-800 ring-rose-200'

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-2xl items-center justify-center sm:min-h-[calc(100vh-3rem)]">
        <section className="w-full rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Nuttiness</h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Serverless frontend scaffold health check
          </p>
          <div className={`mt-6 rounded-xl px-4 py-3 text-sm font-medium ring-1 sm:text-base ${statusStyles}`}>
            {message}
          </div>
        </section>
      </div>
    </main>
  )
}
