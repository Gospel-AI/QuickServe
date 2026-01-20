import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { api } from '@/services/api';

interface Worker {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  bio: string | null;
  rating: number;
  totalReviews: number;
  distanceKm: number;
  isOnline: boolean;
  services: Array<{
    id: string;
    basePrice: number;
    priceUnit: string;
    category: {
      id: string;
      name: string;
    };
  }>;
}

interface Category {
  id: string;
  name: string;
  nameLocal: string | null;
}

export default function WorkersScreen() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    getLocationAndFetch();
  }, [categoryId]);

  const getLocationAndFetch = async () => {
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'Please enable location to find workers near you',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      setLocation(coords);

      // Fetch category info and workers
      await Promise.all([
        fetchCategory(),
        fetchWorkers(coords),
      ]);
    } catch (error) {
      console.error('Failed to get location:', error);
      // Use default location (Accra, Ghana) for testing
      const defaultCoords = { latitude: 5.6037, longitude: -0.1870 };
      setLocation(defaultCoords);
      await Promise.all([
        fetchCategory(),
        fetchWorkers(defaultCoords),
      ]);
    }
  };

  const fetchCategory = async () => {
    if (!categoryId) return;
    try {
      const data = await api.categories.getById(categoryId);
      setCategory(data);
    } catch (error) {
      console.error('Failed to fetch category:', error);
    }
  };

  const fetchWorkers = async (coords: { latitude: number; longitude: number }) => {
    if (!categoryId) return;
    setIsLoading(true);
    try {
      const data = await api.workers.search({
        categoryId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        radiusKm: 20,
      });
      setWorkers(data);
    } catch (error) {
      console.error('Failed to fetch workers:', error);
      Alert.alert('Error', 'Failed to load workers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkerPress = (workerId: string) => {
    router.push({
      pathname: '/(customer)/worker-detail',
      params: { workerId, categoryId },
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={14} color="#FBBF24" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={14} color="#FBBF24" />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={14} color="#D1D5DB" />
        );
      }
    }
    return stars;
  };

  const renderWorker = ({ item }: { item: Worker }) => {
    const service = item.services.find(s => s.category.id === categoryId);

    return (
      <TouchableOpacity
        style={styles.workerCard}
        onPress={() => handleWorkerPress(item.id)}
      >
        <View style={styles.workerHeader}>
          <View style={styles.avatarContainer}>
            {item.user.avatarUrl ? (
              <Image
                source={{ uri: item.user.avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {item.user.firstName?.[0] || '?'}
                </Text>
              </View>
            )}
            {item.isOnline && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.workerInfo}>
            <Text style={styles.workerName}>
              {item.user.firstName} {item.user.lastName}
            </Text>
            <View style={styles.ratingRow}>
              <View style={styles.stars}>{renderStars(item.rating)}</View>
              <Text style={styles.ratingText}>
                {item.rating.toFixed(1)} ({item.totalReviews})
              </Text>
            </View>
            <View style={styles.distanceRow}>
              <Ionicons name="location-outline" size={14} color="#6B7280" />
              <Text style={styles.distanceText}>
                {item.distanceKm.toFixed(1)} km away
              </Text>
            </View>
          </View>
        </View>

        {item.bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {item.bio}
          </Text>
        )}

        {service && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.price}>
              GH₵ {service.basePrice.toFixed(2)}
              <Text style={styles.priceUnit}> / {service.priceUnit}</Text>
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => handleWorkerPress(item.id)}
        >
          <Text style={styles.bookButtonText}>View Profile</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {category?.name || 'Workers'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Finding workers near you...</Text>
        </View>
      ) : workers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No workers found</Text>
          <Text style={styles.emptyText}>
            There are no {category?.name?.toLowerCase() || 'workers'} available in your area right now.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => location && fetchWorkers(location)}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={workers}
          renderItem={renderWorker}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  workerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  workerHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2563EB',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  workerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  bio: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  priceUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
  },
  bookButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
