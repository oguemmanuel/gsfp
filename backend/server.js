const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const { db, Connection } = require("./db");
const { router: authRoutes, requireAuth, requireAdmin, requireAdminSurveyAccess } = require("./auth");
const bcrypt = require("bcryptjs");
const PDFDocument = require('pdfkit');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

dotenv.config();

const app = express();

// Database options for session store
const sessionStoreOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  clearExpired: true,
  checkExpirationInterval: 900000, // 15 minutes
  expiration: 86400000, // 24 hours
  createDatabaseTable: true
};

// Create MySQL session store
const sessionStore = new MySQLStore(sessionStoreOptions);

// Set up middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000',  // Next.js frontend
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    message: err.message || 'Internal server error' 
  });
});

// Add this before your routes to handle preflight requests
app.options('*', cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up session middleware
app.use(session({
  key: 'gsfp_session',
  secret: process.env.SESSION_SECRET, // Use env variable in production
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 86400000 // 24 hours
  }
}));

// Test the database connection
// (async () => {
//   await Connection();
  
//   // Create survey_questions table if it doesn't exist
//   try {
//     await db.execute(`
//       CREATE TABLE IF NOT EXISTS survey_questions (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         role VARCHAR(50) NOT NULL,
//         question_text TEXT NOT NULL,
//         options JSON NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
//       )
//     `);
//     console.log('Survey questions table created or already exists');
    
//     // Check if we need to migrate hardcoded questions
//     await migrateHardcodedQuestions();
//   } catch (error) {
//     console.error('Error setting up survey_questions table:', error);
//   }
// })();

// Use authentication routes
app.use('/api/auth', authRoutes);

// Survey questions for each stakeholder (hardcoded version - will be migrated to database)
const surveyQuestions = {
  teacher: [
    {
      id: 1,
      question: "How has the School Feeding Program impacted students' attendance?",
      options: ["Increased", "No Change", "Decreased"]
    },
    {
      id: 2,
      question: "Have you noticed an improvement in students' concentration and academic performance?",
      options: ["Yes, a significant improvement", "Some improvement", "No improvement"]
    },
    {
      id: 3,
      question: "How would you rate the quality of food provided?",
      options: ["Excellent", "Good", "Fair", "Poor"]
    },
    {
      id: 4,
      question: "How often is food delivered on time?",
      options: ["Always", "Sometimes", "Rarely", "Never"]
    },
    {
      id: 5,
      question: "Have you received complaints from students regarding the meals?",
      options: ["Yes, frequently", "Yes, occasionally", "No complaints"]
    },
    {
      id: 6,
      question: "What is your overall satisfaction with the program?",
      options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"]
    }
  ],
  caterer: [
    {
      id: 1,
      question: "Do you receive the necessary ingredients and supplies on time?",
      options: ["Always", "Sometimes", "Rarely", "Never"]
    },
    {
      id: 2,
      question: "Are the funds provided sufficient for preparing nutritious meals?",
      options: ["Yes, always", "Sometimes", "Rarely", "Never"]
    },
    {
      id: 3,
      question: "What is the biggest challenge you face in meal preparation?",
      options: ["Insufficient funds", "Late supply of ingredients", "Lack of proper kitchen facilities", "None"]
    },
    {
      id: 4,
      question: "How often do you receive training on food safety and nutrition?",
      options: ["Regularly (every term or more)", "Occasionally (once a year)", "Rarely (once in several years)", "Never"]
    },
    {
      id: 5,
      question: "Do you think the meal portions provided are adequate for students?",
      options: ["Yes, always", "Sometimes", "No, they are insufficient"]
    }
  ],
  student: [
    {
      id: 1,
      question: "How often do you receive meals from the School Feeding Program?",
      options: ["Every school day", "3–4 times a week", "1–2 times a week", "Rarely"]
    },
    {
      id: 2,
      question: "How would you rate the taste and quality of the meals?",
      options: ["Excellent", "Good", "Fair", "Poor"]
    },
    {
      id: 3,
      question: "Do you think the meals provided are enough to keep you satisfied during school hours?",
      options: ["Yes, always", "Sometimes", "No, not enough"]
    },
    {
      id: 4,
      question: "Since the introduction of the program, has your attendance improved?",
      options: ["Yes, I attend school more regularly", "No change", "I miss school less often"]
    },
    {
      id: 5,
      question: "Have you ever skipped school due to a lack of food at home?",
      options: ["Yes, frequently", "Yes, occasionally", "No"]
    }
  ],
  headmaster: [
    {
      id: 1,
      question: "How often do you inspect feeding the school?",
      options: ["Weekly", "Monthly", "Once per term", "Rarely"]
    },
    {
      id: 2,
      question: "What is the most common challenge observed in the program?",
      options: ["Inconsistent food supply", "Poor food quality", "Poor hygiene practices", "No major challenges"]
    },
    {
      id: 3,
      question: "Do students and teachers report concerns about the program?",
      options: ["Yes, frequently", "Yes, occasionally", "No reports"]
    },
    {
      id: 4,
      question: "How would you rate the transparency of the program's funding and distribution?",
      options: ["Very Transparent", "Somewhat Transparent", "Not Transparent"]
    },
    {
      id: 5,
      question: "Do you think the program has met its goal of improving student well-being?",
      options: ["Yes, completely", "Partially", "No"]
    }
  ],
  supplier: [
    {
      id: 1,
      question: "How timely are the payments for food supplies?",
      options: ["Always on time", "Sometimes delayed", "Often delayed", "Rarely on time"]
    },
    {
      id: 2,
      question: "Are you able to supply the required food items in the right quality and quantity?",
      options: ["Yes, always", "Sometimes", "No"]
    },
    {
      id: 3,
      question: "What is the biggest challenge in supplying food for the program?",
      options: ["Payment delays", "Transportation difficulties", "Quality control issues", "None"]
    },
    {
      id: 4,
      question: "Do you receive any support or guidance from program administrators?",
      options: ["Yes, regularly", "Occasionally", "No"]
    },
    {
      id: 5,
      question: "How can the procurement process be improved?",
      options: ["Faster payments", "Better communication with suppliers", "More flexible contracts", "No improvements needed"]
    }
  ]
};

// Migration function to populate initial survey questions from hardcoded data
async function migrateHardcodedQuestions() {
  try {
    // Check if questions already exist
    const [existingQuestions] = await db.execute('SELECT COUNT(*) as count FROM survey_questions');
    
    if (existingQuestions[0].count > 0) {
      console.log('Questions already exist in database, skipping migration');
      return;
    }
    
    console.log('Migrating hardcoded questions to database...');
    
    // Insert all hardcoded questions
    for (const [role, questions] of Object.entries(surveyQuestions)) {
      for (const question of questions) {
        await db.execute(
          'INSERT INTO survey_questions (role, question_text, options) VALUES (?, ?, ?)',
          [role, question.question, JSON.stringify(question.options)]
        );
      }
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error migrating questions:', error);
  }
}

// Function to get survey questions from database
async function getSurveyQuestions(role) {
  try {
    const [questions] = await db.execute(
      'SELECT * FROM survey_questions WHERE role = ? ORDER BY id ASC',
      [role]
    );
    
    return questions.map(q => ({
      id: q.id,
      question: q.question_text,
      options: JSON.parse(q.options)
    }));
  } catch (error) {
    console.error(`Error fetching ${role} survey questions:`, error);
    return []; // Return empty array as fallback
  }
}

// Generic function to get survey questions by role
app.get('/api/survey-questions/:role', requireAuth, async (req, res) => {
  const { role } = req.params;
  
  if (req.session.user.role !== role) {
    return res.status(403).json({ 
      success: false, 
      message: `Access denied: ${role} role required` 
    });
  }
  
  const questions = await getSurveyQuestions(role);
  
  res.json({ 
    success: true, 
    message: `${role} survey questions`, 
    data: { questions }
  });
});

// Updated dashboard routes to include survey questions from database
app.get('/api/teacher-dashboard', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'teacher') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied: Teacher role required' 
    });
  }
  
  const surveyQuestions = await getSurveyQuestions('teacher');
  
  res.json({ 
    success: true, 
    message: 'Teacher dashboard data', 
    data: {
      surveyQuestions
      // Add other teacher-specific data here
    }
  });
});

app.get('/api/headmaster-dashboard', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'headmaster') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied: Headmaster role required' 
    });
  }
  
  const surveyQuestions = await getSurveyQuestions('headmaster');
  
  res.json({ 
    success: true, 
    message: 'Headmaster dashboard data', 
    data: {
      surveyQuestions
      // Add other headmaster-specific data here
    }
  });
});

app.get('/api/student-dashboard', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'student') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied: Student role required' 
    });
  }
  
  const surveyQuestions = await getSurveyQuestions('student');
  
  res.json({ 
    success: true, 
    message: 'Student dashboard data', 
    data: {
      surveyQuestions
      // Add other student-specific data here
    }
  });
});

app.get('/api/caterer-dashboard', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'caterer') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied: Caterer role required' 
    });
  }
  
  const surveyQuestions = await getSurveyQuestions('caterer');
  
  res.json({ 
    success: true, 
    message: 'Caterer dashboard data', 
    data: {
      surveyQuestions
      // Add other caterer-specific data here
    }
  });
});

app.get('/api/supplier-dashboard', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'supplier') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied: Supplier role required' 
    });
  }
  
  const surveyQuestions = await getSurveyQuestions('supplier');
  
  res.json({ 
    success: true, 
    message: 'Supplier dashboard data', 
    data: {
      surveyQuestions
      // Add other supplier-specific data here
    }
  });
});

// API endpoint to submit survey responses
app.post('/api/submit-survey/:role', requireAuth, async (req, res) => {
  try {
    const { role } = req.params;
    const responses = req.body;
    const userId = req.session.user.id;
    
    if (req.session.user.role !== role) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied: ${role} role required` 
      });
    }
    
    // Validate that responses exist
    if (!responses || Object.keys(responses).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Survey responses are required'
      });
    }
    
    // Get questions for this role to include question text
    const questions = await getSurveyQuestions(role);
    
    // Format responses with question text
    const formattedResponses = {};
    Object.keys(responses).forEach(questionId => {
      // Find the corresponding question
      const question = questions.find(q => q.id.toString() === questionId);
      if (question) {
        formattedResponses[questionId] = {
          question: question.question,
          answer: responses[questionId]
        };
      } else {
        // If question not found, just store the answer
        formattedResponses[questionId] = {
          answer: responses[questionId]
        };
      }
    });
    
    console.log(`Formatted ${role} survey responses:`, JSON.stringify(formattedResponses, null, 2));
    
    // Save the formatted responses to the database
    const [result] = await db.execute(
      'INSERT INTO survey_responses (user_id, role, responses) VALUES (?, ?, ?)',
      [userId, role, JSON.stringify(formattedResponses)]
    );
    
    if (result.affectedRows === 1) {
      console.log(`Survey responses from ${role} (ID: ${userId}) saved successfully`);
      
      return res.json({ 
        success: true, 
        message: 'Survey responses submitted successfully',
        data: {
          responseId: result.insertId
        }
      });
    } else {
      throw new Error('Failed to save survey responses');
    }
  } catch (error) {
    console.error('Error saving survey responses:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to save survey responses',
      error: error.message
    });
  }
});

// New route to fetch survey responses for a specific role
app.get('/api/survey-responses/:role', requireAuth, async (req, res) => {
  try {
    const { role } = req.params;
    
    // Ensure the user has the correct role to access these responses
    if (req.session.user.role !== role) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied: ${role} role required` 
      });
    }
    
    // Fetch survey responses for the specific role
    const [responses] = await db.execute(
      'SELECT id, responses, created_at FROM survey_responses WHERE role = ? ORDER BY created_at DESC',
      [role]
    );
    
    // Parse the JSON responses and add sentiment analysis
    const processedResponses = responses.map(response => {
      const parsedResponses = JSON.parse(response.responses);
      
      // Basic sentiment analysis function
      const analyzeSentiment = (answer, options) => {
        const positiveIndicators = ['Yes', 'Always', 'Excellent', 'Very', 'Increased', 'Satisfied'];
        const negativeIndicators = ['No', 'Never', 'Poor', 'Rarely', 'Decreased', 'Dissatisfied'];
        
        const lowerAnswer = answer.toLowerCase();
        
        if (positiveIndicators.some(indicator => lowerAnswer.includes(indicator.toLowerCase()))) {
          return 1; // Positive
        } else if (negativeIndicators.some(indicator => lowerAnswer.includes(indicator.toLowerCase()))) {
          return -1; // Negative
        }
        
        return 0; // Neutral
      };
      
      // Calculate overall sentiment
      const sentimentScores = Object.entries(parsedResponses).map(([questionId, response]) => 
        analyzeSentiment(response.answer, response.options)
      );
      
      const averageSentiment = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;
      
      return {
        id: response.id,
        responses: parsedResponses,
        createdAt: response.created_at,
        sentimentScore: averageSentiment
      };
    });
    
    res.json({ 
      success: true, 
      message: `${role} survey responses`, 
      data: processedResponses 
    });
  } catch (error) {
    console.error('Error fetching survey responses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch survey responses',
      error: error.message 
    });
  }
});

// New route to get current user session
app.get('/api/session', requireAuth, (req, res) => {
  // Remove sensitive information before sending
  const { password, ...userWithoutPassword } = req.session.user;
  
  res.json({ 
    success: true, 
    user: userWithoutPassword 
  });
});

// Add these admin-specific routes to your server.js file
// API endpoint to check admin status
app.get('/api/auth/users', requireAuth, async (req, res) => {
  try {
    // Get the current user from session
    const user = req.session.user;
    
    // Remove sensitive information
    const { password, ...userWithoutPassword } = user;
    
    return res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error fetching user information:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user information',
      error: error.message
    });
  }
});

// Fix for the sentiment analysis function in the admin endpoint
app.get('/api/admin/survey-responses/:role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    
    // Validate role parameter
    const validRoles = ['teacher', 'student', 'caterer', 'supplier', 'headmaster'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }
    
    // Fetch survey responses for the specified role
    const [responses] = await db.execute(
      'SELECT sr.id, sr.user_id, u.full_name, sr.responses, sr.created_at FROM survey_responses sr ' +
      'LEFT JOIN users u ON sr.user_id = u.id ' +
      'WHERE sr.role = ? ORDER BY sr.created_at DESC',
      [role]
    );
    
    // Process the responses
    const processedResponses = responses.map(response => {
      let parsedResponses;
      try {
        parsedResponses = JSON.parse(response.responses);
      } catch (e) {
        console.error('Error parsing responses JSON:', e);
        parsedResponses = {}; // Fallback  {
        console.error('Error parsing responses JSON:', e);
        parsedResponses = {}; // Fallback to empty object if parsing fails
      }
      
      // Basic sentiment analysis function - FIXED
      const analyzeSentiment = (responsesObj) => {
        const positiveIndicators = ['yes', 'always', 'excellent', 'very', 'increased', 'satisfied', 'good', 'improvement'];
        const negativeIndicators = ['no', 'never', 'poor', 'rarely', 'decreased', 'dissatisfied'];
        
        let sentimentScore = 0;
        let count = 0;
        
        // Safely iterate through the parsed responses
        Object.values(responsesObj).forEach(data => {
          if (data && typeof data === 'object' && 'answer' in data) {
            const answer = String(data.answer).toLowerCase(); // Convert to string first
            
            if (positiveIndicators.some(indicator => answer.includes(indicator))) {
              sentimentScore += 1;
            } else if (negativeIndicators.some(indicator => answer.includes(indicator))) {
              sentimentScore -= 1;
            }
            count++;
          }
        });
        
        return count > 0 ? sentimentScore / count : 0;
      };
      
      return {
        id: response.id,
        userId: response.user_id,
        userName: response.full_name || `User ${response.user_id}`,
        responses: parsedResponses,
        createdAt: response.created_at,
        sentimentScore: analyzeSentiment(parsedResponses)
      };
    });
    
    return res.json({ 
      success: true, 
      message: `Admin access to ${role} survey responses`, 
      data: processedResponses 
    });
  } catch (error) {
    console.error('Error fetching survey responses for admin:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch survey responses',
      error: error.message 
    });
  }
});

// Admin endpoint to get summary statistics
app.get('/api/admin/statistics', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Get counts by role
    const [roleCounts] = await db.execute(
      'SELECT role, COUNT(*) as count FROM survey_responses GROUP BY role'
    );
    
    // Format as an object
    const responsesByRole = {};
    roleCounts.forEach(row => {
      responsesByRole[row.role] = row.count;
    });
    
    // Get total responses
    const [totalResult] = await db.execute(
      'SELECT COUNT(*) as total FROM survey_responses'
    );
    const totalResponses = totalResult[0].total;
    
    // Get unique users who have responded
    const [uniqueUsers] = await db.execute(
      'SELECT COUNT(DISTINCT user_id) as count FROM survey_responses'
    );
    
    return res.json({
      success: true,
      data: {
        totalResponses,
        uniqueRespondents: uniqueUsers[0].count,
        responsesByRole
      }
    });
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// PDF Generation endpoint for admin
app.get('/api/admin/download-responses/:role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    
    // Validate role parameter
    const validRoles = ['teacher', 'student', 'caterer', 'supplier', 'headmaster'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }
    
    // Fetch survey responses for the specified role
    const [responses] = await db.execute(
      'SELECT sr.id, sr.user_id, u.full_name, sr.responses, sr.created_at FROM survey_responses sr ' +
      'LEFT JOIN users u ON sr.user_id = u.id ' +
      'WHERE sr.role = ? ORDER BY sr.created_at DESC',
      [role]
    );
    
    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${role}-survey-responses.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add title
    doc.fontSize(20).font('Helvetica-Bold').text(`${role.charAt(0).toUpperCase() + role.slice(1)} Survey Responses`, {
      align: 'center'
    });
    
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, {
      align: 'center'
    });
    
    doc.moveDown(2);
    
    // Add summary information
    doc.fontSize(16).font('Helvetica-Bold').text('Summary', {
      underline: true
    });
    
    doc.moveDown();
    
    // Add total number of responses
    doc.fontSize(12).font('Helvetica').text(`Total Responses: ${responses.length}`);
    
    // Generate sentiment analysis summary
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    
    // Basic sentiment analysis function
    const analyzeSentiment = (responsesObj) => {
      const positiveIndicators = ['yes', 'always', 'excellent', 'very', 'increased', 'satisfied', 'good', 'improvement'];
      const negativeIndicators = ['no', 'never', 'poor', 'rarely', 'decreased', 'dissatisfied'];
      
      let sentimentScore = 0;
      let count = 0;
      
      // Safely iterate through the parsed responses
      Object.values(responsesObj).forEach(data => {
        if (data && typeof data === 'object' && 'answer' in data) {
          const answer = String(data.answer).toLowerCase();
          
          if (positiveIndicators.some(indicator => answer.includes(indicator))) {
            sentimentScore += 1;
          } else if (negativeIndicators.some(indicator => answer.includes(indicator))) {
            sentimentScore -= 1;
          }
          count++;
        }
      });
      
      return count > 0 ? sentimentScore / count : 0;
    };
    
    // Process response sentiment
    responses.forEach(response => {
      let parsedResponses;
      try {
        parsedResponses = JSON.parse(response.responses);
      } catch (e) {
        console.error('Error parsing responses JSON:', e);
        parsedResponses = {};
      }
      
      const sentimentScore = analyzeSentiment(parsedResponses);
      
      if (sentimentScore > 0.3) {
        positiveCount++;
      } else if (sentimentScore < -0.3) {
        negativeCount++;
      } else {
        neutralCount++;
      }
    });
    
    doc.moveDown();
    doc.text(`Sentiment Analysis:`);
    doc.text(`• Positive Responses: ${positiveCount} (${Math.round((positiveCount / responses.length) * 100)}%)`);
    doc.text(`• Neutral Responses: ${neutralCount} (${Math.round((neutralCount / responses.length) * 100)}%)`);
    doc.text(`• Negative Responses: ${negativeCount} (${Math.round((negativeCount / responses.length) * 100)}%)`);
    
    doc.moveDown(2);
    
    // Draw responses timeline chart if using chartjs-node-canvas
    // This is a more advanced feature and might need adjustment based on your setup
    if (responses.length > 0) {
      try {
        // Create a timeline dataset of responses
        const timeData = new Map();
        
        responses.forEach(response => {
          const date = new Date(response.created_at).toLocaleDateString();
          
          if (!timeData.has(date)) {
            timeData.set(date, {
              date,
              count: 0
            });
          }
          
          timeData.get(date).count++;
        });
        
        // Sort by date and convert to array
        const timelineData = Array.from(timeData.values())
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Only create chart if we have timeline data
        if (timelineData.length > 0) {
          // Create Chart.js configuration
          const width = 600;
          const height = 400;
          const chartCallback = (ChartJS) => {
            // Optional: Global chart configuration
          };
          
          const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });
          
          const chartConfiguration = {
            type: 'line',
            data: {
              labels: timelineData.map(item => item.date),
              datasets: [{
                label: 'Responses',
                data: timelineData.map(item => item.count),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
              }]
            },
            options: {
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Number of Responses'
                  }
                },
                x: {
                  title: {
                    display: true,
                    text: 'Date'
                  }
                }
              },
              plugins: {
                title: {
                  display: true,
                  text: 'Response Timeline'
                }
              }
            }
          };
          
          // Generate chart image buffer
          const imageBuffer = await chartJSNodeCanvas.renderToBuffer(chartConfiguration);
          
          // Add chart title
          doc.fontSize(16).font('Helvetica-Bold').text('Response Timeline', {
            underline: true
          });
          
          doc.moveDown();
          
          // Add the chart image to the PDF
          doc.image(imageBuffer, {
            fit: [500, 300],
            align: 'center'
          });
          
          doc.moveDown(2);
        }
      } catch (chartError) {
        console.error('Error generating chart:', chartError);
        // Continue without the chart if there's an error
      }
    }
    
    // Add detailed responses section
    doc.fontSize(16).font('Helvetica-Bold').text('Detailed Responses', {
      underline: true
    });
    
    doc.moveDown();
    
    // Process and add each response
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      let parsedResponses;
      
      try {
        parsedResponses = JSON.parse(response.responses);
      } catch (e) {
        console.error('Error parsing responses JSON:', e);
        parsedResponses = {};
      }
      
      // Calculate sentiment for this response
      const sentimentScore = analyzeSentiment(parsedResponses);
      let sentimentLabel = 'Neutral';
      
      if (sentimentScore > 0.3) {
        sentimentLabel = 'Positive';
      } else if (sentimentScore < -0.3) {
        sentimentLabel = 'Negative';
      }
      
      // Add response header
      doc.fontSize(14).font('Helvetica-Bold')
         .text(`Response #${i + 1} - ${response.full_name || `User ${response.user_id}`}`);
      
      doc.fontSize(12).font('Helvetica')
         .text(`Date: ${new Date(response.created_at).toLocaleString()}`);
      
      doc.text(`Overall Sentiment: ${sentimentLabel} (${sentimentScore.toFixed(2)})`);
      
      doc.moveDown();
      
      // Format and add individual question responses
      if (parsedResponses && typeof parsedResponses === 'object') {
        Object.entries(parsedResponses).forEach(([questionId, data]) => {
          doc.fontSize(12).font('Helvetica-Bold')
             .text(data.question || `Question ${questionId}`);
          
          doc.fontSize(12).font('Helvetica')
             .text(`Answer: ${data.answer || 'No answer'}`);
          
          doc.moveDown();
        });
      } else {
        doc.text('No detailed responses available');
      }
      
      // Add a separator between responses
      if (i < responses.length - 1) {
        doc.moveDown();
        doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(2);
      }
      
      // Check if we need a new page
      if (doc.y > 700 && i < responses.length - 1) {
        doc.addPage();
      }
    }
    
    // Finalize the PDF
    doc.end();
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to generate PDF report',
      error: error.message 
    });
  }
});

// NEW ENDPOINTS FOR ADMIN SURVEY QUESTION MANAGEMENT

// 1. Get all survey questions for a specific role
app.get('/api/admin/survey-questions/:role', requireAuth, requireAdminSurveyAccess, async (req, res) => {
  try {
    const { role } = req.params;
    
    // Validate role parameter
    const validRoles = ['teacher', 'student', 'caterer', 'supplier', 'headmaster'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }
    
    // Fetch questions from database
    const [questions] = await db.execute(
      'SELECT * FROM survey_questions WHERE role = ? ORDER BY id ASC',
      [role]
    );
    
    // Parse options JSON
    const formattedQuestions = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));
    
    return res.json({
      success: true,
      data: formattedQuestions
    });
  } catch (error) {
    console.error('Error fetching survey questions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch survey questions',
      error: error.message
    });
  }
});

// 2. Add a new survey question
app.post('/api/admin/survey-questions', requireAuth, requireAdminSurveyAccess, async (req, res) => {
  try {
    const { role, questionText, options } = req.body;
    
    // Validate input
    if (!role || !questionText || !options || !Array.isArray(options) || options.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Role, question text, and options array are required'
      });
    }
    
    // Validate role
    const validRoles = ['teacher', 'student', 'caterer', 'supplier', 'headmaster'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }
    
    // Insert new question
    const [result] = await db.execute(
      'INSERT INTO survey_questions (role, question_text, options) VALUES (?, ?, ?)',
      [role, questionText, JSON.stringify(options)]
    );
    
    if (result.affectedRows === 1) {
      return res.status(201).json({
        success: true,
        message: 'Survey question added successfully',
        data: {
          id: result.insertId,
          role,
          questionText,
          options
        }
      });
    } else {
      throw new Error('Failed to add survey question');
    }
  } catch (error) {
    console.error('Error adding survey question:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add survey question',
      error: error.message
    });
  }
});

// 3. Update an existing survey question
app.put('/api/admin/survey-questions/:id', requireAuth, requireAdminSurveyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { questionText, options } = req.body;
    
    // Validate input
    if (!questionText || !options || !Array.isArray(options) || options.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question text and options array are required'
      });
    }
    
    // Check if question exists
    const [existingQuestions] = await db.execute(
      'SELECT * FROM survey_questions WHERE id = ?',
      [id]
    );
    
    if (existingQuestions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Survey question not found'
      });
    }
    
    // Update the question
    const [result] = await db.execute(
      'UPDATE survey_questions SET question_text = ?, options = ? WHERE id = ?',
      [questionText, JSON.stringify(options), id]
    );
    
    if (result.affectedRows === 1) {
      return res.json({
        success: true,
        message: 'Survey question updated successfully',
        data: {
          id: parseInt(id),
          questionText,
          options
        }
      });
    } else {
      throw new Error('Failed to update survey question');
    }
  } catch (error) {
    console.error('Error updating survey question:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update survey question',
      error: error.message
    });
  }
});

// 4. Delete a survey question
app.delete('/api/admin/survey-questions/:id', requireAuth, requireAdminSurveyAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if question exists
    const [existingQuestions] = await db.execute(
      'SELECT * FROM survey_questions WHERE id = ?',
      [id]
    );
    
    if (existingQuestions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Survey question not found'
      });
    }
    
    // Delete the question
    const [result] = await db.execute(
      'DELETE FROM survey_questions WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 1) {
      return res.json({
        success: true,
        message: 'Survey question deleted successfully'
      });
    } else {
      throw new Error('Failed to delete survey question');
    }
  } catch (error) {
    console.error('Error deleting survey question:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete survey question',
      error: error.message
    });
  }
});

// 5. Get all survey questions for admin dashboard
app.get('/api/admin/survey-questions', requireAuth, requireAdminSurveyAccess, async (req, res) => {
  try {
    // Fetch all questions grouped by role
    const [questions] = await db.execute(
      'SELECT * FROM survey_questions ORDER BY role, id ASC'
    );
    
    // Group questions by role
    const questionsByRole = {};
    
    questions.forEach(question => {
      if (!questionsByRole[question.role]) {
        questionsByRole[question.role] = [];
      }
      
      questionsByRole[question.role].push({
        ...question,
        options: JSON.parse(question.options)
      });
    });
    
    return res.json({
      success: true,
      data: questionsByRole
    });
  } catch (error) {
    console.error('Error fetching all survey questions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch survey questions',
      error: error.message
    });
  }
});

// Default error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// Start the server
app.listen(process.env.PORT, async () => {
  await Connection();
  console.log(`Server is running on port: ${process.env.PORT}`);
});