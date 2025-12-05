import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import client from '../../api/client';

const IssuesScreen = () => {
  const navigation = useNavigation();
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [noPMSConnected, setNoPMSConnected] = useState(false);
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [showDashboard, setShowDashboard] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Damage Reports state
  const [activeTab, setActiveTab] = useState('guest'); // 'guest' or 'damage'
  const [damageReports, setDamageReports] = useState([]);
  const [damageStats, setDamageStats] = useState(null);

  // Fetch properties on mount
  useEffect(() => {
    fetchProperties();
  }, []);

  // Fetch issues and damage reports when property is selected
  useEffect(() => {
    if (selectedProperty) {
      fetchIssues();
      fetchAnalytics();
      fetchDamageReports();
    }
  }, [selectedProperty]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      console.log('🏠 Fetching PMS properties for issues...');
      const response = await client.get('/issues/properties');
      console.log('🏠 PMS Properties response:', response.data);
      console.log('🏠 Properties count:', response.data.properties?.length || 0);
      
      const props = response.data.properties || [];
      setProperties(props);
      
      // Check if no PMS properties
      if (props.length === 0) {
        console.log('⚠️ No PMS properties found');
        setNoPMSConnected(true);
      } else {
        console.log(`✅ Found ${props.length} PMS properties`);
        setNoPMSConnected(false);
        // Auto-select first property if available
        if (!selectedProperty) {
          setSelectedProperty(props[0].id);
          console.log('📍 Auto-selected property:', props[0].name || props[0].id);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching properties:', error);
      console.error('❌ Error details:', error.response?.data);
      // If 404, the issues endpoint doesn't exist on server yet
      // Or no PMS is connected
      setNoPMSConnected(true);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProperties = () => {
    if (!searchQuery.trim()) {
      return properties;
    }
    
    const query = searchQuery.toLowerCase();
    return properties.filter(property => {
      const name = (property.nickname || property.name || '').toLowerCase();
      const address = (property.address || '').toLowerCase();
      const city = (property.city || '').toLowerCase();
      const listingId = (property.pms_listing_id || '').toString().toLowerCase();
      
      return name.includes(query) || 
             address.includes(query) || 
             city.includes(query) || 
             listingId.includes(query);
    });
  };

  const fetchIssues = async () => {
    if (!selectedProperty) return;

    try {
      setLoading(true);
      const response = await client.get(`/issues/${selectedProperty}`);
      setIssues(response.data.issues);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching issues:', error);
      Alert.alert('Error', 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const fetchDamageReports = async () => {
    if (!selectedProperty) return;

    try {
      const response = await client.get(`/issues/${selectedProperty}/damage-reports`);
      setDamageReports(response.data.damageReports || []);
      setDamageStats(response.data.stats);
      console.log(`📦 Fetched ${response.data.damageReports?.length || 0} damage reports`);
    } catch (error) {
      console.error('Error fetching damage reports:', error);
      // Don't show alert - damage reports are optional/new feature
      setDamageReports([]);
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedProperty) return;

    try {
      const response = await client.get(`/issues/${selectedProperty}/analytics?days=90`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Don't show alert, analytics is optional
    }
  };

  const pollSyncStatus = async (jobId) => {
    const maxAttempts = 20; // 10 minutes max (20 * 30 seconds)
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await client.get(`/issues/sync-status/${jobId}`);
        const { status, progress, message, results, error } = response.data;

        console.log(`Sync status: ${status} - ${progress}% - ${message || ''}`);
        
        // Update status message
        setSyncStatus(message || 'Processing...');

        if (status === 'completed') {
          setSyncing(false);
          setSyncStatus(null);
          Alert.alert(
            'Sync Complete',
            `Processed: ${results.processed || 0}\nFlagged: ${results.flagged || 0}\nIssues Detected: ${results.issuesDetected || 0}`,
            [{ text: 'OK', onPress: () => {
              fetchIssues();
              fetchAnalytics();
            }}]
          );
          return;
        }

        if (status === 'error') {
          setSyncing(false);
          setSyncStatus(null);
          Alert.alert('Sync Error', error || 'Failed to sync messages');
          return;
        }

        // Still in progress, poll again
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(() => checkStatus(), 30000); // Poll every 30 seconds
        } else {
          setSyncing(false);
          setSyncStatus(null);
          Alert.alert('Timeout', 'Sync is taking longer than expected. Please check back later.');
        }
      } catch (error) {
        console.error('Error checking sync status:', error);
        setSyncing(false);
        setSyncStatus(null);
        Alert.alert('Error', 'Failed to check sync status');
      }
    };

    checkStatus();
  };

  const syncMessages = async () => {
    if (!selectedProperty) return;

    try {
      setSyncing(true);
      Alert.alert(
        'Syncing Messages',
        'This will fetch and analyze guest messages from the last 90 days. This may take a few minutes.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setSyncing(false) },
          {
            text: 'Continue',
            onPress: async () => {
              try {
                setSyncStatus('Starting sync...');
                
                const response = await client.post(`/issues/sync/${selectedProperty}`, {
                  daysBack: 90
                });
                
                if (response.data.jobId) {
                  setSyncStatus('This may take a while. Checking progress every 30 seconds...');
                  pollSyncStatus(response.data.jobId);
                } else {
                  setSyncing(false);
                  setSyncStatus(null);
                  Alert.alert('Error', 'Failed to start sync');
                }
              } catch (error) {
                console.error('Error syncing messages:', error);
                setSyncing(false);
                setSyncStatus(null);
                Alert.alert('Error', error.response?.data?.error || 'Failed to sync messages');
              }
            }
          }
        ]
      );
    } catch (error) {
      setSyncing(false);
      setSyncStatus(null);
    }
  };

  const updateIssueStatus = async (issueId, newStatus, notes = null) => {
    try {
      await client.patch(`/issues/${issueId}/status`, {
        status: newStatus,
        resolution_notes: notes
      });
      
      fetchIssues(); // Refresh list
      setModalVisible(false);
      Alert.alert('Success', 'Issue status updated');
    } catch (error) {
      console.error('Error updating issue:', error);
      Alert.alert('Error', 'Failed to update issue status');
    }
  };

  const deleteIssue = async (issueId) => {
    Alert.alert(
      'Delete Issue',
      'Are you sure you want to delete this issue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/issues/${issueId}`);
              fetchIssues();
              setModalVisible(false);
              Alert.alert('Success', 'Issue deleted');
            } catch (error) {
              console.error('Error deleting issue:', error);
              Alert.alert('Error', 'Failed to delete issue');
            }
          }
        }
      ]
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchIssues(), fetchAnalytics(), fetchDamageReports()])
      .finally(() => setRefreshing(false));
  }, [selectedProperty]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'BLOCKER':
        return '#DC2626'; // Red
      case 'HIGH':
        return '#EA580C'; // Orange
      case 'MEDIUM':
        return '#F59E0B'; // Amber
      case 'LOW':
        return '#10B981'; // Green
      default:
        return '#6B7280'; // Gray
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'BLOCKER':
        return 'alert-circle';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'information-circle';
      case 'LOW':
        return 'checkmark-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DETECTED':
        return '#EF4444';
      case 'REVIEWING':
        return '#F59E0B';
      case 'RESOLVED':
        return '#10B981';
      case 'FALSE_POSITIVE':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getDamageStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return '#EF4444';
      case 'ACKNOWLEDGED':
        return '#F59E0B';
      case 'IN_PROGRESS':
        return '#3B82F6';
      case 'RESOLVED':
        return '#10B981';
      case 'DISMISSED':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getDamageSourceIcon = (source) => {
    return source === 'CLEANER_REPORT' ? 'person' : 'hardware-chip';
  };

  const getDamageSourceLabel = (source) => {
    return source === 'CLEANER_REPORT' ? 'Cleaner Report' : 'AI Detected';
  };

  const renderDamageReportCard = ({ item }) => (
    <TouchableOpacity
      style={styles.issueCard}
      onPress={() => {
        setSelectedIssue({ ...item, isDamageReport: true });
        setModalVisible(true);
      }}
    >
      <View style={styles.issueHeader}>
        <View style={styles.severityBadge}>
          <Ionicons
            name={getSeverityIcon(item.severity)}
            size={16}
            color={getSeverityColor(item.severity)}
          />
          <Text style={[styles.severityText, { color: getSeverityColor(item.severity) }]}>
            {item.severity}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getDamageStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {/* Source indicator */}
      <View style={styles.sourceIndicator}>
        <Ionicons
          name={getDamageSourceIcon(item.source)}
          size={14}
          color="#6B7280"
        />
        <Text style={styles.sourceText}>{getDamageSourceLabel(item.source)}</Text>
        {item.roomName && (
          <>
            <Text style={styles.sourceDivider}>•</Text>
            <Text style={styles.sourceText}>{item.roomName}</Text>
          </>
        )}
      </View>

      <Text style={styles.issueCategory}>{item.category || 'Property Damage'}</Text>
      <Text style={styles.issueSummary} numberOfLines={2}>
        {item.description}
      </Text>

      {item.itemName && (
        <View style={styles.damageItemBadge}>
          <Ionicons name="cube-outline" size={14} color="#6B7280" />
          <Text style={styles.damageItemText}>{item.itemName}</Text>
        </View>
      )}

      <View style={styles.issueFooter}>
        {item.aiConfidence && (
          <Text style={styles.confidenceText}>
            AI Confidence: {Math.round(item.aiConfidence * 100)}%
          </Text>
        )}
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderIssueCard = ({ item }) => (
    <TouchableOpacity
      style={styles.issueCard}
      onPress={() => {
        setSelectedIssue(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.issueHeader}>
        <View style={styles.severityBadge}>
          <Ionicons
            name={getSeverityIcon(item.severity)}
            size={16}
            color={getSeverityColor(item.severity)}
          />
          <Text style={[styles.severityText, { color: getSeverityColor(item.severity) }]}>
            {item.severity}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.issueCategory}>{item.category}</Text>
      <Text style={styles.issueSummary} numberOfLines={2}>
        {item.summary}
      </Text>

      {item.message && (
        <View style={styles.messagePreview}>
          <Text style={styles.messageText} numberOfLines={2}>
            "{item.message.message_text}"
          </Text>
          <Text style={styles.messageInfo}>
            {item.message.guest_name && `${item.message.guest_name} • `}
            {new Date(item.message.sent_at).toLocaleDateString()}
          </Text>
        </View>
      )}

      <View style={styles.issueFooter}>
        <Text style={styles.confidenceText}>
          Confidence: {Math.round(item.confidence_score * 100)}%
        </Text>
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderIssueModal = () => {
    if (!selectedIssue) return null;

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Issue Details</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBadges}>
                <View style={[styles.severityBadge, styles.modalBadge]}>
                  <Ionicons
                    name={getSeverityIcon(selectedIssue.severity)}
                    size={16}
                    color={getSeverityColor(selectedIssue.severity)}
                  />
                  <Text style={[styles.severityText, { color: getSeverityColor(selectedIssue.severity) }]}>
                    {selectedIssue.severity}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedIssue.status) }]}>
                  <Text style={styles.statusText}>{selectedIssue.status}</Text>
                </View>
              </View>

              <Text style={styles.modalCategory}>{selectedIssue.category}</Text>
              <Text style={styles.modalSummary}>{selectedIssue.summary}</Text>

              {selectedIssue.message && (
                <View style={styles.modalMessage}>
                  <Text style={styles.modalSectionTitle}>Guest Message</Text>
                  <Text style={styles.modalMessageText}>{selectedIssue.message.message_text}</Text>
                  <Text style={styles.modalMessageInfo}>
                    From: {selectedIssue.message.guest_name || 'Guest'}
                    {'\n'}Date: {new Date(selectedIssue.message.sent_at).toLocaleString()}
                    {'\n'}Sentiment: {selectedIssue.message.sentiment_score?.toFixed(2) || 'N/A'}
                  </Text>
                </View>
              )}

              {selectedIssue.ai_analysis?.recommendation && (
                <View style={styles.modalRecommendation}>
                  <Text style={styles.modalSectionTitle}>AI Recommendation</Text>
                  <Text style={styles.modalRecommendationText}>
                    {selectedIssue.ai_analysis.recommendation}
                  </Text>
                </View>
              )}

              {selectedIssue.matched_keywords && selectedIssue.matched_keywords.length > 0 && (
                <View style={styles.modalKeywords}>
                  <Text style={styles.modalSectionTitle}>Matched Keywords</Text>
                  <View style={styles.keywordsList}>
                    {selectedIssue.matched_keywords.slice(0, 10).map((kw, idx) => (
                      <View key={idx} style={styles.keywordChip}>
                        <Text style={styles.keywordText}>{kw.keyword}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <Text style={styles.modalSectionTitle}>Update Status</Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
                    onPress={() => updateIssueStatus(selectedIssue.id, 'REVIEWING')}
                  >
                    <Text style={styles.actionButtonText}>Review</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                    onPress={() => updateIssueStatus(selectedIssue.id, 'RESOLVED')}
                  >
                    <Text style={styles.actionButtonText}>Resolve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#6B7280' }]}
                    onPress={() => updateIssueStatus(selectedIssue.id, 'FALSE_POSITIVE')}
                  >
                    <Text style={styles.actionButtonText}>False Alarm</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteIssue(selectedIssue.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete Issue</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading && properties.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading properties...</Text>
      </View>
    );
  }

  if (noPMSConnected || properties.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="link-outline" size={80} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>No PMS Connected</Text>
        <Text style={styles.emptyText}>
          Connect your Property Management System to automatically detect and track guest issues from messages.
        </Text>
        <TouchableOpacity
          style={styles.connectButton}
          onPress={() => {
            // Navigate to Inspections tab, then to PMSSettings
            navigation.getParent()?.navigate('Inspections', { screen: 'PMSSettings' });
          }}
        >
          <Ionicons name="link" size={20} color="#FFF" />
          <Text style={styles.connectButtonText}>Connect PMS</Text>
        </TouchableOpacity>
        <Text style={styles.helpText}>
          Supported: Hostify, Guesty, and more
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Property Selector */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Select Property:</Text>
        <TouchableOpacity
          style={styles.propertySelector}
          onPress={() => setPickerModalVisible(true)}
        >
          <Text style={styles.propertySelectorText}>
            {selectedProperty
              ? properties.find(p => p.id === selectedProperty)?.nickname ||
                properties.find(p => p.id === selectedProperty)?.name ||
                'Select Property'
              : 'Select Property'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Property Picker Modal */}
      <Modal
        visible={pickerModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setPickerModalVisible(false);
          setSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>
                Select Property ({properties.length} total)
              </Text>
              <TouchableOpacity onPress={() => {
                setPickerModalVisible(false);
                setSearchQuery('');
              }}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search properties..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.pickerScroll}>
              {getFilteredProperties().map((property) => {
                const label = property.nickname || property.name || `Property ${property.pms_listing_id}`;
                const isSelected = selectedProperty === property.id;
                return (
                  <TouchableOpacity
                    key={property.id}
                    style={[
                      styles.pickerOption,
                      isSelected && styles.pickerOptionSelected
                    ]}
                    onPress={() => {
                      console.log('📍 Property selected:', property.id, label);
                      setSelectedProperty(property.id);
                      setPickerModalVisible(false);
                      setSearchQuery('');
                    }}
                  >
                    <View style={styles.pickerOptionContent}>
                      <Text style={[
                        styles.pickerOptionText,
                        isSelected && styles.pickerOptionTextSelected
                      ]}>
                        {label}
                      </Text>
                      {property.address && (
                        <Text style={styles.pickerOptionSubtext}>
                          {property.address}{property.city ? `, ${property.city}` : ''}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
              {getFilteredProperties().length === 0 && (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.noResultsText}>No properties found</Text>
                  <Text style={styles.noResultsSubtext}>
                    Try adjusting your search
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'guest' && styles.activeTab]}
          onPress={() => setActiveTab('guest')}
        >
          <Ionicons 
            name="chatbubbles-outline" 
            size={18} 
            color={activeTab === 'guest' ? '#007AFF' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'guest' && styles.activeTabText]}>
            Guest Issues
          </Text>
          {stats?.total > 0 && (
            <View style={[styles.tabBadge, activeTab === 'guest' && styles.activeTabBadge]}>
              <Text style={styles.tabBadgeText}>{stats.total}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'damage' && styles.activeTab]}
          onPress={() => setActiveTab('damage')}
        >
          <Ionicons 
            name="warning-outline" 
            size={18} 
            color={activeTab === 'damage' ? '#007AFF' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'damage' && styles.activeTabText]}>
            Damage Reports
          </Text>
          {damageStats?.pending > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.tabBadgeText}>{damageStats.pending}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Issues/Damage List */}
      <FlatList
        data={activeTab === 'guest' ? issues : damageReports}
        renderItem={activeTab === 'guest' ? renderIssueCard : renderDamageReportCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            {/* Stats */}
            {activeTab === 'guest' && stats && (
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Total Issues</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: '#EF4444' }]}>
                    {stats.bySeverity?.BLOCKER || 0}
                  </Text>
                  <Text style={styles.statLabel}>Blockers</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: '#10B981' }]}>
                    {stats.byStatus?.RESOLVED || 0}
                  </Text>
                  <Text style={styles.statLabel}>Resolved</Text>
                </View>
              </View>
            )}

            {/* Damage Stats */}
            {activeTab === 'damage' && damageStats && (
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{damageStats.total}</Text>
                  <Text style={styles.statLabel}>Total Reports</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: '#EF4444' }]}>
                    {damageStats.pending}
                  </Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: '#10B981' }]}>
                    {damageStats.resolved}
                  </Text>
                  <Text style={styles.statLabel}>Resolved</Text>
                </View>
              </View>
            )}

            {/* Analytics Dashboard */}
            {analytics && (
              <View style={styles.dashboardContainer}>
                <TouchableOpacity
                  style={styles.dashboardHeader}
                  onPress={() => setShowDashboard(!showDashboard)}
                >
                  <View style={styles.dashboardTitleContainer}>
                    <Ionicons name="bar-chart" size={20} color="#007AFF" />
                    <Text style={styles.dashboardTitle}>Analytics Dashboard</Text>
                  </View>
                  <Ionicons
                    name={showDashboard ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>

                {showDashboard && (
                  <View style={styles.dashboardContent}>
                    {/* Summary Stats */}
                    <View style={styles.analyticsSummary}>
                      <Text style={styles.analyticsSummaryText}>
                        {analytics.summary.totalIssues} issues detected from{' '}
                        {analytics.summary.totalConversations} conversations
                      </Text>
                      <Text style={styles.analyticsSummarySubtext}>
                        ({analytics.summary.issueRate}% issue rate)
                      </Text>
                      <Text style={styles.dateRangeText}>
                        Last {analytics.summary.dateRange.days} days
                      </Text>
                    </View>

                    {/* Top Issues */}
                    {analytics.topIssues && analytics.topIssues.length > 0 && (
                      <View style={styles.analyticsSection}>
                        <Text style={styles.analyticsSectionTitle}>Most Common Issues</Text>
                        {analytics.topIssues.slice(0, 5).map((issue, idx) => (
                          <View key={idx} style={styles.topIssueRow}>
                            <View style={styles.topIssueLeft}>
                              <Text style={styles.topIssueCategory}>{issue.category}</Text>
                              <View style={styles.severityRow}>
                                <View style={styles.severityMini}>
                                  <View
                                    style={[
                                      styles.severityDot,
                                      { backgroundColor: getSeverityColor('BLOCKER') }
                                    ]}
                                  />
                                  <Text style={styles.severityMiniText}>
                                    {issue.severities.BLOCKER}
                                  </Text>
                                </View>
                                <View style={styles.severityMini}>
                                  <View
                                    style={[
                                      styles.severityDot,
                                      { backgroundColor: getSeverityColor('HIGH') }
                                    ]}
                                  />
                                  <Text style={styles.severityMiniText}>
                                    {issue.severities.HIGH}
                                  </Text>
                                </View>
                                <View style={styles.severityMini}>
                                  <View
                                    style={[
                                      styles.severityDot,
                                      { backgroundColor: getSeverityColor('MEDIUM') }
                                    ]}
                                  />
                                  <Text style={styles.severityMiniText}>
                                    {issue.severities.MEDIUM}
                                  </Text>
                                </View>
                                <View style={styles.severityMini}>
                                  <View
                                    style={[
                                      styles.severityDot,
                                      { backgroundColor: getSeverityColor('LOW') }
                                    ]}
                                  />
                                  <Text style={styles.severityMiniText}>
                                    {issue.severities.LOW}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            <View style={styles.topIssueCount}>
                              <Text style={styles.topIssueCountNumber}>{issue.count}</Text>
                              <Text style={styles.topIssueCountLabel}>occurrences</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                  </View>
                )}
              </View>
            )}

            {/* Sync Button */}
            <TouchableOpacity
              style={styles.syncButton}
              onPress={syncMessages}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="sync" size={20} color="#FFF" />
                  <Text style={styles.syncButtonText}>Sync Messages</Text>
                </>
              )}
            </TouchableOpacity>

            {syncStatus && (
              <View style={styles.syncStatusBanner}>
                <Ionicons name="information-circle" size={20} color="#1D4ED8" />
                <Text style={styles.syncStatusText}>{syncStatus}</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Issues Found</Text>
            <Text style={styles.emptyText}>
              Sync messages to detect guest issues
            </Text>
          </View>
        }
      />

      {/* Issue Detail Modal */}
      {renderIssueModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280'
  },
  pickerContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  propertySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#FFF'
  },
  propertySelectorText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1
  },
  pickerModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937'
  },
  pickerScroll: {
    maxHeight: '100%'
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  pickerOptionSelected: {
    backgroundColor: '#EFF6FF'
  },
  pickerOptionContent: {
    flex: 1
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1F2937'
  },
  pickerOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600'
  },
  pickerOptionSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 4
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center'
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937'
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  syncButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    gap: 8
  },
  syncButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  syncStatusBanner: {
    backgroundColor: '#DBEAFE',
    borderLeftWidth: 4,
    borderLeftColor: '#1D4ED8',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  syncStatusText: {
    flex: 1,
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 16
  },
  issueCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  severityText: {
    fontSize: 12,
    fontWeight: '700'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF'
  },
  issueCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4
  },
  issueSummary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8
  },
  messagePreview: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  messageText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: 4
  },
  messageInfo: {
    fontSize: 12,
    color: '#6B7280'
  },
  issueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  confidenceText: {
    fontSize: 12,
    color: '#6B7280'
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 40
  },
  connectButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  connectButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  helpText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 12,
    textAlign: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937'
  },
  modalBadges: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  modalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6'
  },
  modalCategory: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8
  },
  modalSummary: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16
  },
  modalMessage: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  modalMessageText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
    marginBottom: 8
  },
  modalMessageInfo: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18
  },
  modalRecommendation: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  modalRecommendationText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20
  },
  modalKeywords: {
    marginBottom: 16
  },
  keywordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  keywordChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  keywordText: {
    fontSize: 12,
    color: '#374151'
  },
  modalActions: {
    marginTop: 8
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600'
  },
  deleteButton: {
    backgroundColor: '#FEE2E2'
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600'
  },
  dashboardContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16
  },
  dashboardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  dashboardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937'
  },
  dashboardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  analyticsSummary: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center'
  },
  analyticsSummaryText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4
  },
  analyticsSummarySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8
  },
  dateRangeText: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  analyticsSection: {
    marginBottom: 16
  },
  analyticsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12
  },
  topIssueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  topIssueLeft: {
    flex: 1
  },
  topIssueCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6
  },
  severityRow: {
    flexDirection: 'row',
    gap: 12
  },
  severityMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  severityMiniText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600'
  },
  topIssueCount: {
    alignItems: 'flex-end',
    marginLeft: 12
  },
  topIssueCountNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937'
  },
  topIssueCountLabel: {
    fontSize: 11,
    color: '#6B7280'
  },
  severityBreakdown: {
    gap: 8
  },
  severityBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8
  },
  severityBreakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  severityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  severityBreakdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937'
  },
  severityBreakdownNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937'
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6
  },
  activeTab: {
    backgroundColor: '#EBF5FF'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280'
  },
  activeTabText: {
    color: '#007AFF'
  },
  tabBadge: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center'
  },
  activeTabBadge: {
    backgroundColor: '#007AFF'
  },
  tabBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700'
  },
  // Damage report styles
  sourceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6
  },
  sourceText: {
    fontSize: 12,
    color: '#6B7280'
  },
  sourceDivider: {
    color: '#D1D5DB'
  },
  damageItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 6
  },
  damageItemText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500'
  }
});

export default IssuesScreen;

