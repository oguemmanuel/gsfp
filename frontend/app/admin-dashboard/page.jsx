"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { LogOut, User, Download, Plus, Edit, Trash2, X, RefreshCw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import SurveySection from "@/components/survey-section"

const AdminDashboard = () => {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [responses, setResponses] = useState({})
  const [activeRole, setActiveRole] = useState("teacher")
  const [rawResponses, setRawResponses] = useState([])
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [surveyQuestions, setSurveyQuestions] = useState({})
  const [activeTab, setActiveTab] = useState("responses")
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false)
  const [isEditQuestionOpen, setIsEditQuestionOpen] = useState(false)
  const [isDeleteQuestionOpen, setIsDeleteQuestionOpen] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [newQuestion, setNewQuestion] = useState({
    questionText: "",
    options: ["", ""],
  })
  const [notification, setNotification] = useState({ show: false, type: "", message: "" })
  const [refreshing, setRefreshing] = useState(false)

  const roles = ["teacher", "student", "caterer", "supplier", "headmaster"]
  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE"]

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
  }, [])

  useEffect(() => {
    // Fetch survey responses for the active role
    const fetchResponses = async () => {
      setLoading(true)
      try {
        const response = await fetch(`http://localhost:5000/api/admin/survey-responses/${activeRole}`, {
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          setRawResponses(data.data)

          // Process the data for the chart
          const processedData = processChartData(data.data)
          setResponses((prev) => ({ ...prev, [activeRole]: processedData }))
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

    fetchResponses()
  }, [activeRole])

  useEffect(() => {
    // Fetch survey questions for the active role
    fetchSurveyQuestions()

    // Set up polling to check for new questions every 5 minutes
    const intervalId = setInterval(
      () => {
        fetchSurveyQuestions(false)
      },
      5 * 60 * 1000,
    )

    return () => clearInterval(intervalId)
  }, [activeRole])

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

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchSurveyQuestions(false)

      // Show success notification
      setNotification({
        show: true,
        type: "success",
        message: "Survey questions refreshed successfully",
      })

      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification({ show: false, type: "", message: "" })
      }, 3000)
    } catch (error) {
      console.error("Error refreshing survey questions:", error)
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
        window.location.href = "/admin/login"
      }
    } catch (err) {
      setError("Failed to logout. Please try again.")
      console.error("Logout error:", err)
    }
  }

  // Process survey data for visualization
  const processChartData = (roleData) => {
    if (!roleData || !roleData.length) return []

    // Create a map to store all questions
    const questions = new Map()
    const timeData = new Map()

    // First, collect all questions and their possible answers
    roleData.forEach((response) => {
      // Ensure responses is properly parsed
      const parsedResponses =
        typeof response.responses === "string" ? JSON.parse(response.responses) : response.responses

      const timestamp = new Date(response.createdAt).toLocaleDateString()

      if (!timeData.has(timestamp)) {
        timeData.set(timestamp, {
          date: timestamp,
          count: 0,
          sentimentScore: 0,
        })
      }

      // Update time-based data
      const timeEntry = timeData.get(timestamp)
      timeEntry.count++

      // Make sure sentimentScore is a number
      const sentimentValue = Number.parseFloat(response.sentimentScore) || 0
      timeEntry.sentimentScore += sentimentValue

      // Process questions and answers - ensure we're iterating through an object, not an array
      if (parsedResponses && typeof parsedResponses === "object") {
        Object.entries(parsedResponses).forEach(([questionId, data]) => {
          if (!questions.has(questionId)) {
            questions.set(questionId, {
              id: questionId,
              question: data.question || `Question ${questionId}`,
              answers: new Map(),
            })
          }
        })
      }
    })

    // Calculate average sentiment by date
    timeData.forEach((entry) => {
      entry.sentimentScore = entry.sentimentScore / entry.count
    })

    // Convert to the format needed for the line chart
    return Array.from(timeData.values()).sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  // Helper function to format answer display
  const formatAnswer = (answer) => {
    if (!answer) return "No answer"

    // If it's already a string but looks like JSON
    if (typeof answer === "string" && answer.trim().startsWith("{") && answer.trim().endsWith("}")) {
      try {
        // Try to parse it as JSON
        const parsed = JSON.parse(answer)
        return Object.entries(parsed)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ")
      } catch (e) {
        // If parsing fails, return the original string
        return answer
      }
    }

    // If it's an object
    if (typeof answer === "object" && answer !== null) {
      return Object.entries(answer)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")
    }

    // For any other case, convert to string
    return String(answer)
  }

  // Function to handle PDF download
  const handleDownloadPDF = async () => {
    setDownloadLoading(true)
    try {
      const response = await fetch(`http://localhost:5000/api/admin/download-responses/${activeRole}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      // Get the blob from the response
      const blob = await response.blob()

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob)

      // Create a temporary link element
      const link = document.createElement("a")
      link.href = url
      link.download = `${activeRole}-survey-responses.pdf`

      // Append the link to the document, click it, and remove it
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL object
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(`Failed to download ${activeRole} survey responses. Please try again later.`)
      console.error("Download error:", err)
    } finally {
      setDownloadLoading(false)
    }
  }

  // Function to display the raw responses
  const renderRawResponses = () => {
    if (!rawResponses || !rawResponses.length) {
      return <p className="text-gray-500 italic">No responses available.</p>
    }

    return (
      <div className="mt-4 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Raw Responses</h3>

          <Button onClick={handleDownloadPDF} disabled={downloadLoading || !rawResponses.length} variant="outline">
            {downloadLoading ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent border-current rounded-full"></div>
                Generating PDF...
              </>
            ) : (
              <span className="cursor-pointer flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Download as PDF
              </span>
            )}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  User
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Responses
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Sentiment
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rawResponses.map((response, index) => {
                // Ensure responses is properly parsed
                const parsedResponses =
                  typeof response.responses === "string" ? JSON.parse(response.responses) : response.responses

                return (
                  <tr key={response.id || index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {response.userName || "Anonymous"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(response.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="space-y-2">
                        {parsedResponses && typeof parsedResponses === "object" ? (
                          Object.entries(parsedResponses).map(([questionId, data]) => (
                            <div key={questionId} className="border-l-2 border-gray-200 pl-3">
                              <p className="font-medium">{data.question || `Question ${questionId}`}</p>
                              <p className="text-gray-700">{formatAnswer(data.answer)}</p>
                            </div>
                          ))
                        ) : (
                          <p>No detailed responses available</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${
                          Number.parseFloat(response.sentimentScore) > 0.3
                            ? "bg-green-100 text-green-800"
                            : Number.parseFloat(response.sentimentScore) < -0.3
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {Number.parseFloat(response.sentimentScore) > 0.3
                          ? "Positive"
                          : Number.parseFloat(response.sentimentScore) < -0.3
                            ? "Negative"
                            : "Neutral"}
                        ({(Number.parseFloat(response.sentimentScore) || 0).toFixed(2)})
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Render the line chart
  const renderLineChart = () => {
    const data = responses[activeRole]

    if (!data || !data.length) {
      return <p className="text-center p-4">No data available for {activeRole}s</p>
    }

    return (
      <div className="bg-white p-4 rounded-lg shadow mt-6">
        <h3 className="text-lg font-medium mb-4">Response Trend and Sentiment Analysis</h3>
        <div className="mb-2 text-sm text-gray-500">
          This chart shows the number of responses and average sentiment score over time.
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" label={{ value: "Number of Responses", angle: -90, position: "insideLeft" }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[-1, 1]}
              label={{ value: "Sentiment Score", angle: 90, position: "insideRight" }}
            />
            <Tooltip formatter={(value, name) => [value.toFixed(2), name]} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="count"
              stroke="#8884d8"
              name="Response Count"
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="sentimentScore"
              stroke="#82ca9d"
              name="Avg. Sentiment"
              dot={{ r: 6 }}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Function to handle adding a new question
  const handleAddQuestion = async () => {
    try {
      // Validate inputs
      if (!newQuestion.questionText.trim()) {
        setNotification({
          show: true,
          type: "error",
          message: "Question text is required",
        })
        return
      }

      // Filter out empty options
      const filteredOptions = newQuestion.options.filter((option) => option.trim() !== "")

      if (filteredOptions.length < 2) {
        setNotification({
          show: true,
          type: "error",
          message: "At least two options are required",
        })
        return
      }

      const response = await fetch("http://localhost:5000/api/admin/survey-questions", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: activeRole,
          questionText: newQuestion.questionText,
          options: filteredOptions,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Refresh questions
        await fetchSurveyQuestions()

        // Reset form and close dialog
        setNewQuestion({
          questionText: "",
          options: ["", ""],
        })
        setIsAddQuestionOpen(false)

        // Show success notification
        setNotification({
          show: true,
          type: "success",
          message: "Question added successfully",
        })

        // Hide notification after 3 seconds
        setTimeout(() => {
          setNotification({ show: false, type: "", message: "" })
        }, 3000)
      } else {
        throw new Error(data.message || "Failed to add question")
      }
    } catch (err) {
      console.error("Error adding question:", err)
      setNotification({
        show: true,
        type: "error",
        message: err.message || "Failed to add question",
      })
    }
  }

  // Function to handle editing a question
  const handleEditQuestion = async () => {
    try {
      // Validate inputs
      if (!currentQuestion.question_text.trim()) {
        setNotification({
          show: true,
          type: "error",
          message: "Question text is required",
        })
        return
      }

      // Filter out empty options
      const filteredOptions = currentQuestion.options.filter((option) => option.trim() !== "")

      if (filteredOptions.length < 2) {
        setNotification({
          show: true,
          type: "error",
          message: "At least two options are required",
        })
        return
      }

      const response = await fetch(`http://localhost:5000/api/admin/survey-questions/${currentQuestion.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionText: currentQuestion.question_text,
          options: filteredOptions,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Refresh questions
        await fetchSurveyQuestions()

        // Reset form and close dialog
        setCurrentQuestion(null)
        setIsEditQuestionOpen(false)

        // Show success notification
        setNotification({
          show: true,
          type: "success",
          message: "Question updated successfully",
        })

        // Hide notification after 3 seconds
        setTimeout(() => {
          setNotification({ show: false, type: "", message: "" })
        }, 3000)
      } else {
        throw new Error(data.message || "Failed to update question")
      }
    } catch (err) {
      console.error("Error updating question:", err)
      setNotification({
        show: true,
        type: "error",
        message: err.message || "Failed to update question",
      })
    }
  }

  // Function to handle deleting a question
  const handleDeleteQuestion = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/survey-questions/${currentQuestion.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      const data = await response.json()

      if (data.success) {
        // Refresh questions
        await fetchSurveyQuestions()

        // Reset form and close dialog
        setCurrentQuestion(null)
        setIsDeleteQuestionOpen(false)

        // Show success notification
        setNotification({
          show: true,
          type: "success",
          message: "Question deleted successfully",
        })

        // Hide notification after 3 seconds
        setTimeout(() => {
          setNotification({ show: false, type: "", message: "" })
        }, 3000)
      } else {
        throw new Error(data.message || "Failed to delete question")
      }
    } catch (err) {
      console.error("Error deleting question:", err)
      setNotification({
        show: true,
        type: "error",
        message: err.message || "Failed to delete question",
      })
    }
  }

  // Function to add a new option field
  const handleAddOption = () => {
    setNewQuestion((prev) => ({
      ...prev,
      options: [...prev.options, ""],
    }))
  }

  // Function to add a new option field to existing question
  const handleAddOptionToExisting = () => {
    setCurrentQuestion((prev) => ({
      ...prev,
      options: [...prev.options, ""],
    }))
  }

  // Function to update an option in the new question form
  const handleOptionChange = (index, value) => {
    setNewQuestion((prev) => {
      const updatedOptions = [...prev.options]
      updatedOptions[index] = value
      return {
        ...prev,
        options: updatedOptions,
      }
    })
  }

  // Function to update an option in the edit question form
  const handleEditOptionChange = (index, value) => {
    setCurrentQuestion((prev) => {
      const updatedOptions = [...prev.options]
      updatedOptions[index] = value
      return {
        ...prev,
        options: updatedOptions,
      }
    })
  }

  // Function to remove an option from the new question form
  const handleRemoveOption = (index) => {
    if (newQuestion.options.length <= 2) {
      setNotification({
        show: true,
        type: "error",
        message: "At least two options are required",
      })
      return
    }

    setNewQuestion((prev) => {
      const updatedOptions = [...prev.options]
      updatedOptions.splice(index, 1)
      return {
        ...prev,
        options: updatedOptions,
      }
    })
  }

  // Function to remove an option from the edit question form
  const handleRemoveEditOption = (index) => {
    if (currentQuestion.options.length <= 2) {
      setNotification({
        show: true,
        type: "error",
        message: "At least two options are required",
      })
      return
    }

    setCurrentQuestion((prev) => {
      const updatedOptions = [...prev.options]
      updatedOptions.splice(index, 1)
      return {
        ...prev,
        options: updatedOptions,
      }
    })
  }

  // Function to render the survey questions management section
  const renderSurveyQuestions = () => {
    const questions = surveyQuestions[activeRole]

    if (!questions || !questions.length) {
      return (
        <div className="text-center p-8">
          <p className="text-gray-500 mb-4">No questions available for {activeRole}s</p>
          <Button onClick={() => setIsAddQuestionOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Question
          </Button>
        </div>
      )
    }

    return (
      <div className="mt-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium">
            Survey Questions for {activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}s
          </h3>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white hover:bg-gray-100"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsAddQuestionOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            {questions.map((question, index) => (
              <AccordionItem key={question.id} value={`question-${question.id}`}>
                <AccordionTrigger className="hover:bg-gray-50 px-4 py-2 rounded-md">
                  <div className="flex-1 text-left">
                    <span className="font-medium">Q{index + 1}:</span> {question.question_text}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 py-2">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Options:</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {question.options.map((option, optIndex) => (
                          <li key={optIndex} className="text-gray-700">
                            {option}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex space-x-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentQuestion(question)
                          setIsEditQuestionOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setCurrentQuestion(question)
                          setIsDeleteQuestionOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    )
  }

  // Function to render the preview of the survey for the current role
  const renderSurveyPreview = () => {
    const questions = surveyQuestions[activeRole]

    if (!questions || !questions.length) {
      return (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No questions available to preview.</p>
          <p className="text-sm text-gray-400 mt-2">Add questions to see how they will appear to {activeRole}s.</p>
        </div>
      )
    }

    // Format questions for the SurveySection component
    const formattedQuestions = questions.map((q) => ({
      id: q.id,
      question: q.question_text,
      options: q.options,
    }))

    return (
      <div className="mt-6 border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h3 className="text-lg font-medium">Survey Preview</h3>
          <p className="text-sm text-gray-500">This is how the survey will appear to {activeRole}s</p>
        </div>
        <div className="p-4">
          <SurveySection role={activeRole} questions={formattedQuestions} onRefresh={handleRefresh} isLoading={false} />
        </div>
      </div>
    )
  }

  if (loading && !admin) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with admin info and logout */}
      <header className="bg-blue-600 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">District Director</h1>

          {admin && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <User className="h-5 w-5 text-white mr-2" />
                <span className="text-sm text-white">
                  {admin.fullName} | {admin.email}
                </span>
              </div>
              <Button onClick={handleLogout} variant="secondary" className="flex items-center text-white">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {notification.show && (
          <Alert
            className={`mb-4 ${notification.type === "error" ? "bg-red-50 text-red-800 border-red-200" : "bg-green-50 text-green-800 border-green-200"}`}
          >
            <AlertTitle>{notification.type === "error" ? "Error" : "Success"}</AlertTitle>
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-4 bg-red-50 text-red-800 border-red-200">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Role selector */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Survey Management</h2>

          <div className="flex flex-wrap gap-2 mb-6">
            {roles.map((role) => (
              <Button
                key={role}
                onClick={() => setActiveRole(role)}
                variant={activeRole === role ? "default" : "outline"}
                className="capitalize"
              >
                {role}s
              </Button>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full gap-4 grid-cols-3">
              <TabsTrigger value="responses">Survey Responses</TabsTrigger>
              <TabsTrigger value="questions">Survey Questions</TabsTrigger>
              <TabsTrigger value="preview">Survey Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="responses" className="mt-6">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <>
                  {renderLineChart()}
                  {renderRawResponses()}
                </>
              )}
            </TabsContent>

            <TabsContent value="questions" className="mt-6">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                renderSurveyQuestions()
              )}
            </TabsContent>

            <TabsContent value="preview" className="mt-6">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                renderSurveyPreview()
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Add Question Dialog */}
      <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
            <DialogDescription>Create a new survey question for {activeRole}s.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="question-text" className="text-sm font-medium">
                Question Text
              </label>
              <Textarea
                id="question-text"
                placeholder="Enter your question here..."
                value={newQuestion.questionText}
                onChange={(e) => setNewQuestion((prev) => ({ ...prev, questionText: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Answer Options</label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-2">
                {newQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                      disabled={newQuestion.options.length <= 2}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddQuestionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddQuestion}>Add Question</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog open={isEditQuestionOpen} onOpenChange={setIsEditQuestionOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>Update this survey question for {activeRole}s.</DialogDescription>
          </DialogHeader>

          {currentQuestion && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="edit-question-text" className="text-sm font-medium">
                  Question Text
                </label>
                <Textarea
                  id="edit-question-text"
                  placeholder="Enter your question here..."
                  value={currentQuestion.question_text}
                  onChange={(e) => setCurrentQuestion((prev) => ({ ...prev, question_text: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Answer Options</label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddOptionToExisting}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>

                <div className="space-y-2">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => handleEditOptionChange(index, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveEditOption(index)}
                        disabled={currentQuestion.options.length <= 2}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditQuestionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditQuestion}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Question Dialog */}
      <Dialog open={isDeleteQuestionOpen} onOpenChange={setIsDeleteQuestionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {currentQuestion && (
            <div className="py-4">
              <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                <p className="font-medium">{currentQuestion.question_text}</p>
                <ul className="mt-2 pl-5 list-disc text-sm text-gray-600">
                  {currentQuestion.options.map((option, index) => (
                    <li key={index}>{option}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteQuestionOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuestion}>
              Delete Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminDashboard
