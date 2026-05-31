import { useState, useEffect, useRef } from 'react'
import { listAllCustomers, createCustomer } from '../api/customers'

export default function CustomerSelect({ value, onChange, placeholder = "Select a customer..." }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [isOpen, setIsOpen] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  
  const dropdownRef = useRef(null)

  useEffect(() => {
    let mounted = true
    async function fetchCustomers() {
      try {
        const res = await listAllCustomers()
        if (mounted) {
          setCustomers(Array.isArray(res?.items) ? res.items : [])
        }
      } catch (err) {
        if (mounted) setError(err.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchCustomers()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const selectedCustomer = customers.find(c => String(c.id) === String(value))
  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(filterText.toLowerCase()))

  async function handleAddCustomer() {
    if (!newCustomerName.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const newCustomer = await createCustomer({ name: newCustomerName })
      // Refresh list
      const res = await listAllCustomers()
      setCustomers(Array.isArray(res?.items) ? res.items : [])
      onChange(newCustomer.id)
      setNewCustomerName('')
      setFilterText('')
      setIsOpen(false)
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-11 w-full items-center justify-between rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <span className={selectedCustomer ? "text-slate-900" : "text-slate-400"}>
          {selectedCustomer ? selectedCustomer.name : placeholder}
        </span>
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`h-4 w-4 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-stone-200 bg-white shadow-lg">
          <div className="p-2 border-b border-stone-100">
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search customers..."
              className="w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {loading ? (
              <div className="px-3 py-2 text-sm text-stone-500">Loading customers...</div>
            ) : error ? (
              <div className="px-3 py-2 text-sm text-red-600">Error loading customers</div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onChange('')
                    setIsOpen(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-stone-500 hover:bg-stone-50"
                >
                  Clear selection
                </button>
                {filteredCustomers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-stone-500">No customers found.</div>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onChange(c.id)
                        setIsOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-stone-50 ${String(value) === String(c.id) ? "bg-primary-50 text-primary font-medium" : "text-slate-900"}`}
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </>
            )}
          </div>

          <div className="border-t border-stone-100 p-2 bg-stone-50/50 rounded-b-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomer())}
                placeholder="New customer name"
                className="w-full rounded-md border border-stone-200 px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleAddCustomer}
                disabled={creating || !newCustomerName.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 min-w-[60px]"
              >
                {creating ? "..." : "Add"}
              </button>
            </div>
            {createError && (
              <div className="mt-1 text-xs text-red-600">{createError}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
