import { createBrowserRouter } from 'react-router-dom'
import RouteGuard from './components/RouteGuard'
import Login from './pages/Login'
import Home from './pages/Home'

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <RouteGuard />,
    children: [
      { path: '/', element: <Home /> },
      // future protected routes will be added here in later phases
    ],
  },
])

export default router
