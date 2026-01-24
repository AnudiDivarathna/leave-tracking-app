import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  Users, 
  CalendarDays, 
  Clock, 
  CheckCircle, 
  XCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Building2,
  Filter,
  X as XIcon
} from 'lucide-react'

function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [employees, setEmployees] = useState([])
  const [allLeaves, setAllLeaves] = useState([])
  const [expandedEmployee, setExpandedEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTooltip, setActiveTooltip] = useState(null)
  const [employeeNameFilter, setEmployeeNameFilter] = useState('') // Filter by employee name for employees section
  const [dateFilter, setDateFilter] = useState('') // Filter by date for recently applied leaves
  const [recentNameFilter, setRecentNameFilter] = useState('') // Filter by name for recently applied leaves
  const [updatingLeaveId, setUpdatingLeaveId] = useState(null) // Track which leave is being updated

  useEffect(() => {
    fetchData()
  }, [])

  // Close tooltip when clicking outside
  useEffect(() => {
    if (activeTooltip) {
      const handleClickOutside = (e) => {
        if (!e.target.closest('.dates-more-tooltip-wrapper')) {
          setActiveTooltip(null)
        }
      }
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [activeTooltip])

  const fetchData = async () => {
    try {
      const [statsRes, employeesRes, leavesRes] = await Promise.all([
        axios.get('/api/stats/overview'),
        axios.get('/api/stats/employees'),
        axios.get('/api/leaves')
      ])
      
      // Ensure data is always the correct type, even if API returns error or undefined
      setStats(statsRes?.data || null)
      setEmployees(Array.isArray(employeesRes?.data) ? employeesRes.data : [])
      setAllLeaves(Array.isArray(leavesRes?.data) ? leavesRes.data : [])
    } catch (err) {
      console.error('Error fetching data:', err)
      // Set default values on error to prevent filter errors
      setStats(null)
      setEmployees([])
      setAllLeaves([])
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (leaveId, status) => {
    // Set loading state for this specific leave
    setUpdatingLeaveId(leaveId)
    
    // Optimistic update - immediately update UI
    const previousLeaves = [...allLeaves]
    setAllLeaves(prev => prev.map(leave => 
      leave.id === leaveId ? { ...leave, status } : leave
    ))
    
    try {
      // Use the leaves-status endpoint that accepts ID in body
      await axios.patch('/api/leaves-status', { id: leaveId, status })
      // Refetch stats to update the counts in stat cards and employee leave summary
      try {
        const [statsRes, employeesRes] = await Promise.all([
          axios.get('/api/stats/overview'),
          axios.get('/api/stats/employees')
        ])
        setStats(statsRes?.data || null)
        setEmployees(Array.isArray(employeesRes?.data) ? employeesRes.data : [])
      } catch (statsErr) {
        console.error('Error fetching updated stats:', statsErr)
        // Don't fail the whole operation if stats fetch fails
      }
    } catch (err) {
      console.error('Error updating status:', err)
      // Revert on error
      setAllLeaves(previousLeaves)
      alert(`Failed to ${status} leave. Please try again.`)
    } finally {
      setUpdatingLeaveId(null)
    }
  }

  // Handle status update for grouped leaves (updates all related leaves)
  const handleGroupedStatusUpdate = async (groupedLeave, status) => {
    const leaveIds = groupedLeave.originalLeaves.map(l => l.id)
    
    // Set loading state
    setUpdatingLeaveId(groupedLeave.id)
    
    // Optimistic update
    const previousLeaves = [...allLeaves]
    setAllLeaves(prev => prev.map(leave => 
      leaveIds.includes(leave.id) ? { ...leave, status } : leave
    ))
    
    try {
      // Update all related leaves
      await Promise.all(leaveIds.map(id => 
        axios.patch('/api/leaves-status', { id, status })
      ))
      
      // Refetch data to ensure counts are accurate
      try {
        const [statsRes, employeesRes, leavesRes] = await Promise.all([
          axios.get('/api/stats/overview'),
          axios.get('/api/stats/employees'),
          axios.get('/api/leaves')
        ])
        setStats(statsRes?.data || null)
        setEmployees(Array.isArray(employeesRes?.data) ? employeesRes.data : [])
        setAllLeaves(Array.isArray(leavesRes?.data) ? leavesRes.data : [])
      } catch (statsErr) {
        console.error('Error fetching updated data:', statsErr)
      }
    } catch (err) {
      console.error('Error updating status:', err)
      setAllLeaves(previousLeaves)
      alert(`Failed to ${status} leave. Please try again.`)
    } finally {
      setUpdatingLeaveId(null)
    }
  }

  const getEmployeeLeaves = (userId) => {
    return filteredLeaves
      .filter(leave => leave.user_id === userId)
      .sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at))
  }

  // Get employee leaves flattened by date (each date is a separate row)
  const getEmployeeLeaveDates = (userId) => {
    const leaves = filteredLeaves.filter(leave => leave.user_id === userId)
    const datewise = []
    
    leaves.forEach(leave => {
      if (leave.dates && Array.isArray(leave.dates)) {
        leave.dates.forEach(date => {
          datewise.push({
            id: `${leave.id}-${date}`,
            date: date,
            status: leave.status,
            leave_duration: leave.leave_duration,
            half_day_period: leave.half_day_period,
            covering_officer: leave.covering_officer,
            applied_at: leave.applied_at
          })
        })
      }
    })
    
    // Sort by date descending (newest first)
    return datewise.sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  // Get total date count for an employee (not record count)
  const getEmployeeTotalDateCount = (userId) => {
    const leaves = (Array.isArray(allLeaves) ? allLeaves : []).filter(leave => leave.user_id === userId)
    let totalDates = 0
    leaves.forEach(leave => {
      if (leave.dates && Array.isArray(leave.dates)) {
        totalDates += leave.dates.length
      }
    })
    return totalDates
  }

  // Get pending date count for an employee
  const getEmployeePendingDateCount = (userId) => {
    const leaves = (Array.isArray(allLeaves) ? allLeaves : []).filter(leave => 
      leave.user_id === userId && leave.status === 'pending'
    )
    let totalDates = 0
    leaves.forEach(leave => {
      if (leave.dates && Array.isArray(leave.dates)) {
        totalDates += leave.dates.length
      }
    })
    return totalDates
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeAgo = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
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

  // Get status icon
  const getStatusIcon = (status) => {
    const iconSize = 16
    const iconStyle = { marginRight: '6px', verticalAlign: 'middle' }
    
    if (status === 'approved') {
      return <CheckCircle size={iconSize} style={iconStyle} color="var(--color-success)" />
    }
    if (status === 'rejected') {
      return <XCircle size={iconSize} style={iconStyle} color="var(--color-danger)" />
    }
    if (status === 'pending') {
      return <Clock size={iconSize} style={iconStyle} color="var(--color-warning)" />
    }
    return null
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

  // Render dates with tooltip
  const renderDatesWithTooltip = (dates, maxVisible = 3, tooltipId, leave = null) => {
    if (!dates || !Array.isArray(dates) || dates.length === 0) return null
    
    const visibleDates = dates.slice(0, maxVisible)
    const remainingCount = dates.length - maxVisible
    
    // Get type suffix for half-day leaves
    const getTypeSuffix = () => {
      if (!leave || !leave.leave_duration || leave.leave_duration === 'full_day') return ''
      return leave.half_day_period === 'morning' ? ' (8am-12pm)' : ' (12pm-4pm)'
    }
    const typeSuffix = getTypeSuffix()
    
    return (
      <div className="dates-list">
        {visibleDates.map((date, idx) => (
          <span key={idx} className="date-tag">
            {formatDate(date)}{typeSuffix}
          </span>
        ))}
        {remainingCount > 0 && (
          <div 
            className={`dates-more-tooltip-wrapper ${activeTooltip === tooltipId ? 'tooltip-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              setActiveTooltip(activeTooltip === tooltipId ? null : tooltipId)
            }}
            onMouseEnter={() => setActiveTooltip(tooltipId)}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <span className="date-tag more">
              +{remainingCount} more
            </span>
            <div className="dates-tooltip">
              <strong>All selected dates ({dates.length}):</strong>
              <div className="tooltip-dates-list">
                {dates.map((date, idx) => (
                  <span key={idx} className="tooltip-date">{formatDate(date)}{typeSuffix}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Filter and sort leaves - ensure allLeaves is always an array
  const filteredLeaves = (Array.isArray(allLeaves) ? allLeaves : [])
    .filter(leave => {
      // Filter by employee name
      if (employeeNameFilter) {
        const employeeName = (leave.employee_name || '').toLowerCase()
        const filterText = employeeNameFilter.toLowerCase()
        if (!employeeName.includes(filterText)) return false
      }
      
      return true
    })
    .sort((a, b) => {
      // Sort by applied_at, newest first
      const dateA = new Date(a.applied_at)
      const dateB = new Date(b.applied_at)
      return dateB - dateA
    })

  // Filter and sort pending leaves
  const pendingLeaves = filteredLeaves
    .filter(l => l.status === 'pending')
    .sort((a, b) => {
      // Sort by newest first
      const dateA = new Date(a.applied_at)
      const dateB = new Date(b.applied_at)
      return dateB - dateA
    })
  
  // Filter recent leaves by date and name, then sort
  const recentLeaves = filteredLeaves
    .filter(leave => {
      // Filter by date if filter is set
      if (dateFilter) {
        if (leave.dates && Array.isArray(leave.dates)) {
          if (!leave.dates.includes(dateFilter)) return false
        } else {
          return false
        }
      }
      
      // Filter by name if filter is set
      if (recentNameFilter) {
        const employeeName = (leave.employee_name || '').toLowerCase()
        const filterText = recentNameFilter.toLowerCase()
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
    .slice(0, 10)
  
  // Filter employees by name
  const filteredEmployees = employees.filter(employee => {
    if (!employeeNameFilter) return true
    const employeeName = (employee.name || '').toLowerCase()
    const filterText = employeeNameFilter.toLowerCase()
    return employeeName.includes(filterText)
  })

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
      
      relatedLeaves.forEach(l => {
        if (l.dates && l.dates.length > 0) {
          l.dates.forEach(date => {
            const typeLabel = !l.leave_duration || l.leave_duration === 'full_day' 
              ? '' 
              : (l.half_day_period === 'morning' ? '8am-12pm' : '12pm-4pm')
            allDates.push({ date, type: typeLabel, leave: l })
          })
        }
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
        originalLeaves: relatedLeaves
      })
    })
    
    return grouped
  }

  // Grouped versions of leaves
  const groupedPendingLeaves = groupLeavesBySubmission(pendingLeaves)
  const groupedRecentLeaves = groupLeavesBySubmission(recentLeaves)
  
  // Calculate grouped counts for approved and rejected leaves (from all leaves, not filtered)
  const approvedLeaves = (Array.isArray(allLeaves) ? allLeaves : []).filter(l => l.status === 'approved')
  const rejectedLeaves = (Array.isArray(allLeaves) ? allLeaves : []).filter(l => l.status === 'rejected')
  const groupedApprovedLeaves = groupLeavesBySubmission(approvedLeaves)
  const groupedRejectedLeaves = groupLeavesBySubmission(rejectedLeaves)

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="admin-layout">
      {/* Header */}
      <header className="admin-header">
        <div className="header-content">
          <div className="header-logo">
            <img src="/logo.png" alt="Government of Sri Lanka" />
          </div>
          <div className="header-text">
            <span className="header-dept">Department Of Physiotherapy</span>
            <h1>National Hospital Kandy</h1>
            <span className="header-subtitle">Leave Tracker - Admin Panel</span>
          </div>
        </div>
      </header>

      <main className="admin-main">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon primary">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats?.totalEmployees || 0}</h3>
              <p>Total Physiotherapists</p>
            </div>
          </div>

          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #fff5e6 0%, #fff 100%)', border: '2px solid var(--color-warning)' }}>
            <div className="stat-icon warning">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <h3 style={{ color: 'var(--color-warning)' }}>{groupedPendingLeaves.length}</h3>
              <p>Pending Approvals</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon success">
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <h3>{groupedApprovedLeaves.length}</h3>
              <p>Approved</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon danger">
              <XCircle size={24} />
            </div>
            <div className="stat-content">
              <h3>{groupedRejectedLeaves.length}</h3>
              <p>Rejected</p>
            </div>
          </div>
        </div>

        {/* Pending Approvals Section */}
        <div className="card pending-section" style={{ marginBottom: '1.5rem', border: '2px solid var(--color-warning)' }}>
          <div className="card-header" style={{ background: 'linear-gradient(135deg, #fff5e6 0%, #fff 100%)' }}>
            <h3 style={{ color: 'var(--color-warning)' }}>
              <AlertCircle size={20} />
              Pending Approvals ({groupedPendingLeaves.length})
            </h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {groupedPendingLeaves.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <CheckCircle size={28} />
                </div>
                <p>All caught up! No pending approvals.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="table-container desktop-only">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Selected Dates</th>
                        <th>Applied On</th>
                        <th>Covering</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedPendingLeaves.map(leave => (
                        <tr key={leave.id}>
                          <td>
                            <span className="employee-cell-name">{leave.employee_name}</span>
                          </td>
                          <td>
                            <div className="dates-cell">
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
                              {leave.allDates && leave.allDates.length > 1 && (
                                <span className="days-count-badge">({leave.allDates.length} days)</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="applied-date-text">{formatDateTime(leave.applied_at)}</span>
                          </td>
                          <td>
                            <span className="reason-text">{leave.covering_officer || '-'}</span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="btn btn-success btn-small"
                                onClick={() => handleGroupedStatusUpdate(leave, 'approved')}
                                disabled={updatingLeaveId === leave.id}
                              >
                                {updatingLeaveId === leave.id ? (
                                  <Clock size={14} className="spinning" />
                                ) : (
                                  <CheckCircle size={14} />
                                )}
                                {updatingLeaveId === leave.id ? 'Updating...' : 'Approve'}
                              </button>
                              <button 
                                className="btn btn-danger btn-small"
                                onClick={() => handleGroupedStatusUpdate(leave, 'rejected')}
                                disabled={updatingLeaveId === leave.id}
                              >
                                {updatingLeaveId === leave.id ? (
                                  <Clock size={14} className="spinning" />
                                ) : (
                                  <XCircle size={14} />
                                )}
                                {updatingLeaveId === leave.id ? 'Updating...' : 'Reject'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="mobile-pending-cards">
                  {groupedPendingLeaves.map(leave => (
                    <div key={leave.id} className="pending-card-mobile">
                      <div className="pending-card-header-mobile">
                        <div>
                          <div className="pending-employee-name">{leave.employee_name}</div>
                          {leave.allDates && leave.allDates.length > 1 && (
                            <div className="pending-meta">
                              <span className="pending-date-count">({leave.allDates.length} days)</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="pending-card-dates-mobile">
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
                      </div>

                      {leave.covering_officer && (
                        <div className="pending-reason-mobile">
                          <strong>Covering:</strong> {leave.covering_officer}
                        </div>
                      )}

                      <div className="pending-applied-mobile">
                        Applied: {formatDateTime(leave.applied_at)}
                      </div>

                      <div className="pending-actions-mobile">
                        <button 
                          className="btn btn-success btn-mobile-approve"
                          onClick={() => handleGroupedStatusUpdate(leave, 'approved')}
                          disabled={updatingLeaveId === leave.id}
                        >
                          {updatingLeaveId === leave.id ? (
                            <Clock size={16} className="spinning" />
                          ) : (
                            <CheckCircle size={16} />
                          )}
                          {updatingLeaveId === leave.id ? 'Updating...' : 'Approve'}
                        </button>
                        <button 
                          className="btn btn-danger btn-mobile-reject"
                          onClick={() => handleGroupedStatusUpdate(leave, 'rejected')}
                          disabled={updatingLeaveId === leave.id}
                        >
                          {updatingLeaveId === leave.id ? (
                            <Clock size={16} className="spinning" />
                          ) : (
                            <XCircle size={16} />
                          )}
                          {updatingLeaveId === leave.id ? 'Updating...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recently Applied Leaves */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3>
              <CalendarDays size={18} />
              Recently Applied Leaves
            </h3>
          </div>
          <div className="filters-container" style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
            <div className="filters-row">
              <div className="filter-group-compact">
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
                    title="Clear date filter"
                  >
                    <XIcon size={14} />
                  </button>
                )}
              </div>
              <div className="filter-group-compact">
                <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  className="form-input-compact"
                  value={recentNameFilter}
                  onChange={(e) => setRecentNameFilter(e.target.value)}
                  placeholder="Filter by name"
                  title="Filter by name"
                  style={{ flex: 1 }}
                />
                {recentNameFilter && (
                  <button
                    className="btn-icon-compact"
                    onClick={() => setRecentNameFilter('')}
                    title="Clear name filter"
                  >
                    <XIcon size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recentLeaves.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <CalendarDays size={28} />
                </div>
                <p>{dateFilter ? 'No leaves found for this date' : 'No leave applications yet'}</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Selected Dates</th>
                      <th>Covering</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedRecentLeaves.map(leave => (
                      <tr key={leave.id}>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            {getStatusIcon(leave.status)}
                            <span className="employee-cell-name">{leave.employee_name}</span>
                          </span>
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
                          <span className="employee-cell-name" style={{ fontSize: '0.8rem' }}>{leave.covering_officer || '-'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Compact Filters */}
        <div className="filter-bar-compact" style={{ justifyContent: 'center' }}>
          <div className="filter-group-compact" style={{ width: '250px' }}>
            <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              className="form-input-compact"
              value={employeeNameFilter}
              onChange={(e) => setEmployeeNameFilter(e.target.value)}
              placeholder="Filter by name"
              title="Filter by name"
              style={{ flex: 1 }}
            />
            {employeeNameFilter && (
              <>
                <button
                  className="btn-icon-compact"
                  onClick={() => setEmployeeNameFilter('')}
                  title="Clear filter"
                >
                  <XIcon size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Employees Section */}
        <div className="card">
          <div className="card-header">
            <h3>
              <Users size={18} />
              Physiotherapists & Leave Summary
            </h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {filteredEmployees.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                {employeeNameFilter ? 'No physiotherapists found matching the filter' : 'No physiotherapists with leaves'}
              </div>
            ) : (
              filteredEmployees.map((employee) => (
              <div key={employee.id} className="employee-card" style={{ borderRadius: 0, boxShadow: 'none', borderBottom: '1px solid var(--color-border)' }}>
                <div 
                  className="employee-card-header"
                  onClick={() => setExpandedEmployee(expandedEmployee === employee.id ? null : employee.id)}
                >
                  <div className="employee-info">
                    <div>
                      <div className="employee-name">{employee.name}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="leave-count">
                      <span>{getEmployeeTotalDateCount(employee.id)}</span>
                      <small>{getEmployeeTotalDateCount(employee.id) === 1 ? 'day' : 'days'}</small>
                    </div>
                    {expandedEmployee === employee.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {expandedEmployee === employee.id && (
                  <div className="employee-card-details">
                    {/* Employee's leaves list - date wise */}
                    <div style={{ marginTop: '1rem' }}>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--color-text-muted)' }}>Leave History</h4>
                      {getEmployeeLeaveDates(employee.id).length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No leaves applied</p>
                      ) : (
                        <div className="table-container">
                          <table className="table" style={{ fontSize: '0.85rem' }}>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Covering</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getEmployeeLeaveDates(employee.id).slice(0, 10).map(item => (
                                <tr key={item.id}>
                                  <td>
                                    <span className="date-tag">
                                      {formatDate(item.date)}
                                    </span>
                                  </td>
                                  <td style={{ fontSize: '0.8rem' }}>
                                    {!item.leave_duration || item.leave_duration === 'full_day' 
                                      ? 'Full Day' 
                                      : (item.half_day_period === 'morning' ? '8am-12pm' : '12pm-4pm')}
                                  </td>
                                  <td>
                                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                      {getStatusIcon(item.status)}
                                      <span style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{item.status}</span>
                                    </span>
                                  </td>
                                  <td style={{ fontSize: '0.8rem' }}>{item.covering_officer || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
