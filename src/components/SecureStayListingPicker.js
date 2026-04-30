import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import shadows from '../theme/shadows';
import {
  listSecureStayListings,
  getSecureStayListingTemplate,
} from '../api/securestay';

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 50;

/**
 * Modal that lets an OWNER pick from their connected SecureStay listings
 * and returns a fully-populated property template (name, address,
 * timezone, rooms) ready to drop into the create-property wizard.
 *
 * Props:
 *   visible      - boolean
 *   onClose      - () => void
 *   onPicked     - (template) => void
 */
export default function SecureStayListingPicker({ visible, onClose, onPicked }) {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(null);
  const [source, setSource] = useState(null);
  const [connected, setConnected] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectingId, setSelectingId] = useState(null);
  const [error, setError] = useState(null);

  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);

  const runSearch = useCallback(async (q, { append = false, nextPage = 1 } = {}) => {
    const myReqId = ++reqIdRef.current;
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);
    try {
      const data = await listSecureStayListings({ q, page: nextPage, limit: PAGE_SIZE });
      // Stale-response guard
      if (reqIdRef.current !== myReqId) return;
      const next = data.listings || [];
      setSource(data.source);
      setConnected(data.connected !== false);
      setTotal(data.total ?? null);
      setListings((prev) => (append ? [...prev, ...next] : next));
      setPage(nextPage);
      setHasMore(next.length === PAGE_SIZE);
    } catch (err) {
      if (reqIdRef.current !== myReqId) return;
      console.warn('[SecureStayListingPicker] search failed', err.message);
      setError(err.response?.data?.error || 'Failed to load listings');
      if (!append) setListings([]);
    } finally {
      if (reqIdRef.current === myReqId) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // Open: initial load
  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setPage(1);
    setHasMore(true);
    runSearch('', { append: false, nextPage: 1 });
  }, [visible, runSearch]);

  // Debounced search on every keystroke
  const onChangeSearch = (text) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setHasMore(true);
      runSearch(text, { append: false, nextPage: 1 });
    }, SEARCH_DEBOUNCE_MS);
  };

  const onLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    runSearch(search, { append: true, nextPage: page + 1 });
  };

  const onSelect = async (listing) => {
    setSelectingId(listing.listing_id);
    try {
      // Slim catalog (no Hostify) -> we cannot fetch a template; use the bare info.
      if (source === 'issues_feed') {
        onPicked({
          securestay_listing_id: listing.listing_id,
          name: listing.name,
          address: listing.full_address || '',
          timezone: 'UTC',
          units: [{ name: 'Main Property', notes: '', rooms: [] }],
          counts: {},
        });
        onClose?.();
        return;
      }
      const data = await getSecureStayListingTemplate(listing.listing_id);
      onPicked(data.template);
      onClose?.();
    } catch (err) {
      console.warn('template fetch failed', err.message);
      Alert.alert('Could not load listing', err.response?.data?.error || err.message);
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Import from SecureStay</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            placeholder="Search by address, city, or name"
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={onChangeSearch}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={styles.searchInput}
          />
          {search ? (
            <TouchableOpacity onPress={() => onChangeSearch('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {!connected && !loading ? (
          <View style={styles.notConnectedBox}>
            <Ionicons name="link-outline" size={16} color={colors.accent.info} />
            <Text style={styles.notConnectedText}>
              Connect SecureStay in Settings to load your full catalog.
            </Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={styles.subtle}>
              {search ? `Searching "${search}"…` : 'Loading your listings…'}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.status.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => runSearch(search, { append: false, nextPage: 1 })}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => item.listing_id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.4}
            ListHeaderComponent={() => (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>
                  {total != null ? `${listings.length} of ${total}` : `${listings.length}`}{' '}
                  {listings.length === 1 ? 'listing' : 'listings'}
                  {source ? ` · ${sourceLabel(source)}` : ''}
                </Text>
              </View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.center}>
                <Ionicons name="home-outline" size={48} color={colors.text.tertiary} />
                <Text style={styles.subtle}>
                  {search
                    ? `No listings match "${search}".`
                    : 'No listings available.'}
                </Text>
              </View>
            )}
            ListFooterComponent={() =>
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.primary.main} />
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <ListingRow
                listing={item}
                disabled={!!selectingId}
                loading={selectingId === item.listing_id}
                onPress={() => onSelect(item)}
              />
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

function sourceLabel(s) {
  if (s === 'securestay') return 'live SecureStay';
  if (s === 'issues_feed') return 'cached from issues';
  if (s === 'none') return 'no listings';
  return s;
}

function ListingRow({ listing, onPress, disabled, loading }) {
  return (
    <TouchableOpacity
      style={[styles.row, disabled && !loading && styles.rowDisabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      {listing.thumbnail_url ? (
        <Image source={{ uri: listing.thumbnail_url }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ionicons name="home" size={22} color={colors.text.tertiary} />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {listing.nickname || listing.name}
        </Text>
        {listing.full_address ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {listing.full_address}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {listing.bedrooms != null ? <Text style={styles.metaText}>{listing.bedrooms} bd</Text> : null}
          {listing.bathrooms != null ? <Text style={styles.metaText}>{listing.bathrooms} ba</Text> : null}
          {listing.guests != null ? <Text style={styles.metaText}>{listing.guests} guests</Text> : null}
        </View>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary.main} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  title: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary },
  closeBtn: { padding: spacing.xs },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    padding: 0,
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  listHeader: { paddingVertical: spacing.sm },
  listHeaderText: { fontSize: typography.fontSize.xs, color: colors.text.tertiary, letterSpacing: typography.letterSpacing.wide, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: spacing.md,
    ...shadows.sm,
  },
  rowDisabled: { opacity: 0.4 },
  thumb: { width: 56, height: 56, borderRadius: borderRadius.sm, backgroundColor: colors.background.elevated },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  rowSubtitle: { fontSize: typography.fontSize.xs, color: colors.text.secondary },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  metaText: { fontSize: typography.fontSize.xs, color: colors.text.tertiary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  subtle: { fontSize: typography.fontSize.sm, color: colors.text.secondary, textAlign: 'center' },
  errorText: { fontSize: typography.fontSize.sm, color: colors.status.error, textAlign: 'center' },
  retryBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.primary.main, marginTop: spacing.sm },
  retryText: { color: '#fff', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  clearBtn: { padding: 2 },
  notConnectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.elevated,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  notConnectedText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  footerLoader: { paddingVertical: spacing.md, alignItems: 'center' },
});
