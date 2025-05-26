"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const router = useRouter()

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/auth/users", {
          method: "GET",
          credentials: "include",
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.user && data.user.role === "admin") {
            router.push("/admin-dashboard")
            return
          }
        }
      } catch (error) {
        console.log("Not authenticated")
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuthStatus()
  }, [router])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error when user starts typing
    if (errorMessage) {
      setErrorMessage("")
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")

    // Basic validation
    if (!formData.email || !formData.password) {
      setErrorMessage("Please fill in all fields.")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("http://localhost:5000/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
        credentials: "include",
      })

      const data = await response.json()
      console.log("Login response:", data)

      if (data.success) {
        if (data.user && data.user.role === "admin") {
          console.log("Admin login successful, redirecting to:", data.dashboardUrl)

          // Store user data in localStorage for persistence
          localStorage.setItem("user", JSON.stringify(data.user))
          localStorage.setItem("isAuthenticated", "true")

          // Redirect to admin dashboard
          router.push(data.dashboardUrl)
        } else {
          setErrorMessage("You do not have admin privileges.")
        }
      } else {
        setErrorMessage(data.message || "Invalid credentials.")
      }
    } catch (error) {
      console.error("Login failed:", error)
      setErrorMessage("Server error. Please check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading spinner while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            <span className="ml-2">Checking authentication...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Login</h1>
          <p className="text-gray-600 mt-2">Access the administrative dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="admin@schoolmeal.com"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Logging in...
              </span>
            ) : (
              "Login as Admin"
            )}
          </button>
        </form>

        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 text-center space-y-2">
          <Link href="/admin" className="text-sm text-green-600 hover:text-green-500 block">
            Need to create an admin account?
          </Link>
          <Link href="/" className="text-sm text-blue-500 hover:text-blue-700 block">
            Return to main site
          </Link>
          <Link href="/signin" className="text-sm text-blue-500 hover:text-blue-700 block">
            other stakeholders can login here
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
