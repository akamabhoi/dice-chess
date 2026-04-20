import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SocketProvider } from './context/SocketContext'
import { inject } from '@vercel/analytics'

// Inject Vanilla Vercel Analytics (Bypasses Vite/Next.js peer dependency bugs)
inject();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SocketProvider>
      <App />
    </SocketProvider>
  </StrictMode>,
)
