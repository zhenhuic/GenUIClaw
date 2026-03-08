import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

// Apply stored theme on page load
try {
  const theme = localStorage.getItem('genuiclaw-mobile-theme')
  if (theme === 'light') {
    document.documentElement.classList.add('light')
  }
} catch {
  // ignore
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
