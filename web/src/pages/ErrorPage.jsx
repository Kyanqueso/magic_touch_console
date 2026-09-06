import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'

function ErrorPage({ code, title, message }) {
  const navigate = useNavigate()
  const { key } = useLocation()
  // 'default' means a fresh load / typed URL — treat as outside the app.
  const fromApp = key !== 'default'

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-component-bg px-6 py-16 text-center">
      <p className="text-6xl font-extrabold tracking-tight text-purple">{code}</p>
      <h1 className="mt-4 text-2xl font-extrabold text-content">{title}</h1>
      <p className="mt-2 max-w-md text-content-muted">{message}</p>
      <Button
        className="mt-8 px-8"
        onClick={() => navigate(fromApp ? '/corporate-profiles' : '/login')}
      >
        {fromApp ? 'Back to Home' : 'Back to Login'}
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
