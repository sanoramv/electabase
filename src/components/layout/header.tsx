import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-gray-900">
              ElectaBase
            </span>
            <span className="hidden text-xs text-gray-500 sm:inline">
              Political Transparency Database
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/politicians"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Politicians
            </Link>
            <Link
              href="/parties"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Parties
            </Link>
            <Link
              href="/leaderboards"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Leaderboards
            </Link>
            <Link
              href="/compare"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Compare
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              About
            </Link>
            <Link
              href="/admin"
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Admin
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
