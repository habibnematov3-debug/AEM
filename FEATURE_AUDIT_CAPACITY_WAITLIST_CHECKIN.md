# Feature Audit: Capacity + Waitlist + Check-in

Date: 2026-04-03

## Requested plan vs implementation status

| Planned item | Status | Evidence |
|---|---|---|
| Event capacity | ✅ Implemented | `events.capacity` exists in schema/model/serializer and is used by seat-availability logic. |
| Waitlist status | ✅ Implemented | Participation supports `waitlisted`; join flow assigns waitlist when full; serializer exposes waitlist fields. |
| Auto promotion after cancel | ⚠️ Partially implemented (helper exists, flow not wired) | `promote_next_waitlisted()` exists, but cancel endpoint does not call it. |
| Organizer/admin attendance check-in | ⚠️ Partially implemented (data/token primitives only) | `checked_in_at` + check-in token helpers exist, but no check-in API route/view exposed. |
| Attendance analytics | ⚠️ Partially implemented | `checked_in_count` is computed in event serializer, but no dedicated attendance analytics endpoint/reporting flow. |

## Notes

- There is a critical backend consistency issue: `views.py` imports `notify_waitlist_promoted`, but no such function exists in `notifications.py`. This likely breaks backend import/startup until resolved.
- The backend route list currently exposes participation and participant list endpoints, but no check-in endpoint.

## Bottom line

Your plan is **not fully complete yet**. The repo has strong foundations for capacity/waitlist/check-in, but two crucial execution gaps remain:

1. promotion on cancellation is not wired,
2. organizer/admin check-in actions are not exposed via API/UI.
