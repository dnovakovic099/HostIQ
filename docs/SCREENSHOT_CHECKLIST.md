# Screenshot Checklist for HostIQ

This document lists all screens in the HostIQ app that should be captured for documentation purposes.

## How to Take Screenshots

### iOS
- **iPhone/iPad**: Press `Power + Volume Up` buttons simultaneously
- **Screenshots saved to**: Photos app → Screenshots album

### Android
- **Most devices**: Press `Power + Volume Down` buttons simultaneously
- **Samsung**: Press `Power + Home` buttons
- **Screenshots saved to**: Gallery → Screenshots folder

## Screenshot Organization

Recommended folder structure:
```
screenshots/
├── auth/
├── owner/
├── cleaner/
├── common/
└── modals/
```

---

## 🔐 Authentication Screens (4 screens)

### 1. Welcome Screen
- **File**: `auth/01-welcome.png`
- **How to access**: First launch or logout
- **Notes**: Initial onboarding screen

### 2. Login Screen
- **File**: `auth/02-login.png`
- **How to access**: From welcome or logout
- **Notes**: Email/password and Google Sign-In options

### 3. Register Screen
- **File**: `auth/03-register.png`
- **How to access**: Tap "Sign Up" from login
- **Notes**: Account creation form

### 4. Accept Invite Screen
- **File**: `auth/04-accept-invite.png`
- **How to access**: Click invitation link in email
- **Notes**: Invitation acceptance flow

---

## 👤 Property Owner Screens (25+ screens)

### Dashboard & Main Navigation

#### 5. Owner Dashboard
- **File**: `owner/01-dashboard.png`
- **How to access**: Main tab → Inspections (default)
- **Notes**: Welcome section, recent inspections, quick actions

#### 6. Properties List
- **File**: `owner/02-properties-list.png`
- **How to access**: Bottom tab → Properties
- **Notes**: All properties with search

#### 7. Create Property
- **File**: `owner/03-create-property.png`
- **How to access**: Properties → "+" button
- **Notes**: Property creation form

#### 8. Property Detail
- **File**: `owner/04-property-detail.png`
- **How to access**: Properties → Tap property
- **Notes**: Property overview, units, inspections

### Team Management

#### 9. Manage Cleaners
- **File**: `owner/05-manage-cleaners.png`
- **How to access**: Dashboard → Team quick action, or Settings
- **Notes**: Team list with performance

#### 10. Invite Cleaner
- **File**: `owner/06-invite-cleaner.png`
- **How to access**: Manage Cleaners → "Invite Cleaner"
- **Notes**: Email invitation form

#### 11. Cleaner Assignments
- **File**: `owner/07-cleaner-assignments.png`
- **How to access**: Manage Cleaners → Tap cleaner
- **Notes**: Assignments for specific cleaner

#### 12. Assign Cleaner
- **File**: `owner/08-assign-cleaner.png`
- **How to access**: Property → Unit → Assign Inspection
- **Notes**: Assignment creation form

#### 13. Team Screen
- **File**: `owner/09-team-screen.png`
- **How to access**: Settings → Team Management
- **Notes**: Alternative team view

### Inspections & Reports

#### 14. Inspection Reports List
- **File**: `owner/10-inspection-reports.png`
- **How to access**: Dashboard → "View All" or Inspections tab
- **Notes**: All inspections with filters

#### 15. Inspection Detail
- **File**: `owner/11-inspection-detail.png`
- **How to access**: Dashboard or Reports → Tap inspection
- **Notes**: Full inspection report with photos

#### 16. Cleaning Report
- **File**: `owner/12-cleaning-report.png`
- **How to access**: Inspection Detail → View Report
- **Notes**: Detailed cleaning report

#### 17. Airbnb Dispute Report
- **File**: `owner/13-airbnb-dispute-report.png`
- **How to access**: Failed inspection → "Airbnb Dispute Report"
- **Notes**: Professional dispute documentation

### Insights & Analytics

#### 18. Insights Screen
- **File**: `owner/14-insights.png`
- **How to access**: Bottom tab → Insights
- **Notes**: Analytics dashboard

#### 19. Insights - Properties Tab
- **File**: `owner/15-insights-properties.png`
- **How to access**: Insights → Properties tab
- **Notes**: Property performance analytics

#### 20. Insights - Cleaners Tab
- **File**: `owner/16-insights-cleaners.png`
- **How to access**: Insights → Cleaners tab
- **Notes**: Cleaner performance analytics

#### 21. Issues Screen
- **File**: `owner/17-issues.png`
- **How to access**: Dashboard → Issues quick action, or Insights → Issues
- **Notes**: Property issues and alerts

#### 22. Cleaner Performance
- **File**: `owner/18-cleaner-performance.png`
- **How to access**: Insights → Cleaners → Tap cleaner
- **Notes**: Individual cleaner metrics

### Property Management

#### 23. Room Templates
- **File**: `owner/19-room-templates.png`
- **How to access**: Settings or Property Detail → Room Templates
- **Notes**: Template management

#### 24. Inventory Screen
- **File**: `owner/20-inventory.png`
- **How to access**: Property Detail → Inventory
- **Notes**: Property inventory list

#### 25. Valuable Items
- **File**: `owner/21-valuable-items.png`
- **How to access**: Property Detail → Valuable Items
- **Notes**: High-value items tracking

### Billing & Subscriptions

#### 26. Billing Screen
- **File**: `owner/22-billing.png`
- **How to access**: Settings → Billing
- **Notes**: Subscription and usage

#### 27. Subscription Management
- **File**: `owner/23-subscription-management.png`
- **How to access**: Settings → Subscription Management
- **Notes**: Plan management

#### 28. Subscription Screen
- **File**: `owner/24-subscription.png`
- **How to access**: Billing → Choose Plan
- **Notes**: Plan selection

#### 29. Pricing Screen
- **File**: `owner/25-pricing.png`
- **How to access**: Insights or Settings → Pricing
- **Notes**: Pricing analytics (if available)

### Additional Features

#### 30. PMS Settings
- **File**: `owner/26-pms-settings.png`
- **How to access**: Settings → PMS Integration
- **Notes**: Property Management System integration

#### 31. Listing Optimization
- **File**: `owner/27-listing-optimization.png`
- **How to access**: Insights or Property Detail → Listing Optimization
- **Notes**: Airbnb listing optimization

#### 32. Pay Cleaner
- **File**: `owner/28-pay-cleaner.png`
- **How to access**: Cleaner Detail → Pay
- **Notes**: Payment processing

---

## 🧹 Cleaner Screens (10+ screens)

### Dashboard & Main

#### 33. Cleaner Home/Dashboard
- **File**: `cleaner/01-dashboard.png`
- **How to access**: Main tab → Home (default)
- **Notes**: Today's jobs, pending assignments

#### 34. Cleaner History
- **File**: `cleaner/02-history.png`
- **How to access**: Home tab → History section
- **Notes**: Past inspections with filters

### Inspections

#### 35. Create Inspection
- **File**: `cleaner/03-create-inspection.png`
- **How to access**: Dashboard → "+" button
- **Notes**: Manual inspection creation

#### 36. Capture Media
- **File**: `cleaner/04-capture-media.png`
- **How to access**: Start inspection → Capture screen
- **Notes**: Photo/video capture interface

#### 37. Room Capture
- **File**: `cleaner/05-room-capture.png`
- **How to access**: Capture Media → Room selection
- **Notes**: Room-by-room capture flow

#### 38. Review and Submit
- **File**: `cleaner/06-review-submit.png`
- **How to access**: After capturing → Review screen
- **Notes**: Pre-submission review

#### 39. Inspection Detail (Cleaner View)
- **File**: `cleaner/07-inspection-detail.png`
- **How to access**: History → Tap inspection
- **Notes**: Cleaner's view of results

#### 40. Cleaner Reports
- **File**: `cleaner/08-reports.png`
- **How to access**: Home tab → Reports section
- **Notes**: Inspection reports list

### Additional

#### 41. Inventory Update
- **File**: `cleaner/09-inventory-update.png`
- **How to access**: During inspection → Inventory
- **Notes**: Update inventory items

#### 42. Payment Settings (Cleaner)
- **File**: `cleaner/10-payment-settings.png`
- **How to access**: Settings → Payment Settings
- **Notes**: Cleaner payment configuration

---

## ⚙️ Common/Shared Screens (8 screens)

### Settings & Profile

#### 43. Settings Main
- **File**: `common/01-settings.png`
- **How to access**: Bottom tab → Settings
- **Notes**: Main settings menu

#### 44. Edit Profile
- **File**: `common/02-edit-profile.png`
- **How to access**: Settings → Edit Profile
- **Notes**: Profile editing form

#### 45. Change Password
- **File**: `common/03-change-password.png`
- **How to access**: Settings → Change Password
- **Notes**: Password update form

### Legal & Info

#### 46. Terms of Service
- **File**: `common/04-terms.png`
- **How to access**: Settings → Terms of Service
- **Notes**: Legal terms

#### 47. Privacy Policy
- **File**: `common/05-privacy.png`
- **How to access**: Settings → Privacy Policy
- **Notes**: Privacy information

### Payments

#### 48. Payment History
- **File**: `common/06-payment-history.png`
- **How to access**: Settings → Payment History
- **Notes**: Transaction history

---

## 📱 Modals & Popups

### 49. Onboarding Popup
- **File**: `modals/01-onboarding.png`
- **How to access**: First-time owner dashboard
- **Notes**: Welcome popup for new users

### 50. Usage Indicator
- **File**: `modals/02-usage-indicator.png`
- **How to access**: Dashboard → Usage indicator
- **Notes**: Subscription usage display

### 51. Biometric Login Prompt
- **File**: `modals/03-biometric.png`
- **How to access**: Login with biometric enabled
- **Notes**: Face ID/Fingerprint prompt

### 52. Delete Confirmation
- **File**: `modals/04-delete-confirmation.png`
- **How to access**: Delete property/inspection
- **Notes**: Confirmation dialog

### 53. Error Messages
- **File**: `modals/05-error-message.png`
- **How to access**: Trigger error (network, validation, etc.)
- **Notes**: Error alert/notification

### 54. Success Messages
- **File**: `modals/06-success-message.png`
- **How to access**: Complete action (submit, save, etc.)
- **Notes**: Success notification

---

## 📋 Screenshot Checklist

Use this checklist to track your progress:

### Authentication (4)
- [ ] Welcome Screen
- [ ] Login Screen
- [ ] Register Screen
- [ ] Accept Invite Screen

### Owner Screens (32)
- [ ] Owner Dashboard
- [ ] Properties List
- [ ] Create Property
- [ ] Property Detail
- [ ] Manage Cleaners
- [ ] Invite Cleaner
- [ ] Cleaner Assignments
- [ ] Assign Cleaner
- [ ] Team Screen
- [ ] Inspection Reports List
- [ ] Inspection Detail
- [ ] Cleaning Report
- [ ] Airbnb Dispute Report
- [ ] Insights Screen
- [ ] Insights - Properties Tab
- [ ] Insights - Cleaners Tab
- [ ] Issues Screen
- [ ] Cleaner Performance
- [ ] Room Templates
- [ ] Inventory Screen
- [ ] Valuable Items
- [ ] Billing Screen
- [ ] Subscription Management
- [ ] Subscription Screen
- [ ] Pricing Screen
- [ ] PMS Settings
- [ ] Listing Optimization
- [ ] Pay Cleaner

### Cleaner Screens (10)
- [ ] Cleaner Home/Dashboard
- [ ] Cleaner History
- [ ] Create Inspection
- [ ] Capture Media
- [ ] Room Capture
- [ ] Review and Submit
- [ ] Inspection Detail (Cleaner View)
- [ ] Cleaner Reports
- [ ] Inventory Update
- [ ] Payment Settings (Cleaner)

### Common Screens (6)
- [ ] Settings Main
- [ ] Edit Profile
- [ ] Change Password
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Payment History

### Modals (6)
- [ ] Onboarding Popup
- [ ] Usage Indicator
- [ ] Biometric Login Prompt
- [ ] Delete Confirmation
- [ ] Error Messages
- [ ] Success Messages

**Total: 58 screens**

---

## Tips for Taking Screenshots

### Best Practices

1. **Use Real Data**
   - Create test properties
   - Add sample inspections
   - Use realistic names and data

2. **Consistent Device**
   - Use same device for all screenshots
   - iPhone recommended (better quality)
   - Or Android flagship device

3. **Clean State**
   - Remove personal/sensitive data
   - Use test accounts
   - Clear notifications

4. **Good Lighting**
   - Ensure screen is bright
   - Avoid glare
   - Use dark mode if available

5. **Complete Screens**
   - Capture full screen
   - Include navigation bars
   - Show all UI elements

6. **Multiple States**
   - Empty states (no data)
   - Populated states (with data)
   - Loading states
   - Error states

### Organization

1. **Naming Convention**
   - Use provided file names
   - Sequential numbering
   - Descriptive names

2. **Folder Structure**
   - Organize by user type
   - Group related screens
   - Keep modals separate

3. **Documentation**
   - Note any special setup needed
   - Document test data used
   - Include device/OS info

---

## Quick Capture Workflow

### For Property Owner Account

1. **Auth Flow** (4 screens)
   - Welcome → Login → Register → Accept Invite

2. **Dashboard** (1 screen)
   - Login as owner → Dashboard

3. **Properties** (3 screens)
   - Properties tab → Create Property → Property Detail

4. **Team** (4 screens)
   - Manage Cleaners → Invite → Assignments → Assign

5. **Inspections** (4 screens)
   - Reports → Detail → Cleaning Report → Dispute Report

6. **Insights** (5 screens)
   - Insights → Properties tab → Cleaners tab → Issues → Performance

7. **Settings** (8 screens)
   - Settings → All sub-screens

### For Cleaner Account

1. **Auth Flow** (same as owner)

2. **Dashboard** (1 screen)
   - Login as cleaner → Dashboard

3. **Inspections** (6 screens)
   - Create → Capture → Room → Review → Detail → Reports

4. **History** (1 screen)
   - History tab

5. **Settings** (same as owner)

---

## Notes

- Some screens may require specific data to display properly
- Empty states should be captured separately
- Error states are important for documentation
- Consider both light and dark mode if available
- Update screenshots after major UI changes

---

*Last updated: 2024*

