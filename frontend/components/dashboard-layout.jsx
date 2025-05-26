"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DashboardLayout({ children, title }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("user")

    if (!storedUser) {
      router.push("/signin")
      return
    }

    try {
      const userData = JSON.parse(storedUser)
      setUser(userData)

      // Verify session is still valid with backend
      verifySession()
    } catch (error) {
      console.error("Error parsing user data:", error)
      router.push("/signin")
    } finally {
      setLoading(false)
    }
  }, [router])

  const verifySession = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/auth/users", {
        method: "GET",
        credentials: "include",
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        // Session expired or invalid
        localStorage.removeItem("user")
        localStorage.removeItem("isAuthenticated")
        router.push("/signin")
      }
    } catch (error) {
      console.error("Session verification error:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/auth/logout", {
        method: "GET",
        credentials: "include",
      })

      // Clear local storage
      localStorage.removeItem("user")
      localStorage.removeItem("isAuthenticated")

      // Redirect to login
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title || "Dashboard"}</h1>
            <p className="text-sm text-gray-600">Ghana School Feeding Program</p>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Welcome message */}
      {user && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Welcome back, {user.fullName}!</h2>
                  <p className="mt-1 text-gray-600">
                    You're logged in as a <span className="font-medium capitalize">{user.role}</span>
                  </p>
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-500">Online</span>
                  </div>
                </div>
              </div>

              {/* User information grid */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Email</h3>
                  <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                </div>
                {user.schoolName && (
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500">School</h3>
                    <p className="mt-1 text-sm text-gray-900">{user.schoolName}</p>
                  </div>
                )}
                {user.district && (
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500">District</h3>
                    <p className="mt-1 text-sm text-gray-900">{user.district}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  )
}
