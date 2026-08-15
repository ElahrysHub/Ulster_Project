const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options) {
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  meta: () => request('/'),
  segments: () => request('/api/segments'),
  evaluation: () => request('/api/evaluation'),
  customer: (id) => request(`/api/customers/${id}`),
  customers: ({ country, segment, limit = 50 } = {}) => {
    const params = new URLSearchParams()
    if (country) params.set('country', country)
    if (segment !== undefined && segment !== null) params.set('segment', segment)
    params.set('limit', limit)
    return request(`/api/customers?${params.toString()}`)
  },
  predictSegment: (payload) =>
    request('/api/predict-segment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  searchProducts: (q, limit = 20) =>
    request(`/api/products/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  similarProducts: (stockCode, topN = 5) =>
    request(`/api/products/${encodeURIComponent(stockCode)}/similar?top_n=${topN}`),
  productRules: (stockCode, topN = 5) =>
    request(`/api/products/${encodeURIComponent(stockCode)}/rules?top_n=${topN}`),
  customerRecommendations: (id, topN = 5) =>
    request(`/api/customers/${id}/recommendations?top_n=${topN}`),
  popular: (topN = 10) => request(`/api/popular?top_n=${topN}`),
}
