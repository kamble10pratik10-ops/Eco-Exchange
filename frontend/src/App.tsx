import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Exo Exchange</h1>
        <p>Buy and sell pre-loved items locally, like OLX.</p>
      </header>

      <main className="app-main">
        <section className="hero">
          <div>
            <h2>Browse listings</h2>
            <p>
              Soon this will show a feed of items fetched from your FastAPI backend
              (title, price, city, category, seller info).
            </p>
          </div>
        </section>

        <section className="cta-grid">
          <div className="card">
            <h3>Post an ad</h3>
            <p>
              Users will be able to log in and list second-hand products with photos,
              descriptions, and pricing.
            </p>
          </div>
          <div className="card">
            <h3>Chat with sellers</h3>
            <p>
              We can extend later with messaging between buyers and sellers, and
              favourites/watchlist.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
