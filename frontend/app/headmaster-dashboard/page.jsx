"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "../dashboard/page"
import SurveySection from "@/components/survey-section"
import { School, Users, TrendingUp, Award, BarChart3, FileText, Calendar, Settings, AlertTriangle } from "lucide-react"

export default function HeadmasterDashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [surveyQuestions, setSurveyQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch dashboard data
      const dashboardResponse = await fetch("http://localhost:5000/api/dashboard/headmaster", {
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
      const questionsResponse = await fetch("http://localhost:5000/api/survey-questions/headmaster", {
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
      <DashboardLayout title="Headmaster Dashboard">
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
      <DashboardLayout title="Headmaster Dashboard">
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
  const recentActivity = dashboardData?.recentActivity || []
  const programMetrics = dashboardData?.programMetrics || []

  // Only show stat cards if we have real data
  const statCards = []

  if (stats.totalStudents !== undefined) {
    statCards.push({
      title: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      color: "bg-blue-500",
      change: "Current enrollment",
    })
  }

  if (stats.averageAttendance !== undefined) {
    statCards.push({
      title: "Average Attendance",
      value: stats.averageAttendance,
      icon: School,
      color: "bg-green-500",
      change: "Daily average",
    })
  }

  if (stats.totalMealsThisMonth !== undefined) {
    statCards.push({
      title: "Meals This Month",
      value: stats.totalMealsThisMonth,
      icon: TrendingUp,
      color: "bg-purple-500",
      change: "Total served",
    })
  }

  if (stats.programEfficiency !== undefined) {
    statCards.push({
      title: "Program Efficiency",
      value: `${stats.programEfficiency}%`,
      icon: Award,
      color: "bg-orange-500",
      change: "Overall rating",
    })
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "down":
        return <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />
      default:
        return <div className="h-4 w-4 bg-gray-400 rounded-full"></div>
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case "report":
        return <FileText className="h-5 w-5 text-blue-500" />
      case "meeting":
        return <Calendar className="h-5 w-5 text-green-500" />
      case "inspection":
        return <Settings className="h-5 w-5 text-orange-500" />
      case "training":
        return <Award className="h-5 w-5 text-purple-500" />
      default:
        return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <DashboardLayout title="Headmaster Dashboard">
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

      {/* Program Overview - Only show if we have real program metrics */}
      {programMetrics.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Program Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {programMetrics.map((metric, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">{metric.metric_name}</h4>
                  {getTrendIcon(metric.trend)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">
                    {typeof metric.value === "number" && metric.value < 10 ? metric.value.toFixed(1) : metric.value}
                    {metric.unit || ""}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      metric.trend === "up"
                        ? "text-green-600"
                        : metric.trend === "down"
                          ? "text-red-600"
                          : "text-gray-600"
                    }`}
                  >
                    {metric.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Survey Section */}
      <SurveySection role="headmaster" questions={surveyQuestions} onRefresh={fetchDashboardData} isLoading={loading} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Recent Activities - Only show if we have real activity data */}
        {recentActivity.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <BarChart3 className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
              </div>
              <span className="text-sm text-blue-600 hover:text-blue-800 font-medium cursor-pointer">View All</span>
            </div>
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="mr-3">{getActivityIcon(activity.type || "report")}</div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{activity.action}</h4>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                    {activity.status || "completed"}
                  </span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors">
              View Activity Log
            </button>
          </div>
        )}

        {/* Program Management - Only show if we have program data */}
        {(stats.nutritionCompliance !== undefined ||
          stats.staffTrainingProgress !== undefined ||
          stats.communityEngagement !== undefined) && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <School className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Program Management</h3>
            </div>
            <div className="space-y-4">
              {stats.nutritionCompliance !== undefined && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Nutrition Standards</h4>
                  <p className="text-sm text-green-700">Compliance with national nutrition guidelines</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-green-600">Compliance: {stats.nutritionCompliance}%</span>
                    <span className="text-xs text-green-600">Last audit: {stats.lastAuditStatus || "Pending"}</span>
                  </div>
                </div>
              )}

              {stats.staffTrainingProgress !== undefined && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Staff Training</h4>
                  <p className="text-sm text-blue-700">Ongoing nutrition education for teachers</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-blue-600">Progress: {stats.staffTrainingProgress}%</span>
                    <span className="text-xs text-blue-600">Next session: {stats.nextTrainingDate || "TBD"}</span>
                  </div>
                </div>
              )}

              {stats.communityEngagement !== undefined && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">Community Engagement</h4>
                  <p className="text-sm text-purple-700">Parent and community involvement programs</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-purple-600">Participation: {stats.communityEngagement}%</span>
                    <span className="text-xs text-purple-600">Next meeting: {stats.nextCommunityMeeting || "TBD"}</span>
                  </div>
                </div>
              )}
            </div>
            <button className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors">
              Generate Report
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions - Always show these as they're functional buttons */}
      <div className="mt-8 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <FileText className="h-6 w-6 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900">Generate Report</h4>
            <p className="text-sm text-gray-600">Create program report</p>
          </button>
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Users className="h-6 w-6 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900">Manage Staff</h4>
            <p className="text-sm text-gray-600">Oversee program staff</p>
          </button>
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Calendar className="h-6 w-6 text-purple-600 mb-2" />
            <h4 className="font-medium text-gray-900">Schedule Meeting</h4>
            <p className="text-sm text-gray-600">Plan stakeholder meeting</p>
          </button>
          <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Award className="h-6 w-6 text-orange-600 mb-2" />
            <h4 className="font-medium text-gray-900">View Achievements</h4>
            <p className="text-sm text-gray-600">Check program milestones</p>
          </button>
        </div>
      </div>

      {/* No Data Message */}
      {statCards.length === 0 && recentActivity.length === 0 && programMetrics.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <School className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600 mb-4">Start by adding student enrollment and program information.</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors">
            Get Started
          </button>
        </div>
      )}
    </DashboardLayout>
  )
}
