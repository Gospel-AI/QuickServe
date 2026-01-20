import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Types
export interface User {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: 'CUSTOMER' | 'WORKER' | 'ADMIN';
  status: string;
}

export interface Worker {
  id: string;
  userId: string;
  bio: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  isOnline: boolean;
  averageRating: number;
  totalReviews: number;
  totalJobsCompleted: number;
  user: User;
  services: WorkerService[];
}

export interface ServiceCategory {
  id: string;
  name: string;
  nameLocal: string | null;
  description: string | null;
  iconUrl: string | null;
}

export interface WorkerService {
  id: string;
  workerId: string;
  categoryId: string;
  basePrice: number;
  priceUnit: string;
  description: string | null;
  category: ServiceCategory;
}

export interface Booking {
  id: string;
  customerId: string;
  workerId: string | null;
  categoryId: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  status: string;
  estimatedPrice: number | null;
  finalPrice: number | null;
  scheduledAt: string | null;
  createdAt: string;
}

// API Functions
export const authApi = {
  requestOtp: (phone: string) =>
    api.post('/api/v1/auth/otp/request', { phone }),

  verifyOtp: (phone: string, code: string) =>
    api.post('/api/v1/auth/otp/verify', { phone, code }),

  getProfile: () =>
    api.get<{ success: boolean; data: User }>('/api/v1/auth/me'),
};

export const categoriesApi = {
  getAll: () =>
    api.get<{ success: boolean; data: ServiceCategory[] }>('/api/v1/categories'),
};

export const workersApi = {
  search: (params: { category?: string; latitude?: number; longitude?: number }) =>
    api.get<{ success: boolean; data: Worker[] }>('/api/v1/workers/search', { params }),

  getById: (id: string) =>
    api.get<{ success: boolean; data: Worker }>(`/api/v1/workers/${id}`),
};

export const bookingsApi = {
  create: (data: {
    categoryId: string;
    description: string;
    latitude: number;
    longitude: number;
    address: string;
    workerId?: string;
    scheduledAt?: string;
  }) => api.post<{ success: boolean; data: Booking }>('/api/v1/bookings', data),

  getMyBookings: () =>
    api.get<{ success: boolean; data: Booking[] }>('/api/v1/bookings/my'),

  getById: (id: string) =>
    api.get<{ success: boolean; data: Booking }>(`/api/v1/bookings/${id}`),
};
