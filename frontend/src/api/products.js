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
  return res.json()
}

// Prepared products
export function listProducts(limit = 25, offset = 0) {
  return request(`/products?limit=${limit}&offset=${offset}`)
}

export function getProduct(id) {
  return request(`/products/${id}`)
}

export function createProduct(data) {
  return request('/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function updateProduct(id, data) {
  return request(`/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function deleteProduct(id) {
  return request(`/products/${id}`, { method: 'DELETE' })
}

// Raw products
export function listRawProducts(limit = 25, offset = 0) {
  return request(`/raw-products?limit=${limit}&offset=${offset}`)
}

export function getRawProduct(id) {
  return request(`/raw-products/${id}`)
}

export function createRawProduct(data) {
  return request('/raw-products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function updateRawProduct(id, data) {
  return request(`/raw-products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function deleteRawProduct(id) {
  return request(`/raw-products/${id}`, { method: 'DELETE' })
}
