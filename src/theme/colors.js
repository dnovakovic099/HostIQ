// HostIQ Luxury Golden Brand Color System
// Inspired by Apple's design philosophy: clarity, depth, and deference
// This golden palette evokes premium quality, elegance, and timeless luxury

export const colors = {
  // Primary Brand Color - Refined Luxury Golden
  primary: {
    main: '#D4AF37',        // Classic golden hue
    light: '#E5C158',       // Lighter gold for hover states
    dark: '#B8941F',        // Deeper gold for pressed states
    gradient: ['#D4AF37', '#B8941F'],
  },

  // Secondary Brand Color - Complementary Accent
  secondary: {
    main: '#F0AD4E',        // Warm amber for secondary actions
    light: '#F5C26B',       // Lighter amber
    dark: '#D89533',        // Darker amber
  },

  // Background Colors - Clean and spacious
  background: {
    primary: '#F8F9FA',     // Softer warm white
    card: '#FFFFFF',        // Pure white for cards
    secondary: '#F3F4F6',   // Subtle gray for sections
    dark: '#000000',        // True black for dark mode
  },

  // Text Colors - Apple-inspired hierarchy
  text: {
    primary: '#1C1C1E',     // Near black (Apple standard)
    secondary: '#6C6C70',   // Medium gray
    tertiary: '#AEAEB2',    // Light gray
    muted: '#C7C7CC',       // Very light gray for disclaimers
    inverse: '#FFFFFF',     // White on dark
    link: '#D4AF37',        // Links match primary golden
  },

  // Border Colors - Subtle and refined
  border: {
    light: '#E5E5EA',       // Whisper-light borders
    primary: '#F5E6C3',     // Light golden tint
    accent: '#D4AF37',      // Accent borders
  },

  // Status Colors - Adapted for golden theme
  status: {
    success: '#34C759',     // iOS green
    warning: '#F0AD4E',     // Golden amber (brand consistent)
    error: '#FF3B30',       // iOS red
    info: '#0A7AFF',        // iOS blue
  },

  // Grade Colors (for inspection results)
  grade: {
    A: '#34C759',           // Excellent - Green
    B: '#32D74B',           // Good - Light green
    C: '#F0AD4E',           // Average - Golden amber
    D: '#FF9F0A',           // Below average - Orange
    F: '#FF3B30',           // Poor - Red
  },

  // Shadows - Refined depth (Apple-style subtlety)
  shadow: {
    soft: 'rgba(0, 0, 0, 0.04)',      // Very subtle
    medium: 'rgba(0, 0, 0, 0.08)',    // Medium depth
    strong: 'rgba(0, 0, 0, 0.12)',    // Elevated elements
    blue: 'rgba(212, 175, 55, 0.15)', // Golden shadow for primary buttons
  },

  // Overlay Colors
  overlay: {
    light: 'rgba(0, 0, 0, 0.25)',
    medium: 'rgba(0, 0, 0, 0.45)',
    dark: 'rgba(0, 0, 0, 0.65)',
  },

  // Input Colors
  input: {
    background: '#FFFFFF',
    border: '#E5E5EA',
    borderFocus: '#D4AF37',
    placeholder: '#AEAEB2',
    text: '#1C1C1E',
  },

  // Button Colors
  button: {
    primary: '#D4AF37',
    primaryHover: '#B8941F',
    secondary: 'transparent',
    disabled: '#E5E5EA',
    text: '#FFFFFF',
    textSecondary: '#D4AF37',
  },

  // Score Colors (for cleanliness scores)
  score: {
    excellent: '#34C759',    // 9-10 - iOS Green
    good: '#0A7AFF',         // 7-8.9 - Blue
    average: '#F0AD4E',      // 5-6.9 - Golden amber
    poor: '#FF3B30',         // 3-4.9 - Red
    critical: '#D70015',     // 0-2.9 - Darker Red
  },

  // Gradients - Refined and purposeful
  gradients: {
    primary: ['#D4AF37', '#B8941F'],      // Primary golden gradient
    secondary: ['#F0AD4E', '#D89533'],    // Amber gradient
    success: ['#34C759', '#30B350'],      // Green gradient
    warning: ['#F0AD4E', '#D89533'],      // Amber gradient
    error: ['#FF3B30', '#E52B21'],        // Red gradient
    luxury: ['#D4AF37', '#F0AD4E'],       // Golden to amber (signature)
  },

  // Legacy compatibility
  accent: {
    success: '#34C759',
    warning: '#F0AD4E',
    error: '#FF3B30',
    info: '#0A7AFF',
  },

  // Neutral scale - Systematic and balanced
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
};

// Helper function to get score color based on value
export const getScoreColor = (score) => {
  if (score >= 9) return colors.score.excellent;
  if (score >= 7) return colors.score.good;
  if (score >= 5) return colors.score.average;
  if (score >= 3) return colors.score.poor;
  return colors.score.critical;
};

// Helper function to get grade color
export const getGradeColor = (grade) => {
  return colors.grade[grade] || colors.text.secondary;
};

export default colors;
