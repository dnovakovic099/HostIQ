// HostIQ Luxury Ruby Brand Color System
// Inspired by Apple's design philosophy: clarity, depth, and deference
// This ruby palette evokes sophistication, passion, and premium luxury

export const colors = {
  // Primary Brand Color - Refined Luxury Ruby
  primary: {
    main: '#DC143C',        // Vibrant crimson red
    light: '#E84A6B',       // Lighter ruby for hover states
    dark: '#B8102F',        // Deeper ruby for pressed states
    gradient: ['#DC143C', '#B8102F'],
  },

  // Secondary Brand Color - Complementary Accent
  secondary: {
    main: '#FF6B9D',        // Rose pink for secondary actions
    light: '#FF8FB3',       // Lighter pink
    dark: '#E84A7F',        // Darker pink
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
    link: '#DC143C',        // Links match primary ruby
  },

  // Border Colors - Subtle and refined
  border: {
    light: '#E5E5EA',       // Whisper-light borders
    primary: '#F5C2CB',     // Light ruby tint
    accent: '#DC143C',      // Accent borders
  },

  // Status Colors - Adapted for ruby theme
  status: {
    success: '#34C759',     // iOS green
    warning: '#FF9500',     // iOS orange
    error: '#DC143C',       // Ruby red (brand consistent)
    info: '#0A7AFF',        // iOS blue
  },

  // Grade Colors (for inspection results)
  grade: {
    A: '#34C759',           // Excellent - Green
    B: '#32D74B',           // Good - Light green
    C: '#FF9500',           // Average - Orange
    D: '#FF9F0A',           // Below average - Amber
    F: '#DC143C',           // Poor - Ruby red
  },

  // Shadows - Refined depth (Apple-style subtlety)
  shadow: {
    soft: 'rgba(0, 0, 0, 0.04)',      // Very subtle
    medium: 'rgba(0, 0, 0, 0.08)',    // Medium depth
    strong: 'rgba(0, 0, 0, 0.12)',    // Elevated elements
    blue: 'rgba(220, 20, 60, 0.15)',  // Ruby shadow for primary buttons
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
    borderFocus: '#DC143C',
    placeholder: '#AEAEB2',
    text: '#1C1C1E',
  },

  // Button Colors
  button: {
    primary: '#DC143C',
    primaryHover: '#B8102F',
    secondary: 'transparent',
    disabled: '#E5E5EA',
    text: '#FFFFFF',
    textSecondary: '#DC143C',
  },

  // Score Colors (for cleanliness scores)
  score: {
    excellent: '#34C759',    // 9-10 - iOS Green
    good: '#0A7AFF',         // 7-8.9 - Blue
    average: '#FF9500',      // 5-6.9 - iOS Orange
    poor: '#DC143C',         // 3-4.9 - Ruby Red
    critical: '#B8102F',     // 0-2.9 - Darker Ruby
  },

  // Gradients - Refined and purposeful
  gradients: {
    primary: ['#DC143C', '#B8102F'],      // Primary ruby gradient
    secondary: ['#FF6B9D', '#E84A7F'],    // Pink gradient
    success: ['#34C759', '#30B350'],      // Green gradient
    warning: ['#FF9500', '#FF8800'],      // Orange gradient
    error: ['#DC143C', '#B8102F'],        // Ruby gradient
    luxury: ['#DC143C', '#FF6B9D'],       // Ruby to pink (signature)
  },

  // Legacy compatibility
  accent: {
    success: '#34C759',
    warning: '#FF9500',
    error: '#DC143C',
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
