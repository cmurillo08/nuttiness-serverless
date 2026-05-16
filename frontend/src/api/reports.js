export async function getReportSummary() {
  const res = await fetch('/api/v1/reports/summary', { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to load report: ${res.status}`)
  return res.json()
}
