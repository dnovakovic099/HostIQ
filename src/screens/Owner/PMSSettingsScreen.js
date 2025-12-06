import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';
import colors from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const PMS_PROVIDERS = [
  { id: 'HOSTIFY', name: 'Hostify', available: true },
  { id: 'HOSTAWAY', name: 'Hostaway', available: false }
];

export default function PMSSettingsScreen({ navigation }) {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/pms/integrations');
      setIntegrations(response.data.integrations || []);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      Alert.alert('Error', 'Failed to load PMS integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter your API key');
      return;
    }

    try {
      setConnecting(true);
      const response = await api.post('/pms/connect', {
        provider: selectedProvider,
        apiKey: apiKey.trim()
      });

      if (response.data.success) {
        Alert.alert('Success', `Connected to ${selectedProvider} successfully!`);
        setShowConnectModal(false);
        setApiKey('');
        setSelectedProvider(null);
        await fetchIntegrations();
      }
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to connect to PMS');
    } finally {
      setConnecting(false);
    }
  };

  const [syncStatus, setSyncStatus] = useState(null);

  const handleSync = async (integrationId) => {
    try {
      setSyncing(true);
      setSyncStatus('Starting sync...');
      
      // Start background sync
      const response = await api.post(`/pms/${integrationId}/sync`);
      
      if (response.data.success && response.data.jobId) {
        const jobId = response.data.jobId;
        
        // Poll for status
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await api.get(`/pms/sync-status/${jobId}`);
            const status = statusResponse.data;
            
            setSyncStatus(status.message || 'Syncing...');
            
            if (status.status === 'completed') {
              clearInterval(pollInterval);
              setSyncing(false);
              setSyncStatus(null);
        Alert.alert(
          'Sync Complete',
                `Synced ${status.total} listings with ${status.airbnbUrlsFound} Airbnb URLs`
        );
        await fetchIntegrations();
            } else if (status.status === 'failed') {
              clearInterval(pollInterval);
              setSyncing(false);
              setSyncStatus(null);
              Alert.alert('Sync Failed', status.message);
            }
          } catch (pollError) {
            console.error('Poll error:', pollError);
          }
        }, 2000); // Poll every 2 seconds
        
        // Timeout after 10 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          if (syncing) {
            setSyncing(false);
            setSyncStatus(null);
            Alert.alert('Sync Running', 'Sync is still running in background. Check back later.');
          }
        }, 600000);
      }
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to start sync');
      setSyncing(false);
      setSyncStatus(null);
    }
  };

  const handleDisconnect = (integration) => {
    Alert.alert(
      'Disconnect PMS',
      `Are you sure you want to disconnect ${integration.provider}? This will remove all synced listings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/pms/${integration.id}`);
              Alert.alert('Success', 'PMS disconnected successfully');
              await fetchIntegrations();
            } catch (error) {
              Alert.alert('Error', 'Failed to disconnect PMS');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (showConnectModal) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => {
          setShowConnectModal(false);
          setSelectedProvider(null);
          setApiKey('');
        }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Connect to PMS</Text>

        {!selectedProvider ? (
          <View style={styles.providersContainer}>
            {PMS_PROVIDERS.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                style={[
                  styles.providerCard,
                  !provider.available && styles.providerCardDisabled
                ]}
                onPress={() => provider.available && setSelectedProvider(provider.id)}
                disabled={!provider.available}
              >
                <Text style={styles.providerName}>{provider.name}</Text>
                {!provider.available && (
                  <Text style={styles.comingSoon}>Coming Soon</Text>
                )}
                <Ionicons 
                  name="chevron-forward" 
                  size={24} 
                  color={provider.available ? colors.text : colors.disabled} 
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.apiKeyForm}>
            <Text style={styles.providerTitle}>
              {PMS_PROVIDERS.find(p => p.id === selectedProvider)?.name}
            </Text>
            
            <Text style={styles.instructionText}>
              Enter your API key from {selectedProvider}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="API Key"
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.connectButton, connecting && styles.connectButtonDisabled]}
              onPress={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.connectButtonText}>Connect</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>PMS Integrations</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowConnectModal(true)}
        >
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {integrations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={64} color={colors.disabled} />
          <Text style={styles.emptyText}>No PMS integrations connected</Text>
          <Text style={styles.emptySubtext}>
            Connect to Hostify or Hostaway to sync your listings
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setShowConnectModal(true)}
          >
            <Text style={styles.emptyButtonText}>Connect PMS</Text>
          </TouchableOpacity>
        </View>
      ) : (
        integrations.map((integration) => (
          <View key={integration.id} style={styles.integrationCard}>
            <View style={styles.integrationHeader}>
              <View style={styles.integrationInfo}>
                <Text style={styles.integrationProvider}>{integration.provider}</Text>
                <Text style={styles.integrationStatus}>
                  {integration.is_active ? '● Active' : '○ Inactive'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDisconnect(integration)}>
                <Ionicons name="close-circle-outline" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>

            <View style={styles.integrationStats}>
              <Text style={styles.statsText}>
                {integration.pms_properties.length} properties synced
              </Text>
              {integration.last_sync_at && (
                <Text style={styles.statsText}>
                  Last sync: {new Date(integration.last_sync_at).toLocaleDateString()}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
              onPress={() => handleSync(integration.id)}
              disabled={syncing}
            >
              {syncing ? (
                <>
                <ActivityIndicator color={colors.primary} size="small" />
                  {syncStatus && (
                    <Text style={styles.syncStatusText}>{syncStatus}</Text>
                  )}
                </>
              ) : (
                <>
                  <Ionicons name="sync" size={20} color={colors.primary} />
                  <Text style={styles.syncButtonText}>Sync Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  addButton: {
    padding: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  providersContainer: {
    marginTop: spacing.lg,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  providerCardDisabled: {
    opacity: 0.5,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  comingSoon: {
    fontSize: 14,
    color: '#9CA3AF',
    marginRight: spacing.sm,
  },
  apiKeyForm: {
    marginTop: spacing.xl,
  },
  providerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: spacing.md,
  },
  instructionText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: 12,
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  connectButton: {
    backgroundColor: '#4A90E2',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  integrationCard: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  integrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  integrationInfo: {
    flex: 1,
  },
  integrationProvider: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  integrationStatus: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  integrationStats: {
    marginBottom: spacing.md,
  },
  statsText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    padding: spacing.md,
    borderRadius: 10,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: spacing.xs,
  },
  syncStatusText: {
    fontSize: 12,
    color: '#4A90E2',
    marginLeft: spacing.xs,
    flex: 1,
  },
});

