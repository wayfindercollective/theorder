import { useState } from 'react'

export function AdminLogin({ onLogin, loading, error, eyebrow = 'The Order Admin', title = 'Enter the Council.' }) {
  const [password, setPassword] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!password || loading) return
    onLogin(password)
  }

  return (
    <div className="admin-login-screen">
      <form className="admin-login-card card card-stitched nailed" onSubmit={submit}>
        <span className="nail-tl" />
        <span className="nail-br" />

        <div className="eyebrow admin-login-eyebrow">
          <span className="brass-rule" /> {eyebrow} <span className="brass-rule" />
        </div>
        <h1 className="display admin-login-title">{title}</h1>

        <label className="qs-field admin-login-field">
          <span className="qs-label">Password</span>
          <input
            className="input-field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
            placeholder="•••••••••"
            disabled={loading}
          />
        </label>

        {error && <p className="admin-login-error qs-error">{error}</p>}

        <button
          className="btn btn-primary admin-login-submit"
          type="submit"
          disabled={!password || loading}
        >
          {loading ? 'Verifying…' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
