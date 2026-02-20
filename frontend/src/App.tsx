import { Link, NavLink, Route, Routes } from 'react-router-dom'
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

function Layout({
  children,
  authed,
  onLogout,
}: {
  children: React.ReactNode
  authed: boolean
  onLogout: () => void
}) {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <Link to="/" className="logo-text">
            Exo Exchange
          </Link>
          <nav className="nav">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/listings/new">Posts</NavLink>
            {authed && (
              <NavLink to="/messages" className="nav-messages-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                Messages
              </NavLink>
            )}
            {!authed ? (
              <>
                <NavLink to="/login">Login</NavLink>
                <NavLink to="/register">Register</NavLink>
              </>
            ) : (
              <button className="link-button" onClick={onLogout}>
                Logout
              </button>
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
        <Route path="/" element={<HomePage token={auth.token} />} />
        <Route path="/login" element={<LoginPage onLogin={setAuth} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/listings/new"
          element={<NewListingPage token={auth.token} />}
        />
        <Route path="/listings/edit/:id" element={<EditListingPage token={auth.token} />} />
        <Route path="/listings/:id" element={<ListingDetailPage token={auth.token} />} />
        <Route path="/messages" element={<ChatListPage token={auth.token} />} />
        <Route path="/chat/:conversationId" element={<ChatPage token={auth.token} />} />
      </Routes>
    </Layout>
  )
}

export default App
