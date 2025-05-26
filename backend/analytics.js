const { db } = require("./db")
const moment = require("moment")
const natural = require("natural")

// Enhanced sentiment analysis using Natural library
class SentimentAnalyzer {
  constructor() {
    this.analyzer = new natural.SentimentAnalyzer("English", natural.PorterStemmer, "afinn")
    this.tokenizer = new natural.WordTokenizer()
  }

  analyzeSentiment(text) {
    if (!text || typeof text !== "string") return 0

    const tokens = this.tokenizer.tokenize(text.toLowerCase())
    const score = this.analyzer.getSentiment(tokens)

    // Normalize score to -1 to 1 range
    return Math.max(-1, Math.min(1, score))
  }

  categorizeResponse(answer) {
    const positiveKeywords = [
      "excellent",
      "very satisfied",
      "always",
      "increased",
      "improved",
      "good",
      "satisfied",
      "yes",
      "regularly",
      "sufficient",
      "adequate",
    ]

    const negativeKeywords = [
      "poor",
      "never",
      "decreased",
      "dissatisfied",
      "no",
      "insufficient",
      "inadequate",
      "rarely",
      "bad",
      "unsatisfied",
      "complaints",
    ]

    const lowerAnswer = answer.toLowerCase()

    const positiveScore = positiveKeywords.reduce((score, keyword) => {
      return lowerAnswer.includes(keyword) ? score + 1 : score
    }, 0)

    const negativeScore = negativeKeywords.reduce((score, keyword) => {
      return lowerAnswer.includes(keyword) ? score + 1 : score
    }, 0)

    if (positiveScore > negativeScore) return 1
    if (negativeScore > positiveScore) return -1
    return 0
  }
}

// Analytics service class
class AnalyticsService {
  constructor() {
    this.sentimentAnalyzer = new SentimentAnalyzer()
  }

  // Get enrollment analytics
  async getEnrollmentAnalytics(dateRange = null) {
    try {
      let query = `
        SELECT 
          school_name,
          district,
          SUM(total_enrolled) as total_students,
          SUM(male_students) as male_students,
          SUM(female_students) as female_students,
          academic_year
        FROM enrollment_data
      `

      const params = []

      if (dateRange && dateRange.start && dateRange.end) {
        query += ` WHERE created_at BETWEEN ? AND ?`
        params.push(dateRange.start, dateRange.end)
      }

      query += ` GROUP BY school_name, district, academic_year ORDER BY school_name`

      const [results] = await db.execute(query, params)
      return results
    } catch (error) {
      console.error("Error fetching enrollment analytics:", error)
      throw error
    }
  }

  // Get meal analytics
  async getMealAnalytics(dateRange = null) {
    try {
      let query = `
        SELECT 
          school_name,
          district,
          meal_type,
          SUM(meals_planned) as total_planned,
          SUM(meals_served) as total_served,
          SUM(students_present) as total_attendance,
          AVG(meals_served / NULLIF(meals_planned, 0) * 100) as efficiency_rate,
          DATE(date_served) as date_served
        FROM meal_data
      `

      const params = []

      if (dateRange && dateRange.start && dateRange.end) {
        query += ` WHERE date_served BETWEEN ? AND ?`
        params.push(dateRange.start, dateRange.end)
      }

      query += ` GROUP BY school_name, district, meal_type, DATE(date_served) ORDER BY date_served DESC`

      const [results] = await db.execute(query, params)
      return results
    } catch (error) {
      console.error("Error fetching meal analytics:", error)
      throw error
    }
  }

  // Get stock analytics
  async getStockAnalytics() {
    try {
      const [results] = await db.execute(`
        SELECT 
          school_name,
          district,
          item_type,
          COUNT(*) as item_count,
          SUM(quantity_available) as total_quantity,
          COUNT(CASE WHEN expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as expiring_soon,
          COUNT(CASE WHEN quantity_available <= 10 THEN 1 END) as low_stock_items
        FROM stock_data
        GROUP BY school_name, district, item_type
        ORDER BY school_name, item_type
      `)

      return results
    } catch (error) {
      console.error("Error fetching stock analytics:", error)
      throw error
    }
  }

  // Get survey response trends with enhanced sentiment analysis - FIXED
  async getSurveyTrends(role = null, dateRange = null) {
    try {
      let query = `
        SELECT 
          sr.role,
          sr.responses,
          sr.sentiment_score,
          sr.created_at,
          u.school_name,
          u.district,
          u.full_name as userName
        FROM survey_responses sr
        JOIN users u ON sr.user_id = u.id
      `

      const params = []
      const conditions = []

      if (role) {
        conditions.push("sr.role = ?")
        params.push(role)
      }

      if (dateRange && dateRange.start && dateRange.end) {
        conditions.push("sr.created_at BETWEEN ? AND ?")
        params.push(dateRange.start, dateRange.end)
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`
      }

      query += ` ORDER BY sr.created_at DESC`

      const [results] = await db.execute(query, params)

      // Process results for trend analysis
      const trendData = this.processTrendData(results)

      return {
        ...trendData,
        responses: results, // Include raw responses for admin dashboard
      }
    } catch (error) {
      console.error("Error fetching survey trends:", error)
      throw error
    }
  }

  // Process trend data for visualization
  processTrendData(responses) {
    const dailyTrends = {}
    const sentimentTrends = {}
    const roleTrends = {}

    responses.forEach((response) => {
      const date = moment(response.created_at).format("YYYY-MM-DD")
      const role = response.role

      // Daily response count
      if (!dailyTrends[date]) {
        dailyTrends[date] = { date, count: 0, avgSentiment: 0, sentimentSum: 0 }
      }
      dailyTrends[date].count++
      dailyTrends[date].sentimentSum += response.sentiment_score || 0
      dailyTrends[date].avgSentiment = dailyTrends[date].sentimentSum / dailyTrends[date].count

      // Role-based trends
      if (!roleTrends[role]) {
        roleTrends[role] = { role, count: 0, avgSentiment: 0, sentimentSum: 0 }
      }
      roleTrends[role].count++
      roleTrends[role].sentimentSum += response.sentiment_score || 0
      roleTrends[role].avgSentiment = roleTrends[role].sentimentSum / roleTrends[role].count

      // Sentiment distribution
      const sentimentCategory = this.categorizeSentiment(response.sentiment_score || 0)
      if (!sentimentTrends[sentimentCategory]) {
        sentimentTrends[sentimentCategory] = 0
      }
      sentimentTrends[sentimentCategory]++
    })

    return {
      dailyTrends: Object.values(dailyTrends).sort((a, b) => new Date(a.date) - new Date(b.date)),
      roleTrends: Object.values(roleTrends),
      sentimentDistribution: sentimentTrends,
      totalResponses: responses.length,
    }
  }

  categorizeSentiment(score) {
    if (score > 0.3) return "positive"
    if (score < -0.3) return "negative"
    return "neutral"
  }

  // Update sentiment scores for existing responses
  async updateSentimentScores() {
    try {
      const [responses] = await db.execute("SELECT id, responses FROM survey_responses WHERE sentiment_score = 0")

      for (const response of responses) {
        const parsedResponses = JSON.parse(response.responses)
        let totalSentiment = 0
        let count = 0

        Object.values(parsedResponses).forEach((data) => {
          if (data && data.answer) {
            const sentiment = this.sentimentAnalyzer.analyzeSentiment(data.answer)
            totalSentiment += sentiment
            count++
          }
        })

        const avgSentiment = count > 0 ? totalSentiment / count : 0

        await db.execute("UPDATE survey_responses SET sentiment_score = ? WHERE id = ?", [avgSentiment, response.id])
      }

      console.log(`Updated sentiment scores for ${responses.length} responses`)
    } catch (error) {
      console.error("Error updating sentiment scores:", error)
    }
  }

  // Generate comprehensive analytics report
  async generateAnalyticsReport(dateRange = null) {
    try {
      const [enrollment, meals, stocks, trends] = await Promise.all([
        this.getEnrollmentAnalytics(dateRange),
        this.getMealAnalytics(dateRange),
        this.getStockAnalytics(),
        this.getSurveyTrends(null, dateRange),
      ])

      return {
        enrollment,
        meals,
        stocks,
        trends,
        generatedAt: new Date().toISOString(),
        dateRange,
      }
    } catch (error) {
      console.error("Error generating analytics report:", error)
      throw error
    }
  }
}

module.exports = { AnalyticsService, SentimentAnalyzer }
