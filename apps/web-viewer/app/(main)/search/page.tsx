'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Worker {
  id: string;
  bio: string;
  averageRating: number;
  totalReviews: number;
  totalJobsCompleted: number;
  user: {
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  services: Array<{
    basePrice: number;
    category: {
      name: string;
    };
  }>;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get('category');

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category) params.set('category', category);

        const response = await fetch(`/api/api/v1/workers/search?${params}`);
        const data = await response.json();

        if (data.success) {
          setWorkers(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch workers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, [category]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            QuickServe
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Login
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Services` : 'All Workers'}
        </h1>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No workers found in your area.</p>
            <p className="text-gray-400 mt-2">Try a different category or expand your search.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workers.map((worker) => (
              <Link
                key={worker.id}
                href={`/worker/${worker.id}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-2xl">
                    {worker.user.avatarUrl ? (
                      <img
                        src={worker.user.avatarUrl}
                        alt={worker.user.firstName}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      '👷'
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {worker.user.firstName} {worker.user.lastName}
                    </h3>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <span className="text-yellow-500">★</span>
                      <span className="ml-1">{worker.averageRating.toFixed(1)}</span>
                      <span className="mx-1">·</span>
                      <span>{worker.totalReviews} reviews</span>
                    </div>
                    {worker.services[0] && (
                      <p className="text-sm text-primary-600 mt-1">
                        From GH₵{worker.services[0].basePrice}
                      </p>
                    )}
                  </div>
                </div>
                {worker.bio && (
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">{worker.bio}</p>
                )}
                <div className="mt-3 flex items-center text-xs text-gray-400">
                  <span>{worker.totalJobsCompleted} jobs completed</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
