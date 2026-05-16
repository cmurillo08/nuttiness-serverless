import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSale, transitionSale } from '../api/sales'

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
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
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
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium ring-1 ring-inset ${style}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </span>
  )
}

export default function SaleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sale, setSale] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [transitioning, setTransitioning] = useState(false)

  async function loadSale() {
    try {
      const data = await getSale(id)
      setSale(data?.sale ?? data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSale()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleTransition(toStatus) {
    if (!window.confirm(`Mark sale as ${toStatus}?`)) return
    
    setTransitioning(true)
    setError(null)
    try {
      await transitionSale(id, toStatus)
      await loadSale()
    } catch (err) {
      setError(err.message)
    } finally {
      setTransitioning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-[#8B6F47]" />
      </div>
    )
  }

  if (error && !sale) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        <div className="rounded-xl bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
        <button className="mt-4 text-[#8B6F47]" onClick={() => navigate('/sales')}>&larr; Back to sales</button>
      </div>
    )
  }

  const items = sale?.items || []

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button onClick={() => navigate('/sales')} className="text-sm text-stone-500 hover:text-[#8B6F47] mb-4 inline-flex items-center">
          &larr; Back to Sales
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="overflow-hidden bg-white shadow-sm ring-1 ring-black/5 sm:rounded-2xl">
        <div className="px-4 py-6 sm:px-6 border-b border-stone-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold leading-7 text-stone-900 sm:truncate sm:tracking-tight">Sale</h1>
            <p className="mt-1 text-sm text-stone-500">
              Created on {formatDate(sale.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={sale.status} />
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-8">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-stone-500">Customer</dt>
              <dd className="mt-1 text-sm text-stone-900">{sale.customer_name || '—'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-stone-500">Total Amount</dt>
              <dd className="mt-1 text-lg font-semibold text-stone-900">{formatCurrency(sale.total_amount)}</dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-stone-200 px-4 py-6 sm:px-6">
          <h3 className="text-base font-semibold leading-6 text-stone-900 mb-4">Line Items</h3>
          <div className="-mx-4 mt-4 overflow-x-auto sm:-mx-0">
            <table className="min-w-full divide-y divide-stone-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-stone-900 sm:pl-0">Product</th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-stone-900">Unit Price</th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-stone-900">Quantity</th>
                  <th scope="col" className="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-stone-900 sm:pr-0">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-stone-900 sm:pl-0">
                      {item.product_name || 'Unknown Product'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-stone-500 text-right">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-stone-500 text-right">
                      {item.quantity}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-4 text-sm text-stone-900 font-medium text-right sm:pr-0">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={3} className="hidden pl-4 pr-3 pt-6 text-right text-sm font-semibold text-stone-900 sm:table-cell sm:pl-0">
                    Total
                  </th>
                  <th scope="row" className="pl-4 pr-3 pt-6 text-left text-sm font-semibold text-stone-900 sm:hidden">
                    Total
                  </th>
                  <td className="pl-3 pr-4 pt-6 text-right text-sm font-semibold text-stone-900 sm:pr-0">
                    {formatCurrency(sale.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="bg-stone-50 px-4 py-4 sm:px-6 flex flex-col sm:flex-row justify-end gap-3 rounded-b-2xl">
          {sale.status === 'ordered' && (
            <button
              onClick={() => handleTransition('prepared')}
              disabled={transitioning}
              className="inline-flex justify-center rounded-xl bg-[#8B6F47] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#7A603C] disabled:opacity-50"
            >
              Mark as Prepared
            </button>
          )}

          {sale.status === 'prepared' && (
            <button
              onClick={() => handleTransition('delivered')}
              disabled={transitioning}
              className="inline-flex justify-center rounded-xl bg-[#8B6F47] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#7A603C] disabled:opacity-50"
            >
              Mark as Delivered
            </button>
          )}

          {sale.status === 'delivered' && (
            <button
              onClick={() => handleTransition('paid')}
              disabled={transitioning}
              className="inline-flex justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
            >
              Mark as Paid
            </button>
          )}

          {!['paid', 'cancelled'].includes(sale.status) && (
            <button
              onClick={() => handleTransition('cancelled')}
              disabled={transitioning}
              className="inline-flex justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 shadow-sm ring-1 ring-inset ring-stone-300 hover:bg-stone-50 disabled:opacity-50"
            >
              Cancel Sale
            </button>
          )}

          {(sale.status === 'paid' || sale.status === 'cancelled') && (
            <span className="text-sm font-medium text-stone-500 py-2">
              No further actions available for {sale.status} sales.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
