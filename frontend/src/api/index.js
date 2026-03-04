import axios from 'axios'
const api = axios.create({ baseURL: '/api' })
export const getRequests = (status) => api.get('/requests', { params: status ? { status } : {} }).then(r=>r.data)
export const getRequest  = (id)     => api.get(`/requests/${id}`).then(r=>r.data)
export const setStatus   = (id, s)  => api.patch(`/requests/${id}/status`, { status: s }).then(r=>r.data)
export const getOutbox   = (status) => api.get('/outbox', { params: status ? { status } : {} }).then(r=>r.data)
export const retryOutbox = (id)     => api.post(`/outbox/${id}/retry`).then(r=>r.data)
export const getSettings = ()       => api.get('/settings').then(r=>r.data)
