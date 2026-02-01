import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-6xl font-bold text-white">
          Freebase
        </h1>
        <p className="text-2xl text-indigo-100">
          Self-hosted Supabase Alternative
        </p>
        <p className="text-lg text-indigo-200 max-w-2xl mx-auto">
          Multi-tenant PostgreSQL platform with Docker isolation, 
          built for developers who want full control.
        </p>
        <div className="flex gap-4 justify-center pt-8">
          <Link
            href="/auth/register"
            className="px-8 py-3 bg-white text-indigo-600 font-semibold rounded-lg shadow-lg hover:bg-indigo-50 transition"
          >
            Get Started
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-800 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
