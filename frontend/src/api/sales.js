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

export function listSales(options = {}) {
  const limit = options.limit || 25
  const page = options.page || 1
  const offset = (page - 1) * limit
  let qs = `?limit=${limit}&offset=${offset}`
  if (options.status) {
    qs += `&status=${encodeURIComponent(options.status)}`
  }
  return request(`/sales${qs}`)
}

export function getSale(id) {
  return request(`/sales/${id}`)
}

export function createSale(payload) {
  return request('/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function transitionSale(id, toStatus) {
  return request(`/sales/${id}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to_status: toStatus }),
  })
}

export function addSaleItem(saleId, item) {
  return request(`/sales/${saleId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
}

export function updateSaleItem(saleId, itemId, item) {
  return request(`/sales/${saleId}/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
}

export function deleteSaleItem(saleId, itemId) {
  return request(`/sales/${saleId}/items/${itemId}`, { method: 'DELETE' })
}
