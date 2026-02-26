import { Link, NavLink, Route, Routes, useNavigate, Navigate, useLocation } from 'react-router-dom'
import './design-system.css'
import './App.css'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  PlusCircle,
  MessageSquare,
  Heart,
  User,
  LogOut,
  LayoutDashboard,
  Settings,
  ChevronDown,
  Globe
} from 'lucide-react'
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
  PublicProfilePage,
  DashboardPage,
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
        <Search className="header-search-icon" size={18} />
        <input
          id="header-search-input"
          type="text"
          className="header-search-input"
          placeholder="Explore the ecosystem..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search"
          autoComplete="off"
        />
        <div className="search-shortcut">⌘K</div>
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
  token,
}: {
  children: React.ReactNode
  authed: boolean
  onLogout: () => void
  token: string | null
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const location = useLocation()

  useEffect(() => {
    const fetchProfile = () => {
      if (authed && token) {
        fetch('http://127.0.0.1:8000/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(data => setUserProfile(data))
          .catch(err => console.error("Profile sync error", err))
      }
    }

    fetchProfile()

    // Listen for profile updates from other components
    window.addEventListener('profile-updated', fetchProfile)
    return () => window.removeEventListener('profile-updated', fetchProfile)
  }, [authed, token])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="app-container">
      <header className={`app-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-content">
          <Link to="/" className="logo-container">
            <div className="logo-icon">
              <Globe size={24} className="emerald-glow" />
            </div>
            <span className="logo-text">Eco-Exchange</span>
          </Link>

          <HeaderSearchBar />

          <nav className="nav-main">
            {authed && (
              <>
                <NavLink to="/" end className="nav-link">
                  <span>Home</span>
                </NavLink>
                <NavLink to="/listings/new" className="nav-link">
                  <PlusCircle size={18} />
                  <span>Post</span>
                </NavLink>
                <NavLink to="/messages" className="nav-link">
                  <MessageSquare size={18} />
                  <span>Messages</span>
                </NavLink>
                <NavLink to="/wishlist" className="nav-link">
                  <Heart size={18} />
                </NavLink>

                <div className="user-menu-root">
                  <button
                    className={`user-trigger ${profileOpen ? 'active' : ''}`}
                    onClick={() => setProfileOpen(!profileOpen)}
                  >
                    <div className="avatar-small" style={{ overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                      {userProfile?.profile_image_url ? (
                        <img src={userProfile.profile_image_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    <ChevronDown size={14} className={`chevron ${profileOpen ? 'up' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="user-dropdown glass"
                        onClick={() => setProfileOpen(false)}
                      >
                        <div className="dropdown-section">
                          <NavLink to="/dashboard" className="dropdown-link">
                            <LayoutDashboard size={16} />
                            <span>Dashboard</span>
                          </NavLink>
                          <NavLink to="/my-profile" className="dropdown-link">
                            <User size={16} />
                            <span>My Profile</span>
                          </NavLink>
                          <NavLink to="/profile" className="dropdown-link">
                            <Settings size={16} />
                            <span>Settings</span>
                          </NavLink>
                        </div>
                        <div className="dropdown-divider" />
                        <button className="dropdown-link logout" onClick={onLogout}>
                          <LogOut size={16} />
                          <span>Logout</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
            {!authed && (
              <div className="auth-nav">
                <NavLink to="/login" className="nav-link login">Login</NavLink>
                <Link to="/register" className="btn-premium">Join Now</Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>© 2026 Eco-Exchange. Built for a sustainable future.</p>
        </div>
      </footer>
    </div>
  )
}

function App() {
  const [auth, setAuth] = useAuth()

  const handleLogout = () => setAuth(null)

  return (
    <Layout authed={!!auth.token} onLogout={handleLogout} token={auth.token}>
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={setAuth} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route path="/" element={<HomePage token={auth.token} />} />
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
        <Route path="/listings/:id" element={<ListingDetailPage token={auth.token} />} />
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
        <Route path="/search" element={<SearchPage token={auth.token} />} />
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
        <Route path="/dashboard" element={
          <ProtectedRoute token={auth.token}>
            <DashboardPage token={auth.token} />
          </ProtectedRoute>
        } />
        <Route path="/users/:id" element={<PublicProfilePage token={auth.token} />} />
      </Routes>
    </Layout>
  )
}

export default App
