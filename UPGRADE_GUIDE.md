# CODEVERSE 2K25 Upgrade Guide

## 1. Frontend Architectural Changes
- **API Centralization**: Replaced scattered `fetch` calls with a clean, typed Axios instance configured in `services/api.js`. Added interceptors for automatic token injection and 401 redirection.
- **Error Resilience**: Added a global `<ErrorBoundary>` to catch React render crashes, providing a safe fallback UI.
- **Toast Notifications**: Replaced ad-hoc local state alerts with a robust `ToastProvider` and `useToast` hook for consistent success/error feedback across the app.
- **Route Guards**: Implemented `<RequireStudent>` and `<RequireAdmin>` wrappers to secure protected routes, relying on `localStorage` tokens.

## 2. Page & Component Refactors
- **StudentEntry**: Redesigned to 2-column layout. Form submissions now validate per field before firing the API call through `studentApi.register`.
- **Quiz (Round 1)**: Fixed crucial React anti-patterns. Used `useRef` to maintain accurate timers and question indexing, eliminating stale closures. Prevented double-submissions with `submittingRef`. Refined timer UI and disabled potentially dangerous keyboard shortcuts.
- **Round2**: Completely rewritten for robust state management. Added `localStorage` debounced autosave. Redesigned test case displays to vividly show diffs between expected and actual output. Added "Pass/Fail" counters and an "All Tests Passed" success badge. 
- **Admin Pages & Thank You**: Added secure token headers to all admin fetches. Thank You page now safely accesses and clears `localStorage` after moving data to local variables avoiding blank screens entirely, and incorporates CSS-only confetti.

## 3. Backend Performance & Security Upgrades
- **Rate Limiting**: Custom lightweight in-memory throttling added to prevent registration and login abuse via tracking IP hits in Django cache.
- **Model Adjustments**: Added `created_at` audit fields. Replaced potentially ambiguous `null=True` with `blank=True, default=''` on string fields. Implemented indexing on high-query fields (total_score, email, round1_completed) to dramatically speed up leaderboard and qualification queries. Added an implicit `time_taken_seconds` property.
- **Validation**: Strict schema validations moved into `QuestionSerializer` to enforce required dependencies conditionally (Round 1 vs Round 2 expectations). Added comprehensive compiler input size checks (≤10KB) mitigating DoS risks.
- **Configuration Modifications**: Pinned critical dependencies explicitly in `requirements.txt`. Enforced modern security tokens (`X_FRAME_OPTIONS`, `SECURE_CONTENT_TYPE_NOSNIFF`, strict `CORS_ALLOWED_ORIGINS`). Log outputs structured appropriately for deployment observability.
