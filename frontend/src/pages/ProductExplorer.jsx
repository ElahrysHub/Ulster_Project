import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Loading, ErrorNote, Empty } from '../components/StatusNote.jsx'

export default function ProductExplorer() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [similar, setSimilar] = useState(null)
  const [rules, setRules] = useState(null)
  const [popular, setPopular] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.popular(8).then(setPopular).catch(() => {})
  }, [])

  async function search(e) {
    e.preventDefault()
    if (!query.trim()) return
    setError(null)
    try {
      const r = await api.searchProducts(query, 10)
      setResults(r)
    } catch (err) {
      setError(err.message)
    }
  }

  async function selectProduct(p) {
    setSelected(p)
    setSimilar(null)
    setRules(null)
    try {
      const [s, r] = await Promise.all([
        api.similarProducts(p.stock_code),
        api.productRules(p.stock_code),
      ])
      setSimilar(s)
      setRules(r)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <header className="page-header">
        <div className="eyebrow">Entry 03 &middot; Product Explorer</div>
        <h1 className="page-title">What should we recommend alongside this?</h1>
        <p className="page-desc">
          Search the product catalogue, then compare two recommendation strategies computed in the
          notebook: item-based collaborative filtering (behavioural similarity) and association rules
          (basket co-occurrence).
        </p>
      </header>

      <div className="panel">
        <h2 className="panel-title">Search products</h2>
        <form className="field-row" onSubmit={search}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="q">Product name contains&hellip;</label>
            <input id="q" type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. lantern, mug, heart" style={{ minWidth: 260 }} />
          </div>
          <button className="btn" type="submit">Search</button>
        </form>

        <ErrorNote message={error} />

        {results.length > 0 && (
          <div>
            {results.map((p) => (
              <div className="result-row" key={p.stock_code}>
                <span className="result-title">{p.description}</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className="result-meta">{p.stock_code}</span>
                  <button className="chip-btn" onClick={() => selectProduct(p)}>View recommendations</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="grid-2">
          <div className="panel">
            <h2 className="panel-title">Similar products</h2>
            <p className="panel-sub">Item-based collaborative filtering, for &ldquo;{selected.description}&rdquo;</p>
            {!similar && <Loading />}
            {similar && similar.length === 0 && <Empty>No similarity data for this product.</Empty>}
            {similar && similar.map((s) => (
              <div className="result-row" key={s.stock_code}>
                <span className="result-title">{s.description}</span>
                <span className="result-meta">similarity {s.score}</span>
              </div>
            ))}
          </div>

          <div className="panel">
            <h2 className="panel-title">Frequently bought together</h2>
            <p className="panel-sub">Association rules (Apriori/FP-Growth), lift-ranked</p>
            {!rules && <Loading />}
            {rules && rules.length === 0 && <Empty>No association rules cross this support threshold for this product.</Empty>}
            {rules && rules.map((r) => (
              <div className="result-row" key={r.stock_code}>
                <span className="result-title">{r.description}</span>
                <span className="result-meta">lift {r.lift} &middot; conf {r.confidence}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <h2 className="panel-title">Best-sellers (popularity baseline)</h2>
        <p className="panel-sub">Non-personalized control used to evaluate the recommenders above.</p>
        {!popular && <Loading />}
        {popular && (
          <table className="ledger-table">
            <thead>
              <tr><th>#</th><th>Product</th><th className="num">Units sold</th></tr>
            </thead>
            <tbody>
              {popular.map((p, i) => (
                <tr key={p.StockCode}>
                  <td className="num">{i + 1}</td>
                  <td>{p.Description}</td>
                  <td className="num">{p.Quantity.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
