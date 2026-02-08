import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Linking,
  Animated,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import client from '../../api/client';
import { useSubscription } from '../../hooks/useSubscription';

const { width } = Dimensions.get('window');

// Subscription Upsell Screen Component
const SubscriptionUpsellScreen = ({ onSubscribe }) => {
  return (
    <ScrollView style={styles.upsellContainer} contentContainerStyle={styles.upsellContent}>
      <LinearGradient
        colors={['#0A1628', '#1A2F4E', '#0A1628']}
        style={styles.upsellHeader}
      >
        <View style={styles.upsellIconContainer}>
          <Ionicons name="analytics" size={48} color="#215EEA" />
        </View>
        <Text style={styles.upsellTitle}>AI-Powered Pricing</Text>
        <Text style={styles.upsellSubtitle}>
          Maximize your rental income with intelligent market analysis
        </Text>
      </LinearGradient>

      <View style={styles.upsellFeaturesCard}>
        <Text style={styles.featuresTitle}>What You Get</Text>
        
        <View style={styles.featureRow}>
          <View style={styles.featureIcon}>
            <Ionicons name="trending-up" size={20} color="#215EEA" />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Real-Time Market Analysis</Text>
            <Text style={styles.featureDesc}>See exactly what competitors are charging for similar properties</Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <View style={styles.featureIcon}>
            <Ionicons name="flash" size={20} color="#F59E0B" />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>AI Price Recommendations</Text>
            <Text style={styles.featureDesc}>Get optimal pricing suggestions for every available date</Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <View style={styles.featureIcon}>
            <Ionicons name="calendar" size={20} color="#33D39C" />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Availability-Based Pricing</Text>
            <Text style={styles.featureDesc}>Dynamic recommendations based on your open dates</Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <View style={styles.featureIcon}>
            <Ionicons name="eye" size={20} color="#8B5CF6" />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Visibility Insights</Text>
            <Text style={styles.featureDesc}>Know if your listing appears on the first page of search</Text>
          </View>
        </View>
      </View>

      <View style={styles.pricingCard}>
        <View style={styles.pricingHeader}>
          <Text style={styles.pricingLabel}>PRICING PRO</Text>
          <View style={styles.pricingBadge}>
            <Text style={styles.pricingBadgeText}>MOST POPULAR</Text>
          </View>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceAmount}>$0.99</Text>
          <Text style={styles.pricePeriod}>/month</Text>
        </View>
        <Text style={styles.priceSavings}>Save 40% with annual billing</Text>
        
        <TouchableOpacity style={styles.subscribeButton} onPress={onSubscribe}>
          <Text style={styles.subscribeButtonText}>Start 7-Day Free Trial</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.trialNote}>No credit card required • Cancel anytime</Text>
      </View>

      <View style={styles.testimonialsSection}>
        <Text style={styles.testimonialsTitle}>Trusted by Property Owners</Text>
        <View style={styles.testimonialCard}>
          <View style={styles.testimonialStars}>
            {[1,2,3,4,5].map(i => (
              <Ionicons key={i} name="star" size={14} color="#F59E0B" />
            ))}
          </View>
          <Text style={styles.testimonialText}>
            "The AI pricing suggestions helped me increase my nightly rate by 23% while maintaining high occupancy."
          </Text>
          <Text style={styles.testimonialAuthor}>— Sarah M., Chicago</Text>
        </View>
      </View>
    </ScrollView>
  );
};

// AI Loading Screen Component - Clean minimal design with logo
const AILoadingScreen = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingSteps = [
    'Analyzing market data',
    'Scanning competitors',
    'Processing availability',
    'Generating insights',
  ];

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Gentle pulse for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Dot animation
    Animated.loop(
      Animated.timing(dotAnim, {
        toValue: 3,
        duration: 1500,
        useNativeDriver: false,
      })
    ).start();

    // Progress through steps
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % loadingSteps.length);
    }, 2500);

    return () => clearInterval(stepInterval);
  }, []);

  return (
    <Animated.View style={[styles.aiLoadingContainer, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#0A1628', '#0F1B2E', '#1A2332']}
        style={styles.aiLoadingScreen}
      >
        {/* Logo with glow */}
        <Animated.View
          style={[
            styles.aiLogoContainer,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
              transform: [{
                scale: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.98, 1.02],
                }),
              }],
            },
          ]}
        >
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.aiLoadingLogo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Status text */}
        <Text style={styles.aiLoadingTitle}>{loadingSteps[loadingStep]}</Text>
        <Text style={styles.aiLoadingSubtitle}>This may take a moment</Text>

        {/* Loading dots */}
        <View style={styles.aiDotsContainer}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.aiDot,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: i === 0 ? [0.4, 1, 0.4] : i === 1 ? [0.6, 0.4, 1] : [1, 0.6, 0.4],
                  }),
                },
              ]}
            />
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

export default function PricingScreen() {
  // Subscription hook
  const {
    isInitialized: subscriptionInitialized,
    isLoading: subscriptionLoading,
    product,
    subscriptionStatus,
    purchaseSubscription,
    refreshSubscriptionStatus,
    isActive: hasActiveSubscription,
  } = useSubscription();

  // Subscription state
  const [hasSubscription, setHasSubscription] = useState(null); // null = loading, true/false = checked
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  
  // Property selection
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // URL and analysis
  const [url, setUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [datesData, setDatesData] = useState(null);
  const [loadingDates, setLoadingDates] = useState(false);
  const [visibleCounts, setVisibleCounts] = useState({}); // Track how many to show per chunk
  const [aiSuggestions, setAiSuggestions] = useState({}); // Track AI suggestions per chunk
  const [loadingAI, setLoadingAI] = useState({}); // Track loading state per chunk
  const [expandedReasoning, setExpandedReasoning] = useState({}); // Track expanded reasoning per chunk

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        // Use subscription status from hook if available
        if (hasActiveSubscription) {
          setHasSubscription(true);
        } else if (subscriptionStatus) {
          // Check subscription status from API
          const isActive = subscriptionStatus?.subscription?.is_active || false;
          setHasSubscription(isActive);
        } else {
          // Fallback: Check legacy subscription API
          try {
            const response = await client.get('/user/subscription');
            const hasPricing = response.data?.features?.includes('pricing') || 
                              response.data?.plan === 'pro' ||
                              response.data?.plan === 'premium';
            setHasSubscription(hasPricing);
          } catch (error) {
            console.log('Subscription check not available, showing upsell');
            setHasSubscription(false);
          }
        }
      } catch (error) {
        console.log('Subscription check error:', error);
        setHasSubscription(false);
      } finally {
        setCheckingSubscription(false);
      }
    };

    checkSubscription();
  }, [hasActiveSubscription, subscriptionStatus]);

  const handleSubscribe = async () => {
    if (!subscriptionInitialized) {
      Alert.alert(
        'Unavailable',
        'In-app purchases are not available on this device. Please ensure you are using a physical device with proper setup.'
      );
      return;
    }

    try {
      // Show confirmation with product price if available
      const priceText = product?.localizedPrice 
        ? ` for ${product.localizedPrice}/month`
        : ' for $0.99/month';
      
      const platformText = Platform.OS === 'ios' ? 'App Store' : 'Google Play';
      
      Alert.alert(
        'Subscribe to Pricing Pro',
        `Start your 7-day free trial${priceText}?\n\nAfter the trial, your subscription will automatically renew through ${platformText}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Free Trial',
            onPress: async () => {
              try {
                const result = await purchaseSubscription();
                
                if (result) {
                  // Purchase was initiated successfully
                  // The purchaseUpdatedListener will handle verification
                  // Refresh subscription status after a short delay
                  setTimeout(async () => {
                    await refreshSubscriptionStatus();
                    setHasSubscription(true);
                    Alert.alert(
                      'Success!',
                      'Your 7-day free trial has started. Your subscription will activate after the trial period.'
                    );
                  }, 2000);
                }
              } catch (error) {
                console.error('Purchase error:', error);
                // Error is already handled in the hook/service
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Subscribe error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to start subscription purchase. Please try again.'
      );
    }
  };
  
  // Refetch properties when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProperties();
    }, [])
  );

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      
      let allProperties = [];
      
      // Fetch PMS properties (Hostify)
      try {
        const pmsResponse = await client.get('/issues/properties');
        const pmsProperties = (pmsResponse.data.properties || []).map(prop => ({
          ...prop,
          isPMSProperty: true,
          displayName: prop.nickname || prop.name || prop.address || 'Unnamed Property'
        }));
        // Debug: Log first few properties with their airbnb_listing data
        console.log('[PricingScreen] Fetched properties with airbnb_listing:');
        pmsProperties.slice(0, 3).forEach(p => {
          console.log(`  ${p.nickname}: airbnb_listing =`, p.airbnb_listing);
        });
        allProperties = [...pmsProperties];
      } catch (pmsError) {
        console.log('No PMS properties:', pmsError.message);
      }
      
      // Fetch manual properties
      try {
        const response = await client.get('/owner/properties');
        const manualProperties = (response.data.manualProperties || response.data || []).map(prop => ({
          ...prop,
          isPMSProperty: false,
          displayName: prop.name || prop.address || 'Unnamed Property'
        }));
        allProperties = [...allProperties, ...manualProperties];
      } catch (manualError) {
        console.log('No manual properties:', manualError.message);
      }
      
      setProperties(allProperties);
      
      // Auto-select first property if available
      if (allProperties.length > 0 && !selectedProperty) {
        handleSelectProperty(allProperties[0]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      Alert.alert('Error', 'Failed to load properties');
    } finally {
      setLoadingProperties(false);
    }
  };
  
  const handleSelectProperty = async (property) => {
    setSelectedProperty(property);
    setShowPropertyPicker(false);
    
    // IMPORTANT: Reset ALL data immediately when switching properties
    setDatesData(null);
    setAnalysisData(null);
    setVisibleCounts({});
    setAiSuggestions({});      // Reset AI suggestions!
    setLoadingAI({});          // Reset loading states
    setExpandedReasoning({});  // Reset expanded states
    
    // Debug: Log property selection
    console.log('[PricingScreen] Selected property:', property.nickname || property.name);
    console.log('[PricingScreen] airbnb_listing:', property.airbnb_listing);
    
    // Check if property has Airbnb URL
    if (property.airbnb_listing?.airbnb_url) {
      const airbnbUrl = property.airbnb_listing.airbnb_url;
      setUrl(airbnbUrl);
      setShowUrlInput(false);
      
      // Try to load existing analysis data from database
      setLoading(true);
      try {
        const datesResponse = await client.post('/pricing/analyze-available-dates', { 
          url: airbnbUrl,
          propertyId: property.id,
          refresh: false  // Load from database
        });
        
        // Check if we got data (not a job)
        if (datesResponse.data.success && datesResponse.data.data && datesResponse.data.data.chunks) {
          setDatesData(datesResponse.data.data);
          setIsCollapsed(true);
          
          // Initialize visible counts to 5 for each chunk
          const initialCounts = {};
          datesResponse.data.data.chunks.forEach((_, index) => {
            initialCounts[index] = 5;
          });
          setVisibleCounts(initialCounts);
        } else {
          // No cached data or job started - show analyze button
          setDatesData(null);
          setIsCollapsed(true);
        }
      } catch (error) {
        console.log('No cached data available, user can analyze manually');
        setDatesData(null);
        setIsCollapsed(true);
      } finally {
        setLoading(false);
      }
    } else {
      // No Airbnb URL - show input
      setUrl('');
      setShowUrlInput(true);
      setDatesData(null);
    }
    
    setAnalysisData(null);
  };
  
  const getFilteredProperties = () => {
    if (!searchQuery.trim()) {
      return properties;
    }
    
    const query = searchQuery.toLowerCase();
    return properties.filter(property => {
      const name = (property.displayName || '').toLowerCase();
      const address = (property.address || '').toLowerCase();
      const city = (property.city || '').toLowerCase();
      return name.includes(query) || address.includes(query) || city.includes(query);
    });
  };

  const handleAnalyze = async (forceRefresh = false) => {
    if (!url) {
      Alert.alert('Error', 'Please enter a valid Airbnb URL');
      return;
    }

    if (!url.includes('airbnb.com')) {
      Alert.alert('Error', 'Please enter a valid Airbnb link (e.g., airbnb.com/rooms/...)');
      return;
    }

    setLoading(true);
    if (forceRefresh) {
      setDatesData(null);
    }
    setIsCollapsed(false);
    setVisibleCounts({}); // Reset pagination

    try {
      // Start the analysis (may return cached data or start background job)
      // propertyId is optional - scraping works without it
      const datesResponse = await client.post('/pricing/analyze-available-dates', { 
        url,
        propertyId: selectedProperty?.id || null,
        refresh: forceRefresh 
      });
      
      // If we got cached data directly
      if (datesResponse.data.success && datesResponse.data.data) {
        setDatesData(datesResponse.data.data);
        setIsCollapsed(true);
        
        const initialCounts = {};
        datesResponse.data.data.chunks.forEach((_, index) => {
          initialCounts[index] = 5;
        });
        setVisibleCounts(initialCounts);
        setLoading(false);
        return;
      }
      
      // If a job was started, poll for completion
      if (datesResponse.data.jobId) {
        const jobId = datesResponse.data.jobId;
        console.log('Polling for job:', jobId);
        
        // Poll every 5 seconds for up to 3 minutes
        const maxAttempts = 36;
        let attempts = 0;
        
        const pollJob = async () => {
          try {
            const statusResponse = await client.get(`/pricing/job/${jobId}`);
            const { status, data, message, error } = statusResponse.data;
            
            if (status === 'completed' && data) {
              setDatesData(data);
              setIsCollapsed(true);
              
              const initialCounts = {};
              data.chunks.forEach((_, index) => {
                initialCounts[index] = 5;
              });
              setVisibleCounts(initialCounts);
              setLoading(false);
              return;
            }
            
            if (status === 'error') {
              setLoading(false);
              Alert.alert('Analysis Failed', error || 'Could not complete the analysis.');
              return;
            }
            
            // Still processing
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(pollJob, 5000); // Poll every 5 seconds
            } else {
              setLoading(false);
              Alert.alert('Analysis Timeout', 'The analysis is taking longer than expected. Please try again.');
            }
          } catch (pollError) {
            console.error('Poll error:', pollError);
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(pollJob, 5000);
            } else {
              setLoading(false);
              Alert.alert('Analysis Failed', 'Lost connection to the server. Please try again.');
            }
          }
        };
        
        // Start polling after 3 seconds
        setTimeout(pollJob, 3000);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Analysis Failed', error.response?.data?.details || 'Could not analyze the listing. Please check the URL and try again.');
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return '$0';
    return `$${price.toLocaleString('en-US')}`;
  };

  const handleGetAISuggestion = async (chunk, index) => {
    if (!url || !datesData) {
      Alert.alert('Error', 'Please analyze a listing first');
      return;
    }

    // Set loading state for this chunk
    setLoadingAI(prev => ({ ...prev, [index]: true }));

    try {
      // Use the listing ID from the analysis data
      // The backend saves this when we call analyze-available-dates
      const listingId = datesData.listingId;
      
      if (!listingId) {
        throw new Error('Listing ID not found in analysis data');
      }
      
      // Format the check-in date as YYYY-MM-DD
      const checkInDate = chunk.checkIn;

      // Call the AI pricing API with the user's current price and chunk data
      // If we already have a suggestion, force refresh to get new one
      const forceRefresh = !!aiSuggestions[index];
      const response = await client.post(`/pricing/listings/${listingId}/suggest-price`, {
        date: checkInDate,
        currentPrice: chunk.userPrice || null,
        propertyId: selectedProperty?.id,
        refresh: forceRefresh,
        // Pass chunk data so server doesn't need to look it up
        chunkData: {
          lowest: chunk.stats?.lowest,
          average: chunk.stats?.average,
          highest: chunk.stats?.highest,
          competitorCount: chunk.stats?.count || chunk.competitors?.length || 0,
          appearsOnFirstPage: chunk.appearsOnFirstPage !== false
        }
      });

      if (response.data.success) {
        // Store the AI suggestion for this chunk
        setAiSuggestions(prev => ({
          ...prev,
          [index]: response.data.suggestion
        }));
      }
    } catch (error) {
      console.error('AI Suggestion Error:', error);
      console.error('Error details:', error.response?.data);
      
      let errorMessage = 'Could not generate AI pricing suggestion. Please try again.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Add helpful context for common errors
      if (errorMessage.includes('No calendar data')) {
        errorMessage += '\n\nTip: Make sure you have synced calendar data for this listing in the web dashboard first.';
      } else if (errorMessage.includes('not found')) {
        errorMessage += '\n\nTip: Try running "Analyze Market" again to refresh the listing data.';
      }
      
      Alert.alert('AI Suggestion Failed', errorMessage);
    } finally {
      setLoadingAI(prev => ({ ...prev, [index]: false }));
    }
  };

  const renderCompetitorCard = (comp) => (
    <TouchableOpacity 
      key={comp.id} 
      style={styles.card}
      onPress={() => {
        // In a real app, might open a modal or link
      }}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: comp.image || 'https://placehold.co/400x300?text=No+Image' }} 
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={10} color="#FFFFFF" />
          <Text style={styles.ratingText}>{comp.rating || '-'}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{comp.title}</Text>
        
        <View style={styles.statsRow}>
          <Ionicons name="bed-outline" size={14} color={colors.text.secondary} />
          <Text style={styles.statText}>{comp.bedrooms} br • {comp.beds} beds</Text>
        </View>
        
        <View style={styles.occupancyGrid}>
          <View style={styles.occupancyColumn}>
            <Text style={styles.occupancyHeader}>30d</Text>
            <Text style={styles.occupancyData}>{comp.occupancy30 !== undefined ? comp.occupancy30 : '-'}%</Text>
          </View>
          <View style={styles.occupancyDivider} />
          <View style={styles.occupancyColumn}>
            <Text style={styles.occupancyHeader}>60d</Text>
            <Text style={styles.occupancyData}>{comp.occupancy60 !== undefined ? comp.occupancy60 : '-'}%</Text>
          </View>
          <View style={styles.occupancyDivider} />
          <View style={styles.occupancyColumn}>
            <Text style={styles.occupancyHeader}>90d</Text>
            <Text style={styles.occupancyData}>{comp.occupancy90 !== undefined ? comp.occupancy90 : '-'}%</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDateChunk = (chunk, index) => {
    // Parse dates safely - handles both string and Date objects
    const parseDate = (dateInput) => {
      if (!dateInput) return new Date();
      
      // If it's already a Date object
      if (dateInput instanceof Date) return dateInput;
      
      // If it's a string
      const dateStr = String(dateInput);
      
      // Try YYYY-MM-DD format first
      if (dateStr.includes('-')) {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts.map(Number);
      return new Date(year, month - 1, day);
        }
      }
      
      // Fallback to standard Date parsing
      return new Date(dateStr);
    };
    
    const checkInDate = parseDate(chunk.checkIn);
    const checkOutDate = parseDate(chunk.checkOut);
    const isSingleNight = chunk.nights === 1;
    
    // Validate dates
    const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());
    const validCheckIn = isValidDate(checkInDate);
    const validCheckOut = isValidDate(checkOutDate);
    
    // Format date safely
    const formatDateSafe = (date, isValid) => {
      if (!isValid) return 'N/A';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    console.log('Rendering chunk with userPrice:', chunk.userPrice);
    
    return (
      <View key={index} style={styles.chunkCard}>
        <View style={styles.chunkHeader}>
          <View style={styles.chunkDates}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary.main} />
            <Text style={styles.chunkDateText}>
              {isSingleNight ? (
                formatDateSafe(checkInDate, validCheckIn)
              ) : (
                `${formatDateSafe(checkInDate, validCheckIn)} - ${formatDateSafe(checkOutDate, validCheckOut)}`
              )}
            </Text>
            <View style={styles.nightsBadge}>
              <Text style={styles.nightsText}>{chunk.nights} night{chunk.nights > 1 ? 's' : ''}</Text>
            </View>
          </View>
        </View>

      {/* Low Visibility Warning */}
      {chunk.appearsOnFirstPage === false && (
        <View style={styles.lowVisibilityWarning}>
          <Ionicons name="alert-circle" size={12} color="#B45309" />
          <Text style={styles.lowVisibilityText}>Not on page 1 — lower price to rank higher</Text>
        </View>
      )}

      {/* User's Price Display - Compact */}
      <View style={styles.userPriceRow}>
      {chunk.userPrice ? (
          <View style={styles.userPriceBoxCompact}>
            <Text style={styles.userPriceLabelCompact}>YOUR PRICE</Text>
            <Text style={styles.userPriceValueCompact}>{formatPrice(chunk.userPrice)}</Text>
        </View>
      ) : (
          <View style={styles.userPriceNotFoundBoxCompact}>
            <Ionicons name="information-circle-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.userPriceNotFoundTextCompact}>Price not found</Text>
          </View>
        )}
        
        {/* AI Suggestion Button */}
        <TouchableOpacity
          style={[
            styles.aiSuggestionButton,
            aiSuggestions[index] && styles.aiSuggestionButtonRefresh
          ]}
          onPress={() => handleGetAISuggestion(chunk, index)}
          disabled={loadingAI[index]}
          >
          <Ionicons 
            name={aiSuggestions[index] ? "refresh" : "flash"} 
            size={16} 
            color={aiSuggestions[index] ? "#1C1C1E" : "#FFFFFF"} 
          />
          <Text style={[
            styles.aiButtonText,
            aiSuggestions[index] && styles.aiButtonTextRefresh
          ]}>
            {aiSuggestions[index] ? 'Refresh' : 'AI'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI Suggestion Display - Clean Modern Design */}
      {aiSuggestions[index] && (
        <View style={styles.aiSuggestionBox}>
          {/* Header Row */}
            <View style={styles.aiHeader}>
            <View style={styles.aiHeaderLeft}>
              <Ionicons name="bulb-outline" size={16} color="#1C1C1E" />
              <Text style={styles.aiTitle}>AI Recommendation</Text>
            </View>
            <Text style={styles.aiDaysTag}>{aiSuggestions[index].daysUntilCheckin}d out</Text>
            </View>
            
          {/* Price Cards */}
            <View style={styles.aiPricesRow}>
            <View style={styles.aiPriceCard}>
              <Text style={styles.aiPriceLabel}>Low</Text>
                <Text style={styles.aiPriceValue}>{formatPrice(aiSuggestions[index].lowPrice || aiSuggestions[index].recommendedPrice)}</Text>
              </View>
            <View style={[styles.aiPriceCard, styles.aiPriceCardBest]}>
              <Text style={styles.aiPriceLabelBest}>Best</Text>
              <Text style={styles.aiPriceValueBest}>{formatPrice(aiSuggestions[index].recommendedPrice)}</Text>
              </View>
            <View style={styles.aiPriceCard}>
              <Text style={styles.aiPriceLabel}>High</Text>
                <Text style={styles.aiPriceValue}>{formatPrice(aiSuggestions[index].highPrice || aiSuggestions[index].recommendedPrice)}</Text>
              </View>
            </View>
            
          {/* Market Average */}
              {aiSuggestions[index].competitorAvg && (
            <View style={styles.aiMarketRow}>
              <Text style={styles.aiMarketLabel}>Market average</Text>
              <Text style={styles.aiMarketValue}>{formatPrice(aiSuggestions[index].competitorAvg)}</Text>
                </View>
              )}
          
          {/* Expandable Reasoning */}
          <TouchableOpacity 
            style={styles.aiReasoningBox}
            onPress={() => setExpandedReasoning(prev => ({ ...prev, [index]: !prev[index] }))}
            activeOpacity={0.7}
          >
            <View style={styles.aiReasoningHeader}>
              <Text style={styles.aiReasoningTitle}>Why this price?</Text>
              <Ionicons 
                name={expandedReasoning[index] ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#8E8E93" 
              />
            </View>
            <Text 
              style={styles.aiReasoningText} 
              numberOfLines={expandedReasoning[index] ? undefined : 2}
            >
              {aiSuggestions[index].reasoning}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading AI Suggestion */}
      {loadingAI[index] && (
        <View style={styles.aiLoadingBox}>
          <ActivityIndicator size="small" color={colors.primary.main} />
          <Text style={styles.aiLoadingText}>Getting AI recommendation...</Text>
        </View>
      )}

      {/* Market Stats */}
      <View style={styles.marketStats}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Lowest</Text>
          <Text style={styles.statValue}>{formatPrice(chunk.stats.lowest)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Average</Text>
          <Text style={[styles.statValue, { color: colors.primary.main }]}>{formatPrice(chunk.stats.average)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Highest</Text>
          <Text style={styles.statValue}>{formatPrice(chunk.stats.highest)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Listings</Text>
          <Text style={styles.statValue}>{chunk.stats.totalInMarket || chunk.stats.count}</Text>
        </View>
      </View>

      {/* Competitor List */}
      <View style={styles.chunkCompetitors}>
        <Text style={styles.chunkCompetitorsTitle}>
          Showing {Math.min(visibleCounts[index] || 5, chunk.competitors.length)} of {chunk.stats.totalInMarket || chunk.competitors.length} available
        </Text>
        {/* Sort by price and show limited number */}
        {chunk.competitors
          .sort((a, b) => a.price - b.price)
          .slice(0, visibleCounts[index] || 5)
          .map((comp, idx) => (
            <View key={idx} style={styles.miniCompCard}>
              <Image 
                source={{ uri: comp.image || 'https://placehold.co/80x80' }} 
                style={styles.miniCompImage}
              />
              <View style={styles.miniCompInfo}>
                <Text style={styles.miniCompTitle} numberOfLines={1}>{comp.title}</Text>
                <Text style={styles.miniCompStats}>{comp.bedrooms} bedrooms</Text>
              </View>
              <Text style={styles.miniCompPrice}>{formatPrice(comp.price)}</Text>
            </View>
          ))}
        
        {/* Load More Button */}
        {chunk.competitors.length > (visibleCounts[index] || 5) && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() => setVisibleCounts(prev => ({ 
              ...prev, 
              [index]: (prev[index] || 5) + 5 
            }))}
          >
            <Text style={styles.loadMoreText}>
              Load 5 More ({Math.min(chunk.competitors.length - (visibleCounts[index] || 5), chunk.stats.totalInMarket - (visibleCounts[index] || 5))} remaining)
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

  // Show loading while checking subscription
  if (checkingSubscription) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <Text style={styles.loadingScreenText}>Loading...</Text>
      </View>
    );
  }

  // Show upsell screen if no subscription
  if (!hasSubscription) {
    return <SubscriptionUpsellScreen onSubscribe={handleSubscribe} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        
        {/* Property Selection Section */}
        {!isCollapsed && (
          <View style={styles.propertySelectionCard}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Select Property</Text>
              <Text style={styles.optionalLabel}>(Optional)</Text>
            </View>
            
            {loadingProperties ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary.main} />
                <Text style={styles.loadingText}>Loading properties...</Text>
              </View>
            ) : properties.length === 0 ? (
              <View style={styles.noPropertiesContainer}>
                <Ionicons name="analytics-outline" size={40} color={colors.primary.main} />
                <Text style={styles.noPropertiesText}>Analyze Any Listing</Text>
                <Text style={styles.noPropertiesSubtext}>Enter an Airbnb URL below to see market pricing</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.propertySelector}
                  onPress={() => setShowPropertyPicker(!showPropertyPicker)}
                >
                  <View style={styles.propertySelectorLeft}>
                    <Ionicons name="business-outline" size={20} color={colors.primary.main} />
                    <View style={styles.propertySelectorText}>
                      {selectedProperty ? (
                        <>
                          <Text style={styles.selectedPropertyName} numberOfLines={1}>
                            {selectedProperty.displayName}
                          </Text>
                          <Text style={styles.selectedPropertyLocation} numberOfLines={1}>
                            {selectedProperty.city || selectedProperty.address || 'No address'}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.selectPropertyPlaceholder}>Tap to select property</Text>
                      )}
                    </View>
                  </View>
                  <Ionicons 
                    name={showPropertyPicker ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={colors.text.secondary} 
                  />
                </TouchableOpacity>
                
                {/* Property Picker Dropdown */}
                {showPropertyPicker && (
                  <View style={styles.propertyPickerContainer}>
                    <View style={styles.searchContainer}>
                      <Ionicons name="search" size={18} color={colors.text.tertiary} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search properties..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={colors.text.tertiary}
                      />
                    </View>
                    
                    <ScrollView style={styles.propertyList} nestedScrollEnabled>
                      {getFilteredProperties().map((property) => (
                        <TouchableOpacity
                          key={property.id}
                          style={[
                            styles.propertyItem,
                            selectedProperty?.id === property.id && styles.propertyItemSelected
                          ]}
                          onPress={() => handleSelectProperty(property)}
                        >
                          <View style={styles.propertyItemLeft}>
                            <Ionicons 
                              name={property.isPMSProperty ? "cloud" : "home"} 
                              size={16} 
                              color={property.isPMSProperty ? colors.primary.main : colors.text.secondary} 
                            />
                            <View style={styles.propertyItemText}>
                              <Text style={styles.propertyItemName} numberOfLines={1}>
                                {property.displayName}
                              </Text>
                              <Text style={styles.propertyItemLocation} numberOfLines={1}>
                                {property.city || property.address || 'No address'}
                              </Text>
                            </View>
                          </View>
                          {selectedProperty?.id === property.id && (
                            <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </View>
        )}
        
        {/* URL Input Section (show if no property OR property needs URL) */}
        {!isCollapsed && (showUrlInput || !selectedProperty) && (
          <View style={styles.urlInputCard}>
            <Text style={styles.inputLabel}>Airbnb Listing URL</Text>
            <Text style={styles.urlInputHelper}>
              {selectedProperty 
                ? "This property doesn't have an Airbnb URL saved. Please enter it below:"
                : "Enter any Airbnb listing URL to analyze market pricing:"}
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="link-outline" size={20} color={colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="https://airbnb.com/rooms/12345678"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={colors.text.tertiary}
              />
              {url.length > 0 && (
                <TouchableOpacity onPress={() => setUrl('')}>
                  <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        
        {/* Analyze Button - works with or without property */}
        {!isCollapsed && url && (
          <View style={styles.analyzeButtonCard}>
            <TouchableOpacity 
              style={styles.analyzeButton}
              onPress={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.analyzeButtonText}>Analyze Market</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {/* Collapsed Property Header */}
        {isCollapsed && (selectedProperty || datesData) && (
        <View style={styles.collapsedHeaderContainer}>
          <View style={styles.collapsedHeader}>
            <View style={styles.collapsedLeft}>
              <Text style={styles.collapsedPropertyName} numberOfLines={1}>
                {selectedProperty?.displayName || datesData?.myListing?.title || 'Analyzed Listing'}
              </Text>
              {datesData?.cached && (
                <Text style={styles.collapsedCachedLabel}>Cached data</Text>
              )}
            </View>
            <View style={styles.collapsedActions}>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={() => handleAnalyze(true)}
              disabled={loading}
            >
                <Ionicons 
                  name="refresh" 
                  size={18} 
                  color={colors.primary.main} 
                  style={loading ? { opacity: 0.5 } : {}}
                />
            </TouchableOpacity>
              <TouchableOpacity 
                style={styles.changeButton}
                onPress={() => setIsCollapsed(false)}
              >
                <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Results Section - Available Dates Pricing */}
      {datesData && !loading && (
        <View style={styles.resultsSection}>
          {/* My Listing Summary */}
          <View style={styles.myListingCard}>
            <Image 
              source={{ uri: datesData.myListing.image }} 
              style={styles.myListingImage} 
            />
            <View style={styles.myListingInfo}>
              <Text style={styles.myListingLabel}>Your Listing</Text>
              <Text style={styles.myListingTitle} numberOfLines={1}>
                {datesData.myListing.title}
              </Text>
              <Text style={styles.myListingStats}>
                {datesData.myListing.bedrooms} Bedrooms • {datesData.myListing.beds} Beds
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Available Dates Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Dates Pricing</Text>
            <Text style={styles.seeAllText}>{datesData.chunks.length} chunk{datesData.chunks.length > 1 ? 's' : ''}</Text>
          </View>
          {datesData.chunks.map(renderDateChunk)}
        </View>
      )}
      
      {!datesData && !loading && (
        <View style={styles.emptyState}>
          <Ionicons name="stats-chart" size={64} color="#E5E5EA" />
          <Text style={styles.emptyStateText}>
            {url ? 'Tap the refresh button above to analyze market data.' : 'Select a property with an Airbnb URL to get started.'}
          </Text>
          {url && (
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => handleAnalyze(true)}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.emptyStateButtonText}>Analyze Now</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
    
    {/* AI Loading Screen - Render outside ScrollView as overlay */}
    {(loading || loadingDates) && <AILoadingScreen />}
  </View>
  );
}

const styles = StyleSheet.create({
  // Loading screen
  loadingScreen: {
    flex: 1,
    backgroundColor: '#F8F9FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingScreenText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.text.secondary,
  },
  // Upsell screen styles
  upsellContainer: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  upsellContent: {
    paddingBottom: 40,
  },
  upsellHeader: {
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  upsellIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(74, 144, 226, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  upsellTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  upsellSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  upsellFeaturesCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -30,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pricingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.main,
    letterSpacing: 1,
  },
  pricingBadge: {
    backgroundColor: '#33D39C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  pricingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text.primary,
  },
  pricePeriod: {
    fontSize: 16,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  priceSavings: {
    fontSize: 13,
    color: '#33D39C',
    marginBottom: 24,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    marginBottom: 12,
  },
  subscribeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  trialNote: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  testimonialsSection: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  testimonialsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  testimonialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  testimonialStars: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  testimonialText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  testimonialAuthor: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  // Main screen styles
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  headerSection: {
    padding: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  inputCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.shadow.soft,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  propertySelectionCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.shadow.soft,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  urlInputCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.shadow.soft,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  analyzeButtonCard: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  urlInputHelper: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.text.secondary,
  },
  noPropertiesContainer: {
    alignItems: 'center',
    padding: 30,
  },
  noPropertiesText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 12,
  },
  noPropertiesSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
  propertySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F6F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: 14,
    minHeight: 60,
  },
  propertySelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  propertySelectorText: {
    marginLeft: 12,
    flex: 1,
  },
  selectedPropertyName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  selectedPropertyLocation: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  selectPropertyPlaceholder: {
    fontSize: 15,
    color: colors.text.tertiary,
  },
  propertyPickerContainer: {
    marginTop: 12,
    backgroundColor: '#F5F6F8',
    borderRadius: 12,
    maxHeight: 300,
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text.primary,
  },
  propertyList: {
    maxHeight: 250,
  },
  propertyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  propertyItemSelected: {
    backgroundColor: '#E8EEFF',
  },
  propertyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  propertyItemText: {
    marginLeft: 10,
    flex: 1,
  },
  propertyItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  propertyItemLocation: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  optionalLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontWeight: '400',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  analyzeButton: {
    backgroundColor: colors.primary.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
  },
  collapsedHeaderContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  collapsedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  collapsedLeft: {
    flex: 1,
    marginRight: 12,
  },
  collapsedPropertyName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  collapsedCachedLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  collapsedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.primary.main,
    borderRadius: 20,
  },
  changeButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  resultsSection: {
    marginTop: 0,
  },
  myListingCard: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  myListingImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
  },
  myListingInfo: {
    marginLeft: 16,
    flex: 1,
  },
  myListingLabel: {
    fontSize: 12,
    color: colors.primary.main,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  myListingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  myListingStats: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary.main,
    fontWeight: '500',
  },
  competitorsScroll: {
    paddingHorizontal: 20,
    paddingRight: 4, // Offset for last item margin
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: width * 0.7,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  imageContainer: {
    height: 160,
    backgroundColor: '#E5E5EA',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3,
  },
  cardContent: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: 6,
  },
  occupancyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  occupancyColumn: {
    alignItems: 'center',
    flex: 1,
  },
  occupancyHeader: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginBottom: 3,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  occupancyData: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.main,
  },
  occupancyDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E5E5EA',
  },
  loadingDates: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  loadingDatesText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.text.secondary,
  },
  chunkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  chunkHeader: {
    marginBottom: 14,
  },
  chunkDates: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chunkDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  nightsBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nightsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.main,
  },
  // Low Visibility Warning - Compact inline
  lowVisibilityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9E7',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  lowVisibilityText: {
    fontSize: 11,
    color: '#B45309',
    marginLeft: 4,
  },
  // Compact User Price Row
  userPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  userPriceBoxCompact: {
    backgroundColor: '#F0F9FF',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary.main,
    flex: 1,
  },
  userPriceLabelCompact: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  userPriceValueCompact: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.main,
  },
  userPriceNotFoundBoxCompact: {
    backgroundColor: '#F5F6F8',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8EAED',
    flex: 1,
  },
  userPriceNotFoundTextCompact: {
    fontSize: 10,
    color: colors.text.secondary,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  // AI Suggestion Button
  aiSuggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 6,
    marginLeft: 12,
    flex: 1,
  },
  aiSuggestionButtonRefresh: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  aiButtonTextRefresh: {
    color: '#1C1C1E',
  },
  // AI Suggestion Box
  aiSuggestionBox: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    padding: 14,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  aiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiTitle: {
    color: '#1C1C1E',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  aiDaysTag: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
  },
  aiPricesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  aiPriceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  aiPriceCardBest: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  aiPriceLabel: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  aiPriceLabelBest: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  aiPriceValue: {
    color: '#1C1C1E',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  aiPriceValueBest: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  aiMarketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  aiMarketLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
  },
  aiMarketValue: {
    color: '#1C1C1E',
    fontSize: 13,
    fontWeight: '600',
  },
  aiReasoningBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  aiReasoningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiReasoningTitle: {
    color: '#1C1C1E',
    fontSize: 12,
    fontWeight: '600',
  },
  aiReasoningText: {
    color: '#6B6B6B',
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  aiLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  aiLoadingText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  marketStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  chunkCompetitors: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  chunkCompetitorsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  miniCompCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  miniCompImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  miniCompInfo: {
    flex: 1,
    marginLeft: 10,
  },
  miniCompTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  miniCompStats: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  miniCompPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary.main,
  },
  loadMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: '#F5F6F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 15,
    color: colors.text.tertiary,
    lineHeight: 22,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 20,
    gap: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // AI Loading Screen Styles - Clean minimal
  aiLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  aiLoadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  aiLogoContainer: {
    marginBottom: 40,
    shadowColor: '#215EEA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  aiLoadingLogo: {
    width: 100,
    height: 100,
  },
  aiLoadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  aiLoadingSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#94A3B8',
    marginBottom: 32,
  },
  aiDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#215EEA',
  },
});

