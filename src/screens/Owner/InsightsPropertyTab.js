import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  Image,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';

export default function InsightsPropertyTab({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Issues Section State
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issueModalVisible, setIssueModalVisible] = useState(false);

  // Pricing Analytics State
  const [pricingData, setPricingData] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      let allProperties = [];

      // Fetch PMS properties
      try {
        const pmsResponse = await api.get('/issues/properties');
        const pmsProperties = (pmsResponse.data.properties || []).map(prop => ({
          ...prop,
          isPMSProperty: true
        }));
        allProperties = [...pmsProperties];
      } catch (pmsError) {
        // Silently continue
      }

      // Fetch manual properties
      try {
        const response = await api.get('/owner/properties');
        const manualProperties = (response.data.manualProperties || response.data || []).map(prop => ({
          ...prop,
          isPMSProperty: false
        }));
        allProperties = [...allProperties, ...manualProperties];
      } catch (manualError) {
        // Silently continue
      }

      setProperties(allProperties);

      // Auto-select first PMS property
      if (allProperties.length > 0 && !selectedProperty) {
        const firstPMSProperty = allProperties.find(p => p.isPMSProperty);
        handleSelectProperty(firstPMSProperty || allProperties[0]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSelectProperty = async (property) => {
    setSelectedProperty(property);
    setPropertyPickerVisible(false);

    if (property.isPMSProperty) {
      fetchPropertyIssues(property);
      fetchPricingData(property);
    } else {
      setIssues([]);
      setStats(null);
      setPricingData(null);
    }
  };

  const fetchPropertyIssues = async (property) => {
    try {
      setLoadingIssues(true);
      // Use the property id (internal database ID) for the API call
      const response = await api.get(`/issues/${property.id}`);

      if (response.data) {
        // API returns { issues: [...], stats: {...} }
        setIssues(response.data.issues || []);
        setStats(response.data.stats || null);
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
      setIssues([]);
      setStats(null);
    } finally {
      setLoadingIssues(false);
    }
  };

  const fetchPricingData = async (property) => {
    try {
      setLoadingPricing(true);
      const listingId = property.pms_listing_id || property.id;
      const response = await api.get(`/pricing/analysis/${listingId}`);
      setPricingData(response.data);
    } catch (error) {
      // Silently fail - pricing is optional feature
      console.log('Pricing not available for this property');
      setPricingData(null);
    } finally {
      setLoadingPricing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedProperty) {
      handleSelectProperty(selectedProperty);
    } else {
      fetchProperties();
    }
  };

  const getIssueIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'cleanliness': return 'sparkles';
      case 'maintenance': return 'build';
      case 'amenities': return 'wifi';
      case 'communication': return 'chatbubbles';
      case 'accuracy': return 'information-circle';
      case 'location': return 'location';
      case 'check-in': return 'key';
      default: return 'alert-circle';
    }
  };

  const getIssueColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'medium': return '#215EEA';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderPropertySelector = () => (
    <TouchableOpacity
      style={styles.propertySelector}
      onPress={() => setPropertyPickerVisible(true)}
      activeOpacity={0.7}
    >
      <View style={styles.propertySelectorLeft}>
        <View style={styles.propertySelectorIcon}>
          <Ionicons
            name={selectedProperty?.isPMSProperty ? 'cloud' : 'home'}
            size={18}
            color="#215EEA"
          />
        </View>
        <View>
          <Text style={styles.propertySelectorLabel}>Selected Property</Text>
          <Text style={styles.propertySelectorValue} numberOfLines={1}>
            {selectedProperty?.nickname || selectedProperty?.name || 'Select property'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-down" size={20} color="#6B7280" />
    </TouchableOpacity>
  );

  const renderStatsOverview = () => {
    if (!selectedProperty?.isPMSProperty) return null;

    // Calculate stats from issues array if API stats are missing or zero
    const totalIssues = stats?.totalIssues || stats?.total_issues || issues.length;
    const resolvedIssues = stats?.resolvedIssues || stats?.resolved_issues || 
      issues.filter(i => i.status === 'resolved' || i.resolved).length;
    const unresolvedIssues = stats?.unresolvedIssues || stats?.unresolved_issues || 
      (totalIssues - resolvedIssues);
    const rating = stats?.rating || stats?.currentRating;

    return (
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalIssues}</Text>
            <Text style={styles.statLabel}>Total Issues</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#33D39C' }]}>{resolvedIssues}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{unresolvedIssues}</Text>
            <Text style={styles.statLabel}>Unresolved</Text>
          </View>
          {rating && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.statValue}>{rating}</Text>
                </View>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderPricingOverview = () => {
    if (!pricingData || loadingPricing) return null;

    return (
      <View style={styles.pricingCard}>
        <View style={styles.pricingHeader}>
          <Ionicons name="analytics" size={20} color="#215EEA" />
          <Text style={styles.pricingTitle}>Pricing Analytics</Text>
        </View>

        <View style={styles.pricingStats}>
          {pricingData.current_price && (
            <View style={styles.pricingStatItem}>
              <Text style={styles.pricingStatValue}>${pricingData.current_price}</Text>
              <Text style={styles.pricingStatLabel}>Current Price</Text>
            </View>
          )}
          {pricingData.market_avg && (
            <View style={styles.pricingStatItem}>
              <Text style={styles.pricingStatValue}>${pricingData.market_avg}</Text>
              <Text style={styles.pricingStatLabel}>Market Avg</Text>
            </View>
          )}
          {pricingData.occupancy_rate && (
            <View style={styles.pricingStatItem}>
              <Text style={styles.pricingStatValue}>{pricingData.occupancy_rate}%</Text>
              <Text style={styles.pricingStatLabel}>Occupancy</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Helper to safely get string from possibly nested value
  const getString = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      // Try common text fields
      return value.message_text || value.text || value.content || value.message || '';
    }
    return String(value);
  };

  const renderIssueCard = (issue, index) => {
    const severity = getString(issue.severity) || getString(issue.priority) || 'medium';
    const category = getString(issue.category) || getString(issue.type) || 'General';
    const color = getIssueColor(severity);
    const icon = getIssueIcon(category);
    
    // Get title - handle nested objects
    let title = 'Issue';
    if (typeof issue.issue === 'string') title = issue.issue;
    else if (typeof issue.title === 'string') title = issue.title;
    else if (typeof issue.description === 'string') title = issue.description;
    else if (issue.message_text) title = issue.message_text;
    else if (issue.issue?.message_text) title = issue.issue.message_text;
    
    const date = issue.date || issue.created_at || issue.createdAt || issue.sent_at;

    return (
      <TouchableOpacity
        key={issue.id || index}
        style={[styles.issueCard, { borderLeftWidth: 3, borderLeftColor: color }]}
        onPress={() => {
          setSelectedIssue(issue);
          setIssueModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.issueIconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={styles.issueContent}>
          <Text style={styles.issueTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.issueMeta}>
            <Text style={styles.issueCategory}>{category}</Text>
            {date && <Text style={styles.issueDate}>{formatDate(date)}</Text>}
          </View>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.severityText, { color }]}>{severity}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderIssuesSection = () => {
    if (!selectedProperty?.isPMSProperty) {
      return (
        <View style={styles.noPMSCard}>
          <Ionicons name="cloud-offline-outline" size={40} color="#9CA3AF" />
          <Text style={styles.noPMSTitle}>PMS Required</Text>
          <Text style={styles.noPMSText}>
            Connect a PMS like Hostify to view guest issues and pricing analytics
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => navigation.getParent()?.navigate('Inspections', { screen: 'PMSSettings' })}
          >
            <Text style={styles.connectButtonText}>Connect PMS</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Quick actions to navigate to full pages
    return (
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Property Insights</Text>
        
        {/* Guest Issues Card */}
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate('Issues', { 
            propertyId: selectedProperty?.id,
            propertyName: selectedProperty?.nickname || selectedProperty?.name 
          })}
          activeOpacity={0.7}
        >
          <View style={[styles.actionCardIcon, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="warning" size={24} color="#EF4444" />
          </View>
          <View style={styles.actionCardContent}>
            <Text style={styles.actionCardTitle}>Guest Issues</Text>
            <Text style={styles.actionCardSubtitle}>
              {loadingIssues ? 'Loading...' : `${issues.filter(i => i.status !== 'resolved' && !i.resolved).length} active`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Pricing Analytics Card - if available */}
        {pricingData && (
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.getParent()?.navigate('Pricing', { 
              propertyId: selectedProperty?.id 
            })}
            activeOpacity={0.7}
          >
            <View style={[styles.actionCardIcon, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="analytics" size={24} color="#33D39C" />
            </View>
            <View style={styles.actionCardContent}>
              <Text style={styles.actionCardTitle}>Pricing Analytics</Text>
              <Text style={styles.actionCardSubtitle}>
                {pricingData.current_price ? `$${pricingData.current_price}/night` : 'View pricing data'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderPropertyPicker = () => (
    <Modal
      visible={propertyPickerVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setPropertyPickerVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setPropertyPickerVisible(false)}>
            <Ionicons name="close" size={28} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Property</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search properties..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={properties.filter(p => {
            const name = (p.nickname || p.name || '').toLowerCase();
            return name.includes(searchQuery.toLowerCase());
          })}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.propertyList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.propertyItem,
                selectedProperty?.id === item.id && styles.propertyItemActive
              ]}
              onPress={() => handleSelectProperty(item)}
            >
              <View style={[
                styles.propertyItemIcon,
                { backgroundColor: item.isPMSProperty ? '#E3F2FD' : '#F3F4F6' }
              ]}>
                <Ionicons
                  name={item.isPMSProperty ? 'cloud' : 'home'}
                  size={18}
                  color={item.isPMSProperty ? '#215EEA' : '#6B7280'}
                />
              </View>
              <View style={styles.propertyItemContent}>
                <Text style={styles.propertyItemName}>{item.nickname || item.name}</Text>
                {item.isPMSProperty && (
                  <Text style={styles.propertyItemBadge}>PMS Connected</Text>
                )}
              </View>
              {selectedProperty?.id === item.id && (
                <Ionicons name="checkmark-circle" size={22} color="#215EEA" />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyProperties}>
              <Text style={styles.emptyText}>No properties found</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );

  const renderIssueModal = () => {
    if (!selectedIssue) return null;

    const severity = getString(selectedIssue.severity) || getString(selectedIssue.ai_analysis?.severity) || 'medium';
    const category = getString(selectedIssue.category) || getString(selectedIssue.ai_analysis?.category) || 'General';
    
    // Get title/summary - check all possible fields including ai_analysis
    const title = getString(selectedIssue.summary) || 
                  getString(selectedIssue.ai_analysis?.summary) ||
                  getString(selectedIssue.issue) || 
                  getString(selectedIssue.title) || 
                  'Issue';
    
    // Get AI reasoning/description
    const reasoning = getString(selectedIssue.ai_analysis?.reasoning) || '';
    const description = getString(selectedIssue.description) || getString(selectedIssue.details) || '';
    
    // Get recommendation
    const recommendation = getString(selectedIssue.recommendation) || 
                          getString(selectedIssue.ai_analysis?.recommendation) ||
                          getString(selectedIssue.suggestion) || '';
    
    const date = selectedIssue.date || selectedIssue.created_at || selectedIssue.createdAt || selectedIssue.sent_at;
    const status = getString(selectedIssue.status) || '';

    return (
      <Modal
        visible={issueModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIssueModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIssueModalVisible(false)}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Issue Details</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.issueDetailContent}>
            <View style={styles.issueDetailHeader}>
              <View style={[
                styles.issueDetailIcon,
                { backgroundColor: `${getIssueColor(severity)}15` }
              ]}>
                <Ionicons
                  name={getIssueIcon(category)}
                  size={28}
                  color={getIssueColor(severity)}
                />
              </View>
              <Text style={styles.issueDetailTitle}>{title}</Text>
              {date && (
                <Text style={styles.issueDetailDate}>{formatDate(date)}</Text>
              )}
              <View style={styles.issueDetailMeta}>
                <View style={[
                  styles.detailBadge,
                  { backgroundColor: `${getIssueColor(severity)}15` }
                ]}>
                  <Text style={[
                    styles.detailBadgeText,
                    { color: getIssueColor(severity) }
                  ]}>
                    {severity}
                  </Text>
                </View>
                <View style={styles.detailBadge}>
                  <Text style={styles.detailBadgeText}>{category}</Text>
                </View>
                {status && (
                  <View style={[styles.detailBadge, { backgroundColor: '#E0F2FE' }]}>
                    <Text style={[styles.detailBadgeText, { color: '#0284C7' }]}>{status}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Summary Section */}
            <View style={styles.issueSection}>
              <Text style={styles.issueSectionTitle}>Summary</Text>
              <Text style={styles.issueSectionText}>{title}</Text>
            </View>

            {/* AI Analysis / Reasoning */}
            {reasoning ? (
              <View style={styles.issueSection}>
                <Text style={styles.issueSectionTitle}>AI Analysis</Text>
                <Text style={styles.issueSectionText}>{reasoning}</Text>
              </View>
            ) : null}

            {/* Additional Description */}
            {description && description !== title ? (
              <View style={styles.issueSection}>
                <Text style={styles.issueSectionTitle}>Details</Text>
                <Text style={styles.issueSectionText}>{description}</Text>
              </View>
            ) : null}

            {/* Recommendation */}
            {recommendation ? (
              <View style={[styles.issueSection, styles.recommendationSection]}>
                <View style={styles.recommendationHeader}>
                  <Ionicons name="bulb" size={18} color="#F59E0B" />
                  <Text style={styles.recommendationTitle}>Recommendation</Text>
                </View>
                <Text style={styles.issueSectionText}>{recommendation}</Text>
              </View>
            ) : null}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#215EEA" />
        <Text style={styles.loadingText}>Loading properties...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#215EEA" />
        }
      >
        {renderPropertySelector()}
        {renderPricingOverview()}
        {renderIssuesSection()}
        <View style={{ height: 40 }} />
      </ScrollView>

      {renderPropertyPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  // Property Selector
  propertySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 14,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  propertySelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  propertySelectorIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  propertySelectorLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  propertySelectorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    maxWidth: 200,
  },
  // Stats Card
  statsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Pricing Card
  pricingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  pricingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  pricingStats: {
    flexDirection: 'row',
    gap: 12,
  },
  pricingStatItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  pricingStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  pricingStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  // Quick Actions Section
  quickActionsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  actionCardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Issues Section (kept for backwards compatibility)
  issuesContainer: {
    paddingHorizontal: 16,
  },
  issueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  issueIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  issueContent: {
    flex: 1,
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  issueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  issueCategory: {
    fontSize: 12,
    color: '#6B7280',
  },
  issueDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#215EEA',
  },
  // No PMS Card
  noPMSCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  noPMSTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noPMSText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  connectButton: {
    backgroundColor: '#215EEA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  connectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Loading/Empty Cards
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 14,
    gap: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  propertyList: {
    padding: 16,
    paddingTop: 0,
  },
  propertyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  propertyItemActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#215EEA',
  },
  propertyItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  propertyItemContent: {
    flex: 1,
  },
  propertyItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  propertyItemBadge: {
    fontSize: 12,
    color: '#215EEA',
    marginTop: 2,
  },
  emptyProperties: {
    alignItems: 'center',
    padding: 40,
  },
  // Issue Detail Modal
  issueDetailContent: {
    flex: 1,
    padding: 16,
  },
  issueDetailHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  issueDetailIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  issueDetailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  issueDetailDate: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  issueDetailMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  detailBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  issueSection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  issueSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  issueSectionText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 24,
  },
  recommendationSection: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D97706',
  },
});

