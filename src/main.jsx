import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { OLD_DESIGN } from './config/siteVersion.js'

async function start() {
  // Load exactly one stylesheet before rendering, avoiding a flash of the
  // current design on /old. Both versions use the same live content and videos.
  if (OLD_DESIGN) await import('./styles/old.css')
  else await import('./styles/globals.css')

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

start()
