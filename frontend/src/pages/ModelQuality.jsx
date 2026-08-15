import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { api } from '../api.js'
import { Loading, ErrorNote } from '../components/StatusNote.jsx'

export default function ModelQuality() {
  const [evalData, setEvalData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.evaluation().then(setEvalData).catch((e) => setError(e.message))
  }, [])

  return (
    <>
      <header className="page-header">
        <div className="eyebrow">Entry 04 &middot; Model Quality</div>
        <h1 className="page-title">Is personalization actually worth it?</h1>
        <p className="page-desc">
          Item-based collaborative filtering is benchmarked against a non-personalized popularity
          baseline using a held-out-purchase evaluation (Precision@5 / Recall@5), computed once in the
          notebook and served here for transparency.
        </p>
      </header>

      <ErrorNote message={error} />
      {!evalData && !error && <Loading />}

      {evalData && (
        <>
          <div className="panel">
            <h2 className="panel-title">Precision@5 / Recall@5</h2>
            <p className="panel-sub">
              Higher is better for both. Evaluated over {evalData[0]?.['Customers Evaluated']} sampled customers with held-out purchases.
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={evalData}>
                <CartesianGrid stroke="#d6cdb3" vertical={false} />
                <XAxis dataKey="Model" tick={{ fontSize: 11, fill: '#4a5a58' }} />
                <YAxis tick={{ fontSize: 11, fill: '#4a5a58' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Precision@5" fill="#1f6f5c" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Recall@5" fill="#b8862b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="panel">
            <h2 className="panel-title">Evaluation ledger</h2>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th className="num">Precision@5</th>
                  <th className="num">Recall@5</th>
                  <th className="num">Customers Evaluated</th>
                </tr>
              </thead>
              <tbody>
                {evalData.map((row) => (
                  <tr key={row.Model}>
                    <td>{row.Model}</td>
                    <td className="num">{row['Precision@5'].toFixed(4)}</td>
                    <td className="num">{row['Recall@5'].toFixed(4)}</td>
                    <td className="num">{row['Customers Evaluated']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hint-text" style={{ marginTop: 14 }}>
              Item-based collaborative filtering outperforms the popularity baseline on both metrics,
              which is the quantitative justification for using a personalized recommender rather than
              a simple best-sellers list.
            </p>
          </div>
        </>
      )}
    </>
  )
}
