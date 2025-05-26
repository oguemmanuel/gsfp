"use client"

import { useState, useEffect } from "react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const AdminDashboard = () => {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [responses, setResponses] = useState({})
  const [activeRole, setActiveRole] = useState("teacher")
  const [rawResponses, setRawResponses] = useState([])
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [surveyQuestions, setSurveyQuestions] = useState({})
  const [activeTab, setActiveTab] = useState("analytics")
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false)
  const [isEditQuestionOpen, setIsEditQuestionOpen] = useState(false)
  const [isDeleteQuestionOpen, setIsDeleteQuestionOpen] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [newQuestion, setNewQuestion] = useState({
    questionText: "",
    options: ["", ""],
  })
  const [editQuestion, setEditQuestion] = useState({
    questionText: "",
    options: ["", ""],
  })
  const [notification, setNotification] = useState({ show: false, type: "", message: "" })
  const [refreshing, setRefreshing] = useState(false)
  const [socket, setSocket] = useState(null)
  const [realTimeData, setRealTimeData] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [chartData, setChartData] = useState({
    responsesTrend: [],
    sentimentDistribution: [],
    roleComparison: [],
    dailyActivity: [],
  })

  const roles = ["teacher", "student", "caterer", "supplier", "headmaster"]

  // Chart colors
  const COLORS = {
    primary: "#3B82F6",
    secondary: "#10B981",
    accent: "#F59E0B",
    danger: "#EF4444",
    purple: "#8B5CF6",
    pink: "#EC4899",
  }

  const SENTIMENT_COLORS = {
    positive: "#10B981",
    neutral: "#F59E0B",
    negative: "#EF4444",
  }

  // Initialize Socket.IO connection for real-time updates
  useEffect(() => {
    const initSocket = async () => {
      try {
        const { io } = await import("socket.io-client")
        const newSocket = io("http://localhost:5000", {
          withCredentials: true,
        })

        newSocket.on("connect", () => {
          console.log("Connected to real-time server")
          newSocket.emit("join-admin-room")
        })

        newSocket.on("new-survey-response", (data) => {
          console.log("New survey response received:", data)

          // Refresh all data when new response comes in
          fetchAnalyticsData()
          fetchResponses()

          // Show notification
          showNotification("success", `New ${data.role} response received from ${data.userName}`)
        })

        newSocket.on("analytics-updated", (data) => {
          console.log("Analytics updated:", data)
          // Refresh analytics data
          fetchAnalyticsData()
        })

        setSocket(newSocket)

        return () => {
          newSocket.disconnect()
        }
      } catch (error) {
        console.error("Error initializing socket:", error)
      }
    }

    initSocket()
  }, [])

  useEffect(() => {
    // Fetch admin information
    const fetchAdminInfo = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/auth/users", {
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          setAdmin(data.user)
        } else {
          throw new Error("Failed to fetch admin information")
        }
      } catch (err) {
        setError("Failed to load admin information. Please try again later.")
        console.error("Error fetching admin info:", err)
      }
    }

    fetchAdminInfo()
    fetchAnalyticsData()
  }, [])

  useEffect(() => {
    fetchResponses()
    fetchSurveyQuestions()
  }, [activeRole])

  const fetchAnalyticsData = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/admin/analytics/dashboard", {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAnalyticsData(data.data)

          // Calculate real-time stats from actual data
          const trends = data.data.trends || {}
          const totalResponses = trends.totalResponses || 0
          const avgSentiment =
            trends.roleTrends?.length > 0
              ? trends.roleTrends.reduce((sum, role) => sum + (role.avgSentiment || 0), 0) / trends.roleTrends.length
              : 0

          setRealTimeData({
            totalResponses: totalResponses,
            todayResponses: trends.dailyTrends?.slice(-1)[0]?.count || 0,
            avgSentiment: avgSentiment,
            activeUsers: trends.roleTrends?.length || 0,
            responseRate: totalResponses > 0 ? Math.min(100, totalResponses * 2) : 0,
          })

          // Update chart data with analytics
          updateAnalyticsChartData(data.data)
        }
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error)
    }
  }

  // Update chart data from analytics - FIXED to use real backend data
  const updateAnalyticsChartData = (analytics) => {
    if (!analytics) return

    // Process daily trends for line chart
    const dailyTrends = analytics.trends?.dailyTrends || []
    const responsesTrend = dailyTrends.map((trend) => ({
      date: new Date(trend.date).toLocaleDateString(),
      responses: trend.count || 0,
      sentiment: ((trend.avgSentiment || 0) * 100).toFixed(1),
    }))

    // Process sentiment distribution for pie chart
    const sentimentDist = analytics.trends?.sentimentDistribution || {}
    const sentimentDistribution = [
      { name: "Positive", value: sentimentDist.positive || 0, color: SENTIMENT_COLORS.positive },
      { name: "Neutral", value: sentimentDist.neutral || 0, color: SENTIMENT_COLORS.neutral },
      { name: "Negative", value: sentimentDist.negative || 0, color: SENTIMENT_COLORS.negative },
    ]

    // Process role comparison for bar chart
    const roleTrends = analytics.trends?.roleTrends || []
    const roleComparison = roleTrends.map((role) => ({
      role: role.role.charAt(0).toUpperCase() + role.role.slice(1),
      responses: role.count || 0,
      avgSentiment: ((role.avgSentiment || 0) * 100).toFixed(1),
    }))

    // Generate daily activity data (last 7 days) from real data
    const dailyActivity = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toLocaleDateString()

      const dayData = dailyTrends.find((d) => new Date(d.date).toLocaleDateString() === dateStr)
      dailyActivity.push({
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        responses: dayData?.count || 0,
        sentiment: dayData ? ((dayData.avgSentiment || 0) * 100).toFixed(1) : 0,
      })
    }

    setChartData({
      responsesTrend,
      sentimentDistribution,
      roleComparison,
      dailyActivity,
    })
  }

  // Fetch survey responses for the active role
  const fetchResponses = async () => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:5000/api/admin/analytics/trends/${activeRole}`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setRawResponses(data.data.responses || [])

        // Process the data for the chart
        const processedData = processChartData(data.data.responses || [])
        setResponses((prev) => ({ ...prev, [activeRole]: processedData }))

        // Update role-specific chart data
        updateRoleChartData(data.data.responses || [])
      } else {
        throw new Error(`Failed to fetch ${activeRole} responses`)
      }
    } catch (err) {
      setError(`Failed to load ${activeRole} survey responses. Please try again later.`)
      console.error(`Error fetching ${activeRole} responses:`, err)
    } finally {
      setLoading(false)
    }
  }

  // Update chart data from role-specific responses
  const updateRoleChartData = (responseData) => {
    if (!responseData || !responseData.length) return

    // Process responses for role-specific charts
    const timeData = new Map()
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 }

    responseData.forEach((response) => {
      const timestamp = new Date(response.created_at).toLocaleDateString()
      const sentiment = Number.parseFloat(response.sentiment_score) || 0

      // Count sentiment categories
      if (sentiment > 0.3) sentimentCounts.positive++
      else if (sentiment < -0.3) sentimentCounts.negative++
      else sentimentCounts.neutral++

      // Group by date
      if (!timeData.has(timestamp)) {
        timeData.set(timestamp, {
          date: timestamp,
          count: 0,
          sentimentScore: 0,
          sentimentSum: 0,
        })
      }

      const timeEntry = timeData.get(timestamp)
      timeEntry.count++
      timeEntry.sentimentSum += sentiment
      timeEntry.sentimentScore = timeEntry.sentimentSum / timeEntry.count
    })

    const roleResponsesTrend = Array.from(timeData.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((item) => ({
        date: new Date(item.date).toLocaleDateString(),
        responses: item.count,
        sentiment: (item.sentimentScore * 100).toFixed(1),
      }))

    const roleSentimentDist = [
      { name: "Positive", value: sentimentCounts.positive, color: SENTIMENT_COLORS.positive },
      { name: "Neutral", value: sentimentCounts.neutral, color: SENTIMENT_COLORS.neutral },
      { name: "Negative", value: sentimentCounts.negative, color: SENTIMENT_COLORS.negative },
    ]

    // Update chart data with role-specific data when viewing role-specific analytics
    setChartData((prev) => ({
      ...prev,
      responsesTrend: roleResponsesTrend.length > 0 ? roleResponsesTrend : prev.responsesTrend,
      sentimentDistribution: roleSentimentDist.some((item) => item.value > 0)
        ? roleSentimentDist
        : prev.sentimentDistribution,
    }))
  }

  const fetchSurveyQuestions = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const response = await fetch(`http://localhost:5000/api/admin/survey-questions/${activeRole}`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setSurveyQuestions((prev) => ({ ...prev, [activeRole]: data.data }))
      } else {
        throw new Error(`Failed to fetch ${activeRole} questions`)
      }
    } catch (err) {
      setError(`Failed to load ${activeRole} survey questions. Please try again later.`)
      console.error(`Error fetching ${activeRole} questions:`, err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => {
      setNotification({ show: false, type: "", message: "" })
    }, 5000)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchSurveyQuestions(false), fetchResponses(), fetchAnalyticsData()])
      showNotification("success", "Data refreshed successfully")
    } catch (error) {
      console.error("Error refreshing data:", error)
      showNotification("error", "Failed to refresh data")
    } finally {
      setRefreshing(false)
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/auth/logout", {
        credentials: "include",
      })

      const data = await response.json()

      if (data.success) {
        if (socket) {
          socket.disconnect()
        }
        window.location.href = "/admin/login"
      }
    } catch (err) {
      setError("Failed to logout. Please try again.")
      console.error("Logout error:", err)
    }
  }

  // Fixed PDF download with proper error handling
  const handleDownloadPDF = async () => {
    setDownloadLoading(true)
    try {
      const response = await fetch(`http://localhost:5000/api/admin/reports/download/combined?role=${activeRole}`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/pdf",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      // Check if response is actually a PDF
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/pdf")) {
        throw new Error("Server did not return a PDF file")
      }

      // Handle PDF response
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `${activeRole}-survey-report-${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showNotification("success", "PDF downloaded successfully")
    } catch (error) {
      console.error("Error downloading PDF:", error)
      showNotification("error", `Failed to download PDF: ${error.message}`)
    } finally {
      setDownloadLoading(false)
    }
  }

  // Add new question
  const handleAddQuestion = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/admin/survey-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role: activeRole,
          questionText: newQuestion.questionText,
          options: newQuestion.options.filter((opt) => opt.trim() !== ""),
        }),
      })

      const data = await response.json()
      if (data.success) {
        showNotification("success", "Question added successfully")
        setIsAddQuestionOpen(false)
        setNewQuestion({ questionText: "", options: ["", ""] })
        fetchSurveyQuestions()
      } else {
        showNotification("error", data.message || "Failed to add question")
      }
    } catch (error) {
      showNotification("error", "Failed to add question")
    }
  }

  // Edit question
  const handleEditQuestion = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/survey-questions/${currentQuestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          questionText: editQuestion.questionText,
          options: editQuestion.options.filter((opt) => opt.trim() !== ""),
        }),
      })

      const data = await response.json()
      if (data.success) {
        showNotification("success", "Question updated successfully")
        setIsEditQuestionOpen(false)
        setCurrentQuestion(null)
        setEditQuestion({ questionText: "", options: ["", ""] })
        fetchSurveyQuestions()
      } else {
        showNotification("error", data.message || "Failed to update question")
      }
    } catch (error) {
      showNotification("error", "Failed to update question")
    }
  }

  // Delete question
  const handleDeleteQuestion = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/survey-questions/${currentQuestion.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      const data = await response.json()
      if (data.success) {
        showNotification("success", "Question deleted successfully")
        setIsDeleteQuestionOpen(false)
        setCurrentQuestion(null)
        fetchSurveyQuestions()
      } else {
        showNotification("error", data.message || "Failed to delete question")
      }
    } catch (error) {
      showNotification("error", "Failed to delete question")
    }
  }

  // Process survey data for visualization with real-time updates
  const processChartData = (roleData) => {
    if (!roleData || !roleData.length) return []

    const timeData = new Map()

    roleData.forEach((response) => {
      const timestamp = new Date(response.created_at).toLocaleDateString()

      if (!timeData.has(timestamp)) {
        timeData.set(timestamp, {
          date: timestamp,
          count: 0,
          sentimentScore: 0,
          sentimentSum: 0,
        })
      }

      const timeEntry = timeData.get(timestamp)
      timeEntry.count++
      const sentimentValue = Number.parseFloat(response.sentiment_score) || 0
      timeEntry.sentimentSum += sentimentValue
      timeEntry.sentimentScore = timeEntry.sentimentSum / timeEntry.count
    })

    return Array.from(timeData.values()).sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  // Enhanced chart rendering with Recharts - FIXED to use dynamic data
  const renderAnalyticsCharts = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Real-time Response Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Real-time Response Trends</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">Live Updates</span>
            </div>
          </div>
          <div className="h-96 w-full">
            {chartData.responsesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.responsesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="responses"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    name="Responses"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="sentiment"
                    stroke={COLORS.secondary}
                    strokeWidth={2}
                    name="Sentiment Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50 rounded">
                <div className="text-center">
                  <p className="text-gray-500 mb-2">No trend data available</p>
                  <p className="text-sm text-gray-400">Data will appear as responses are submitted</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Daily Activity Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity (Last 7 Days)</h3>
          <div className="h-80 w-full">
            {chartData.dailyActivity.length > 0 && chartData.dailyActivity.some((d) => d.responses > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="responses"
                    stackId="1"
                    stroke={COLORS.accent}
                    fill={COLORS.accent}
                    fillOpacity={0.6}
                    name="Daily Responses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50 rounded">
                <div className="text-center">
                  <p className="text-gray-500">No daily activity data</p>
                  <p className="text-sm text-gray-400">Data will appear as responses are submitted</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sentiment Distribution Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Distribution</h3>
          <div className="h-80 w-full">
            {chartData.sentimentDistribution.some((item) => item.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.sentimentDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.sentimentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50 rounded">
                <div className="text-center">
                  <p className="text-gray-500">No sentiment data available</p>
                  <p className="text-sm text-gray-400">Data will appear as responses are submitted</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Role Comparison Chart */}
        {chartData.roleComparison.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Comparison by Role</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.roleComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="role" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="responses" fill={COLORS.primary} name="Total Responses" />
                  <Bar yAxisId="right" dataKey="avgSentiment" fill={COLORS.secondary} name="Avg Sentiment" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Real-time stats cards - FIXED to show real data
  const renderStatsCards = () => {
    if (!realTimeData) {
      return (
        <div className="mb-8">
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <div className="h-12 w-12 text-gray-400 mx-auto mb-4">📊</div>
            <p className="text-gray-500">Loading dashboard statistics...</p>
            <p className="text-sm text-gray-400 mt-2">Real-time data will appear here</p>
          </div>
        </div>
      )
    }

    const statsCards = [
      {
        title: "Total Responses",
        value: realTimeData.totalResponses,
        icon: "📊",
        color: "bg-blue-500",
        change: `+${realTimeData.todayResponses} today`,
        show: true, // Always show, even if 0
      },
      {
        title: "Active Roles",
        value: realTimeData.activeUsers,
        icon: "👥",
        color: "bg-green-500",
        change: "Participating",
        show: true, // Always show
      },
      {
        title: "Avg. Sentiment",
        value: realTimeData.avgSentiment.toFixed(2),
        icon: "📈",
        color: "bg-purple-500",
        change:
          realTimeData.avgSentiment > 0
            ? "Positive trend"
            : realTimeData.avgSentiment < 0
              ? "Needs attention"
              : "Neutral",
        show: true, // Always show
      },
      {
        title: "Response Rate",
        value: `${realTimeData.responseRate}%`,
        icon: "⚡",
        color: "bg-orange-500",
        change: "Engagement level",
        show: true, // Always show
      },
    ]

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <span className="text-white text-xl">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading && !admin) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">District Director Dashboard</h1>
            <p className="text-sm text-gray-600">Real-time School Feeding Program Analytics</p>
          </div>

          {admin && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-500">Live</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-700 mr-2">👤</span>
                <span className="text-sm text-gray-700">
                  {admin.fullName} | {admin.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Notifications */}
        {notification.show && (
          <div
            className={`mb-4 p-4 rounded-lg border ${
              notification.type === "error"
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-green-50 text-green-800 border-green-200"
            }`}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span>{notification.type === "error" ? "❌" : "✅"}</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <span className="mr-2">❌</span>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Real-time Stats */}
        {renderStatsCards()}

        {/* Role selector and tabs */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6 border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Survey Analytics & Management</h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
            >
              <span className={refreshing ? "animate-spin" : ""}>🔄</span>
              <span>Refresh Data</span>
            </button>
          </div>

          {/* Role selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`px-4 py-2 rounded-md font-medium transition-colors capitalize ${
                  activeRole === role ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {role}s
              </button>
            ))}
          </div>

          {/* Tab selector */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "analytics", label: "Real-time Analysis", icon: "📊" },
                { id: "responses", label: "Survey Responses", icon: "📝" },
                { id: "questions", label: "Question Management", icon: "✏️" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div className="mt-6">
            {activeTab === "analytics" && <div>{renderAnalyticsCharts()}</div>}

            {activeTab === "responses" && (
              <div>
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Download button - Always show */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleDownloadPDF}
                        disabled={downloadLoading}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
                      >
                        <span>📥</span>
                        <span>{downloadLoading ? "Generating..." : "Download Report"}</span>
                      </button>
                    </div>

                    {/* Responses table */}
                    {rawResponses.length > 0 ? (
                      <div className="bg-white border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Sentiment
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Responses
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {rawResponses.map((response, index) => (
                                <tr key={response.id || index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {response.userName || "Anonymous"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(response.created_at).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        Number.parseFloat(response.sentiment_score) > 0.3
                                          ? "bg-green-100 text-green-800"
                                          : Number.parseFloat(response.sentiment_score) < -0.3
                                            ? "bg-red-100 text-red-800"
                                            : "bg-yellow-100 text-yellow-800"
                                      }`}
                                    >
                                      {Number.parseFloat(response.sentiment_score) > 0.3
                                        ? "Positive"
                                        : Number.parseFloat(response.sentiment_score) < -0.3
                                          ? "Negative"
                                          : "Neutral"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-500">
                                    <div className="max-w-xs truncate">
                                      {typeof response.responses === "string"
                                        ? "Survey completed"
                                        : "Multiple responses"}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-8 bg-gray-50 rounded-lg">
                        <span className="text-4xl mb-4 block">📝</span>
                        <p className="text-gray-500">No responses available for {activeRole}s</p>
                        <p className="text-sm text-gray-400 mt-2">Responses will appear here as they are submitted</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "questions" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Manage {activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} Questions
                  </h3>
                  <button
                    onClick={() => setIsAddQuestionOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
                  >
                    <span>➕</span>
                    <span>Add Question</span>
                  </button>
                </div>

                {/* Questions list */}
                <div className="space-y-4">
                  {surveyQuestions[activeRole]?.length > 0 ? (
                    surveyQuestions[activeRole].map((question, index) => (
                      <div key={question.id} className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-2">
                              Q{index + 1}: {question.question_text}
                            </h4>
                            <div className="text-sm text-gray-600">
                              <strong>Options:</strong>
                              <ul className="list-disc list-inside mt-1">
                                {question.options.map((option, optIndex) => (
                                  <li key={optIndex}>{option}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => {
                                setCurrentQuestion(question)
                                setEditQuestion({
                                  questionText: question.question_text,
                                  options: [...question.options],
                                })
                                setIsEditQuestionOpen(true)
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Edit Question"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => {
                                setCurrentQuestion(question)
                                setIsDeleteQuestionOpen(true)
                              }}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Delete Question"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-8 bg-gray-50 rounded-lg">
                      <span className="text-4xl mb-4 block">❓</span>
                      <p className="text-gray-500">No questions available for {activeRole}s</p>
                      <button
                        onClick={() => setIsAddQuestionOpen(true)}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                      >
                        Add First Question
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Question Modal */}
      {isAddQuestionOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Question</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Text</label>
                <textarea
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion((prev) => ({ ...prev, questionText: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter your question here..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                {newQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...newQuestion.options]
                        newOptions[index] = e.target.value
                        setNewQuestion((prev) => ({ ...prev, options: newOptions }))
                      }}
                      className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Option ${index + 1}`}
                    />
                    {newQuestion.options.length > 2 && (
                      <button
                        onClick={() => {
                          const newOptions = newQuestion.options.filter((_, i) => i !== index)
                          setNewQuestion((prev) => ({ ...prev, options: newOptions }))
                        }}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        ❌
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setNewQuestion((prev) => ({ ...prev, options: [...prev.options, ""] }))}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Add Option
                </button>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsAddQuestionOpen(false)
                  setNewQuestion({ questionText: "", options: ["", ""] })
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuestion}
                disabled={
                  !newQuestion.questionText.trim() || newQuestion.options.filter((opt) => opt.trim()).length < 2
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
              >
                Add Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {isEditQuestionOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Question</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question Text</label>
                <textarea
                  value={editQuestion.questionText}
                  onChange={(e) => setEditQuestion((prev) => ({ ...prev, questionText: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter your question here..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                {editQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...editQuestion.options]
                        newOptions[index] = e.target.value
                        setEditQuestion((prev) => ({ ...prev, options: newOptions }))
                      }}
                      className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Option ${index + 1}`}
                    />
                    {editQuestion.options.length > 2 && (
                      <button
                        onClick={() => {
                          const newOptions = editQuestion.options.filter((_, i) => i !== index)
                          setEditQuestion((prev) => ({ ...prev, options: newOptions }))
                        }}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        ❌
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setEditQuestion((prev) => ({ ...prev, options: [...prev.options, ""] }))}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Add Option
                </button>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setIsEditQuestionOpen(false)
                  setCurrentQuestion(null)
                  setEditQuestion({ questionText: "", options: ["", ""] })
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditQuestion}
                disabled={
                  !editQuestion.questionText.trim() || editQuestion.options.filter((opt) => opt.trim()).length < 2
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors"
              >
                Update Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Question Modal */}
      {isDeleteQuestionOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Question</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this question? This action cannot be undone.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="font-medium text-gray-900">{currentQuestion?.question_text}</p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDeleteQuestionOpen(false)
                  setCurrentQuestion(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteQuestion}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
              >
                Delete Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
