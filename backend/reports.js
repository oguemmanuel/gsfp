const { db } = require("./db")
const { AnalyticsService } = require("./analytics")
const moment = require("moment")

class ReportGenerator {
  constructor() {
    this.analyticsService = new AnalyticsService()
  }

  // Generate qualitative report with real survey data
  async generateQualitativeReport(dateRange, filters = {}) {
    try {
      const trends = await this.analyticsService.getSurveyTrends(filters.role, dateRange)

      // Get detailed responses for qualitative analysis
      let query = `
        SELECT 
          sr.responses,
          sr.sentiment_score,
          sr.created_at,
          u.full_name,
          u.role,
          u.school_name,
          u.district
        FROM survey_responses sr
        JOIN users u ON sr.user_id = u.id
      `

      const params = []
      const conditions = []

      if (dateRange) {
        conditions.push("sr.created_at BETWEEN ? AND ?")
        params.push(dateRange.start, dateRange.end)
      }

      if (filters.role) {
        conditions.push("sr.role = ?")
        params.push(filters.role)
      }

      if (filters.district) {
        conditions.push("u.district = ?")
        params.push(filters.district)
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`
      }

      query += ` ORDER BY sr.created_at DESC`

      const [responses] = await db.execute(query, params)

      // Analyze themes and patterns from real responses
      const thematicAnalysis = this.analyzeThemes(responses)
      const detailedResponses = this.formatDetailedResponses(responses)

      const report = {
        type: "qualitative",
        title: `Qualitative Analysis Report - ${moment().format("YYYY-MM-DD")}`,
        dateRange,
        filters,
        summary: {
          totalResponses: responses.length,
          averageSentiment:
            trends.roleTrends.length > 0
              ? trends.roleTrends.reduce((sum, role) => sum + role.avgSentiment, 0) / trends.roleTrends.length
              : 0,
          sentimentDistribution: trends.sentimentDistribution,
          responsesByRole: this.groupResponsesByRole(responses),
        },
        thematicAnalysis,
        trends,
        detailedResponses,
        generatedAt: new Date().toISOString(),
      }

      return report
    } catch (error) {
      console.error("Error generating qualitative report:", error)
      throw error
    }
  }

  // Generate quantitative report with real data
  async generateQuantitativeReport(dateRange, filters = {}) {
    try {
      const analyticsData = await this.analyticsService.generateAnalyticsReport(dateRange)

      // Calculate key metrics from real data
      const metrics = this.calculateKeyMetrics(analyticsData)

      const report = {
        type: "quantitative",
        title: `Quantitative Analysis Report - ${moment().format("YYYY-MM-DD")}`,
        dateRange,
        filters,
        metrics,
        enrollment: analyticsData.enrollment,
        meals: analyticsData.meals,
        stocks: analyticsData.stocks,
        trends: analyticsData.trends,
        charts: this.generateChartData(analyticsData),
        generatedAt: new Date().toISOString(),
      }

      return report
    } catch (error) {
      console.error("Error generating quantitative report:", error)
      throw error
    }
  }

  // Generate combined report
  async generateCombinedReport(dateRange, filters = {}) {
    try {
      const [qualitative, quantitative] = await Promise.all([
        this.generateQualitativeReport(dateRange, filters),
        this.generateQuantitativeReport(dateRange, filters),
      ])

      const report = {
        type: "combined",
        title: `Comprehensive School Feeding Program Report - ${moment().format("YYYY-MM-DD")}`,
        dateRange,
        filters,
        executiveSummary: this.generateExecutiveSummary(qualitative, quantitative),
        qualitativeAnalysis: qualitative,
        quantitativeAnalysis: quantitative,
        recommendations: this.generateRecommendations(qualitative, quantitative),
        generatedAt: new Date().toISOString(),
      }

      return report
    } catch (error) {
      console.error("Error generating combined report:", error)
      throw error
    }
  }

  // Format detailed responses for PDF generation
  formatDetailedResponses(responses) {
    return responses.map((response) => {
      let parsedResponses = {}
      try {
        parsedResponses = JSON.parse(response.responses)
      } catch (error) {
        console.error("Error parsing response:", error)
        parsedResponses = {}
      }

      return {
        respondent: {
          name: response.full_name,
          role: response.role,
          school: response.school_name,
          district: response.district,
        },
        submittedAt: moment(response.created_at).format("YYYY-MM-DD HH:mm:ss"),
        sentimentScore: response.sentiment_score,
        sentimentCategory: this.categorizeSentiment(response.sentiment_score),
        responses: Object.values(parsedResponses).map((resp) => ({
          question: resp.question || "Unknown question",
          answer: resp.answer || "No answer",
          sentiment: resp.sentiment || 0,
        })),
      }
    })
  }

  // Group responses by role for analysis
  groupResponsesByRole(responses) {
    const roleGroups = {}
    responses.forEach((response) => {
      if (!roleGroups[response.role]) {
        roleGroups[response.role] = {
          count: 0,
          totalSentiment: 0,
          avgSentiment: 0,
        }
      }
      roleGroups[response.role].count++
      roleGroups[response.role].totalSentiment += response.sentiment_score || 0
      roleGroups[response.role].avgSentiment =
        roleGroups[response.role].totalSentiment / roleGroups[response.role].count
    })
    return roleGroups
  }

  // Analyze themes in qualitative responses with real data
  analyzeThemes(responses) {
    const themes = {
      foodQuality: { count: 0, sentiment: 0, examples: [], avgSentiment: 0 },
      attendance: { count: 0, sentiment: 0, examples: [], avgSentiment: 0 },
      supply: { count: 0, sentiment: 0, examples: [], avgSentiment: 0 },
      satisfaction: { count: 0, sentiment: 0, examples: [], avgSentiment: 0 },
      challenges: { count: 0, sentiment: 0, examples: [], avgSentiment: 0 },
      nutrition: { count: 0, sentiment: 0, examples: [], avgSentiment: 0 },
    }

    const keywords = {
      foodQuality: ["quality", "taste", "food", "meal", "nutrition", "delicious", "fresh", "good food"],
      attendance: ["attendance", "present", "absent", "school", "come to school", "students present"],
      supply: ["supply", "ingredient", "stock", "delivery", "materials", "resources"],
      satisfaction: ["satisfied", "happy", "pleased", "content", "enjoy", "like"],
      challenges: ["challenge", "problem", "issue", "difficulty", "concern", "complaint"],
      nutrition: ["nutrition", "healthy", "vitamins", "balanced", "growth", "development"],
    }

    responses.forEach((response) => {
      let parsedResponses = {}
      try {
        parsedResponses = JSON.parse(response.responses)
      } catch (error) {
        console.error("Error parsing response for theme analysis:", error)
        return
      }

      Object.values(parsedResponses).forEach((data) => {
        if (data && data.answer && data.question) {
          const text = `${data.question} ${data.answer}`.toLowerCase()

          Object.keys(keywords).forEach((theme) => {
            if (keywords[theme].some((keyword) => text.includes(keyword))) {
              themes[theme].count++
              themes[theme].sentiment += response.sentiment_score || 0

              if (themes[theme].examples.length < 5) {
                themes[theme].examples.push({
                  question: data.question,
                  answer: data.answer,
                  user: response.full_name,
                  role: response.role,
                  school: response.school_name,
                  sentiment: response.sentiment_score,
                })
              }
            }
          })
        }
      })
    })

    // Calculate average sentiment for each theme
    Object.keys(themes).forEach((theme) => {
      if (themes[theme].count > 0) {
        themes[theme].avgSentiment = themes[theme].sentiment / themes[theme].count
      }
    })

    return themes
  }

  // Calculate key metrics from real data
  calculateKeyMetrics(analyticsData) {
    const metrics = {
      totalEnrollment: 0,
      totalMealsServed: 0,
      averageAttendance: 0,
      mealEfficiency: 0,
      stockAlerts: 0,
      sentimentScore: 0,
      responseRate: 0,
      programCoverage: 0,
    }

    // Calculate enrollment metrics
    if (analyticsData.enrollment && analyticsData.enrollment.length > 0) {
      metrics.totalEnrollment = analyticsData.enrollment.reduce((sum, school) => sum + school.total_students, 0)
    }

    // Calculate meal metrics
    if (analyticsData.meals && analyticsData.meals.length > 0) {
      const totalPlanned = analyticsData.meals.reduce((sum, meal) => sum + (meal.total_planned || 0), 0)
      const totalServed = analyticsData.meals.reduce((sum, meal) => sum + (meal.total_served || 0), 0)
      const totalAttendance = analyticsData.meals.reduce((sum, meal) => sum + (meal.total_attendance || 0), 0)

      metrics.totalMealsServed = totalServed
      metrics.mealEfficiency = totalPlanned > 0 ? (totalServed / totalPlanned) * 100 : 0
      metrics.averageAttendance = analyticsData.meals.length > 0 ? totalAttendance / analyticsData.meals.length : 0
    }

    // Calculate stock alerts
    if (analyticsData.stocks && analyticsData.stocks.length > 0) {
      metrics.stockAlerts = analyticsData.stocks.reduce(
        (sum, stock) => sum + (stock.low_stock_items || 0) + (stock.expiring_soon || 0),
        0,
      )
    }

    // Calculate overall sentiment
    if (analyticsData.trends && analyticsData.trends.roleTrends && analyticsData.trends.roleTrends.length > 0) {
      metrics.sentimentScore =
        analyticsData.trends.roleTrends.reduce((sum, role) => sum + (role.avgSentiment || 0), 0) /
        analyticsData.trends.roleTrends.length
    }

    // Calculate response rate
    if (analyticsData.trends && analyticsData.trends.totalResponses) {
      metrics.responseRate = analyticsData.trends.totalResponses
    }

    return metrics
  }

  // Generate chart data for visualization
  generateChartData(analyticsData) {
    const charts = {
      enrollmentByDistrict: this.createEnrollmentChart(analyticsData.enrollment || []),
      mealTrends: this.createMealTrendsChart(analyticsData.meals || []),
      sentimentTrends: this.createSentimentChart(analyticsData.trends || {}),
      stockStatus: this.createStockChart(analyticsData.stocks || []),
    }

    return charts
  }

  createEnrollmentChart(enrollmentData) {
    const districtData = {}

    enrollmentData.forEach((school) => {
      if (!districtData[school.district]) {
        districtData[school.district] = { total: 0, male: 0, female: 0 }
      }
      districtData[school.district].total += school.total_students || 0
      districtData[school.district].male += school.male_students || 0
      districtData[school.district].female += school.female_students || 0
    })

    return {
      type: "bar",
      title: "Student Enrollment by District",
      data: {
        labels: Object.keys(districtData),
        datasets: [
          {
            label: "Total Enrollment",
            data: Object.values(districtData).map((d) => d.total),
            backgroundColor: "rgba(54, 162, 235, 0.6)",
          },
          {
            label: "Male Students",
            data: Object.values(districtData).map((d) => d.male),
            backgroundColor: "rgba(75, 192, 192, 0.6)",
          },
          {
            label: "Female Students",
            data: Object.values(districtData).map((d) => d.female),
            backgroundColor: "rgba(255, 99, 132, 0.6)",
          },
        ],
      },
    }
  }

  createMealTrendsChart(mealData) {
    const dailyData = {}

    mealData.forEach((meal) => {
      const date = moment(meal.date_served).format("YYYY-MM-DD")
      if (!dailyData[date]) {
        dailyData[date] = { planned: 0, served: 0 }
      }
      dailyData[date].planned += meal.total_planned || 0
      dailyData[date].served += meal.total_served || 0
    })

    const sortedDates = Object.keys(dailyData).sort()

    return {
      type: "line",
      title: "Daily Meal Service Trends",
      data: {
        labels: sortedDates,
        datasets: [
          {
            label: "Meals Planned",
            data: sortedDates.map((date) => dailyData[date].planned),
            borderColor: "rgba(255, 206, 86, 1)",
            fill: false,
          },
          {
            label: "Meals Served",
            data: sortedDates.map((date) => dailyData[date].served),
            borderColor: "rgba(75, 192, 192, 1)",
            fill: false,
          },
        ],
      },
    }
  }

  createSentimentChart(trendsData) {
    const sentimentDist = trendsData.sentimentDistribution || {}
    return {
      type: "doughnut",
      title: "Stakeholder Sentiment Distribution",
      data: {
        labels: ["Positive", "Neutral", "Negative"],
        datasets: [
          {
            data: [sentimentDist.positive || 0, sentimentDist.neutral || 0, sentimentDist.negative || 0],
            backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 206, 86, 0.6)", "rgba(255, 99, 132, 0.6)"],
          },
        ],
      },
    }
  }

  createStockChart(stockData) {
    const typeData = {}

    stockData.forEach((stock) => {
      if (!typeData[stock.item_type]) {
        typeData[stock.item_type] = { total: 0, lowStock: 0 }
      }
      typeData[stock.item_type].total += stock.item_count || 0
      typeData[stock.item_type].lowStock += stock.low_stock_items || 0
    })

    return {
      type: "bar",
      title: "Inventory Status by Item Type",
      data: {
        labels: Object.keys(typeData),
        datasets: [
          {
            label: "Total Items",
            data: Object.values(typeData).map((d) => d.total),
            backgroundColor: "rgba(54, 162, 235, 0.6)",
          },
          {
            label: "Low Stock Items",
            data: Object.values(typeData).map((d) => d.lowStock),
            backgroundColor: "rgba(255, 99, 132, 0.6)",
          },
        ],
      },
    }
  }

  // Generate executive summary based on real data
  generateExecutiveSummary(qualitative, quantitative) {
    const summary = {
      overview: `This comprehensive report analyzes the School Feeding Program performance from ${moment(qualitative.dateRange?.start).format("MMMM YYYY")} to ${moment(qualitative.dateRange?.end).format("MMMM YYYY")}.`,
      keyFindings: [],
      criticalIssues: [],
      positiveHighlights: [],
      dataQuality: {
        totalResponses: qualitative.summary.totalResponses,
        responsesByRole: qualitative.summary.responsesByRole,
        dataCompleteness: this.assessDataCompleteness(qualitative, quantitative),
      },
    }

    // Add key findings based on real data
    if (quantitative.metrics.mealEfficiency < 80) {
      summary.criticalIssues.push(
        `Meal efficiency is below target at ${quantitative.metrics.mealEfficiency.toFixed(1)}%`,
      )
    }

    if (quantitative.metrics.sentimentScore > 0.3) {
      summary.positiveHighlights.push(
        `Overall stakeholder sentiment is positive (${quantitative.metrics.sentimentScore.toFixed(2)})`,
      )
    } else if (quantitative.metrics.sentimentScore < -0.3) {
      summary.criticalIssues.push(
        `Overall stakeholder sentiment is negative (${quantitative.metrics.sentimentScore.toFixed(2)})`,
      )
    }

    if (quantitative.metrics.stockAlerts > 10) {
      summary.criticalIssues.push(`${quantitative.metrics.stockAlerts} stock alerts require immediate attention`)
    }

    // Add findings from thematic analysis
    Object.keys(qualitative.thematicAnalysis).forEach((theme) => {
      const themeData = qualitative.thematicAnalysis[theme]
      if (themeData.count > 0) {
        if (themeData.avgSentiment > 0.3) {
          summary.positiveHighlights.push(`${theme} receives positive feedback (${themeData.count} mentions)`)
        } else if (themeData.avgSentiment < -0.3) {
          summary.criticalIssues.push(`${theme} shows concerning feedback (${themeData.count} mentions)`)
        }
      }
    })

    return summary
  }

  // Generate recommendations based on real data analysis
  generateRecommendations(qualitative, quantitative) {
    const recommendations = []

    // Based on meal efficiency
    if (quantitative.metrics.mealEfficiency < 80) {
      recommendations.push({
        priority: "High",
        category: "Operations",
        recommendation: "Improve meal planning and preparation processes to increase efficiency",
        expectedImpact: "Reduce food waste and ensure adequate meal provision",
        dataSource: `Current efficiency: ${quantitative.metrics.mealEfficiency.toFixed(1)}%`,
      })
    }

    // Based on sentiment analysis
    if (quantitative.metrics.sentimentScore < 0) {
      recommendations.push({
        priority: "High",
        category: "Stakeholder Satisfaction",
        recommendation: "Address key concerns identified in stakeholder feedback",
        expectedImpact: "Improve overall program satisfaction and participation",
        dataSource: `Average sentiment: ${quantitative.metrics.sentimentScore.toFixed(2)}`,
      })
    }

    // Based on stock alerts
    if (quantitative.metrics.stockAlerts > 5) {
      recommendations.push({
        priority: "Medium",
        category: "Supply Chain",
        recommendation: "Implement better inventory management and early warning systems",
        expectedImpact: "Prevent stockouts and reduce food spoilage",
        dataSource: `Current alerts: ${quantitative.metrics.stockAlerts}`,
      })
    }

    // Based on thematic analysis
    const themes = qualitative.thematicAnalysis
    Object.keys(themes).forEach((theme) => {
      if (themes[theme].avgSentiment < -0.2 && themes[theme].count > 2) {
        recommendations.push({
          priority: "Medium",
          category: "Program Quality",
          recommendation: `Address concerns related to ${theme} based on stakeholder feedback`,
          expectedImpact: `Improve ${theme} satisfaction and program effectiveness`,
          dataSource: `${themes[theme].count} mentions with average sentiment: ${themes[theme].avgSentiment.toFixed(2)}`,
        })
      }
    })

    // Based on response rates
    if (qualitative.summary.totalResponses < 50) {
      recommendations.push({
        priority: "Low",
        category: "Data Collection",
        recommendation: "Increase stakeholder engagement in survey participation",
        expectedImpact: "Better data quality for informed decision making",
        dataSource: `Current responses: ${qualitative.summary.totalResponses}`,
      })
    }

    return recommendations
  }

  // Assess data completeness for report quality
  assessDataCompleteness(qualitative, quantitative) {
    const completeness = {
      surveyData: qualitative.summary.totalResponses > 0 ? "Available" : "Limited",
      mealData: quantitative.meals && quantitative.meals.length > 0 ? "Available" : "Limited",
      enrollmentData: quantitative.enrollment && quantitative.enrollment.length > 0 ? "Available" : "Limited",
      stockData: quantitative.stocks && quantitative.stocks.length > 0 ? "Available" : "Limited",
      overallQuality: "Good",
    }

    const availableDataSources = Object.values(completeness).filter((status) => status === "Available").length
    if (availableDataSources < 2) {
      completeness.overallQuality = "Limited"
    } else if (availableDataSources < 3) {
      completeness.overallQuality = "Fair"
    }

    return completeness
  }

  // Helper function to categorize sentiment
  categorizeSentiment(score) {
    if (score > 0.3) return "Positive"
    if (score < -0.3) return "Negative"
    return "Neutral"
  }

  // Save report to database
  async saveReport(report, userId) {
    try {
      const [result] = await db.execute(
        "INSERT INTO reports (report_type, title, content, generated_by, date_range_start, date_range_end) VALUES (?, ?, ?, ?, ?, ?)",
        [
          report.type,
          report.title,
          JSON.stringify(report),
          userId,
          report.dateRange?.start || null,
          report.dateRange?.end || null,
        ],
      )

      return result.insertId
    } catch (error) {
      console.error("Error saving report:", error)
      throw error
    }
  }

  // Get saved reports
  async getSavedReports(filters = {}) {
    try {
      let query = `
        SELECT 
          r.id,
          r.report_type,
          r.title,
          r.date_range_start,
          r.date_range_end,
          r.created_at,
          u.full_name as generated_by_name
        FROM reports r
        JOIN users u ON r.generated_by = u.id
      `

      const params = []
      const conditions = []

      if (filters.type) {
        conditions.push("r.report_type = ?")
        params.push(filters.type)
      }

      if (filters.startDate) {
        conditions.push("r.created_at >= ?")
        params.push(filters.startDate)
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`
      }

      query += ` ORDER BY r.created_at DESC LIMIT 50`

      const [results] = await db.execute(query, params)
      return results
    } catch (error) {
      console.error("Error fetching saved reports:", error)
      throw error
    }
  };
};

module.exports = { ReportGenerator }
