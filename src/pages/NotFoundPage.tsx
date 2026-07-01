import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="not-found">
      <span>404</span>
      <h2>Page not found</h2>
      <Link className="button primary" to="/">Return to dashboard</Link>
    </div>
  )
}
