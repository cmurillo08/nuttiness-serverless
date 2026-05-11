const BASE = '/api/v1'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
  })
  if (res.status === 401) {
    window.location.href = '/login'
    return
  }
  if (!res.ok) {
    throw new Error(await res.text())
  }
  if (res.status === 204) return null

  const contentLength = res.headers.get('content-length')
  if (contentLength === '0') return null

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null

  return res.json()
}

export function listExpenses(limit = 25, offset = 0, rawProductId = null) {
  let qs = `?limit=${limit}&offset=${offset}`
  if (rawProductId != null && rawProductId !== '') {
    qs += `&raw_product_id=${encodeURIComponent(rawProductId)}`
  }
  return request(`/expenses${qs}`)
}

export function getExpense(id) {
  return request(`/expenses/${id}`)
}

export function createExpense(data) {
  return request('/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function updateExpense(id, data) {
  return request(`/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function deleteExpense(id) {
  return request(`/expenses/${id}`, { method: 'DELETE' })
}
