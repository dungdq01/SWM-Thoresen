import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const httpClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

httpClient.interceptors.request.use(
  (config) => {
    const userCode = localStorage.getItem('userCode') || 'admin'
    config.headers['x-user-code'] = userCode
    
    const warehouseCode = localStorage.getItem('warehouseCode')
    if (warehouseCode) {
      config.headers['x-warehouse-code'] = warehouseCode
    }

    const idempotencyKey = config.headers['Idempotency-Key']
    if (!idempotencyKey && ['POST', 'PUT', 'DELETE'].includes(config.method?.toUpperCase())) {
      config.headers['Idempotency-Key'] = crypto.randomUUID()
    }

    return config
  },
  (error) => Promise.reject(error)
)

httpClient.interceptors.response.use(
  (response) => {
    const body = response.data
    // Unwrap ResponseInterceptor envelope: { success, data, meta }
    return body && body.success !== undefined ? body.data : body
  },
  (error) => {
    const errorResponse = error.response?.data || {
      success: false,
      error: {
        statusCode: error.response?.status || 500,
        message: error.message || 'Đã xảy ra lỗi không xác định',
      },
    }
    return Promise.reject(errorResponse)
  }
)

export default httpClient
