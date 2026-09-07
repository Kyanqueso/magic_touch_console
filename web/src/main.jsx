import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './lib/auth.jsx'
import { UnsavedChangesProvider } from './lib/unsavedChanges.jsx'
import './index.css'

// Inside the router so a route change can reset the boundary after an error.
function RoutedErrorBoundary({ children }) {
  const { pathname } = useLocation()
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <RoutedErrorBoundary>
        <AuthProvider>
          <UnsavedChangesProvider>
            <App />
          </UnsavedChangesProvider>
        </AuthProvider>
      </RoutedErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
