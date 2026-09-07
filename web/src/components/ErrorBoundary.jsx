import { Component } from 'react'

// Catches render errors anywhere below it so the whole app doesn't blank out.
// `resetKey` changes on navigation; when it changes after an error, the boundary
// clears itself so the new route gets a chance to render — no full reload needed.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled error:', error, info)
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-component-bg px-6 py-16 text-center">
        <p className="text-6xl font-extrabold tracking-tight text-purple">Oops</p>
        <h1 className="mt-4 text-2xl font-extrabold text-content">Something went wrong</h1>
        <p className="mt-2 max-w-md text-content-muted">
          An unexpected error occurred. Try again, or reload the page.
        </p>
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="rounded-lg border border-purple-light px-6 py-2.5 text-base font-bold text-purple transition-colors hover:bg-white"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-purple px-6 py-2.5 text-base font-bold text-white transition-colors hover:bg-purple-hover"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
