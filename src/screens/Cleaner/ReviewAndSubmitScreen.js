import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ReviewAndSubmitScreen({ route, navigation }) {
  const { inspection } = route.params;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
          <Text style={styles.successTitle}>Inspection Submitted!</Text>
          <Text style={styles.successText}>
            Your inspection has been submitted for processing.
          </Text>
          <Text style={styles.successSubtext}>
            Results will be available shortly.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>What happens next?</Text>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Processing</Text>
              <Text style={styles.stepText}>
                Your photos and videos are analyzed by AI
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Analysis</Text>
              <Text style={styles.stepText}>
                Cleanliness score and issues are identified
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Results</Text>
              <Text style={styles.stepText}>
                Report is sent to property owner
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={24} color="#FF9800" />
          <Text style={styles.tipText}>
            Processing typically takes 2-5 minutes depending on the amount of media uploaded.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('CleanerHome')}
        >
          <Text style={styles.buttonText}>Back to Jobs</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  successCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  successText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  successSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    color: '#666',
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  footer: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});









