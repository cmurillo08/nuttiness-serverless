import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listExpenses, deleteExpense } from '../api/expenses'
import { listRawProducts } from '../api/products'
import Pagination from '../components/Pagination'

function EditIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
    </svg>
  )
}

function TrashIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function SpinnerIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-primary" />
    </div>
  )
}

function formatCost(value) {
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

export default function Expenses() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [limit, setLimit] = useState(25)
  const [page, setPage] = useState(1)
  const [rawProducts, setRawProducts] = useState([])
  const [rawProductFilter, setRawProductFilter] = useState('')
  const [deleting, setDeleting] = useState(null)

  // Load raw products for filter dropdown once on mount
  useEffect(() => {
    listRawProducts(200, 0)
      .then((data) => setRawProducts(Array.isArray(data?.items) ? data.items : []))
      .catch(() => {/* non-critical, filter just won't show options */})
  }, [])

  const fetchPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    const offset = (page - 1) * limit
    try {
      const data = await listExpenses(limit, offset, rawProductFilter || null)
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(typeof data?.total === 'number' ? data.total : 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [limit, page, rawProductFilter])

  useEffect(() => {
    fetchPage()
  }, [fetchPage])

  // Reset to page 1 when filter changes
  function handleFilterChange(e) {
    setRawProductFilter(e.target.value)
    setPage(1)
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense? This cannot be undone.')) return
    setDeleting(id)
    try {
      await deleteExpense(id)
      await fetchPage()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  const offset = (page - 1) * limit
  const start = total === 0 ? 0 : offset + 1
  const end = Math.min(offset + items.length, total)
  const hasPrev = page > 1
  const hasNext = offset + limit < total

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-primary">Expenses</h1>
        <button
          type="button"
          onClick={() => navigate('/expenses/new')}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
        >
          New Expense
        </button>
      </div>

      {/* Filter */}
      <div className="sm:max-w-sm">
        <label className="mb-1 block text-sm font-medium text-slate-700">Raw Product</label>
        <select
          value={rawProductFilter}
          onChange={handleFilterChange}
          className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="Filter by raw product"
        >
          <option value="">All raw products</option>
          {rawProducts.map((rp) => (
            <option key={rp.id} value={rp.id}>
              {rp.name}{rp.supplier ? ` — ${rp.supplier}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          {rawProductFilter ? 'No expenses match the selected filter.' : 'No expenses yet.'}
        </p>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="space-y-3 lg:hidden">
            {items.map((expense) => (
              <div key={expense.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <dl className="space-y-2">
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Purchased At</dt>
                    <dd className="text-sm font-medium text-slate-900">{formatDate(expense.purchased_at)}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Raw Product</dt>
                    <dd className="text-sm text-slate-700">
                      {expense.raw_product?.name ?? expense.raw_product_id}
                    </dd>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Qty</dt>
                      <dd className="text-sm text-slate-700">{expense.quantity}</dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Cost</dt>
                      <dd className="text-sm text-slate-700">{formatCost(expense.cost)}</dd>
                    </div>
                  </div>
                  {expense.notes && (
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</dt>
                      <dd className="text-sm text-slate-600">{expense.notes}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-3 flex gap-2 border-t border-stone-100 pt-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/expenses/${expense.id}/edit`)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-primary/30 px-3 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    aria-label="Edit expense"
                  >
                    <EditIcon className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(expense.id)}
                    disabled={deleting === expense.id}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/60"
                    aria-label="Delete expense"
                  >
                    <TrashIcon className="h-4 w-4" />
                    {deleting === expense.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-auto max-h-[calc(100vh-300px)] rounded-lg border border-stone-200 bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="sticky top-0 z-10 bg-stone-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-600">Purchased At</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-600">Raw Product</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-600">Quantity</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-600">Cost</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-600 hidden sm:table-cell">Notes</th>
                  <th scope="col" className="relative px-4 py-3 text-right text-sm font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((expense) => (
                  <tr key={expense.id} className="hover:bg-stone-50/50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-stone-500">{formatDate(expense.purchased_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-stone-900">
                      {expense.raw_product?.name ?? expense.raw_product_id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-left text-sm text-stone-500">{expense.quantity}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-left text-sm text-stone-500">{formatCost(expense.cost)}</td>
                    <td className="px-4 py-3 text-sm text-stone-500 truncate max-w-xs hidden sm:table-cell">{expense.notes ?? '—'}</td>
                    <td className="relative whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/expenses/${expense.id}/edit`)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                          aria-label="Edit expense"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(expense.id)}
                          disabled={deleting === expense.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/60"
                          aria-label="Delete expense"
                        >
                          {deleting === expense.id
                            ? <SpinnerIcon className="h-4 w-4 animate-spin" />
                            : <TrashIcon className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <Pagination
          total={total}
          limit={limit}
          offset={offset}
          onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
          onOffsetChange={(newOffset) => setPage(Math.floor(newOffset / limit) + 1)}
        />
      )}
    </div>
  )
}
