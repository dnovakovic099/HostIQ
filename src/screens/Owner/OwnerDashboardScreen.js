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
import DemoPropertyBanner from '../../components/DemoPropertyBanner';
import FirstRunAnchorCard from '../../components/FirstRunAnchorCard';
import { useOnboardingStore, FIRST_RUN_STAGES } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import colors from '../../theme/colors';

// Auto-seeded demo properties have a name prefix that lets us identify
// them on the client without a schema flag. Keep this in sync with the
// server-side demoSeeder constant.
const DEMO_PROPERTY_NAME_PREFIX = '✨ Demo:';

const isDemoProperty = (property) =>
  !!property?.name && property.name.startsWith(DEMO_PROPERTY_NAME_PREFIX);

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
    const [hasRealPropertyOnDashboard, setHasRealPropertyOnDashboard] = useState(false);
    const [hasDemoPropertyOnDashboard, setHasDemoPropertyOnDashboard] = useState(false);
    const lastFetchTime = useRef(0);
    const propertiesFetchInProgress = useRef(false);

    const {
        loadOnboardingState,
        updateCounts,
        markOnboardingSeen,
        getFirstRunStage,
    } = useOnboardingStore();
    // Subscribe to the relevant slice so the dashboard re-renders when the
    // user transitions between first-run stages (e.g. tapping the demo
    // inspection flips pre_demo → post_demo immediately).
    const hasSeenDemoInspection = useOnboardingStore(
        (s) => s.hasSeenDemoInspection
    );
    const hasRealPropertiesStore = useOnboardingStore(
        (s) => s.hasRealProperties
    );

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

            // Detect demo property from inspection data so we can show the
            // demo banner without waiting on the (potentially slow) properties
            // fetch below.
            const demoFromInspections = validInspections.some((insp) =>
                isDemoProperty(insp?.unit?.property)
            );
            const realFromInspections = validInspections.some(
                (insp) =>
                    insp?.unit?.property && !isDemoProperty(insp.unit.property)
            );
            setHasDemoPropertyOnDashboard(demoFromInspections);
            setHasRealPropertyOnDashboard(realFromInspections);

            // Check onboarding after loading stats
            // Use stats property count instead of fetching all properties
            const totalProperties = Number(statsRes.data.properties) || 0;
            // Best-effort initial estimate of real-vs-demo property count
            // before the properties fetch resolves.
            const realPropertyEstimate = realFromInspections
                ? totalProperties // we know at least one real exists
                : demoFromInspections
                    ? Math.max(0, totalProperties - 1)
                    : totalProperties;
            await loadOnboardingState();
            updateCounts(totalProperties, statsRes.data.cleaners, realPropertyEstimate);
            // The OnboardingPopup modal is intentionally NOT shown for new
            // users anymore. The dashboard's inline first-run state (a single
            // FirstRunAnchorCard) replaces it — see render below.

            // Prefetch Team + Insights data in background so those screens load instantly
            useDataStore.getState().prefetchInvites();
            useDataStore.getState().prefetchInsights();

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

                    // Recompute real-vs-demo property counts now that we
                    // have authoritative data from /owner/properties.
                    const demoCount = allProperties.filter(isDemoProperty).length;
                    const realCount = allProperties.length - demoCount;
                    setHasRealPropertyOnDashboard(realCount > 0);
                    setHasDemoPropertyOnDashboard(demoCount > 0);
                    updateCounts(allProperties.length, statsRes.data.cleaners, realCount);
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
            await loadOnboardingState();
            updateCounts(0, 0);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };

    // Marks the user as having "completed" the welcome flow so the
    // legacy popup helper (kept for compatibility) never re-fires.
    const handleCloseOnboarding = () => {
        markOnboardingSeen();
    };

    const handleAddProperty = () => {
        handleCloseOnboarding();
        navigation.navigate('Properties', { screen: 'CreateProperty' });
    };

    // Mark the demo as seen as soon as the user opens any inspection
    // (real or demo). This flips the dashboard from pre_demo → post_demo
    // so the next time they're on the home screen they see the
    // "Add your first real property" anchor instead of "Watch the demo".
    const markDemoSeen = useOnboardingStore.getState().markDemoInspectionSeen;
    const handleOpenInspection = (inspection) => {
        if (!hasSeenDemoInspection) {
            // Fire-and-forget — don't make the user wait on AsyncStorage.
            markDemoSeen?.();
        }
        navigation.navigate('InspectionDetail', {
            inspectionId: inspection.id,
        });
    };

    // Find the most "interesting" demo inspection to anchor the
    // pre-demo CTA. Prefer the flagged one (it shows AI catching an
    // actual issue — the magic moment) over the passing one.
    const demoInspectionToOpen = (() => {
        const demos = recentInspections.filter((i) =>
            isDemoProperty(i?.unit?.property)
        );
        const flagged = demos.find(
            (i) => i?.airbnb_grade_analysis?.guest_ready === false
        );
        return flagged || demos[0] || null;
    })();

    const handleWatchDemo = () => {
        if (demoInspectionToOpen) {
            handleOpenInspection(demoInspectionToOpen);
        }
    };

    // Compute the first-run stage from the source of truth (the store).
    // We also fall back to the local component state because the demo /
    // real property detection happens in fetchDashboardData and is
    // mirrored into the store via updateCounts. Either source flipping
    // to true graduates us out of first-run mode.
    const firstRunStage = (() => {
        const hasReal = hasRealPropertyOnDashboard || hasRealPropertiesStore;
        if (hasReal) return FIRST_RUN_STAGES.GRADUATED;
        if (hasSeenDemoInspection) return FIRST_RUN_STAGES.POST_DEMO;
        return FIRST_RUN_STAGES.PRE_DEMO;
    })();
    const isFirstRun = firstRunStage !== FIRST_RUN_STAGES.GRADUATED;

    const getStatusConfig = (inspection) => {
        const status = inspection.status || 'UNKNOWN';
        const isReady = inspection.airbnb_grade_analysis?.guest_ready;
        const errorMsg = inspection.summary_json?.error || '';
        const isAppFailed = errorMsg.includes('blurred') || errorMsg.includes('technical');

        if (status === 'FAILED' || isAppFailed) {
            return { label: 'Failed', color: colors.status.error, backgroundColor: colors.accent.errorLightAlt };
        }
        if (status === 'COMPLETE' && isReady === false) {
            return { label: 'Cleaning Failed', color: colors.status.error, backgroundColor: colors.accent.errorLightAlt };
        }
        if (status === 'COMPLETE') {
            return { label: 'Complete', color: colors.status.success, backgroundColor: colors.accent.successLight };
        }
        if (status === 'PROCESSING') {
            return { label: 'Processing', color: colors.status.warning, backgroundColor: colors.accent.warningLight };
        }
        return { label: status, color: colors.text.secondary, backgroundColor: colors.background.secondary };
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
                <View
                    style={[
                        styles.headerContainer,
                        // When the floating quick-actions card is hidden the
                        // header doesn't need its 30px overlap margin.
                        isFirstRun && styles.headerContainerFirstRun,
                    ]}
                >
                    <LinearGradient
                        colors={colors.gradients.dashboardHeader}
                        locations={colors.gradients.dashboardHeaderLocations}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                            styles.welcomeSection,
                            { paddingTop: insets.top + 12 },
                            // No floating card → no need for 200px of
                            // paddingBottom reserved for it.
                            isFirstRun && styles.welcomeSectionFirstRun,
                        ]}
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

                    {/* Quick Actions Card — hidden during first-run to keep
                        the post-signup screen quiet and focused. Reappears
                        once the user has a real property. */}
                    {!isFirstRun && (
                        <View style={styles.quickActionsCard}>
                            <View style={styles.quickActions}>
                                <View style={styles.usageIndicatorInCard}>
                                    <UsageIndicator navigation={navigation} inCard={true} />
                                </View>

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
                                            colors={['#5AC8FA', '#0A84FF']}
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
                    )}
                </View>

                {/* First-Run Anchor: a single, prominent CTA that funnels
                    new users through one obvious path. Replaces the old
                    stack of welcome modal + demo banner + stats grid that
                    overwhelmed people. Auto-disappears once the user has a
                    real property. */}
                {firstRunStage === FIRST_RUN_STAGES.PRE_DEMO &&
                    demoInspectionToOpen && (
                        <FirstRunAnchorCard
                            variant="watch_demo"
                            onPress={handleWatchDemo}
                            eyebrow="Welcome to HostIQ"
                        />
                    )}
                {firstRunStage === FIRST_RUN_STAGES.POST_DEMO && (
                    <FirstRunAnchorCard
                        variant="add_property"
                        onPress={handleAddProperty}
                    />
                )}

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

                    {/* Stats Row — hidden during first-run. New users don't
                        have context to interpret these numbers yet, so we
                        defer them until they have a real property. */}
                    {recentInspections.length > 0 && !isFirstRun && (
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
                                        onPress={() => handleOpenInspection(inspection)}
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
                                        <View style={[styles.attentionBadge, { backgroundColor: statusConfig.backgroundColor }]}>
                                            <View style={[styles.attentionDot, { backgroundColor: statusConfig.color }]} />
                                            <Text style={[styles.attentionText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                                        </View>
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

            {/* OnboardingPopup is intentionally not rendered anymore — the
                inline FirstRunAnchorCard above replaces it. We keep the
                import / handlers so the component remains compatible if
                resurrected later for power-user "show me around" flows. */}
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
    // Compact header used in first-run mode: no floating quick-actions
    // card, so we don't need extra spacing beneath the gradient.
    headerContainerFirstRun: {
        marginBottom: 8,
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
    // First-run header has no floating card overlapping it, so we
    // collapse the 200px reservation back to a comfortable amount.
    welcomeSectionFirstRun: {
        paddingBottom: 28,
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
        fontSize: 24,                           // iOS title 1
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
        marginVertical: 12,
        marginHorizontal: -12,
    },
    usageIndicatorInCard: {
        marginTop: -4,
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