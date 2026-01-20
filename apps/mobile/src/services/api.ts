import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30s for Ghana network conditions
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('quickserve_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
client.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError<{ error?: { message?: string; code?: string } }>) => {
    const message = error.response?.data?.error?.message || error.message || 'An error occurred';

    // Handle token expiration
    if (error.response?.status === 401) {
      // TODO: Implement token refresh logic
      await SecureStore.deleteItemAsync('quickserve_access_token');
    }

    throw new Error(message);
  }
);

// Type for API responses
interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Auth API
const auth = {
  sendOtp: async (phone: string) => {
    const response = await client.post<any, ApiResponse<{ message: string; expiresIn: number }>>(
      '/auth/otp/send',
      { phone }
    );
    return response.data;
  },

  verifyOtp: async (phone: string, code: string) => {
    const response = await client.post<any, ApiResponse<{
      accessToken: string;
      refreshToken: string;
      user: any;
    }>>('/auth/otp/verify', { phone, code });
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await client.post<any, ApiResponse<{ accessToken: string }>>(
      '/auth/refresh',
      { refreshToken }
    );
    return response.data;
  },
};

// Users API
const users = {
  getMe: async () => {
    const response = await client.get<any, ApiResponse<any>>('/users/me');
    return response.data;
  },

  updateMe: async (data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  }) => {
    const response = await client.patch<any, ApiResponse<any>>('/users/me', data);
    return response.data;
  },

  getMyBookings: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await client.get<any, ApiResponse<any[]>>('/users/me/bookings', { params });
    return response;
  },
};

// Workers API
const workers = {
  search: async (params: {
    categoryId?: string;
    latitude: number;
    longitude: number;
    radiusKm?: number;
    page?: number;
    limit?: number;
  }) => {
    const response = await client.get<any, ApiResponse<any[]>>('/workers/search', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await client.get<any, ApiResponse<any>>(`/workers/${id}`);
    return response.data;
  },

  register: async (data: {
    bio?: string;
    idCardUrl: string;
    services: Array<{
      categoryId: string;
      basePrice: number;
      priceUnit?: string;
      description?: string;
    }>;
  }) => {
    const response = await client.post<any, ApiResponse<any>>('/workers/register', data);
    return response.data;
  },

  updateLocation: async (data: {
    latitude: number;
    longitude: number;
    isOnline?: boolean;
  }) => {
    const response = await client.patch<any, ApiResponse<any>>('/workers/me/location', data);
    return response.data;
  },

  getMyBookings: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await client.get<any, ApiResponse<any[]>>('/workers/me/bookings', { params });
    return response;
  },
};

// Categories API
const categories = {
  getAll: async () => {
    const response = await client.get<any, ApiResponse<any[]>>('/categories');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await client.get<any, ApiResponse<any>>(`/categories/${id}`);
    return response.data;
  },
};

// Bookings API
const bookings = {
  create: async (data: {
    categoryId: string;
    workerId?: string;
    description: string;
    latitude: number;
    longitude: number;
    address: string;
    scheduledAt?: string;
  }) => {
    const response = await client.post<any, ApiResponse<any>>('/bookings', data);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await client.get<any, ApiResponse<any>>(`/bookings/${id}`);
    return response.data;
  },

  updateStatus: async (id: string, data: { status: string; finalPrice?: number }) => {
    const response = await client.patch<any, ApiResponse<any>>(`/bookings/${id}/status`, data);
    return response.data;
  },

  accept: async (id: string) => {
    const response = await client.post<any, ApiResponse<any>>(`/bookings/${id}/accept`);
    return response.data;
  },
};

// Payments API
const payments = {
  initiate: async (data: {
    bookingId: string;
    method: 'MTN_MOMO' | 'VODAFONE_CASH' | 'CASH';
    phone?: string;
  }) => {
    const response = await client.post<any, ApiResponse<any>>('/payments/initiate', data);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await client.get<any, ApiResponse<any>>(`/payments/${id}`);
    return response.data;
  },
};

// Reviews API
const reviews = {
  create: async (data: {
    bookingId: string;
    rating: number;
    comment?: string;
  }) => {
    const response = await client.post<any, ApiResponse<any>>('/reviews', data);
    return response.data;
  },

  getByWorker: async (workerId: string, params?: { page?: number; limit?: number }) => {
    const response = await client.get<any, ApiResponse<any[]>>(`/reviews/worker/${workerId}`, { params });
    return response;
  },
};

export const api = {
  auth,
  users,
  workers,
  categories,
  bookings,
  payments,
  reviews,
};
