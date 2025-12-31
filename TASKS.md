# Project Tasks & TODOs

**Last Updated:** 2025-12-26

---

## 🔴 High Priority

### 1. Test Assertion Fix

**Location:** `tests/stopScorer.test.ts`
**Status:** ⏳ Pending
**Estimated Time:** 15 minutes
**Description:** Fix failing test assertion in STOP scorer tests (1/15 tests failing)

### 2. Chat Provider Implementation

**Location:** `src/chat/manager.ts:219`
**Status:** ⏳ Pending
**Estimated Time:** 2-3 hours
**Description:** Implement actual provider calls (Anthropic, OpenAI, Gemini) for chat functionality
**Dependencies:** API keys configured, provider clients working

### 3. Admin Authentication Checks

**Locations:**

- `src/api/billing.ts:114` (GET /api/billing/limits)
- `src/api/billing.ts:154` (PUT /api/billing/limits/:userId)
- `src/api/billing.ts:180` (GET /api/billing/costs)

**Status:** ⏳ Pending
**Estimated Time:** 1-2 hours
**Description:** Add admin authentication middleware to protect billing endpoints
**Security Risk:** HIGH - Billing data currently unprotected

---

## 🟡 Medium Priority

### 4. Chat Frontend Implementation

**Location:** `src/components/` (to be created)
**Status:** ⏳ Pending
**Estimated Time:** 3-4 hours
**Description:** Create React components for chat interface

- `ChatInterface.tsx` - Main chat container
- `ChatList.tsx` - List of chats
- `MessageList.tsx` - Message display
- `MessageInput.tsx` - Message input field
- `AgentSelector.tsx` - Select agent dropdown

**Reference:** See `docs/FRONTEND_IMPLEMENTATION.md` for component specs

### 5. Integration Stubs Implementation

**Location:** `src/integrations/index.ts:8`
**Status:** ⏳ Pending
**Estimated Time:** 4-6 hours
**Description:** Implement actual clients for stubbed integrations:

- WhatsApp Business API (`whatsapp/client.ts:43`) - 2h
- Voice AI integration - 2-3h
- iCloud integration - 1-2h

**Note:** WhatsApp and Voice require external API accounts

### 6. Redis/BullMQ Queue Adapter

**Location:** `src/queue/queue.ts:113`
**Status:** ⏳ Pending
**Estimated Time:** 3-4 hours
**Description:** Implement Redis/BullMQ adapter for production-grade queue system
**Current:** In-memory queue (not persistent)
**Benefits:** Persistence, retry logic, distributed workers

---

## 🟢 Low Priority

### 7. Project Planner with Cost Forecast

**Location:** To be created
**Status:** ⏳ Pending
**Estimated Time:** 6-8 hours
**Description:** UI for project planning with cost estimation per phase

### 8. Design System Implementation

**Location:** To be created
**Status:** ⏳ Pending
**Estimated Time:** 2-3 hours
**Description:** Implement design system (colors, components, badges)
**Reference:** See `docs/DESIGN_SPECIFICATION.md`

### 9. Accessibility Improvements

**Location:** Frontend components
**Status:** ⏳ Pending
**Estimated Time:** 1-2 hours
**Description:**

- Add ARIA labels
- Implement keyboard navigation
- Add screen reader support

---

## 📊 Summary

| Priority  | Tasks | Estimated Time  | Status          |
| --------- | ----- | --------------- | --------------- |
| 🔴 High   | 3     | 4-7 hours       | 0% complete     |
| 🟡 Medium | 3     | 10-14 hours     | 0% complete     |
| 🟢 Low    | 3     | 9-13 hours      | 0% complete     |
| **Total** | **9** | **23-34 hours** | **0% complete** |

---

## 🚀 Quick Start Recommendations

### For Immediate Impact (Today):

1. ✅ Fix test assertion (15 min)
2. ✅ Add admin auth to billing endpoints (1-2h) - **Security critical!**
3. ✅ Implement chat provider calls (2-3h) - **Feature enablement**

### For This Week:

4. Chat frontend components (3-4h)
5. WhatsApp integration (2h)
6. Redis queue adapter (3-4h)

### For Next Week:

7. Design system (2-3h)
8. Project planner UI (6-8h)
9. Accessibility (1-2h)

---

## 📝 Notes

- All time estimates are for a single developer
- Times include testing and documentation
- Security tasks (admin auth) should be prioritized
- Frontend tasks can be parallelized if multiple developers available

---

## ✅ Completed Tasks

- [x] Setup GitHub, Slack, Linear integrations
- [x] Implement chat backend (SQLite tables, API endpoints)
- [x] Create shared type definitions
- [x] Add missing imports to code examples
- [x] Project documentation structure

---

**Next Update:** After completing High Priority tasks
