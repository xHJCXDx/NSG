import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-6xl font-bold text-brand-500 mb-4">404</h1>
      <p className="text-xl text-gray-400 mb-8">Page not found</p>
      <Link
        to="/"
        className="px-6 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
