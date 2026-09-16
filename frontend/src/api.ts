import axios from 'axios'

let accessToken = null
let onAuthFailure = null

// Send cookies on every request (needed for httpOnly refresh token)
axios.defaults.withCredentials = true

// Attach access token to every outgoing request
axios.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Auto-refresh on 401 responses
let isRefreshing = false
let failedQueue = []

function processQueue(error, token) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/api/auth/refresh') &&
      !original.url?.includes('/api/auth/login') &&
      !original.url?.includes('/api/auth/register')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return axios(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post('/api/auth/refresh')
        accessToken = data.access_token
        processQueue(null, accessToken)
        original.headers.Authorization = `Bearer ${accessToken}`
        return axios(original)
      } catch (err) {
        processQueue(err, null)
        accessToken = null
        if (onAuthFailure) onAuthFailure()
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export function setAccessToken(token) {
  accessToken = token
}

export function setOnAuthFailure(cb) {
  onAuthFailure = cb
}

export async function tryRefresh() {
  try {
    const { data } = await axios.post('/api/auth/refresh')
    accessToken = data.access_token
    return data
  } catch {
    accessToken = null
    return null
  }
}
