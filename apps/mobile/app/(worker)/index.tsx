import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuthStore } from '@/store/auth';
import { api } from '@/services/api';

interface Booking {
  id: string;
  status: string;
  description: string;
  address: string;
  estimatedPrice: number | null;
  createdAt: string;
  category: {
    id: string;
    name: string;
  };
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string;
  };
}

export default function WorkerHomeScreen() {
  const { user } = useAuthStore();
  const [isOnline, setIsOnline] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const response = await api.workers.getMyBookings({ status: 'PENDING' });
      setBookings(response.data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleToggleOnline = async (value: boolean) => {
    setIsOnline(value);

    if (value) {
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        await api.workers.updateLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          isOnline: true,
        });
      }
    } else {
      await api.workers.updateLocation({
        latitude: 0,
        longitude: 0,
        isOnline: false,
      });
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      await api.bookings.accept(bookingId);
      fetchBookings();
    } catch (error) {
      console.error('Failed to accept booking:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchBookings} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>
              {user?.firstName || 'Worker'}
            </Text>
          </View>
          <View style={styles.onlineToggle}>
            <Text style={[styles.onlineText, isOnline && styles.onlineTextActive]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={isOnline ? '#2563EB' : '#9CA3AF'}
            />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {user?.worker?.verificationStatus === 'VERIFIED' ? '✓' : '⏳'}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Today's Jobs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>GHS 0</Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
          </View>
        </View>

        {/* Job Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Job Requests</Text>

          {bookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No new job requests</Text>
              <Text style={styles.emptySubtext}>
                {isOnline
                  ? 'New requests will appear here'
                  : 'Go online to receive job requests'}
              </Text>
            </View>
          ) : (
            bookings.map((booking) => (
              <View key={booking.id} style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{booking.category.name}</Text>
                  </View>
                  {booking.estimatedPrice && (
                    <Text style={styles.jobPrice}>GHS {booking.estimatedPrice}</Text>
                  )}
                </View>

                <Text style={styles.jobDescription} numberOfLines={2}>
                  {booking.description}
                </Text>

                <View style={styles.jobLocation}>
                  <Ionicons name="location-outline" size={16} color="#6B7280" />
                  <Text style={styles.jobAddress} numberOfLines={1}>
                    {booking.address}
                  </Text>
                </View>

                <View style={styles.jobActions}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => {}}
                  >
                    <Text style={styles.rejectText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptBooking(booking.id)}
                  >
                    <Text style={styles.acceptText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
    marginRight: 8,
  },
  onlineTextActive: {
    color: '#2563EB',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  jobPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  jobDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },
  jobLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  jobAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    marginRight: 8,
  },
  rejectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    marginLeft: 8,
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
