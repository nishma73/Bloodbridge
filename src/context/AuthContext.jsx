import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { service } from '../services'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = service.auth.onAuthChange((nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [])

  const register = useCallback(async (payload) => {
    const created = await service.auth.register(payload)
    setUser(created)
    return created
  }, [])

  const login = useCallback(async (email, password) => {
    const signedIn = await service.auth.login(email, password)
    setUser(signedIn)
    return signedIn
  }, [])

  const logout = useCallback(async () => {
    await service.auth.logout()
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    const current = await service.auth.getCurrentUser()
    setUser(current)
    return current
  }, [])

  const updateProfile = useCallback(
    async (patch) => {
      if (!user) throw new Error('Not signed in.')
      const updated = await service.profiles.update(user.uid, patch)
      setUser(updated)
      return updated
    },
    [user],
  )

  const value = useMemo(
    () => ({
      user,
      loading,
      register,
      login,
      logout,
      refresh,
      updateProfile,
      isDonor: user?.role === 'donor',
      isHospital: user?.role === 'hospital',
      isAdmin: user?.role === 'admin',
    }),
    [user, loading, register, login, logout, refresh, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside an <AuthProvider>.')
  return ctx
}
