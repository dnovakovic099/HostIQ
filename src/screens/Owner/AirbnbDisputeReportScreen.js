import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Share,
  Alert,
  Platform,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';
import { API_URL } from '../../config/api';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// Try to import native modules - they may not be available in all environments
let Print = null;
let Sharing = null;
let MailComposer = null;

try {
  Print = require('expo-print');
  Sharing = require('expo-sharing');
  MailComposer = require('expo-mail-composer');
} catch (e) {
  console.log('Native PDF/Email modules not available:', e.message);
}

const COLORS = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  primary: '#007AFF',
  text: {
    primary: '#000000',
    secondary: '#3C3C43',
    tertiary: '#8E8E93',
  },
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  separator: '#E5E5EA',
};

// Base64 encoder for React Native (polyfill for btoa)
const base64Encode = (str) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  for (let i = 0; i < str.length; i += 3) {
    const a = str.charCodeAt(i);
    const b = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    const c = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
    const bitmap = (a << 16) | (b << 8) | c;
    output += chars.charAt((bitmap >> 18) & 63);
    output += chars.charAt((bitmap >> 12) & 63);
    output += i + 1 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
    output += i + 2 < str.length ? chars.charAt(bitmap & 63) : '=';
  }
  return output;
};

// Synchronous version for PDF generation (doesn't include auth token)
const fixImageUrlSync = (url) => {
  if (!url) return url;
  
  const originalUrl = String(url).trim();
  url = originalUrl;
  
  const isFullUrl = url.startsWith('http://') || url.startsWith('https://');
  
  let fixedUrl;
  
  if (isFullUrl) {
    const productionDomain = 'roomify-server-production.up.railway.app';
    const baseUrl = API_URL.replace('/api', '');
    const isProductionUrl = url.includes(productionDomain);
    
    if (isProductionUrl) {
      if (url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
      }
      
      if (!baseUrl.includes('roomify-server-production')) {
        const path = url.replace(`https://${productionDomain}`, '').replace(`http://${productionDomain}`, '');
        fixedUrl = baseUrl + path;
      } else {
        fixedUrl = url;
      }
    } else {
      if (url.startsWith('http://')) {
        fixedUrl = url.replace('http://', 'https://');
      } else {
        fixedUrl = url;
      }
    }
  } else {
    const baseUrl = API_URL.replace('/api', '');
    const path = url.startsWith('/') ? url : '/' + url;
    fixedUrl = baseUrl + path;
  }
  
  return fixedUrl;
};

// Async version with auth token for React Native Image component
const fixImageUrl = async (url) => {
  if (!url) return url;
  
  // Ensure it's a string and trim whitespace
  const originalUrl = String(url).trim();
  url = originalUrl;
  
  // Check if it's already a full URL
  const isFullUrl = url.startsWith('http://') || url.startsWith('https://');
  
  let fixedUrl;
  
  if (isFullUrl) {
    // Backend returned a full URL
    const productionDomain = 'roomify-server-production.up.railway.app';
    const baseUrl = API_URL.replace('/api', '');
    
    // Check if URL contains production domain (handle both http and https)
    const isProductionUrl = url.includes(productionDomain);
    
    if (isProductionUrl) {
      // Convert HTTP to HTTPS for production URLs (Railway supports HTTPS)
      if (url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
      }
      
      // If we're using local API, replace production URL with local base
      if (!baseUrl.includes('roomify-server-production')) {
        // Extract the path from the production URL and use local base
        const path = url.replace(`https://${productionDomain}`, '').replace(`http://${productionDomain}`, '');
        fixedUrl = baseUrl + path;
      } else {
        // Using production API, use HTTPS version
        fixedUrl = url;
      }
    } else {
      // Not a production URL, convert HTTP to HTTPS for security
      if (url.startsWith('http://')) {
        fixedUrl = url.replace('http://', 'https://');
      } else {
        fixedUrl = url;
      }
    }
  } else {
    // It's a relative path (starts with /), construct full URL
    const baseUrl = API_URL.replace('/api', '');
    const path = url.startsWith('/') ? url : '/' + url;
    fixedUrl = baseUrl + path;
  }
  
  // Try to append auth token as query parameter for image access
  try {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token && fixedUrl) {
      const separator = fixedUrl.includes('?') ? '&' : '?';
      fixedUrl = `${fixedUrl}${separator}token=${encodeURIComponent(token)}`;
    }
  } catch (error) {
    console.log('Could not append auth token to image URL:', error);
  }
  
  // Debug logging
  if (originalUrl !== fixedUrl) {
    console.log('🖼️  Image URL fixed:', {
      original: originalUrl,
      fixed: fixedUrl.replace(/token=[^&]+/, 'token=***'), // Hide token in logs
    });
  }
  
  return fixedUrl;
};

// Component to handle image loading (simplified like other screens)
// NOTE: This requires the backend to serve static files from /uploads/ folder.
// If images fail to load with 404 errors, the backend needs to configure static file serving.
const AuthenticatedImage = ({ media, index, inspection, onError }) => {
  const [imageError, setImageError] = useState(false);
  const imageKey = media.id || index;
  
  // Use the same approach as InspectionDetailScreen - just fix the URL and use Image component
  // The backend must serve static files from the uploads directory for this to work
  const imageUrl = fixImageUrlSync(media.url);

  if (imageError) {
    return (
      <View style={styles.photoPlaceholder}>
        <Ionicons name="image-outline" size={32} color={COLORS.text.tertiary} />
        <Text style={styles.photoPlaceholderText}>Image unavailable</Text>
      </View>
    );
  }

  return (
    <Image 
      source={{ uri: imageUrl }} 
      style={styles.photo} 
      resizeMode="cover"
      onLoad={() => {
        console.log(`✅ Image ${index + 1} loaded successfully from: ${imageUrl}`);
      }}
      onError={(error) => {
        console.error(`❌ Failed to load image ${index + 1}:`, {
          url: imageUrl,
          originalUrl: media.url,
          error: error.nativeEvent?.error || error.nativeEvent,
          note: 'Backend must serve static files from /uploads/ folder'
        });
        setImageError(true);
        if (onError) onError(imageKey);
      }}
    />
  );
};

export default function AirbnbDisputeReportScreen({ route, navigation }) {
  const { inspectionId } = route?.params || {};
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    if (inspectionId) {
      fetchInspection();
    }
  }, [inspectionId]);

  const fetchInspection = async () => {
    try {
      const response = await api.get(`/inspections/${inspectionId}`);
      const data = response.data;

      if (typeof data.summary_json === 'string') {
        data.summary_json = JSON.parse(data.summary_json);
      }
      if (typeof data.airbnb_grade_analysis === 'string') {
        data.airbnb_grade_analysis = JSON.parse(data.airbnb_grade_analysis);
      }
      if (typeof data.photo_quality_analysis === 'string') {
        data.photo_quality_analysis = JSON.parse(data.photo_quality_analysis);
      }
      if (typeof data.damage_analysis === 'string') {
        data.damage_analysis = JSON.parse(data.damage_analysis);
      }

      setInspection(data);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatTimestamp = (date) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const generatePDFHtml = () => {
    if (!inspection) return '';

    const propertyName = inspection.unit?.property?.name || 'Property';
    const address = inspection.unit?.property?.address || '';
    const unitName = inspection.unit?.name || '';
    const cleanerName = inspection.creator?.name || 'Inspector';
    const score = inspection.cleanliness_score?.toFixed(1) || 'N/A';
    const grade = inspection.airbnb_grade_analysis?.overall_grade || 'N/A';
    const isReady = inspection.airbnb_grade_analysis?.guest_ready;
    const issues = inspection.airbnb_grade_analysis?.improvements_needed || [];
    const roomResults = inspection.photo_quality_analysis?.room_results || {};
    const allMedia = inspection.media || [];

    let issuesHtml = '';
    if (issues.length > 0) {
      issuesHtml = `
        <div class="section">
          <h2>Documented Issues</h2>
          <ol>
            ${issues.map(issue => `<li>${issue}</li>`).join('')}
          </ol>
        </div>
      `;
    }

    let roomsHtml = '';
    if (Object.keys(roomResults).length > 0) {
      roomsHtml = `
        <div class="section">
          <h2>Room-by-Room Analysis</h2>
          ${Object.entries(roomResults).map(([roomId, room]) => {
            const roomIssues = room.cleanliness_reasons || [];
            const roomMedia = allMedia.filter(m => m.room_id === roomId);
            return `
              <div class="room">
                <div class="room-header">
                  <span class="room-name">${room.room_name}</span>
                  <span class="room-score" style="color: ${room.cleanliness_score >= 7 ? '#34C759' : room.cleanliness_score >= 5 ? '#FF9500' : '#FF3B30'}">
                    ${room.cleanliness_score}/10
                  </span>
                </div>
                <div class="room-status ${room.guest_ready ? 'ready' : 'not-ready'}">
                  ${room.guest_ready ? '✓ Guest Ready' : '✗ Needs Attention'}
                </div>
                <div class="room-photos">${roomMedia.length} photos documented</div>
                ${roomIssues.length > 0 ? `
                  <ul class="room-issues">
                    ${roomIssues.map(issue => `<li>${issue}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    let photosHtml = '';
    if (allMedia.length > 0) {
      photosHtml = `
        <div class="section photos-section">
          <h2>Timestamped Photo Evidence</h2>
          <p class="disclaimer">All photos include embedded timestamps and metadata for verification.</p>
          <div class="photos-grid">
            ${allMedia.map((media, index) => {
              const imageUrl = fixImageUrlSync(media.url);
              return `
              <div class="photo-item">
                <img src="${imageUrl}" alt="Photo ${index + 1}" />
                <div class="photo-info">
                  <strong>Photo #${index + 1}</strong>
                  ${media.room_name ? `<br/><span>${media.room_name}</span>` : ''}
                  <br/><small>${formatTimestamp(media.created_at || inspection.created_at)}</small>
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Airbnb Dispute Report</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #1a1a1a;
            padding: 20px;
          }
          .header {
            text-align: center;
            padding: 20px;
            border-bottom: 2px solid #007AFF;
            margin-bottom: 20px;
          }
          .badge {
            display: inline-block;
            background: #E3F2FF;
            color: #007AFF;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .subtitle {
            color: #666;
            font-size: 11px;
          }
          .section {
            margin-bottom: 24px;
            padding: 16px;
            background: #f9f9f9;
            border-radius: 8px;
          }
          h2 {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 12px;
            color: #333;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .property-name {
            font-size: 18px;
            font-weight: 700;
          }
          .property-address {
            color: #666;
            margin-top: 4px;
          }
          .summary-grid {
            display: flex;
            justify-content: space-between;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #ddd;
          }
          .summary-item {
            text-align: center;
            flex: 1;
          }
          .summary-value {
            font-size: 20px;
            font-weight: 700;
            color: #007AFF;
          }
          .summary-label {
            font-size: 10px;
            color: #666;
            margin-top: 2px;
          }
          .inspector {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #ddd;
            color: #666;
          }
          ol, ul {
            padding-left: 20px;
          }
          li {
            margin-bottom: 8px;
          }
          .room {
            background: white;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            border: 1px solid #e0e0e0;
          }
          .room-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .room-name {
            font-weight: 600;
            font-size: 14px;
          }
          .room-score {
            font-weight: 700;
            font-size: 14px;
          }
          .room-status {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            margin-top: 6px;
          }
          .room-status.ready {
            background: #E8F9ED;
            color: #34C759;
          }
          .room-status.not-ready {
            background: #FFEBE9;
            color: #FF3B30;
          }
          .room-photos {
            font-size: 11px;
            color: #666;
            margin-top: 4px;
          }
          .room-issues {
            margin-top: 8px;
            font-size: 11px;
            color: #666;
          }
          .photos-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
          }
          .photo-item {
            width: calc(50% - 6px);
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            overflow: hidden;
            background: white;
          }
          .photo-item img {
            width: 100%;
            height: 120px;
            object-fit: cover;
          }
          .photo-info {
            padding: 8px;
            font-size: 11px;
          }
          .photo-info small {
            color: #666;
          }
          .disclaimer {
            font-size: 11px;
            color: #666;
            font-style: italic;
            margin-bottom: 12px;
          }
          .footer {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 10px;
            color: #666;
          }
          .footer-note {
            margin-top: 4px;
            font-size: 9px;
          }
          @media print {
            body { padding: 0; }
            .section { break-inside: avoid; }
            .photo-item { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="badge">📋 Official Documentation</div>
          <h1>Airbnb Dispute Report</h1>
          <div class="subtitle">Generated ${formatDateTime(new Date())}</div>
        </div>

        <div class="section">
          <h2>Property Information</h2>
          <div class="property-name">${propertyName}</div>
          ${address ? `<div class="property-address">${address}</div>` : ''}
          ${unitName ? `<div class="property-address">${unitName}</div>` : ''}
        </div>

        <div class="section">
          <h2>Inspection Summary</h2>
          <div><strong>Date & Time:</strong> ${formatDateTime(inspection.created_at)}</div>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">${score}</div>
              <div class="summary-label">Score</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${grade}</div>
              <div class="summary-label">Grade</div>
            </div>
            <div class="summary-item">
              <div class="summary-value" style="color: ${isReady ? '#34C759' : '#FF3B30'}">${isReady ? '✓' : '✗'}</div>
              <div class="summary-label">${isReady ? 'Ready' : 'Not Ready'}</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${allMedia.length}</div>
              <div class="summary-label">Photos</div>
            </div>
          </div>
          <div class="inspector">Inspected by: ${cleanerName}</div>
        </div>

        ${issuesHtml}
        ${roomsHtml}
        ${photosHtml}

        <div class="footer">
          This documentation report was generated by HostIQ's AI-powered inspection system.<br/>
          All timestamps are verified and photos are stored securely.
          <div class="footer-note">Report ID: ${inspectionId?.substring(0, 8)}</div>
        </div>
      </body>
      </html>
    `;
  };

  const generatePDF = async () => {
    // Check if Print module is available
    if (!Print) {
      Alert.alert(
        'PDF Not Available',
        'PDF generation requires a production build of the app. Please use "Share Text" to copy the report and paste it into an email.',
        [{ text: 'OK' }]
      );
      return null;
    }
    
    setGenerating(true);
    try {
      const html = generatePDFHtml();
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });
      return uri;
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert(
        'PDF Not Available',
        'PDF generation failed. This feature requires a production build. Use "Share Text" instead.',
        [{ text: 'OK' }]
      );
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const handleSharePDF = async () => {
    // Check if modules are available
    if (!Print || !Sharing) {
      Alert.alert(
        'PDF Sharing Not Available',
        'PDF sharing requires a production build of the app. Please use "Share Text" to copy the report.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      const pdfUri = await generatePDF();
      if (pdfUri) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(pdfUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Dispute Report',
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Share PDF error:', error);
      Alert.alert('Error', 'Failed to share PDF. Please use "Share Text" instead.');
    }
  };

  const handleEmailPDF = () => {
    // Show email modal to get recipient
    setEmailModalVisible(true);
  };

  const sendEmailViaServer = async () => {
    if (!recipientEmail.trim()) {
      Alert.alert('Email Required', 'Please enter a recipient email address.');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    
    setSendingEmail(true);
    try {
      const response = await api.post('/email/dispute-report', {
        inspectionId,
        recipientEmail: recipientEmail.trim(),
      });
      
      setEmailModalVisible(false);
      setRecipientEmail('');
      
      Alert.alert(
        'Email Sent! ✓',
        `The dispute report has been sent to ${recipientEmail.trim()}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Email send error:', error);
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to send email. Please try again.';
      
      if (errorMessage.includes('not configured')) {
        Alert.alert(
          'Email Service Unavailable',
          'Server email is not configured yet. Please use "Share Text" and send manually.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Email Failed', errorMessage);
      }
    } finally {
      setSendingEmail(false);
    }
  };

  const handleShare = async () => {
    if (!inspection) return;

    const propertyName = inspection.unit?.property?.name || 'Property';
    const address = inspection.unit?.property?.address || '';
    const score = inspection.cleanliness_score?.toFixed(1) || 'N/A';
    const grade = inspection.airbnb_grade_analysis?.overall_grade || 'N/A';
    const isReady = inspection.airbnb_grade_analysis?.guest_ready;
    const cleanerName = inspection.creator?.name || 'Inspector';
    const issues = inspection.airbnb_grade_analysis?.improvements_needed || [];

    let reportText = `AIRBNB DISPUTE DOCUMENTATION REPORT\n${'='.repeat(40)}\nGenerated: ${formatDateTime(new Date())}\n\nPROPERTY: ${propertyName}${address ? `\nAddress: ${address}` : ''}\n\nINSPECTION DETAILS\n- Date: ${formatDateTime(inspection.created_at)}\n- Score: ${score}/10\n- Grade: ${grade}\n- Guest Ready: ${isReady ? 'Yes' : 'No'}\n- Inspector: ${cleanerName}\n- Photos: ${inspection.media?.length || 0}`;

    if (issues.length > 0) {
      reportText += `\n\nDOCUMENTED ISSUES:`;
      issues.forEach((issue, i) => {
        reportText += `\n${i + 1}. ${issue}`;
      });
    }

    reportText += `\n\n${'='.repeat(40)}\nGenerated by HostIQ`;

    try {
      await Share.share({
        message: reportText,
        title: `Dispute Report - ${propertyName}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!inspection) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Inspection not found</Text>
      </View>
    );
  }

  const propertyName = inspection.unit?.property?.name || 'Property';
  const address = inspection.unit?.property?.address || '';
  const unitName = inspection.unit?.name || '';
  const cleanerName = inspection.creator?.name || 'Inspector';
  const score = inspection.cleanliness_score;
  const grade = inspection.airbnb_grade_analysis?.overall_grade;
  const isReady = inspection.airbnb_grade_analysis?.guest_ready;
  const issues = inspection.airbnb_grade_analysis?.improvements_needed || [];
  const roomResults = inspection.photo_quality_analysis?.room_results || {};
  const allMedia = inspection.media || [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
            <Text style={styles.headerBadgeText}>Official Documentation</Text>
          </View>
          <Text style={styles.headerTitle}>Airbnb Dispute Report</Text>
          <Text style={styles.headerSubtitle}>
            Generated {formatDateTime(new Date())}
          </Text>
        </View>

        {/* Property Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>PROPERTY</Text>
          <Text style={styles.propertyName}>{propertyName}</Text>
          {address && <Text style={styles.propertyAddress}>{address}</Text>}
          {unitName && <Text style={styles.propertyUnit}>{unitName}</Text>}
        </View>

        {/* Inspection Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>INSPECTION SUMMARY</Text>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatDateTime(inspection.created_at)}</Text>
              <Text style={styles.summaryLabel}>Date & Time</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryGridItem}>
              <Text style={[styles.summaryGridValue, { color: COLORS.primary }]}>
                {score?.toFixed(1) || '—'}
              </Text>
              <Text style={styles.summaryGridLabel}>Score</Text>
            </View>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridValue}>{grade || '—'}</Text>
              <Text style={styles.summaryGridLabel}>Grade</Text>
            </View>
            <View style={styles.summaryGridItem}>
              <View style={[styles.statusIndicator, { 
                backgroundColor: isReady ? '#E8F9ED' : '#FFEBE9' 
              }]}>
                <Ionicons 
                  name={isReady ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={isReady ? COLORS.success : COLORS.error} 
                />
              </View>
              <Text style={styles.summaryGridLabel}>{isReady ? 'Ready' : 'Not Ready'}</Text>
            </View>
            <View style={styles.summaryGridItem}>
              <Text style={styles.summaryGridValue}>{allMedia.length}</Text>
              <Text style={styles.summaryGridLabel}>Photos</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.inspectorRow}>
            <Ionicons name="person-circle-outline" size={20} color={COLORS.text.tertiary} />
            <Text style={styles.inspectorText}>Inspected by {cleanerName}</Text>
          </View>
        </View>

        {/* Issues Card */}
        {issues.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>DOCUMENTED ISSUES</Text>
            {issues.map((issue, index) => (
              <View key={index} style={styles.issueRow}>
                <View style={styles.issueBullet}>
                  <Text style={styles.issueBulletText}>{index + 1}</Text>
                </View>
                <Text style={styles.issueText}>{issue}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Room Breakdown */}
        {Object.keys(roomResults).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>ROOM-BY-ROOM ANALYSIS</Text>
            {Object.entries(roomResults).map(([roomId, room], index) => {
              const roomMedia = allMedia.filter(m => m.room_id === roomId);
              const roomIssues = room.cleanliness_reasons || [];
              
              return (
                <View key={roomId} style={[styles.roomSection, index > 0 && styles.roomSectionBorder]}>
                  <View style={styles.roomHeader}>
                    <Text style={styles.roomName}>{room.room_name}</Text>
                    <View style={styles.roomScoreBadge}>
                      <Text style={[styles.roomScore, { 
                        color: room.cleanliness_score >= 7 ? COLORS.success : 
                               room.cleanliness_score >= 5 ? COLORS.warning : COLORS.error 
                      }]}>
                        {room.cleanliness_score}/10
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.roomMeta}>
                    <View style={[styles.roomStatusBadge, {
                      backgroundColor: room.guest_ready ? '#E8F9ED' : '#FFEBE9'
                    }]}>
                      <Text style={[styles.roomStatusText, {
                        color: room.guest_ready ? COLORS.success : COLORS.error
                      }]}>
                        {room.guest_ready ? '✓ Guest Ready' : '✗ Needs Attention'}
                      </Text>
                    </View>
                    <Text style={styles.roomPhotoCount}>{roomMedia.length} photos</Text>
                  </View>
                  
                  {roomIssues.length > 0 && (
                    <View style={styles.roomIssues}>
                      {roomIssues.map((issue, i) => (
                        <Text key={i} style={styles.roomIssueText}>• {issue}</Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Photo Evidence */}
        {allMedia.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>TIMESTAMPED PHOTO EVIDENCE</Text>
            <Text style={styles.photoDisclaimer}>
              All photos include embedded timestamps and metadata for verification.
            </Text>
            
            {allMedia.map((media, index) => {
              const imageKey = media.id || index;
              
              return (
                <View key={imageKey} style={styles.photoItem}>
                  <AuthenticatedImage 
                    media={media}
                    index={index}
                    inspection={inspection}
                    onError={(key) => setImageErrors(prev => ({ ...prev, [key]: true }))}
                  />
                  <View style={styles.photoInfo}>
                    <Text style={styles.photoNumber}>Photo #{index + 1}</Text>
                    {media.room_name && (
                      <Text style={styles.photoRoom}>{media.room_name}</Text>
                    )}
                    <Text style={styles.photoTimestamp}>
                      {formatTimestamp(media.created_at || inspection.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This documentation report was generated by HostIQ's AI-powered inspection system. 
            All timestamps are verified and photos are stored securely.
          </Text>
          <Text style={styles.footerNote}>
            Report ID: {inspectionId?.substring(0, 8)}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomBar}>
        {generating && (
          <View style={styles.generatingOverlay}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.generatingText}>Generating PDF...</Text>
          </View>
        )}
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.shareTextButton]} 
            onPress={handleShare} 
            activeOpacity={0.7}
            disabled={generating}
          >
            <Ionicons name="share-outline" size={18} color={COLORS.primary} />
            <Text style={styles.shareTextButtonText}>Share Text</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.sharePdfButton]} 
            onPress={handleSharePDF} 
            activeOpacity={0.7}
            disabled={generating}
          >
            <Ionicons name="document-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sharePdfButtonText}>Share PDF</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.emailButton]} 
            onPress={handleEmailPDF} 
            activeOpacity={0.7}
            disabled={generating}
          >
            <Ionicons name="mail-outline" size={18} color="#FFF" />
            <Text style={styles.emailButtonText}>Email PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Email Modal */}
      <Modal
        visible={emailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.emailModalContent}>
            <View style={styles.emailModalHeader}>
              <Text style={styles.emailModalTitle}>Send Dispute Report</Text>
              <TouchableOpacity 
                onPress={() => setEmailModalVisible(false)}
                style={styles.emailModalClose}
              >
                <Ionicons name="close" size={24} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.emailModalSubtitle}>
              Enter the recipient's email address to send the dispute report with PDF attachment.
            </Text>
            
            <View style={styles.emailInputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.text.tertiary} />
              <TextInput
                style={styles.emailInput}
                placeholder="recipient@example.com"
                placeholderTextColor={COLORS.text.tertiary}
                value={recipientEmail}
                onChangeText={setRecipientEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
              />
            </View>
            
            <View style={styles.emailModalButtons}>
              <TouchableOpacity
                style={styles.emailCancelButton}
                onPress={() => {
                  setEmailModalVisible(false);
                  setRecipientEmail('');
                }}
              >
                <Text style={styles.emailCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.emailSendButton, sendingEmail && styles.emailSendButtonDisabled]}
                onPress={sendEmailViaServer}
                disabled={sendingEmail}
              >
                {sendingEmail ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFF" />
                    <Text style={styles.emailSendButtonText}>Send Email</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text.tertiary,
  },
  
  // Header
  header: {
    backgroundColor: COLORS.card,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  
  // Card
  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  
  // Property
  propertyName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  propertyAddress: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  propertyUnit: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  
  // Summary
  summaryRow: {
    marginBottom: 12,
  },
  summaryItem: {},
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.separator,
    marginVertical: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryGridItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryGridValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  summaryGridLabel: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inspectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inspectorText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  
  // Issues
  issueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  issueBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFEBE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  issueBulletText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.error,
  },
  issueText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  
  // Room Section
  roomSection: {
    paddingVertical: 12,
  },
  roomSectionBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.separator,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  roomScoreBadge: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roomScore: {
    fontSize: 14,
    fontWeight: '700',
  },
  roomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  roomStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roomStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roomPhotoCount: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  roomIssues: {
    marginTop: 10,
    paddingLeft: 8,
  },
  roomIssueText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  
  // Photos
  photoDisclaimer: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  photoItem: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5F5F7',
  },
  photo: {
    width: 100,
    height: 80,
  },
  photoPlaceholder: {
    width: 100,
    height: 80,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  photoInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  photoNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  photoRoom: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  photoTimestamp: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  
  // Footer
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerNote: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    marginTop: 8,
  },
  
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.separator,
  },
  generatingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  generatingText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  shareTextButton: {
    backgroundColor: '#F5F5F7',
  },
  shareTextButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sharePdfButton: {
    backgroundColor: '#EBF4FF',
  },
  sharePdfButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emailButton: {
    backgroundColor: COLORS.primary,
  },
  emailButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Email Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  emailModalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  emailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emailModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  emailModalClose: {
    padding: 4,
  },
  emailModalSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
    marginBottom: 24,
  },
  emailInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    paddingVertical: 14,
  },
  emailModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  emailCancelButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  emailCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  emailSendButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emailSendButtonDisabled: {
    opacity: 0.7,
  },
  emailSendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
