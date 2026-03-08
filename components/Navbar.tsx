'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/providers';

export default function Navbar() {
  const { user, loading, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const logoHref = user ? '/dashboard' : '/';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href={logoHref}
            className="text-xl font-bold tracking-tight hover:opacity-90 transition-opacity"
          >
            Auditflow
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {loading ? (
              <div className="h-5 w-24 animate-pulse rounded bg-navy-light" />
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-md px-3 py-2 text-sm font-medium hover:bg-navy-light transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-sm text-gray-300 truncate max-w-[200px]">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="rounded-md bg-navy-light px-4 py-2 text-sm font-medium hover:bg-navy-dark transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md px-4 py-2 text-sm font-medium hover:bg-navy-light transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-teal px-4 py-2 text-sm font-medium hover:bg-teal-dark transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-navy-light transition-colors"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-navy-light px-4 pb-4 pt-2 space-y-2">
          {loading ? (
            <div className="h-5 w-24 animate-pulse rounded bg-navy-light" />
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-navy-light transition-colors"
              >
                Dashboard
              </Link>
              <div className="px-3 py-2 text-sm text-gray-300 truncate">
                {user.email}
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                className="block w-full text-left rounded-md bg-navy-light px-3 py-2 text-sm font-medium hover:bg-navy-dark transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-navy-light transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-md bg-teal px-3 py-2 text-sm font-medium text-center hover:bg-teal-dark transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
