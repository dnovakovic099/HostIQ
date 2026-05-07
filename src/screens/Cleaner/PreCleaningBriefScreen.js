import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getPreCleaningBrief,
  acknowledgePreCleaningBrief,
} from '../../api/securestay';
import {
  renderableText,
  formatStars,
  LOW_RATING_THRESHOLD,
} from '../../api/securestayFormat';
import IssueDetailModal from '../../components/IssueDetailModal';
import colors from '../../theme/colors';

/**
 * Pre-Cleaning Brief — modern, scannable summary of what a cleaner
 * needs to know before starting an inspection.
 *
 * Information hierarchy (top → bottom):
 *   1. Header w/ property name (gradient).
 *   2. Stats strip overlapping header (Open / Recurring / Last rating).
 *   3. Priority banner (auto-generated from severity signals).
 *   4. "What to watch for" — synthesized scannable cards (priority).
 *   5. Last guest snapshot.
 *   6. Recurring patterns (chip cloud).
 *   7. Open issues.
 *   8. Recent issues.
 *   9. Recent guest complaints (low-rated quotes).
 *  10. Counts footer + sticky acknowledge CTA.
 *
 * Route params:
 *   inspectionId: string  (required)
 *   nextScreen:   string  (default 'CaptureMedia')
 *   nextParams:   object  (forwarded as-is)
 */
export default function PreCleaningBriefScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const {
    inspectionId,
    nextScreen = 'CaptureMedia',
    nextParams = {},
  } = route?.params || {};

  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [acknowledging, setAcknowledging] = useState(false);
  const proceededRef = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const proceed = (replace = true) => {
    if (proceededRef.current) return;
    proceededRef.current = true;
    if (replace) navigation.replace(nextScreen, nextParams);
    else navigation.navigate(nextScreen, nextParams);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!inspectionId) {
        proceed();
        return;
      }
      try {
        const data = await getPreCleaningBrief(inspectionId);
        if (!alive) return;
        if (!data?.available) {
          proceed();
          return;
        }
        if (data.acknowledged_at) {
          proceed();
          return;
        }
        setState({ loading: false, error: null, data });
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 360,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 360,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      } catch (err) {
        console.warn('[PreCleaningBrief] load failed:', err.message);
        proceed();
      }
    })();
    return () => {
      alive = false;
    };
  }, [inspectionId]);

  const onAcknowledge = async () => {
    setAcknowledging(true);
    try {
      await acknowledgePreCleaningBrief(inspectionId);
      proceed();
    } catch (err) {
      Alert.alert('Could not save', err.response?.data?.error || err.message);
    } finally {
      setAcknowledging(false);
    }
  };

  if (state.loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loaderText}>Loading pre-cleaning brief…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const brief = state.data?.brief;
  if (!brief) {
    proceed();
    return null;
  }

  const {
    listing,
    headline,
    last_guest,
    recurring_categories = [],
    open_issues = [],
    recent_issues = [],
    watch_for = [],
    low_rated_quotes = [],
    counts = {},
  } = brief;

  return (
    <View style={styles.container}>
      {/* Gradient header */}
      <LinearGradient
        colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 4 }]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerBadge}>
            <Ionicons name="shield-checkmark" size={11} color="#fff" />
            <Text style={styles.headerBadgeText}>Pre-Cleaning Brief</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.headerBody}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {listing?.name || 'Property'}
          </Text>
          {listing?.address ? (
            <View style={styles.headerAddressRow}>
              <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.78)" />
              <Text style={styles.headerAddress} numberOfLines={1}>
                {listing.address}
              </Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <Animated.View
        style={[
          { flex: 1 },
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 140 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats strip overlapping header */}
          <StatsStrip counts={counts} lastRating={last_guest?.review?.rating} />

          {/* Priority banner — auto-derived from severity */}
          <PriorityBanner brief={brief} headline={headline} />

          {/* WATCH FOR — every cleaning-relevant issue + low-rated
              review quote from the window, sorted recurring-first then
              newest. Server-built; no client-side truncation. */}
          <WatchForSection
            items={watch_for}
            windowDays={brief.window_days || 90}
          />

          {/* Last guest */}
          {last_guest ? <LastGuestCard last_guest={last_guest} /> : null}

          {/* Recurring */}
          {recurring_categories.length > 0 ? (
            <Section
              icon="repeat"
              title="Recurring patterns"
              tint={colors.status.warning}
              subtitle="Categories flagged 3+ times — give them extra attention"
            >
              <View style={styles.chipRow}>
                {recurring_categories.slice(0, 8).map((c, idx) => {
                  const label = renderableText(c, ['category', 'name', 'label']);
                  if (!label) return null;
                  const count = typeof c?.count === 'number' ? c.count : null;
                  const severity = severityFromCount(count);
                  return (
                    <View
                      key={`${label}-${idx}`}
                      style={[
                        styles.chip,
                        { backgroundColor: severity.bg, borderColor: severity.border },
                      ]}
                    >
                      <View style={[styles.chipDot, { backgroundColor: severity.dot }]} />
                      <Text style={[styles.chipText, { color: severity.text }]}>
                        {label.toUpperCase()}
                      </Text>
                      {count != null ? (
                        <Text style={[styles.chipCount, { color: severity.text }]}>
                          {count}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </Section>
          ) : null}

          {/* Recent issues (closed-but-recent) */}
          {recent_issues.length > 0 ? (
            <Section
              icon="time-outline"
              title="Recently resolved"
              count={recent_issues.length}
              tint={colors.accent.info}
              subtitle="Closed in the last 30 days — verify the fix held"
            >
              {recent_issues.slice(0, 5).map((i, idx) => (
                <IssueRow key={i.id || idx} issue={i} />
              ))}
            </Section>
          ) : null}

          {/* Low-rated guest quotes */}
          {low_rated_quotes.length > 0 ? (
            <Section
              icon="chatbubble-ellipses-outline"
              title="Recent guest complaints"
              tint={colors.status.warning}
              subtitle={`Reviews ≤ ${LOW_RATING_THRESHOLD} ★ in the last ${brief.window_days || 90} days`}
            >
              {low_rated_quotes.slice(0, 3).map((q, idx) => {
                const quote = renderableText(q, [
                  'public_quote',
                  'public_review',
                  'quote',
                  'private_quote',
                  'message',
                ]);
                if (!quote) return null;
                return (
                  <View key={idx} style={styles.quoteCard}>
                    <View style={styles.quoteHeaderRow}>
                      <Ionicons
                        name="chatbubble"
                        size={12}
                        color={colors.status.warning}
                      />
                      {typeof q?.rating === 'number' ? (
                        <Text style={styles.quoteRating}>{formatStars(q.rating)}</Text>
                      ) : null}
                      {q.guest_name ? (
                        <Text style={styles.quoteAuthor} numberOfLines={1}>
                          · {q.guest_name}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.quoteBody} numberOfLines={4}>
                      “{quote}”
                    </Text>
                  </View>
                );
              })}
            </Section>
          ) : null}

          {/* Counts footer */}
          {counts ? (
            <View style={styles.footerCard}>
              <Text style={styles.footerHint}>Window: last {brief.window_days || 90} days</Text>
              <View style={styles.footerRow}>
                <FooterStat label="Open" value={counts.open_issues ?? 0} />
                <FooterDot />
                <FooterStat label="Recent" value={counts.recent_issues ?? 0} />
                <FooterDot />
                <FooterStat label="Recurring" value={counts.recurring_categories ?? 0} />
                <FooterDot />
                <FooterStat
                  label="Low ★"
                  value={`${counts.bad_reviews ?? 0}/${counts.reviews_window ?? 0}`}
                />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>

      {/* Sticky acknowledge CTA */}
      <View style={[styles.ackBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onAcknowledge}
          disabled={acknowledging}
          style={styles.ackBtnTouchable}
        >
          <LinearGradient
            colors={
              acknowledging
                ? [colors.text.tertiary, colors.text.tertiary]
                : [colors.primary.vibrant, colors.primary.dark]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ackBtn}
          >
            {acknowledging ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.ackBtnText}>I've reviewed this — start cleaning</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* -------------------- Sub-components -------------------- */

function StatsStrip({ counts = {}, lastRating }) {
  const open = counts.open_issues ?? 0;
  const recurring = counts.recurring_categories ?? 0;
  const ratingStr =
    typeof lastRating === 'number' ? `${lastRating}` : '—';
  const ratingColor =
    typeof lastRating !== 'number'
      ? colors.text.tertiary
      : lastRating <= LOW_RATING_THRESHOLD
      ? colors.status.error
      : lastRating >= 5
      ? colors.status.success
      : colors.status.warning;

  return (
    <View style={styles.statsStrip}>
      <StatTile
        value={open}
        label="OPEN"
        sub="issues"
        accent={open > 0 ? colors.status.error : colors.text.tertiary}
        icon="alert-circle"
      />
      <View style={styles.statDivider} />
      <StatTile
        value={recurring}
        label="RECURRING"
        sub="patterns"
        accent={recurring > 0 ? colors.status.warning : colors.text.tertiary}
        icon="repeat"
      />
      <View style={styles.statDivider} />
      <StatTile
        value={ratingStr}
        label="LAST"
        sub={typeof lastRating === 'number' ? '★ rating' : 'no review'}
        accent={ratingColor}
        icon="star"
      />
    </View>
  );
}

function StatTile({ value, label, sub, accent, icon }) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statIconWrap, { backgroundColor: accent + '15' }]}>
        <Ionicons name={icon} size={14} color={accent} />
      </View>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function PriorityBanner({ brief, headline }) {
  const tone = derivePriorityTone(brief);
  if (!tone) return null;
  return (
    <LinearGradient
      colors={tone.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.priorityBanner}
    >
      <View style={styles.priorityIconWrap}>
        <Ionicons name={tone.icon} size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.priorityLabel}>{tone.label}</Text>
        <Text style={styles.priorityText} numberOfLines={3}>
          {headline}
        </Text>
      </View>
    </LinearGradient>
  );
}

function derivePriorityTone(brief) {
  const open = brief?.counts?.open_issues || 0;
  const lastRating = brief?.last_guest?.review?.rating;
  const lastNotable = brief?.last_guest?.notable;

  if (lastNotable && typeof lastRating === 'number' && lastRating <= LOW_RATING_THRESHOLD) {
    return {
      label: 'High priority',
      icon: 'warning',
      gradient: ['#FF3B30', '#C92518'],
    };
  }
  if (open >= 3) {
    return {
      label: 'High priority',
      icon: 'warning',
      gradient: ['#FF3B30', '#C92518'],
    };
  }
  if (open > 0 || lastNotable) {
    return {
      label: 'Heads up',
      icon: 'alert-circle',
      gradient: ['#FF9500', '#FF7A00'],
    };
  }
  return {
    label: 'All clear',
    icon: 'checkmark-circle',
    gradient: [colors.secondary.main, colors.secondary.dark],
  };
}

/**
 * "What to watch for" — every cleaning/maintenance/house issue
 * reported in the window plus every low-rated guest review quote.
 *
 * The server already:
 *   - dropped admin/communication/booking categories,
 *   - tagged each item with `is_recurring` when its category appears
 *     2+ times in the window,
 *   - sorted recurring items first then newest.
 *
 * The mobile UI just renders the list; no further filtering or
 * truncation. The cleaner asked to see every single one.
 */
function WatchForSection({ items = [] }) {
  const renderable = useMemo(() => normalizeWatchItems(items), [items]);
  const [activeItem, setActiveItem] = useState(null);

  if (renderable.length === 0) return null;

  const counts = {
    open: renderable.filter((it) => it.source === 'open').length,
    reported: renderable.filter((it) => it.source === 'reported').length,
    recurring: renderable.filter((it) => it.source === 'recurring').length,
    review: renderable.filter((it) => it.source === 'review').length,
  };

  // Build a precise subtitle so the cleaner knows exactly what they're
  // looking at and how far back the data goes.
  const parts = [];
  if (counts.open > 0) parts.push(`${counts.open} still open`);
  if (counts.reported > 0) parts.push(`${counts.reported} reported in last 30d`);
  if (counts.recurring > 0) parts.push(`${counts.recurring} recurring (last 12mo)`);
  if (counts.review > 0) parts.push(`${counts.review} from reviews (last 60d)`);
  const subtitle = parts.length > 0 ? parts.join(' · ') : 'Tap any item for full details.';

  return (
    <>
      <Section
        icon="eye"
        title="What to watch for"
        count={renderable.length}
        tint={colors.primary.main}
        subtitle={subtitle}
        featured
      >
        {renderable.map((it, idx) => (
          <WatchItem
            key={it.key}
            item={it}
            first={idx === 0}
            onPress={() => setActiveItem(it.raw)}
          />
        ))}
      </Section>
      <IssueDetailModal
        visible={!!activeItem}
        onClose={() => setActiveItem(null)}
        item={activeItem}
      />
    </>
  );
}

function WatchItem({ item, first, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.watchItem, first && { borderTopWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.watchBadge, { backgroundColor: item.color }]}>
        <Text style={styles.watchBadgeText}>{item.badge}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.watchTitleRow}>
          <Text style={styles.watchTitle} numberOfLines={3}>
            {item.title}
          </Text>
          {item.is_recurring ? (
            <View style={styles.recurringPill}>
              <Ionicons
                name="repeat"
                size={9}
                color={colors.status.warning}
                style={{ marginRight: 3 }}
              />
              <Text style={styles.recurringPillText}>
                RECURRING{item.recurring_count ? ` ${item.recurring_count}×` : ''}
              </Text>
            </View>
          ) : null}
        </View>
        {item.meta.length > 0 ? (
          <Text style={styles.watchMeta} numberOfLines={1}>
            {item.meta.join('  ·  ')}
          </Text>
        ) : null}
        {item.category_recurrence ? (
          <Text style={styles.categoryContext} numberOfLines={1}>
            <Ionicons name="trending-up" size={10} color="#92400E" />
            {'  '}
            {item.category_recurrence.category} reported{' '}
            {item.category_recurrence.count}× in last{' '}
            {item.category_recurrence.window_days}d at this property
          </Text>
        ) : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color="#9CA3AF"
        style={{ marginLeft: 4 }}
      />
    </TouchableOpacity>
  );
}

/**
 * Convert a server watch_for item into the shape WatchItem renders.
 * Defensive against legacy shapes (older cached briefs may still have
 * the old `{type, text, weight}` form, in which case we fall back to
 * a plain row rather than crashing).
 */
function normalizeWatchItems(items) {
  if (!Array.isArray(items)) return [];
  const out = [];
  items.forEach((raw, idx) => {
    if (!raw || typeof raw !== 'object') return;

    // Legacy shape: { type, text, weight } from old cached briefs.
    const isLegacy =
      typeof raw.text === 'string' && !raw.description && !raw.source;
    if (isLegacy) {
      out.push({
        key: `legacy-${idx}`,
        title: raw.text,
        meta: [],
        badge: 'NOTE',
        color: colors.accent.info,
        is_recurring: false,
        recurring_count: 0,
      });
      return;
    }

    const description = renderableText(raw.description, ['text', 'message']);
    const category = renderableText(raw.category, ['name', 'label']);
    const guestName = renderableText(raw.guest_name, ['name']);
    if (!description && !category) return;

    let badge;
    let color;
    if (raw.source === 'open') {
      badge = 'OPEN';
      color = colors.status.error;
    } else if (raw.source === 'review') {
      badge = typeof raw.rating === 'number' ? `${raw.rating} ★` : 'REVIEW';
      color = colors.status.warning;
    } else if (raw.source === 'recurring') {
      badge = 'RECURRING';
      color = colors.status.warning;
    } else {
      // 'reported' (closed/in-progress issue inside the 30d window)
      badge = 'REPORTED';
      color = statusColor(raw.status) || colors.accent.info;
    }

    const meta = [];
    if (category) meta.push(category.toUpperCase());
    if (raw.reported_at) meta.push(fmtDate(raw.reported_at));
    if (guestName) meta.push(guestName);
    if (raw.channel && raw.source === 'review') meta.push(raw.channel);
    if (raw.status && raw.source !== 'open' && raw.source !== 'review') {
      meta.push(String(raw.status));
    }

    out.push({
      key: raw.key || raw.id || `watch-${idx}`,
      source: raw.source,
      title: description || category || 'Reported issue',
      meta,
      badge,
      color,
      is_recurring: !!raw.is_recurring,
      recurring_count: typeof raw.recurring_count === 'number' ? raw.recurring_count : 0,
      category_recurrence:
        raw.category_recurrence && raw.category_recurrence.count > 0
          ? raw.category_recurrence
          : null,
      raw,
    });
  });
  return out;
}

function LastGuestCard({ last_guest }) {
  const rating = last_guest.review?.rating;
  const tone =
    typeof rating === 'number' && rating <= LOW_RATING_THRESHOLD
      ? colors.status.error
      : last_guest.notable
      ? colors.status.warning
      : colors.secondary.main;
  const reviewQuote = renderableText(last_guest.review, [
    'public_review',
    'public_quote',
    'quote',
    'private_quote',
    'message',
  ]);

  return (
    <Section icon="person-outline" title="Last guest" tint={tone}>
      <Text style={styles.lastGuestHeadline}>{last_guest.headline}</Text>

      <View style={styles.metaRow}>
        {last_guest.guest_name ? (
          <Meta icon="person-circle-outline" label="Guest" value={last_guest.guest_name} />
        ) : null}
        {last_guest.arrival_date ? (
          <Meta
            icon="calendar-outline"
            label="Stay"
            value={`${fmtDate(last_guest.arrival_date)} – ${fmtDate(last_guest.departure_date)}`}
          />
        ) : null}
        {typeof rating === 'number' ? (
          <Meta icon="star-outline" label="Rating" value={formatStars(rating)} accent={tone} />
        ) : null}
      </View>

      {reviewQuote ? (
        <View style={[styles.quoteCard, { borderLeftColor: tone }]}>
          <Text style={styles.quoteBody} numberOfLines={6}>
            “{reviewQuote}”
          </Text>
        </View>
      ) : null}

      {last_guest.issues_during_or_after_stay?.length > 0 ? (
        <View style={{ marginTop: 14 }}>
          <Text style={styles.subheading}>
            Issues from this stay · {last_guest.issues_during_or_after_stay.length}
          </Text>
          {last_guest.issues_during_or_after_stay.slice(0, 5).map((i, idx) => (
            <IssueRow key={i.id || idx} issue={i} />
          ))}
        </View>
      ) : null}
    </Section>
  );
}

function Section({ icon, title, subtitle, tint, count, featured, children }) {
  const tintColor = tint || colors.primary.main;
  return (
    <View style={[styles.sectionCard, featured && styles.sectionCardFeatured]}>
      {featured ? (
        <View style={[styles.sectionAccentBar, { backgroundColor: tintColor }]} />
      ) : null}
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: tintColor + '18' }]}>
          <Ionicons name={icon} size={16} color={tintColor} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {typeof count === 'number' ? (
              <View style={[styles.countPill, { backgroundColor: tintColor + '18' }]}>
                <Text style={[styles.countPillText, { color: tintColor }]}>{count}</Text>
              </View>
            ) : null}
          </View>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View>{children}</View>
    </View>
  );
}

function IssueRow({ issue }) {
  const description = renderableText(issue?.description, ['text', 'message']);
  const category = renderableText(issue?.category, ['name', 'label']);
  const status = renderableText(issue?.status, ['name', 'label']);
  const guestName = renderableText(issue?.guest_name, ['name']);
  const line = description || category || 'Issue';
  const tone = statusColor(status);
  const meta = [
    category ? category.toUpperCase() : null,
    status,
    issue?.reported_at ? fmtDate(issue.reported_at) : null,
    guestName ? guestName : null,
  ]
    .filter(Boolean)
    .join('  ·  ');
  return (
    <View style={styles.issueRow}>
      <View style={[styles.issueDot, { backgroundColor: tone }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.issueLine} numberOfLines={3}>
          {line}
        </Text>
        {meta ? (
          <Text style={styles.issueMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Meta({ icon, label, value, accent }) {
  return (
    <View style={styles.metaPill}>
      {icon ? (
        <Ionicons
          name={icon}
          size={12}
          color={accent || colors.text.tertiary}
          style={{ marginBottom: 2 }}
        />
      ) : null}
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, accent && { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function FooterStat({ label, value }) {
  return (
    <View style={styles.footerStat}>
      <Text style={styles.footerStatValue}>{value}</Text>
      <Text style={styles.footerStatLabel}>{label}</Text>
    </View>
  );
}

function FooterDot() {
  return <View style={styles.footerDot} />;
}

/* -------------------- helpers -------------------- */

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return String(d);
  }
}

function statusColor(status) {
  if (status === 'New' || status === 'Open') return colors.status.error;
  if (status === 'In Progress') return colors.status.warning;
  if (status === 'Scheduled') return colors.primary.main;
  if (status === 'Completed') return colors.status.success;
  return colors.text.tertiary;
}

function severityFromCount(count) {
  const c = typeof count === 'number' ? count : 0;
  if (c >= 50) {
    return {
      bg: 'rgba(255, 59, 48, 0.10)',
      border: 'rgba(255, 59, 48, 0.25)',
      text: colors.status.error,
      dot: colors.status.error,
    };
  }
  if (c >= 10) {
    return {
      bg: 'rgba(255, 149, 0, 0.10)',
      border: 'rgba(255, 149, 0, 0.25)',
      text: colors.status.warning,
      dot: colors.status.warning,
    };
  }
  return {
    bg: 'rgba(0, 122, 255, 0.10)',
    border: 'rgba(0, 122, 255, 0.20)',
    text: colors.primary.main,
    dot: colors.primary.main,
  };
}

/* -------------------- styles -------------------- */

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },
  android: { elevation: 2 },
});

const ctaShadow = Platform.select({
  ios: {
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
  },
  android: { elevation: 8 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },

  loaderBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { color: colors.text.secondary, fontSize: 14 },

  /* Header */
  header: {
    paddingHorizontal: 16,
    paddingBottom: 22,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  backBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headerBody: { paddingRight: 8 },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 21,
  },
  headerAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  headerAddress: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10.5,
    flexShrink: 1,
  },

  /* Stats strip overlapping header */
  scroll: { paddingHorizontal: 14, paddingTop: 0 },
  statsStrip: {
    marginTop: 12,
    marginBottom: 12,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    ...cardShadow,
  },
  statTile: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  statIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  statValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, lineHeight: 22 },
  statLabel: {
    color: colors.text.tertiary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  statSub: { color: colors.text.tertiary, fontSize: 9, marginTop: 1 },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
    marginVertical: 6,
  },

  /* Priority banner */
  priorityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 14,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.10,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  priorityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  priorityText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },

  /* Section card */
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    ...cardShadow,
    overflow: 'hidden',
  },
  sectionCardFeatured: {
    paddingLeft: 16,
  },
  sectionAccentBar: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    left: 0,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    color: colors.text.tertiary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  countPill: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 999,
    minWidth: 22,
    alignItems: 'center',
  },
  countPillText: { fontSize: 11, fontWeight: '800' },

  /* Watch for items */
  watchItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
  },
  watchBadge: {
    minWidth: 50,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  watchBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  watchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    marginLeft: 4,
    marginRight: 4,
  },
  watchTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  watchTitle: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  watchDetail: {
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
  watchMeta: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 0.1,
  },
  recurringPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 1,
  },
  recurringPillText: {
    color: colors.status.warning,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  categoryContext: {
    marginTop: 4,
    color: '#92400E',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
  },

  /* Last guest */
  lastGuestHeadline: {
    color: colors.text.primary,
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  metaPill: {
    backgroundColor: colors.background.elevated,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    minWidth: 88,
  },
  metaLabel: {
    color: colors.text.tertiary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metaValue: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  subheading: {
    color: colors.text.tertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  /* Quote card */
  quoteCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: 10,
    padding: 11,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.status.warning,
  },
  quoteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  quoteRating: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.status.warning,
  },
  quoteAuthor: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  quoteBody: {
    color: colors.text.primary,
    fontSize: 12.5,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  /* Recurring chips */
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipDot: { width: 5, height: 5, borderRadius: 2.5 },
  chipText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3 },
  chipCount: { fontSize: 10.5, fontWeight: '800', opacity: 0.7 },

  /* Issue row */
  issueRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
    alignItems: 'flex-start',
  },
  issueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    marginLeft: 4,
    marginRight: 2,
  },
  issueLine: {
    color: colors.text.primary,
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '600',
  },
  issueMeta: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
    letterSpacing: 0.1,
  },

  /* Footer card */
  footerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignItems: 'center',
    ...cardShadow,
  },
  footerHint: {
    color: colors.text.tertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerStat: { alignItems: 'center', minWidth: 46 },
  footerStatValue: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  footerStatLabel: {
    color: colors.text.tertiary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 1,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.text.quaternary,
  },

  /* Acknowledge bar */
  ackBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(242,242,247,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
  },
  ackBtnTouchable: {
    borderRadius: 14,
    ...ctaShadow,
  },
  ackBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ackBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
