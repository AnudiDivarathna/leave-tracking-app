import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { 
  CalendarDays, 
  Send, 
  CheckCircle,
  XCircle,
  X,
  Plus,
  Building2,
  Clock,
  Users,
  Filter,
  X as XIcon
} from 'lucide-react'

function PublicDashboard() {
  const [employees, setEmployees] = useState([])
  const [allLeaves, setAllLeaves] = useState([])
  const [todayLeaves, setTodayLeaves] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    employee_name: '',
    leave_type: '',
    dates: [],
    reason: ''
  })

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const inputRef = useRef(null)

  // Date picker state
  const [selectedDate, setSelectedDate] = useState('')
  const [dateConflicts, setDateConflicts] = useState({})
  const [showTooltip, setShowTooltip] = useState(false)
  const [dateFilter, setDateFilter] = useState('') // Filter by date

  useEffect(() => {
    fetchData()
  }, [])

  // Check for date conflicts whenever dates change
  useEffect(() => {
    if (formData.dates.length > 0 && formData.employee_name) {
      checkDateConflicts()
    } else {
      setDateConflicts({})
    }
  }, [formData.dates, formData.employee_name, allLeaves])

  // Close tooltip when clicking outside
  useEffect(() => {
    if (showTooltip) {
      const handleClickOutside = (e) => {
        if (!e.target.closest('.dates-more-tooltip-wrapper')) {
          setShowTooltip(false)
        }
      }
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showTooltip])

  const fetchData = async () => {
    try {
      const [employeesRes, leavesRes] = await Promise.all([
        axios.get('/api/employees'),
        axios.get('/api/leaves')
      ])
      
      // Ensure data is always an array, even if API returns error or undefined
      const employees = Array.isArray(employeesRes?.data) ? employeesRes.data : []
      const leaves = Array.isArray(leavesRes?.data) ? leavesRes.data : []
      
      setEmployees(employees)
      setAllLeaves(leaves)
      
      // Filter today's leaves
      const today = new Date().toISOString().split('T')[0]
      const todayLeavesFiltered = leaves.filter(leave => {
        if (leave.dates && Array.isArray(leave.dates)) {
          return leave.dates.includes(today)
        }
        return false
      })
      setTodayLeaves(todayLeavesFiltered)
    } catch (err) {
      console.error('Error fetching data:', err)
      // Set empty arrays on error to prevent filter errors
      setEmployees([])
      setAllLeaves([])
      setTodayLeaves([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Find employee by name
    const employee = employees.find(emp => 
      emp.name.toLowerCase() === formData.employee_name.toLowerCase()
    )

    if (!employee) {
      setMessage({ type: 'error', text: 'Name not found! Please select a valid name from the suggestions.' })
      return
    }
    
    if (formData.dates.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one date' })
      return
    }

    // Validate all dates are not past
    const invalidDates = formData.dates.filter(date => !isValidDate(date))
    if (invalidDates.length > 0) {
      setMessage({ type: 'error', text: 'Cannot submit past dates. Please select today or future dates only.' })
      return
    }

    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      await axios.post('/api/leaves', {
        user_id: employee.id,
        leave_type: formData.leave_type,
        dates: formData.dates,
        reason: formData.reason
      })
      
      setMessage({ type: 'success', text: 'Leave application submitted successfully!' })
      setFormData({
        employee_name: '',
        leave_type: '',
        dates: [],
        reason: ''
      })
      
      // Refresh data
      fetchData()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit leave application' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleNameChange = (e) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, employee_name: value }))
    
    if (value.length > 0) {
      const filtered = employees.filter(emp =>
        emp.name.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredEmployees(filtered)
      setShowSuggestions(true)
    } else {
      setFilteredEmployees([])
      setShowSuggestions(false)
    }
  }

  // Check if entered name is valid
  const isNameValid = () => {
    if (!formData.employee_name) return true // Empty is ok (will be caught by required)
    return employees.some(emp => 
      emp.name.toLowerCase() === formData.employee_name.toLowerCase()
    )
  }

  const selectEmployee = (name) => {
    setFormData(prev => ({ ...prev, employee_name: name }))
    setShowSuggestions(false)
  }

  const checkDateConflicts = () => {
    const conflicts = {}
    const currentEmployee = employees.find(emp => 
      emp.name.toLowerCase() === formData.employee_name.toLowerCase()
    )

    formData.dates.forEach(date => {
      const conflictingLeaves = allLeaves.filter(leave => {
        // Skip leaves from the same employee
        if (currentEmployee && leave.user_id === currentEmployee.id) {
          return false
        }
        // Check if this leave has the date
        if (leave.dates && Array.isArray(leave.dates)) {
          return leave.dates.includes(date)
        }
        return false
      })

      if (conflictingLeaves.length > 0) {
        conflicts[date] = conflictingLeaves.map(leave => leave.employee_name)
      }
    })

    setDateConflicts(conflicts)
  }

  const addDate = () => {
    if (!selectedDate) return

    // Validate date is not past
    if (!isValidDate(selectedDate)) {
      setMessage({ type: 'error', text: 'Cannot select past dates. Please select today or a future date.' })
      setSelectedDate('')
      return
    }

    if (!formData.dates.includes(selectedDate)) {
      setFormData(prev => ({
        ...prev,
        dates: [...prev.dates, selectedDate].sort()
      }))
      setSelectedDate('')
      setMessage({ type: '', text: '' }) // Clear any previous errors
    }
  }

  const removeDate = (dateToRemove) => {
    setFormData(prev => ({
      ...prev,
      dates: prev.dates.filter(d => d !== dateToRemove)
    }))
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatLeaveType = (type) => {
    const types = {
      'casual': 'Annual Leave',
      'medical': 'Medical',
      'halfday': 'Half Day',
      'short': 'Short'
    }
    return types[type] || type
  }

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  // Check if date is valid (not past, today onwards)
  const isValidDate = (dateStr) => {
    const selectedDate = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    selectedDate.setHours(0, 0, 0, 0)
    return selectedDate >= today
  }

  // Show both approved and pending leaves, filtered and sorted by date
  const allLeavesList = allLeaves
    .filter(l => {
      // Filter by status
      if (l.status !== 'approved' && l.status !== 'pending') return false
      
      // Filter by date if filter is set
      if (dateFilter) {
        if (l.dates && Array.isArray(l.dates)) {
          return l.dates.includes(dateFilter)
        }
        return false
      }
      
      return true
    })
    .sort((a, b) => {
      // Always sort by newest first
      const dateA = new Date(a.applied_at)
      const dateB = new Date(b.applied_at)
      return dateB - dateA
    })

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="public-layout">
      {/* Header */}
      <header className="public-header">
        <div className="header-content">
          <div className="header-logo">
            <Building2 size={28} />
          </div>
          <div className="header-text">
            <span className="header-dept">Department Of Physiotherapy</span>
            <h1>National Hospital Kandy</h1>
            <span className="header-subtitle">Leave Tracker</span>
          </div>
        </div>
      </header>

      <main className="public-main">
        {/* Today's Leaves - Prominent Section */}
        {todayLeaves.length > 0 && (
          <div className="today-leaves-section">
            <div className="today-header">
              <Clock size={20} />
              <h2>On Leave Today ({formatDate(new Date().toISOString())})</h2>
            </div>
            <div className="today-list">
              {todayLeaves.map(leave => (
                <div key={leave.id} className="today-item">
                  <span className="today-name">{leave.employee_name}</span>
                  <span className={`leave-type-badge ${leave.leave_type}`}>{formatLeaveType(leave.leave_type)}</span>
                  <span className={`status-badge ${leave.status}`}>{leave.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="public-grid">
          {/* Leave Application Form */}
          <div className="card">
            <div className="card-header">
              <h3>
                <CalendarDays size={18} />
                Apply for Leave
              </h3>
            </div>
            <div className="card-body">
              {message.text && (
                <div className={`alert alert-${message.type}`}>
                  {message.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  <span>{message.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Select the Name</label>
                  <div className="autocomplete-wrapper">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Type to search and select from list..."
                      value={formData.employee_name}
                      onChange={handleNameChange}
                      onFocus={() => formData.employee_name && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      ref={inputRef}
                      required
                    />
                    {showSuggestions && filteredEmployees.length > 0 && (
                      <div className="autocomplete-dropdown">
                        {filteredEmployees.map(emp => (
                          <div 
                            key={emp.id} 
                            className="autocomplete-item"
                            onClick={() => selectEmployee(emp.name)}
                          >
                            {emp.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {formData.employee_name && filteredEmployees.length === 0 && (
                      <div className="autocomplete-dropdown">
                        <div className="autocomplete-no-match">
                          No matching name found. Please select from the list.
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="form-hint">Start typing and select your name from the suggestions</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Leave Type</label>
                  <select
                    name="leave_type"
                    className="form-select"
                    value={formData.leave_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, leave_type: e.target.value }))}
                    required
                  >
                    <option value="">Select leave type...</option>
                    <option value="casual">Annual Leave</option>
                    <option value="medical">Medical Leave</option>
                    <option value="halfday">Half Day Leave</option>
                    <option value="short">Short Leave</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Day/Days</label>
                  <div className="date-picker-row">
                    <input
                      type="date"
                      className="form-input"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={getMinDate()}
                      style={{ flex: 1 }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={addDate}
                      disabled={!selectedDate}
                      style={{ marginLeft: '0.5rem' }}
                    >
                      <Plus size={18} />
                      Add
                    </button>
                  </div>
                  <p className="form-hint" style={{ marginTop: '0.5rem' }}>Select the date and press Add</p>
                  
                  {formData.dates.length > 0 && (
                    <div className="selected-dates-wrapper">
                      <div className="selected-dates">
                        {formData.dates.slice(0, 5).map(date => (
                          <div key={date} className="date-chip">
                            <span>{formatDate(date)}</span>
                            <button 
                              type="button" 
                              className="date-chip-remove"
                              onClick={() => removeDate(date)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        {formData.dates.length > 5 && (
                          <div 
                            className={`dates-more-tooltip-wrapper ${showTooltip ? 'tooltip-active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowTooltip(!showTooltip)
                            }}
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                          >
                            <span className="date-chip more-dates">
                              +{formData.dates.length - 5} more
                            </span>
                            <div className="dates-tooltip">
                              <strong>All selected dates ({formData.dates.length}):</strong>
                              <div className="tooltip-dates-list">
                                {formData.dates.map(date => (
                                  <span key={date} className="tooltip-date">{formatDate(date)}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {formData.dates.length > 0 && (
                    <p className="dates-count">
                      {formData.dates.length} day{formData.dates.length > 1 ? 's' : ''} selected
                    </p>
                  )}

                  {/* Date Conflicts Warning */}
                  {Object.keys(dateConflicts).length > 0 && (
                    <div className="conflict-warning">
                      <Clock size={16} />
                      <div className="conflict-content">
                        <strong>Leave Conflicts Detected:</strong>
                        {Object.entries(dateConflicts).map(([date, names]) => (
                          <div key={date} className="conflict-item">
                            <span className="conflict-date">{formatDate(date)}:</span>
                            <span className="conflict-text">
                              <span className="conflict-names">{names.join(', ')}</span> has requested leave on the selected date
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Reason (Optional)</label>
                  <textarea
                    name="reason"
                    className="form-textarea"
                    placeholder="Enter reason for leave..."
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Send size={18} />
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </form>
            </div>
          </div>

          {/* All Leaves List (Approved & Pending) */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3>
                <CalendarDays size={18} />
                All Leaves (Approved & Pending)
              </h3>
              <div className="filter-group-compact">
                <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type="date"
                  className="form-input-compact"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  placeholder="Filter by date"
                  title="Filter by date"
                />
                {dateFilter && (
                  <button
                    className="btn-icon-compact"
                    onClick={() => setDateFilter('')}
                    title="Clear filter"
                  >
                    <XIcon size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {allLeavesList.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <CalendarDays size={28} />
                  </div>
                  <p>No leaves applied yet</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Dates</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allLeavesList.map(leave => (
                        <tr key={leave.id}>
                          <td>
                            <span className="employee-cell-name">{leave.employee_name}</span>
                          </td>
                          <td>
                            <span className={`leave-type-badge ${leave.leave_type}`}>
                              {formatLeaveType(leave.leave_type)}
                            </span>
                          </td>
                          <td>
                            <div className="dates-list">
                              {leave.dates && leave.dates.slice(0, 2).map((date, idx) => (
                                <span key={idx} className="date-tag">
                                  {formatDate(date)}
                                </span>
                              ))}
                              {leave.dates && leave.dates.length > 2 && (
                                <span className="date-tag more">+{leave.dates.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${leave.status}`}>
                              {leave.status}
                            </span>
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
      </main>
    </div>
  )
}

export default PublicDashboard
