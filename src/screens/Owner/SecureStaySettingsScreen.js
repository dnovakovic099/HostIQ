import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import shadows from '../../theme/shadows';
import { connect, disconnect, getStatus } from '../../api/securestay';

/**
 * Owner-only screen for connecting / disconnecting the SecureStay API key.
 * Mirrors the layout of PMSSettingsScreen but stays focused on the single
 * integration so it stays under ~200 lines.
 */
export default function SecureStaySettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refreshStatus();
  }, []);

  async function refreshStatus() {
    try {
      const data = await getStatus();
      setStatus(data);
    } catch (err) {
      console.warn('SecureStay status fetch failed:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    if (!apiKey.trim()) {
      Alert.alert('Missing key', 'Paste your SecureStay API key first.');
      return;
    }
    setSubmitting(true);
    try {
      await connect(apiKey.trim());
      setApiKey('');
      await refreshStatus();
      Alert.alert('Connected', 'SecureStay key validated and saved.');
    } catch (err) {
      Alert.alert(
        'Connection failed',
        err.response?.data?.details || err.response?.data?.error || err.message
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisconnect() {
    Alert.alert('Disconnect SecureStay?', 'New cleanings will stop pulling SecureStay issues.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await disconnect();
          await refreshStatus();
        },
      },
    ]);
  }

  const connected = !!status?.connected;

  return (
    <View style={styles.outer}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerWrap, { paddingTop: insets.top }]}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerIconCircle}>
              <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>SecureStay</Text>
              <Text style={styles.headerSubtitle}>Pull issues for your properties</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary.main} style={{ marginTop: spacing.xl }} />
        ) : (
          <>
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Status</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: connected ? colors.status.success : colors.text.tertiary },
                  ]}
                />
                <Text style={styles.statusValue}>
                  {connected ? 'Connected' : 'Not connected'}
                </Text>
              </View>
              {status?.integration?.last_tested_at ? (
                <Text style={styles.statusMeta}>
                  Last verified {new Date(status.integration.last_tested_at).toLocaleString()}
                </Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {connected ? 'Replace API key' : 'Connect SecureStay'}
              </Text>
              <Text style={styles.sectionBody}>
                Paste the {`x-api-key`} value SecureStay gave you. We test the key
                against {`/issues`} before saving and store it encrypted.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="SecureStay API key"
                placeholderTextColor={colors.text.placeholder}
                value={apiKey}
                onChangeText={setApiKey}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.primaryBtn, submitting && styles.btnDisabled]}
                onPress={handleConnect}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="link" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>
                      {connected ? 'Replace key' : 'Connect'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {connected ? (
              <TouchableOpacity style={styles.dangerBtn} onPress={handleDisconnect}>
                <Ionicons name="unlink" size={18} color={colors.status.error} />
                <Text style={styles.dangerBtnText}>Disconnect SecureStay</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.background.primary },
  headerWrap: { borderBottomLeftRadius: 0, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  headerBack: { padding: spacing.xs, marginRight: spacing.sm },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerText: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: typography.fontSize.xs, marginTop: 2 },

  scroll: { padding: spacing.md, gap: spacing.md },

  statusCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  statusLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    letterSpacing: typography.letterSpacing.wide,
    marginBottom: spacing.xs,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  statusMeta: { fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing.xs },

  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionBody: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md },

  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.background.elevated,
    marginBottom: spacing.md,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#FFFFFF', fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold },

  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.status.error,
    backgroundColor: colors.background.secondary,
  },
  dangerBtnText: {
    color: colors.status.error,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
