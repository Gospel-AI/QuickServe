import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export default function Index() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Redirect based on user role
  if (user?.role === 'WORKER') {
    return <Redirect href="/(worker)" />;
  }

  return <Redirect href="/(customer)" />;
}
