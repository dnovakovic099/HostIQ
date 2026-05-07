import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchRecentIssues } from '../../api/issueAcknowledgments';
import IssueAckCard from '../../components/IssueAckCard';
import colors from '../../theme/colors';

/**
 * Reviews property-wide recent issues (Cleanliness, Comfort, Maintenance,
 * Amenities, Pests, Safety, Access, and any review-derived items). The
 * cleaner must mark each one before the inspection can be submitted.
 *
 * Route params:
 *   inspectionId: string
 *   onDone?:      function   // optional callback after all answered
 */
export default function PropertyWideIssuesScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { inspectionId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [acksByExternalId, setAcksByExternalId] = useState({});

  const load = async () => {
    if (!inspectionId) return;
    try {
      const data = await fetchRecentIssues(inspectionId);
      setItems(data.property_wide || []);
      const ackMap = {};
      for (const a of data.acknowledgments || []) {
        if (!a.room_id) ackMap[a.external_issue_id] = a;
      }
      setAcksByExternalId(ackMap);
    } catch (err) {
      console.error('Failed to load property-wide issues', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [inspectionId]);

  const handleAckChange = (ack) => {
    setAcksByExternalId((prev) => ({
      ...prev,
      [ack.external_issue_id]: ack,
    }));
  };

  // Required = open / reported-30d / review (cap 10 most recent server-side).
  // Recurring-historical items (last 12 months) are shown for context only.
  const requiredItems = items.filter((i) =>
    i.source === 'open' || i.source === 'reported' || i.source === 'review'
  );
  const recurringItems = items.filter((i) => i.source === 'recurring');
  const totalCount = items.length;
  const requiredCount = requiredItems.length;
  const answeredRequired = requiredItems.filter(
    (i) => acksByExternalId[i.key]?.status
  ).length;
  const allAnswered = requiredCount === 0 || answeredRequired === requiredCount;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerWrapper, { paddingTop: insets.top }]}
      >
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Property-wide Issues</Text>
              <Text style={styles.headerSubtitle}>
                {totalCount > 0
                  ? requiredCount > 0
                    ? `${answeredRequired} of ${requiredCount} required answered`
                    : `${totalCount} for context · all optional`
                  : 'No property-wide issues to review'}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#215EEA" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        >
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={styles.emptyTitle}>Nothing to review</Text>
              <Text style={styles.emptyText}>
                There are no property-wide issues on the latest brief.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.intro}>
                <Ionicons name="information-circle" size={18} color="#215EEA" />
                <Text style={styles.introText}>
                  Cover the whole property (Cleanliness, Comfort, Maintenance,
                  Amenities, Pests, Safety, Access). Tap any card for full
                  details. Required ones must be answered before submitting.
                </Text>
              </View>

              {requiredItems.length > 0 ? (
                <>
                  <SectionHeader
                    title="Need your attention"
                    subtitle={
                      requiredItems.length >= 10
                        ? 'Top 10 most recent open and recent issues — please answer each.'
                        : 'Open issues + anything reported in the last 30 days + recent guest reviews (60d).'
                    }
                  />
                  {requiredItems.map((item) => (
                    <IssueAckCard
                      key={item.key}
                      inspectionId={inspectionId}
                      roomId={null}
                      item={item}
                      existingAck={acksByExternalId[item.key] || null}
                      onChange={handleAckChange}
                    />
                  ))}
                </>
              ) : null}

              {recurringItems.length > 0 ? (
                <>
                  <SectionHeader
                    title="Recurring patterns (context only)"
                    subtitle={`${recurringItems.length} historical issue${
                      recurringItems.length === 1 ? '' : 's'
                    } from the past 12 months — informational, no answer required.`}
                  />
                  {recurringItems.map((item) => (
                    <IssueAckCard
                      key={item.key}
                      inspectionId={inspectionId}
                      roomId={null}
                      item={item}
                      existingAck={acksByExternalId[item.key] || null}
                      onChange={handleAckChange}
                    />
                  ))}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[
            styles.doneBtn,
            !allAnswered && requiredCount > 0 && styles.doneBtnDisabled,
          ]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.doneBtnText}>
            {requiredCount === 0 || allAnswered
              ? 'Done'
              : `Continue (${answeredRequired}/${requiredCount} required)`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {subtitle ? (
        <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerWrapper: { paddingBottom: 18 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  intro: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 16,
  },
  introText: {
    flex: 1,
    fontSize: 13,
    color: '#1E3A8A',
    lineHeight: 18,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },
  doneBtn: {
    backgroundColor: '#215EEA',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  sectionHeaderSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
});
