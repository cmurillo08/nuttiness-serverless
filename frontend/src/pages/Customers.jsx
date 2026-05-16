import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listCustomers, deleteCustomer } from '../api/customers'

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
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-[#8B6F47]" />
    </div>
  )
}

export default function Customers() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [limit] = useState(25)
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState(null)

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

  const offset = (page - 1) * limit
  const hasPrev = page > 1
  const hasNext = offset + limit < total

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-[#8B6F47]">Customers</h1>
        <Link
          to="/customers/new"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#8B6F47] px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
        >
          New Customer
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-stone-300">
          <thead className="bg-stone-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-600">Name</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-600">Phone</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-600 hidden sm:table-cell">Notes</th>
              <th scope="col" className="relative px-4 py-3 text-right text-sm font-medium text-slate-600">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-12"><Spinner /></td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={4} className="py-8 px-4 text-center text-sm text-red-600">{error}</td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 px-4 text-center text-sm text-stone-500">No customers found.</td>
                    </tr>
                  ) : (
                    items.map((item) => (
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
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => navigate(`/customers/${item.id}/edit`)}
                              className="text-stone-400 hover:text-[#8B6F47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B6F47]/60 rounded p-1"
                              title="Edit"
                            >
                              <EditIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={deleting === item.id}
                              className="text-stone-400 hover:text-red-600 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/60 rounded p-1"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

      {!loading && !error && total > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {offset + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrev}
              className="min-h-9 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => hasNext && setPage((p) => p + 1)}
              disabled={!hasNext}
              className="min-h-9 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
