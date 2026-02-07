// HostIQ Brand Color System - Apple HIG Aligned
// Vibrant, Energetic, Premium Design System for Property Management

export const colors = {
  // ============================================
  // PRIMARY BRAND COLORS - Vibrant, Energetic Blues
  // ============================================
  primary: {
    main: '#0A84FF',           // Vibrant iOS blue - energetic and premium
    light: '#5AC8FA',          // Bright, energetic accent
    lighter: '#A6D5FF',        // Very light for backgrounds
    dark: '#0066CC',           // Rich, sophisticated
    gradient: ['#0A84FF', '#0066CC'],  // Energetic gradient
    vibrant: '#0095FF',        // Extra vibrant for CTAs
  },

  secondary: {
    main: '#34C759',           // iOS system green
    light: '#5DD97C',
    dark: '#28A745',
    vibrant: '#32D74B',        // More vibrant green
  },

  // ============================================
  // BACKGROUND COLORS - Softer, more refined
  // ============================================
  background: {
    primary: '#F2F2F7',        // iOS system background
    secondary: '#FFFFFF',
    card: '#FFFFFF',
    elevated: '#FAFAFA',       // Subtle elevation
    grouped: '#F2F2F7',
    lightBlue: '#EBF5FF',      // More subtle blue tint
    lightBlue2: '#E3F2FD',
    lightBlue3: '#E8F4FD',
    lightBlue4: '#F0F8FF',
    lightGreen: '#ECFDF5',
    lightYellow: '#FFFBEA',
    lightRed: '#FFF5F5',
    offWhite: '#FAFAFA',
    gray: '#F2F2F7',
    warmGray: '#F5F5F5',
    coolGray: '#F8F9FA',
    dark: '#1C1C1E',           // Softer dark (iOS standard)
    darkElevated: '#2C2C2E',   // Elevated dark surface
    darkGrouped: '#1C1C1E',
  },

  // ============================================
  // TEXT COLORS - WCAG AAA compliant
  // ============================================
  text: {
    primary: '#000000',        // True black for maximum contrast
    secondary: '#3C3C43',      // iOS label secondary (60% opacity)
    tertiary: '#8E8E93',       // iOS label tertiary (30% opacity)
    quaternary: '#C7C7CC',     // iOS label quaternary
    muted: '#AEAEB2',
    inverse: '#FFFFFF',
    link: '#007AFF',           // iOS system blue
    placeholder: '#C7C7CC',
  },

  // ============================================
  // BORDER COLORS - Subtle iOS-style separators
  // ============================================
  border: {
    light: '#E5E5EA',          // iOS separator light
    primary: '#C7E0FF',
    accent: '#007AFF',
    slate: '#D1D1D6',
    divider: '#E5E5EA',
    opaque: 'rgba(60, 60, 67, 0.29)', // iOS separator opaque
  },

  // ============================================
  // STATUS COLORS - iOS system semantic colors
  // ============================================
  status: {
    success: '#34C759',            // iOS green
    successDark: '#28A745',
    warning: '#FF9500',            // iOS orange
    error: '#FF3B30',              // iOS red
    info: '#007AFF',               // iOS blue
  },

  // ============================================
  // BUTTON COLORS - Apple standards
  // ============================================
  button: {
    primary: '#007AFF',
    primaryHover: '#0051D5',
    secondary: 'transparent',
    disabled: '#C7C7CC',
    text: '#FFFFFF',
    textSecondary: '#007AFF',
  },

  // ============================================
  // GRADIENTS - Vibrant, energetic, Apple-quality
  // ============================================
  gradients: {
    // Vibrant gradients for energetic, premium feel
    primary: ['#0A84FF', '#0066CC'],       // Main brand gradient
    primaryAlt: ['#0095FF', '#0A84FF'],    // Alternative brand gradient
    header: ['#0A84FF', '#0066CC'],        // Header gradient - vibrant
    headerLight: ['#E3F2FD', '#FFFFFF'],   // Light header variant
    // Dashboard header - Apple-like rich gradient (4 color stops)
    dashboardHeader: [
      '#1E3AFF',
      '#215EEA',
      '#2CB5E9',
      '#33D39c',
    ],
  







    dashboardHeaderLocations: [0, 0.3, 0.7, 1],  // Control color stop positions
    success: ['#34C759', '#30B350'],
    warning: ['#FF9500', '#FF8A00'],
    error: ['#FF3B30', '#FF2D20'],
    lightBlue: ['#F0F9FF', '#E3F2FD'],     // Light blue background
    lightGreen: ['#F0FDF4', '#ECFDF5'],    // Light green background
    lightRed: ['#FFF5F5', '#FFFDFD'],
    light: ['#FFFFFF', '#F8FAFC'],         // Light background gradient
    dark: ['#1C1C1E', '#2C2C2E'],          // Dark mode support
    // Quick Action Gradients - More vibrant and distinctive
    quickActionTeal: ['#5AC8FA', '#0A84FF'],
    quickActionBlue: ['#0A84FF', '#0066CC'],
    quickActionPurple: ['#BF5AF2', '#AF52DE'],
    quickActionOrange: ['#FF9F0A', '#FF9500'],
    quickActionPink: ['#FF375F', '#FF2D55'],
    quickActionSkyBlue: ['#5AC8FA', '#34AADC'],
    quickActionLightBlue: ['#64D2FF', '#5AC8FA'],
    lightRedAlt: ['#FFEBEE', '#FFF5F5'],
  },

  // ============================================
  // ACCENT COLORS - Apple system colors
  // ============================================
  accent: {
    blue: '#007AFF',
    blueLight: 'rgba(0, 122, 255, 0.10)',      // Subtle 10% opacity
    blueMedium: 'rgba(0, 122, 255, 0.15)',
    blueStrong: 'rgba(0, 122, 255, 0.25)',
    success: '#34C759',
    successLight: 'rgba(52, 199, 89, 0.10)',
    warning: '#FF9500',
    warningLight: 'rgba(255, 149, 0, 0.10)',
    warningLightAlt: '#FFFBEA',
    error: '#FF3B30',
    errorLight: 'rgba(255, 59, 48, 0.10)',
    errorLightAlt: 'rgba(255, 59, 48, 0.10)',
    info: '#007AFF',
    infoLight: 'rgba(0, 122, 255, 0.10)',
  },

  // ============================================
  // SHADOWS - Apple-standard subtle elevation
  // ============================================
  shadow: {
    soft: 'rgba(0, 0, 0, 0.04)',               // Very subtle
    medium: 'rgba(0, 0, 0, 0.08)',             // Card-level
    strong: 'rgba(0, 0, 0, 0.12)',             // Modal-level
    blue: 'rgba(0, 122, 255, 0.15)',           // Reduced blue shadow
    black: '#000',
    card: 'rgba(0, 0, 0, 0.06)',
    cardBorder: 'rgba(0, 0, 0, 0.04)',
  },

  // ============================================
  // OVERLAY COLORS
  // ============================================
  overlay: {
    light: 'rgba(0, 0, 0, 0.3)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.7)',
    white: 'rgba(255, 255, 255, 0.3)',
    slate: 'rgba(15, 23, 42, 0.4)',
    slateStrong: 'rgba(15, 23, 42, 0.85)',
  },

  // ============================================
  // INPUT COLORS - iOS input field standards
  // ============================================
  input: {
    background: '#FFFFFF',
    backgroundDark: 'rgba(44, 44, 46, 0.85)',  // Softer, translucent
    backgroundDarkAlt: 'rgba(44, 44, 46, 0.65)',
    border: '#E5E5EA',
    borderFocus: '#007AFF',
    borderDark: 'rgba(142, 142, 147, 0.20)',
    borderDarkFocus: 'rgba(142, 142, 147, 0.35)',
    placeholder: '#C7C7CC',                     // iOS tertiary label
    textDark: '#FFFFFF',
  },

  // ============================================
  // iOS SYSTEM COLORS - Official Apple palette
  // ============================================
  ios: {
    blue: '#007AFF',
    green: '#34C759',
    indigo: '#5856D6',
    orange: '#FF9500',
    pink: '#FF2D55',
    purple: '#AF52DE',
    red: '#FF3B30',
    teal: '#5AC8FA',
    yellow: '#FFCC00',
    gray: '#8E8E93',
    gray2: '#AEAEB2',
    gray3: '#C7C7CC',
    gray4: '#D1D1D6',
    gray5: '#E5E5EA',
    gray6: '#F2F2F7',
    label: '#000000',
    secondaryLabel: '#3C3C43',     // 60% opacity
    tertiaryLabel: '#3C3C43',       // 30% opacity
    quaternaryLabel: '#3C3C43',     // 18% opacity
    separator: '#C6C6C8',
    opaqueSeparator: '#C6C6C8',
  },

  // ============================================
  // SLATE SCALE
  // ============================================
  slate: {
    100: '#F3F6FB',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    800: '#1E293B',
    900: '#0F172A',
  },

  // ============================================
  // BLUE SCALE
  // ============================================
  blue: {
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
  },

  // ============================================
  // TAB BAR COLORS - iOS tab bar standards
  // ============================================
  tabBar: {
    background: '#F9F9F9',             // iOS standard tab bar
    backgroundAlt: '#FFFFFF',
    active: '#007AFF',
    activeAlt: '#007AFF',
    inactive: '#8E8E93',               // iOS gray
    border: 'rgba(0, 0, 0, 0.29)',     // iOS separator
  },

  // ============================================
  // DECORATIVE COLORS - More subtle for premium feel
  // ============================================
  decorative: {
    circle1: 'rgba(255, 255, 255, 0.05)',      // Reduced opacity
    circle2: 'rgba(255, 255, 255, 0.03)',
    circle3: 'rgba(255, 255, 255, 0.02)',
    icon1: 'rgba(0, 122, 255, 0.15)',          // Subtle blue
    icon2: 'rgba(0, 122, 255, 0.10)',
  },

  // ============================================
  // SPECIAL COLORS
  // ============================================
  special: {
    googleBlue: '#4285F4',
    borderDark: '#007AFF',
  },
};

// Helper function to get score color
export const getScoreColor = (score) => {
  if (score >= 9) return colors.status.success;
  if (score >= 7) return colors.primary.main;
  if (score >= 5) return colors.status.warning;
  if (score >= 3) return colors.status.error;
  return colors.status.error;
};

// Helper function to get grade color
export const getGradeColor = (grade) => {
  const gradeColors = {
    A: colors.status.success,
    B: '#84CC16',
    C: colors.status.warning,
    D: '#F97316',
    F: colors.status.error,
  };
  return gradeColors[grade] || colors.text.secondary;
};

export default colors;
