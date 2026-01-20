'use client';

import Link from 'next/link';
import { useState } from 'react';

const categories = [
  { id: 'plumber', name: 'Plumber', icon: '🔧', nameLocal: 'Plumber' },
  { id: 'electrician', name: 'Electrician', icon: '⚡', nameLocal: 'Electrician' },
  { id: 'phone-repair', name: 'Phone Repair', icon: '📱', nameLocal: 'Phone Repair' },
  { id: 'cleaning', name: 'House Cleaning', icon: '🧹', nameLocal: 'Cleaning' },
  { id: 'carpenter', name: 'Carpenter', icon: '🪚', nameLocal: 'Carpenter' },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-600">QuickServe</h1>
          <nav className="flex items-center space-x-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Link
              href="/register"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-primary-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Find Skilled Workers Near You
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Connect with verified professionals for plumbing, electrical, repairs, and more.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="flex bg-white rounded-lg shadow-lg overflow-hidden">
              <input
                type="text"
                placeholder="What service do you need?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-6 py-4 text-gray-900 focus:outline-none"
              />
              <button className="bg-ghana-gold text-black px-8 py-4 font-semibold hover:bg-yellow-500">
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Popular Services
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/search?category=${category.id}`}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center"
              >
                <span className="text-4xl mb-3 block">{category.icon}</span>
                <h4 className="font-semibold text-gray-900">{category.name}</h4>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-12 text-center">
            How It Works
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📍</span>
              </div>
              <h4 className="font-semibold text-lg mb-2">1. Share Your Location</h4>
              <p className="text-gray-600">We find skilled workers near you</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👷</span>
              </div>
              <h4 className="font-semibold text-lg mb-2">2. Choose a Worker</h4>
              <p className="text-gray-600">View ratings, reviews, and prices</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h4 className="font-semibold text-lg mb-2">3. Book & Pay</h4>
              <p className="text-gray-600">Secure payment via MTN MoMo</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h5 className="font-bold text-lg mb-4">QuickServe</h5>
              <p className="text-gray-400">
                Connecting you with trusted local professionals.
              </p>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Services</h5>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/search?category=plumber">Plumbers</Link></li>
                <li><Link href="/search?category=electrician">Electricians</Link></li>
                <li><Link href="/search?category=cleaning">Cleaners</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Company</h5>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about">About Us</Link></li>
                <li><Link href="/contact">Contact</Link></li>
                <li><Link href="/become-worker">Become a Worker</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Support</h5>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help">Help Center</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© 2025 QuickServe. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
