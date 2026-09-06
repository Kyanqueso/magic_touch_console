import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import { NAV_ITEMS } from '../components/AppHeader.jsx'
import { useAuth } from '../lib/auth.jsx'

function ErrorPage({ code, title, message }) {
  const navigate = useNavigate()
  const { key } = useLocation()
  const { session, hasModule } = useAuth()
  // 'default' means a fresh load / typed URL — treat as outside the app.
  const fromApp = key !== 'default'

  // Send them somewhere they can actually open. Hardcoding a destination sent
  // anyone without that grant straight back here, looping on the 403 page.
  const home = NAV_ITEMS.find((item) => hasModule(item.moduleKey))?.to || '/my-profile'
  const dest = session && fromApp ? home : '/login'

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-component-bg px-6 py-16 text-center">
      <p className="text-6xl font-extrabold tracking-tight text-purple">{code}</p>
      <h1 className="mt-4 text-2xl font-extrabold text-content">{title}</h1>
      <p className="mt-2 max-w-md text-content-muted">{message}</p>
      <Button className="mt-8 px-8" onClick={() => navigate(dest)}>
        {dest === '/login' ? 'Back to Login' : 'Back to Home'}
      </Button>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      title="Page not found"
      message="The page you're looking for doesn't exist or may have moved."
    />
  )
}

export function ForbiddenPage() {
  return (
    <ErrorPage
      code="403"
      title="Access denied"
      message="You don't have permission to view this page."
    />
  )
}
