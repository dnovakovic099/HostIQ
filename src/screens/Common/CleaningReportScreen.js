import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Share,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48) / 3;

const GRADE_COLORS = {
  'A+': '#10B981',
  'A': '#10B981',
  'A-': '#34D399',
  'B+': '#F59E0B',
  'B': '#F59E0B',
  'B-': '#FBBF24',
  'C+': '#F97316',
  'C': '#F97316',
  'C-': '#FB923C',
  'D': '#EF4444',
  'F': '#DC2626',
};

export default function CleaningReportScreen({ route, navigation }) {
  const { inspectionId, shareToken } = route.params;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    if (shareToken) {
      fetchPublicReport();
    } else {
      fetchOrGenerateReport();
    }
  }, [inspectionId, shareToken]);

  const fetchPublicReport = async () => {
    try {
      const res = await api.get(`/reports/public/${shareToken}`);
      setReport(res.data);
    } catch (error) {
      console.error('Error fetching public report:', error);
      Alert.alert('Error', 'Report not found or has expired');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchOrGenerateReport = async () => {
    try {
      // Try to get existing report
      const res = await api.get(`/reports/inspection/${inspectionId}`);
      setReport(res.data);
    } catch (error) {
      if (error.response?.status === 404) {
        // Report doesn't exist, generate it
        await generateReport();
      } else {
        console.error('Error fetching report:', error);
        Alert.alert('Error', 'Failed to load report');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await api.post(`/reports/generate/${inspectionId}`);
      setReport(res.data);
      
      // Fetch full report data
      const fullRes = await api.get(`/reports/public/${res.data.share_token}`);
      setReport(fullRes.data);
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!report) return;
    
    const shareUrl = `https://hostiq.app/report/${report.share_token}`;
    
    try {
      await Share.share({
        title: `Cleaning Report - ${report.property_name}`,
        message: `🏠 Property Cleaning Verification\n\n${report.property_name}${report.unit_name ? ` - ${report.unit_name}` : ''}\n📅 ${report.formatted_date}\n👤 Cleaned by: ${report.cleaner_name}\n${report.cleanliness_score ? `✨ Score: ${report.cleanliness_score.toFixed(1)}/10` : ''}\n📸 ${report.photo_count} timestamped photos\n\nView full report: ${shareUrl}`,
        url: shareUrl
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading || generating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {generating ? 'Generating Report...' : 'Loading Report...'}
        </Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>Report not available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={generateReport}>
          <Text style={styles.retryButtonText}>Generate Report</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const gradeColor = GRADE_COLORS[report.overall_grade] || '#8E8E93';
  const roomNames = report.photos_by_room ? Object.keys(report.photos_by_room) : [];
  const displayPhotos = selectedRoom 
    ? report.photos_by_room[selectedRoom] 
    : report.photos;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
            <Text style={styles.verifiedText}>Verified Cleaning Report</Text>
          </View>
          
          <Text style={styles.propertyName}>{report.property_name}</Text>
          {report.unit_name && (
            <Text style={styles.unitName}>{report.unit_name}</Text>
          )}
          
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
            <Text style={styles.dateText}>{report.formatted_date}</Text>
          </View>
          
          <View style={styles.cleanerRow}>
            <Ionicons name="person-outline" size={16} color="#8E8E93" />
            <Text style={styles.cleanerText}>Cleaned by {report.cleaner_name}</Text>
          </View>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="camera" size={20} color="#007AFF" />
            </View>
            <Text style={styles.statValue}>{report.photo_count}</Text>
            <Text style={styles.statLabel}>Photos</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="home" size={20} color="#5856D6" />
            </View>
            <Text style={styles.statValue}>{report.room_count}</Text>
            <Text style={styles.statLabel}>Rooms</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${gradeColor}15` }]}>
              <Ionicons 
                name={report.guest_ready ? 'checkmark-circle' : 'star'} 
                size={20} 
                color={gradeColor} 
              />
            </View>
            <Text style={[styles.statValue, { color: gradeColor }]}>
              {report.overall_grade || (report.cleanliness_score?.toFixed(1) || 'N/A')}
            </Text>
            <Text style={styles.statLabel}>
              {report.guest_ready ? 'Guest Ready' : 'Score'}
            </Text>
          </View>
        </View>

        {/* AI Summary */}
        {report.ai_summary && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="sparkles" size={18} color="#5856D6" />
              <Text style={styles.summaryTitle}>AI Analysis</Text>
            </View>
            <Text style={styles.summaryText}>{report.ai_summary}</Text>
          </View>
        )}

        {/* Highlights */}
        {report.highlights && report.highlights.length > 0 && (
          <View style={styles.highlightsCard}>
            <Text style={styles.sectionTitle}>Highlights</Text>
            {report.highlights.slice(0, 5).map((highlight, index) => (
              <View key={index} style={styles.highlightItem}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.highlightText}>{highlight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Room Filter */}
        {roomNames.length > 1 && (
          <View style={styles.roomFilter}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.roomChip, !selectedRoom && styles.roomChipActive]}
                onPress={() => setSelectedRoom(null)}
              >
                <Text style={[styles.roomChipText, !selectedRoom && styles.roomChipTextActive]}>
                  All Rooms
                </Text>
              </TouchableOpacity>
              {roomNames.map(room => (
                <TouchableOpacity
                  key={room}
                  style={[styles.roomChip, selectedRoom === room && styles.roomChipActive]}
                  onPress={() => setSelectedRoom(room)}
                >
                  <Text style={[styles.roomChipText, selectedRoom === room && styles.roomChipTextActive]}>
                    {room}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Timestamped Photos */}
        <View style={styles.photosSection}>
          <Text style={styles.sectionTitle}>
            Timestamped Evidence ({displayPhotos?.length || 0} photos)
          </Text>
          
          <View style={styles.photosGrid}>
            {displayPhotos?.map((photo, index) => (
              <View key={photo.id || index} style={styles.photoWrapper}>
                <Image
                  source={{ uri: photo.url }}
                  style={styles.photo}
                  resizeMode="cover"
                />
                <View style={styles.timestampOverlay}>
                  <Text style={styles.timestampText}>{formatTime(photo.timestamp)}</Text>
                </View>
                {photo.room_name && photo.room_name !== 'General' && (
                  <View style={styles.roomLabel}>
                    <Text style={styles.roomLabelText} numberOfLines={1}>{photo.room_name}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Verification Footer */}
        <View style={styles.verificationFooter}>
          <Ionicons name="shield-checkmark" size={24} color="#10B981" />
          <View style={styles.verificationText}>
            <Text style={styles.verificationTitle}>Verified by HostIQ</Text>
            <Text style={styles.verificationSubtitle}>
              AI-powered inspection • Tamper-proof timestamps
            </Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Share Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color="#FFF" />
          <Text style={styles.shareButtonText}>Share Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F2F2F7',
  },
  errorText: {
    fontSize: 17,
    color: '#000',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Header Card
  headerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98115',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  propertyName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
  },
  unitName: {
    fontSize: 17,
    color: '#8E8E93',
    marginTop: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  dateText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  cleanerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  cleanerText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 12,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  summaryText: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 22,
  },
  // Highlights
  highlightsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  highlightText: {
    flex: 1,
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 20,
  },
  // Room Filter
  roomFilter: {
    marginBottom: 12,
  },
  roomChip: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  roomChipActive: {
    backgroundColor: '#007AFF',
  },
  roomChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  roomChipTextActive: {
    color: '#FFF',
  },
  // Photos
  photosSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoWrapper: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  timestampOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  timestampText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  roomLabel: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  roomLabelText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#FFF',
    textAlign: 'center',
  },
  // Verification Footer
  verificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98110',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  verificationText: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
  },
  verificationSubtitle: {
    fontSize: 13,
    color: '#059669',
    marginTop: 2,
  },
  // Footer
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#FFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  bottomPadding: {
    height: 20,
  },
});

