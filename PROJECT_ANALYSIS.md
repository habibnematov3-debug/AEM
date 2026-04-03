# AEM Project Analysis

Date: 2026-04-03

## 1) High-level architecture

- **Frontend:** React 19 + Vite single-page app in `src/`.
- **Backend:** Django 6 + Django REST Framework API in `backend/`.
- **Database:** PostgreSQL schema managed primarily through SQL scripts (`database/`) and a bootstrap command.
- **Deployment:** Render service definition in `render.yaml`.

This is a classic SPA + JSON API architecture where the frontend calls backend endpoints under `/api/...`.

## 2) Frontend analysis

### Tech stack and organization

- The frontend uses Vite scripts (`dev`, `build`, `lint`, `preview`) and React Router for client routing.
- The API integration layer (`src/api/aemApi.js`) centralizes:
  - request handling,
  - auth token storage,
  - response normalization,
  - event/user mapping.

This is a healthy separation pattern because components/pages stay relatively UI-focused.

### Strengths

1. **Centralized API adapter:** Normalization methods reduce UI coupling to backend payload shape.
2. **Auth state choreography:** App boot sequence fetches current user and gates routes using `RequireAuth`/`RequireRole`.
3. **Accessibility touches:** Presence of a skip link and reduced-motion handling indicates accessibility awareness.

### Notable risks / issues

1. **Role normalization appears lossy.**
   - `normalizeRole` maps only `admin` explicitly and everything else to `student`.
   - The backend model includes `student`, `organizer`, and `admin` roles.
   - If an `organizer` is returned by backend, frontend may silently coerce it to `student`, potentially breaking organizer route logic.

2. **Environment-specific defaults hardcoded toward local/Tashkent context.**
   - `city: 'Tashkent'` appears injected in normalized event data.
   - This may be intentional for a local deployment, but it is a hidden assumption for broader reuse.

3. **Single-file API module is large.**
   - `aemApi.js` handles many concerns and may become harder to maintain as endpoints/features grow.

## 3) Backend analysis

### API shape and auth model

- Backend exposes explicit REST-style endpoints for auth, events, participation, and admin operations.
- Authentication is hybrid:
  - signed cookie session (`request.session['user_id']`), and
  - bearer token from a custom token mechanism (`Authorization: Bearer ...`).

This dual approach can support browser session UX while keeping API-token compatibility.

### Data model

- Core entities are coherent for an event platform:
  - `AEMUser`, `UserSettings`, `Event`, `Participation`, `EventLike`.
- Participation status supports waitlisting and cancellation, which aligns with capacity management requirements.

### Strengths

1. **Thoughtful participation lifecycle:** waitlist promotion and cancellation notification hooks exist.
2. **Moderation flow encoded in event status (`pending/approved/rejected`).**
3. **Operational stats endpoint support:** admin dashboard computes event state buckets.

### Notable risks / issues

1. **`managed = False` for all major models.**
   - Django migrations are effectively bypassed for these tables.
   - This can be valid when schema is controlled externally, but it raises drift risk and increases onboarding complexity.

2. **Security defaults favor development.**
   - Default secret key and `DEBUG=True` are dev-safe but should never be used in production.
   - Production config exists in Render env vars, so this is mostly a guardrail/documentation concern.

3. **Session + token mixed auth requires clear contract.**
   - Works technically, but teams must document precedence and logout semantics to avoid confusion.

## 4) DevOps and deployment posture

- Render configuration is present and practical.
- Startup runs `bootstrap_schema` before gunicorn, implying runtime schema bootstrapping.

### Risk to watch

- Runtime schema setup is convenient, but long term it can obscure schema versioning intent vs explicit migration lifecycle.

## 5) Documentation quality

- Top-level `README.md` is still the generic Vite template and does not describe:
  - product purpose,
  - backend setup,
  - env vars,
  - auth model,
  - local runbook.

This is the biggest immediate maintainability gap.

## 6) Recommended next steps (priority order)

1. **Fix/verify frontend role normalization for `organizer`.**
2. **Replace README with project-specific docs** (frontend + backend run instructions, env variables, auth behavior).
3. **Break `src/api/aemApi.js` into modules** (auth, events, admin, mappers, transport).
4. **Document schema ownership strategy** (`managed=False`, SQL files, bootstrap command flow).
5. **Add CI checks** for frontend lint/build and backend tests/lint.

## 7) Overall assessment

The project has a solid full-stack foundation and a reasonably complete event-management domain implementation (auth, moderation, participation, waitlisting, admin views). The most pressing quality issues are maintainability/documentation and a potentially serious role-mapping bug in the frontend adapter.
