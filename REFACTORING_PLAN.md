# MonkeyPost Refactoring Plan: From Five-Aside to Full Ecosystem Platform

## Executive Summary

This document outlines a systematic, phase-by-phase approach to refactor the current five-aside football management application into the comprehensive MonkeyPost platform for Ondo State's football ecosystem.

## Current State Analysis

### What We Have:
- ✅ Basic pitch/facility management
- ✅ Five-aside team management (sets)
- ✅ Match tracking and session management
- ✅ Basic betting system with odds calculation
- ✅ User authentication with Firebase
- ✅ Role-based access (player, referee, admin, pitch_owner, spectator)
- ✅ Pitch-centric architecture

### What We Need (From Vision Documents):
- ❌ Comprehensive player profiles (stats, videos, football CV)
- ❌ Official club registry system
- ❌ Grassroots league management
- ❌ Boardman (peer-to-peer wagering with escrow)
- ❌ Live streaming capabilities
- ❌ E-commerce marketplace (i-Sale)
- ❌ Service provider directory
- ❌ Electronic ticketing for stadium
- ❌ Talent scouting/indexing system
- ❌ MonkeyCoins credit system
- ❌ Additional user personas (club managers, scouts, ministry officials, etc.)

---

## Systematic Refactoring Approach

### Phase 0: Foundation & Planning ⚠️ CRITICAL

**Goal**: Establish the architectural foundation without breaking existing functionality.

#### Step 0.1: Gap Analysis & Architecture Design
- [ ] Create detailed feature matrix (current vs. desired)
- [ ] Design new data architecture (Firestore schema expansion)
- [ ] Plan migration strategy for existing data
- [ ] Define API/service layer structure
- [ ] Document backward compatibility requirements

#### Step 0.2: Establish Development Environment
- [ ] Set up feature branch strategy
- [ ] Create database migration scripts
- [ ] Set up staging environment for testing
- [ ] Document coding standards for new features

**Duration**: 1-2 weeks  
**Risk**: Medium - Foundation must be solid  
**Dependencies**: None

---

### Phase 1: Core Type System Refactoring 🔧

**Goal**: Extend the type system to support new personas and entities without breaking existing code.

#### Step 1.1: Extend User Types
- [ ] Add new user roles: `club_manager`, `scout`, `service_provider`, `ministry_official`, `fa_official`, `facility_manager`
- [ ] Add user profile extensions (bio, profile image, location details)
- [ ] Add `monkeyCoins` balance to User type
- [ ] Add `certifications` array for service providers
- [ ] Maintain backward compatibility with existing roles

#### Step 1.2: Create New Entity Types
- [ ] `Club` type (distinct from Teams)
- [ ] `PlayerProfile` type (extended player information)
- [ ] `League` type (grassroots league structure)
- [ ] `Match` type extension (for league matches)
- [ ] `Ticket` type (electronic ticketing)
- [ ] `Product` type (e-commerce)
- [ ] `ServiceProvider` type (referees, coaches)
- [ ] `Stream` type (live streaming)
- [ ] `BoardmanWager` type (peer-to-peer betting)

#### Step 1.3: Extend Existing Types
- [ ] Enhance `Pitch` to support stadium complex features
- [ ] Add `Team` extensions for club association
- [ ] Add `Bet` extensions for Boardman escrow functionality

**Duration**: 1 week  
**Risk**: Low - Type-only changes  
**Dependencies**: Phase 0 completion

---

### Phase 2: Enhanced User System 👥

**Goal**: Implement new user personas and authentication flows.

#### Step 2.1: Authentication System Updates
- [ ] Extend signup flow to support new roles
- [ ] Add role-specific onboarding flows
- [ ] Create role verification system (for ministry/FA officials)
- [ ] Add user profile creation/editing
- [ ] Implement location capture (city, state, coordinates)

#### Step 2.2: User Profile Management
- [ ] Create comprehensive profile page
- [ ] Add profile image upload
- [ ] Add bio/description fields
- [ ] Add social links/contact info
- [ ] Implement profile visibility settings

#### Step 2.3: Role-Based Permissions
- [ ] Create permission matrix for all roles
- [ ] Implement role-based UI rendering
- [ ] Add middleware for protected routes
- [ ] Create role-specific dashboards

**Duration**: 2 weeks  
**Risk**: Medium - Authentication changes are sensitive  
**Dependencies**: Phase 1 completion

---

### Phase 3: Player Profile System ⚽

**Goal**: Transform basic player info into comprehensive talent profiles.

#### Step 3.1: Enhanced Player Profile
- [ ] Create detailed player profile page
- [ ] Add physical attributes (height, weight, position)
- [ ] Add statistics tracking (goals, assists, matches played)
- [ ] Add achievement/certification display
- [ ] Implement "Football CV" generation

#### Step 3.2: Video/Media Management
- [ ] Add video upload functionality
- [ ] Create highlight reel management
- [ ] Add image gallery
- [ ] Integrate video hosting (Firebase Storage or external)
- [ ] Create video player component

#### Step 3.3: Profile Visibility & Discovery
- [ ] Implement profile boost system (MonkeyCoins)
- [ ] Add search/filter functionality for scouts
- [ ] Create talent ranking/rating system
- [ ] Add profile view analytics

**Duration**: 2-3 weeks  
**Risk**: Medium - Media handling can be complex  
**Dependencies**: Phase 2 completion, storage solution setup

---

### Phase 4: Official Club Registry 🏆

**Goal**: Build mandatory club registration system.

#### Step 4.1: Club Entity & Management
- [ ] Create Club data model
- [ ] Build club registration form
- [ ] Add club profile pages
- [ ] Implement club verification process
- [ ] Add club logo/imagery

#### Step 4.2: Legitimacy Fee System
- [ ] Integrate payment gateway (Paystack extension)
- [ ] Create annual legitimacy fee payment flow
- [ ] Add payment history tracking
- [ ] Implement fee renewal reminders
- [ ] Create revenue reporting for Ministry

#### Step 4.3: Club-Player Association
- [ ] Link players to clubs
- [ ] Create roster management for clubs
- [ ] Add transfer/registration workflow
- [ ] Implement club statistics

**Duration**: 2-3 weeks  
**Risk**: Medium - Payment integration complexity  
**Dependencies**: Phase 1, Phase 2, payment gateway integration

---

### Phase 5: Grassroots League Management 🏅

**Goal**: Create structured league system for Ondo State.

#### Step 5.1: League Structure
- [ ] Design league data model (seasons, divisions, fixtures)
- [ ] Create league creation/management interface
- [ ] Implement fixture generation
- [ ] Add standings/leaderboard system
- [ ] Create league statistics

#### Step 5.2: Match Management (League Context)
- [ ] Extend match system for league matches
- [ ] Add match result verification
- [ ] Implement points system
- [ ] Create match scheduling interface
- [ ] Add referee assignment workflow

#### Step 5.3: League Participation Rules
- [ ] Enforce club legitimacy requirement
- [ ] Add player eligibility checking
- [ ] Implement registration deadlines
- [ ] Create disqualification workflow

**Duration**: 3-4 weeks  
**Risk**: High - Complex business logic  
**Dependencies**: Phase 4 completion

---

### Phase 6: Boardman Feature (Enhanced Betting) 💰

**Goal**: Refactor betting to peer-to-peer wagering with escrow.

#### Step 6.1: Escrow System Architecture
- [ ] Design escrow data model
- [ ] Create escrow account management
- [ ] Implement fund holding mechanism
- [ ] Add escrow release logic

#### Step 6.2: Peer-to-Peer Wagering
- [ ] Create wager creation interface
- [ ] Implement wager acceptance flow
- [ ] Add counter-wager functionality
- [ ] Create wager matching algorithm
- [ ] Add escrow fee calculation

#### Step 6.3: Wager Management & Settlement
- [ ] Implement automatic settlement on match completion
- [ ] Add dispute resolution workflow
- [ ] Create wager history tracking
- [ ] Add refund mechanism for cancelled matches
- [ ] Generate revenue reports for Ministry (levy collection)

**Duration**: 2-3 weeks  
**Risk**: High - Financial transactions require careful handling  
**Dependencies**: Payment gateway, Phase 5 (for match completion triggers)

---

### Phase 7: Live Streaming 📹

**Goal**: Enable user-driven live streaming of matches.

#### Step 7.1: Streaming Infrastructure
- [ ] Research and select streaming solution (Twilio Video, Agora, or similar)
- [ ] Set up streaming backend/API
- [ ] Create stream room/event management
- [ ] Implement stream quality settings

#### Step 7.2: Streaming UI/UX
- [ ] Create stream start/stop interface
- [ ] Build viewer component
- [ ] Add stream chat functionality
- [ ] Implement stream recording (optional)
- [ ] Add stream discoverability

#### Step 7.3: Stream Management
- [ ] Add stream scheduling
- [ ] Create stream archive system
- [ ] Implement stream analytics (viewers, duration)
- [ ] Add monetization (optional paid streams)

**Duration**: 3-4 weeks  
**Risk**: High - Streaming is resource-intensive  
**Dependencies**: Third-party streaming service integration

---

### Phase 8: E-commerce (i-Sale) 🛒

**Goal**: Build marketplace for merchandise and kits.

#### Step 8.1: Product Management
- [ ] Create product data model
- [ ] Build product catalog
- [ ] Add product image management
- [ ] Implement inventory tracking
- [ ] Create product categories

#### Step 8.2: Shopping Experience
- [ ] Build shopping cart
- [ ] Create checkout flow
- [ ] Integrate payment processing
- [ ] Add order management
- [ ] Implement shipping address collection

#### Step 8.3: Team Merchandise
- [ ] Allow clubs to list official kits
- [ ] Create custom kit design interface
- [ ] Add size/color selection
- [ ] Implement order fulfillment workflow

**Duration**: 3-4 weeks  
**Risk**: Medium - Standard e-commerce complexity  
**Dependencies**: Payment gateway, Phase 4 (club integration)

---

### Phase 9: Service Provider Hub 👔

**Goal**: Directory for referees, coaches, and professionals.

#### Step 9.1: Service Provider Profiles
- [ ] Create service provider data model
- [ ] Build provider registration
- [ ] Add certification verification
- [ ] Implement service categories
- [ ] Create provider search/discovery

#### Step 9.2: Booking System
- [ ] Add service request creation
- [ ] Implement booking workflow
- [ ] Create availability calendar
- [ ] Add pricing display
- [ ] Implement rating/review system

#### Step 9.3: Provider Management
- [ ] Create provider dashboard
- [ ] Add service history
- [ ] Implement earnings tracking
- [ ] Add provider verification badges

**Duration**: 2-3 weeks  
**Risk**: Low - Similar to existing pitch booking  
**Dependencies**: Phase 2 (user system)

---

### Phase 10: Electronic Ticketing 🎫

**Goal**: Official ticketing system for stadium matches.

#### Step 10.1: Ticket System Architecture
- [ ] Design ticket data model
- [ ] Create ticket generation system
- [ ] Implement QR code generation
- [ ] Add ticket validation logic

#### Step 10.2: Ticketing Interface
- [ ] Create match ticketing page
- [ ] Add seat selection (if applicable)
- [ ] Implement ticket pricing tiers
- [ ] Create ticket purchase flow
- [ ] Add ticket wallet/display

#### Step 10.3: Stadium Integration
- [ ] Integrate with Ondo State stadium complex
- [ ] Create admin interface for match creation
- [ ] Add gate entry validation (QR scanning)
- [ ] Generate sales reports
- [ ] Implement ticket commission tracking

**Duration**: 2-3 weeks  
**Risk**: Medium - Integration with stadium operations  
**Dependencies**: Phase 5 (league matches), payment gateway

---

### Phase 11: Talent Scouting System 🔍

**Goal**: Advanced search and talent indexing for scouts.

#### Step 11.1: Advanced Search & Filters
- [ ] Create scout-specific search interface
- [ ] Add multi-criteria filtering (age, position, stats, location)
- [ ] Implement saved search functionality
- [ ] Add talent alert/notifications

#### Step 11.2: Talent Dashboard
- [ ] Create scout dashboard
- [ ] Add player watchlists
- [ ] Implement player comparison tool
- [ ] Create talent reports
- [ ] Add export functionality

#### Step 11.3: Pipeline Management
- [ ] Create talent pipeline workflow
- [ ] Add scout-player communication
- [ ] Implement interest tracking
- [ ] Create recruitment workflow

**Duration**: 2-3 weeks  
**Risk**: Low - Primarily UI/search logic  
**Dependencies**: Phase 3 (player profiles)

---

### Phase 12: MonkeyCoins Credit System 💎

**Goal**: Implement credit system for profile boosts and listings.

#### Step 12.1: Credit System Foundation
- [ ] Design MonkeyCoins data model
- [ ] Create credit balance tracking
- [ ] Implement credit transaction history
- [ ] Add credit purchase flow

#### Step 12.2: Credit Usage Features
- [ ] Profile boost functionality (already referenced in Phase 3)
- [ ] Service provider listing fees
- [ ] Pitch boost system (already exists - enhance)
- [ ] Premium feature unlocks
- [ ] Credit gifting/transfer

#### Step 12.3: Credit Management
- [ ] Create credit purchase interface
- [ ] Add credit usage analytics
- [ ] Implement credit packages/pricing
- [ ] Add credit expiration rules (if applicable)

**Duration**: 2 weeks  
**Risk**: Low - Similar to existing balance system  
**Dependencies**: Payment gateway, Phase 2

---

## Implementation Strategy

### Approach: Incremental Migration

1. **Maintain Backward Compatibility**: Keep existing features working throughout refactoring
2. **Feature Flags**: Use feature flags to enable/disable new features during development
3. **Parallel Development**: Build new features alongside existing ones, merge gradually
4. **Data Migration**: Plan data migration scripts for each phase
5. **Testing Strategy**: 
   - Unit tests for new features
   - Integration tests for critical flows
   - Manual testing in staging environment

### Priority Order Rationale

**High Priority (Foundation)**: Phases 0-2  
**Medium Priority (Core Features)**: Phases 3-5  
**High Value (Revenue Generation)**: Phases 6, 8, 10, 12  
**Enhancement (User Experience)**: Phases 7, 9, 11

### Estimated Timeline

- **Phase 0-2** (Foundation): 4-5 weeks
- **Phase 3-5** (Core Features): 7-10 weeks
- **Phase 6-8** (Revenue Features): 8-11 weeks
- **Phase 9-12** (Enhancements): 8-10 weeks

**Total Estimated Duration**: 27-36 weeks (6-9 months with dedicated team)

### Resource Requirements

- **Frontend Developer**: Full-time (React/TypeScript)
- **Backend Developer**: Full-time (Firebase/Firestore)
- **UI/UX Designer**: Part-time (for new interfaces)
- **QA Tester**: Part-time (for testing new features)

### Risk Mitigation

1. **Technical Risks**:
   - Streaming integration: Research thoroughly, consider alternatives
   - Payment processing: Use proven services (Paystack)
   - Data migration: Test extensively before production

2. **Business Risks**:
   - User adoption: Gradual rollout with user feedback
   - Ministry partnership: Ensure legal/compliance requirements

3. **Timeline Risks**:
   - Build in buffer time (20% contingency)
   - Prioritize revenue-generating features

---

## Next Steps

1. **Review and Approve Plan**: Stakeholder review of this document
2. **Setup Development Environment**: Begin Phase 0
3. **Begin Type System Refactoring**: Start Phase 1
4. **Weekly Progress Reviews**: Track progress against plan

---

## Notes

- This plan assumes maintaining the existing Firebase/Firestore backend
- Payment processing will use Paystack (already integrated)
- Consider third-party services for complex features (streaming, file storage)
- Regular user feedback loops should be incorporated throughout development

