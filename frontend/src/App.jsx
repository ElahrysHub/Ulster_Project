import React, { useState } from 'react'
import Overview from './pages/Overview.jsx'
import CustomerLookup from './pages/CustomerLookup.jsx'
import ProductExplorer from './pages/ProductExplorer.jsx'
import ModelQuality from './pages/ModelQuality.jsx'

const PAGES = [
  { id: 'overview', label: 'Ledger Overview', idx: '01', Component: Overview },
  { id: 'customers', label: 'Customer Lookup', idx: '02', Component: CustomerLookup },
  { id: 'products', label: 'Product Explorer', idx: '03', Component: ProductExplorer },
  { id: 'quality', label: 'Model Quality', idx: '04', Component: ModelQuality },
]

export default function App() {
  const [pageId, setPageId] = useState('overview')
  const active = PAGES.find((p) => p.id === pageId) ?? PAGES[0]
  const ActivePage = active.Component

  return (
    <div className="app-shell">
      <nav className="sidebar" aria-label="Primary">
        <div className="brand">
          <div className="brand-mark">L</div>
          <div className="brand-name">Ledger</div>
          <div className="brand-sub">SME Customer Analytics</div>
        </div>

        <ul className="nav-list">
          {PAGES.map((p) => (
            <li key={p.id}>
              <button
                className={`nav-item ${p.id === pageId ? 'active' : ''}`}
                onClick={() => setPageId(p.id)}
                aria-current={p.id === pageId ? 'page' : undefined}
              >
                <span className="idx">{p.idx}</span>
                <span>{p.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          Data-driven segmentation &amp; recommendation
          <br />
          for SME e-commerce &middot; UCI Online Retail
        </div>
      </nav>

      <main className="main">
        <ActivePage />
      </main>
    </div>
  )
}
