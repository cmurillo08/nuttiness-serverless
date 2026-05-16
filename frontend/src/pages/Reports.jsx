import { useState, useEffect } from 'react'
import { getReportSummary } from '../api/reports'
import Amount from '../components/Amount'

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-[#8B6F47]" />
    </div>
  )
}

function formatGeneratedAt(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toISOString().replace('T', ' ').substring(0, 19)
}

function profitValueClass(profit) {
  if (profit > 0) return 'text-green-600'
  if (profit < 0) return 'text-red-600'
  return 'text-amber-600'
}

function profitLabel(profit) {
  if (profit < 0) return '(Loss)'
  if (profit === 0) return '(No profit)'
  return null
}

export default function Reports() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getReportSummary()
      .then((data) => setSummary(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page header */}
      <h1 className="text-2xl font-semibold text-[#8B6F47]">Reports</h1>

      {loading && <Spinner />}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && summary && (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-medium text-slate-700">Financial Summary</h2>

            {/* Stat cards — 1 col mobile, 3 col lg */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

              {/* Total Expenses */}
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <dt className="text-sm font-medium text-red-900">Total Expenses</dt>
                <dd className="mt-2 text-2xl font-semibold text-red-700">
                  <Amount value={summary.total_expenses_amount} />
                </dd>
              </div>

              {/* Total Sales */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <dt className="text-sm font-medium text-amber-900">Total Sales</dt>
                <dd className="mt-2 text-2xl font-semibold text-amber-700">
                  <Amount value={summary.total_sales_amount} />
                </dd>
              </div>

              {/* Historical Profit */}
              <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <dt className="text-sm font-medium text-green-900">Historical Profit</dt>
                  {profitLabel(summary.historical_profit) && (
                    <span className="text-xs font-medium text-slate-500">
                      {profitLabel(summary.historical_profit)}
                    </span>
                  )}
                </div>
                <dd className={`mt-2 text-2xl font-semibold ${profitValueClass(summary.historical_profit)}`}>
                  <Amount value={summary.historical_profit} />
                </dd>
              </div>

            </div>
          </section>

          {/* Generated at */}
          {summary.generated_at && (
            <p className="text-sm text-slate-500">
              Report generated at: {formatGeneratedAt(summary.generated_at)}
            </p>
          )}
        </>
      )}
    </div>
  )
}
