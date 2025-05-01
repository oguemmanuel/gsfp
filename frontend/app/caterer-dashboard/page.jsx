"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "../dashboard/page"
import SurveySection from "@/components/survey-section"

export default function CatererDashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const response = await fetch("http://localhost:5000/api/caterer-dashboard", {
        method: "GET",
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setDashboardData(data.data)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()

    // Set up polling to check for new questions every 5 minutes
    const intervalId = setInterval(
      () => {
        fetchDashboardData()
      },
      5 * 60 * 1000,
    )

    return () => clearInterval(intervalId)
  }, [])

  return (
    <DashboardLayout title="Caterer Dashboard">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Meal Management</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Plan, prepare, and report on school meals.</p>
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <SurveySection
              role="caterer"
              questions={dashboardData?.surveyQuestions || []}
              onRefresh={fetchDashboardData}
              isLoading={loading}
            />

            {/* Original Caterer Content */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-yellow-50 overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-yellow-800">Meal Planning</h3>
                  <p className="mt-1 text-sm text-yellow-600">Create and manage weekly meal plans.</p>
                  <button className="mt-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
                    Plan Meals
                  </button>
                </div>
              </div>

              <div className="bg-red-50 overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-red-800">Inventory</h3>
                  <p className="mt-1 text-sm text-red-600">Track food inventory and request supplies.</p>
                  <button className="mt-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                    Manage Inventory
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
