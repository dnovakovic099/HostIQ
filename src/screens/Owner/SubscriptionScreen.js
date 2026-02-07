import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import subscriptionService from '../../services/subscriptionService';
import colors from '../../theme/colors';

const COLORS = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  primary: '#548EDD',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

export default function SubscriptionScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadProducts();
    
    // Set up purchase completion listener
    const unsubscribe = subscriptionService.onPurchaseComplete((result) => {
      setPurchasing(false);
      if (result.success) {
        Alert.alert(
          'Success!',
          'Your subscription has been activated successfully.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh products to show updated status
                loadProducts();
                // Navigate back or to a success screen
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to complete purchase');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Initialize StoreKit
      await subscriptionService.initialize();
      
      // Fetch products (config + pricing)
      const subscriptionProducts = await subscriptionService.getSubscriptionProducts();
      setProducts(subscriptionProducts);
    } catch (err) {
      console.error('Error loading products:', err);
      setError(err.message);
      Alert.alert('Error', 'Failed to load subscription products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (product) => {
    try {
      if (!product.isAvailable) {
        Alert.alert('Unavailable', 'This subscription is currently unavailable.');
        return;
      }

      Alert.alert(
        'Confirm Purchase',
        `Subscribe to ${product.name} for ${product.localizedPrice}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Subscribe',
            onPress: async () => {
              try {
                setPurchasing(true);
                await subscriptionService.purchaseSubscriptionById(product.product_id);
                // Purchase completion will be handled by the listener
              } catch (error) {
                setPurchasing(false);
                console.error('Purchase error:', error);
                if (error.message !== 'Purchase was cancelled') {
                  Alert.alert('Error', error.message || 'Failed to initiate purchase. Please try again.');
                }
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Failed to initiate purchase. Please try again.');
    }
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      {/* Top Section with Icon and Badge */}
      <View style={styles.cardTopSection}>
        <LinearGradient
          colors={['#EFF6FF', '#DBEAFE', '#BFDBFE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.productIcon}
        >
          <Ionicons name="star" size={22} color={COLORS.primary} />
        </LinearGradient>
        {!item.isAvailable && (
          <View style={styles.unavailableBadge}>
            <Ionicons name="close-circle" size={12} color={COLORS.error} />
            <Text style={styles.unavailableText}>Unavailable</Text>
          </View>
        )}
      </View>

      {/* Name and Price Section */}
      <View style={styles.namePriceSection}>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.productPrice}>{item.localizedPrice || item.price}</Text>
          {item.duration && (
            <Text style={styles.pricePeriod}>/{item.duration.toLowerCase().replace('ly', '')}</Text>
          )}
        </View>
      </View>
      
      {/* Description */}
      {item.description && (
        <Text style={styles.productDescription}>{item.description}</Text>
      )}

      {/* Duration Badge */}
      {item.duration && (
        <View style={styles.durationBadge}>
          <Ionicons name="time" size={14} color={COLORS.primary} />
          <Text style={styles.durationText}>{item.duration}</Text>
        </View>
      )}

      {/* Features Section */}
      {item.features && item.features.length > 0 && (
        <View style={styles.featuresContainer}>
          <View style={styles.featuresHeader}>
            <Text style={styles.featuresTitle}>What's included</Text>
            <View style={styles.featuresCount}>
              <Text style={styles.featuresCountText}>{item.features.length}</Text>
            </View>
          </View>
          <View style={styles.featuresList}>
            {item.features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.checkIconContainer}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.checkIcon}
              >
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </LinearGradient>
                </View>
                <Text style={styles.featureItem}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Subscribe Button */}
      <TouchableOpacity
        style={[
          styles.subscribeButton,
          (!item.isAvailable || purchasing) && styles.subscribeButtonDisabled
        ]}
        onPress={() => handlePurchase(item)}
        disabled={!item.isAvailable || purchasing}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={item.isAvailable ? ['#548EDD', '#4A7FD4', '#3F70CB'] : ['#9CA3AF', '#6B7280']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.subscribeButtonGradient}
        >
          {purchasing ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={[styles.subscribeButtonText, styles.buttonLoadingText]}>Processing...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Text style={styles.subscribeButtonText}>
                {item.isAvailable ? 'Subscribe Now' : 'Unavailable'}
              </Text>
              {item.isAvailable && (
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.buttonIcon} />
              )}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerWrapper, Platform.OS === 'android' && { paddingTop: insets.top }]}
        >
          {Platform.OS === 'ios' ? (
            <SafeAreaView>
              <View style={styles.headerGradient}>
                <View style={styles.headerIconWrapper}>
                  <View style={styles.headerIconInner}>
                    <Ionicons name="card" size={28} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.headerTextWrapper}>
                  <Text style={styles.headerTitle}>Subscriptions</Text>
                  <Text style={styles.headerSubtitle}>Loading plans...</Text>
                </View>
              </View>
            </SafeAreaView>
          ) : (
            <View style={styles.headerGradient}>
              <View style={styles.headerIconWrapper}>
                <View style={styles.headerIconInner}>
                  <Ionicons name="card" size={28} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.headerTextWrapper}>
                <Text style={styles.headerTitle}>Subscriptions</Text>
                <Text style={styles.headerSubtitle}>Loading plans...</Text>
              </View>
            </View>
          )}
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={['#EFF6FF', '#DBEAFE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loadingIcon}
          >
            <ActivityIndicator size="large" color={COLORS.primary} />
          </LinearGradient>
          <Text style={styles.loadingText}>Loading subscription plans...</Text>
          <Text style={styles.loadingSubtext}>Please wait a moment</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerWrapper, Platform.OS === 'android' && { paddingTop: insets.top }]}
        >
          {Platform.OS === 'ios' ? (
            <SafeAreaView>
              <View style={styles.headerGradient}>
                <View style={styles.headerIconWrapper}>
                  <View style={styles.headerIconInner}>
                    <Ionicons name="card" size={28} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.headerTextWrapper}>
                  <Text style={styles.headerTitle}>Subscriptions</Text>
                  <Text style={styles.headerSubtitle}>Error loading plans</Text>
                </View>
              </View>
            </SafeAreaView>
          ) : (
            <View style={styles.headerGradient}>
              <View style={styles.headerIconWrapper}>
                <View style={styles.headerIconInner}>
                  <Ionicons name="card" size={28} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.headerTextWrapper}>
                <Text style={styles.headerTitle}>Subscriptions</Text>
                <Text style={styles.headerSubtitle}>Error loading plans</Text>
              </View>
            </View>
          )}
        </LinearGradient>
        <View style={styles.errorContainer}>
          <LinearGradient
            colors={['#FEF2F2', '#FEE2E2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.errorIcon}
          >
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
          </LinearGradient>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProducts} activeOpacity={0.8}>
            <LinearGradient
              colors={[COLORS.primary, '#4A7FD4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButtonGradient}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Gradient */}
      <LinearGradient
        colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerWrapper, Platform.OS === 'android' && { paddingTop: insets.top }]}
      >
        {Platform.OS === 'ios' ? (
          <SafeAreaView>
            <View style={styles.headerGradient}>
              <View style={styles.headerIconWrapper}>
                <View style={styles.headerIconInner}>
                  <Ionicons name="card" size={28} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.headerTextWrapper}>
                <Text style={styles.headerTitle}>Subscriptions</Text>
                <Text style={styles.headerSubtitle}>
                  {products.length} {products.length === 1 ? 'plan available' : 'plans available'}
                </Text>
              </View>
            </View>
          </SafeAreaView>
        ) : (
          <View style={styles.headerGradient}>
            <View style={styles.headerIconWrapper}>
              <View style={styles.headerIconInner}>
                <Ionicons name="card" size={28} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.headerTextWrapper}>
              <Text style={styles.headerTitle}>Subscriptions</Text>
              <Text style={styles.headerSubtitle}>
                {products.length} {products.length === 1 ? 'plan available' : 'plans available'}
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#EFF6FF', '#DBEAFE', '#BFDBFE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIcon}
            >
              <Ionicons name="card-outline" size={40} color={COLORS.primary} />
            </LinearGradient>
            <Text style={styles.emptyText}>No Subscriptions Available</Text>
            <Text style={styles.emptySubtext}>
              We're currently setting up subscription plans.{'\n'}
              Please check back later or contact support for assistance.
            </Text>
          </View>
        ) : (
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item) => item.product_id}
            contentContainerStyle={styles.listContainer}
            scrollEnabled={false}
          />
        )}

        <View style={styles.infoBox}>
          <LinearGradient
            colors={['#EFF6FF', '#DBEAFE', '#BFDBFE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.infoIcon}
          >
            <Ionicons name="information-circle" size={22} color={COLORS.primary} />
          </LinearGradient>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Subscription Information</Text>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <View style={styles.infoBullet} />
                <Text style={styles.infoText}>
                  Subscriptions auto-renew unless cancelled
                </Text>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoBullet} />
                <Text style={styles.infoText}>
                  Cancel anytime from your App Store settings
                </Text>
              </View>
              <View style={styles.infoItem}>
                <View style={styles.infoBullet} />
                <Text style={styles.infoText}>
                  Payment will be charged to your Apple ID account
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  // Header Gradient
  headerWrapper: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 18,
  },
  headerIconWrapper: {
    marginRight: 14,
  },
  headerIconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.9,
  },
  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  loadingSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  errorIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.error,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  retryButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Scroll Content
  scrollContent: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  listContainer: {
    paddingBottom: 8,
  },
  // Product Card
  productCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8F0FE',
    ...Platform.select({
      ios: {
        shadowColor: '#548EDD',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  productIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  unavailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    gap: 6,
  },
  unavailableText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.error,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  namePriceSection: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  pricePeriod: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 2,
  },
  productDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  featuresContainer: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8F0FE',
  },
  featuresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  featuresTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.1,
  },
  featuresCount: {
    backgroundColor: '#EFF6FF',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  featuresCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  featuresList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkIconContainer: {
    marginTop: 2,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  featureItem: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  subscribeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 50,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  subscribeButtonDisabled: {
    opacity: 0.5,
  },
  subscribeButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  subscribeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonLoadingText: {
    marginLeft: 8,
  },
  buttonIcon: {
    marginLeft: 2,
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    ...Platform.select({
      ios: {
        shadowColor: '#548EDD',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    flex: 1,
    letterSpacing: 0.1,
  },
});

