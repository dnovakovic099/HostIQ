/**
 * Application-wide constants and configuration
 */

export const SUBSCRIPTION_CONFIG = {
  FREE_IMAGE_LIMIT: 10, // Default free tier image limit
  SUBSCRIPTION_TYPES: {
    FREE: 'FREE',
    PREMIUM: 'PREMIUM',
    ENTERPRISE: 'ENTERPRISE'
  },
  PRICING: {
    MONTHLY: 5.00,
    YEARLY: 50.00
  }
};

export const FEATURE_FLAGS = {
  ENABLE_AIRBNB_DISPUTE_REPORT: true,
  ENABLE_PMS_INTEGRATION: true,
  ENABLE_ONBOARDING_POPUP: true
};
