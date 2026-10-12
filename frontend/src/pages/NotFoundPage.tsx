import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="page-error">
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary">
        Go home
      </Link>
    </div>
  );
}
