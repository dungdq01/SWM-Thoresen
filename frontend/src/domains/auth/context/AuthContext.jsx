import { createContext, useContext, useState, useEffect } from 'react'
import { httpClient } from '@shared/api/httpClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const storedUser = localStorage.getItem('user')
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (credentials) => {
    try {
      const data = await httpClient.post('/auth/login', {
        username: credentials.username,
        password: credentials.password,
        channel: 'WEB',
      })

      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      setUser(data.user)
      return data
    } catch (err) {
      const msg = err?.error?.message || err?.message || 'Đăng nhập không thành công'
      throw new Error(msg)
    }
  }

  const logout = async () => {
    try {
      await httpClient.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      setUser(null)
    }
  }

  const hasPermission = (permissionCode) => {
    if (!user) return false
    return user.roleCodes?.includes('ADMIN') || user.permissionCodes?.includes(permissionCode)
  }

  const hasAnyPermission = (permissionCodes) => {
    if (!user) return false
    if (user.roleCodes?.includes('ADMIN')) return true
    return permissionCodes.some(code => user.permissionCodes?.includes(code))
  }

  const hasRole = (roleCode) => {
    if (!user) return false
    return user.roleCodes?.includes(roleCode)
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission,
    hasAnyPermission,
    hasRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
