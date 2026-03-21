import { httpClient } from '@shared/api/httpClient'

const BASE_URL = '/goods-split'

export const goodsSplitApi = {
  getAll: (params) => httpClient.get(BASE_URL, { params }),
  getById: (id) => httpClient.get(`${BASE_URL}/${id}`),
  create: (data) => httpClient.post(BASE_URL, data),
  confirm: (id, data = {}) => httpClient.post(`${BASE_URL}/${id}/confirm`, data),
  post: (id) => httpClient.post(`${BASE_URL}/${id}/post`),
  cancel: (id, reasonCode) => httpClient.post(`${BASE_URL}/${id}/cancel`, { reasonCode }),
}
