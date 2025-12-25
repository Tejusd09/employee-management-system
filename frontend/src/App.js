import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './Login';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: '',
    department: '',
    salary: '',
    hire_date: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      fetchEmployees();
      fetchStatistics();
    }
  }, []);

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/employees`, getAuthHeaders());
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
      showMessage('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_BASE}/statistics`, getAuthHeaders());
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    fetchEmployees();
    fetchStatistics();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setEmployees([]);
    setStatistics({});
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingEmployee) {
        await axios.put(`${API_BASE}/employees/${editingEmployee.id}`, formData, getAuthHeaders());
        showMessage('Employee updated successfully!');
      } else {
        await axios.post(`${API_BASE}/employees`, formData, getAuthHeaders());
        showMessage('Employee added successfully!');
      }
      resetForm();
      fetchEmployees();
      fetchStatistics();
    } catch (error) {
      console.error('Error saving employee:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
      const errorMsg = error.response?.data?.error || 'Error saving employee. Please try again.';
      showMessage(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee) => {
    setFormData({
      name: employee.name,
      email: employee.email,
      position: employee.position,
      department: employee.department,
      salary: employee.salary,
      hire_date: employee.hire_date.split('T')[0],
      phone: employee.phone || '',
      address: employee.address || ''
    });
    setEditingEmployee(employee);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      setLoading(true);
      try {
        await axios.delete(`${API_BASE}/employees/${id}`, getAuthHeaders());
        showMessage('Employee deleted successfully!');
        fetchEmployees();
        fetchStatistics();
      } catch (error) {
        console.error('Error deleting employee:', error);
        if (error.response?.status === 401) {
          handleLogout();
        }
        showMessage('Error deleting employee', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      position: '',
      department: '',
      salary: '',
      hire_date: '',
      phone: '',
      address: ''
    });
    setEditingEmployee(null);
    setShowForm(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>Employee Management System</h1>
            <p>Welcome back, {user.username}!</p>
          </div>
          <button className="btn btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="container">
        {message && (
          <div className={`message ${messageType === 'error' ? 'error-message' : 'success-message'}`}>
            {message}
          </div>
        )}

        {/* Statistics Dashboard */}
        <div className="statistics">
          <h2>Dashboard Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Employees</h3>
              <p>{statistics.totalEmployees?.count || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Departments</h3>
              <p>{statistics.totalDepartments?.count || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Average Salary</h3>
              <p>{statistics.avgSalary?.average ? formatCurrency(statistics.avgSalary.average) : '₹0'}</p>
            </div>
          </div>

          {/* Department Statistics */}
          {statistics.departmentStats && statistics.departmentStats.length > 0 && (
            <div className="department-stats">
              <h3>Department Breakdown</h3>
              <div className="stats-grid">
                {statistics.departmentStats.map((dept, index) => (
                  <div key={index} className="stat-card">
                    <h3>{dept.department}</h3>
                    <p>{dept.count} Employees</p>
                    <small>Avg: {formatCurrency(dept.avg_salary)}</small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Employee Form */}
        {showForm && (
          <div className="employee-form">
            <h2>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Position *</label>
                  <input
                    type="text"
                    name="position"
                    placeholder="Enter job position"
                    value={formData.position}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Department *</label>
                  <input
                    type="text"
                    name="department"
                    placeholder="Enter department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Salary (₹) *</label>
                  <input
                    type="number"
                    name="salary"
                    placeholder="Enter salary in rupees"
                    value={formData.salary}
                    onChange={handleInputChange}
                    min="0"
                    step="1000"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Hire Date *</label>
                  <input
                    type="date"
                    name="hire_date"
                    value={formData.hire_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label>Address</label>
                <textarea
                  name="address"
                  placeholder="Enter full address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>
              
              <div className="form-buttons">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingEmployee ? 'Update Employee' : 'Add Employee')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={loading}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Employee List */}
        <div className="employee-list">
          <div className="list-header">
            <h2>Employee Directory</h2>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowForm(true)}
              disabled={showForm && !editingEmployee}
            >
              Add New Employee
            </button>
          </div>
          
          {loading ? (
            <div className="loading">Loading employees...</div>
          ) : employees.length === 0 ? (
            <div className="no-data">
              <p>No employees found. Add your first employee to get started!</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Position</th>
                    <th>Department</th>
                    <th>Salary (₹)</th>
                    <th>Hire Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(employee => (
                    <tr key={employee.id}>
                      <td>
                        <div className="employee-info">
                          <strong>{employee.name}</strong>
                          <small>{employee.email}</small>
                          {employee.phone && <small>📞 {employee.phone}</small>}
                        </div>
                      </td>
                      <td>{employee.position}</td>
                      <td>
                        <span className="department-badge">{employee.department}</span>
                      </td>
                      <td className="salary">{formatCurrency(employee.salary)}</td>
                      <td>{formatDate(employee.hire_date)}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn btn-edit"
                            onClick={() => handleEdit(employee)}
                            disabled={loading}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-delete"
                            onClick={() => handleDelete(employee.id)}
                            disabled={loading}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;