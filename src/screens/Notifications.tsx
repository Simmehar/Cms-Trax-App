import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  DeviceEventEmitter,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import { BackHeader } from '../components/Header';
import { FONTS, ICONS } from '../assets';
import { useAuth } from '../contexts';
import { isIPad } from '../utilities/securestorage';
import {
  AppNotification,
  NOTIFICATIONS_CHANGED_EVENT,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
} from '../utilities/ApiCalls';

dayjs.extend(relativeTime);

const PAGE_SIZE = 20;
const ACCENT = '#223890';

type Filter = 'all' | 'unread';
type LoadMode = 'initial' | 'refresh' | 'more';

const timeAgo = (iso: string, language: string) => {
  if (!iso) return '';
  const date = dayjs(iso);
  if (!date.isValid()) return '';
  return date.locale(language.startsWith('es') ? 'es' : 'en').fromNow();
};

const dedupeById = (rows: AppNotification[]) => {
  const seen = new Set<number>();
  return rows.filter(row => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
};

const Notifications: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards against stale responses when the filter changes mid-request.
  const requestId = useRef(0);

  const notifyChanged = () => DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED_EVENT);

  const fetchPage = useCallback(
    async (pageNumber: number, mode: LoadMode) => {
      if (!user?.token) return;
      const id = ++requestId.current;
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      setError(null);
      try {
        const params: { page: number; page_size: number; is_read?: boolean } = {
          page: pageNumber,
          page_size: PAGE_SIZE,
        };
        if (filter === 'unread') params.is_read = false;

        const [pageData, unread] = await Promise.all([
          getNotifications(user, params),
          mode === 'more' ? Promise.resolve(null) : getUnreadNotificationCount(user),
        ]);
        if (id !== requestId.current) return;

        setItems(prev =>
          pageNumber === 1 ? pageData.results : dedupeById([...prev, ...pageData.results]),
        );
        setPage(pageNumber);
        setHasMore(pageData.next != null || pageNumber * PAGE_SIZE < pageData.count);
        if (unread !== null) setUnreadTotal(unread);
      } catch (e: any) {
        if (id !== requestId.current) return;
        __DEV__ && console.log('notifications error', e?.response?.data || e?.message);
        setError(t('Failed to load notifications'));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [user, filter, t],
  );

  // First load and whenever the All / Unread filter changes
  useEffect(() => {
    setItems([]);
    fetchPage(1, 'initial');
  }, [fetchPage]);

  const onRefresh = () => fetchPage(1, 'refresh');

  const onEndReached = () => {
    if (!loading && !loadingMore && !refreshing && hasMore) {
      fetchPage(page + 1, 'more');
    }
  };

  const markOneRead = async (item: AppNotification) => {
    if (item.is_read) return;
    // Optimistic update, then tell the server
    setItems(prev =>
      filter === 'unread'
        ? prev.filter(row => row.id !== item.id)
        : prev.map(row => (row.id === item.id ? { ...row, is_read: true } : row)),
    );
    setUnreadTotal(prev => Math.max(0, prev - 1));
    try {
      await markNotificationsRead(user, { notification_ids: [item.id] });
      notifyChanged();
    } catch (e: any) {
      __DEV__ && console.log('mark read error', e?.response?.data || e?.message);
      fetchPage(1, 'refresh');
    }
  };

  const markAllRead = async () => {
    if (unreadTotal === 0) return;
    setItems(prev =>
      filter === 'unread' ? [] : prev.map(row => ({ ...row, is_read: true })),
    );
    setUnreadTotal(0);
    try {
      await markNotificationsRead(user, { mark_all: true });
      notifyChanged();
    } catch (e: any) {
      __DEV__ && console.log('mark all read error', e?.response?.data || e?.message);
      fetchPage(1, 'refresh');
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.card, !item.is_read && styles.cardUnread]}
      activeOpacity={0.7}
      onPress={() => markOneRead(item)}>
      <View style={[styles.iconWrap, !item.is_read && styles.iconWrapUnread]}>
        <SvgXml
          xml={ICONS.header.notification}
          width={isIPad ? 26 : 20}
          height={isIPad ? 26 : 20}
        />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, !item.is_read && styles.titleUnread]}
            numberOfLines={2}>
            {item.title || t('Notification')}
          </Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        {!!item.message && (
          <Text style={styles.message} numberOfLines={3}>
            {item.message}
          </Text>
        )}
        <Text style={styles.time}>{timeAgo(item.created_at, i18n.language)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (loading) return null;
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>{t('Retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <SvgXml
            xml={ICONS.header.notification}
            width={isIPad ? 56 : 40}
            height={isIPad ? 56 : 40}
          />
        </View>
        <Text style={styles.emptyTitle}>
          {filter === 'unread' ? t("You're all caught up") : t('No notifications yet')}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.mainView}>
      <BackHeader title={t('Notifications')} />

      {/* Filter chips on the left, mark-all on the right */}
      <View style={styles.toolbar}>
        <View style={styles.chips}>
          {(['all', 'unread'] as Filter[]).map(value => {
            const active = filter === value;
            const label =
              value === 'all'
                ? t('All')
                : unreadTotal > 0
                  ? `${t('Unread')} (${unreadTotal})`
                  : t('Unread');
            return (
              <TouchableOpacity
                key={value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(value)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          disabled={unreadTotal === 0}
          onPress={markAllRead}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.markAll, unreadTotal === 0 && styles.markAllDisabled]}>
            {t('Mark all as read')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>{t('Loading data...')}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, items.length === 0 && styles.listEmpty]}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={styles.footerLoader} color={ACCENT} />
            ) : null
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainView: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: isIPad ? 50 : 30,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: isIPad ? 20 : 14,
    marginBottom: isIPad ? 12 : 8,
  },
  chips: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: isIPad ? 20 : 14,
    height: isIPad ? 42 : 32,
    borderRadius: 20,
    backgroundColor: '#F4F4F4',
    justifyContent: 'center',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: ACCENT,
  },
  chipText: {
    fontSize: isIPad ? 18 : 13,
    fontFamily: FONTS.RICORDOSemiBold,
    color: '#6F7884',
  },
  chipTextActive: {
    color: 'white',
  },
  markAll: {
    fontSize: isIPad ? 18 : 13,
    fontFamily: FONTS.RICORDOSemiBold,
    color: ACCENT,
  },
  markAllDisabled: {
    color: '#B0B5C3',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 30,
  },
  listEmpty: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: isIPad ? 16 : 12,
    borderWidth: 1.2,
    borderColor: '#ECEEF5',
    shadowColor: '#2B3B61',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUnread: {
    backgroundColor: '#F5F7FF',
    borderColor: '#D6DCF5',
  },
  iconWrap: {
    width: isIPad ? 56 : 44,
    height: isIPad ? 56 : 44,
    borderRadius: isIPad ? 28 : 22,
    backgroundColor: '#F4F4F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  iconWrapUnread: {
    backgroundColor: '#E6EAF9',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: isIPad ? 20 : 15,
    fontFamily: FONTS.RICORDOSemiBold,
    color: '#111827',
  },
  titleUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT,
    marginLeft: 8,
    marginTop: 4,
  },
  message: {
    marginTop: 3,
    fontSize: isIPad ? 17 : 13,
    lineHeight: isIPad ? 24 : 18,
    fontFamily: FONTS.RICORDORegular,
    color: '#6B7280',
  },
  time: {
    marginTop: 6,
    fontSize: isIPad ? 15 : 11,
    fontFamily: FONTS.RICORDORegular,
    color: '#9CA3AF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: isIPad ? 20 : 16,
    color: '#666',
    fontFamily: FONTS.RICORDORegular,
  },
  footerLoader: {
    marginVertical: 16,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: isIPad ? 110 : 84,
    height: isIPad ? 110 : 84,
    borderRadius: isIPad ? 55 : 42,
    backgroundColor: '#F4F4F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: isIPad ? 22 : 16,
    fontFamily: FONTS.RICORDOSemiBold,
    color: '#6F7884',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: 10,
    padding: 15,
    margin: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3333',
  },
  errorText: {
    color: '#CC0000',
    fontSize: isIPad ? 18 : 14,
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
    fontSize: isIPad ? 18 : 14,
    fontFamily: FONTS.RICORDOSemiBold,
  },
});

export { Notifications };
