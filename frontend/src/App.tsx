import { Link, NavLink, Route, Routes } from 'react-router-dom'
import './App.css'
import { useState } from 'react'
import {
  HomePage,
  LoginPage,
  RegisterPage,
  NewListingPage,
  ListingDetailPage,
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
            <NavLink to="/listings/new">Post ad</NavLink>
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
        <p>Buy and sell pre-loved items locally, like OLX.</p>
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
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage onLogin={setAuth} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/listings/new"
          element={<NewListingPage token={auth.token} />}
        />
        <Route path="/listings/:id" element={<ListingDetailPage />} />
      </Routes>
    </Layout>
  )
}

export default App
