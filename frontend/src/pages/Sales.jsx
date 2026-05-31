import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listSales } from '../api/sales'
import Pagination from '../components/Pagination'

function formatCurrency(value) {
  if (value == null) return '—'
  return Number(value).toLocaleString('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  })
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-CR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

function StatusBadge({ status }) {
  const styles = {
    ordered: 'bg-violet-100 text-violet-800 ring-violet-600/20',
    prepared: 'bg-amber-100 text-amber-800 ring-amber-600/20',
    delivered: 'bg-blue-100 text-blue-800 ring-blue-600/20',
    paid: 'bg-green-100 text-green-800 ring-green-600/20',
    cancelled: 'bg-stone-100 text-stone-800 ring-stone-600/20',
  }
  const defaultStyle = 'bg-stone-100 text-stone-800 ring-stone-600/20'
  const style = styles[status] || defaultStyle
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${style}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </span>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-primary" />
    </div>
  )
}

function EyeIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export default function Sales() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [limit, setLimit] = useState(25)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listSales({ limit, page, status: statusFilter })
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(typeof data?.total === 'number' ? data.total : 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [limit, page, statusFilter])

  useEffect(() => {
    fetchPage()
  }, [fetchPage])

  function handleTabChange(newStatus) {
    setStatusFilter(newStatus)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-primary">Sales</h1>
        <Link
          to="/sales/new"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
        >
          New Sale
        </Link>
      </div>

      <div className="sm:max-w-xs">
        <label className="block text-sm font-medium text-slate-700 mb-1">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => handleTabChange(e.target.value)}
          className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="Filter by status"
        >
          <option value="">All</option>
          <option value="ordered">Ordered</option>
          <option value="prepared">Prepared</option>
          <option value="delivered">Delivered</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading && <Spinner />}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-500">No sales found.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <dl className="space-y-2">
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Date</dt>
                    <dd className="text-sm font-medium text-slate-900">{formatDate(item.created_at)}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Customer</dt>
                    <dd className="text-sm text-slate-700">{item.customer_name || '—'}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Total</dt>
                    <dd className="text-sm text-slate-700">{formatCurrency(item.total_amount)}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</dt>
                    <dd><StatusBadge status={item.status} /></dd>
                  </div>
                </dl>
                <div className="mt-3 flex gap-2 border-t border-stone-100 pt-3">
                  <Link
                    to={`/sales/${item.id}`}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-primary/30 px-3 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    <EyeIcon className="h-4 w-4" /> View
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-auto max-h-[calc(100vh-300px)] rounded-lg border border-stone-200 bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-stone-300">
              <thead className="sticky top-0 z-10 bg-stone-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-600">Date</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-600">Customer</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-600">Total</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                  <th scope="col" className="relative px-4 py-3 text-right text-sm font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-stone-500">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-stone-900">
                      {item.customer_name || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-left text-sm text-stone-500">
                      {formatCurrency(item.total_amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-stone-500">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="relative whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                      <Link
                        to={`/sales/${item.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        aria-label="View sale"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && !error && total > 0 && (
        <Pagination
          total={total}
          limit={limit}
          offset={(page - 1) * limit}
          onLimitChange={(newLimit) => {
            setLimit(newLimit)
            setPage(1)
          }}
          onOffsetChange={(newOffset) => setPage(Math.floor(newOffset / limit) + 1)}
        />
      )}
    </div>
  )
}
