// HostIQ Luxury Blue Brand Color System
// Inspired by Apple's design philosophy: clarity, depth, and deference
// This blue palette evokes trust, professionalism, and premium hospitality

export const colors = {
  // Primary Brand Color - Refined Luxury Blue
  primary: {
    main: '#0A7AFF',        // Vibrant premium blue (iOS system blue refined)
    light: '#4D9FFF',       // Lighter blue for hover states
    dark: '#0056D6',        // Deeper blue for pressed states
    gradient: ['#0A7AFF', '#0056D6'],
  },

  // Secondary Brand Color - Complementary Accent
  secondary: {
    main: '#5AC8FA',        // Light blue (iOS cyan) for secondary actions
    light: '#7DD5FB',       // Lighter cyan
    dark: '#32AEE8',        // Darker cyan
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
    link: '#0A7AFF',        // Links match primary blue
  },

  // Border Colors - Subtle and refined
  border: {
    light: '#E5E5EA',       // Whisper-light borders
    primary: '#B8D4F5',     // Light blue tint
    accent: '#0A7AFF',      // Accent borders
  },

  // Status Colors - iOS system palette
  status: {
    success: '#34C759',     // iOS green
    warning: '#FF9500',     // iOS orange
    error: '#FF3B30',       // iOS red
    info: '#0A7AFF',        // Matches primary
  },

  // Grade Colors (for inspection results)
  grade: {
    A: '#34C759',           // Excellent - Green
    B: '#32D74B',           // Good - Light green
    C: '#FF9500',           // Average - Orange
    D: '#FF9F0A',           // Below average - Amber
    F: '#FF3B30',           // Poor - Red
  },

  // Shadows - Refined depth (Apple-style subtlety)
  shadow: {
    soft: 'rgba(0, 0, 0, 0.04)',      // Very subtle
    medium: 'rgba(0, 0, 0, 0.08)',    // Medium depth
    strong: 'rgba(0, 0, 0, 0.12)',    // Elevated elements
    blue: 'rgba(10, 122, 255, 0.15)', // Blue shadow for primary buttons
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
    borderFocus: '#0A7AFF',
    placeholder: '#AEAEB2',
    text: '#1C1C1E',
  },

  // Button Colors
  button: {
    primary: '#0A7AFF',
    primaryHover: '#0056D6',
    secondary: 'transparent',
    disabled: '#E5E5EA',
    text: '#FFFFFF',
    textSecondary: '#0A7AFF',
  },

  // Score Colors (for cleanliness scores)
  score: {
    excellent: '#34C759',    // 9-10 - iOS Green
    good: '#0A7AFF',         // 7-8.9 - Primary Blue
    average: '#FF9500',      // 5-6.9 - iOS Orange
    poor: '#FF3B30',         // 3-4.9 - iOS Red
    critical: '#D70015',     // 0-2.9 - Darker Red
  },

  // Gradients - Refined and purposeful
  gradients: {
    primary: ['#0A7AFF', '#0056D6'],      // Primary blue gradient
    secondary: ['#5AC8FA', '#32AEE8'],    // Cyan gradient
    success: ['#34C759', '#30B350'],      // Green gradient
    warning: ['#FF9500', '#FF8800'],      // Orange gradient
    error: ['#FF3B30', '#E52B21'],        // Red gradient
    luxury: ['#0A7AFF', '#5AC8FA'],       // Blue to cyan (signature)
  },

  // Legacy compatibility
  accent: {
    success: '#34C759',
    warning: '#FF9500',
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
