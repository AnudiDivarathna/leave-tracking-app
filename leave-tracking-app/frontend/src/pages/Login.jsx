import { useState } from 'react'
import axios from 'axios'
import { 
  User, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

function Login({ onLogin }) {
  const [step, setStep] = useState('login') // 'login', 'verify', 'create-password'
  const [paysheetNumber, setPaysheetNumber] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Step 1: Verify email + paysheet number
  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await axios.post('/api/auth/verify', { 
        paysheet_number: paysheetNumber,
        email: email 
      })
      
      setEmployeeName(res.data.name)
      setStep('create-password')
    } catch (err) {
      // If already setup, redirect to login
      if (err.response?.data?.already_setup) {
        setError('')
        setStep('login')
      } else {
        setError(err.response?.data?.error || 'Verification failed. Please check your details.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Create password (first login)
  const handleCreatePassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const res = await axios.post('/api/auth/first-login', {
        paysheet_number: paysheetNumber,
        email,
        password
      })

      setSuccess('Password created successfully!')
      
      // Store token and user data
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      
      setTimeout(() => {
        onLogin(res.data.user, res.data.token)
      }, 1000)
    } catch (err) {
      if (err.response?.data?.error?.includes('already set up')) {
        setSuccess('Account already set up. Redirecting to login...')
        setError('')
        setTimeout(() => {
          setStep('login')
          setSuccess('')
          setLoading(false)
        }, 1000)
      } else {
        setError(err.response?.data?.error || 'Failed to create password. Please try again.')
        setLoading(false)
      }
    }
  }

  // Step 3: Regular login (email + password)
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await axios.post('/api/auth/login', {
        email,
        password
      })

      setSuccess('Login successful!')
      
      // Store token and user data
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      
      setTimeout(() => {
        onLogin(res.data.user, res.data.token)
      }, 500)
    } catch (err) {
      if (err.response?.data?.first_login) {
        // Need to do first login - go back to verify
        setStep('verify')
        setError('Please complete first-time setup with your email and paysheet number.')
      } else {
        setError(err.response?.data?.error || 'Login failed. Please check your credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    setStep('verify')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess('')
  }

  const switchToLogin = () => {
    setStep('login')
    setPassword('')
    setError('')
    setSuccess('')
  }

  const switchToFirstLogin = () => {
    setStep('verify')
    setPassword('')
    setError('')
    setSuccess('')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-img">
            <img src="/logo.png" alt="Government of Sri Lanka" />
          </div>
          <p className="login-department">Department Of Physiotherapy</p>
          <h1 className="login-title">National Hospital Kandy</h1>
          <p className="login-subtitle">Leave Tracker</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* Step 1: Verify email + paysheet */}
        {step === 'verify' && (
          <form onSubmit={handleVerify}>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem', textAlign: 'center' }}>
              Enter your email and paysheet number to set up your account.
            </p>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="email"
                  className="form-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Paysheet Number</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your paysheet number"
                  value={paysheetNumber}
                  onChange={(e) => setPaysheetNumber(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginBottom: '0.75rem' }}>
              <UserPlus size={18} />
              {loading ? 'Verifying...' : 'Continue'}
            </button>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '1rem' }}>
              Already have an account?{' '}
              <button 
                type="button" 
                onClick={switchToLogin}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--color-primary)', 
                  cursor: 'pointer',
                  fontWeight: '500',
                  padding: 0
                }}
              >
                Login here
              </button>
            </p>
          </form>
        )}

        {/* Step 2: Create password */}
        {step === 'create-password' && (
          <form onSubmit={handleCreatePassword}>
            {success ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem 1rem',
                gap: '1rem'
              }}>
                <div className="spinner"></div>
                <p style={{ 
                  color: 'var(--color-success)', 
                  fontWeight: '500',
                  textAlign: 'center',
                  margin: 0
                }}>
                  {success}
                </p>
              </div>
            ) : (
              <>
                <div className="welcome-message" style={{ 
                  background: 'var(--color-bg)', 
                  padding: '1rem', 
                  borderRadius: '10px', 
                  marginBottom: '1.25rem',
                  textAlign: 'center'
                }}>
                  <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Welcome,</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontWeight: '600', color: 'var(--color-primary)' }}>{employeeName}</p>
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem', textAlign: 'center' }}>
                  Create a password for your account.
                </p>

                <div className="form-group">
                  <label className="form-label">Create Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Create a password (min 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingLeft: '40px', paddingRight: '40px' }}
                      required
                      minLength={6}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ 
                        position: 'absolute', 
                        right: '12px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        padding: '4px'
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{ paddingLeft: '40px', paddingRight: '40px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ 
                        position: 'absolute', 
                        right: '12px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        padding: '4px'
                      }}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginBottom: '0.75rem' }}>
                  <UserPlus size={18} />
                  {loading ? 'Creating...' : 'Create Password'}
                </button>

                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={goBack}
                  style={{ width: '100%' }}
                >
                  Back
                </button>
              </>
            )}
          </form>
        )}

        {/* Step 3: Regular login (email + password) */}
        {step === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="email"
                  className="form-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    padding: '4px'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem', textAlign: 'center' }}>
              Forgot password? Contact the administrator to reset it.
            </p>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginBottom: '0.75rem' }}>
              <LogIn size={18} />
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '1rem' }}>
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={switchToFirstLogin}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--color-primary)', 
                  cursor: 'pointer',
                  fontWeight: '600',
                  padding: 0,
                  fontSize: '0.95rem'
                }}
              >
                Sign Up
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default Login
