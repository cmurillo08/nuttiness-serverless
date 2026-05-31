import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listCustomers, deleteCustomer } from '../api/customers'
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

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-primary" />
    </div>
  )
}

export default function Customers() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [limit, setLimit] = useState(25)
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch] = useState('')

  const fetchPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listCustomers({ limit, page })
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(typeof data?.total === 'number' ? data.total : 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [limit, page])

  useEffect(() => {
    fetchPage()
  }, [fetchPage])

  async function handleDelete(id) {
    if (!window.confirm('Delete this customer? This cannot be undone.')) return
    setDeleting(id)
    try {
      await deleteCustomer(id)
      await fetchPage()
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(null)
    }
  }

  function handleSearchChange(e) {
    setSearch(e.target.value)
    setPage(1)
  }

  const offset = (page - 1) * limit
  const hasPrev = page > 1
  const hasNext = offset + limit < total

  const filteredItems = useMemo(() => {
    if (!search) return items
    return items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
  }, [items, search])

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-primary">Customers</h1>
        <Link
          to="/customers/new"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90 sm:w-auto"
        >
          New Customer
        </Link>
      </div>

      <div className="sm:max-w-sm">
        <input
          type="text"
          placeholder="Search by name"
          value={search}
          onChange={handleSearchChange}
          className="min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {loading && <Spinner />}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && filteredItems.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-500">No customers found.</p>
      )}

      {!loading && !error && filteredItems.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {filteredItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <dl className="space-y-2">
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</dt>
                    <dd className="text-sm font-medium text-slate-900">{item.name}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Phone</dt>
                    <dd className="text-sm text-slate-700">{item.phone || '—'}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</dt>
                    <dd className="text-sm text-slate-700">{item.notes || '—'}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex gap-2 border-t border-stone-100 pt-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/customers/${item.id}/edit`)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-primary/30 px-3 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    <EditIcon className="h-4 w-4" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deleting === item.id}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/60"
                  >
                    <TrashIcon className="h-4 w-4" /> {deleting === item.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-auto max-h-[calc(100vh-280px)] rounded-lg border border-stone-200 bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-stone-300">
              <thead className="sticky top-0 z-10 bg-stone-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-600">Name</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-600">Phone</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-600 hidden sm:table-cell">Notes</th>
                  <th scope="col" className="relative px-4 py-3 text-right text-sm font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-stone-900">
                      {item.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-stone-500">
                      {item.phone || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-500 hidden sm:table-cell truncate max-w-[200px]">
                      {item.notes || '—'}
                    </td>
                    <td className="relative whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/customers/${item.id}/edit`)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                          title="Edit"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/60"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
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

      {!loading && !error && total > 0 && (
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
