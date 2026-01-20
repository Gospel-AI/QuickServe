import axios from 'axios';
import { useAuthStore } from '@/store/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    throw error.response?.data?.error || error;
  }
);

// API functions
export const api = {
  // Users
  users: {
    getAll: (params?: { page?: number; limit?: number; role?: string }) =>
      apiClient.get('/users', { params }),
    getById: (id: string) => apiClient.get(`/users/${id}`),
  },

  // Workers
  workers: {
    getAll: (params?: { status?: string; page?: number; limit?: number }) =>
      apiClient.get('/workers', { params }),
    getById: (id: string) => apiClient.get(`/workers/${id}`),
    approve: (id: string) => apiClient.post(`/workers/${id}/approve`),
    reject: (id: string) => apiClient.post(`/workers/${id}/reject`),
  },

  // Bookings
  bookings: {
    getAll: (params?: { status?: string; page?: number; limit?: number }) =>
      apiClient.get('/bookings', { params }),
    getById: (id: string) => apiClient.get(`/bookings/${id}`),
  },

  // Categories
  categories: {
    getAll: () => apiClient.get('/categories'),
    create: (data: { name: string; description?: string; iconUrl?: string }) =>
      apiClient.post('/categories', data),
    update: (id: string, data: { name?: string; description?: string; iconUrl?: string }) =>
      apiClient.patch(`/categories/${id}`, data),
  },

  // Analytics
  analytics: {
    getDashboard: () => apiClient.get('/analytics/dashboard'),
    getRevenue: (params?: { from?: string; to?: string }) =>
      apiClient.get('/analytics/revenue', { params }),
  },
};
