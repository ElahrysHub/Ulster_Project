import React from 'react'

export function Loading({ label = 'Fetching from the ledger…' }) {
  return <p className="loading-text">{label}</p>
}

export function ErrorNote({ message }) {
  if (!message) return null
  return <div className="error-text">{message}</div>
}

export function Empty({ children }) {
  return <div className="empty-state">{children}</div>
}
