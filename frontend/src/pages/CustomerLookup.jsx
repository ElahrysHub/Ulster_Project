import React, { useState } from 'react'
import { api } from '../api.js'
import { Loading, ErrorNote, Empty } from '../components/StatusNote.jsx'

const gbp = (n) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n)

function SegmentBadge({ label }) {
  const cls = label?.includes('High') ? 'high' : label?.includes('Risk') ? 'risk' : 'neutral'
  return <span className={`badge ${cls}`}>{label}</span>
}

export default function CustomerLookup() {
  const [customerId, setCustomerId] = useState('')
  const [customer, setCustomer] = useState(null)
  const [recs, setRecs] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [newCust, setNewCust] = useState({ recency_days: '', frequency_orders: '', monetary_gbp: '' })
  const [prediction, setPrediction] = useState(null)
  const [predictError, setPredictError] = useState(null)

  async function lookup(e) {
    e.preventDefault()
    if (!customerId) return
    setLoading(true)
    setError(null)
    setCustomer(null)
    setRecs(null)
    try {
      const c = await api.customer(customerId)
      setCustomer(c)
      const r = await api.customerRecommendations(customerId).catch(() => [])
      setRecs(r)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function predict(e) {
    e.preventDefault()
    setPredictError(null)
    setPrediction(null)
    try {
      const payload = {
        recency_days: Number(newCust.recency_days),
        frequency_orders: Number(newCust.frequency_orders),
        monetary_gbp: Number(newCust.monetary_gbp),
      }
      const result = await api.predictSegment(payload)
      setPrediction(result)
    } catch (err) {
      setPredictError(err.message)
    }
  }

  return (
    <>
      <header className="page-header">
        <div className="eyebrow">Entry 02 &middot; Customer Lookup</div>
        <h1 className="page-title">Look up a customer, or classify a new one</h1>
        <p className="page-desc">
          Search an existing CustomerID to see their segment and personalized recommendations, or enter
          RFM values for someone not yet on file &mdash; the same K-Means model trained in the notebook
          classifies them live.
        </p>
      </header>

      <div className="panel">
        <h2 className="panel-title">Find an existing customer</h2>
        <p className="panel-sub">Try, for example, CustomerID 12347 or 12348.</p>
        <form className="field-row" onSubmit={lookup}>
          <div className="field">
            <label htmlFor="cid">Customer ID</label>
            <input
              id="cid"
              type="number"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="e.g. 12347"
            />
          </div>
          <button className="btn" type="submit">Look up</button>
        </form>

        <ErrorNote message={error} />
        {loading && <Loading label="Consulting the ledger…" />}

        {customer && (
          <>
            <div className="two-col" style={{ marginTop: 8 }}>
              <div className="seal">{customer.customer_id}</div>
              <div>
                <SegmentBadge label={customer.segment_label} />
                <div className="tag-list">
                  <span className="result-meta">Country: {customer.country}</span>
                  <span className="result-meta">Recency: {customer.recency_days}d</span>
                  <span className="result-meta">Frequency: {customer.frequency_orders} orders</span>
                  <span className="result-meta">Monetary: {gbp(customer.monetary_gbp)}</span>
                  <span className="result-meta">Avg order: {gbp(customer.avg_order_value_gbp)}</span>
                </div>
              </div>
            </div>

            <hr className="divider" />

            <h3 className="panel-title" style={{ fontSize: 15 }}>Personalized recommendations</h3>
            {recs && recs.length > 0 ? (
              <div>
                {recs.map((r) => (
                  <div className="result-row" key={r.stock_code}>
                    <span className="result-title">{r.description}</span>
                    <span className="result-meta">{r.stock_code} &middot; similarity {r.score}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No collaborative-filtering recommendations available for this customer.</Empty>
            )}
          </>
        )}
      </div>

      <div className="panel">
        <h2 className="panel-title">Classify a customer not yet on file</h2>
        <p className="panel-sub">
          Enter estimated RFM values &mdash; the backend log-transforms and scales them exactly as the
          notebook does, then runs the trained K-Means model.
        </p>
        <form className="field-row" onSubmit={predict}>
          <div className="field">
            <label htmlFor="rec">Recency (days)</label>
            <input id="rec" type="number" min="0" required
              value={newCust.recency_days}
              onChange={(e) => setNewCust({ ...newCust, recency_days: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="freq">Frequency (orders)</label>
            <input id="freq" type="number" min="0" required
              value={newCust.frequency_orders}
              onChange={(e) => setNewCust({ ...newCust, frequency_orders: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="mon">Monetary (GBP)</label>
            <input id="mon" type="number" min="0" step="0.01" required
              value={newCust.monetary_gbp}
              onChange={(e) => setNewCust({ ...newCust, monetary_gbp: e.target.value })} />
          </div>
          <button className="btn" type="submit">Classify</button>
        </form>

        <ErrorNote message={predictError} />
        {prediction && (
          <div className="two-col">
            <div className="seal">{prediction.cluster}</div>
            <div>
              <SegmentBadge label={prediction.segment_label} />
              <p className="hint-text">Predicted using the notebook&rsquo;s trained K-Means model + scaler.</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
