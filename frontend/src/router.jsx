import { createBrowserRouter } from 'react-router-dom'
import RouteGuard from './components/RouteGuard'
import AppShell from './layouts/AppShell'
import Login from './pages/Login'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductForm from './pages/ProductForm'
import RawProducts from './pages/RawProducts'
import RawProductForm from './pages/RawProductForm'
import Expenses from './pages/Expenses'
import ExpenseForm from './pages/ExpenseForm'
import Customers from './pages/Customers'
import CustomerForm from './pages/CustomerForm'
import Sales from './pages/Sales'
import SaleForm from './pages/SaleForm'
import SaleDetail from './pages/SaleDetail'

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
          { path: '/expenses', element: <Expenses /> },
          { path: '/expenses/new', element: <ExpenseForm /> },
          { path: '/expenses/:id/edit', element: <ExpenseForm /> },
          { path: '/customers', element: <Customers /> },
          { path: '/customers/new', element: <CustomerForm /> },
          { path: '/customers/:id/edit', element: <CustomerForm /> },
          { path: '/sales', element: <Sales /> },
          { path: '/sales/new', element: <SaleForm /> },
          { path: '/sales/:id', element: <SaleDetail /> },
        ],
      },
    ],
  },
])

export default router
