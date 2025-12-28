import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function SetupPopup({ visible, onClose, onAddProperty, onAddCleaner }) {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <LinearGradient
                        colors={['#3B82F6', '#2563EB']}
                        style={styles.header}
                    >
                        <View style={styles.iconCircle}>
                            <Ionicons name="rocket" size={32} color="#FFFFFF" />
                        </View>
                        <Text style={styles.title}>Welcome to HostIQ!</Text>
                        <Text style={styles.subtitle}>Let's get your account set up in two simple steps.</Text>
                    </LinearGradient>

                    <View style={styles.content}>
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={onAddProperty}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#E1EFFF' }]}>
                                <Ionicons name="home" size={24} color="#3B82F6" />
                            </View>
                            <View style={styles.actionTextContainer}>
                                <Text style={styles.actionTitle}>Add Your First Property</Text>
                                <Text style={styles.actionDescription}>Start managing your rentals with ease.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={onAddCleaner}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
                                <Ionicons name="people" size={24} color="#10B981" />
                            </View>
                            <View style={styles.actionTextContainer}>
                                <Text style={styles.actionTitle}>Invite Your Cleaner</Text>
                                <Text style={styles.actionDescription}>Connect with your team for inspections.</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={onClose}
                        >
                            <Text style={styles.closeBtnText}>I'll do it later</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    header: {
        padding: 30,
        alignItems: 'center',
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        lineHeight: 20,
    },
    content: {
        padding: 24,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionTextContainer: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 2,
    },
    actionDescription: {
        fontSize: 12,
        color: '#64748B',
    },
    closeBtn: {
        marginTop: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    closeBtnText: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '600',
    },
});
