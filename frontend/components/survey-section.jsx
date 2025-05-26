"use client"

import { useState, useEffect } from "react"
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react"

export default function SurveySection({ role, questions, onRefresh, isLoading }) {
  const [surveyResponses, setSurveyResponses] = useState({})
  const [surveySubmitted, setSurveySubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  // Initialize survey responses when questions change
  useEffect(() => {
    if (questions && questions.length > 0) {
      const initialResponses = {}
      questions.forEach((question) => {
        initialResponses[question.id] = surveyResponses[question.id] || ""
      })
      setSurveyResponses(initialResponses)
    }
  }, [questions])

  const handleSurveyChange = (questionId, response) => {
    setSurveyResponses((prev) => ({
      ...prev,
      [questionId]: response,
    }))
    // Clear error message when user starts answering
    if (errorMessage) {
      setErrorMessage("")
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await onRefresh()
      setSuccessMessage("Questions refreshed successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      console.error("Error refreshing survey questions:", error)
      setErrorMessage("Failed to refresh questions. Please try again.")
    } finally {
      setRefreshing(false)
    }
  }

  const handleSurveySubmit = async (e) => {
    e.preventDefault()

    // Validate that all questions have been answered
    const unansweredQuestions = Object.values(surveyResponses).some((response) => response === "")

    if (unansweredQuestions) {
      setErrorMessage("Please answer all questions before submitting.")
      return
    }

    setSubmitting(true)
    setErrorMessage("")

    try {
      const response = await fetch(`http://localhost:5000/api/submit-survey/${role}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(surveyResponses),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSurveySubmitted(true)
        setSuccessMessage("Survey submitted successfully! Thank you for your feedback.")

        // Reset form after successful submission
        setSurveyResponses({})

        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage("")
        }, 5000)
      } else {
        setErrorMessage(data.message || "Failed to submit survey. Please try again.")
      }
    } catch (error) {
      console.error("Error submitting survey:", error)
      setErrorMessage("Network error. Please check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const roleTitle = role.charAt(0).toUpperCase() + role.slice(1)

  return (
    <div className="mb-8 bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-green-500 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">{roleTitle} Survey</h3>
            <p className="text-blue-100 text-sm">Your feedback helps improve the school feeding program</p>
          </div>
          {!surveySubmitted && (
            <button
              onClick={handleRefresh}
              disabled={refreshing || isLoading}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="px-6 py-4 bg-green-50 border-l-4 border-green-400">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700 text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      {surveySubmitted ? (
        <div className="px-6 py-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Survey Submitted Successfully!</h3>
          <p className="text-gray-600 mb-6">
            Thank you for your valuable feedback. Your responses have been sent to the District Director and will help
            improve the school feeding program.
          </p>
          <button
            onClick={() => {
              setSurveySubmitted(false)
              handleRefresh()
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            Take Another Survey
          </button>
        </div>
      ) : (
        <form onSubmit={handleSurveySubmit}>
          {isLoading ? (
            <div className="px-6 py-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Loading survey questions...</p>
            </div>
          ) : questions && questions.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {questions.map((question, index) => (
                <div key={question.id} className="px-6 py-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold mr-3">
                        {index + 1}
                      </span>
                      {question.question}
                    </label>
                  </div>
                  <div className="space-y-3">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center">
                        <input
                          id={`question-${question.id}-option-${optionIndex}`}
                          name={`question-${question.id}`}
                          type="radio"
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 cursor-pointer"
                          value={option}
                          checked={surveyResponses[question.id] === option}
                          onChange={() => handleSurveyChange(question.id, option)}
                        />
                        <label
                          htmlFor={`question-${question.id}-option-${optionIndex}`}
                          className="ml-3 block text-sm text-gray-700 cursor-pointer hover:text-gray-900"
                        >
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-500">No survey questions available at this time.</p>
              <p className="text-sm text-gray-400 mt-2">Check back later or contact your administrator.</p>
            </div>
          )}

          {questions && questions.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {Object.values(surveyResponses).filter(Boolean).length} of {questions.length} questions answered
              </div>
              <button
                type="submit"
                disabled={submitting || Object.values(surveyResponses).some((response) => response === "")}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
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
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Survey</span>
                )}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
