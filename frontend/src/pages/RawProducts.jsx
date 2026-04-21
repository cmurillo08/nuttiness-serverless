import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listRawProducts, deleteRawProduct } from '../api/products'

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
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-[#8B6F47]" />
    </div>
  )
}

export default function RawProducts() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [limit] = useState(25)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)

  const fetchPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listRawProducts(limit, offset)
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(typeof data?.total === 'number' ? data.total : 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [limit, offset])

  useEffect(() => {
    fetchPage()
  }, [fetchPage])

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await deleteRawProduct(id)
      await fetchPage()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  const filtered = items.filter(
    (it) => !search || it.name?.toLowerCase().includes(search.toLowerCase())
  )

  const start = total === 0 ? 0 : offset + 1
  const end = Math.min(offset + items.length, total)
  const hasPrev = offset > 0
  const hasNext = offset + limit < total

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-[#8B6F47]">Raw Products</h1>
        <button
          type="button"
          onClick={() => navigate('/raw-products/new')}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#8B6F47] px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
        >
          New Raw Product
        </button>
      </div>

      {/* Search */}
      <div className="sm:max-w-sm">
        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#8B6F47] focus:outline-none focus:ring-2 focus:ring-[#8B6F47]/30"
        />
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
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          {search ? 'No raw products match your search.' : 'No raw products yet.'}
        </p>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((product) => (
              <div key={product.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <dl className="space-y-2">
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</dt>
                    <dd className="text-sm font-medium text-slate-900">{product.name}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Unit</dt>
                    <dd className="text-sm text-slate-700">{product.unit}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Purchase Price</dt>
                    <dd className="text-sm text-slate-700">
                      {product.price != null
                        ? Number(product.price).toLocaleString('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 })
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Supplier</dt>
                    <dd className="text-sm text-slate-700">{product.supplier || '—'}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex gap-2 border-t border-stone-100 pt-3">
                  <button type="button" onClick={() => navigate(`/raw-products/${product.id}/edit`)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#8B6F47]/30 px-3 text-sm font-medium text-[#8B6F47]"
                    aria-label={`Edit ${product.name}`}>
                    <EditIcon className="h-4 w-4" /> Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(product.id, product.name)}
                    disabled={deleting === product.id}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 disabled:opacity-50"
                    aria-label={`Delete ${product.name}`}>
                    <TrashIcon className="h-4 w-4" />
                    {deleting === product.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm lg:block">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Unit</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Purchase Price</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-slate-600 sm:table-cell">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                    <td className="px-4 py-3 text-slate-600">{product.unit}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {product.price != null
                        ? Number(product.price).toLocaleString('es-CR', {
                            style: 'currency',
                            currency: 'CRC',
                            maximumFractionDigits: 0,
                          })
                        : '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                      {product.supplier || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/raw-products/${product.id}/edit`)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8B6F47] hover:bg-[#8B6F47]/10"
                          aria-label={`Edit ${product.name}`}
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product.id, product.name)}
                          disabled={deleting === product.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                          aria-label={`Delete ${product.name}`}
                        >
                          {deleting === product.id ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <TrashIcon className="h-4 w-4" />}
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {start}–{end} of {total}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={!hasPrev}
              className="min-h-9 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setOffset(offset + limit)}
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
