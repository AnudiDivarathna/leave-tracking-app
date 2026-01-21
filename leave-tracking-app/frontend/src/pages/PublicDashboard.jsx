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
  X as XIcon,
  History,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react'

function PublicDashboard({ user, onLogout }) {
  const [employees, setEmployees] = useState([])
  const [allLeaves, setAllLeaves] = useState([])
  const [todayLeaves, setTodayLeaves] = useState([])
  const [myLeaves, setMyLeaves] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [toast, setToast] = useState({ show: false, type: '', text: '' })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('apply') // 'apply' or 'history'
  const [historyMonth, setHistoryMonth] = useState(new Date())

  // Show toast notification
  const showToast = (type, text) => {
    setToast({ show: true, type, text })
    setTimeout(() => {
      setToast({ show: false, type: '', text: '' })
    }, 5000)
  }

  // Form state - employee_name is auto-set from user
  // selectedDates format: { '2024-01-15': { type: 'full_day' }, '2024-01-16': { type: 'half_day', period: 'morning' } }
  const [formData, setFormData] = useState({
    employee_name: user?.name || '',
    selectedDates: {},
    covering_officer: ''
  })

  // Autocomplete state for covering officer
  const [showCoveringSuggestions, setShowCoveringSuggestions] = useState(false)
  const [filteredCoveringOfficers, setFilteredCoveringOfficers] = useState([])
  const coveringInputRef = useRef(null)

  // Date picker state
  const [dateConflicts, setDateConflicts] = useState({})
  const [showTooltip, setShowTooltip] = useState(false)
  const [nameFilter, setNameFilter] = useState('') // Filter by name
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedLeaveType, setSelectedLeaveType] = useState('full_day') // 'full_day', 'half_am', 'half_pm'
  const calendarRef = useRef(null)

  useEffect(() => {
    fetchData()
    fetchMyLeaves()
  }, [])

  // Set employee name from user when user changes
  useEffect(() => {
    if (user?.name) {
      setFormData(prev => ({ ...prev, employee_name: user.name }))
    }
  }, [user])

  // Check for date conflicts whenever dates change
  useEffect(() => {
    if (Object.keys(formData.selectedDates || {}).length > 0 && formData.employee_name) {
      checkDateConflicts()
    } else {
      setDateConflicts({})
    }
  }, [formData.selectedDates, formData.employee_name, allLeaves])

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
      
      // Filter today's leaves (exclude rejected)
      const today = new Date()
      const todayStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate())
      const todayLeavesFiltered = leaves.filter(leave => {
        if (leave.dates && Array.isArray(leave.dates)) {
          return leave.dates.includes(todayStr) && leave.status !== 'rejected'
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

  const fetchMyLeaves = async () => {
    try {
      const res = await axios.get('/api/auth/my-leaves')
      setMyLeaves(Array.isArray(res?.data) ? res.data : [])
    } catch (err) {
      console.error('Error fetching my leaves:', err)
      setMyLeaves([])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Use the logged-in user's ID
    const employee = { id: user.id, name: user.name }
    const selectedDatesArray = Object.keys(formData.selectedDates || {})
    
    if (selectedDatesArray.length === 0) {
      showToast('error', 'Please select at least one date')
      return
    }

    // Validate covering officer is provided
    if (!formData.covering_officer) {
      showToast('error', 'Please select a covering officer')
      return
    }

    // Find covering officer
    const coveringOfficer = employees.find(emp => 
      emp.name.toLowerCase() === formData.covering_officer.toLowerCase()
    )

    if (!coveringOfficer) {
      showToast('error', 'Covering officer not found! Please select a valid name from the suggestions.')
      return
    }

    // Validate all dates are not past
    const invalidDates = selectedDatesArray.filter(date => !isValidDate(date))
    if (invalidDates.length > 0) {
      showToast('error', 'Cannot submit past dates. Please select today or future dates only.')
      return
    }

    // Group dates by leave type
    const fullDayDates = []
    const halfDayMorningDates = []
    const halfDayEveningDates = []
    
    selectedDatesArray.forEach(date => {
      const selection = formData.selectedDates[date]
      if (selection.type === 'full_day') {
        fullDayDates.push(date)
      } else if (selection.period === 'morning') {
        halfDayMorningDates.push(date)
      } else {
        halfDayEveningDates.push(date)
      }
    })

    // Check for conflicting leave applications on same dates
    const checkConflicts = (dates, leaveDuration, halfDayPeriod) => {
      const conflicts = []
      
      dates.forEach(date => {
        const existingLeaves = allLeaves.filter(leave => {
          if (leave.user_id?.toString() !== employee.id.toString() && leave.user_id !== employee.id) return false
          if (leave.status !== 'pending' && leave.status !== 'approved') return false
          if (!leave.dates || !Array.isArray(leave.dates)) return false
          return leave.dates.includes(date)
        })
        
        existingLeaves.forEach(leave => {
          // If existing leave is full day, can't apply for anything on that date
          if (!leave.leave_duration || leave.leave_duration === 'full_day') {
            conflicts.push({ date, reason: 'full day already applied' })
          }
          // If trying to apply full day, can't if any leave exists on that date
          else if (leaveDuration === 'full_day') {
            conflicts.push({ date, reason: 'half day already applied' })
          }
          // If trying to apply same half day period, conflict
          else if (leaveDuration === 'half_day' && leave.leave_duration === 'half_day' && leave.half_day_period === halfDayPeriod) {
            conflicts.push({ date, reason: `${halfDayPeriod === 'morning' ? '1st half' : '2nd half'} already applied` })
          }
        })
      })
      
      return conflicts
    }

    // Check conflicts for each type
    if (fullDayDates.length > 0) {
      const conflicts = checkConflicts(fullDayDates, 'full_day', null)
      if (conflicts.length > 0) {
        showToast('error', 'You have already applied for leave on one or more selected full day dates.')
        return
      }
    }
    if (halfDayMorningDates.length > 0) {
      const conflicts = checkConflicts(halfDayMorningDates, 'half_day', 'morning')
      if (conflicts.length > 0) {
        showToast('error', 'You have already applied for leave on one or more selected 1st half dates.')
        return
      }
    }
    if (halfDayEveningDates.length > 0) {
      const conflicts = checkConflicts(halfDayEveningDates, 'half_day', 'evening')
      if (conflicts.length > 0) {
        showToast('error', 'You have already applied for leave on one or more selected 2nd half dates.')
        return
      }
    }

    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const requests = []
      
      // Submit full day leaves
      if (fullDayDates.length > 0) {
        requests.push(axios.post('/api/leaves', {
          user_id: employee.id,
          leave_type: 'casual',
          dates: fullDayDates,
          covering_officer: formData.covering_officer,
          leave_duration: 'full_day',
          half_day_period: null
        }))
      }
      
      // Submit half day morning leaves
      if (halfDayMorningDates.length > 0) {
        requests.push(axios.post('/api/leaves', {
          user_id: employee.id,
          leave_type: 'casual',
          dates: halfDayMorningDates,
          covering_officer: formData.covering_officer,
          leave_duration: 'half_day',
          half_day_period: 'morning'
        }))
      }
      
      // Submit half day evening leaves
      if (halfDayEveningDates.length > 0) {
        requests.push(axios.post('/api/leaves', {
          user_id: employee.id,
          leave_type: 'casual',
          dates: halfDayEveningDates,
          covering_officer: formData.covering_officer,
          leave_duration: 'half_day',
          half_day_period: 'evening'
        }))
      }

      await Promise.all(requests)
      
      setMessage({ type: 'success', text: 'Leave application submitted successfully!' })
      showToast('success', 'Leave application submitted successfully!')
      setFormData({
        employee_name: user?.name || '',
        selectedDates: {},
        covering_officer: ''
      })
      
      // Refresh data
      fetchData()
      fetchMyLeaves()
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to submit leave application'
      setMessage({ type: 'error', text: errorMsg })
      showToast('error', errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCoveringOfficerChange = (e) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, covering_officer: value }))
    
    if (value.length > 0) {
      const filtered = employees.filter(emp => {
        // Exclude the logged-in user from the covering officer list
        if (emp.id === user?.id || emp.name === user?.name) {
          return false
        }
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

  const selectCoveringOfficer = (name) => {
    setFormData(prev => ({ ...prev, covering_officer: name }))
    setShowCoveringSuggestions(false)
  }

  const checkDateConflicts = () => {
    const conflicts = {}
    const currentEmployee = employees.find(emp => 
      emp.name.toLowerCase() === formData.employee_name.toLowerCase()
    )

    Object.keys(formData.selectedDates || {}).forEach(date => {
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
      showToast('error', 'Cannot select past dates. Please select today or a future date.')
      return
    }

    // Apply selected leave type or remove if already same type
    setFormData(prev => {
      const currentSelection = prev.selectedDates[dateStr]
      const newSelectedDates = { ...prev.selectedDates }
      
      // Determine what type to apply based on selectedLeaveType
      let newType = null
      if (selectedLeaveType === 'full_day') {
        newType = { type: 'full_day' }
      } else if (selectedLeaveType === 'half_am') {
        newType = { type: 'half_day', period: 'morning' }
      } else {
        newType = { type: 'half_day', period: 'evening' }
      }
      
      // Check if current selection matches what we're trying to apply
      const isSameType = currentSelection && 
        currentSelection.type === newType.type && 
        (currentSelection.type === 'full_day' || currentSelection.period === newType.period)
      
      if (isSameType) {
        // Remove if same type
        delete newSelectedDates[dateStr]
      } else {
        // Apply new type
        newSelectedDates[dateStr] = newType
      }
      
      return { ...prev, selectedDates: newSelectedDates }
    })
    
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
    setFormData(prev => {
      const newSelectedDates = { ...prev.selectedDates }
      delete newSelectedDates[dateToRemove]
      return { ...prev, selectedDates: newSelectedDates }
    })
  }

  // Get sorted array of selected dates
  const getSelectedDatesArray = () => {
    return Object.keys(formData.selectedDates || {}).sort()
  }

  // Get leave type label for a date
  const getDateTypeLabel = (dateStr) => {
    const selection = formData.selectedDates[dateStr]
    if (!selection) return ''
    if (selection.type === 'full_day') return ''
    if (selection.period === 'morning') return '8am-12pm'
    return '12pm-4pm'
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
      return leave.half_day_period === 'morning' ? '8am-12pm' : '12pm-4pm'
    }
    return leave.leave_duration
  }

  // Render status badge with icon
  const renderStatusBadge = (status) => {
    const iconSize = 12
    const iconStyle = { marginRight: '4px' }
    
    if (status === 'approved') {
      return (
        <span className={`status-badge ${status}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
          <CheckCircle size={iconSize} style={iconStyle} />
          {status}
        </span>
      )
    }
    if (status === 'rejected') {
      return (
        <span className={`status-badge ${status}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
          <XCircle size={iconSize} style={iconStyle} />
          {status}
        </span>
      )
    }
    if (status === 'pending') {
      return (
        <span className={`status-badge ${status}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
          <Clock size={iconSize} style={iconStyle} />
          {status}
        </span>
      )
    }
    return <span className={`status-badge ${status}`}>{status}</span>
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

  // Group leaves submitted together (within 10 seconds by same user)
  const groupLeavesBySubmission = (leaves) => {
    const grouped = []
    const processed = new Set()
    
    leaves.forEach(leave => {
      if (processed.has(leave.id)) return
      
      const leaveTime = new Date(leave.applied_at).getTime()
      
      // Find all leaves from same user within 10 seconds
      const relatedLeaves = leaves.filter(l => {
        if (processed.has(l.id)) return false
        if (l.user_id !== leave.user_id && l.employee_name !== leave.employee_name) return false
        const timeDiff = Math.abs(new Date(l.applied_at).getTime() - leaveTime)
        return timeDiff < 10000 // 10 seconds
      })
      
      // Mark all as processed
      relatedLeaves.forEach(l => processed.add(l.id))
      
      // Combine into one grouped leave
      const allDates = []
      const leaveTypes = []
      
      relatedLeaves.forEach(l => {
        if (l.dates && l.dates.length > 0) {
          l.dates.forEach(date => {
            const typeLabel = !l.leave_duration || l.leave_duration === 'full_day' 
              ? '' 
              : (l.half_day_period === 'morning' ? '8am-12pm' : '12pm-4pm')
            allDates.push({ date, type: typeLabel, leave: l })
          })
        }
        leaveTypes.push(formatLeaveDuration(l))
      })
      
      // Sort dates
      allDates.sort((a, b) => new Date(a.date) - new Date(b.date))
      
      grouped.push({
        id: leave.id,
        employee_name: leave.employee_name,
        user_id: leave.user_id,
        applied_at: leave.applied_at,
        status: leave.status,
        reason: leave.reason,
        covering_officer: leave.covering_officer,
        allDates: allDates,
        leaveTypes: [...new Set(leaveTypes)],
        originalLeaves: relatedLeaves
      })
    })
    
    return grouped
  }

  // Show both approved and pending leaves, filtered and sorted
  const filteredLeaves = (allLeaves || [])
    .filter(l => {
      // Filter by status
      if (l.status !== 'approved' && l.status !== 'pending') return false
      
      // Filter by name if filter is set
      if (nameFilter) {
        const employeeName = (l.employee_name || '').toLowerCase()
        const filterText = nameFilter.toLowerCase()
        if (!employeeName.includes(filterText)) return false
      }
      
      return true
    })
    .sort((a, b) => {
      // Sort by newest first
      const dateA = new Date(a.applied_at)
      const dateB = new Date(b.applied_at)
      return dateB - dateA
    })
  
  const allLeavesList = groupLeavesBySubmission(filteredLeaves)

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="public-layout">
      {/* Toast Notification */}
      {toast.show && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

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
        <button className="btn-logout" onClick={onLogout} title="Logout" style={{ marginLeft: 'auto' }}>
          <LogOut size={16} />
          <span style={{ fontSize: '0.8rem' }}>logout</span>
        </button>
      </header>

      <main className="public-main">
        {/* Today's Leaves - Prominent Section */}
        {(todayLeaves || []).length > 0 && (
          <div className="today-leaves-section">
            <div className="today-header">
              <Clock size={20} />
              <h2>On Leave Today ({formatDate(formatDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))})</h2>
            </div>
            <div className="today-list">
              {(todayLeaves || []).map(leave => (
                <div key={leave.id} className="today-item">
                  <span className="today-name">{leave.employee_name}</span>
                  {renderStatusBadge(leave.status)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="dashboard-tabs">
          <button 
            className={`tab-btn ${activeTab === 'apply' ? 'active' : ''}`}
            onClick={() => setActiveTab('apply')}
          >
            <CalendarDays size={18} />
            Apply for Leave
          </button>
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={18} />
            My Leave History
          </button>
        </div>

        {activeTab === 'apply' && (
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
                  <input
                    type="text"
                    className="form-input"
                    value={user?.name || ''}
                    disabled
                    style={{ 
                      backgroundColor: 'var(--color-bg)', 
                      color: 'var(--color-primary)',
                      fontWeight: '500',
                      cursor: 'not-allowed'
                    }}
                  />
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
                  <label className="form-label">
                    Select Day/Days
                    <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-muted)', display: 'block', marginTop: '0.25rem' }}>
                      (First select type on top, then tap the date)
                    </span>
                  </label>
                  <div className="custom-calendar-wrapper" ref={calendarRef}>
                    <button
                      type="button"
                      className="form-input calendar-trigger"
                      onClick={() => setShowCalendar(!showCalendar)}
                      style={{ textAlign: 'left', cursor: 'pointer' }}
                    >
                      <CalendarDays size={18} style={{ marginRight: '0.5rem', display: 'inline-block', verticalAlign: 'middle' }} />
                      {getSelectedDatesArray().length > 0 
                        ? `${getSelectedDatesArray().length} date${getSelectedDatesArray().length > 1 ? 's' : ''} selected`
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
                        {/* Leave Type Selector */}
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '0.5rem' }}>
                          Select leave type, then tap dates:
                        </p>
                        <div className="leave-type-selector" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedLeaveType('full_day')}
                            className={`leave-type-btn ${selectedLeaveType === 'full_day' ? 'active' : ''}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '20px',
                              border: selectedLeaveType === 'full_day' ? '2px solid var(--color-primary)' : '1px solid #ddd',
                              background: selectedLeaveType === 'full_day' ? '#e8f5f0' : 'white',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: selectedLeaveType === 'full_day' ? '600' : '400'
                            }}
                          >
                            <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}></span>
                            <span>Full Day</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedLeaveType('half_am')}
                            className={`leave-type-btn ${selectedLeaveType === 'half_am' ? 'active' : ''}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '20px',
                              border: selectedLeaveType === 'half_am' ? '2px solid var(--color-primary)' : '1px solid #ddd',
                              background: selectedLeaveType === 'half_am' ? '#e8f5f0' : 'white',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: selectedLeaveType === 'half_am' ? '600' : '400'
                            }}
                          >
                            <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'linear-gradient(to right, var(--color-primary) 50%, #f0f0f0 50%)', border: '1px solid var(--color-primary)' }}></span>
                            <span>8am-12pm</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedLeaveType('half_pm')}
                            className={`leave-type-btn ${selectedLeaveType === 'half_pm' ? 'active' : ''}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '20px',
                              border: selectedLeaveType === 'half_pm' ? '2px solid var(--color-primary)' : '1px solid #ddd',
                              background: selectedLeaveType === 'half_pm' ? '#e8f5f0' : 'white',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: selectedLeaveType === 'half_pm' ? '600' : '400'
                            }}
                          >
                            <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'linear-gradient(to right, #f0f0f0 50%, var(--color-primary) 50%)', border: '1px solid var(--color-primary)' }}></span>
                            <span>12pm-4pm</span>
                          </button>
                        </div>
                        <div className="calendar-days">
                          {getCalendarDays().map((dayData, idx) => {
                            if (!dayData) {
                              return <div key={`empty-${idx}`} className="calendar-day empty"></div>
                            }
                            
                            const selection = formData.selectedDates[dayData.dateStr]
                            const isPast = !isValidDate(dayData.dateStr)
                            const today = new Date()
                            const todayStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate())
                            const isToday = dayData.dateStr === todayStr
                            
                            // Determine class based on selection type
                            let selectionClass = ''
                            if (selection) {
                              if (selection.type === 'full_day') {
                                selectionClass = 'selected-full'
                              } else if (selection.period === 'morning') {
                                selectionClass = 'selected-half-am'
                              } else {
                                selectionClass = 'selected-half-pm'
                              }
                            }
                            
                            return (
                              <button
                                key={dayData.dateStr}
                                type="button"
                                className={`calendar-day ${selectionClass} ${isPast ? 'past' : ''} ${isToday ? 'today' : ''}`}
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
                  
                  {getSelectedDatesArray().length > 0 && (
                    <div className="selected-dates-wrapper">
                      <div className="selected-dates">
                        {getSelectedDatesArray().slice(0, 5).map(date => {
                          const typeLabel = getDateTypeLabel(date)
                          return (
                            <div key={date} className="date-chip">
                              <span>{formatDate(date)}</span>
                              {typeLabel && <span className="chip-type">{typeLabel}</span>}
                              <button 
                                type="button" 
                                className="date-chip-remove"
                                onClick={() => removeDate(date)}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )
                        })}
                        {getSelectedDatesArray().length > 5 && (
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
                              +{getSelectedDatesArray().length - 5} more
                            </span>
                            <div className="dates-tooltip">
                              <strong>All selected dates ({getSelectedDatesArray().length}):</strong>
                              <div className="tooltip-dates-list">
                                {getSelectedDatesArray().map(date => {
                                  const typeLabel = getDateTypeLabel(date)
                                  return (
                                    <span key={date} className="tooltip-date">
                                      {formatDate(date)}{typeLabel ? ` (${typeLabel})` : ''}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {getSelectedDatesArray().length > 0 && (
                    <p className="dates-count">
                      {getSelectedDatesArray().length} day{getSelectedDatesArray().length > 1 ? 's' : ''} selected
                    </p>
                  )}

                  {/* Date Conflicts Warning */}
                  {Object.keys(dateConflicts).length > 0 && (
                    <div className="conflict-warning">
                      <Clock size={16} />
                      <div className="conflict-content">
                        <strong>Overlapping leaves Detected:</strong>
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
            <div className="filters-container" style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
              <div className="filters-row">
                <div className="filter-group-compact" style={{ maxWidth: '300px', margin: '0 auto' }}>
                  <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type="text"
                    className="form-input-compact"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    placeholder="Filter by name"
                    title="Filter by name"
                    style={{ flex: 1 }}
                  />
                  {nameFilter && (
                    <button
                      className="btn-icon-compact"
                      onClick={() => setNameFilter('')}
                      title="Clear name filter"
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                </div>
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
                        <th>State</th>
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
                              {leave.allDates && leave.allDates.slice(0, 3).map((item, idx) => (
                                <span key={idx} className="date-tag">
                                  {formatDate(item.date)}{item.type ? ` (${item.type})` : ''}
                                </span>
                              ))}
                              {leave.allDates && leave.allDates.length > 3 && (
                                <span className="date-tag more">+{leave.allDates.length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            {renderStatusBadge(leave.status)}
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
        )}

        {activeTab === 'history' && (
          <div className="public-grid" style={{ display: 'block' }}>
            <div className="card" style={{ width: '100%' }}>
              <div className="card-header">
                <h3>
                  <History size={18} />
                  My Leave History
                </h3>
              </div>
              <div className="card-body">
                {/* History Calendar */}
                <div className="history-calendar" style={{ width: '100%', boxSizing: 'border-box' }}>
                  <div className="history-calendar-header">
                    <button 
                      type="button" 
                      className="calendar-nav-btn"
                      onClick={() => setHistoryMonth(prev => {
                        const newDate = new Date(prev)
                        newDate.setMonth(prev.getMonth() - 1)
                        return newDate
                      })}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <h4 className="calendar-month-year">
                      {historyMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h4>
                    <button 
                      type="button" 
                      className="calendar-nav-btn"
                      onClick={() => setHistoryMonth(prev => {
                        const newDate = new Date(prev)
                        newDate.setMonth(prev.getMonth() + 1)
                        return newDate
                      })}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  
                  <div className="history-legend" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}></span>
                      <span>Full Day</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'linear-gradient(to right, var(--color-primary) 50%, #f0f0f0 50%)', border: '1px solid var(--color-primary)' }}></span>
                      <span>8am-12pm</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'linear-gradient(to right, #f0f0f0 50%, var(--color-primary) 50%)', border: '1px solid var(--color-primary)' }}></span>
                      <span>12pm-4pm</span>
                    </div>
                  </div>

                  <div className="calendar-weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="calendar-weekday">{day}</div>
                    ))}
                  </div>
                  <div className="calendar-days">
                    {(() => {
                      const year = historyMonth.getFullYear()
                      const month = historyMonth.getMonth()
                      const firstDay = new Date(year, month, 1)
                      const lastDay = new Date(year, month + 1, 0)
                      const daysInMonth = lastDay.getDate()
                      const startingDayOfWeek = firstDay.getDay()
                      
                      const days = []
                      
                      // Add empty cells for days before the first day of the month
                      for (let i = 0; i < startingDayOfWeek; i++) {
                        days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>)
                      }
                      
                      // Add all days of the month
                      for (let day = 1; day <= daysInMonth; day++) {
                        const dateStr = formatDateString(year, month, day)
                        
                        // Find leave for this date (show both approved and pending)
                        const leaveForDate = (myLeaves || []).find(leave => 
                          leave.dates && leave.dates.includes(dateStr) && 
                          (leave.status === 'approved' || leave.status === 'pending')
                        )
                        
                        let dayClass = 'calendar-day history-day'
                        let tooltip = ''
                        
                        if (leaveForDate) {
                          const isHalfDay = leaveForDate.leave_duration === 'half_day'
                          if (isHalfDay) {
                            dayClass += leaveForDate.half_day_period === 'morning' ? ' history-half-1st' : ' history-half-2nd'
                            tooltip = leaveForDate.half_day_period === 'morning' ? '8am-12pm' : '12pm-4pm'
                          } else {
                            dayClass += ' history-full'
                            tooltip = 'Full Day'
                          }
                        }
                        
                        days.push(
                          <div 
                            key={dateStr} 
                            className={dayClass}
                            title={tooltip}
                          >
                            {day}
                          </div>
                        )
                      }
                      
                      return days
                    })()}
                  </div>
                </div>

                {/* Leave History List */}
                <div className="history-list" style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Recent Leave Applications
                  </h4>
                  {(myLeaves || []).length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <CalendarDays size={28} />
                      </div>
                      <p>No leave applications yet</p>
                    </div>
                  ) : (
                    <div className="table-container" style={{ maxHeight: '400px' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Dates</th>
                            <th>Applied</th>
                            <th>State</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupLeavesBySubmission((myLeaves || []).sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at))).map(leave => (
                            <tr key={leave.id}>
                              <td>
                                <div className="dates-list">
                                  {leave.allDates && leave.allDates.slice(0, 3).map((item, idx) => (
                                    <span key={idx} className="date-tag">
                                      {formatDate(item.date)}{item.type ? ` (${item.type})` : ''}
                                    </span>
                                  ))}
                                  {leave.allDates && leave.allDates.length > 3 && (
                                    <span className="date-tag more">+{leave.allDates.length - 3}</span>
                                  )}
                                </div>
                              </td>
                              <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                {leave.applied_at ? new Date(leave.applied_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : '-'}
                              </td>
                              <td>
                                {renderStatusBadge(leave.status)}
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
          </div>
        )}
      </main>
    </div>
  )
}

export default PublicDashboard
