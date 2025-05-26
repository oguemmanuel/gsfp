"use client"

import { useState, useEffect } from "react"

const CatererDashboard = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [surveyQuestions, setSurveyQuestions] = useState([])
  const [surveyResponses, setSurveyResponses] = useState({})
  const [showSurvey, setShowSurvey] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDashboardData()
    fetchSurveyQuestions()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/dashboard/caterer", {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setUser(data.data.user)
        setDashboardData(data.data)
      } else {
        throw new Error("Failed to fetch dashboard data")
      }
    } catch (err) {
      setError("Failed to load dashboard data. Please try again later.")
      console.error("Error fetching dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSurveyQuestions = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/survey-questions/caterer", {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSurveyQuestions(data.data)
        }
      }
    } catch (error) {
      console.error("Error fetching survey questions:", error)
    }
  }

  const handleSurveySubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch("http://localhost:5000/api/submit-survey/caterer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(surveyResponses),
      })

      const data = await response.json()

      if (data.success) {
        alert("Survey submitted successfully!")
        setShowSurvey(false)
        setSurveyResponses({})
        fetchDashboardData()
      } else {
        alert(data.message || "Failed to submit survey")
      }
    } catch (error) {
      console.error("Error submitting survey:", error)
      alert("Failed to submit survey. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/auth/logout", {
        credentials: "include",
      })

      const data = await response.json()

      if (data.success) {
        window.location.href = "/signin"
      }
    } catch (err) {
      setError("Failed to logout. Please try again.")
      console.error("Logout error:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading caterer dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const stats = dashboardData?.stats || {}
  const alerts = dashboardData?.alerts || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Caterer Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome back, {user?.fullName}</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user?.schoolName}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Real Data Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Meals Planned Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.mealsPlannedToday || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Today's target</p>
              </div>
              <div className="bg-blue-500 p-3 rounded-lg">
                <span className="text-white text-xl">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Meals Served Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.mealsServedToday || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Completed</p>
              </div>
              <div className="bg-green-500 p-3 rounded-lg">
                <span className="text-white text-xl">🍽️</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Weekly Efficiency</p>
                <p className="text-2xl font-bold text-gray-900">{stats.weeklyEfficiency || 0}%</p>
                <p className="text-xs text-gray-500 mt-1">This week's average</p>
              </div>
              <div className="bg-purple-500 p-3 rounded-lg">
                <span className="text-white text-xl">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stock Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.stockAlerts || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Items need attention</p>
              </div>
              <div className={`${stats.stockAlerts > 5 ? "bg-red-500" : "bg-orange-500"} p-3 rounded-lg`}>
                <span className="text-white text-xl">📦</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Section - Only show if there are real alerts */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h3>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert, index) => (
                <div
                  key={index}
                  className={`flex items-center p-3 rounded-lg border ${
                    alert.priority === "high"
                      ? "bg-red-50 border-red-200 text-red-800"
                      : alert.priority === "medium"
                        ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                        : "bg-blue-50 border-blue-200 text-blue-800"
                  }`}
                >
                  <div className="mr-3">
                    <span>{alert.type === "low_stock" ? "📦" : "⏰"}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs opacity-75">Priority: {alert.priority}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowSurvey(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <span>📝</span>
                <span>Complete Survey</span>
              </button>
            </div>
          </div>

          {/* Real Activity Data */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {dashboardData?.recentActivity?.length > 0 ? (
                dashboardData.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">{activity.action}</span>
                    <span className="text-xs text-gray-400">{activity.time}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        {/* Operations Overview - Only Real Data */}
        {(stats.mealsPlannedToday > 0 || stats.mealsServedToday > 0) && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Operations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.mealsPlannedToday || 0}</div>
                <div className="text-sm text-blue-600">Meals Planned</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.mealsServedToday || 0}</div>
                <div className="text-sm text-green-600">Meals Served</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.mealsPlannedToday > 0
                    ? Math.round((stats.mealsServedToday / stats.mealsPlannedToday) * 100)
                    : 0}
                  %
                </div>
                <div className="text-sm text-orange-600">Completion Rate</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Survey Modal */}
      {showSurvey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Caterer Survey</h3>
              <button onClick={() => setShowSurvey(false)} className="text-gray-400 hover:text-gray-600">
                ❌
              </button>
            </div>

            {surveyQuestions.length > 0 ? (
              <form onSubmit={handleSurveySubmit} className="space-y-6">
                {surveyQuestions.map((question) => (
                  <div key={question.id} className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Q{question.displayOrder}: {question.question_text}
                    </label>
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <label key={optionIndex} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={`question_${question.id}`}
                            value={option}
                            onChange={(e) =>
                              setSurveyResponses((prev) => ({
                                ...prev,
                                [question.id]: e.target.value,
                              }))
                            }
                            className="text-blue-600 focus:ring-blue-500"
                            required
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowSurvey(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
                  >
                    {submitting ? "Submitting..." : "Submit Survey"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No survey questions available at this time.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CatererDashboard
