import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error("Root element not found. Make sure index.html contains <div id=\"root\"></div>")
}
const root = createRoot(container)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)