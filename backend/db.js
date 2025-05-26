const mysql = require("mysql2/promise")
require("dotenv").config()

// Create a connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "school_feeding_system",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Function to test the database connection
const Connection = async () => {
  try {
    const connectToDB = await db.getConnection()
    console.log("Database connection successful")
    connectToDB.release()
    return true
  } catch (error) {
    console.error("Database connection failed:", error)
    return false
  }
}

// Initialize database tables
const initializeTables = async () => {
  try {
    // Users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'teacher', 'student', 'caterer', 'supplier', 'headmaster') NOT NULL,
        school_name VARCHAR(255),
        district VARCHAR(255),
        phone_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    // Survey questions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS survey_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        question_text TEXT NOT NULL,
        options JSON NOT NULL,
        question_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    // Survey responses table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        role VARCHAR(50) NOT NULL,
        responses JSON NOT NULL,
        sentiment_score DECIMAL(3,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Analytics data table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS analytics_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        metric_type ENUM('enrollment', 'meals_served', 'stock_levels', 'attendance', 'satisfaction') NOT NULL,
        metric_value JSON NOT NULL,
        school_name VARCHAR(255),
        district VARCHAR(255),
        date_recorded DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Reports table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_type ENUM('qualitative', 'quantitative', 'combined') NOT NULL,
        title VARCHAR(255) NOT NULL,
        content JSON NOT NULL,
        generated_by INT NOT NULL,
        date_range_start DATE,
        date_range_end DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (generated_by) REFERENCES users(id)
      )
    `)

    // Meal data table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS meal_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school_name VARCHAR(255) NOT NULL,
        district VARCHAR(255) NOT NULL,
        meals_planned INT DEFAULT 0,
        meals_served INT DEFAULT 0,
        students_present INT DEFAULT 0,
        meal_type ENUM('breakfast', 'lunch', 'snack') NOT NULL,
        date_served DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Stock data table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS stock_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school_name VARCHAR(255) NOT NULL,
        district VARCHAR(255) NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        item_type ENUM('grain', 'protein', 'vegetable', 'fruit', 'dairy', 'other') NOT NULL,
        quantity_available DECIMAL(10,2) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        expiry_date DATE,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    // Enrollment data table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS enrollment_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        school_name VARCHAR(255) NOT NULL,
        district VARCHAR(255) NOT NULL,
        total_enrolled INT NOT NULL,
        male_students INT DEFAULT 0,
        female_students INT DEFAULT 0,
        grade_level VARCHAR(50),
        academic_year VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log("All database tables initialized successfully")
  } catch (error) {
    console.error("Error initializing database tables:", error)
  }
}

module.exports = {
  Connection,
  db,
  initializeTables,
}
