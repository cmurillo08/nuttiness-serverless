import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { me } from '../api/auth'

export default function RouteGuard() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    me()
      .then(() => setStatus('authenticated'))
      .catch(() => setStatus('unauthenticated'))
  }, [])

  if (status === 'loading') return null
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  return <Outlet />
}
