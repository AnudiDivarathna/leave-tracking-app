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
  const [dateFilter, setDateFilter] = useState('') // Filter by date (YYYY-MM-DD)

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
    try {
      // Use the leaves-status endpoint that accepts ID in body
      await axios.patch('/api/leaves-status', { id: leaveId, status })
      fetchData()
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const getEmployeeLeaves = (userId) => {
    return filteredLeaves.filter(leave => leave.user_id === userId)
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

  // Render dates with tooltip
  const renderDatesWithTooltip = (dates, maxVisible = 3, tooltipId) => {
    if (!dates || !Array.isArray(dates) || dates.length === 0) return null
    
    const visibleDates = dates.slice(0, maxVisible)
    const remainingCount = dates.length - maxVisible
    
    return (
      <div className="dates-list">
        {visibleDates.map((date, idx) => (
          <span key={idx} className="date-tag">
            {formatDate(date)}
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
                  <span key={idx} className="tooltip-date">{formatDate(date)}</span>
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
      if (!dateFilter) return true
      // Check if any of the leave dates match the filter date
      if (leave.dates && Array.isArray(leave.dates)) {
        return leave.dates.includes(dateFilter)
      }
      return false
    })
    .sort((a, b) => {
      // Sort by applied_at, newest first
      const dateA = new Date(a.applied_at)
      const dateB = new Date(b.applied_at)
      return dateB - dateA
    })

  const pendingLeaves = filteredLeaves.filter(l => l.status === 'pending')
  const recentLeaves = filteredLeaves.slice(0, 10)

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
            <Building2 size={28} />
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
              <p>Total Employees</p>
            </div>
          </div>

          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #fff5e6 0%, #fff 100%)', border: '2px solid var(--color-warning)' }}>
            <div className="stat-icon warning">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <h3 style={{ color: 'var(--color-warning)' }}>{stats?.pendingLeaves || 0}</h3>
              <p>Pending Approvals</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon success">
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats?.approvedLeaves || 0}</h3>
              <p>Approved</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon danger">
              <XCircle size={24} />
            </div>
            <div className="stat-content">
              <h3>{stats?.rejectedLeaves || 0}</h3>
              <p>Rejected</p>
            </div>
          </div>
        </div>

        {/* Compact Date Filter */}
        <div className="filter-bar-compact">
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
              <>
                <button
                  className="btn-icon-compact"
                  onClick={() => setDateFilter('')}
                  title="Clear filter"
                >
                  <XIcon size={14} />
                </button>
                <span className="filter-active-text">{formatDate(dateFilter)}</span>
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
          <div className="card-body" style={{ padding: 0 }}>
            {recentLeaves.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <CalendarDays size={28} />
                </div>
                <p>No leave applications yet</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Selected Dates</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLeaves.map(leave => (
                      <tr key={leave.id}>
                        <td>
                          <span className="employee-cell-name">{leave.employee_name}</span>
                        </td>
                        <td>
                          {renderDatesWithTooltip(leave.dates, 3, `recent-${leave.id}`)}
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

        {/* Pending Approvals Section */}
        <div className="card pending-section" style={{ marginBottom: '1.5rem', border: '2px solid var(--color-warning)' }}>
          <div className="card-header" style={{ background: 'linear-gradient(135deg, #fff5e6 0%, #fff 100%)' }}>
            <h3 style={{ color: 'var(--color-warning)' }}>
              <AlertCircle size={20} />
              Pending Approvals ({pendingLeaves.length})
            </h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {pendingLeaves.length === 0 ? (
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
                        <th>Employee</th>
                        <th>Selected Dates</th>
                        <th>Applied On</th>
                        <th>Reason</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingLeaves.map(leave => (
                        <tr key={leave.id}>
                          <td>
                            <span className="employee-cell-name">{leave.employee_name}</span>
                          </td>
                          <td>
                            <div className="dates-cell">
                              {renderDatesWithTooltip(leave.dates, 5, `pending-${leave.id}`)}
                              <span className="days-count-badge">({leave.dates?.length || 0} day{leave.dates?.length !== 1 ? 's' : ''})</span>
                            </div>
                          </td>
                          <td>
                            <span className="applied-date-text">{formatDateTime(leave.applied_at)}</span>
                          </td>
                          <td>
                            <span className="reason-text">{leave.reason || '-'}</span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="btn btn-success btn-small"
                                onClick={() => handleStatusUpdate(leave.id, 'approved')}
                              >
                                <CheckCircle size={14} />
                                Approve
                              </button>
                              <button 
                                className="btn btn-danger btn-small"
                                onClick={() => handleStatusUpdate(leave.id, 'rejected')}
                              >
                                <XCircle size={14} />
                                Reject
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
                  {pendingLeaves.map(leave => (
                    <div key={leave.id} className="pending-card-mobile">
                      <div className="pending-card-header-mobile">
                        <div>
                          <div className="pending-employee-name">{leave.employee_name}</div>
                          <div className="pending-meta">
                            <span className="pending-date-count">({leave.dates?.length || 0} days)</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pending-card-dates-mobile">
                        {renderDatesWithTooltip(leave.dates, 3, `pending-mobile-${leave.id}`)}
                      </div>

                      {leave.reason && (
                        <div className="pending-reason-mobile">
                          <strong>Reason:</strong> {leave.reason}
                        </div>
                      )}

                      <div className="pending-applied-mobile">
                        Applied: {formatDateTime(leave.applied_at)}
                      </div>

                      <div className="pending-actions-mobile">
                        <button 
                          className="btn btn-success btn-mobile-approve"
                          onClick={() => handleStatusUpdate(leave.id, 'approved')}
                        >
                          <CheckCircle size={20} />
                          Approve
                        </button>
                        <button 
                          className="btn btn-danger btn-mobile-reject"
                          onClick={() => handleStatusUpdate(leave.id, 'rejected')}
                        >
                          <XCircle size={20} />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Employees Section */}
        <div className="card">
          <div className="card-header">
            <h3>
              <Users size={18} />
              Employees & Leave Summary
            </h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {employees.map((employee) => (
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
                      <span>{employee.total_leaves || 0}</span>
                      <small>leaves</small>
                    </div>
                    {employee.pending_leaves > 0 && (
                      <span className="status-badge pending" style={{ fontSize: '0.75rem' }}>
                        {employee.pending_leaves} pending
                      </span>
                    )}
                    {expandedEmployee === employee.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {expandedEmployee === employee.id && (
                  <div className="employee-card-details">
                    {/* Employee's leaves list */}
                    <div style={{ marginTop: '1rem' }}>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--color-text-muted)' }}>Leave History</h4>
                      {getEmployeeLeaves(employee.id).length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No leaves applied</p>
                      ) : (
                        <div className="table-container">
                          <table className="table" style={{ fontSize: '0.85rem' }}>
                            <thead>
                              <tr>
                                <th>Applied On</th>
                                <th>Dates</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getEmployeeLeaves(employee.id).slice(0, 5).map(leave => (
                                <tr key={leave.id}>
                                  <td>{formatDate(leave.applied_at)}</td>
                                  <td>
                                    {renderDatesWithTooltip(leave.dates, 2, `employee-${employee.id}-${leave.id}`)}
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
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
