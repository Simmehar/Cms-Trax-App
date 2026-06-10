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
import { getTotalReceived } from '../utilities/ApiCalls';
import ReceiveFiltersModal from '../components/ReceiveFilterModal';
import { useNavigationContext } from '../contexts/navigationcontext';

const { width } = Dimensions.get('window');
const isPad = CheckIpad();

interface User {
  user_id: number;
  user_name: string;
  packages_count: number;
  logged_in_count: number;
  logged_out_count: number;
  time_spent: string;
  time_range: string;
}

interface TotalReceivedData {
  total_packages: number;
  total_time_spent: string;
  total_logged_in: number;  // Added
  total_logged_out: number; // Added
  users: User[];
}

const TotalReceive = ({ navigation }: any) => {
  const { user } = useAuth();
  const { setSearchActive } = useNavigationContext();
  // State management
  const [totalData, setTotalData] = useState<TotalReceivedData>({
    total_packages: 0,
    total_time_spent: '0h 0m',
    total_logged_in: 0,   // ✅ ADD
    total_logged_out: 0,  // ✅ ADD
    users: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [filteredData, setFilteredData] = useState<TotalReceivedData | null>(null);

  /**
   * Fetch total received data from API
   */
  const fetchTotalReceivedData = async () => {
    try {
      setError(null);
      if (!user?.token) {
        throw new Error('User token not available');
      }

      const data = await getTotalReceived(user);
      __DEV__ && console.log('Total received data fetched:', data);

      setTotalData({
        total_packages: data?.total_packages || 0,
        total_time_spent: data?.total_time_spent || '0h 0m',
        total_logged_in: data?.total_logged_in || 0,   // ✅ ADD THIS
        total_logged_out: data?.total_logged_out || 0, // ✅ ADD THIS
        users: data?.users || [],
      });

      // Reset filter when refreshing
      setFilteredData(null);
    } catch (err) {
      console.error('Error fetching total received data:', err);
      setError('Failed to load total received data');
      Alert.alert('Error', 'Failed to load total received data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchTotalReceivedData();
  }, []);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchTotalReceivedData();
  };

  // Handle back button press
  const handleBackPress = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  /**
   * Handle filter modal close
   * @param apply - Whether to apply filters
   * @param sortBy - Sort field (e.g., 'packages_count', 'time_spent')
   * @param order - Sort order ('asc' or 'desc')
   */
  const handleCloseModal = (apply: boolean, sortBy?: string, order?: string) => {
    setIsModalVisible(false);

    if (apply && sortBy && order) {
      __DEV__ && console.log('Applying filter:', { sortBy, order });

      // Create a copy of the current data to filter/sort
      const dataToSort = filteredData || totalData;
      const sortedUsers = [...dataToSort.users].sort((a, b) => {
        let valueA = a[sortBy as keyof User];
        let valueB = b[sortBy as keyof User];

        // Handle numeric comparisons (packages_count)
        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return order === 'asc' ? valueA - valueB : valueB - valueA;
        }

        // Handle string comparisons
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return order === 'asc'
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }

        return 0;
      });

      setFilteredData({
        ...dataToSort,
        users: sortedUsers,
      });
    }
  };

  // Get display data (filtered or original)
  const displayData = filteredData || totalData;
  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.mainContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Total Received</Text>
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
        <Text style={styles.headerTitle}>Total Summary</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#223890" />}
      >
        {/* TOP STATS CARD (Two Columns) */}
        <View style={styles.summaryCard}>
          <View style={styles.summarySection}>
            <View style={styles.labelRow}>
              <Text style={styles.loggedInLabel}>Logged In:</Text>
            </View>
            <Text style={[styles.summaryCount, { color: '#2D543F' }]}>{displayData.total_logged_in || 0}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summarySection}>
            <Text style={styles.loggedOutLabel}>Logged Out:</Text>
            <Text style={[styles.summaryCount, { color: '#8B2121' }]}>{displayData.total_logged_out || 0}</Text>
          </View>
        </View>

        {/* USER CARDS LIST */}
        <View style={styles.listWrapper}>
          {displayData.users.map((item, index) => (
            <TouchableOpacity
              key={item.user_id || index}
              style={styles.userCard}
              onPress={() => {
                setSearchActive(true);
                navigation.push('Search', { user_id: item?.user_id, today_only: true });
              }}
            >
              <View style={styles.cardMainRow}>
                {/* Icon Wrapper (The Grey Square) */}
                <View style={styles.iconContainer}>
                  <Text style={styles.userAvatar}>👤</Text>
                </View>

                {/* Info Container */}
                <View style={styles.infoContainer}>
                  <Text style={styles.userName}>{item.user_name}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} >
                    <Text style={styles.userLoggedOutText} >
                      Logged Out: <Text style={styles.countText}>{item.logged_out_count}</Text>
                    </Text>
                    <Text style={styles.userLoggedInText}>
                      Logged In: <Text style={styles.countText}>{item.logged_in_count}</Text>
                    </Text>


                  </View>
                </View>
              </View>

              {/* Bottom Section */}
              <View style={styles.cardDivider} />

              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>Time Spent: <Text style={styles.footerValue}>{item.time_spent}</Text></Text>
              </View>

              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>Time Range</Text>
                <Text style={styles.timeRangeValue}>{item.time_range}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <ReceiveFiltersModal
        visible={isModalVisible}
        onClose={handleCloseModal}
        hasFiltersApplied={filteredData !== null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    
  },
  header: {
    backgroundColor: '#FFFFFF',
    height: isPad ? 80 : 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    color: '#1A1A1A',
    fontSize: isPad ? 26 : 19,
    fontFamily: FONTS.RICORDOSemiBold,
    fontWeight: '700',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F6F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: '#333',
  },
  scrollContent: {
    paddingBottom: 30,
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
    fontFamily: FONTS.RICORDORegular,
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3333',
  },
  errorText: {
    color: '#CC0000',
    fontSize: 14,
    fontFamily: FONTS.RICORDORegular,
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
    fontFamily: FONTS.RICORDOSemiBold,
    fontWeight: '600',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  countInfo: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 17,
    color: '#002B45',
    fontWeight: 'bold',
    fontFamily: FONTS.RICORDOSemiBold,
    marginBottom: 8,
  },
  totalCount: {
    fontWeight: 'normal',
    color: '#8E8E93',
  },
  timeLabel: {
    fontSize: 15,
    color: '#666',
    fontFamily: FONTS.RICORDORegular,
  },
  timeValue: {
    fontWeight: '600',
    color: '#223890',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  filterIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#555',
  },
  filterText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    fontFamily: FONTS.RICORDOSemiBold,
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontFamily: FONTS.RICORDORegular,
  },
  cardsContainer: {
    backgroundColor: '#F2F2F2',
    marginHorizontal: 15,
    borderRadius: 20,
    padding: 15,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#87CEFA',
    fontFamily: FONTS.RICORDORegular,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#444',
    fontFamily: FONTS.RICORDORegular,
    flex: 1,
    textAlign: 'right',
  },
  summaryCard: {
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
    fontFamily: FONTS.RICORDOSemiBold,
  },
  loggedOutLabel: {
    fontSize: 16,
    color: '#8B2121',
    fontFamily: FONTS.RICORDOSemiBold,
    marginBottom: 5,
  },
  summaryCount: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: FONTS.RICORDOBold,
    color: '#002B45',
  },


  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  statsContainer: {
    paddingLeft: 34, // Aligning text under the name, not under the icon
  },
  timeRow: {
    marginBottom: 4,
  },
  timeSpentLabel: {
    fontSize: 13,
    color: '#777',
    fontFamily: FONTS.RICORDORegular,
  },
  timeRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeRangeLabel: {
    fontSize: 13,
    color: '#777',
    fontFamily: FONTS.RICORDORegular,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20, // Add horizontal margin as per design
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8EDF1', // Lighter border color
    // Shadow for iOS/Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  iconContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#F5F7F9', // Grey background square
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    color: '#002B45',
    fontWeight: '700',
    fontFamily: FONTS.RICORDOBold,
    marginBottom: 4,
  },
  userAvatar: {
    fontSize: 24,
  },
  userLoggedInText: {

    fontSize: 14,
    fontFamily: FONTS.RICORDOSemiBold,
    marginBottom: 2,
  },
  userLoggedOutText: {
    fontSize: 14,
    fontFamily: FONTS.RICORDOSemiBold,
  },
  countText: {
    fontWeight: 'bold', // Make numbers bold
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0F3F5',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  footerLabel: {
    fontSize: 13,
    color: '#9EABB8', // Muted grey from screenshot
    fontFamily: FONTS.RICORDORegular,
  },
  footerValue: {
    color: '#9EABB8',
    fontFamily: FONTS.RICORDORegular,
  },
  timeRangeValue: {
    fontSize: 13,
    color: '#002B45', // Darker blue/black for the actual time
    fontFamily: FONTS.RICORDOBold,
    fontWeight: '800',
  },
  listWrapper: {
    marginTop: 10,
  },
});

export default TotalReceive;