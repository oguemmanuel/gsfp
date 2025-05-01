"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "../dashboard/page"
import SurveySection from "@/components/survey-section"

export default function HeadmasterDashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const response = await fetch("http://localhost:5000/api/headmaster-dashboard", {
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
    <DashboardLayout title="Headmaster Dashboard">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Headmaster Portal</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Oversee the school feeding program and monitor its impact.
          </p>
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <SurveySection
              role="headmaster"
              questions={dashboardData?.surveyQuestions || []}
              onRefresh={fetchDashboardData}
              isLoading={loading}
            />

            {/* Additional headmaster-specific content can go here */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-cyan-50 overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-cyan-800">Program Overview</h3>
                  <p className="mt-1 text-sm text-cyan-600">View program statistics and performance metrics.</p>
                  <button className="mt-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500">
                    View Reports
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-amber-800">Staff Management</h3>
                  <p className="mt-1 text-sm text-amber-600">Manage caterers and other program staff.</p>
                  <button className="mt-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500">
                    Manage Staff
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
