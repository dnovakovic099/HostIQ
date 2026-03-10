# HostIQ - Feature Suggestions

**Date:** February 24, 2026
**App Version:** Current (React Native / Expo)
**Prepared for:** HostIQ Development Team

---

## Current App Overview

HostIQ is a property management and inspection platform built with React Native (Expo) serving three user roles:

- **Owners** manage rental properties, assign cleaners, track inspections, view analytics, handle inventory, and generate dispute reports.
- **Cleaners** receive assignments, capture room-by-room inspection photos, submit reports, and manage payment settings.
- **Admins** have platform-wide oversight of all owners, cleaners, properties, inspections, payments, and system configuration via a dedicated desktop management dashboard.

The mobile app currently includes 40+ screens across Owner, Cleaner, and Common modules, with integrations for Hostify PMS, Stripe Connect payments, in-app purchases, biometric authentication, and PDF report generation. Several features are behind feature flags (PMS, payments, subscriptions, billing, pricing) and are currently disabled for the App Store.

The ADMIN role already exists in the backend (Prisma schema, auth middleware, JWT tokens) but currently mirrors OWNER permissions. The Express API, Prisma ORM, and PostgreSQL database contain all data models needed to power a full desktop admin dashboard. No web UI exists yet — the Desktop Admin Dashboard section below defines the complete feature set for this new platform pillar.

---

## Owner Feature Suggestions

### 1. Automated Scheduling & Calendar View
**Priority:** High

**Description:** Add a visual calendar showing all upcoming cleanings, check-ins, and check-outs across properties. Allow owners to set recurring cleaning schedules that auto-generate assignments.

**Why it matters:** Currently, owners must manually create each assignment. A calendar with recurring schedules saves significant time for owners managing multiple properties and reduces the risk of missed cleanings between guest turnovers.

---

### 2. Real-Time Cleaning Progress Tracking
**Priority:** High

**Description:** Show live status updates as a cleaner moves through rooms during an inspection. Display which rooms are completed, in-progress, or pending, with estimated completion time.

**Why it matters:** Owners currently only see results after submission. Real-time tracking lets owners know exactly when a property will be ready, which is critical for tight turnover windows between guest check-out and check-in.

---

### 3. Guest Turnover Automation (PMS Deep Integration)
**Priority:** High

**Description:** When PMS integration is enabled, automatically create cleaner assignments based on upcoming guest check-outs. Pull reservation data to determine cleaning urgency and property readlines.

**Why it matters:** This eliminates the manual step of checking reservation calendars and creating assignments. For owners with many properties, this is the difference between spending 30 minutes daily on scheduling vs. zero.

---

### 4. AI-Powered Inspection Scoring & Trend Analysis
**Priority:** High

**Description:** Enhance the existing inspection scoring with AI that detects cleaning quality trends over time, flags declining performance before it becomes a problem, and provides actionable improvement suggestions per cleaner.

**Why it matters:** The current Insights tab shows basic stats (pass rate, average score). AI trend analysis would proactively alert owners to issues like "Cleaner X's bathroom scores have dropped 15% over the last month" before guest complaints occur.

---

### 5. Multi-Property Comparison Dashboard
**Priority:** Medium

**Description:** Create a side-by-side comparison view showing key metrics (cleanliness scores, guest ratings, turnover times, inventory costs) across all properties. Highlight top and bottom performers.

**Why it matters:** Owners managing portfolios need to quickly identify which properties need attention. The current dashboard shows aggregate stats but doesn't make it easy to compare properties against each other.

---

### 6. Inventory Auto-Reorder & Supplier Integration
**Priority:** Medium

**Description:** Extend the existing inventory tracking with automatic reorder alerts when items hit minimum thresholds. Integrate with suppliers (Amazon Business, property supply vendors) for one-click reordering.

**Why it matters:** The current inventory system tracks stock levels and allows marking items as low/out, but requires manual follow-up to reorder. Auto-reorder prevents the frustrating situation where a cleaner arrives to find no supplies.

---

### 7. Damage Documentation & Cost Tracking
**Priority:** Medium

**Description:** Build on the existing valuable items tracking and damage reporting to create a full damage lifecycle: detection, photo documentation, cost estimation, repair assignment, and resolution tracking. Link damages to specific guest stays for deposit claims.

**Why it matters:** The app already captures damage photos and has an Airbnb dispute report feature, but there's no way to track the full lifecycle from detection to resolution or aggregate damage costs across properties over time.

---

### 8. Cleaner Performance Scorecard & Bonus System
**Priority:** Medium

**Description:** Create detailed performance scorecards for each cleaner with metrics like on-time completion rate, average inspection score by room type, consistency rating, and guest feedback correlation. Allow owners to set bonus thresholds that trigger automatic bonus payments.

**Why it matters:** The current Insights Cleaners tab provides basic stats. A scorecard with bonus incentives helps retain top cleaners (a major pain point in property management) and motivates consistent quality.

---

### 9. Property Maintenance Request System
**Priority:** Medium

**Description:** Allow cleaners to flag maintenance issues (broken fixtures, appliance problems, plumbing issues) separately from cleaning inspections. Create a maintenance ticket workflow with priority levels, vendor assignment, and resolution tracking.

**Why it matters:** Cleaners are the eyes on the ground and often notice maintenance issues first. Currently there's no structured way to report non-cleaning issues. A maintenance system prevents small problems from becoming expensive repairs.

---

### 10. Guest Communication Templates & Auto-Messages
**Priority:** Low

**Description:** Create templated messages that can be auto-sent to guests based on cleaning status (e.g., "Your property is ready!" with early check-in option, or "Cleaning in progress, we'll notify you when ready").

**Why it matters:** Connecting cleaning completion to guest communication closes the loop between property operations and guest experience. This is especially valuable for tight turnovers where guests are waiting for early check-in confirmation.

---

## Cleaner Feature Suggestions

### 1. Offline Mode with Auto-Sync
**Priority:** High

**Description:** Allow cleaners to complete full inspections without internet connectivity. Cache property data, room templates, and checklists locally. Queue photos and inspection data for automatic upload when connectivity is restored.

**Why it matters:** Many rental properties have poor WiFi or are in areas with limited cell service. Cleaners currently cannot use the app if they lose connection mid-inspection, potentially losing all captured data.

---

### 2. Step-by-Step Guided Cleaning Checklists
**Priority:** High

**Description:** Transform the room capture flow into an interactive guided checklist. For each room, show specific tasks (make bed, clean bathroom fixtures, vacuum, etc.) with checkboxes, reference photos of the expected standard, and the ability to mark items as done.

**Why it matters:** The current flow captures photos but doesn't guide the actual cleaning process. New cleaners especially benefit from knowing exactly what's expected in each room, reducing re-cleans and failed inspections.

---

### 3. Time Tracking & Earnings Calculator
**Priority:** High

**Description:** Add automatic time tracking per property/assignment (clock in when starting, clock out when submitting). Show estimated earnings based on time spent and agreed rates. Display daily/weekly/monthly earning summaries.

**Why it matters:** Cleaners currently have no way to track their time or see earnings within the app. This data helps cleaners manage their schedules, ensures fair payment, and gives owners data for pricing decisions.

---

### 4. Route Optimization & Navigation
**Priority:** Medium

**Description:** When a cleaner has multiple assignments for the day, suggest the optimal route between properties. Integrate with maps for navigation and show estimated drive times between locations.

**Why it matters:** Cleaners managing multiple properties daily waste time planning routes. Route optimization can save 30-60 minutes per day for cleaners with 4+ assignments, directly translating to more earnings potential.

---

### 5. Supply Request & Shortage Alerts
**Priority:** Medium

**Description:** Expand the existing inventory update feature to allow cleaners to create supply requests directly from the app. Alert owners immediately when critical supplies are missing, and let cleaners suggest quantity needed.

**Why it matters:** The current inventory update lets cleaners mark items as low/out, but doesn't create an actionable request for the owner. Cleaners need a quick way to communicate "I need 12 rolls of toilet paper at Property X by tomorrow."

---

### 6. Photo Comparison & Before/After View
**Priority:** Medium

**Description:** Show cleaners the "reference" photos (from valuable items or previous inspections) side-by-side with their current capture. Enable before/after comparison for owners reviewing inspections.

**Why it matters:** Cleaners often don't know the exact expected standard for each room. Showing reference photos during capture helps them match the expected result. Before/after views also make inspection reviews faster for owners.

---

### 7. Availability & Schedule Management
**Priority:** Medium

**Description:** Let cleaners set their weekly availability, block off vacation days, and indicate preferred properties or areas. Owners see availability when making assignments, preventing conflicts.

**Why it matters:** Currently there's no way for cleaners to communicate availability within the app. This leads to assignments that conflict with personal schedules, declined assignments, and last-minute scrambles to find replacement cleaners.

---

### 8. In-App Training & Certification
**Priority:** Medium

**Description:** Create a training module where owners can upload cleaning standards, video tutorials, and property-specific instructions. Cleaners can complete training modules and earn certifications that are visible on their profile.

**Why it matters:** Onboarding new cleaners is a major time investment for owners. In-app training standardizes the process, ensures consistency, and gives cleaners a clear path to skill development that can unlock higher-paying assignments.

---

### 9. Issue Escalation & Direct Messaging
**Priority:** Low

**Description:** Add in-app messaging between cleaners and owners for real-time communication during cleanings. Allow cleaners to escalate urgent issues (burst pipe, broken window, security concern) with priority notifications.

**Why it matters:** When cleaners encounter unexpected situations (locked out, maintenance emergency, missing supplies), they currently have no in-app way to reach the owner. Phone calls and texts are unreliable and create no audit trail.

---

### 10. Cleaner Profile & Review System
**Priority:** Low

**Description:** Build out cleaner profiles showing their inspection history, average scores, certifications, specialties (deep cleaning, turnover specialist), and owner reviews. Let cleaners build a reputation within the platform.

**Why it matters:** Top-performing cleaners deserve recognition that can help them earn more assignments. A profile system also helps owners make better hiring decisions when bringing on new team members.

---

## Shared Feature Suggestions (Both Roles)

### 1. Push Notifications & Smart Alerts
**Priority:** High

**Description:** Implement a comprehensive push notification system for both roles:
- **Owners:** New inspection submitted, failed inspection alert, low inventory warning, assignment accepted/declined, cleaner running late, PMS booking notification.
- **Cleaners:** New assignment received, assignment reminder (1 hour before), payment received, inspection feedback/rejection, schedule change.

Include notification preferences so users can customize which alerts they receive and how (push, in-app, email).

**Why it matters:** Neither role currently receives proactive notifications within the app. Users must open the app and check manually. Push notifications are the single most impactful feature for engagement and ensuring nothing falls through the cracks.

---

### 2. Multi-Language Support (i18n)
**Priority:** High

**Description:** Add full internationalization support starting with Spanish, Portuguese, and French. Allow users to select their preferred language in settings. Translate all UI strings, notifications, and generated reports.

**Why it matters:** The cleaning workforce is highly diverse and multilingual. Many cleaners may not be comfortable with English-only interfaces. Multi-language support dramatically expands the addressable market and improves usability for non-English speakers.

---

### 3. Dark Mode & Accessibility Improvements
**Priority:** Medium

**Description:** The app has a dark mode toggle in settings but needs full implementation across all screens. Additionally, add accessibility features: screen reader support (VoiceOver/TalkBack), dynamic text sizing, high-contrast mode, and haptic feedback for important actions.

**Why it matters:** Dark mode reduces eye strain during late-night property management tasks. Accessibility compliance (WCAG 2.1) is both a legal consideration and expands the user base. These improvements also signal app maturity to potential enterprise customers.

---

## Summary Matrix

| # | Feature | Role | Priority |
|---|---------|------|----------|
| O1 | Automated Scheduling & Calendar | Owner | High |
| O2 | Real-Time Cleaning Progress | Owner | High |
| O3 | Guest Turnover Automation | Owner | High |
| O4 | AI Inspection Trend Analysis | Owner | High |
| O5 | Multi-Property Comparison | Owner | Medium |
| O6 | Inventory Auto-Reorder | Owner | Medium |
| O7 | Damage Lifecycle Tracking | Owner | Medium |
| O8 | Cleaner Scorecard & Bonuses | Owner | Medium |
| O9 | Maintenance Request System | Owner | Medium |
| O10 | Guest Communication Templates | Owner | Low |
| C1 | Offline Mode with Auto-Sync | Cleaner | High |
| C2 | Guided Cleaning Checklists | Cleaner | High |
| C3 | Time Tracking & Earnings | Cleaner | High |
| C4 | Route Optimization | Cleaner | Medium |
| C5 | Supply Request & Alerts | Cleaner | Medium |
| C6 | Photo Before/After Comparison | Cleaner | Medium |
| C7 | Availability & Scheduling | Cleaner | Medium |
| C8 | Training & Certification | Cleaner | Medium |
| C9 | Issue Escalation & Messaging | Cleaner | Low |
| C10 | Cleaner Profile & Reviews | Cleaner | Low |
| S1 | Push Notifications & Alerts | Shared | High |
| S2 | Multi-Language Support | Shared | High |
| S3 | Dark Mode & Accessibility | Shared | Medium |

---

## Recommended Implementation Phases

**Phase 1 - Foundation (High Priority)**
- Push Notifications (S1) - enables all other real-time features
- Offline Mode (C1) - critical for cleaner reliability
- Automated Scheduling (O1) - biggest time-saver for owners
- Guided Checklists (C2) - reduces failed inspections

**Phase 2 - Growth (High + Medium Priority)**
- Real-Time Progress Tracking (O2)
- Time Tracking & Earnings (C3)
- AI Trend Analysis (O4)
- Multi-Language Support (S2)
- Guest Turnover Automation (O3)

**Phase 3 - Differentiation (Medium Priority)**
- Inventory Auto-Reorder (O6)
- Route Optimization (C4)
- Photo Comparison (C6)
- Availability Management (C7)
- Multi-Property Comparison (O5)
- Damage Lifecycle (O7)
- Maintenance Requests (O9)

**Phase 4 - Polish (Medium + Low Priority)**
- Cleaner Scorecard & Bonuses (O8)
- Training & Certification (C8)
- Dark Mode & Accessibility (S3)
- Supply Requests (C5)
- Issue Escalation & Messaging (C9)
- Cleaner Profiles (C10)
- Guest Communication (O10)

---

*This document was generated based on a comprehensive analysis of the HostIQ codebase and current feature set.*
