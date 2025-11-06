import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';

export default function BillingScreen() {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, subRes, usageRes] = await Promise.all([
        api.get('/billing/plans'),
        api.get('/billing/subscription'),
        api.get('/billing/usage'),
      ]);

      setPlans(plansRes.data);
      setSubscription(subRes.data);
      setUsage(usageRes.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    try {
      await api.post('/billing/subscribe', { plan_id: planId });
      Alert.alert('Success', 'Subscription updated successfully');
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update subscription');
    }
  };

  const formatPrice = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {subscription && (
        <View style={styles.currentPlan}>
          <Text style={styles.sectionTitle}>Current Plan</Text>
          <View style={styles.planCard}>
            <Text style={styles.planName}>{subscription.plan.name}</Text>
            <Text style={styles.planPrice}>
              {formatPrice(subscription.plan.monthly_price_cents)}/month
            </Text>
            <View style={styles.planFeature}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.planFeatureText}>
                {subscription.plan.inspections_included} inspections included
              </Text>
            </View>
            <View style={styles.planFeature}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.planFeatureText}>
                {formatPrice(subscription.plan.overage_price_cents)} per additional inspection
              </Text>
            </View>
          </View>
        </View>
      )}

      {usage && (
        <View style={styles.usage}>
          <Text style={styles.sectionTitle}>This Month's Usage</Text>
          <View style={styles.usageCard}>
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Inspections Used</Text>
              <Text style={styles.usageValue}>{usage.inspections_used}</Text>
            </View>
            <View style={styles.usageRow}>
              <Text style={styles.usageLabel}>Included in Plan</Text>
              <Text style={styles.usageValue}>{usage.inspections_included}</Text>
            </View>
            {usage.overage_count > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.usageRow}>
                  <Text style={[styles.usageLabel, { color: '#FF9800' }]}>
                    Overage Inspections
                  </Text>
                  <Text style={[styles.usageValue, { color: '#FF9800' }]}>
                    {usage.overage_count}
                  </Text>
                </View>
                <View style={styles.usageRow}>
                  <Text style={styles.usageLabel}>Additional Cost</Text>
                  <Text style={styles.usageValue}>
                    {formatPrice(usage.overage_cost_cents)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      )}

      <View style={styles.plans}>
        <Text style={styles.sectionTitle}>Available Plans</Text>
        {plans.map((plan) => (
          <View
            key={plan.id}
            style={[
              styles.planOption,
              subscription?.plan_id === plan.id && styles.planOptionActive,
            ]}
          >
            <View style={styles.planOptionHeader}>
              <Text style={styles.planOptionName}>{plan.name}</Text>
              <Text style={styles.planOptionPrice}>
                {formatPrice(plan.monthly_price_cents)}
                <Text style={styles.planOptionPeriod}>/mo</Text>
              </Text>
            </View>

            <View style={styles.planOptionFeatures}>
              <View style={styles.planFeature}>
                <Ionicons name="checkmark" size={16} color="#4CAF50" />
                <Text style={styles.planFeatureTextSmall}>
                  {plan.inspections_included} inspections/month
                </Text>
              </View>
              <View style={styles.planFeature}>
                <Ionicons name="checkmark" size={16} color="#4CAF50" />
                <Text style={styles.planFeatureTextSmall}>
                  {formatPrice(plan.overage_price_cents)} per overage
                </Text>
              </View>
            </View>

            {subscription?.plan_id !== plan.id && (
              <TouchableOpacity
                style={styles.subscribeButton}
                onPress={() => handleSubscribe(plan.id)}
              >
                <Text style={styles.subscribeButtonText}>
                  {subscription ? 'Switch Plan' : 'Subscribe'}
                </Text>
              </TouchableOpacity>
            )}

            {subscription?.plan_id === plan.id && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current Plan</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This is a demo billing system. In production, this would integrate with
          Stripe or another payment processor.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  currentPlan: {
    padding: 15,
  },
  planCard: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planFeatureText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
  },
  planFeatureTextSmall: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  usage: {
    padding: 15,
    paddingTop: 0,
  },
  usageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  usageLabel: {
    fontSize: 16,
    color: '#666',
  },
  usageValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  plans: {
    padding: 15,
    paddingTop: 0,
  },
  planOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planOptionActive: {
    borderColor: '#4A90E2',
  },
  planOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  planOptionName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  planOptionPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  planOptionPeriod: {
    fontSize: 14,
    color: '#666',
  },
  planOptionFeatures: {
    marginBottom: 15,
  },
  subscribeButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  currentBadgeText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 15,
    paddingTop: 0,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});



