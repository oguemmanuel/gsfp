"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const AdminRegister = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    adminSecretKey: "",
  })
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState("")
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

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = () => {
    let valid = true
    const newErrors = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required"
      valid = false
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
      valid = false
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Email is invalid"
      valid = false
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
      valid = false
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long"
      valid = false
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
      valid = false
    }

    if (!formData.adminSecretKey.trim()) {
      newErrors.adminSecretKey = "Admin secret key is required"
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})
    setSuccessMessage("")

    if (!validateForm()) {
      setIsLoading(false)
      return
    }

    try {
      // Extract data to send (excluding confirmPassword)
      const { confirmPassword, ...dataToSend } = formData

      const response = await fetch("http://localhost:5000/api/auth/admin/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
        credentials: "include",
      })

      const data = await response.json()
      console.log("Registration response:", data)

      if (data.success) {
        setSuccessMessage("Admin registration successful! Redirecting to login...")
        // Clear form
        setFormData({
          fullName: "",
          email: "",
          password: "",
          confirmPassword: "",
          adminSecretKey: "",
        })

        // Redirect to admin login after a brief delay
        setTimeout(() => {
          router.push("/admin/login")
        }, 2000)
      } else {
        setErrors({ general: data.message || "Registration failed. Please try again." })
      }
    } catch (error) {
      console.error("Registration failed:", error)
      setErrors({ general: "Server error. Please check your connection and try again." })
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Registration</h1>
          <p className="text-gray-600 mt-2">Create a new administrator account</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="fullName">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className={`w-full px-3 py-2 border ${errors.fullName ? "border-red-300" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
              value={formData.fullName}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="John Doe"
            />
            {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={`w-full px-3 py-2 border ${errors.email ? "border-red-300" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="admin@schoolmeal.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={`w-full px-3 py-2 border ${errors.password ? "border-red-300" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="Enter your password"
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className={`w-full px-3 py-2 border ${errors.confirmPassword ? "border-red-300" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="Confirm your password"
            />
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="adminSecretKey">
              Admin Secret Key
            </label>
            <input
              id="adminSecretKey"
              name="adminSecretKey"
              type="password"
              className={`w-full px-3 py-2 border ${errors.adminSecretKey ? "border-red-300" : "border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
              value={formData.adminSecretKey}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="Enter the admin secret key"
            />
            {errors.adminSecretKey && <p className="mt-1 text-sm text-red-600">{errors.adminSecretKey}</p>}
            <p className="mt-1 text-xs text-gray-500">Contact your system administrator for the secret key</p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                Registering...
              </span>
            ) : (
              "Register as Admin"
            )}
          </button>
        </form>

        {errors.general && (
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
                <p className="text-sm">{errors.general}</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Already have an admin account?{" "}
            <Link href="/admin/login" className="text-blue-600 hover:text-blue-500 font-medium">
              Login here
            </Link>
          </p>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 block">
            Return to main site
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminRegister
