# Roomify Theme System

## Overview

Roomify uses a centralized color system that makes it easy to change the entire app's appearance by modifying a single file.

## How to Change Theme Colors

### 1. Edit the Color System

All app colors are defined in:
```
mobile/src/theme/colors.js
```

### 2. Modify Color Values

Simply change the hex values in the `colors` object:

```javascript
export const colors = {
  // Primary Brand Color - Change this to update all buttons, icons, and accents
  primary: {
    main: '#4A90E2',        // Your brand color
    light: '#6BA3E8',       // Lighter variant
    dark: '#3D7FD9',        // Darker variant
  },
  
  // Background Colors
  background: {
    primary: '#F8F9FB',     // Main background
    card: '#FFFFFF',        // Card backgrounds
  },
  
  // Text Colors
  text: {
    primary: '#1C1C1E',     // Main text
    secondary: '#6E6E73',   // Secondary text
    muted: '#A1A1AA',       // Muted text
  },
  
  // ... and many more!
};
```

### 3. That's It!

The changes will automatically apply to:
- ✅ All authentication screens
- ✅ All navigation headers
- ✅ All buttons and interactive elements
- ✅ All inspection screens
- ✅ All status indicators
- ✅ All text colors

## Current Theme: Roomify Blue

The app currently uses "Roomify Blue" (`#4A90E2`) as the primary brand color, with a warm, professional color palette designed for hospitality and property management.

## Color Categories

### Primary Brand
- **main**: Primary blue used for buttons, icons, and accents
- **light**: Lighter blue for hover states
- **dark**: Darker blue for pressed states

### Backgrounds
- **primary**: Main app background
- **card**: Card and panel backgrounds
- **secondary**: Secondary section backgrounds

### Text
- **primary**: Main headings and important text
- **secondary**: Body text and descriptions
- **muted**: Tertiary text and disclaimers
- **inverse**: White text on dark backgrounds
- **link**: Clickable links

### Borders
- **light**: Subtle borders and dividers
- **primary**: Outline button borders
- **accent**: Focused/active borders

### Status Colors
- **success**: Success states and positive actions
- **warning**: Warnings and cautions
- **error**: Errors and destructive actions
- **info**: Informational states

### Grades (A-F)
Color-coded grades for inspection results

### Scores (0-10)
Color-coded scores for cleanliness ratings

## Helper Functions

### `getScoreColor(score)`
Returns the appropriate color for a score (0-10):
- 9-10: Excellent (green)
- 7-8: Good (light green)
- 5-6: Average (yellow)
- 3-4: Poor (orange)
- 0-2: Critical (red)

### `getGradeColor(grade)`
Returns the color for a letter grade (A-F)

## Examples

### Change to Purple Theme:
```javascript
primary: {
  main: '#9C27B0',
  light: '#BA68C8',
  dark: '#7B1FA2',
}
```

### Change to Green Theme:
```javascript
primary: {
  main: '#4CAF50',
  light: '#81C784',
  dark: '#388E3C',
}
```

### Change to Dark Theme:
```javascript
background: {
  primary: '#1A1A1A',
  card: '#2A2A2A',
  secondary: '#333333',
},
text: {
  primary: '#FFFFFF',
  secondary: '#CCCCCC',
  muted: '#999999',
}
```

## Screens Currently Using Theme System

- ✅ WelcomeScreen
- ✅ LoginScreen
- ✅ RegisterScreen
- ✅ InspectionDetailScreen
- 🔄 (More screens being migrated...)

## Need Help?

If you need to add new colors or modify the theme system, edit:
- `mobile/src/theme/colors.js` - Color definitions
- Individual screen files - Import and use `colors` object

---

**Note**: After modifying colors, the app will automatically reload with the new theme. No additional configuration needed!

