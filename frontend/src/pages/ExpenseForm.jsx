import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getExpense, createExpense, updateExpense } from '../api/expenses'
import { listRawProducts } from '../api/products'

export default function ExpenseForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const today = new Date().toISOString().slice(0, 10)

  const [fields, setFields] = useState({
    raw_product_id: '',
    purchased_at: today,
    quantity: '',
    notes: '',
  })
  const [rawProducts, setRawProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    let mounted = true

    async function loadData() {
      try {
        // Always load raw products for the select
        const rpData = await listRawProducts(200, 0)
        if (mounted) {
          setRawProducts(Array.isArray(rpData?.items) ? rpData.items : [])
        }

        // If editing, load the existing expense
        if (isEdit) {
          const data = await getExpense(id)
          if (!mounted) return
          const expense = data?.expense ?? data
          setFields({
            raw_product_id: expense.raw_product_id ?? '',
            purchased_at: expense.purchased_at
              ? expense.purchased_at.slice(0, 10)
              : today,
            quantity: expense.quantity != null ? String(expense.quantity) : '',
            notes: expense.notes ?? '',
          })
        }
      } catch (err) {
        if (mounted) setError(err.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadData()
    return () => { mounted = false }
  }, [id, isEdit, today])

  function handleChange(e) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    // Clear field-level validation error on change
    if (validationErrors[name]) {
      setValidationErrors((prev) => { const next = { ...prev }; delete next[name]; return next })
    }
  }

  const selectedRawProduct = rawProducts.find((rp) => String(rp.id) === String(fields.raw_product_id))
  const calculatedCost =
    selectedRawProduct && fields.quantity !== '' && !isNaN(Number(fields.quantity))
      ? Number(selectedRawProduct.price) * Number(fields.quantity)
      : null

  function validate() {
    const errs = {}
    if (!fields.raw_product_id) errs.raw_product_id = 'Raw product is required.'
    if (!fields.purchased_at) errs.purchased_at = 'Purchase date is required.'
    const qty = Number(fields.quantity)
    if (!fields.quantity || isNaN(qty) || qty <= 0) errs.quantity = 'Quantity must be greater than 0.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs)
      return
    }
    setValidationErrors({})

    // Normalize date: append T00:00:00Z if it's a plain YYYY-MM-DD value
    const purchasedAt = /^\d{4}-\d{2}-\d{2}$/.test(fields.purchased_at)
      ? `${fields.purchased_at}T00:00:00Z`
      : fields.purchased_at

    const payload = {
      raw_product_id: fields.raw_product_id,
      purchased_at: purchasedAt,
      quantity: Number(fields.quantity),
      cost: calculatedCost ?? 0,
      notes: fields.notes.trim() || null,
    }

    setSubmitting(true)
    try {
      if (isEdit) {
        await updateExpense(id, payload)
      } else {
        await createExpense(payload)
      }
      navigate('/expenses')
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-primary" />
      </div>
    )
  }

  const inputClass =
    'min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
  const inputErrClass =
    'min-h-11 w-full rounded-lg border border-red-400 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-400/30'

  function fieldClass(name) {
    return validationErrors[name] ? inputErrClass : inputClass
  }

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-primary">
        {isEdit ? 'Edit Expense' : 'New Expense'}
      </h1>

      <div className="max-w-2xl">
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {/* Raw Product */}
            <div className="space-y-1.5">
              <label htmlFor="raw_product_id" className="block text-sm font-medium text-slate-700">
                Raw Product <span className="text-red-500">*</span>
              </label>
              <select
                id="raw_product_id"
                name="raw_product_id"
                value={fields.raw_product_id}
                onChange={handleChange}
                className={fieldClass('raw_product_id')}
              >
                <option value="">Select a raw product…</option>
                {rawProducts.map((rp) => (
                  <option key={rp.id} value={rp.id}>
                    {rp.name}{rp.supplier ? ` — ${rp.supplier}` : ''}
                  </option>
                ))}
              </select>
              {validationErrors.raw_product_id && (
                <p className="text-xs text-red-600">{validationErrors.raw_product_id}</p>
              )}
            </div>

            {/* Purchased At */}
            <div className="space-y-1.5">
              <label htmlFor="purchased_at" className="block text-sm font-medium text-slate-700">
                Purchased At <span className="text-red-500">*</span>
              </label>
              <input
                id="purchased_at"
                name="purchased_at"
                type="date"
                value={fields.purchased_at}
                onChange={handleChange}
                className={fieldClass('purchased_at')}
              />
              {validationErrors.purchased_at && (
                <p className="text-xs text-red-600">{validationErrors.purchased_at}</p>
              )}
            </div>

            {/* Quantity + Cost row — side by side on sm+ */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Quantity */}
              <div className="space-y-1.5">
                <label htmlFor="quantity" className="block text-sm font-medium text-slate-700">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={fields.quantity}
                  onChange={handleChange}
                  className={fieldClass('quantity')}
                  placeholder="0.00"
                />
                {validationErrors.quantity && (
                  <p className="text-xs text-red-600">{validationErrors.quantity}</p>
                )}
              </div>

              {/* Cost (computed) */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Cost</label>
                <input
                  readOnly
                  value={
                    calculatedCost != null
                      ? calculatedCost.toLocaleString('es-CR', {
                          style: 'currency',
                          currency: 'CRC',
                          maximumFractionDigits: 0,
                        })
                      : ''
                  }
                  placeholder="Select a product and enter quantity"
                  className="min-h-11 w-full cursor-default rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-slate-700"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={fields.notes}
                onChange={handleChange}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Optional notes about this purchase…"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/expenses')}
                className="min-h-11 flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-50 sm:flex-none sm:px-6"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-11 flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-6"
              >
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
