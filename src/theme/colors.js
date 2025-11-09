// HostIQ Brand Color System
// To change the app theme, modify these color values

export const colors = {
  // Primary Brand Color - HostIQ Blue
  primary: {
    main: '#4A90E2',        // HostIQ Blue
    light: '#6BA3E8',       // Lighter blue for hover states
    dark: '#3D7FD9',        // Darker blue for pressed states
    gradient: ['#4A90E2', '#3D7FD9'],
  },
  
  // Secondary Brand Color
  secondary: {
    main: '#34C759',        // Green (for secondary actions)
    light: '#5DD97C',       // Lighter green
    dark: '#2D9F4B',        // Darker green
  },
  
  // Background Colors
  background: {
    primary: '#F8F9FB',     // Gentle warm white with contrast
    card: '#FFFFFF',        // Clean floating cards
    secondary: '#F5F6F8',   // Slightly darker for sections
    dark: '#0A0A0A',        // Dark mode (if needed)
  },
  
  // Text Colors
  text: {
    primary: '#1C1C1E',     // Crisp black-charcoal (Apple tone)
    secondary: '#6E6E73',   // Light gray for subtitles
    tertiary: '#A1A1AA',    // Light gray text
    muted: '#A1A1AA',       // For disclaimers, tertiary text
    inverse: '#FFFFFF',     // White text on dark backgrounds
    link: '#4A90E2',        // Links match primary blue
  },
  
  // Border Colors
  border: {
    light: '#E5E5EA',       // Subtle borders
    primary: '#D0E2FA',     // Light blue borders for outline buttons
    accent: '#4A90E2',      // Accent borders
  },
  
  // Status Colors
  status: {
    success: '#34C759',     // Green (Apple system)
    warning: '#FFCC00',     // Yellow (Apple system)
    error: '#FF3B30',       // Red (Apple system)
    info: '#4A90E2',        // Blue (matches primary)
  },
  
  // Grade Colors (for inspection results)
  grade: {
    A: '#34C759',           // Excellent - Green
    B: '#84CC16',           // Good - Light green
    C: '#FFCC00',           // Average - Yellow
    D: '#F97316',           // Below average - Orange
    F: '#FF3B30',           // Poor - Red
  },
  
  // Shadows
  shadow: {
    soft: 'rgba(0, 0, 0, 0.08)',      // Soft depth under buttons/cards
    medium: 'rgba(0, 0, 0, 0.12)',    // Medium shadow
    strong: 'rgba(0, 0, 0, 0.16)',    // Stronger shadow for modals
    blue: 'rgba(74, 144, 226, 0.2)',  // Blue shadow for primary buttons
  },
  
  // Overlay Colors
  overlay: {
    light: 'rgba(0, 0, 0, 0.3)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.7)',
  },
  
  // Input Colors
  input: {
    background: '#FFFFFF',
    border: '#E5E5EA',
    borderFocus: '#4A90E2',
    placeholder: '#A1A1AA',
    text: '#1C1C1E',
  },
  
  // Button Colors
  button: {
    primary: '#4A90E2',
    primaryHover: '#3D7FD9',
    secondary: 'transparent',
    disabled: '#D1D5DB',
    text: '#FFFFFF',
    textSecondary: '#4A90E2',
  },
  
  // Score Colors (for cleanliness scores) - iOS native palette
  score: {
    excellent: '#34C759',    // 9-10 - iOS Green
    good: '#007AFF',         // 7-8.9 - iOS Blue
    average: '#FF9500',      // 5-6.9 - iOS Orange
    poor: '#FF3B30',         // 3-4.9 - iOS Red
    critical: '#D70015',     // 0-2.9 - Darker Red
  },
  
  // Gradients (for buttons, FABs, headers)
  gradients: {
    primary: ['#4A90E2', '#3D7FD9'],      // HostIQ Blue gradient
    secondary: ['#34C759', '#2D9F4B'],    // Green gradient (same as success)
    success: ['#34C759', '#2D9F4B'],      // Green gradient
    warning: ['#FFCC00', '#FFB800'],      // Yellow gradient
    error: ['#FF3B30', '#E52B21'],        // Red gradient
    sunset: ['#FF6B6B', '#FF8E53'],       // Orange/Pink gradient for variety
  },
  
  // Legacy color mappings (for older theme system compatibility)
  accent: {
    success: '#34C759',
    warning: '#FFCC00',
    error: '#FF3B30',
    info: '#4A90E2',
  },
  
  // Neutral colors (for borders, dividers, backgrounds)
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
  if (score >= 9) return colors.score.excellent;   // 9-10: Green
  if (score >= 7) return colors.score.good;        // 7-8.9: Blue
  if (score >= 5) return colors.score.average;     // 5-6.9: Orange
  if (score >= 3) return colors.score.poor;        // 3-4.9: Red
  return colors.score.critical;                    // 0-2.9: Dark Red
};

// Helper function to get grade color
export const getGradeColor = (grade) => {
  return colors.grade[grade] || colors.text.secondary;
};

export default colors;
