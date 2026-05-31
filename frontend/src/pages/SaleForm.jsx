import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSale } from '../api/sales'
import { listProducts } from '../api/products'
import CustomerSelect from '../components/CustomerSelect'

function formatCurrency(value) {
  if (value == null) return '—'
  return Number(value).toLocaleString('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  })
}

export default function SaleForm() {
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  
  const [customerId, setCustomerId] = useState('')
  const [status, setStatus] = useState('ordered')
  const [items, setItems] = useState([
    { prepared_product_id: '', quantity: 1, unit_price: '' }
  ])

  useEffect(() => {
    let mounted = true
    async function loadData() {
      try {
        const prodRes = await listProducts(500, 0)
        if (mounted) {
          setProducts(Array.isArray(prodRes?.items) ? prodRes.items : [])
        }
      } catch (err) {
        if (mounted) setError(err.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadData()
    return () => { mounted = false }
  }, [])

  function addLineItem() {
    setItems((prev) => [...prev, { prepared_product_id: '', quantity: 1, unit_price: '' }])
  }

  function removeLineItem(index) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleItemChange(index, field, value) {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      
      // Auto-fill price if product changes
      if (field === 'prepared_product_id') {
        const product = products.find((p) => String(p.id) === String(value))
        if (product && product.price) {
          next[index].unit_price = product.price
        }
      }
      return next
    })
  }

  const grandTotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unit_price) || 0
    return sum + (qty * price)
  }, 0)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    
    // Validate
    const invalidItem = items.find(
      (item) => !item.prepared_product_id || Number(item.quantity) <= 0 || Number(item.unit_price) < 0
    )
    if (invalidItem) {
      setError('Please ensure all items have a selected product, quantity > 0, and a valid price.')
      return
    }

    const payload = {
      customer_id: customerId || null,
      status,
      lines: items.map((item) => ({
        prepared_product_id: item.prepared_product_id,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price)
      }))
    }

    setSubmitting(true)
    try {
      await createSale(payload)
      navigate('/sales')
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-primary">New Sale</h1>

      <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="customer" className="block text-sm font-medium text-slate-700">
              Customer
            </label>
            <CustomerSelect 
              value={customerId} 
              onChange={setCustomerId} 
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="status" className="block text-sm font-medium text-slate-700">
              Initial Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="ordered">Ordered</option>
              <option value="prepared">Prepared</option>
              <option value="delivered">Delivered</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-700 mb-3">Line Items</h3>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-stone-700 sm:hidden mb-1">Product</label>
                  <select
                    value={item.prepared_product_id}
                    onChange={(e) => handleItemChange(index, 'prepared_product_id', e.target.value)}
                    className="min-h-10 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  >
                    <option value="">Select a product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.unit ? `${p.name} - ${p.unit}` : p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="w-full sm:w-24">
                  <label className="block text-xs font-medium text-stone-700 sm:hidden mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="min-h-10 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>

                <div className="w-full sm:w-32">
                  <label className="block text-xs font-medium text-stone-700 sm:hidden mb-1">Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                    className="min-h-10 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>

                <div className="w-full sm:w-32 flex justify-between items-center sm:block">
                  <span className="text-sm font-medium text-stone-900 sm:hidden">Line Total</span>
                  <div className="text-sm font-medium text-stone-900 text-right">
                    {formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeLineItem(index)}
                  disabled={items.length <= 1}
                  className="text-stone-400 hover:text-red-500 disabled:opacity-50 focus:outline-none"
                  title="Remove item"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between items-center sm:justify-start">
            <button
              type="button"
              onClick={addLineItem}
              className="text-sm font-semibold text-primary hover:text-primary/80"
            >
              + Add another line
            </button>
          </div>
        </div>

        <div className="border-t border-stone-200 pt-4 flex justify-end items-center gap-6">
          <span className="text-sm font-medium text-slate-700">Grand Total</span>
          <span className="text-lg font-bold text-slate-900">{formatCurrency(grandTotal)}</span>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-5">
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
