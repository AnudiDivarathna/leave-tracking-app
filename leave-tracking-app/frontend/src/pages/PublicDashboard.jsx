import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { 
  CalendarDays, 
  Send, 
  CheckCircle,
  XCircle,
  X,
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
    dates: [],
    reason: '',
    covering_officer: '',
    leave_duration: 'full_day', // 'full_day' or 'half_day'
    half_day_period: '' // 'morning' or 'evening' - only for half_day
  })

  // Autocomplete state for employee name
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const inputRef = useRef(null)

  // Autocomplete state for covering officer
  const [showCoveringSuggestions, setShowCoveringSuggestions] = useState(false)
  const [filteredCoveringOfficers, setFilteredCoveringOfficers] = useState([])
  const coveringInputRef = useRef(null)

  // Date picker state
  const [dateConflicts, setDateConflicts] = useState({})
  const [showTooltip, setShowTooltip] = useState(false)
  const [dateFilter, setDateFilter] = useState('') // Filter by date
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const calendarRef = useRef(null)

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

  // Close calendar when clicking outside
  useEffect(() => {
    if (showCalendar) {
      const handleClickOutside = (e) => {
        if (calendarRef.current && !calendarRef.current.contains(e.target)) {
          setShowCalendar(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCalendar])

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
      const today = new Date()
      const todayStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate())
      const todayLeavesFiltered = leaves.filter(leave => {
        if (leave.dates && Array.isArray(leave.dates)) {
          return leave.dates.includes(todayStr)
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

    // Validate covering officer is provided
    if (!formData.covering_officer) {
      setMessage({ type: 'error', text: 'Please select a covering officer' })
      return
    }

    // Find covering officer
    const coveringOfficer = employees.find(emp => 
      emp.name.toLowerCase() === formData.covering_officer.toLowerCase()
    )

    if (!coveringOfficer) {
      setMessage({ type: 'error', text: 'Covering officer not found! Please select a valid name from the suggestions.' })
      return
    }

    // Validate all dates are not past
    const invalidDates = formData.dates.filter(date => !isValidDate(date))
    if (invalidDates.length > 0) {
      setMessage({ type: 'error', text: 'Cannot submit past dates. Please select today or future dates only.' })
      return
    }

    // Validate half day period if half day is selected
    if (formData.leave_duration === 'half_day' && !formData.half_day_period) {
      setMessage({ type: 'error', text: 'Please select 8 am - 12 pm or 12 pm to 4 pm for half day leave' })
      return
    }

    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {

      await axios.post('/api/leaves', {
        user_id: employee.id,
        leave_type: 'casual', // Default to casual (Annual Leave)
        dates: formData.dates,
        reason: formData.reason,
        covering_officer: formData.covering_officer,
        leave_duration: formData.leave_duration,
        half_day_period: formData.leave_duration === 'half_day' ? formData.half_day_period : null
      })
      
      setMessage({ type: 'success', text: 'Leave application submitted successfully!' })
      setFormData({
        employee_name: '',
        dates: [],
        reason: '',
        covering_officer: '',
        leave_duration: 'full_day',
        half_day_period: ''
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
      const filtered = employees.filter(emp => {
        const nameMatch = emp.name.toLowerCase().includes(value.toLowerCase())
        const paysheetMatch = emp.paysheet_number && emp.paysheet_number.includes(value)
        return nameMatch || paysheetMatch
      })
      setFilteredEmployees(filtered)
      setShowSuggestions(true)
    } else {
      setFilteredEmployees([])
      setShowSuggestions(false)
    }
  }

  const handleCoveringOfficerChange = (e) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, covering_officer: value }))
    
    if (value.length > 0) {
      const filtered = employees.filter(emp => {
        const nameMatch = emp.name.toLowerCase().includes(value.toLowerCase())
        const paysheetMatch = emp.paysheet_number && emp.paysheet_number.includes(value)
        return nameMatch || paysheetMatch
      })
      setFilteredCoveringOfficers(filtered)
      setShowCoveringSuggestions(true)
    } else {
      setFilteredCoveringOfficers([])
      setShowCoveringSuggestions(false)
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

  const selectCoveringOfficer = (name) => {
    setFormData(prev => ({ ...prev, covering_officer: name }))
    setShowCoveringSuggestions(false)
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

  const toggleDate = (dateStr) => {
    // Validate date is not past
    if (!isValidDate(dateStr)) {
      setMessage({ type: 'error', text: 'Cannot select past dates. Please select today or a future date.' })
      return
    }

    // Toggle date: if already selected, remove it; otherwise add it
    if (formData.dates.includes(dateStr)) {
      setFormData(prev => ({
        ...prev,
        dates: prev.dates.filter(d => d !== dateStr)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        dates: [...prev.dates, dateStr].sort()
      }))
    }
    
    setMessage({ type: '', text: '' }) // Clear any previous errors
  }

  // Format date to YYYY-MM-DD without timezone issues
  const formatDateString = (year, month, day) => {
    const monthStr = String(month + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    return `${year}-${monthStr}-${dayStr}`
  }

  // Generate calendar days for current month
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = formatDateString(year, month, day) // Use local date formatting
      days.push({
        day,
        dateStr,
        date
      })
    }
    
    return days
  }

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
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

  const formatLeaveDuration = (leave) => {
    if (!leave.leave_duration || leave.leave_duration === 'full_day') {
      return 'Full Day'
    }
    if (leave.leave_duration === 'half_day') {
      return 'Half Day'
    }
    return leave.leave_duration
  }

  // Get minimum date (today) - formatted as YYYY-MM-DD
  const getMinDate = () => {
    const today = new Date()
    return formatDateString(today.getFullYear(), today.getMonth(), today.getDate())
  }

  // Check if date is valid (not past, today onwards)
  const isValidDate = (dateStr) => {
    // Parse YYYY-MM-DD string and compare with today
    const [year, month, day] = dateStr.split('-').map(Number)
    const selectedDate = new Date(year, month - 1, day)
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
            <img src="/logo.png" alt="Government of Sri Lanka" />
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
              <h2>On Leave Today ({formatDate(formatDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))})</h2>
            </div>
            <div className="today-list">
              {todayLeaves.map(leave => (
                <div key={leave.id} className="today-item">
                  <span className="today-name">{leave.employee_name}</span>
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
                  <label className="form-label">Name of the Physiotherapist</label>
                  <div className="autocomplete-wrapper">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter Name/ Paysheet No to select"
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
                            <span>{emp.name}</span>
                            {emp.paysheet_number && (
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                                ({emp.paysheet_number})
                              </span>
                            )}
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
                </div>

                <div className="form-group">
                  <label className="form-label">Covering Physiotherapist</label>
                  <div className="autocomplete-wrapper">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter Name/ Paysheet No to select"
                      value={formData.covering_officer}
                      onChange={handleCoveringOfficerChange}
                      onFocus={() => formData.covering_officer && setShowCoveringSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCoveringSuggestions(false), 200)}
                      ref={coveringInputRef}
                      required
                    />
                    {showCoveringSuggestions && filteredCoveringOfficers.length > 0 && (
                      <div className="autocomplete-dropdown">
                        {filteredCoveringOfficers.map(emp => (
                          <div 
                            key={emp.id} 
                            className="autocomplete-item"
                            onClick={() => selectCoveringOfficer(emp.name)}
                          >
                            <span>{emp.name}</span>
                            {emp.paysheet_number && (
                              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                                ({emp.paysheet_number})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {formData.covering_officer && filteredCoveringOfficers.length === 0 && (
                      <div className="autocomplete-dropdown">
                        <div className="autocomplete-no-match">
                          No matching name found. Please select from the list.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Leave Type</label>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="leave_duration"
                        value="full_day"
                        checked={formData.leave_duration === 'full_day'}
                        onChange={(e) => setFormData(prev => ({ ...prev, leave_duration: e.target.value, half_day_period: '' }))}
                      />
                      <span>Full Day</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="leave_duration"
                        value="half_day"
                        checked={formData.leave_duration === 'half_day'}
                        onChange={(e) => setFormData(prev => ({ ...prev, leave_duration: e.target.value }))}
                      />
                      <span>Half Day</span>
                    </label>
                  </div>
                  {formData.leave_duration === 'half_day' && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label className="form-label">Half Day Period</label>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="half_day_period"
                            value="morning"
                            checked={formData.half_day_period === 'morning'}
                            onChange={(e) => setFormData(prev => ({ ...prev, half_day_period: e.target.value }))}
                          />
                          <span>8 am - 12 pm</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="half_day_period"
                            value="evening"
                            checked={formData.half_day_period === 'evening'}
                            onChange={(e) => setFormData(prev => ({ ...prev, half_day_period: e.target.value }))}
                          />
                          <span>12 pm to 4 pm</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Select Day/Days</label>
                  <div className="custom-calendar-wrapper" ref={calendarRef}>
                    <button
                      type="button"
                      className="form-input calendar-trigger"
                      onClick={() => setShowCalendar(!showCalendar)}
                      style={{ textAlign: 'left', cursor: 'pointer' }}
                    >
                      <CalendarDays size={18} style={{ marginRight: '0.5rem', display: 'inline-block', verticalAlign: 'middle' }} />
                      {formData.dates.length > 0 
                        ? `${formData.dates.length} date${formData.dates.length > 1 ? 's' : ''} selected`
                        : 'Click to select dates'
                      }
                    </button>
                    
                    {showCalendar && (
                      <>
                        <div className="calendar-backdrop" onClick={() => setShowCalendar(false)}></div>
                        <div className="custom-calendar">
                        <div className="calendar-header">
                          <button 
                            type="button" 
                            className="calendar-nav-btn"
                            onClick={() => navigateMonth(-1)}
                          >
                            ←
                          </button>
                          <h4 className="calendar-month-year">
                            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </h4>
                          <button 
                            type="button" 
                            className="calendar-nav-btn"
                            onClick={() => navigateMonth(1)}
                          >
                            →
                          </button>
                        </div>
                        <div className="calendar-weekdays">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="calendar-weekday">{day}</div>
                          ))}
                        </div>
                        <div className="calendar-days">
                          {getCalendarDays().map((dayData, idx) => {
                            if (!dayData) {
                              return <div key={`empty-${idx}`} className="calendar-day empty"></div>
                            }
                            
                            const isSelected = formData.dates.includes(dayData.dateStr)
                            const isPast = !isValidDate(dayData.dateStr)
                            const today = new Date()
                            const todayStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate())
                            const isToday = dayData.dateStr === todayStr
                            
                            return (
                              <button
                                key={dayData.dateStr}
                                type="button"
                                className={`calendar-day ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''} ${isToday ? 'today' : ''}`}
                                onClick={() => !isPast && toggleDate(dayData.dateStr)}
                                disabled={isPast}
                              >
                                {dayData.day}
                              </button>
                            )
                          })}
                        </div>
                        <div className="calendar-footer">
                          <button
                            type="button"
                            className="btn btn-primary calendar-done-btn"
                            onClick={() => setShowCalendar(false)}
                          >
                            Done
                          </button>
                        </div>
                      </div>
                      </>
                    )}
                  </div>
                  
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
            <div className="card-header">
              <h3>
                <CalendarDays size={18} />
                All Leaves (Approved & Pending)
              </h3>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
              <div className="filter-group-compact" style={{ width: '250px', justifyContent: 'center' }}>
                <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1 }}>
                  <input
                    type="date"
                    className="form-input-compact"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    title="Filter by date"
                    style={{ color: dateFilter ? 'var(--color-text)' : 'transparent', width: '100%' }}
                  />
                  {!dateFilter && (
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.85rem',
                      color: 'var(--color-text-muted)',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap'
                    }}>
                      Filter by date
                    </span>
                  )}
                </div>
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
                        <th>Dates</th>
                        <th>Leave Type</th>
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
                            <span className="leave-type-badge">{formatLeaveDuration(leave)}</span>
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
