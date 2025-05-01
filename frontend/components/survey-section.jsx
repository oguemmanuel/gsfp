"use client"

import { useState, useEffect } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SurveySection({ role, questions, onRefresh, isLoading }) {
  const [surveyResponses, setSurveyResponses] = useState({})
  const [surveySubmitted, setSurveySubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [refreshing, setRefreshing] = useState(false)

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
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } catch (error) {
      console.error("Error refreshing survey questions:", error)
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
        body: JSON.stringify({ responses: surveyResponses }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSurveySubmitted(true)
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
    <div className="mb-10 bg-blue-50 shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 bg-blue-100 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-blue-900">{roleTitle} Survey Questions</h3>
          <p className="mt-1 max-w-2xl text-sm text-blue-700">
            Your feedback is essential for improving the program. This information will be shared with the District
            Director.
          </p>
        </div>
        {!surveySubmitted && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            className="bg-white hover:bg-gray-100"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
      </div>

      {surveySubmitted ? (
        <div className="px-4 py-5 sm:p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Survey Submitted Successfully</h3>
          <p className="mt-1 text-sm text-gray-500">
            Thank you for your feedback! Your responses have been sent to the District Director.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSurveySubmitted(false)
              handleRefresh()
            }}
            className="mt-4"
          >
            Take Another Survey
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSurveySubmit} className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="px-4 py-5 sm:p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-sm text-gray-500">Loading survey questions...</p>
            </div>
          ) : questions && questions.length > 0 ? (
            questions.map((question) => (
              <div key={question.id} className="px-4 py-5 sm:p-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">{question.question}</label>
                <div className="mt-2 space-y-2">
                  {question.options.map((option, index) => (
                    <div key={index} className="flex items-center">
                      <input
                        id={`question-${question.id}-option-${index}`}
                        name={`question-${question.id}`}
                        type="radio"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 cursor-pointer"
                        value={option}
                        checked={surveyResponses[question.id] === option}
                        onChange={() => handleSurveyChange(question.id, option)}
                      />
                      <label
                        htmlFor={`question-${question.id}-option-${index}`}
                        className="ml-3 block text-sm font-medium text-gray-700"
                      >
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-5 sm:p-6 text-center">
              <p className="text-gray-500">No survey questions available at this time.</p>
            </div>
          )}

          {errorMessage && (
            <div className="px-4 py-3">
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            </div>
          )}

          {questions && questions.length > 0 && (
            <div className="px-4 py-4 sm:px-6 flex justify-end">
              <Button type="submit" disabled={submitting} className="inline-flex justify-center">
                {submitting ? (
                  <>
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
                    Submitting...
                  </>
                ) : (
                  "Submit Survey"
                )}
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
