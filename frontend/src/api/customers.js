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

export function listCustomers(options = {}) {
  const limit = options.limit || 25
  const page = options.page || 1
  const offset = (page - 1) * limit
  return request(`/customers?limit=${limit}&offset=${offset}`)
}

export function listAllCustomers() {
  return request('/customers?limit=500&offset=0')
}

export function getCustomer(id) {
  return request(`/customers/${id}`)
}

export function createCustomer(payload) {
  return request('/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateCustomer(id, payload) {
  return request(`/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteCustomer(id) {
  return request(`/customers/${id}`, { method: 'DELETE' })
}
