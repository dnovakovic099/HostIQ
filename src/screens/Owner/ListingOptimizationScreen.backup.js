import React, { useState, useEffect } from 'react';
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
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import colors from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import typography from '../../theme/typography';
import shadows from '../../theme/shadows';

export default function ListingOptimizationScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Issues Section State
  const [issuesExpanded, setIssuesExpanded] = useState(true);
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  
  // Listing Optimization Section State
  const [optimizationExpanded, setOptimizationExpanded] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [airbnbUrl, setAirbnbUrl] = useState('');
  const [fetchingData, setFetchingData] = useState(false);
  const [listingData, setListingData] = useState(null);
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [analyzingWithAI, setAnalyzingWithAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiAnalysisDate, setAiAnalysisDate] = useState(null);
  const [aiFromCache, setAiFromCache] = useState(false);
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [imagesExpanded, setImagesExpanded] = useState(false);
  const [descriptionAIExpanded, setDescriptionAIExpanded] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchProperties();
    }, [])
  );

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const pmsResponse = await api.get('/issues/properties');
      const pmsProperties = pmsResponse.data.properties || [];
      setProperties(pmsProperties);
      
      // Auto-select first property if none selected
      if (!selectedProperty && pmsProperties.length > 0) {
        handleSelectProperty(pmsProperties[0]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      Alert.alert('Error', 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const fetchIssues = async (propertyId) => {
    if (!propertyId) return;
    
    try {
      setLoadingIssues(true);
      const response = await api.get(`/issues/${propertyId}`);
      setIssues(response.data.issues || []);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoadingIssues(false);
    }
  };

  const fetchAnalytics = async (propertyId) => {
    if (!propertyId) return;
    
    try {
      const response = await api.get(`/issues/${propertyId}/analytics?days=90`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const syncMessages = async () => {
    if (!selectedProperty) return;

    Alert.alert(
      'Sync Messages',
      'This will fetch and analyze guest messages from the last 90 days. This may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            try {
              setSyncing(true);
              const response = await api.post(`/issues/sync/${selectedProperty.id}`, {
                daysBack: 90
              });
              
              Alert.alert(
                'Sync Complete',
                `Processed: ${response.data.processed}\nFlagged: ${response.data.flagged}\nIssues Detected: ${response.data.issuesDetected}`,
                [{
                  text: 'OK',
                  onPress: () => {
                    fetchIssues(selectedProperty.id);
                    fetchAnalytics(selectedProperty.id);
                  }
                }]
              );
            } catch (error) {
              console.error('Error syncing messages:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to sync messages');
            } finally {
              setSyncing(false);
            }
          }
        }
      ]
    );
  };

  const getFilteredProperties = () => {
    if (!searchQuery.trim()) return properties;
    
    const query = searchQuery.toLowerCase();
    return properties.filter(property => {
      const name = (property.nickname || property.name || '').toLowerCase();
      const address = (property.address || '').toLowerCase();
      const city = (property.city || '').toLowerCase();
      return name.includes(query) || address.includes(query) || city.includes(query);
    });
  };

  const handleSelectProperty = async (property) => {
    setSelectedProperty(property);
    setPropertyPickerVisible(false);
    setSearchQuery('');
    
    // Reset states
    setIssues([]);
    setStats(null);
    setAnalytics(null);
    setListingData(null);
    setAiAnalysis(null);
    setAiAnalysisDate(null);
    setAiFromCache(false);
    
    // Fetch issues data
    fetchIssues(property.id);
    fetchAnalytics(property.id);
    
    // Try to load existing listing optimization data
    try {
      const response = await api.get(`/airbnb/property/${property.id}`);
      if (response.data.success) {
        setListingData(response.data.data);
        setAirbnbUrl(response.data.airbnb_url || '');
        
        // Try to load existing AI analysis
        try {
          const analysisResponse = await api.get(`/airbnb/ai-analysis/${property.id}`);
          if (analysisResponse.data.success) {
            setAiAnalysis(analysisResponse.data.analysis);
            setAiAnalysisDate(analysisResponse.data.analyzed_at);
            setAiFromCache(true);
          }
        } catch (analysisError) {
          if (analysisError.response?.status !== 404) {
            console.error('Error fetching AI analysis:', analysisError);
          }
        }
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // No existing listing data, user can add URL later
      } else {
        console.error('Error fetching listing data:', error);
      }
    }
  };

  const handleFetchListingData = async () => {
    if (!airbnbUrl.trim()) {
      Alert.alert('Error', 'Please enter an Airbnb listing URL');
      return;
    }

    // Basic URL validation
    if (!airbnbUrl.includes('airbnb.com')) {
      Alert.alert('Error', 'Please enter a valid Airbnb URL');
      return;
    }

    try {
      setFetchingData(true);
      setShowUrlModal(false);

      const response = await api.post(`/airbnb/property/${selectedProperty.id}/fetch`, {
        airbnb_url: airbnbUrl
      });

      if (response.data.success) {
        setListingData(response.data.data);
        Alert.alert('Success', 'Listing data fetched successfully!');
      }
    } catch (error) {
      console.error('Error fetching listing data:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to fetch listing data. Please try again.'
      );
    } finally {
      setFetchingData(false);
    }
  };

  const handleRefreshData = () => {
    setShowUrlModal(true);
  };

  const handleAnalyzeWithAI = async (forceRefresh = false) => {
    if (!listingData) {
      Alert.alert('No Data', 'Please fetch listing data first before analyzing');
      return;
    }

    setAnalyzingWithAI(true);
    setAiAnalysis(null);

    try {
      // If forceRefresh, fetch fresh listing data from HasData API first
      if (forceRefresh) {
        if (!airbnbUrl) {
          Alert.alert('Error', 'No Airbnb URL found for this property');
          setAnalyzingWithAI(false);
          return;
        }

        console.log('🔄 Re-fetching listing data from HasData API...');
        setFetchingData(true);
        
        const fetchResponse = await api.post(`/airbnb/property/${selectedProperty.id}/fetch`, {
          airbnb_url: airbnbUrl
        });

        if (fetchResponse.data.success) {
          setListingData(fetchResponse.data.data);
          console.log('✅ Fresh listing data fetched successfully');
        }
        
        setFetchingData(false);
      }

      // Call AI Analysis API (prompt is built server-side)
      const response = await api.post('/airbnb/analyze-listing', {
        property_id: selectedProperty.id,
        forceRefresh: forceRefresh
      });

      const analysis = response.data.analysis;
      const fromCache = response.data.from_cache;
      const analyzedAt = response.data.analyzed_at;
      
      console.log('AI Analysis received:', JSON.stringify(analysis, null, 2));
      console.log('From cache:', fromCache, 'Analyzed at:', analyzedAt);
      
      setAiAnalysis(analysis);
      setAiAnalysisDate(analyzedAt);
      setAiFromCache(fromCache);
      
      Alert.alert(
        'Success',
        forceRefresh ? 'Fresh data fetched and analyzed!' : 'AI analysis completed and saved!'
      );
    } catch (error) {
      console.error('AI Analysis error:', error);
      Alert.alert(
        'Analysis Failed',
        error.response?.data?.error || 'Failed to analyze listing with AI. Please try again.'
      );
    } finally {
      setAnalyzingWithAI(false);
      setFetchingData(false);
    }
  };

  const renderPropertySelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitleCompact}>Select Property</Text>
      {properties && Array.isArray(properties) && properties.length > 0 ? (
        properties.map((property) => {
          const isSelected = selectedProperty?.id === property.id;
          return (
            <TouchableOpacity
              key={property.id}
              style={[
                styles.propertyCardCompact,
                isSelected && styles.propertyCardCompactSelected
              ]}
              onPress={() => handleSelectProperty(property)}
              activeOpacity={0.7}
            >
              <View style={styles.propertyInfo}>
                <Text style={[styles.propertyNameCompact, isSelected && styles.propertyNameSelected]}>
                  {property.name}
                </Text>
                <Text style={styles.propertyAddressCompact} numberOfLines={1}>
                  {property.address}
                </Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
            )}
          </TouchableOpacity>
        );
      })
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No properties found. Please add a property first.</Text>
        </View>
      )}
      
      {/* Inline Analyze Button */}
      {selectedProperty && listingData && (
        <View style={styles.analyzeContainer}>
          {aiAnalysisDate && (
            <Text style={styles.analysisDateText}>
              Last analyzed: {new Date(aiAnalysisDate).toLocaleDateString()}
            </Text>
          )}
          <TouchableOpacity
            style={styles.analyzeButtonInline}
            onPress={() => handleAnalyzeWithAI(aiAnalysis ? true : false)}
            disabled={analyzingWithAI}
            activeOpacity={0.7}
          >
            {analyzingWithAI ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.analyzeButtonText}>Analyzing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="analytics" size={16} color="#FFFFFF" />
                <Text style={styles.analyzeButtonText}>
                  {aiAnalysis ? 'Re-Analyze Data' : 'Analyze with AI'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderAIAnalyzeButton = () => {
    if (!selectedProperty || !listingData) return null;

    return (
      <View style={styles.analyzeSection}>
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={handleAnalyzeWithAI}
          disabled={analyzingWithAI}
          activeOpacity={0.7}
        >
          {analyzingWithAI ? (
            <>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.analyzeButtonText}>Analyzing...</Text>
            </>
          ) : (
            <>
              <Ionicons name="analytics" size={16} color="#FFFFFF" />
              <Text style={styles.analyzeButtonText}>Analyze with AI</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderAIAnalysisResults = () => {
    if (!aiAnalysis) return null;

    const renderScoreBar = (score, maxScore = 5) => {
      const percentage = (score / maxScore) * 100;
      const color = score >= 4 ? colors.accent.success : score >= 3 ? colors.accent.warning : colors.accent.error;
      
      return (
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreNumber}>{score}/{maxScore}</Text>
          <View style={styles.scoreBarContainer}>
            <View style={[styles.scoreBar, { width: `${percentage}%`, backgroundColor: color }]} />
          </View>
        </View>
      );
    };

    return (
      <View style={styles.aiResultsSection}>
        {/* Title Analysis */}
        <View style={styles.analysisCard}>
          <TouchableOpacity
            style={styles.analysisHeader}
            onPress={() => setTitleExpanded(!titleExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.analysisHeaderLeft}>
              <Ionicons name="text" size={20} color={colors.primary.main} />
              <Text style={styles.analysisHeaderTitle}>Title Optimization</Text>
            </View>
            <Ionicons 
              name={titleExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colors.text.secondary} 
            />
          </TouchableOpacity>

          {titleExpanded && aiAnalysis.title && (
            <View style={styles.analysisContent}>
              <View style={styles.scoresRow}>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Clarity</Text>
                  {renderScoreBar(aiAnalysis.title.scores.clarity)}
                </View>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Amenities-Driven</Text>
                  {renderScoreBar(aiAnalysis.title.scores.amenities_driven)}
                </View>
              </View>

              {aiAnalysis.title.issues && aiAnalysis.title.issues.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Issues Found:</Text>
                  {aiAnalysis.title.issues.map((issue, idx) => (
                    <View key={idx} style={styles.bulletPoint}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.bulletText}>{issue}</Text>
                    </View>
                  ))}
                </View>
              )}

              {aiAnalysis.title.recommended_titles && aiAnalysis.title.recommended_titles.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Recommended Titles:</Text>
                  {aiAnalysis.title.recommended_titles.map((titleObj, idx) => (
                    <TouchableOpacity key={idx} style={styles.recommendationItem}>
                      <Text style={styles.recommendationNumber}>{idx + 1}</Text>
                      <Text style={styles.recommendationText}>{typeof titleObj === 'string' ? titleObj : titleObj.text}</Text>
                      {titleObj.uses_symbols && (
                        <View style={styles.titleBadge}>
                          <Text style={styles.titleBadgeText}>Symbols</Text>
                        </View>
                      )}
                      {titleObj.includes_capacity && (
                        <View style={styles.titleBadge}>
                          <Text style={styles.titleBadgeText}>+Cap</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Photo Analysis */}
        <View style={styles.analysisCard}>
          <TouchableOpacity
            style={styles.analysisHeader}
            onPress={() => setImagesExpanded(!imagesExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.analysisHeaderLeft}>
              <Ionicons name="images" size={20} color={colors.primary.main} />
              <Text style={styles.analysisHeaderTitle}>Photo Gallery</Text>
            </View>
            <Ionicons 
              name={imagesExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colors.text.secondary} 
            />
          </TouchableOpacity>

          {imagesExpanded && aiAnalysis.photos && (
            <View style={styles.analysisContent}>
              {aiAnalysis.photos.scores && (
                <View style={styles.scoresGrid}>
                  {aiAnalysis.photos.scores.hero_strength !== undefined && (
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Hero Strength</Text>
                      {renderScoreBar(aiAnalysis.photos.scores.hero_strength)}
                    </View>
                  )}
                  {aiAnalysis.photos.scores.sequence_logic !== undefined && (
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Sequence Logic</Text>
                      {renderScoreBar(aiAnalysis.photos.scores.sequence_logic)}
                    </View>
                  )}
                  {aiAnalysis.photos.scores.selling_power !== undefined && (
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Selling Power</Text>
                      {renderScoreBar(aiAnalysis.photos.scores.selling_power)}
                    </View>
                  )}
                  {aiAnalysis.photos.scores.image_quality !== undefined && (
                    <View style={styles.scoreItem}>
                      <Text style={styles.scoreLabel}>Image Quality</Text>
                      {renderScoreBar(aiAnalysis.photos.scores.image_quality)}
                    </View>
                  )}
                </View>
              )}

              {aiAnalysis.photos.recommended_order && aiAnalysis.photos.recommended_order.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Recommended Photo Order:</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.photoScrollView}
                  >
                    {aiAnalysis.photos.recommended_order.map((photoObj, idx) => {
                      const property = listingData?.property || listingData;
                      const photos = property?.photos || [];
                      const photoUrl = photos[photoObj.index_from_input];
                      
                      return (
                        <View key={idx} style={styles.photoOrderCard}>
                          <View style={styles.photoOrderBadge}>
                            <Text style={styles.photoOrderBadgeText}>{idx + 1}</Text>
                          </View>
                          {photoUrl ? (
                            <Image 
                              source={{ uri: photoUrl }} 
                              style={styles.photoOrderImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.photoOrderPlaceholder}>
                              <Ionicons name="image-outline" size={40} color="#94A3B8" />
                            </View>
                          )}
                          {photoObj.caption && (
                            <View style={styles.photoOrderCaptionContainer}>
                              <Text style={styles.photoOrderCaption} numberOfLines={2}>
                                {photoObj.caption}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {aiAnalysis.photos.improvement_notes && aiAnalysis.photos.improvement_notes.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Improvement Notes:</Text>
                  {aiAnalysis.photos.improvement_notes.map((note, idx) => (
                    <View key={idx} style={styles.bulletPoint}>
                      <Text style={styles.bullet}>📸</Text>
                      <Text style={styles.bulletText}>{note}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Description Analysis */}
        <View style={styles.analysisCard}>
          <TouchableOpacity
            style={styles.analysisHeader}
            onPress={() => setDescriptionAIExpanded(!descriptionAIExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.analysisHeaderLeft}>
              <Ionicons name="document-text" size={20} color={colors.primary.main} />
              <Text style={styles.analysisHeaderTitle}>Description Optimization</Text>
            </View>
            <Ionicons 
              name={descriptionAIExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colors.text.secondary} 
            />
          </TouchableOpacity>

          {descriptionAIExpanded && aiAnalysis.description && (
            <View style={styles.analysisContent}>
              <View style={styles.scoresGrid}>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Scannability</Text>
                  {renderScoreBar(aiAnalysis.description.scores.scannability)}
                </View>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Emotional Pull</Text>
                  {renderScoreBar(aiAnalysis.description.scores.emotional_pull_without_adjectives)}
                </View>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Feature→Benefit</Text>
                  {renderScoreBar(aiAnalysis.description.scores.feature_to_benefit)}
                </View>
              </View>

              {aiAnalysis.description.filler_to_remove && aiAnalysis.description.filler_to_remove.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Remove or Reduce:</Text>
                  {aiAnalysis.description.filler_to_remove.map((item, idx) => (
                    <View key={idx} style={styles.bulletPoint}>
                      <Text style={styles.bullet}>🗑️</Text>
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {aiAnalysis.description.missing_elements && aiAnalysis.description.missing_elements.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Missing or Weak Elements:</Text>
                  {aiAnalysis.description.missing_elements.map((item, idx) => (
                    <View key={idx} style={styles.bulletPoint}>
                      <Text style={styles.bullet}>➕</Text>
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {aiAnalysis.description.improvement_hints && aiAnalysis.description.improvement_hints.length > 0 && (
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>Improvement Hints:</Text>
                  {aiAnalysis.description.improvement_hints.map((hint, idx) => (
                    <View key={idx} style={styles.bulletPoint}>
                      <Text style={styles.bullet}>💡</Text>
                      <Text style={styles.bulletText}>{hint}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderListingData = () => {
    if (!listingData) return null;

    // Extract from the actual API response structure
    const property = listingData.property || listingData;
    const {
      title,
      rating,
      reviews,
      description,
      amenities,
      host,
      guestCapacity,
      address,
      photos,
      safetyAndPropertyInfo
    } = property;

    // Filter available amenities
    const availableAmenities = amenities?.filter(a => a.available) || [];

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Listing Information</Text>
          <TouchableOpacity onPress={handleRefreshData} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color={colors.primary.main} />
            <Text style={styles.refreshText}>Update</Text>
          </TouchableOpacity>
        </View>

        {/* Main Info Card */}
        <View style={styles.dataCard}>
          {title && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Property Name</Text>
              <Text style={styles.value} numberOfLines={2}>{title}</Text>
            </View>
          )}

          {rating && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Rating</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFB800" />
                <Text style={styles.valueWithIcon}>
                  {rating} {reviews && `(${reviews} reviews)`}
                </Text>
              </View>
            </View>
          )}

          {guestCapacity && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Guest Capacity</Text>
              <View style={styles.capacityContainer}>
                <Ionicons name="people" size={16} color={colors.primary.main} />
                <Text style={styles.valueWithIcon}>{guestCapacity} guests</Text>
              </View>
            </View>
          )}

          {address && (
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.label}>Location</Text>
              <Text style={styles.value} numberOfLines={2}>{address}</Text>
            </View>
          )}
        </View>

        {/* Host Info Card */}
        {host && (
          <View style={styles.dataCard}>
            <Text style={styles.cardTitle}>Host Information</Text>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Host Name</Text>
              <Text style={styles.value}>
                {host.name}
                {host.isSuperhost && ' (Superhost)'}
              </Text>
            </View>

            {host.yearsHosting && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Hosting Since</Text>
                <Text style={styles.value}>{host.yearsHosting} years</Text>
              </View>
            )}

            {host.rating && (
              <View style={[styles.infoRow, styles.infoRowLast]}>
                <Text style={styles.label}>Host Rating</Text>
                <Text style={styles.value}>
                  {host.rating} {host.reviews && `(${host.reviews} reviews)`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Photos Gallery */}
        {photos && photos.length > 0 && (
          <View style={styles.dataCard}>
            <View style={styles.photosHeader}>
              <Ionicons name="images-outline" size={20} color={colors.primary.main} />
              <Text style={styles.sectionSubtitle}>
                Property Photos ({photos.length})
              </Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.photosScroll}
              contentContainerStyle={styles.photosContent}
            >
              {photos.map((photoUrl, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.photoContainer}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.photo}
                    resizeMode="cover"
                    onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                  />
                  <View style={styles.photoIndexBadge}>
                    <Text style={styles.photoIndexText}>{index + 1}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Description Card */}
        {description && (
          <View style={styles.dataCard}>
            <TouchableOpacity 
              style={styles.collapsibleHeader}
              onPress={() => setDescriptionExpanded(!descriptionExpanded)}
            >
              <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Description</Text>
              <Ionicons 
                name={descriptionExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.text.secondary} 
              />
            </TouchableOpacity>
            {descriptionExpanded && (
              <Text style={[styles.description, { marginTop: spacing.md }]}>
                {description.replace(/<br\s*\/?>/g, '\n').replace(/<\/?b>/g, '')}
              </Text>
            )}
          </View>
        )}

        {/* Safety Info Card */}
        {safetyAndPropertyInfo && safetyAndPropertyInfo.length > 0 && (
          <View style={styles.dataCard}>
            <Text style={styles.sectionSubtitle}>Safety & Property Info</Text>
            <View style={styles.safetyList}>
              {safetyAndPropertyInfo.map((item, index) => (
                <View key={index} style={styles.safetyItem}>
                  <Ionicons 
                    name={item.type.includes('NO_') ? 'alert-circle' : 'shield-checkmark'} 
                    size={16} 
                    color={item.type.includes('NO_') ? colors.accent.warning : colors.accent.info} 
                  />
                  <View style={styles.safetyTextContainer}>
                    <Text style={styles.safetyTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={styles.safetyDescription}>{item.description}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Collapsible Amenities Section */}
        {availableAmenities.length > 0 && (
          <View style={styles.dataCard}>
            <TouchableOpacity 
              style={styles.amenitiesHeader}
              onPress={() => setAmenitiesExpanded(!amenitiesExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.amenitiesHeaderLeft}>
                <Ionicons name="list-outline" size={20} color={colors.primary.main} />
                <Text style={styles.sectionSubtitle}>
                  Amenities ({availableAmenities.length})
                </Text>
              </View>
              <Ionicons 
                name={amenitiesExpanded ? "chevron-up" : "chevron-down"} 
                size={24} 
                color={colors.text.secondary} 
              />
            </TouchableOpacity>
            
            {amenitiesExpanded && (
              <View style={styles.amenitiesList}>
                {availableAmenities.map((amenity, index) => (
                  <View key={index} style={styles.amenityItem}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.accent.success} />
                    <Text style={styles.amenityText}>{amenity.title}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderUrlModal = () => (
    <Modal
      visible={showUrlModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowUrlModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enter Airbnb Listing URL</Text>
            <TouchableOpacity onPress={() => setShowUrlModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDescription}>
            Enter the full URL of your Airbnb listing to fetch optimization insights.
          </Text>

          <TextInput
            style={styles.urlInput}
            value={airbnbUrl}
            onChangeText={setAirbnbUrl}
            placeholder="https://www.airbnb.com/rooms/..."
            placeholderTextColor={colors.text.secondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowUrlModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fetchButton}
              onPress={handleFetchListingData}
            >
              <Text style={styles.fetchButtonText}>Fetch Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingText}>Loading properties...</Text>
      </View>
    );
  }

  if (properties.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="business-outline" size={64} color={colors.primary.main} />
        </View>
        <Text style={styles.emptyTitle}>No Properties Yet</Text>
        <Text style={styles.emptyText}>
          Create your first property to start getting Airbnb listing insights and optimization recommendations.
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateProperty')}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create Property</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderPropertySelector()}
        
        {fetchingData && (
          <View style={styles.fetchingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={styles.fetchingText}>Fetching listing data...</Text>
            <Text style={styles.fetchingSubtext}>This may take a few moments</Text>
          </View>
        )}

        {renderAIAnalysisResults()}

        {!fetchingData && selectedProperty && renderListingData()}

        {!fetchingData && selectedProperty && !listingData && (
          <View style={styles.noDataContainer}>
            <View style={styles.noDataIconCircle}>
              <Ionicons name="information-circle-outline" size={64} color={colors.primary.main} />
            </View>
            <Text style={styles.noDataTitle}>No Listing Data</Text>
            <Text style={styles.noDataText}>
              Add your Airbnb listing URL to fetch insights and optimization recommendations.
            </Text>
          </View>
        )}
      </ScrollView>

      {renderUrlModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: '#F8F9FA',
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  createButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.medium,
  },
  createButtonText: {
    ...typography.buttonText,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  refreshText: {
    ...typography.body,
    color: colors.primary.main,
  },
  propertyCard: {
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.medium,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  propertyCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '08',
    ...shadows.large,
  },
  propertyCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  propertyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyIconContainerSelected: {
    backgroundColor: colors.primary.main + '15',
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    ...typography.h4,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  propertyNameSelected: {
    color: colors.primary.main,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  propertyAddress: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
  selectedBadge: {
    marginLeft: spacing.sm,
  },
  dataCard: {
    backgroundColor: colors.background.card,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    fontSize: 15,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: spacing.md,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  label: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 14,
    minWidth: 100,
    paddingTop: 2,
  },
  value: {
    ...typography.body,
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  capacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueWithIcon: {
    ...typography.body,
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  description: {
    ...typography.body,
    color: colors.text.primary,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  photosSection: {
    marginBottom: spacing.md,
  },
  photosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  photosScroll: {
    marginTop: spacing.sm,
  },
  photosContent: {
    paddingRight: spacing.md,
  },
  photoContainer: {
    marginRight: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    ...shadows.medium,
    position: 'relative',
  },
  photo: {
    width: 220,
    height: 165,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
  },
  photoIndexBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  photoIndexText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  amenitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  amenitiesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  amenitiesList: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  amenityText: {
    ...typography.body,
    color: colors.text.primary,
  },
  sectionSubtitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  safetyList: {
    marginTop: spacing.sm,
  },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  safetyTextContainer: {
    flex: 1,
  },
  safetyTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  safetyDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.main + '10',
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  infoText: {
    ...typography.body,
    color: colors.primary.main,
  },
  fetchingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl * 2,
  },
  fetchingText: {
    ...typography.h4,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  fetchingSubtext: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl * 2,
  },
  noDataIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary.main + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  noDataTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  noDataText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.background.card,
    borderRadius: 20,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 500,
    ...shadows.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  modalDescription: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  urlInput: {
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: spacing.lg,
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.xl,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.buttonText,
    color: colors.text.primary,
    fontSize: 16,
  },
  fetchButton: {
    flex: 1,
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.small,
  },
  fetchButtonText: {
    ...typography.buttonText,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Compact Property Selector Styles
  sectionTitleCompact: {
    ...typography.h4,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
    fontSize: 16,
  },
  analyzeContainer: {
    marginTop: spacing.md,
  },
  analysisDateText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  analyzeButtonInline: {
    flexDirection: 'row',
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.small,
  },
  propertyCardCompact: {
    backgroundColor: colors.background.card,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.small,
  },
  propertyCardCompactSelected: {
    borderWidth: 2,
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '05',
  },
  propertyNameCompact: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  propertyAddressCompact: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  // AI Results Section Styles
  aiResultsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  // AI Analyze Button Styles (deprecated - now inline)
  analyzeSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  analyzeButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...shadows.small,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  // AI Analysis Results Styles
  analysisCard: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.small,
    overflow: 'hidden',
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
  },
  analysisHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  analysisHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  analysisContent: {
    padding: spacing.md,
  },
  scoresRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  scoresGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  scoreItem: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoreNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    minWidth: 32,
  },
  scoreBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    borderRadius: 4,
  },
  subsection: {
    marginTop: spacing.md,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  bullet: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.xs,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  recommendationNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.main,
    minWidth: 20,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  titleBadge: {
    backgroundColor: colors.primary.main + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  titleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary.main,
  },
  photoScrollView: {
    marginTop: spacing.sm,
  },
  photoOrderCard: {
    width: 200,
    marginRight: spacing.sm,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  photoOrderBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.primary.main,
    borderRadius: 16,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...shadows.md,
  },
  photoOrderBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  photoOrderImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.background.secondary,
  },
  photoOrderPlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOrderCaptionContainer: {
    padding: spacing.sm,
    backgroundColor: colors.background.primary,
  },
  photoOrderCaption: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  highlightBox: {
    backgroundColor: colors.primary.main + '10',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.main,
  },
  highlightTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.main,
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  rewriteBox: {
    backgroundColor: colors.background.primary,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  rewriteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  rewriteText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 21,
  },
});

