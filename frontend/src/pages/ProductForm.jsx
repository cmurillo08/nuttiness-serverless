import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProduct, createProduct, updateProduct } from '../api/products'

export default function ProductForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [fields, setFields] = useState({
    name: '',
    unit: '',
    price: '',
    recipe_notes: '',
  })
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    let mounted = true
    getProduct(id)
      .then((data) => {
        if (!mounted) return
        const product = data?.product ?? data
        setFields({
          name: product.name ?? '',
          unit: product.unit ?? '',
          price: product.price != null ? String(product.price) : '',
          recipe_notes: product.recipe_notes ?? '',
        })
      })
      .catch((err) => {
        if (mounted) setError(err.message)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [id, isEdit])

  function handleChange(e) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const body = {
      name: fields.name.trim(),
      unit: fields.unit.trim(),
      price: fields.price !== '' ? Number(fields.price) : undefined,
      recipe_notes: fields.recipe_notes.trim() || undefined,
    }

    try {
      if (isEdit) {
        await updateProduct(id, body)
      } else {
        await createProduct(body)
      }
      navigate('/products')
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-[#8B6F47]" />
      </div>
    )
  }

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-[#8B6F47]">
        {isEdit ? 'Edit Product' : 'New Product'}
      </h1>

      <div className="max-w-2xl">
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={fields.name}
                onChange={handleChange}
                className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#8B6F47] focus:outline-none focus:ring-2 focus:ring-[#8B6F47]/30"
                placeholder="e.g. Granola Bar"
              />
            </div>

            {/* Unit */}
            <div className="space-y-1.5">
              <label htmlFor="unit" className="block text-sm font-medium text-slate-700">
                Unit <span className="text-red-500">*</span>
              </label>
              <input
                id="unit"
                name="unit"
                type="text"
                required
                value={fields.unit}
                onChange={handleChange}
                className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#8B6F47] focus:outline-none focus:ring-2 focus:ring-[#8B6F47]/30"
                placeholder="e.g. un, kg, dz"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="price" className="block text-sm font-medium text-slate-700">
                Price <span className="text-red-500">*</span>
              </label>
              <input
                id="price"
                name="price"
                type="number"
                required
                min="0"
                step="0.01"
                value={fields.price}
                onChange={handleChange}
                className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#8B6F47] focus:outline-none focus:ring-2 focus:ring-[#8B6F47]/30"
                placeholder="0.00"
              />
            </div>

            {/* Recipe Notes */}
            <div className="space-y-1.5">
              <label htmlFor="recipe_notes" className="block text-sm font-medium text-slate-700">
                Recipe Notes
              </label>
              <textarea
                id="recipe_notes"
                name="recipe_notes"
                rows={4}
                value={fields.recipe_notes}
                onChange={handleChange}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#8B6F47] focus:outline-none focus:ring-2 focus:ring-[#8B6F47]/30"
                placeholder="Optional notes about the recipe…"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="min-h-11 flex-1 rounded-lg bg-[#8B6F47] px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-6"
              >
                {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/products')}
                className="min-h-11 flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-50 sm:flex-none sm:px-6"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
