'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, Briefcase, Calendar, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';

export default function DashboardPage() {
  // In a real app, you'd fetch these stats from the API
  const stats = [
    { name: 'Total Users', value: '1,234', icon: Users, change: '+12%' },
    { name: 'Active Workers', value: '567', icon: Briefcase, change: '+8%' },
    { name: 'Bookings Today', value: '89', icon: Calendar, change: '+23%' },
    { name: 'Revenue (GHS)', value: '12,450', icon: CreditCard, change: '+15%' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.value}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-primary-600" />
              </div>
            </div>
            <p className="text-sm text-green-600 mt-2">{stat.change} from last week</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Bookings
          </h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">Plumbing Service</p>
                  <p className="text-sm text-gray-500">John Doe • 2 hours ago</p>
                </div>
                <span className="badge badge-info">Pending</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Verifications */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pending Worker Verifications
          </h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">Worker Name</p>
                    <p className="text-sm text-gray-500">Electrician</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-secondary text-sm py-1">
                    Reject
                  </button>
                  <button className="btn btn-primary text-sm py-1">
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
