import { Link } from "react-router-dom";

/**
 * Rendered for any path the router does not know.
 *
 * Without this an unknown URL showed the nav bar over an empty page, which looks
 * like a working page that failed to load rather than telling the user the
 * address is wrong.
 */
export default function NotFound() {
  return (
    <div className="px-6 lg:px-10 py-10 max-w-[1100px] mx-auto">
      <div className="py-20 text-center">
        <p className="text-sm font-medium text-gray-400 mb-2">404</p>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Page not found
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          The page you were looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          to="/"
          className="text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors"
        >
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
