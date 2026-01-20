'use client';

import { useState } from 'react';
import { Search, Filter, MoreVertical, CheckCircle, XCircle, Clock } from 'lucide-react';

type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

interface Worker {
  id: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    phone: string;
  };
  verificationStatus: VerificationStatus;
  averageRating: number;
  totalReviews: number;
  totalJobsCompleted: number;
  createdAt: string;
}

const statusBadge: Record<VerificationStatus, { class: string; label: string }> = {
  PENDING: { class: 'badge-warning', label: 'Pending' },
  VERIFIED: { class: 'badge-success', label: 'Verified' },
  REJECTED: { class: 'badge-danger', label: 'Rejected' },
};

export default function WorkersPage() {
  const [filter, setFilter] = useState<'all' | VerificationStatus>('all');
  const [search, setSearch] = useState('');

  // Mock data - in real app, fetch from API
  const workers: Worker[] = [
    {
      id: '1',
      user: { firstName: 'Kwame', lastName: 'Asante', phone: '+233241234567' },
      verificationStatus: 'PENDING',
      averageRating: 0,
      totalReviews: 0,
      totalJobsCompleted: 0,
      createdAt: '2024-01-15',
    },
    {
      id: '2',
      user: { firstName: 'Ama', lastName: 'Mensah', phone: '+233242345678' },
      verificationStatus: 'VERIFIED',
      averageRating: 4.8,
      totalReviews: 45,
      totalJobsCompleted: 78,
      createdAt: '2024-01-10',
    },
  ];

  const handleApprove = async (id: string) => {
    // Call API to approve worker
    console.log('Approve worker:', id);
  };

  const handleReject = async (id: string) => {
    // Call API to reject worker
    console.log('Reject worker:', id);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search workers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="input w-48"
        >
          <option value="all">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Workers Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Worker
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Rating
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Jobs
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Joined
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {workers.map((worker) => (
              <tr key={worker.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-600 font-semibold">
                        {worker.user.firstName?.[0] || 'W'}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">
                        {worker.user.firstName} {worker.user.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{worker.user.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`badge ${statusBadge[worker.verificationStatus].class}`}>
                    {statusBadge[worker.verificationStatus].label}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {worker.averageRating > 0 ? (
                    <div className="flex items-center">
                      <span className="text-yellow-400">★</span>
                      <span className="ml-1">{worker.averageRating.toFixed(1)}</span>
                      <span className="text-gray-400 text-sm ml-1">
                        ({worker.totalReviews})
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">No reviews</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-900">
                  {worker.totalJobsCompleted}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(worker.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  {worker.verificationStatus === 'PENDING' ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleReject(worker.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Reject"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleApprove(worker.id)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Approve"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
