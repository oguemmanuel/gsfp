"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function Register() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    schoolName: "",
    district: "",
    phoneNumber: "",
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

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
          if (data.success && data.user) {
            // Redirect based on role
            const dashboardMap = {
              teacher: "/teacher-dashboard",
              caterer: "/caterer-dashboard",
              student: "/student-dashboard",
              headmaster: "/headmaster-dashboard",
              supplier: "/supplier-dashboard",
              admin: "/admin-dashboard",
            }

            const dashboardUrl = dashboardMap[data.user.role] || "/dashboard"
            router.push(dashboardUrl)
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
    // Clear error for this field when user starts typing
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
      newErrors.password = "Password must be at least 6 characters"
      valid = false
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
      valid = false
    }

    if (!formData.role) {
      newErrors.role = "Please select your role"
      valid = false
    }

    if (!formData.schoolName.trim()) {
      newErrors.schoolName = "School name is required"
      valid = false
    }

    if (!formData.district.trim()) {
      newErrors.district = "District is required"
      valid = false
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required"
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Reset previous error/success messages
    setServerError("")
    setSuccessMessage("")

    if (validateForm()) {
      try {
        setIsSubmitting(true)

        const response = await fetch("http://localhost:5000/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: formData.fullName,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            schoolName: formData.schoolName,
            district: formData.district,
            phoneNumber: formData.phoneNumber,
          }),
          credentials: "include",
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setSuccessMessage(data.message || "Registration successful! Redirecting to login...")

          // Reset form
          setFormData({
            fullName: "",
            email: "",
            password: "",
            confirmPassword: "",
            role: "",
            schoolName: "",
            district: "",
            phoneNumber: "",
          })

          // Redirect to login page after short delay
          setTimeout(() => {
            router.push("/signin")
          }, 2000)
        } else {
          // Handle server validation errors
          setServerError(data.message || "Registration failed. Please try again.")

          // If server returns specific field errors
          if (data.errors) {
            setErrors(data.errors)
          }
        }
      } catch (error) {
        console.error("Registration error:", error)
        setServerError("Network error. Please check your connection and try again.")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  // Show loading spinner while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            <span className="ml-2">Checking authentication...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-green-600 py-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <span className="text-green-600 text-xl font-bold">GSFP</span>
            </div>
          </div>
          <h2 className="mt-2 text-center text-2xl font-bold text-white">Create Your Account</h2>
          <p className="text-center text-green-100 text-sm">Join the Ghana School Feeding Program</p>
        </div>

        <div className="p-6">
          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
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
                  <p className="text-sm">{serverError}</p>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
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

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className={`mt-1 block w-full px-3 py-2 border ${errors.fullName ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500`}
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                disabled={isSubmitting}
              />
              {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={`mt-1 block w-full px-3 py-2 border ${errors.email ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500`}
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                disabled={isSubmitting}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`mt-1 block w-full px-3 py-2 border ${errors.password ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500`}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={isSubmitting}
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className={`mt-1 block w-full px-3 py-2 border ${errors.confirmPassword ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500`}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                disabled={isSubmitting}
              />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                name="role"
                required
                className={`mt-1 block w-full px-3 py-2 border ${errors.role ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500`}
                value={formData.role}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="">Select your role</option>
                <option value="teacher">Teacher</option>
                <option value="caterer">Caterer</option>
                <option value="student">Student</option>
                <option value="headmaster">Headmaster</option>
                <option value="supplier">Food Supplier</option>
              </select>
              {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
            </div>

            <div>
              <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700">
                School Name
              </label>
              <input
                id="schoolName"
                name="schoolName"
                type="text"
                required
                className={`mt-1 block w-full px-3 py-2 border ${errors.schoolName ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500`}
                value={formData.schoolName}
                onChange={handleChange}
                placeholder="Enter your school name"
                disabled={isSubmitting}
              />
              {errors.schoolName && <p className="mt-1 text-sm text-red-600">{errors.schoolName}</p>}
            </div>

            <div>
              <label htmlFor="district" className="block text-sm font-medium text-gray-700">
                District
              </label>
              <input
                id="district"
                name="district"
                type="text"
                required
                className={`mt-1 block w-full px-3 py-2 border ${errors.district ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500`}
                value={formData.district}
                onChange={handleChange}
                placeholder="Enter your district"
                disabled={isSubmitting}
              />
              {errors.district && <p className="mt-1 text-sm text-red-600">{errors.district}</p>}
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                className={`mt-1 block w-full px-3 py-2 border ${errors.phoneNumber ? "border-red-500" : "border-gray-300"} rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500`}
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="Enter your phone number"
                disabled={isSubmitting}
              />
              {errors.phoneNumber && <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>}
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Registering...
                  </span>
                ) : (
                  "Register"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/signin" className="font-medium text-green-600 hover:text-green-500">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
