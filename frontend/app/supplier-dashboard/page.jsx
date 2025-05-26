"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "../dashboard/page"
import SurveySection from "@/components/survey-section"
import { Truck, Package, DollarSign, Calendar, Clock, CheckCircle, AlertTriangle } from "lucide-react"

export default function SupplierDashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [surveyQuestions, setSurveyQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch dashboard data
      const dashboardResponse = await fetch("http://localhost:5000/api/dashboard/supplier", {
        method: "GET",
        credentials: "include",
      })

      if (!dashboardResponse.ok) {
        throw new Error(`Dashboard API error: ${dashboardResponse.status}`)
      }

      const dashboardResult = await dashboardResponse.json()

      if (dashboardResult.success) {
        setDashboardData(dashboardResult.data)
      }

      // Fetch survey questions
      const questionsResponse = await fetch("http://localhost:5000/api/survey-questions/supplier", {
        method: "GET",
        credentials: "include",
      })

      if (!questionsResponse.ok) {
        throw new Error(`Questions API error: ${questionsResponse.status}`)
      }

      const questionsResult = await questionsResponse.json()

      if (questionsResult.success) {
        setSurveyQuestions(questionsResult.data)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()

    // Set up polling to refresh data every 5 minutes
    const intervalId = setInterval(fetchDashboardData, 5 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, [])

  if (loading && !dashboardData) {
    return (
      <DashboardLayout title="Supplier Dashboard">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="Supplier Dashboard">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700">Error loading dashboard: {error}</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
          >
            Try Again
          </button>
        </div>
      </DashboardLayout>
    )
  }

  const stats = dashboardData?.stats || {}
  const deliveries = dashboardData?.deliveries || []
  const recentActivity = dashboardData?.recentActivity || []

  // Only show stat cards if we have real data
  const statCards = []

  if (stats.pendingDeliveries !== undefined) {
    statCards.push({
      title: "Pending Deliveries",
      value: stats.pendingDeliveries,
      icon: Truck,
      color: "bg-blue-500",
      change: "This week",
    })
  }

  if (stats.activeSchools !== undefined) {
    statCards.push({
      title: "Active Schools",
      value: stats.activeSchools,
      icon: Package,
      color: "bg-green-500",
      change: "Currently serving",
    })
  }

  if (stats.monthlyValue !== undefined) {
    statCards.push({
      title: "Monthly Value",
      value: `₵${stats.monthlyValue.toLocaleString()}`,
      icon: DollarSign,
      color: "bg-purple-500",
      change: "This month",
    })
  }

  if (stats.onTimeDeliveryRate !== undefined) {
    statCards.push({
      title: "On-Time Rate",
      value: `${stats.onTimeDeliveryRate}%`,
      icon: Calendar,
      color: "bg-orange-500",
      change: "Last 30 days",
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100"
      case "in-transit":
        return "text-blue-600 bg-blue-100"
      case "scheduled":
        return "text-yellow-600 bg-yellow-100"
      case "pending":
        return "text-orange-600 bg-orange-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "in-transit":
        return <Truck className="h-4 w-4 text-blue-600" />
      case "scheduled":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "pending":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default:
        return <Package className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <DashboardLayout title="Supplier Dashboard">
      {/* Stats Overview - Only show if we have real data */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Survey Section */}
      <SurveySection role="supplier" questions={surveyQuestions} onRefresh={fetchDashboardData} isLoading={loading} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Upcoming Deliveries - Only show if we have real delivery data */}
        {deliveries.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Truck className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Upcoming Deliveries</h3>
              </div>
              <span className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer">View All</span>
            </div>
            <div className="space-y-3">
              {deliveries.slice(0, 3).map((delivery, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{delivery.school_name}</h4>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(delivery.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                        {delivery.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{delivery.items}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(delivery.delivery_date).toLocaleDateString()}</span>
                    <span>{delivery.delivery_time}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors">
              Schedule Delivery
            </button>
          </div>
        )}

        {/* Performance Overview - Only show if we have real performance data */}
        {(stats.monthlyValue !== undefined || stats.onTimeDeliveryRate !== undefined) && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <DollarSign className="h-6 w-6 text-green-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
              </div>
            </div>
            <div className="space-y-4">
              {stats.monthlyValue !== undefined && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Monthly Performance</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-green-700">Revenue</p>
                      <p className="text-lg font-semibold text-green-900">₵{stats.monthlyValue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-700">Deliveries</p>
                      <p className="text-lg font-semibold text-green-900">{stats.totalDeliveries || 0}</p>
                    </div>
                  </div>
                </div>
              )}

              {stats.onTimeDeliveryRate !== undefined && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Delivery Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">On-Time Rate</span>
                      <span className="font-semibold text-blue-900">{stats.onTimeDeliveryRate}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stats.onTimeDeliveryRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {recentActivity.length > 0 && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">Recent Activity</h4>
                  <div className="space-y-2">
                    {recentActivity.slice(0, 3).map((activity, index) => (
                      <div key={index} className="flex items-center text-sm text-purple-700">
                        <CheckCircle className="h-3 w-3 mr-2" />
                        <span>{activity.action}</span>
                        <span className="ml-auto text-xs text-purple-600">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors">
              View Detailed Report
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions - Always show these as they're functional buttons */}
      <div className="mt-8 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Truck className="h-6 w-6 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900">Track Delivery</h4>
            <p className="text-sm text-gray-600">Monitor delivery status</p>
          </button>
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Package className="h-6 w-6 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900">Update Inventory</h4>
            <p className="text-sm text-gray-600">Manage stock levels</p>
          </button>
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <DollarSign className="h-6 w-6 text-purple-600 mb-2" />
            <h4 className="font-medium text-gray-900">Invoice Status</h4>
            <p className="text-sm text-gray-600">Check payments</p>
          </button>
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Calendar className="h-6 w-6 text-orange-600 mb-2" />
            <h4 className="font-medium text-gray-900">Schedule Meeting</h4>
            <p className="text-sm text-gray-600">Plan with schools</p>
          </button>
        </div>
      </div>

      {/* No Data Message */}
      {statCards.length === 0 && deliveries.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-4">Start by adding delivery information and managing your inventory.</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors">
            Get Started
          </button>
        </div>
      )}
    </DashboardLayout>
  )
}
