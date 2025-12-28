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
import api from '../../api/client';
import UsageIndicator from '../../components/UsageIndicator';
import SetupPopup from '../../components/SetupPopup';

const { width } = Dimensions.get('window');

// Modern premium color palette
const COLORS = {
    background: '#F1F5F9',
    card: '#FFFFFF',
    cardBorder: 'rgba(15, 23, 42, 0.08)',
    cardShadow: 'rgba(15, 23, 42, 0.1)',
    text: {
        primary: '#0F172A',
        secondary: '#64748B',
        tertiary: '#94A3B8',
    },
    accent: '#3B82F6',
    border: '#0c4b8fff',
    accentLight: 'rgba(59, 130, 246, 0.1)',
    success: '#10B981',
    successLight: 'rgba(16, 185, 129, 0.1)',
    warning: '#F59E0B',
    warningLight: 'rgba(245, 158, 11, 0.1)',
    error: '#EF4444',
    errorBin: '#FF3B30',
    errorLight: 'rgba(239, 68, 68, 0.1)',
    divider: '#E2E8F0',
    overlay: 'rgba(15, 23, 42, 0.4)',
};

export default function OwnerDashboardScreen({ navigation }) {
    const [stats, setStats] = useState({
        properties: 0,
        units: 0,
        cleaners: 0,
        inspections_today: 0,
    });
    const [recentInspections, setRecentInspections] = useState([]);
    const [lowRatingProperties, setLowRatingProperties] = useState([]);
    const [userName, setUserName] = useState('Owner');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showSetupPopup, setShowSetupPopup] = useState(false);
    const lastFetchTime = useRef(0);

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
            const statsRes = await api.get('/owner/stats');
            const inspectionsRes = await api.get('/owner/inspections/recent?limit=5');
            const propertiesRes = await api.get('/owner/properties');

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

            const properties = Array.isArray(propertiesRes.data) ? propertiesRes.data : [];
            const lowRated = properties.filter(prop => prop.hasLowRating);
            setLowRatingProperties(lowRated);

            // Show setup popup if no properties or no cleaners
            if (properties.length === 0 || statsRes.data.cleaners === 0) {
                setShowSetupPopup(true);
            }

            // Fetch user profile for name
            try {
                const userRes = await api.get('/auth/me');
                if (userRes.data && userRes.data.name) {
                    setUserName(userRes.data.name.split(' ')[0]); // Get first name
                }
            } catch (error) {
                console.log('Could not fetch user name:', error);
            }
        } catch (error) {
            console.error('Dashboard error:', error);
            setStats({ properties: 0, units: 0, cleaners: 0, inspections_today: 0 });
            setRecentInspections([]);
            setLowRatingProperties([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };

    const getStatusConfig = (inspection) => {
        const status = inspection.status || 'UNKNOWN';
        const isReady = inspection.airbnb_grade_analysis?.guest_ready;
        const errorMsg = inspection.summary_json?.error || '';
        const isAppFailed = errorMsg.includes('blurred') || errorMsg.includes('technical');

        if (status === 'FAILED' || isAppFailed) {
            return { label: 'Failed', color: '#FF3B30' };
        }
        if (status === 'COMPLETE' && isReady === false) {
            return { label: 'Cleaning Failed', color: '#FF3B30' };
        }
        if (status === 'COMPLETE') {
            return { label: 'Complete', color: '#34C759' };
        }
        if (status === 'PROCESSING') {
            return { label: 'Processing', color: '#FF9500' };
        }
        return { label: status, color: '#8E8E93' };
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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
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
                        colors={['#B8D4E8', '#A8C5E0', '#8BB3D6', '#6FA0CC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.welcomeSection}
                    >
                        {/* Animated decorative elements */}
                        <View style={styles.decorativeCircle1}>
                            <Ionicons name="home" size={100} color="rgba(66, 165, 245, 0.22)" />
                        </View>
                        <View style={styles.decorativeCircle2}>
                            <Ionicons name="business" size={70} color="rgba(66, 165, 245, 0.22)" />
                        </View>
                        <View style={styles.decorativeCircle3}>
                            <Ionicons name="bed" size={50} color="rgba(33, 150, 243, 0.20)" />
                        </View>

                        <View style={styles.welcomeContent}>
                            <Text style={styles.welcomeGreeting}>Hello, </Text>
                            <Text style={styles.welcomeName}>{userName}!</Text>
                        </View>
                        <Text style={styles.welcomeSubtitle}>Manage your properties with ease</Text>
                    </LinearGradient>

                    {/* Quick Actions Card - Floating above header */}
                    <View style={styles.quickActionsCard}>
                        <View style={styles.quickActions}>
                            <TouchableOpacity
                                style={styles.quickActionBtn}
                                onPress={() => navigation.navigate('Properties', { screen: 'CreateProperty' })}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={['#A8D5E2', '#7EC8E3']}
                                    style={styles.quickActionCircle}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="home" size={22} color="#FFFFFF" />
                                </LinearGradient>
                                <Text style={styles.quickActionText}>Property</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.quickActionBtn}
                                onPress={() => navigation.navigate('ManageCleaners')}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={['#D4C5F9', '#B794F6']}
                                    style={styles.quickActionCircle}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="people" size={20} color="#FFFFFF" />
                                </LinearGradient>
                                <Text style={styles.quickActionText}>Team</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.quickActionBtn}
                                onPress={() => navigation.navigate('SubscriptionManagement')}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={['#FFD4C4', '#FFB8A3']}
                                    style={styles.quickActionCircle}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="card" size={20} color="#FFFFFF" />
                                </LinearGradient>
                                <Text style={styles.quickActionText}>Plans</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.quickActionBtn}
                                onPress={() => navigation.navigate('Insights')}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={['#C4D7FF', '#93C5FD']}
                                    style={styles.quickActionCircle}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="analytics" size={20} color="#FFFFFF" />
                                </LinearGradient>
                                <Text style={styles.quickActionText}>Issues</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Usage Section */}
                <View style={styles.usageSection}>
                    <View style={styles.usageCard}>
                        <UsageIndicator navigation={navigation} />
                    </View>
                </View>

                {/* Low Rating Alert */}
                {
                    lowRatingProperties.length > 0 && (
                        <View style={styles.section}>
                            <LinearGradient
                                colors={['#FEF2F2', '#FFFFFF']}
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
                                        colors={['#FEE2E2', '#FECACA']}
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
                            <Text style={styles.viewAllText}>View All {">"}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{recentInspections.length}</Text>
                            <Text style={styles.statLabel}>TOTAL</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: '#3B82F6' }]}>
                                {(recentInspections.reduce((acc, curr) => acc + (curr.cleanliness_score || 0), 0) / (recentInspections.length || 1)).toFixed(1)}
                            </Text>
                            <Text style={styles.statLabel}>AVG SCORE</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: '#10B981' }]}>
                                {recentInspections.filter(i => i.status === 'COMPLETE').length}
                            </Text>
                            <Text style={styles.statLabel}>COMPLETE</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
                                {recentInspections.filter(i => i.status === 'PROCESSING').length}
                            </Text>
                            <Text style={styles.statLabel}>PROCESSING</Text>
                        </View>
                    </View>

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
                                <TouchableOpacity
                                    key={inspection.id}
                                    style={styles.inspectionCard}
                                    onPress={() => navigation.navigate('InspectionDetail', { inspectionId: inspection.id })}
                                    activeOpacity={0.6}
                                >
                                    <View style={styles.cardBody}>
                                        <View style={styles.cardContent}>
                                            {/* Top Row: Property Info + Score */}
                                            <View style={styles.cardTopRow}>
                                                <View style={styles.propertyInfo}>
                                                    <Text style={styles.propertyName} numberOfLines={1}>{propertyName}</Text>
                                                    <Text style={styles.unitName}>{unitName}</Text>
                                                </View>

                                                {score != null && score > 0 && (
                                                    <View style={styles.scoreDisplay}>
                                                        <Text style={styles.scoreValue}>{score.toFixed(1)}</Text>
                                                        <Text style={styles.scoreMax}>/10</Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Meta Row */}
                                            <View style={styles.metaRow}>
                                                <Text style={styles.metaText}>{cleanerName}</Text>
                                                <View style={styles.metaDot} />
                                                <Text style={styles.metaText}>{formatDate(inspection.created_at)}</Text>
                                                <View style={styles.metaDot} />
                                                <Ionicons name="camera-outline" size={12} color={COLORS.text.tertiary} />
                                                <Text style={styles.metaText}> {mediaCount} photos</Text>
                                            </View>

                                            {/* Status Row */}
                                            <View style={styles.statusRow}>
                                                <View style={[styles.statusDotSmall, { backgroundColor: statusConfig.color }]} />
                                                <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                                                    {statusConfig.label === 'Cleaning Failed' ? 'Attention' : statusConfig.label}
                                                </Text>
                                            </View>

                                            {/* Airbnb Dispute Report Button */}
                                            <TouchableOpacity
                                                style={styles.disputeBtn}
                                                onPress={() => navigation.navigate('AirbnbDisputeReport', { inspectionId: inspection.id })}
                                            >
                                                <Ionicons name="document-text-outline" size={16} color="#3B82F6" />
                                                <Text style={styles.disputeBtnText}>Airbnb Dispute Report</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>

                <View style={styles.bottomPadding} />
            </ScrollView >

            <SetupPopup
                visible={showSetupPopup}
                onClose={() => setShowSetupPopup(false)}
                onAddProperty={() => {
                    setShowSetupPopup(false);
                    navigation.navigate('Properties', { screen: 'CreateProperty' });
                }}
                onAddCleaner={() => {
                    setShowSetupPopup(false);
                    navigation.navigate('ManageCleaners');
                }}
            />
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
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
        marginBottom: 20,
    },
    // Welcome Section
    welcomeSection: {
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
        paddingBottom: 100,
        paddingLeft: 24,
        paddingRight: 24,
        position: 'relative',
        overflow: 'hidden',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        marginHorizontal: 0,
        marginBottom: 0,
    },
    welcomeContent: {
        flexDirection: 'row',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        zIndex: 1,
        marginBottom: 8,
    },
    welcomeGreeting: {
        fontSize: 28,
        fontWeight: '400',
        color: 'rgba(47, 47, 47, 0.95)',
    },
    welcomeName: {
        fontSize: 28,
        fontWeight: '700',
        color: 'rgba(47, 47, 47, 0.95)',
    },
    welcomeSubtitle: {
        fontSize: 15,
        fontWeight: '500',
        color: 'rgba(90, 89, 89, 0.95)',
        marginTop: 4,
        zIndex: 1,
    },
    decorativeCircle1: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        top: 60,
        right: 80,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 0,
    },
    // Usage Section
    usageSection: {
        paddingHorizontal: 16,
        marginTop: 50,
    },
    usageCard: {
        backgroundColor: COLORS.card,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.05)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    // Section
    section: {
        paddingHorizontal: 16,
        marginTop: 40,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.text.primary,
        letterSpacing: -0.6,
    },
    sectionTitleUnderline: {
        width: 60,
        height: 4,
        backgroundColor: COLORS.accent,
        borderRadius: 2,
        marginTop: 6,
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
        bottom: -35,
        left: 16,
        right: 16,
        backgroundColor: COLORS.card,
        borderRadius: 20,
        paddingVertical: 18,
        paddingHorizontal: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
            },
            android: {
                elevation: 8,
            },
        }),
        borderWidth: 1,
        borderColor: 'rgba(15, 23, 42, 0.06)',
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    quickActionBtn: {
        alignItems: 'center',
        flex: 1,
    },
    quickActionCircle: {
        width: 55,
        height: 55,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.18,
                shadowRadius: 6,
            },
            android: {
                elevation: 3,
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
        borderRadius: 20,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 0,
        ...Platform.select({
            ios: {
                shadowColor: COLORS.cardShadow,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 24,
            },
            android: {
                elevation: 6,
            },
        }),
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
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    morePhotosText: {
        color: '#FFF',
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
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    propertyInfo: {
        flex: 1,
        marginRight: 12,
    },
    propertyName: {
        fontSize: 19,
        fontWeight: '800',
        color: COLORS.text.primary,
        letterSpacing: -0.5,
    },
    unitName: {
        fontSize: 14,
        color: COLORS.text.secondary,
        marginTop: 4,
        fontWeight: '500',
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
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
        paddingHorizontal: 10,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text.primary,
    },
    statLabel: {
        fontSize: 10,
        color: COLORS.text.tertiary,
        fontWeight: '700',
        marginTop: 4,
    },
    scoreDisplay: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 6,
    },
    statusDotSmall: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    disputeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F7FF',
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 15,
        gap: 8,
        borderWidth: 1,
        borderColor: '#E1EFFF',
    },
    disputeBtnText: {
        color: '#3B82F6',
        fontSize: 14,
        fontWeight: '600',
    },
    bottomPadding: {
        height: 100,
    },
});