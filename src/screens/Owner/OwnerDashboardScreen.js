import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Image,
    Dimensions,
    Platform,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import UsageIndicator from '../../components/UsageIndicator';
import OnboardingPopup from '../../components/OnboardingPopup';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import colors from '../../theme/colors';

const { width } = Dimensions.get('window');

// Use centralized colors - Apple HIG aligned
const COLORS = {
    background: colors.background.primary,      // iOS system background
    card: colors.background.card,
    cardBorder: colors.shadow.cardBorder,
    cardShadow: colors.shadow.card,
    text: {
        primary: colors.text.primary,           // True black
        secondary: colors.text.secondary,       // iOS secondary label
        tertiary: colors.text.tertiary,         // iOS tertiary label
    },
    accent: colors.accent.blue,
    border: colors.special.borderDark,
    accentLight: colors.accent.blueLight,
    success: colors.status.success,
    successLight: colors.accent.successLight,
    warning: colors.status.warning,
    warningLight: colors.accent.warningLight,
    error: colors.status.error,
    errorBin: colors.status.error,
    errorLight: colors.accent.errorLight,
    divider: colors.border.divider,             // iOS separator
    overlay: colors.overlay.slate,
};

export default function OwnerDashboardScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const [stats, setStats] = useState({
        properties: 0,
        units: 0,
        cleaners: 0,
        inspections_today: 0,
    });
    const [recentInspections, setRecentInspections] = useState([]);
    const [lowRatingProperties, setLowRatingProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const lastFetchTime = useRef(0);
    const propertiesFetchInProgress = useRef(false);

    const { loadOnboardingState, shouldShowOnboarding, updateCounts, markOnboardingSeen } = useOnboardingStore();

    useFocusEffect(
        useCallback(() => {
            const now = Date.now();
            const timeSinceLastFetch = now - lastFetchTime.current;
            if (timeSinceLastFetch > 30000 || lastFetchTime.current === 0) {
                lastFetchTime.current = now;
                fetchDashboardData();
            }
        }, [])
    );

    const fetchDashboardData = async () => {
        try {
            // Fetch critical data first (stats and inspections) - these are fast
            const [statsRes, inspectionsRes] = await Promise.all([
                api.get('/owner/stats'),
                api.get('/owner/inspections/recent?limit=5')
            ]);

            setStats({
                properties: Number(statsRes.data.properties) || 0,
                units: Number(statsRes.data.units) || 0,
                cleaners: Number(statsRes.data.cleaners) || 0,
                inspections_today: Number(statsRes.data.inspections_today) || 0,
            });

            const inspections = Array.isArray(inspectionsRes.data) ? inspectionsRes.data : [];
            const validInspections = inspections.filter(inspection =>
                inspection && inspection.unit && inspection.unit.property && inspection.creator
            );
            setRecentInspections(validInspections);

            // Check onboarding after loading stats
            // Use stats property count instead of fetching all properties
            const totalProperties = Number(statsRes.data.properties) || 0;
            await loadOnboardingState();
            updateCounts(totalProperties, statsRes.data.cleaners);
            if (shouldShowOnboarding()) {
                setShowOnboarding(true);
            }

            // Fetch properties in background (non-blocking) for low-rated properties
            // This is optional and won't block the dashboard from loading
            // Skip if already fetching to prevent duplicate requests
            if (!propertiesFetchInProgress.current) {
                propertiesFetchInProgress.current = true;
                
                Promise.race([
                    api.get('/owner/properties'),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Properties request timeout')), 8000) // 8 second timeout
                    )
                ]).then(propertiesRes => {
                    // Check properties structure - can be array or object with manualProperties/pmsProperties
                    let allProperties = [];
                    if (propertiesRes && propertiesRes.data) {
                        if (propertiesRes.data.manualProperties || propertiesRes.data.pmsProperties) {
                            // New structure with manualProperties and pmsProperties
                            const manualProps = Array.isArray(propertiesRes.data.manualProperties) ? propertiesRes.data.manualProperties : [];
                            const pmsProps = Array.isArray(propertiesRes.data.pmsProperties) ? propertiesRes.data.pmsProperties : [];
                            allProperties = [...manualProps, ...pmsProps];
                        } else if (Array.isArray(propertiesRes.data)) {
                            // Legacy structure - direct array
                            allProperties = propertiesRes.data;
                        }
                    }
                    
                    const lowRated = allProperties.filter(prop => prop.hasLowRating);
                    setLowRatingProperties(lowRated);
                }).catch(error => {
                    // Silently fail - low-rated properties is a nice-to-have feature
                    // Don't log timeout errors (expected for large property lists)
                    if (error.message && !error.message.includes('timeout')) {
                        console.warn('Could not fetch properties for low-rated warnings:', error.message);
                    }
                    setLowRatingProperties([]);
                }).finally(() => {
                    propertiesFetchInProgress.current = false;
                });
            }

        } catch (error) {
            console.error('Dashboard error:', error);
            setStats({ properties: 0, units: 0, cleaners: 0, inspections_today: 0 });
            setRecentInspections([]);
            setLowRatingProperties([]);
            // On error, still check onboarding (might be first time user)
            await loadOnboardingState();
            updateCounts(0, 0);
            if (shouldShowOnboarding()) {
                setShowOnboarding(true);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };

    const handleCloseOnboarding = () => {
        markOnboardingSeen();
        setShowOnboarding(false);
    };

    const handleAddProperty = () => {
        handleCloseOnboarding();
        navigation.navigate('Properties', { screen: 'CreateProperty' });
    };

    const handleAddCleaner = () => {
        handleCloseOnboarding();
        navigation.navigate('ManageCleaners');
    };

    const getStatusConfig = (inspection) => {
        const status = inspection.status || 'UNKNOWN';
        const isReady = inspection.airbnb_grade_analysis?.guest_ready;
        const errorMsg = inspection.summary_json?.error || '';
        const isAppFailed = errorMsg.includes('blurred') || errorMsg.includes('technical');

        if (status === 'FAILED' || isAppFailed) {
            return { label: 'Failed', color: colors.status.error };
        }
        if (status === 'COMPLETE' && isReady === false) {
            return { label: 'Cleaning Failed', color: colors.status.error };
        }
        if (status === 'COMPLETE') {
            return { label: 'Complete', color: colors.status.success };
        }
        if (status === 'PROCESSING') {
            return { label: 'Processing', color: colors.status.warning };
        }
        return { label: status, color: colors.ios.gray };
    };

    const formatDate = (date) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleDeleteInspection = (inspectionId, propertyName) => {
        Alert.alert(
            'Delete Inspection',
            `Delete this inspection for ${propertyName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/inspections/${inspectionId}`);
                            setRecentInspections(prev => prev.filter(i => i.id !== inspectionId));
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete inspection');
                        }
                    },
                },
            ]
        );
    };

    // Get first 3 media URLs from inspection
    const getMediaThumbnails = (inspection) => {
        if (!inspection.media || inspection.media.length === 0) return [];
        return inspection.media.slice(0, 3).map(m => m.url);
    };

    const firstName = (user?.name || 'Owner').split(' ')[0];

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    // Calculate inspection stats
    const totalInspections = recentInspections.length;
    const completedInspections = recentInspections.filter(i => i.status === 'COMPLETE').length;
    const processingInspections = recentInspections.filter(i => i.status === 'PROCESSING').length;
    const avgScore = recentInspections.length > 0
        ? (recentInspections.reduce((sum, i) => sum + (i.cleanliness_score || 0), 0) / recentInspections.length).toFixed(1)
        : '0.0';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
                }
            >
                {/* Welcome Header with Integrated Quick Actions */}
                <View style={styles.headerContainer}>
                    <LinearGradient
                        colors={colors.gradients.dashboardHeader}
                        locations={colors.gradients.dashboardHeaderLocations}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.welcomeSection, { paddingTop: insets.top + 12 }]}
                    >
                        {/* Animated decorative elements */}
                        <View style={styles.decorativeCircle1}>
                            <Ionicons name="home" size={100} color={colors.decorative.icon1} />
                        </View>
                        <View style={styles.decorativeCircle2}>
                            <Ionicons name="business" size={70} color={colors.decorative.icon1} />
                        </View>
                        <View style={styles.decorativeCircle3}>
                            <Ionicons name="bed" size={50} color={colors.decorative.icon2} />
                        </View>

                        <View style={styles.welcomeContent}>
                            <Text style={styles.welcomeGreeting}>Hello, </Text>
                            <Text style={styles.welcomeName}>{firstName}!</Text>
                        </View>
                        <Text style={styles.welcomeSubtitle}>Manage your properties with ease</Text>
                    </LinearGradient>

                    {/* Quick Actions Card - Floating above header */}
                    <View style={styles.quickActionsCard}>
                        <View style={styles.quickActions}>
                            {/* Free Image Usage Indicator */}
                            <View style={styles.usageIndicatorInCard}>
                                <UsageIndicator navigation={navigation} />
                            </View>
                            
                            {/* Divider */}
                            <View style={styles.quickActionsDivider} />
                            
                            <View style={styles.quickActionsRow}>
                                <TouchableOpacity
                                    style={styles.quickActionBtn}
                                    onPress={() => navigation.navigate('Properties', { screen: 'CreateProperty' })}
                                    activeOpacity={0.7}
                                >
                                    <LinearGradient
                                        colors={['#2CB5E9', '#215EEA']}
                                        style={styles.quickActionCircle}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons name="home" size={22} color={colors.text.inverse} />
                                    </LinearGradient>
                                    <Text style={styles.quickActionText}>Property</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.quickActionBtn}
                                    onPress={() => navigation.navigate('ManageCleaners')}
                                    activeOpacity={0.7}
                                >
                                    <LinearGradient
                                        colors={['#215EEA', '#1E3AFF']}
                                        style={styles.quickActionCircle}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons name="people" size={20} color={colors.text.inverse} />
                                    </LinearGradient>
                                    <Text style={styles.quickActionText}>Team</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.quickActionBtn}
                                    onPress={() => navigation.navigate('Insights')}
                                    activeOpacity={0.7}
                                >
                                    <LinearGradient
                                        colors={['#33D39C', '#2CB5E9']}
                                        style={styles.quickActionCircle}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons name="analytics" size={20} color={colors.text.inverse} />
                                    </LinearGradient>
                                    <Text style={styles.quickActionText}>Issues</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Low Rating Alert */}
                {
                    lowRatingProperties.length > 0 && (
                        <View style={styles.section}>
                            <LinearGradient
                                colors={colors.gradients.lightRed}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.alertCard}
                            >
                                <TouchableOpacity
                                    style={styles.alertCardTouchable}
                                    onPress={() => navigation.navigate('Insights')}
                                    activeOpacity={0.7}
                                >
                                    <LinearGradient
                                        colors={colors.gradients.lightRedAlt}
                                        style={styles.alertIconWrapper}
                                    >
                                        <Ionicons name="warning-outline" size={20} color={COLORS.error} />
                                    </LinearGradient>
                                    <View style={styles.alertContent}>
                                        <Text style={styles.alertTitle}>
                                            {lowRatingProperties.length} Low Rating{lowRatingProperties.length > 1 ? 's' : ''}
                                        </Text>
                                        <Text style={styles.alertSubtitle}>Ratings ≤ 4.7 need attention</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>
                    )
                }

                {/* Recent Inspections */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Recent Inspections</Text>
                            <View style={styles.sectionTitleUnderline} />
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('InspectionReports')}
                            style={styles.viewAllBtn}
                        >
                            <Text style={styles.viewAllText}>View All</Text>

                        </TouchableOpacity>
                    </View>

                    {/* Stats Row */}
                    {recentInspections.length > 0 && (
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#1E3AFF' }]}>{totalInspections}</Text>
                                <Text style={styles.statLabel}>TOTAL</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#215EEA' }]}>{avgScore}</Text>
                                <Text style={styles.statLabel}>AVG SCORE</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#33D39C' }]}>{completedInspections}</Text>
                                <Text style={styles.statLabel}>COMPLETE</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: '#2CB5E9' }]}>{processingInspections}</Text>
                                <Text style={styles.statLabel}>PROCESSING</Text>
                            </View>
                        </View>
                    )}

                    {recentInspections.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconWrapper}>
                                <Ionicons name="clipboard-outline" size={32} color={COLORS.text.tertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>No Inspections Yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Inspections will appear here once cleaners submit them
                            </Text>
                        </View>
                    ) : (
                        recentInspections.map((inspection) => {
                            const propertyName = inspection.unit?.property?.name || 'Property';
                            const unitName = inspection.unit?.name || 'Unit';
                            const cleanerName = inspection.creator?.name || 'Cleaner';
                            const statusConfig = getStatusConfig(inspection);
                            const score = inspection.cleanliness_score;
                            const mediaCount = inspection._count?.media || 0;
                            const thumbnails = getMediaThumbnails(inspection);

                            return (
                                <View key={inspection.id} style={styles.inspectionCard}>
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate('InspectionDetail', { inspectionId: inspection.id })}
                                        activeOpacity={0.6}
                                        style={styles.cardTouchable}
                                    >
                                        {/* Header Row: Property Name + Score */}
                                        <View style={styles.cardTopRow}>
                                            <Text style={styles.propertyName} numberOfLines={1}>{propertyName}</Text>
                                            {score != null && score > 0 && (
                                                <Text style={styles.simpleScore}>{score.toFixed(1)}</Text>
                                            )}
                                        </View>

                                        {/* Meta Info Row */}
                                        <Text style={styles.metaInfo}>
                                            {unitName} · {cleanerName} · {formatDate(inspection.created_at)} · {mediaCount} photo{mediaCount !== 1 ? 's' : ''}
                                        </Text>

                                        {/* Status Badge */}
                                        {statusConfig.label === 'Cleaning Failed' || statusConfig.label === 'Failed' ? (
                                            <View style={styles.attentionBadge}>
                                                <View style={styles.attentionDot} />
                                                <Text style={styles.attentionText}>Attention</Text>
                                            </View>
                                        ) : null}
                                    </TouchableOpacity>

                                    {/* Airbnb Dispute Report Button */}
                                    {inspection.status === 'COMPLETE' && inspection.airbnb_grade_analysis?.guest_ready === false && (
                                        <TouchableOpacity
                                            style={styles.disputeButton}
                                            onPress={() => navigation.navigate('AirbnbDisputeReport', { inspectionId: inspection.id })}
                                            activeOpacity={0.6}
                                        >
                                            <Ionicons name="document-text-outline" size={16} color={colors.ios.blue} />
                                            <Text style={styles.disputeButtonText}>Airbnb Dispute Report</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })
                    )}
                </View>

                <View style={styles.bottomPadding} />
            </ScrollView>

            {/* Onboarding Popup */}
            <OnboardingPopup
                visible={showOnboarding}
                hasProperties={stats.properties > 0}
                hasCleaners={stats.cleaners > 0}
                onClose={handleCloseOnboarding}
                onAddProperty={handleAddProperty}
                onAddCleaner={handleAddCleaner}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    // Header Container
    headerContainer: {
        position: 'relative',
        marginBottom: 30,
    },
    // Welcome Section
    welcomeSection: {
        paddingBottom: 200,
        paddingLeft: 24,
        paddingRight: 24,
        position: 'relative',
        overflow: 'visible',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        marginHorizontal: 0,
        marginBottom: 0,
    },
    welcomeContent: {
        flexDirection: 'row',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        zIndex: 20,
        marginTop: 12,
        marginBottom: 8,
    },
    welcomeGreeting: {
        fontSize: 28,
        fontWeight: '400',
        color: colors.text.inverse,
    },
    welcomeName: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text.inverse,
    },
    welcomeSubtitle: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text.inverse,
        marginTop: 4,
        zIndex: 20,
    },
    // Light theme header text styles (matching login screen)
    welcomeGreetingLight: {
        fontSize: 32,
        fontWeight: '300',
        color: colors.text.primary,
        letterSpacing: -0.5,
    },
    welcomeNameLight: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.primary.main,
        letterSpacing: -0.5,
    },
    welcomeSubtitleLight: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text.secondary,
        marginTop: 4,
        zIndex: 20,
    },
    decorativeCircle1: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(10, 132, 255, 0.08)',
        top: -60,
        right: -50,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 0,
    },
    decorativeCircle2: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(90, 200, 250, 0.06)',
        bottom: -10,
        left: -40,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 0,
    },
    decorativeCircle3: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(10, 132, 255, 0.05)',
        top: 60,
        right: 80,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 0,
    },
    // Section
    section: {
        paddingHorizontal: 16,
        marginTop: 40,
    },
    sectionTitle: {
        fontSize: 28,                           // iOS title 1
        fontWeight: '700',                      // Bold, not extra bold
        color: COLORS.text.primary,
        letterSpacing: -0.8,                    // Apple-style tight
    },
    sectionTitleUnderline: {
        width: 48,                              // Slightly smaller
        height: 3,
        backgroundColor: '#215EEA',
        borderRadius: 1.5,
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewAllText: {
        fontSize: 15,
        color: COLORS.text.secondary,
        fontWeight: '700',
    },
    // Quick Actions Card
    quickActionsCard: {
        position: 'absolute',
        bottom: -45,
        left: 16,
        right: 16,
        backgroundColor: COLORS.card,
        borderRadius: 16,                       // Reduced for refinement
        paddingVertical: 16,                    // 8pt grid
        paddingHorizontal: 12,
        zIndex: 10,
        ...Platform.select({
            ios: {
                shadowColor: colors.shadow.black,
                shadowOffset: { width: 0, height: 4 },  // Reduced elevation
                shadowOpacity: 0.08,                     // More subtle
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
        borderWidth: 0.5,                       // Hairline
        borderColor: colors.border.light,
    },
    quickActions: {
        gap: 0,
    },
    quickActionsRow: {
        flexDirection: 'row',
        // Use space-between so remaining actions stay evenly distributed
        // even when one quick action (like Plans) is hidden
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quickActionsDivider: {
        height: 1,
        backgroundColor: COLORS.divider,
        marginVertical: 16,
        marginHorizontal: -10,
    },
    usageIndicatorInCard: {
        marginHorizontal: -10,
        marginTop: -18,
    },
    quickActionBtn: {
        alignItems: 'center',
        flex: 1,
    },
    quickActionCircle: {
        width: 56,                              // Even dimension
        height: 56,
        borderRadius: 14,                       // More refined
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        ...Platform.select({
            ios: {
                shadowColor: colors.shadow.black,
                shadowOffset: { width: 0, height: 2 },  // Subtle elevation
                shadowOpacity: 0.10,                     // More refined
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    quickActionText: {
        fontSize: 11,
        color: COLORS.text.primary,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -0.2,
    },
    // Alert
    alertCard: {
        borderRadius: 20,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: COLORS.error,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    alertCardTouchable: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        gap: 14,
    },
    alertIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: COLORS.error,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    alertContent: {
        flex: 1,
    },
    alertTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text.primary,
        letterSpacing: -0.2,
    },
    alertSubtitle: {
        fontSize: 13,
        color: COLORS.text.secondary,
        marginTop: 3,
        fontWeight: '500',
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 56,
        paddingHorizontal: 32,
        backgroundColor: COLORS.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    emptyIconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: COLORS.divider,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text.primary,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 20,
    },
    // Inspection Card
    inspectionCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 0.5,                       // Hairline
        borderColor: COLORS.divider,
        ...Platform.select({
            ios: {
                shadowColor: colors.shadow.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,             // Very subtle
                shadowRadius: 4,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    cardTouchable: {
        padding: 16,
    },
    thumbnailRow: {
        flexDirection: 'row',
        height: 140,
        position: 'relative',
    },
    thumbnail: {
        flex: 1,
        height: 140,
        backgroundColor: COLORS.divider,
    },
    thumbnailFirst: {
        borderTopLeftRadius: 20,
    },
    thumbnailLast: {
        borderTopRightRadius: 20,
    },
    morePhotos: {
        position: 'absolute',
        right: 14,
        bottom: 14,
        backgroundColor: colors.overlay.slateStrong,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.overlay.white,
    },
    morePhotosText: {
        color: colors.text.inverse,
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    cardBody: {
        padding: 0,
        backgroundColor: COLORS.card,
    },
    cardContentWrapper: {
        flexDirection: 'row',
    },
    leftAccent: {
        width: 4,
        backgroundColor: COLORS.accent,
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
    },
    cardContent: {
        flex: 1,
        padding: 20,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    propertyInfo: {
        flex: 1,
        marginRight: 12,
    },
    propertyName: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.text.primary,
        letterSpacing: -0.3,
    },
    unitName: {
        fontSize: 14,
        color: COLORS.text.secondary,
        marginTop: 4,
        fontWeight: '500',
    },
    simpleScore: {
        fontSize: 20,
        fontWeight: '700',
        color: '#215EEA',
        letterSpacing: -0.5,
    },
    metaInfo: {
        fontSize: 14,
        color: COLORS.text.secondary,
        marginBottom: 12,
        lineHeight: 20,
    },
    attentionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: colors.accent.errorLightAlt,
        alignSelf: 'flex-start',
    },
    attentionDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.status.error,
        marginRight: 6,
    },
    attentionText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.status.error,
    },
    disputeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent.infoLight,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginHorizontal: 16,
        marginBottom: 16,
        gap: 8,
    },
    disputeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.ios.blue,
        letterSpacing: -0.2,
    },
    cardBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.divider,
    },
    deleteBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: COLORS.errorLight,
        color: COLORS.errorBin,
    },
    // Meta
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 0,
    },
    metaText: {
        fontSize: 13,
        color: COLORS.text.secondary,
        fontWeight: '500',
    },
    metaDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.text.tertiary,
        marginHorizontal: 8,
    },
    // Footer
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.divider,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 7,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 0.2,
    },
    footerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        backgroundColor: COLORS.successLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    scoreValue: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.success,
        letterSpacing: -0.3,
    },
    scoreMax: {
        fontSize: 13,
        color: COLORS.success,
        fontWeight: '600',
        opacity: 0.7,
    },
    // Stats Row
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: COLORS.card,
        borderRadius: 12,
        marginBottom: 16,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text.primary,
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.text.secondary,
        marginTop: 4,
        letterSpacing: 0.5,
    },
    bottomPadding: {
        height: 32,
    },
});