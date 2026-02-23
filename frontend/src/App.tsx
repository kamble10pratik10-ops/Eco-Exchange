import { Link, NavLink, Route, Routes, useNavigate, Navigate, useLocation } from 'react-router-dom'
import './App.css'
import { useState } from 'react'
import {
  HomePage,
  LoginPage,
  RegisterPage,
  NewListingPage,
  ListingDetailPage,
  ChatPage,
  ChatListPage,
  EditListingPage,
  SearchPage,
  ProfilePage,
  WishlistPage,
  MyProfilePage,
  VerifyEmailPage,
} from './pages'

function useAuth(): [{ token: string | null }, (token: string | null) => void] {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('exo_token'),
  )

  const update = (newToken: string | null) => {
    setToken(newToken)
    if (newToken) {
      localStorage.setItem('exo_token', newToken)
    } else {
      localStorage.removeItem('exo_token')
    }
  }

  return [{ token }, update]
}

function HeaderSearchBar() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <form className="header-search-form" onSubmit={handleSubmit} role="search">
      <div className="header-search-wrap">
        <svg className="header-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          id="header-search-input"
          type="text"
          className="header-search-input"
          placeholder="Search listings…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Quick search"
          autoComplete="off"
        />
      </div>
    </form>
  )
}

function ProtectedRoute({ children, token }: { children: React.ReactNode; token: string | null }) {
  const location = useLocation()
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

function Layout({
  children,
  authed,
  onLogout,
}: {
  children: React.ReactNode
  authed: boolean
  onLogout: () => void
}) {
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <Link to="/" className="logo-text">
            Exo Exchange
          </Link>
          {authed && <HeaderSearchBar />}
          <nav className="nav">
            {authed && (
              <>
                <NavLink to="/" end>
                  Home
                </NavLink>
                <NavLink to="/search">
                  🔍 Search
                </NavLink>
                <NavLink to="/listings/new">Posts</NavLink>
                <NavLink to="/messages" className="nav-messages-link">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  Messages
                </NavLink>
                <NavLink to="/wishlist">
                  ❤️ Wishlist
                </NavLink>
                <div className="nav-dropdown-wrapper">
                  <button
                    className="nav-profile-btn"
                    onClick={() => setProfileOpen(!profileOpen)}
                  >
                    👤 Profile
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" transform={profileOpen ? "rotate(180)" : ""}><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  {profileOpen && (
                    <div className="nav-dropdown" onClick={() => setProfileOpen(false)}>
                      <NavLink to="/my-profile" className="dropdown-item">My Profile</NavLink>
                      <NavLink to="/profile" className="dropdown-item">Settings</NavLink>
                      <button className="dropdown-item logout-item" onClick={onLogout}>Logout</button>
                    </div>
                  )}
                </div>
              </>
            )}
            {!authed ? (
              <>
                <NavLink to="/login">Login</NavLink>
                <NavLink to="/register">Register</NavLink>
              </>
            ) : (
              null
            )}
          </nav>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  )
}

function App() {
  const [auth, setAuth] = useAuth()

  const handleLogout = () => setAuth(null)

  return (
    <Layout authed={!!auth.token} onLogout={handleLogout}>
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={setAuth} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route path="/" element={
          <ProtectedRoute token={auth.token}>
            <HomePage token={auth.token} />
          </ProtectedRoute>
        } />
        <Route
          path="/listings/new"
          element={
            <ProtectedRoute token={auth.token}>
              <NewListingPage token={auth.token} />
            </ProtectedRoute>
          }
        />
        <Route path="/listings/edit/:id" element={
          <ProtectedRoute token={auth.token}>
            <EditListingPage token={auth.token} />
          </ProtectedRoute>
        } />
        <Route path="/listings/:id" element={
          <ProtectedRoute token={auth.token}>
            <ListingDetailPage token={auth.token} />
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute token={auth.token}>
            <ChatListPage token={auth.token} />
          </ProtectedRoute>
        } />
        <Route path="/chat/:conversationId" element={
          <ProtectedRoute token={auth.token}>
            <ChatPage token={auth.token} />
          </ProtectedRoute>
        } />
        <Route path="/search" element={
          <ProtectedRoute token={auth.token}>
            <SearchPage token={auth.token} />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute token={auth.token}>
            <ProfilePage token={auth.token} />
          </ProtectedRoute>
        } />
        <Route path="/my-profile" element={
          <ProtectedRoute token={auth.token}>
            <MyProfilePage token={auth.token} />
          </ProtectedRoute>
        } />
        <Route path="/wishlist" element={
          <ProtectedRoute token={auth.token}>
            <WishlistPage token={auth.token} />
          </ProtectedRoute>
        } />
      </Routes>
    </Layout>
  )
}

export default App
