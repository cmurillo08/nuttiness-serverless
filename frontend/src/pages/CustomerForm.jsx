import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCustomer, createCustomer, updateCustomer } from '../api/customers'

export default function CustomerForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [fields, setFields] = useState({
    name: '',
    phone: '',
    notes: '',
  })
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    let mounted = true
    if (!isEdit) return

    async function loadData() {
      try {
        const data = await getCustomer(id)
        if (!mounted) return
        const customer = data?.customer ?? data
        setFields({
          name: customer.name ?? '',
          phone: customer.phone ?? '',
          notes: customer.notes ?? '',
        })
      } catch (err) {
        if (mounted) setError(err.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadData()
    return () => { mounted = false }
  }, [id, isEdit])

  function handleChange(e) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    if (validationErrors[name]) {
      setValidationErrors((prev) => { const next = { ...prev }; delete next[name]; return next })
    }
  }

  function validate() {
    const errs = {}
    if (!fields.name.trim()) errs.name = 'Name is required.'
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

    const payload = {
      name: fields.name.trim(),
      phone: fields.phone.trim() || null,
      notes: fields.notes.trim() || null,
    }

    setSubmitting(true)
    try {
      if (isEdit) {
        await updateCustomer(id, payload)
      } else {
        await createCustomer(payload)
      }
      navigate('/customers')
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-[#8B6F47]" />
      </div>
    )
  }

  const inputClass =
    'min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#8B6F47] focus:outline-none focus:ring-2 focus:ring-[#8B6F47]/30'
  const inputErrClass =
    'min-h-11 w-full rounded-lg border border-red-400 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-400/30'

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-[#8B6F47]">
        {isEdit ? 'Edit Customer' : 'New Customer'}
      </h1>

      <div className="max-w-2xl">
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={fields.name}
                onChange={handleChange}
                className={validationErrors.name ? inputErrClass : inputClass}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-600">{validationErrors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                Phone
              </label>
              <input
                type="text"
                name="phone"
                id="phone"
                value={fields.phone}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
                Notes
              </label>
              <textarea
                name="notes"
                id="notes"
                rows={3}
                value={fields.notes}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-5">
              <button
                type="button"
                onClick={() => navigate('/customers')}
                className="min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-11 rounded-lg bg-[#8B6F47] px-6 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Customer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
