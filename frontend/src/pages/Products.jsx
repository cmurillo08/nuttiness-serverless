import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listProducts, deleteProduct } from '../api/products'

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-[#8B6F47]" />
    </div>
  )
}

export default function Products() {
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
      const data = await listProducts(limit, offset)
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
      await deleteProduct(id)
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
        <h1 className="text-2xl font-semibold text-[#8B6F47]">Products</h1>
        <button
          type="button"
          onClick={() => navigate('/products/new')}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#8B6F47] px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
        >
          New Product
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
          {search ? 'No products match your search.' : 'No products yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Unit</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Price</th>
                <th className="hidden px-4 py-3 text-right font-medium text-slate-600 sm:table-cell">
                  Cost Price
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
                  <td className="hidden px-4 py-3 text-right text-slate-700 sm:table-cell">
                    {product.cost_price != null
                      ? Number(product.cost_price).toLocaleString('es-CR', {
                          style: 'currency',
                          currency: 'CRC',
                          maximumFractionDigits: 0,
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/products/${product.id}/edit`)}
                        className="min-h-8 rounded px-2 py-1 text-xs font-medium text-[#8B6F47] hover:bg-[#8B6F47]/10"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id, product.name)}
                        disabled={deleting === product.id}
                        className="min-h-8 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deleting === product.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
