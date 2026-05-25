import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { FONTS } from '../assets';
import { CheckIpad } from '../utilities/securestorage';
import { useAuth } from '../contexts';
import { getLoggedToday } from '../utilities/ApiCalls';
import { useNavigation } from '@react-navigation/native';
import { useNavigationContext } from '../contexts/navigationcontext';

const { width } = Dimensions.get('window');
const isPad = CheckIpad();

interface Package {
  id: number;
  tracking_no: string;
  tag_number: string;
  created_at: string;
  recipient_name: string;
}

interface LoggedTodayData {
  time_spent: string;
  time_range: string;
  packages_logged: number;
  total_logged_in: number;  // Added
  total_logged_out: number; // Added
  packages: Package[];
  user_id: number
}

const LoggedTodayScreen = ({ }: any) => {
  const { user } = useAuth();
  let navigation = useNavigation<any>();
  const { setSearchActive } = useNavigationContext();
  // State management
  const [loggedData, setLoggedData] = useState<LoggedTodayData>({
    time_spent: '0h 0m',
    time_range: '00:00 AM - 00:00 AM',
    packages_logged: 0,
    total_logged_in: 0,
    total_logged_out: 0,
    packages: [],
    user_id: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch logged today data from API
   */
  const fetchLoggedTodayData = async () => {
    try {
      setError(null);
      if (!user?.token) {
        throw new Error('User token not available');
      }

      const data = await getLoggedToday(user);
      __DEV__ && console.log('Logged today data fetched:', data);

      setLoggedData({
        time_spent: data?.time_spent || '0h 0m',
        time_range: data?.time_range || '00:00 AM - 00:00 AM',
        packages_logged: data?.packages_logged || 0,
        packages: data?.packages || [],
        total_logged_in: data?.logged_in_count || 0,   // ✅ ADD THIS
        total_logged_out: data?.logged_out_count || 0, // ✅ ADD THIS
        user_id: data?.user_id,
      });
    } catch (err) {
      console.error('Error fetching logged today data:', err);
      setError('Failed to load logged today data');
      Alert.alert('Error', 'Failed to load logged today data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchLoggedTodayData();
  }, []);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchLoggedTodayData();
  };

  // Handle back button press
  const handleBackPress = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.mainContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Logged Today</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#223890" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Logged Today</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#223890"
          />
        }
      >

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRefresh}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statusCard}>
          <View style={styles.summarySection}>
            <View style={styles.labelRow}>
              <Text style={styles.loggedInLabel}>Logged In:</Text>
            </View>
            <Text style={[styles.summaryCount, { color: '#2D543F' }]}>{loggedData.total_logged_in || 0}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summarySection}>
            <Text style={styles.loggedOutLabel}>Logged Out:</Text>
            <Text style={[styles.summaryCount, { color: '#8B2121' }]}>{loggedData.total_logged_out || 0}</Text>
          </View>
        </View>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <Text style={styles.cardTitle}>My Summary</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time Spent: </Text>
            <Text style={styles.summaryValue}>{loggedData.time_spent}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time Range: </Text>
            <Text style={styles.summaryValue}>{loggedData.time_range}</Text>
          </View>
        </View>

        {/* Count Label */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, }}>
          <View style={styles.countContainer}>
            <Text style={styles.countText}>
              Packages Logged: {loggedData.packages_logged}
            </Text>
          </View>
          <TouchableOpacity style={styles.ListContainer} onPress={() => {
            setSearchActive(true); // <--- Navigation se pehle ise true karein
            navigation.navigate('Search', { user_id: loggedData?.user_id, today_only: true });
          }}>
            <Text style={styles.ListText}>
              List
            </Text>
          </TouchableOpacity>
        </View>

        {/* Empty State */}
        {loggedData.packages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No packages logged today</Text>
          </View>
        ) : (
          /* Packages List */
          loggedData.packages.map((item, index) => (
            <View key={item.id || index} style={styles.packageCard}>
              <Text style={styles.recipientName}>{item.recipient_name}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tracking ID: </Text>
                <Text style={styles.infoValue}>{item.tracking_no}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tag Number: </Text>
                <Text style={styles.infoValue}>{item.tag_number}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Time: </Text>
                <Text style={styles.infoValue}>{item.created_at}</Text>
              </View>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    backgroundColor: '#FFFFFF',
    height: isPad ? 80 : 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    color: '#333333',
    fontSize: isPad ? 26 : 18,
    fontFamily: FONTS.PoppinsSemiBold,
    fontWeight: '700',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    color: '#333',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: FONTS.PoppinsRegular,
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3333',
  },
  errorText: {
    color: '#CC0000',
    fontSize: 14,
    fontFamily: FONTS.PoppinsRegular,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#FF3333',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONTS.PoppinsSemiBold,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#F4F7F9',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#E8EEF3',
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    color: '#002B45',
    fontWeight: 'bold',
    fontFamily: FONTS.PoppinsSemiBold,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 15,
    color: '#5AC8FA',
    fontFamily: FONTS.PoppinsRegular,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 15,
    color: '#444',
    fontFamily: FONTS.PoppinsSemiBold,
    fontWeight: '600',
  },
  countContainer: {
    // marginBottom: 20,
  },
  countText: {
    fontSize: 18,
    color: '#002B45',
    fontWeight: 'bold',
    fontFamily: FONTS.PoppinsSemiBold,
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontFamily: FONTS.PoppinsRegular,
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recipientName: {
    fontSize: 18,
    color: '#002B45',
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: FONTS.PoppinsSemiBold,
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 6,
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 14,
    color: '#5AC8FA',
    fontFamily: FONTS.PoppinsRegular,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
    fontFamily: FONTS.PoppinsRegular,
    flex: 1,
    textAlign: 'right',
  },
  ListContainer: {
    borderColor: 'lightgrey',
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderRadius: 10
  },
  ListText: {
    fontSize: 15,
    color: '#002B45',
    fontWeight: '500',
    fontFamily: FONTS.PoppinsSemiBold,
  },
  statusCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingVertical: 20,
    marginBottom: 20,
    // Shadow/Elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summarySection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    height: '70%',
    alignSelf: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  greenCheck: {
    color: '#4CAF50',
    fontSize: 16,
    marginRight: 5,
    fontWeight: 'bold',
  },
  loggedInLabel: {
    fontSize: 16,
    color: '#333',
    fontFamily: FONTS.PoppinsSemiBold,
  },
  loggedOutLabel: {
    fontSize: 16,
    color: '#8B2121',
    fontFamily: FONTS.PoppinsSemiBold,
    marginBottom: 5,
  },
  summaryCount: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: FONTS.PoppinsBold,
  },
  listWrapper: {
    marginTop: 5,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userAvatar: {
    fontSize: 24,
    marginRight: 10,
    color: '#5C7491',
  },

  statsContainer: {
    paddingLeft: 34, // Aligning text under the name, not under the icon
  },
  userLoggedInText: {
    color: '#2D543F',
    fontSize: 15,
    fontFamily: FONTS.PoppinsSemiBold,
    marginBottom: 4,
  },

  userLoggedOutText: {
    color: '#8B2121',
    fontSize: 15,
    fontFamily: FONTS.PoppinsSemiBold,
    marginBottom: 8,
  },
  timeRow: {
    marginBottom: 4,
  },
  timeSpentLabel: {
    fontSize: 13,
    color: '#777',
    fontFamily: FONTS.PoppinsRegular,
  },
  timeRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeRangeLabel: {
    fontSize: 13,
    color: '#777',
    fontFamily: FONTS.PoppinsRegular,
  },
  timeRangeValue: {
    fontSize: 13,
    color: '#333',
    fontFamily: FONTS.PoppinsSemiBold,
  },
});

export default LoggedTodayScreen;