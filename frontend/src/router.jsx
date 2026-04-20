import { createBrowserRouter } from 'react-router-dom'
import RouteGuard from './components/RouteGuard'
import AppShell from './layouts/AppShell'
import Login from './pages/Login'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductForm from './pages/ProductForm'
import RawProducts from './pages/RawProducts'
import RawProductForm from './pages/RawProductForm'

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <RouteGuard />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/products', element: <Products /> },
          { path: '/products/new', element: <ProductForm /> },
          { path: '/products/:id/edit', element: <ProductForm /> },
          { path: '/raw-products', element: <RawProducts /> },
          { path: '/raw-products/new', element: <RawProductForm /> },
          { path: '/raw-products/:id/edit', element: <RawProductForm /> },
        ],
      },
    ],
  },
])

export default router
