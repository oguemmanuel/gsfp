const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")
const bodyParser = require("body-parser")
const session = require("express-session")
const MySQLStore = require("express-mysql-session")(session)
const { Server } = require("socket.io")
const http = require("http")
const cron = require("node-cron")
const PDFDocument = require("pdfkit") // Replace Puppeteer with PDFKit
const fs = require("fs")
const path = require("path")

const { db, Connection, initializeTables } = require("./db")
const { router: authRoutes, requireAuth, requireAdmin, requireAdminSurveyAccess } = require("./auth")
const { AnalyticsService } = require("./analytics")
const { ReportGenerator } = require("./reports")
const bcrypt = require("bcrypt")

dotenv.config()

const app = express()
const server = http.createServer(app)

// Initialize services
const analyticsService = new AnalyticsService()
const reportGenerator = new ReportGenerator()

// Socket.IO setup for real-time updates with proper CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Database options for session store
const sessionStoreOptions = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000,
  createDatabaseTable: true,
}

const sessionStore = new MySQLStore(sessionStoreOptions)

// Middleware setup
app.use(express.json())
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(
  session({
    key: "gsfp_session",
    secret: process.env.SESSION_SECRET || "your-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 86400000,
    },
  }),
)

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id)

  socket.on("join-admin-room", () => {
    socket.join("admin-updates")
  })

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id)
  })
})

// Function to broadcast real-time updates
const broadcastUpdate = (event, data) => {
  io.to("admin-updates").emit(event, data)
}

// Survey questions migration
const surveyQuestions = {
  teacher: [
    {
      question: "How has the School Feeding Program impacted students' attendance?",
      options: ["Significantly increased", "Moderately increased", "No change", "Decreased"],
    },
    {
      question: "Have you noticed an improvement in students' concentration and academic performance?",
      options: ["Yes, significant improvement", "Some improvement", "No improvement", "Performance declined"],
    },
    {
      question: "How would you rate the quality of meals provided?",
      options: ["Excellent", "Good", "Fair", "Poor"],
    },
    {
      question: "Are students more engaged in learning after meal times?",
      options: ["Yes, significantly", "Somewhat", "No change", "Less engaged"],
    },
    {
      question: "How often do you incorporate nutrition education in your lessons?",
      options: ["Daily", "Weekly", "Monthly", "Rarely", "Never"],
    },
  ],
  student: [
    {
      question: "How do you rate the taste of the school meals?",
      options: ["Very good", "Good", "Okay", "Not good"],
    },
    {
      question: "Do you feel more energetic after eating school meals?",
      options: ["Yes, always", "Sometimes", "Rarely", "No"],
    },
    {
      question: "How often do you eat the school meals?",
      options: ["Every day", "Most days", "Sometimes", "Rarely"],
    },
    {
      question: "Do you learn better after eating school meals?",
      options: ["Yes, much better", "A little better", "No difference", "Worse"],
    },
    {
      question: "Would you recommend school meals to other students?",
      options: ["Definitely yes", "Probably yes", "Maybe", "No"],
    },
  ],
  caterer: [
    {
      question: "How would you rate the quality of ingredients supplied?",
      options: ["Excellent", "Good", "Fair", "Poor"],
    },
    {
      question: "Are you able to prepare meals according to the planned menu?",
      options: ["Always", "Most times", "Sometimes", "Rarely"],
    },
    {
      question: "How adequate are the cooking facilities?",
      options: ["Very adequate", "Adequate", "Somewhat adequate", "Inadequate"],
    },
    {
      question: "Do you receive ingredients on time for meal preparation?",
      options: ["Always on time", "Usually on time", "Sometimes late", "Often late"],
    },
    {
      question: "How would you rate student satisfaction with the meals?",
      options: ["Very satisfied", "Satisfied", "Neutral", "Dissatisfied"],
    },
  ],
  supplier: [
    {
      question: "How would you rate the ordering process from schools?",
      options: ["Very efficient", "Efficient", "Somewhat efficient", "Inefficient"],
    },
    {
      question: "Are payments from schools made on time?",
      options: ["Always on time", "Usually on time", "Sometimes delayed", "Often delayed"],
    },
    {
      question: "How adequate is the advance notice for large orders?",
      options: ["Very adequate", "Adequate", "Somewhat adequate", "Inadequate"],
    },
    {
      question: "Do you face challenges in maintaining food quality during delivery?",
      options: ["Never", "Rarely", "Sometimes", "Often"],
    },
    {
      question: "How would you rate your overall relationship with the schools?",
      options: ["Excellent", "Good", "Fair", "Poor"],
    },
  ],
  headmaster: [
    {
      question: "How has the feeding program impacted overall school attendance?",
      options: ["Significantly increased", "Moderately increased", "No change", "Decreased"],
    },
    {
      question: "Have you observed improvements in students' academic performance?",
      options: ["Significant improvement", "Some improvement", "No change", "Decline"],
    },
    {
      question: "How would you rate parent satisfaction with the feeding program?",
      options: ["Very satisfied", "Satisfied", "Neutral", "Dissatisfied"],
    },
    {
      question: "Are the program resources (funding, supplies) adequate?",
      options: ["Very adequate", "Adequate", "Somewhat adequate", "Inadequate"],
    },
    {
      question: "How effective is the coordination between stakeholders?",
      options: ["Very effective", "Effective", "Somewhat effective", "Ineffective"],
    },
  ],
}

const migrateHardcodedQuestions = async () => {
  try {
    const [existingQuestions] = await db.execute("SELECT COUNT(*) as count FROM survey_questions")

    if (existingQuestions[0].count > 0) {
      console.log("Questions already exist in database, skipping migration")
      return
    }

    console.log("Migrating hardcoded questions to database...")

    for (const [role, questions] of Object.entries(surveyQuestions)) {
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        await db.execute(
          "INSERT INTO survey_questions (role, question_text, options, question_order) VALUES (?, ?, ?, ?)",
          [role, question.question, JSON.stringify(question.options), i + 1],
        )
      }
    }

    console.log("Migration completed successfully")
  } catch (error) {
    console.error("Error migrating questions:", error)
  }
}

// Use authentication routes
app.use("/api/auth", authRoutes)

// Role-specific survey questions endpoint (for non-admin users)
app.get("/api/survey-questions/:role", requireAuth, async (req, res) => {
  try {
    const { role } = req.params
    const userRole = req.session.user.role

    // Users can only access questions for their own role
    if (userRole !== role && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied: You can only access questions for your role",
      })
    }

    const validRoles = ["teacher", "student", "caterer", "supplier", "headmaster"]
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      })
    }

    const [questions] = await db.execute(
      "SELECT * FROM survey_questions WHERE role = ? AND is_active = TRUE ORDER BY question_order ASC",
      [role],
    )

    const formattedQuestions = questions.map((q, index) => ({
      ...q,
      id: q.id,
      displayOrder: index + 1,
      options: JSON.parse(q.options),
    }))

    return res.json({
      success: true,
      data: formattedQuestions,
    })
  } catch (error) {
    console.error("Error fetching survey questions:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch survey questions",
      error: error.message,
    })
  }
})

// Get user-specific dashboard data
app.get("/api/dashboard/:role", requireAuth, async (req, res) => {
  try {
    const { role } = req.params
    const userRole = req.session.user.role
    const userId = req.session.user.id

    // Users can only access their own role dashboard
    if (userRole !== role && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied: You can only access your own dashboard",
      })
    }

    // Get user's school and district for filtering data
    const userSchool = req.session.user.schoolName
    const userDistrict = req.session.user.district

    const dashboardData = {
      user: req.session.user,
      stats: {},
      recentActivity: [],
      alerts: [],
    }

    // Role-specific data fetching
    switch (role) {
      case "teacher":
        dashboardData.stats = await getTeacherStats(userSchool, userDistrict)
        dashboardData.recentActivity = await getTeacherActivity(userId)
        break
      case "student":
        dashboardData.stats = await getStudentStats(userSchool, userDistrict, userId)
        dashboardData.recentActivity = await getStudentActivity(userId)
        break
      case "caterer":
        dashboardData.stats = await getCatererStats(userSchool, userDistrict)
        dashboardData.recentActivity = await getCatererActivity(userId)
        dashboardData.alerts = await getCatererAlerts(userSchool, userDistrict)
        break
      case "supplier":
        dashboardData.stats = await getSupplierStats(userDistrict, userId)
        dashboardData.recentActivity = await getSupplierActivity(userId)
        break
      case "headmaster":
        dashboardData.stats = await getHeadmasterStats(userSchool, userDistrict)
        dashboardData.recentActivity = await getHeadmasterActivity(userId)
        break
    }

    return res.json({
      success: true,
      data: dashboardData,
    })
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: error.message,
    })
  }
})

// Helper functions for role-specific data (REAL DATA ONLY)
async function getTeacherStats(schoolName, district) {
  try {
    // Get today's meal data for the school
    const [mealData] = await db.execute(
      "SELECT SUM(meals_planned) as planned, SUM(meals_served) as served, SUM(students_present) as present FROM meal_data WHERE school_name = ? AND date_served = CURDATE()",
      [schoolName],
    )

    // Get enrollment data
    const [enrollmentData] = await db.execute(
      "SELECT SUM(total_enrolled) as total FROM enrollment_data WHERE school_name = ? ORDER BY created_at DESC LIMIT 1",
      [schoolName],
    )

    // Get survey response count for teachers from this school
    const [responseCount] = await db.execute(
      "SELECT COUNT(*) as count FROM survey_responses sr JOIN users u ON sr.user_id = u.id WHERE sr.role = 'teacher' AND u.school_name = ?",
      [schoolName],
    )

    const enrollment = enrollmentData[0]?.total || 0
    const todayMeal = mealData[0] || { planned: 0, served: 0, present: 0 }

    return {
      studentsEnrolled: enrollment,
      studentsPresent: todayMeal.present || 0,
      mealsServed: todayMeal.served || 0,
      attendanceRate: enrollment > 0 ? Math.round((todayMeal.present / enrollment) * 100) : 0,
      surveyResponses: responseCount[0].count,
    }
  } catch (error) {
    console.error("Error fetching teacher stats:", error)
    return {
      studentsEnrolled: 0,
      studentsPresent: 0,
      mealsServed: 0,
      attendanceRate: 0,
      surveyResponses: 0,
    }
  }
}

async function getStudentStats(schoolName, district, userId) {
  try {
    // Get this week's meal data for the school
    const [weeklyMeals] = await db.execute(
      "SELECT COUNT(*) as meals_this_week FROM meal_data WHERE school_name = ? AND date_served >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
      [schoolName],
    )

    // Get user's survey responses to calculate engagement
    const [userResponses] = await db.execute(
      "SELECT COUNT(*) as response_count, AVG(sentiment_score) as avg_sentiment FROM survey_responses WHERE user_id = ?",
      [userId],
    )

    const mealsThisWeek = weeklyMeals[0]?.meals_this_week || 0
    const responseData = userResponses[0] || { response_count: 0, avg_sentiment: 0 }

    // Calculate nutrition score based on meal participation
    const nutritionScore = Math.min(100, mealsThisWeek * 20)

    return {
      mealsThisWeek: mealsThisWeek,
      nutritionScore: nutritionScore,
      surveyResponses: responseData.response_count,
      engagementLevel: Math.round((responseData.avg_sentiment + 1) * 50), // Convert -1 to 1 scale to 0-100
    }
  } catch (error) {
    console.error("Error fetching student stats:", error)
    return {
      mealsThisWeek: 0,
      nutritionScore: 0,
      surveyResponses: 0,
      engagementLevel: 0,
    }
  }
}

async function getCatererStats(schoolName, district) {
  try {
    // Get today's meal data
    const [todayMeals] = await db.execute(
      "SELECT SUM(meals_planned) as planned, SUM(meals_served) as served FROM meal_data WHERE school_name = ? AND date_served = CURDATE()",
      [schoolName],
    )

    // Get this week's meal data
    const [weeklyMeals] = await db.execute(
      "SELECT SUM(meals_planned) as planned, SUM(meals_served) as served FROM meal_data WHERE school_name = ? AND date_served >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
      [schoolName],
    )

    // Get stock alerts
    const [stockAlerts] = await db.execute(
      "SELECT COUNT(*) as alerts FROM stock_data WHERE school_name = ? AND (quantity_available <= 10 OR expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY))",
      [schoolName],
    )

    const todayMeal = todayMeals[0] || { planned: 0, served: 0 }
    const weeklyMeal = weeklyMeals[0] || { planned: 0, served: 0 }

    return {
      mealsPlannedToday: todayMeal.planned || 0,
      mealsServedToday: todayMeal.served || 0,
      weeklyEfficiency: weeklyMeal.planned > 0 ? Math.round((weeklyMeal.served / weeklyMeal.planned) * 100) : 0,
      stockAlerts: stockAlerts[0].alerts,
    }
  } catch (error) {
    console.error("Error fetching caterer stats:", error)
    return {
      mealsPlannedToday: 0,
      mealsServedToday: 0,
      weeklyEfficiency: 0,
      stockAlerts: 0,
    }
  }
}

async function getSupplierStats(district, userId) {
  try {
    // Get schools in district
    const [schoolCount] = await db.execute(
      "SELECT COUNT(DISTINCT school_name) as count FROM enrollment_data WHERE district = ?",
      [district],
    )

    // Get recent deliveries (based on stock updates)
    const [recentDeliveries] = await db.execute(
      "SELECT COUNT(*) as deliveries FROM stock_data WHERE district = ? AND last_updated >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
      [district],
    )

    // Get supplier's response rate
    const [supplierResponses] = await db.execute(
      "SELECT COUNT(*) as responses FROM survey_responses WHERE user_id = ?",
      [userId],
    )

    return {
      activeSchools: schoolCount[0]?.count || 0,
      recentDeliveries: recentDeliveries[0]?.deliveries || 0,
      responseRate: supplierResponses[0]?.responses || 0,
      districtCoverage: district,
    }
  } catch (error) {
    console.error("Error fetching supplier stats:", error)
    return {
      activeSchools: 0,
      recentDeliveries: 0,
      responseRate: 0,
      districtCoverage: district || "Unknown",
    }
  }
}

async function getHeadmasterStats(schoolName, district) {
  try {
    // Get enrollment data
    const [enrollment] = await db.execute(
      "SELECT SUM(total_enrolled) as total FROM enrollment_data WHERE school_name = ? ORDER BY created_at DESC LIMIT 1",
      [schoolName],
    )

    // Get this month's meal data
    const [monthlyMeals] = await db.execute(
      "SELECT AVG(students_present) as avg_attendance, SUM(meals_served) as total_meals FROM meal_data WHERE school_name = ? AND date_served >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)",
      [schoolName],
    )

    // Get program efficiency
    const [efficiency] = await db.execute(
      "SELECT AVG(meals_served / NULLIF(meals_planned, 0) * 100) as efficiency FROM meal_data WHERE school_name = ? AND date_served >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)",
      [schoolName],
    )

    // Get stakeholder feedback count
    const [feedbackCount] = await db.execute(
      "SELECT COUNT(*) as feedback FROM survey_responses sr JOIN users u ON sr.user_id = u.id WHERE u.school_name = ?",
      [schoolName],
    )

    const enrollmentData = enrollment[0] || { total: 0 }
    const mealData = monthlyMeals[0] || { avg_attendance: 0, total_meals: 0 }

    return {
      totalStudents: enrollmentData.total || 0,
      averageAttendance: Math.round(mealData.avg_attendance || 0),
      totalMealsThisMonth: mealData.total_meals || 0,
      programEfficiency: Math.round(efficiency[0]?.efficiency || 0),
      stakeholderFeedback: feedbackCount[0]?.feedback || 0,
    }
  } catch (error) {
    console.error("Error fetching headmaster stats:", error)
    return {
      totalStudents: 0,
      averageAttendance: 0,
      totalMealsThisMonth: 0,
      programEfficiency: 0,
      stakeholderFeedback: 0,
    }
  }
}

// Activity helper functions (REAL DATA ONLY)
async function getTeacherActivity(userId) {
  try {
    const [activities] = await db.execute(
      `SELECT 'Submitted survey response' as action, created_at as time FROM survey_responses WHERE user_id = ?
       UNION ALL
       SELECT 'Updated meal data' as action, created_at as time FROM meal_data WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY time DESC LIMIT 5`,
      [userId],
    )

    return activities.map((activity) => ({
      action: activity.action,
      time: new Date(activity.time).toLocaleString(),
    }))
  } catch (error) {
    console.error("Error fetching teacher activity:", error)
    return []
  }
}

async function getStudentActivity(userId) {
  try {
    const [activities] = await db.execute(
      "SELECT 'Completed survey' as action, created_at as time FROM survey_responses WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
      [userId],
    )

    return activities.map((activity) => ({
      action: activity.action,
      time: new Date(activity.time).toLocaleString(),
    }))
  } catch (error) {
    console.error("Error fetching student activity:", error)
    return []
  }
}

async function getCatererActivity(userId) {
  try {
    const [activities] = await db.execute(
      `SELECT 'Updated stock levels' as action, last_updated as time FROM stock_data WHERE last_updated >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       UNION ALL
       SELECT 'Submitted survey' as action, created_at as time FROM survey_responses WHERE user_id = ?
       ORDER BY time DESC LIMIT 5`,
      [userId],
    )

    return activities.map((activity) => ({
      action: activity.action,
      time: new Date(activity.time).toLocaleString(),
    }))
  } catch (error) {
    console.error("Error fetching caterer activity:", error)
    return []
  }
}

async function getSupplierActivity(userId) {
  try {
    const [activities] = await db.execute(
      `SELECT 'Updated inventory' as action, last_updated as time FROM stock_data WHERE last_updated >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       UNION ALL
       SELECT 'Submitted survey' as action, created_at as time FROM survey_responses WHERE user_id = ?
       ORDER BY time DESC LIMIT 5`,
      [userId],
    )

    return activities.map((activity) => ({
      action: activity.action,
      time: new Date(activity.time).toLocaleString(),
    }))
  } catch (error) {
    console.error("Error fetching supplier activity:", error)
    return []
  }
}

async function getHeadmasterActivity(userId) {
  try {
    const [activities] = await db.execute(
      `SELECT 'Reviewed program data' as action, created_at as time FROM meal_data WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       UNION ALL
       SELECT 'Submitted survey' as action, created_at as time FROM survey_responses WHERE user_id = ?
       ORDER BY time DESC LIMIT 5`,
      [userId],
    )

    return activities.map((activity) => ({
      action: activity.action,
      time: new Date(activity.time).toLocaleString(),
    }))
  } catch (error) {
    console.error("Error fetching headmaster activity:", error)
    return []
  }
}

async function getCatererAlerts(schoolName, district) {
  try {
    const [alerts] = await db.execute(
      "SELECT item_name, quantity_available, expiry_date FROM stock_data WHERE school_name = ? AND (quantity_available <= 10 OR expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)) LIMIT 5",
      [schoolName],
    )

    return alerts.map((alert) => ({
      type: alert.quantity_available <= 10 ? "low_stock" : "expiring",
      message:
        alert.quantity_available <= 10
          ? `Low stock: ${alert.item_name} (${alert.quantity_available} remaining)`
          : `Expiring soon: ${alert.item_name} (expires ${alert.expiry_date})`,
      priority: alert.quantity_available <= 5 ? "high" : "medium",
    }))
  } catch (error) {
    console.error("Error fetching caterer alerts:", error)
    return []
  }
}

// Enhanced survey submission with real-time updates
app.post("/api/submit-survey/:role", requireAuth, async (req, res) => {
  try {
    const { role } = req.params
    const responses = req.body
    const userId = req.session.user.id

    if (req.session.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Access denied: ${role} role required`,
      })
    }

    if (!responses || Object.keys(responses).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Survey responses are required",
      })
    }

    // Get questions for this role
    const [questions] = await db.execute("SELECT * FROM survey_questions WHERE role = ? ORDER BY question_order ASC", [
      role,
    ])

    // Format responses with question text
    const formattedResponses = {}
    let totalSentiment = 0
    let sentimentCount = 0

    Object.keys(responses).forEach((questionId) => {
      const question = questions.find((q) => q.id.toString() === questionId)
      if (question) {
        const answer = responses[questionId]

        // Calculate sentiment for this response
        const sentiment = analyticsService.sentimentAnalyzer.analyzeSentiment(answer)
        totalSentiment += sentiment
        sentimentCount++

        formattedResponses[questionId] = {
          question: question.question_text,
          answer: answer,
          sentiment: sentiment,
        }
      }
    })

    const avgSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0

    // Save responses with sentiment score
    const [result] = await db.execute(
      "INSERT INTO survey_responses (user_id, role, responses, sentiment_score) VALUES (?, ?, ?, ?)",
      [userId, role, JSON.stringify(formattedResponses), avgSentiment],
    )

    if (result.affectedRows === 1) {
      console.log(`Survey responses from ${role} (ID: ${userId}) saved successfully`)

      // Broadcast real-time update to admin dashboard
      broadcastUpdate("new-survey-response", {
        role,
        userId,
        userName: req.session.user.fullName,
        sentimentScore: avgSentiment,
        timestamp: new Date().toISOString(),
      })

      return res.json({
        success: true,
        message: "Survey responses submitted successfully",
        data: {
          responseId: result.insertId,
          sentimentScore: avgSentiment,
        },
      })
    } else {
      throw new Error("Failed to save survey responses")
    }
  } catch (error) {
    console.error("Error saving survey responses:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to save survey responses",
      error: error.message,
    })
  }
})

// Enhanced analytics endpoints
app.get("/api/admin/analytics/dashboard", requireAuth, requireAdmin, async (req, res) => {
  try {
    const dateRange = {
      start: req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      end: req.query.endDate || new Date().toISOString().split("T")[0],
    }

    const analyticsData = await analyticsService.generateAnalyticsReport(dateRange)

    return res.json({
      success: true,
      data: analyticsData,
    })
  } catch (error) {
    console.error("Error fetching analytics dashboard:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics data",
      error: error.message,
    })
  }
})

// Real-time trends endpoint
app.get("/api/admin/analytics/trends/:role", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.params
    const dateRange =
      req.query.startDate && req.query.endDate
        ? {
            start: req.query.startDate,
            end: req.query.endDate,
          }
        : null

    const trends = await analyticsService.getSurveyTrends(role, dateRange)

    return res.json({
      success: true,
      data: trends,
    })
  } catch (error) {
    console.error("Error fetching trends:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trends data",
      error: error.message,
    })
  }
})

// Admin-only survey questions endpoint
app.get("/api/admin/survey-questions/:role", requireAuth, requireAdminSurveyAccess, async (req, res) => {
  try {
    const { role } = req.params

    const validRoles = ["teacher", "student", "caterer", "supplier", "headmaster"]
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      })
    }

    const [questions] = await db.execute("SELECT * FROM survey_questions WHERE role = ? ORDER BY question_order ASC", [
      role,
    ])

    const formattedQuestions = questions.map((q, index) => ({
      ...q,
      id: q.id,
      displayOrder: index + 1,
      options: JSON.parse(q.options),
    }))

    return res.json({
      success: true,
      data: formattedQuestions,
    })
  } catch (error) {
    console.error("Error fetching survey questions:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch survey questions",
      error: error.message,
    })
  }
})

// Add new survey question (Admin only)
app.post("/api/admin/survey-questions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role, questionText, options } = req.body

    const validRoles = ["teacher", "student", "caterer", "supplier", "headmaster"]
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      })
    }

    if (!questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Question text and at least 2 options are required",
      })
    }

    // Get the next question order
    const [maxOrder] = await db.execute(
      "SELECT COALESCE(MAX(question_order), 0) + 1 as next_order FROM survey_questions WHERE role = ?",
      [role],
    )

    const [result] = await db.execute(
      "INSERT INTO survey_questions (role, question_text, options, question_order) VALUES (?, ?, ?, ?)",
      [role, questionText, JSON.stringify(options), maxOrder[0].next_order],
    )

    if (result.affectedRows === 1) {
      return res.json({
        success: true,
        message: "Question added successfully",
        data: { questionId: result.insertId },
      })
    } else {
      throw new Error("Failed to add question")
    }
  } catch (error) {
    console.error("Error adding survey question:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to add survey question",
      error: error.message,
    })
  }
})

// Update survey question (Admin only)
app.put("/api/admin/survey-questions/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { questionText, options } = req.body

    if (!questionText || !options || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Question text and at least 2 options are required",
      })
    }

    const [result] = await db.execute(
      "UPDATE survey_questions SET question_text = ?, options = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [questionText, JSON.stringify(options), id],
    )

    if (result.affectedRows === 1) {
      return res.json({
        success: true,
        message: "Question updated successfully",
      })
    } else {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      })
    }
  } catch (error) {
    console.error("Error updating survey question:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to update survey question",
      error: error.message,
    })
  }
})

// Delete survey question (Admin only)
app.delete("/api/admin/survey-questions/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const [result] = await db.execute("DELETE FROM survey_questions WHERE id = ?", [id])

    if (result.affectedRows === 1) {
      return res.json({
        success: true,
        message: "Question deleted successfully",
      })
    } else {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      })
    }
  } catch (error) {
    console.error("Error deleting survey question:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to delete survey question",
      error: error.message,
    })
  }
})

// PDFKit PDF Generation Function - FIXED AND IMPROVED
async function generatePDFReport(reportData) {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: reportData.title || "School Feeding Program Report",
          Author: "School Feeding Program Analytics",
          Subject: "Survey Analysis Report",
          Creator: "GSFP Analytics System",
        },
      })

      // Create a buffer to store the PDF
      const chunks = []
      doc.on("data", (chunk) => chunks.push(chunk))
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks)
        resolve(pdfBuffer)
      })
      doc.on("error", (error) => reject(error))

      // Helper function to add a new page if needed
      const checkPageSpace = (requiredSpace = 100) => {
        if (doc.y + requiredSpace > doc.page.height - 50) {
          doc.addPage()
        }
      }

      // Header
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .fillColor("#2563eb")
        .text(reportData.title || "Survey Analysis Report", {
          align: "center",
        })

      doc.moveDown(0.5)
      doc
        .fontSize(12)
        .font("Helvetica")
        .fillColor("#666666")
        .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: "center" })

      if (reportData.dateRange) {
        doc.text(`Period: ${reportData.dateRange.start} to ${reportData.dateRange.end}`, { align: "center" })
      }

      // Add a line separator
      doc.moveDown(1)
      doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke()
      doc.moveDown(1)

      // Executive Summary (for combined reports)
      if (reportData.type === "combined") {
        checkPageSpace(150)
        doc.fontSize(16).font("Helvetica-Bold").fillColor("#1f2937").text("Executive Summary")
        doc.moveDown(0.5)

        doc
          .fontSize(11)
          .font("Helvetica")
          .fillColor("#374151")
          .text(
            reportData.executiveSummary?.overview ||
              "Comprehensive analysis of the School Feeding Program performance across all stakeholder groups.",
            { align: "justify" },
          )

        doc.moveDown(1)

        // Key Metrics in a grid layout
        const metrics = [
          {
            label: "Total Survey Responses",
            value: reportData.qualitativeAnalysis?.summary?.totalResponses || 0,
          },
          {
            label: "Total Meals Served",
            value: reportData.quantitativeAnalysis?.metrics?.totalMealsServed || 0,
          },
          {
            label: "Meal Efficiency",
            value: `${reportData.quantitativeAnalysis?.metrics?.mealEfficiency?.toFixed(1) || 0}%`,
          },
          {
            label: "Average Sentiment Score",
            value: reportData.qualitativeAnalysis?.summary?.averageSentiment?.toFixed(2) || 0,
          },
        ]

        // Create a simple metrics table
        const startX = 50
        const startY = doc.y
        const boxWidth = 120
        const boxHeight = 60

        metrics.forEach((metric, index) => {
          const x = startX + (index % 2) * (boxWidth + 20)
          const y = startY + Math.floor(index / 2) * (boxHeight + 10)

          // Draw box border
          doc.rect(x, y, boxWidth, boxHeight).stroke("#e5e7eb")

          // Add metric value
          doc
            .fontSize(18)
            .font("Helvetica-Bold")
            .fillColor("#1f2937")
            .text(metric.value.toString(), x + 10, y + 15, {
              width: boxWidth - 20,
              align: "center",
            })

          // Add metric label
          doc
            .fontSize(9)
            .font("Helvetica")
            .fillColor("#6b7280")
            .text(metric.label, x + 10, y + 40, {
              width: boxWidth - 20,
              align: "center",
            })
        })

        doc.y = startY + 140
        doc.moveDown(1)
      }

      // Survey Responses Analysis
      checkPageSpace(100)
      doc.fontSize(16).font("Helvetica-Bold").fillColor("#1f2937").text("Survey Responses Analysis")
      doc.moveDown(0.5)

      if (reportData.detailedResponses && reportData.detailedResponses.length > 0) {
        // Table headers
        const tableTop = doc.y
        const tableHeaders = ["Respondent", "Role", "School", "Date", "Sentiment"]
        const columnWidths = [100, 80, 120, 80, 80]
        let currentX = 50

        // Draw table headers
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#374151")
        tableHeaders.forEach((header, index) => {
          doc.text(header, currentX, tableTop, { width: columnWidths[index], align: "left" })
          currentX += columnWidths[index]
        })

        doc.moveDown(0.5)
        let currentY = doc.y

        // Draw header line
        doc.strokeColor("#d1d5db").lineWidth(1).moveTo(50, currentY).lineTo(545, currentY).stroke()
        currentY += 5

        // Table rows (limit to first 20 responses to fit on page)
        const responsesToShow = reportData.detailedResponses.slice(0, 20)
        doc.fontSize(9).font("Helvetica").fillColor("#4b5563")

        responsesToShow.forEach((response, index) => {
          checkPageSpace(20)
          currentY = doc.y
          currentX = 50

          const rowData = [
            response.respondent?.name || "Anonymous",
            response.respondent?.role || "Unknown",
            response.respondent?.school || "Unknown",
            response.submittedAt ? new Date(response.submittedAt).toLocaleDateString() : "N/A",
            response.sentimentCategory || "Neutral",
          ]

          rowData.forEach((data, colIndex) => {
            doc.text(data.toString(), currentX, currentY, {
              width: columnWidths[colIndex] - 5,
              align: "left",
              ellipsis: true,
            })
            currentX += columnWidths[colIndex]
          })

          doc.moveDown(0.3)

          // Add subtle row separator
          if (index % 2 === 0) {
            doc
              .rect(50, currentY - 2, 495, 15)
              .fillColor("#f9fafb")
              .fill()
            doc.fillColor("#4b5563") // Reset text color
          }
        })

        if (reportData.detailedResponses.length > 20) {
          doc.moveDown(0.5)
          doc
            .fontSize(9)
            .font("Helvetica-Oblique")
            .fillColor("#6b7280")
            .text(`Showing first 20 of ${reportData.detailedResponses.length} responses`)
        }
      } else {
        doc.fontSize(11).font("Helvetica").fillColor("#6b7280").text("No survey responses available for this period.")
      }

      doc.moveDown(2)

      // Key Themes Analysis
      if (reportData.thematicAnalysis) {
        checkPageSpace(100)
        doc.fontSize(16).font("Helvetica-Bold").fillColor("#1f2937").text("Key Themes Analysis")
        doc.moveDown(0.5)

        Object.entries(reportData.thematicAnalysis).forEach(([theme, data]) => {
          if (data.count > 0) {
            checkPageSpace(80)
            doc
              .fontSize(12)
              .font("Helvetica-Bold")
              .fillColor("#2563eb")
              .text(theme.charAt(0).toUpperCase() + theme.slice(1))

            doc
              .fontSize(10)
              .font("Helvetica")
              .fillColor("#4b5563")
              .text(`Mentions: ${data.count} | Average Sentiment: ${data.avgSentiment?.toFixed(2) || 0}`)

            if (data.examples && data.examples.length > 0) {
              doc.moveDown(0.3)
              doc
                .fontSize(9)
                .font("Helvetica-Oblique")
                .fillColor("#6b7280")
                .text(`Example: "${data.examples[0].answer}" - ${data.examples[0].user} (${data.examples[0].role})`, {
                  indent: 20,
                })
            }
            doc.moveDown(0.8)
          }
        })
      }

      // Recommendations
      if (reportData.recommendations && reportData.recommendations.length > 0) {
        checkPageSpace(100)
        doc.fontSize(16).font("Helvetica-Bold").fillColor("#1f2937").text("Recommendations")
        doc.moveDown(0.5)

        reportData.recommendations.forEach((rec, index) => {
          checkPageSpace(80)
          doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .fillColor("#2563eb")
            .text(`${index + 1}. ${rec.recommendation}`)

          doc
            .fontSize(10)
            .font("Helvetica")
            .fillColor("#4b5563")
            .text(`Priority: ${rec.priority} | Category: ${rec.category}`)

          doc.moveDown(0.2)
          doc.fontSize(10).font("Helvetica").fillColor("#374151").text(`Expected Impact: ${rec.expectedImpact}`)

          doc.moveDown(0.2)
          doc.fontSize(9).font("Helvetica-Oblique").fillColor("#6b7280").text(`Data Source: ${rec.dataSource}`)

          doc.moveDown(1)
        })
      }

      // Footer
      const pageCount = doc.bufferedPageRange().count
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i)
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#9ca3af")
          .text("School Feeding Program Analytics Report - Confidential", 50, doc.page.height - 30, { align: "center" })
        doc.text(`Page ${i + 1} of ${pageCount}`, 50, doc.page.height - 20, { align: "center" })
      }

      // Finalize the PDF
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

// Generate and download PDF report - FIXED with PDFKit
app.get("/api/admin/reports/download/:type", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type } = req.params
    const { startDate, endDate, role } = req.query

    console.log(`Generating ${type} report for role: ${role || "all"}`)

    const dateRange = startDate && endDate ? { start: startDate, end: endDate } : null
    const filters = role ? { role } : {}

    let report
    switch (type) {
      case "qualitative":
        report = await reportGenerator.generateQualitativeReport(dateRange, filters)
        break
      case "quantitative":
        report = await reportGenerator.generateQuantitativeReport(dateRange, filters)
        break
      case "combined":
        report = await reportGenerator.generateCombinedReport(dateRange, filters)
        break
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid report type",
        })
    }

    // Add metadata for PDF generation
    report.title = `${type.charAt(0).toUpperCase() + type.slice(1)} Report - School Feeding Program`
    report.type = type
    report.dateRange = dateRange

    console.log("Report generated, creating PDF...")

    // Generate PDF using PDFKit
    const pdfBuffer = await generatePDFReport(report)

    console.log(`PDF generated successfully, size: ${pdfBuffer.length} bytes`)

    // Save report to database
    try {
      const reportId = await reportGenerator.saveReport(report, req.session.user.id)
      console.log(`Report saved to database with ID: ${reportId}`)
    } catch (saveError) {
      console.error("Error saving report to database:", saveError)
      // Continue with PDF download even if database save fails
    }

    // Set proper headers for PDF download
    const filename = `${type}-report-${role || "all"}-${Date.now()}.pdf`
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.setHeader("Content-Length", pdfBuffer.length)
    res.setHeader("Cache-Control", "no-cache")

    // Send the PDF
    res.send(pdfBuffer)
    console.log("PDF sent successfully")
  } catch (error) {
    console.error("Error generating PDF report:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to generate PDF report",
      error: error.message,
    })
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err)
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  })
})

// Initialize database and start server
const initializeServer = async () => {
  try {
    await initializeTables()
    await migrateHardcodedQuestions()

    const PORT = process.env.PORT || 5000
    server.listen(PORT, () => {
      console.log(`Enhanced server running on port: ${PORT}`)
      console.log("Real-time analytics and PDF reporting system initialized")
      console.log("Using PDFKit for PDF generation")
    })
  } catch (error) {
    console.error("Failed to initialize server:", error)
    process.exit(1)
  }
}

initializeServer()

module.exports = { app, server, io }
