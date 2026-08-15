import React, { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { api } from '../api.js'
import { Loading, ErrorNote } from '../components/StatusNote.jsx'

const SLICE_COLORS = ['#1f6f5c', '#b8862b', '#a4432c', '#4a5a58']

const gbp = (n) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)

export default function Overview() {
  const [segments, setSegments] = useState(null)
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([api.segments(), api.meta()])
      .then(([segs, m]) => {
        setSegments(segs)
        setMeta(m)
      })
      .catch((e) => setError(e.message))
  }, [])

  const totalCustomers = segments?.reduce((sum, s) => sum + s.Customers, 0)
  const totalRevenue = segments?.reduce((sum, s) => sum + s.Total_Revenue, 0)

  return (
    <>
      <header className="page-header">
        <div className="eyebrow">Entry 01 &middot; Ledger Overview</div>
        <h1 className="page-title">Who your customers are, at a glance</h1>
        <p className="page-desc">
          Customers are grouped into statistically distinct segments using K-Means clustering on
          Recency, Frequency, and Monetary (RFM) value. Segment count and boundaries were chosen by
          maximizing the Silhouette score in the project notebook, not picked by hand.
        </p>
      </header>

      <ErrorNote message={error} />
      {!segments && !error && <Loading />}

      {segments && (
        <>
          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-label">Total Customers</div>
              <div className="stat-value">{totalCustomers?.toLocaleString()}</div>
              <div className="stat-hint">across {segments.length} segments</div>
            </div>
            <div className="stat-card gold">
              <div className="stat-label">Total Revenue Modeled</div>
              <div className="stat-value">{gbp(totalRevenue)}</div>
              <div className="stat-hint">from cleaned UK transaction history</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Products Catalogued</div>
              <div className="stat-value">{meta?.products?.toLocaleString() ?? '—'}</div>
              <div className="stat-hint">available for recommendation</div>
            </div>
            <div className="stat-card rust">
              <div className="stat-label">Association Rules</div>
              <div className="stat-value">{meta?.association_rules?.toLocaleString() ?? '—'}</div>
              <div className="stat-hint">lift &gt; 1.0, mined via FP-Growth</div>
            </div>
          </div>

          <div className="grid-2">
            <div className="panel">
              <h2 className="panel-title">Revenue share by segment</h2>
              <p className="panel-sub">A small, high-value segment typically carries most of the revenue.</p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={segments}
                    dataKey="Total_Revenue"
                    nameKey="Business_Label"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {segments.map((s, i) => (
                      <Cell key={s.Cluster} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => gbp(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="panel">
              <h2 className="panel-title">Customers per segment</h2>
              <p className="panel-sub">Segment size doesn&rsquo;t always track with revenue &mdash; that gap is the story.</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={segments}>
                  <CartesianGrid stroke="#d6cdb3" vertical={false} />
                  <XAxis dataKey="Business_Label" tick={{ fontSize: 11, fill: '#4a5a58' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#4a5a58' }} />
                  <Tooltip />
                  <Bar dataKey="Customers" fill="#1f6f5c" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <h2 className="panel-title">Segment ledger</h2>
            <p className="panel-sub">Average behaviour per segment, computed from cleaned RFM features.</p>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Segment</th>
                  <th className="num">Customers</th>
                  <th className="num">% of Customers</th>
                  <th className="num">Avg Recency (days)</th>
                  <th className="num">Avg Frequency (orders)</th>
                  <th className="num">Avg Monetary</th>
                  <th className="num">% of Revenue</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((s) => (
                  <tr key={s.Cluster}>
                    <td>
                      <span className={`badge ${s.Business_Label.includes('High') ? 'high' : s.Business_Label.includes('Risk') ? 'risk' : 'neutral'}`}>
                        {s.Business_Label}
                      </span>
                    </td>
                    <td className="num">{s.Customers.toLocaleString()}</td>
                    <td className="num">{s.Pct_of_Customers}%</td>
                    <td className="num">{s.Avg_Recency}</td>
                    <td className="num">{s.Avg_Frequency}</td>
                    <td className="num">{gbp(s.Avg_Monetary)}</td>
                    <td className="num">{s.Pct_of_Revenue}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
