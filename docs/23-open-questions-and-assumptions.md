# Open Questions and Assumptions

Decisions that were filled with a default rather than confirmed by a source or an answer are listed here, so that nothing is silently assumed. Review each one before relying on it.

## Assumptions

| Key | Area | Value | Rationale |
|---|---|---|---|
| product.success | Success metrics | Active weekly users and completed core flows tracked from launch; targets set after first month | Founder-mode default |
| data.retention | Deletes and backups | Soft-delete business records; hard-delete tokens; daily backups kept 14 days | Founder-mode default |
| auth.mfa | MFA | Required for admin roles; optional for others | Founder-mode default |
| ui.design_source | Design source | Tailwind CSS with a simple neutral design system; no Figma | Founder-mode default |
| ui.accessibility | Accessibility | WCAG 2.1 AA | Founder-mode default |
| i18n.languages | Languages | English only; i18n-ready; USD | Founder-mode default |
| nfr.performance | Performance | p95 API < 500 ms for reads, < 1 s for writes at 50 concurrent users | Founder-mode default |
| nfr.availability | Availability | 99.5% monthly | Founder-mode default |
| timeline.target | Timeline | MVP built by one developer with an AI coding agent | Founder-mode default |

## Deferred

Nothing was deferred.


## Unanswered questions

Every interview question was answered.

