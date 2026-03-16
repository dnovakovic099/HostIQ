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
  Linking,
  Platform,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import api from '../../api/client';
import colors from '../../theme/colors';
import { API_URL } from '../../config/api';
import * as SecureStore from 'expo-secure-store';

// Try to import expo-sharing, but make it optional
let Sharing = null;
try {
  Sharing = require('expo-sharing');
} catch (e) {
  console.log('expo-sharing not available, using fallback');
}

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48) / 3;

// Sync version for fallback
const fixImageUrlSync = (url) => {
  if (!url) return url;
  url = String(url).trim();
  const isFullUrl = url.startsWith('http://') || url.startsWith('https://');

  if (isFullUrl) {
    const productionUrl = 'https://roomify-server-production.up.railway.app';
    const baseUrl = API_URL.replace('/api', '');
    if (url.includes(productionUrl) && !baseUrl.includes('roomify-server-production')) {
      const path = url.replace(productionUrl, '');
      return baseUrl + path;
    }
    // Ensure HTTPS for production URLs
    if (url.includes('roomify-server-production.up.railway.app')) {
      return url.replace('http://', 'https://');
    }
    return url;
  } else {
    const baseUrl = API_URL.replace('/api', '');
    const path = url.startsWith('/') ? url : '/' + url;
    return baseUrl + path;
  }
};

// Async version that appends auth token for authenticated image access
const fixImageUrl = async (url) => {
  if (!url) return url;
  let fixedUrl = fixImageUrlSync(url);

  // Ensure HTTPS for production URLs (Android blocks cleartext HTTP in release builds)
  if (fixedUrl && fixedUrl.includes('roomify-server-production.up.railway.app')) {
    fixedUrl = fixedUrl.replace('http://', 'https://');
  }

  try {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token && fixedUrl) {
      const separator = fixedUrl.includes('?') ? '&' : '?';
      fixedUrl = `${fixedUrl}${separator}token=${encodeURIComponent(token)}`;
    }
  } catch (error) {
    console.log('Could not append auth token to image URL:', error);
  }

  return fixedUrl;
};

// Component to handle authenticated image loading
const AuthenticatedImage = ({ photo, style, children }) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState(null);
  const [token, setToken] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    const loadUrl = async () => {
      try {
        const authToken = await SecureStore.getItemAsync('accessToken').catch(() => null);
        if (mounted && authToken) setToken(authToken);
        const url = await fixImageUrl(photo.url);
        if (mounted) setImageUrl(url);
      } catch (e) {
        if (mounted) setImageUrl(fixImageUrlSync(photo.url));
      }
    };
    loadUrl();
    return () => { mounted = false; };
  }, [photo.url]);

  if (imageError) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' }]}>
        <Ionicons name="image-outline" size={24} color={colors.text.tertiary} />
        {children}
      </View>
    );
  }

  if (!imageUrl) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' }]}>
        <ActivityIndicator size="small" color={colors.primary.main} />
        {children}
      </View>
    );
  }

  return (
    <>
      <Image
        source={{
          uri: imageUrl,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }}
        style={style}
        resizeMode="cover"
        onError={() => setImageError(true)}
      />
      {children}
    </>
  );
};

const GRADE_COLORS = {
  'A+': '#33D39C',
  'A': '#33D39C',
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
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  // Bottom bar: buttons (~48) + padding (12+12) + safe area bottom
  const bottomBarHeight = 72 + insets.bottom;

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
    if (!report) {
      Alert.alert('Error', 'Report data is not available');
      return;
    }
    
    if (!report.share_token) {
      Alert.alert('Error', 'Share link is not available. Please wait for the report to finish generating.');
      return;
    }
    
    // Sanitize and validate share_token
    const shareToken = String(report.share_token).trim();
    if (!shareToken || shareToken.length === 0) {
      Alert.alert('Error', 'Invalid share token. Please try again.');
      return;
    }
    
    // Construct the share URL
    // Use the same base URL as the API (without the /api suffix) so that it always
    // points to a real, reachable host (e.g. Railway / production backend).
    // For the public HTML view, the backend exposes GET /report/:shareToken (see roomify-server/src/app.js),
    // so the shared URL must use `/report/${shareToken}` (no /api, no /reports/public).
    const baseUrl = API_URL.replace('/api', '');
    const shareUrl = `${baseUrl}/report/${shareToken}`;
    
    // Validate URL format
    try {
      new URL(shareUrl);
    } catch (error) {
      console.error('Invalid share URL:', shareUrl, error);
      Alert.alert('Error', 'Invalid share link format. Please try again.');
      return;
    }
    
    // Build share message with URL included
    const shareMessage = `🏠 Property Cleaning Verification\n\n${report.property_name}${report.unit_name ? ` - ${report.unit_name}` : ''}\n📅 ${report.formatted_date}\n👤 Cleaned by: ${report.cleaner_name}\n${report.cleanliness_score ? `✨ Score: ${report.cleanliness_score.toFixed(1)}/10` : ''}\n📸 ${report.photo_count} timestamped photos\n\nView full report: ${shareUrl}`;
    
    try {
      // On iOS, include URL in message for better compatibility
      // On Android, url parameter works better
      const shareOptions = Platform.OS === 'ios' 
        ? {
            message: shareMessage,
          }
        : {
            title: `Cleaning Report - ${report.property_name}`,
            message: shareMessage,
            url: shareUrl,
          };
      
      const result = await Share.share(shareOptions);
      
      if (result.action === Share.sharedAction) {
        console.log('Share successful:', shareUrl);
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share report. Please try again.');
    }
  };

  const handleDownloadPdf = async () => {
    if (!report) {
      Alert.alert('Error', 'Report data is not available');
      return;
    }

    if (!report.id) {
      Alert.alert('Error', 'Report ID is missing. Please wait for the report to finish generating.');
      return;
    }

    setDownloadingPdf(true);

    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const pdfUrl = `${API_URL}/reports/${report.id}/pdf`;
      console.log('📥 Downloading PDF from:', pdfUrl);

      // Create a safe filename
      const safePropertyName = (report.property_name || 'Property').replace(/[^a-z0-9]/gi, '_');
      const dateStr = report.cleaning_date
        ? new Date(report.cleaning_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      const fileName = `Cleaning_Report_${safePropertyName}_${dateStr}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;

      console.log('💾 Saving PDF to:', fileUri);

      // Download the PDF
      const downloadResult = await FileSystem.downloadAsync(
        pdfUrl,
        fileUri,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('📥 Download result:', downloadResult.status, downloadResult.uri);

      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download PDF. Status: ${downloadResult.status}`);
      }

      // Verify the downloaded file is actually a PDF
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
      console.log('📄 File info:', fileInfo);

      if (!fileInfo.exists) {
        throw new Error('Downloaded file does not exist');
      }

      // Check file size - PDFs should be at least a few KB
      // Very small files are likely JSON error responses
      if (fileInfo.size < 1000) {
        console.log('⚠️ File is suspiciously small:', fileInfo.size, 'bytes');

        // Try to read it as text to check if it's a JSON error
        try {
          const content = await FileSystem.readAsStringAsync(downloadResult.uri);
          console.log('⚠️ Small file content:', content.substring(0, 500));

          try {
            const jsonError = JSON.parse(content);
            throw new Error(jsonError.error || 'Server returned an error instead of PDF');
          } catch (jsonParseError) {
            // Not JSON, might be a legitimate small PDF or other error
            throw new Error('Downloaded file is too small to be a valid PDF');
          }
        } catch (readError) {
          console.error('❌ Error reading file:', readError);
          throw new Error('Failed to validate downloaded file');
        }
      }

      // For larger files, assume they are valid PDFs
      // (18MB+ files are definitely not JSON error responses)
      console.log('✅ PDF file validated successfully (size:', fileInfo.size, 'bytes)');
      
      // Check if expo-sharing is available
      if (Sharing && await Sharing.isAvailableAsync()) {
        console.log('📤 Sharing PDF using expo-sharing');
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save or Share Cleaning Report PDF',
          UTI: 'com.adobe.pdf',
        });
        console.log('✅ PDF shared successfully');
      } else {
        console.log('📤 Using fallback share method');
        // Fallback: Use React Native Share with file path info
        Alert.alert(
          'PDF Ready',
          'Your cleaning report PDF has been generated. Would you like to share it?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Share', 
              onPress: async () => {
                try {
                  await Share.share({
                    title: `Cleaning Report - ${report.property_name}`,
                    message: `Cleaning Verification Report for ${report.property_name}\n\nDownload the full PDF report from the HostIQ app.`,
                    url: Platform.OS === 'ios' ? downloadResult.uri : undefined,
                  });
                } catch (e) {
                  console.log('Share cancelled');
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('PDF download error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      Alert.alert(
        'Download Failed',
        `Unable to download PDF report: ${errorMessage}\n\nPlease try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    }) + ' UTC';
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
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerWrapper, { paddingTop: insets.top }]}
      >
        {/* Decorative element */}
        <View style={styles.decorativeCircle}>
          <Ionicons name="document-text" size={70} color={colors.decorative.icon1} />
        </View>
        <SafeAreaView>
          <View style={styles.headerGradient}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerBackButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerIconWrapper}>
              <View style={styles.headerIconInner}>
                <Ionicons name="document-text" size={22} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.headerTextWrapper}>
              <Text style={styles.headerTitle}>Cleaning Report</Text>
              <Text style={styles.headerSubtitle}>Verified Documentation</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarHeight + 16 }]}
      >
        {/* Property Card */}
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <Ionicons name="home" size={16} color={colors.primary.main} />
            <Text style={styles.cardLabel}>PROPERTY INFORMATION</Text>
          </View>
          <View style={styles.propertySection}>
            <Text style={styles.propertyName}>{report.property_name}</Text>
            {report.unit_name && (
              <View style={styles.propertyDetailRow}>
                <Ionicons name="layers-outline" size={16} color={colors.text.tertiary} />
                <Text style={styles.propertyUnit}>{report.unit_name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Cleaning Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <Ionicons name="clipboard" size={16} color={colors.primary.main} />
            <Text style={styles.cardLabel}>CLEANING SUMMARY</Text>
          </View>

          {/* Key Metrics Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{report.cleanliness_score?.toFixed(1) || '—'}</Text>
              <Text style={styles.metricLabel}>Score</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={[styles.metricValue, { color: gradeColor }]}>
                {report.overall_grade || '—'}
              </Text>
              <Text style={styles.metricLabel}>Grade</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <View style={[styles.metricStatusIcon, { 
                backgroundColor: report.guest_ready ? colors.background.lightGreen : colors.background.lightRed 
              }]}>
                <Ionicons 
                  name={report.guest_ready ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={report.guest_ready ? colors.status.success : colors.status.error} 
                />
              </View>
              <Text style={[styles.metricLabel, {
                color: report.guest_ready ? colors.status.success : colors.status.error,
                marginTop: 4,
                fontWeight: '700'
              }]}>
                {report.guest_ready ? 'Ready' : 'Not Ready'}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBox}>
              <Text style={styles.metricValue}>{report.photo_count}</Text>
              <Text style={styles.metricLabel}>Photos</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          {/* Details */}
          <View style={styles.detailsList}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary.main} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Cleaning Date</Text>
                <Text style={styles.detailValue}>{report.formatted_date}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="person-outline" size={16} color={colors.primary.main} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Cleaned By</Text>
                <Text style={styles.detailValue}>{report.cleaner_name}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="bed-outline" size={16} color={colors.primary.main} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Rooms Cleaned</Text>
                <Text style={styles.detailValue}>{report.room_count} rooms</Text>
              </View>
            </View>
          </View>
        </View>

        {/* AI Summary */}
        {report.ai_summary && (
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Ionicons name="star" size={16} color={colors.primary.main} />
              <Text style={styles.cardLabel}>AI ANALYSIS</Text>
            </View>
            <Text style={styles.summaryText}>{report.ai_summary}</Text>
          </View>
        )}

        {/* Highlights */}
        {report.highlights && report.highlights.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardLabelRow}>
                <Ionicons name="checkmark-done" size={16} color={colors.primary.main} />
                <Text style={styles.cardLabel}>HIGHLIGHTS</Text>
              </View>
              <View style={styles.highlightCountBadge}>
                <Text style={styles.highlightCountText}>{report.highlights.length}</Text>
              </View>
            </View>
            {report.highlights.slice(0, 5).map((highlight, index) => (
              <View key={index} style={styles.highlightItem}>
                <View style={styles.highlightDot} />
                <View style={styles.highlightContent}>
                  <Text style={styles.highlightLabel}>Highlight {index + 1}</Text>
                  <Text style={styles.highlightText}>{highlight}</Text>
                </View>
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
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <Ionicons name="images" size={16} color={colors.primary.main} />
            <Text style={styles.cardLabel}>TIMESTAMPED PHOTO EVIDENCE</Text>
          </View>
          <View style={styles.photoDisclaimer}>
            <Text style={styles.photoDisclaimerText}>
              All photos include embedded timestamps and metadata for verification.
            </Text>
          </View>
          
          <View style={styles.photosGrid}>
            {displayPhotos?.map((photo, index) => (
              <View key={photo.id || index} style={styles.photoWrapper}>
                <AuthenticatedImage photo={photo} style={styles.photo}>
                  <View style={styles.timestampOverlay}>
                    <Text style={styles.timestampText}>{formatTime(photo.timestamp)}</Text>
                  </View>
                  {photo.room_name && photo.room_name !== 'General' && (
                    <View style={styles.roomLabel}>
                      <Text style={styles.roomLabelText} numberOfLines={1}>{photo.room_name}</Text>
                    </View>
                  )}
                </AuthenticatedImage>
              </View>
            ))}
          </View>
        </View>

        {/* Verification Footer */}
        <View style={styles.verificationFooter}>
          <Ionicons name="shield-checkmark" size={24} color={colors.status.success} />
          <View style={styles.verificationTextContainer}>
            <Text style={styles.verificationTitle}>Verified by HostIQ</Text>
            <Text style={styles.verificationSubtitle}>
              AI-powered inspection · Tamper-proof timestamps
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {downloadingPdf && (
          <View style={styles.generatingOverlay}>
            <ActivityIndicator size="small" color={colors.primary.main} />
            <Text style={styles.generatingText}>Downloading PDF...</Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.shareBtn]} 
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={18} color={colors.primary.main} />
            <Text style={styles.shareBtnText}>Share Link</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.pdfBtn]} 
            onPress={handleDownloadPdf}
            activeOpacity={0.7}
            disabled={downloadingPdf}
          >
            <Ionicons name="document-outline" size={18} color={colors.primary.main} />
            <Text style={styles.pdfBtnText}>Download PDF</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 16,
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
    backgroundColor: '#0A84FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },

  // Gradient Header
  headerWrapper: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.decorative.circle1,
    top: -30,
    right: -30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 14,
  },
  headerBackButton: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconWrapper: {
    marginRight: 12,
  },
  headerIconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.85,
  },

  // Card (shared style matching dispute report)
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A84FF',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  // Property
  propertySection: {
    marginTop: 4,
  },
  propertyName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.3,
    marginBottom: 12,
    lineHeight: 26,
  },
  propertyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  propertyUnit: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    flex: 1,
  },

  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E5E5EA',
    opacity: 0.6,
    marginHorizontal: 4,
  },
  metricStatusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },

  // Summary details
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 16,
    opacity: 0.6,
  },
  summaryText: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 22,
    fontWeight: '500',
  },
  detailsList: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  detailValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
    lineHeight: 20,
  },

  // Highlights
  highlightCountBadge: {
    backgroundColor: 'rgba(51, 211, 156, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highlightCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#33D39C',
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderLeftWidth: 1.5,
    borderLeftColor: '#33D39C',
  },
  highlightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#33D39C',
    marginTop: 2,
  },
  highlightContent: {
    flex: 1,
  },
  highlightLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.3,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  highlightText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Room Filter
  roomFilter: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  roomChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  roomChipActive: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
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
  photoDisclaimer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0A84FF',
    marginBottom: 16,
  },
  photoDisclaimerText: {
    fontSize: 12,
    color: '#3C3C43',
    fontWeight: '500',
    lineHeight: 18,
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
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: 'rgba(51, 211, 156, 0.08)',
    borderRadius: 10,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(51, 211, 156, 0.15)',
  },
  verificationTextContainer: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#33D39C',
  },
  verificationSubtitle: {
    fontSize: 13,
    color: '#059669',
    marginTop: 2,
    fontWeight: '500',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  generatingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 8,
    paddingVertical: 6,
  },
  generatingText: {
    fontSize: 13,
    color: '#3C3C43',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.08)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  shareBtn: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A84FF',
    letterSpacing: 0.1,
  },
  pdfBtn: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#0A84FF',
  },
  pdfBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A84FF',
    letterSpacing: 0.1,
  },
});

