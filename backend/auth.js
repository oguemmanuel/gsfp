const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('./db');

const dotenv = require("dotenv");
dotenv.config();

// Admin registration route
router.post('/admin/register', async (req, res) => {
  try {
    const { 
      fullName, 
      email, 
      password,
      adminSecretKey
    } = req.body;

    // Verify admin secret key (you should store this in environment variables)
    const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;
    
    if (adminSecretKey !== ADMIN_SECRET_KEY) {
      return res.status(403).json({
        success: false,
        message: 'Invalid admin secret key'
      });
    }

    // Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE email = ?', 
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin with this email already exists' 
      });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new admin user with role set to 'admin'
    const [result] = await db.query(
      `INSERT INTO users (full_name, email, password, role) 
       VALUES (?, ?, ?, 'admin')`,
      [fullName, email, hashedPassword]
    );

    if (result.affectedRows === 1) {
      return res.status(201).json({ 
        success: true, 
        message: 'Admin registration successful. Please sign in.' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to register admin' 
      });
    }
  } catch (error) {
    console.error('Admin registration error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during admin registration' 
    });
  }
});

// Regular user registration route
router.post('/register', async (req, res) => {
  try {
    const { 
      fullName, 
      email, 
      password, 
      role, 
      schoolName,
      district, 
      phoneNumber 
    } = req.body;

    // Prevent regular registration route from creating admins
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts must be created through the admin registration endpoint'
      });
    }

    // Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE email = ?', 
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user
    const [result] = await db.query(
      `INSERT INTO users (full_name, email, password, role, school_name, district, phone_number) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fullName, email, hashedPassword, role, schoolName, district, phoneNumber]
    );

    if (result.affectedRows === 1) {
      return res.status(201).json({ 
        success: true, 
        message: 'Registration successful. Please sign in.' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to register user' 
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// Login route (works for both regular users and admins)
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?', 
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const user = users[0];

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Store user info in session (excluding password)
    req.session.user = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      schoolName: user.school_name,
      district: user.district
    };

    // Determine dashboard URL based on role
    let dashboardUrl;
    switch (user.role) {
      case 'teacher':
        dashboardUrl = '/teacher-dashboard';
        break;
      case 'caterer':
        dashboardUrl = '/caterer-dashboard';
        break;
      case 'student':
        dashboardUrl = '/student-dashboard';
        break;
      case 'headmaster':
        dashboardUrl = '/headmaster-dashboard';
        break;
      case 'supplier':
        dashboardUrl = '/supplier-dashboard';
        break;
      case 'admin':
        dashboardUrl = '/admin-dashboard';
        break;
      default:
        dashboardUrl = '/dashboard';
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Login successful', 
      user: req.session.user,
      dashboardUrl
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  next();
};

// Admin-only middleware specifically for survey management
const requireAdminSurveyAccess = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required for survey management' 
    });
  }
  next();
};

// Admin-only route example
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, full_name, email, role, school_name, district, phone_number FROM users');
    
    return res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to logout' 
      });
    }
    
    res.clearCookie('connect.sid');
    return res.status(200).json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

// Get current user info
router.get('/users', (req, res) => {
  if (req.session.user) {
    return res.status(200).json({ 
      success: true, 
      user: req.session.user 
    });
  } else {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authenticated' 
    });
  }
});

// Authentication middleware for protected routes
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  next();
};

// Protected route example
router.get('/protected', requireAuth, (req, res) => {
  res.json({ 
    success: true, 
    message: 'This is a protected route', 
    user: req.session.user 
  });
});

module.exports = { router, requireAuth, requireAdmin, requireAdminSurveyAccess };