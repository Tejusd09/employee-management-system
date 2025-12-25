const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your-secret-key-here'; // Change this in production

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database initialization
const db = new sqlite3.Database('./employee.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    
    // Create employees table
    db.run(`CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      position TEXT NOT NULL,
      department TEXT NOT NULL,
      salary REAL NOT NULL,
      hire_date TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating employees table:', err.message);
      } else {
        console.log('Employees table ready.');
      }
    });

    // Create users table for authentication
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
      } else {
        console.log('Users table ready.');
        createDefaultAdmin();
      }
    });
  }
});

// Create default admin user
function createDefaultAdmin() {
  const defaultAdmin = {
    username: 'Admin',
    email: 'admin@gmail.com',
    password: 'Admin1234',
    role: 'admin'
  };

  db.get('SELECT id FROM users WHERE username = ?', [defaultAdmin.username], (err, row) => {
    if (err) {
      console.error('Error checking admin user:', err.message);
      return;
    }
    if (!row) {
      const hashedPassword = bcrypt.hashSync(defaultAdmin.password, 10);
      const sql = `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`;
      db.run(sql, [defaultAdmin.username, defaultAdmin.email, hashedPassword, defaultAdmin.role], function(err) {
        if (err) {
          console.error('Error creating admin user:', err.message);
        } else {
          console.log('Default admin user created: nikita / nikita1234');
        }
      });
    }
  });

  // Insert sample employees
  insertSampleData();
}

// Insert sample data
function insertSampleData() {
  const sampleEmployees = [
    {
      name: 'Raj Sharma',
      email: 'raj.sharma@company.com',
      position: 'Software Engineer',
      department: 'Engineering',
      salary: 750000,
      hire_date: '2023-01-15',
      phone: '+91-9876543210',
      address: '123 MG Road, Bangalore, Karnataka'
    },
    {
      name: 'Priya Patel',
      email: 'priya.patel@company.com',
      position: 'Product Manager',
      department: 'Product',
      salary: 1200000,
      hire_date: '2022-08-20',
      phone: '+91-9876543211',
      address: '456 Koramangala, Bangalore, Karnataka'
    },
    {
      name: 'Amit Kumar',
      email: 'amit.kumar@company.com',
      position: 'HR Specialist',
      department: 'Human Resources',
      salary: 600000,
      hire_date: '2023-03-10',
      phone: '+91-9876543212',
      address: '789 Whitefield, Bangalore, Karnataka'
    },
    {
      name: 'Anjali Singh',
      email: 'anjali.singh@company.com',
      position: 'UX Designer',
      department: 'Design',
      salary: 800000,
      hire_date: '2023-02-28',
      phone: '+91-9876543213',
      address: '321 HSR Layout, Bangalore, Karnataka'
    },
    {
      name: 'Vikram Reddy',
      email: 'vikram.reddy@company.com',
      position: 'Data Analyst',
      department: 'Analytics',
      salary: 900000,
      hire_date: '2022-11-15',
      phone: '+91-9876543214',
      address: '654 Jayanagar, Bangalore, Karnataka'
    }
  ];

  sampleEmployees.forEach(emp => {
    db.get('SELECT id FROM employees WHERE email = ?', [emp.email], (err, row) => {
      if (err) {
        console.error('Error checking existing employee:', err.message);
        return;
      }
      if (!row) {
        const sql = `INSERT INTO employees (name, email, position, department, salary, hire_date, phone, address) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [emp.name, emp.email, emp.position, emp.department, emp.salary, emp.hire_date, emp.phone, emp.address], 
          function(err) {
            if (err) {
              console.error('Error inserting sample data:', err.message);
            } else {
              console.log(`Sample employee added: ${emp.name}`);
            }
          });
      }
    });
  });
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// User registration
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;

  db.run(sql, [username, email, hashedPassword], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Username or email already exists' });
      } else {
        res.status(400).json({ error: err.message });
      }
      return;
    }
    res.json({
      message: 'User registered successfully',
      userId: this.lastID
    });
  });
});

// User login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const sql = 'SELECT * FROM users WHERE username = ? OR email = ?';
  db.get(sql, [username, username], (err, user) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordValid = bcrypt.compareSync(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  });
});

// Get all employees (protected)
app.get('/api/employees', authenticateToken, (req, res) => {
  const sql = 'SELECT * FROM employees ORDER BY created_at DESC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data: rows
    });
  });
});

// Get employee by ID (protected)
app.get('/api/employees/:id', authenticateToken, (req, res) => {
  const sql = 'SELECT * FROM employees WHERE id = ?';
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data: row
    });
  });
});

// Create new employee (protected)
app.post('/api/employees', authenticateToken, (req, res) => {
  const { name, email, position, department, salary, hire_date, phone, address } = req.body;
  
  if (!name || !email || !position || !department || !salary || !hire_date) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }

  const sql = `INSERT INTO employees (name, email, position, department, salary, hire_date, phone, address) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [name, email, position, department, salary, hire_date, phone, address], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(400).json({ error: err.message });
      }
      return;
    }
    res.json({
      message: 'Employee created successfully',
      data: { id: this.lastID },
      id: this.lastID
    });
  });
});

// Update employee (protected)
app.put('/api/employees/:id', authenticateToken, (req, res) => {
  const { name, email, position, department, salary, hire_date, phone, address } = req.body;
  
  if (!name || !email || !position || !department || !salary || !hire_date) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }

  const sql = `UPDATE employees 
               SET name = ?, email = ?, position = ?, department = ?, salary = ?, hire_date = ?, phone = ?, address = ?
               WHERE id = ?`;
  
  db.run(sql, [name, email, position, department, salary, hire_date, phone, address, req.params.id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'Employee updated successfully',
      changes: this.changes
    });
  });
});

// Delete employee (protected)
app.delete('/api/employees/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM employees WHERE id = ?', req.params.id, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'Employee deleted successfully',
      changes: this.changes
    });
  });
});

// Get employee statistics (protected)
app.get('/api/statistics', authenticateToken, (req, res) => {
  const queries = {
    totalEmployees: 'SELECT COUNT(*) as count FROM employees',
    totalDepartments: 'SELECT COUNT(DISTINCT department) as count FROM employees',
    avgSalary: 'SELECT AVG(salary) as average FROM employees',
    departmentStats: 'SELECT department, COUNT(*) as count, AVG(salary) as avg_salary FROM employees GROUP BY department'
  };

  const results = {};
  let completed = 0;
  const totalQueries = Object.keys(queries).length;

  Object.keys(queries).forEach(key => {
    if (key !== 'departmentStats') {
      db.get(queries[key], [], (err, row) => {
        if (err) {
          console.error(`Error in ${key}:`, err.message);
          results[key] = { error: err.message };
        } else {
          results[key] = row;
        }
        completed++;
        
        if (completed === totalQueries - 1) {
          db.all(queries.departmentStats, [], (err, rows) => {
            if (err) {
              console.error('Error in departmentStats:', err.message);
              results.departmentStats = { error: err.message };
            } else {
              results.departmentStats = rows;
            }
            res.json(results);
          });
        }
      });
    }
  });
});

// Health check endpoint (public)
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Employee Management API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🔐 Default admin credentials: admin / admin123`);
});