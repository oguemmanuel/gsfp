// Admin user creation script
const createAdminUser = async () => {
  try {
    // Check if admin user already exists
    const [existingAdmins] = await db.execute(
      'SELECT * FROM users WHERE role = ? AND email = ?',
      ['admin', process.env.ADMIN_EMAIL || 'admin@schoolmeal.com']
    );

    if (existingAdmins.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user with environment variables or defaults
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@schoolmeal.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Insert admin user
    const [result] = await db.execute(
      `INSERT INTO users (full_name, email, password, role, school_name, district, phone_number) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminName, adminEmail, hashedPassword, 'admin', 'System', 'System', '0000000000']
    );

    if (result.affectedRows === 1) {
      console.log(`Admin user created successfully: ${adminEmail}`);
    } else {
      console.error('Failed to create admin user');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

// Run the admin creation script when the server starts
createAdminUser();




// Function to initialize the admin user
async function initializeAdminUser() {
  try {
    // Check if admin user exists
    const [existingAdmins] = await db.execute(
      'SELECT * FROM users WHERE email = ? AND role = ?',
      ['admin@gmail.com', 'admin']
    );

    // If admin doesn't exist, create one
    if (existingAdmins.length === 0) {
      console.log('Creating default admin user...');
      
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash('admin@123', saltRounds);
      
      // Insert the admin user
      const [result] = await db.execute(
        `INSERT INTO users (full_name, email, password, role, school_name, district, phone_number) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['Administrator', 'admin@gmail.com', hashedPassword, 'admin', 'System', 'System', '']
      );
      
      if (result.affectedRows === 1) {
        console.log('Default admin user created successfully');
      } else {
        console.error('Failed to create default admin user');
      }
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error initializing admin user:', error);
  }
}

// Call the function before starting the server
(async () => {
  try {
    await Connection();
    await initializeAdminUser();
  } catch (error) {
    console.error('Initialization error:', error);
  }
})();