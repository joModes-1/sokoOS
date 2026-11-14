# Desktop Security Strategy — SokoOS Desktop Track

**Purpose:** Define how the desktop application protects local data, credentials, session material, and financial operations, and how it limits what the frontend can do through Tauri capabilities and IPC.

**Status:** Design phase.

---

## 1. Security posture

This is a financial/business application. The desktop app must treat local storage, authentication material, and financial operations as security-sensitive, even when the device is offline.

The strategy follows:
- Least privilege
- Defense in depth
- Secure local storage
- Constrained IPC
- No hardcoded secrets
- Business-level data isolation on the device
- Preservation of the existing backend’s enforcement model

---

## 2. Threat model summary

Key threats to consider:
- Local attacker or malware with access to the device filesystem or process memory.
- Unauthorized local use of an unlocked device.
- Sensitive data left in plaintext on disk.
- Frontend code gaining too much native access through IPC.
- Offline operations that later sync and create duplicate or unsafe financial effects.
- Cross-business data leakage on a multi-business device.
- Spoofed or tampered sync payloads if the app trusts local state too much.
- Unauthorized local export or import of sensitive data.

The app cannot eliminate device-level compromise, but it should make local data, credentials, and financial operations much harder to abuse than a naïve desktop implementation.

---

## 3. Tauri capabilities and permissions

### 3.1 Capability design
- Grant the frontend only the capabilities it needs.
- Use Tauri’s capability system to limit what the React layer can ask the Rust layer to do.
- Avoid broad permissions “just in case.”

### 3.2 Access control philosophy
- The frontend should not have unrestricted filesystem, shell, or process control.
- File access should be scoped to specific directories or operations the app intentionally supports.
- Any native action that could affect the system or local data should go through a small, auditable set of Tauri commands.

---

## 4. IPC between React and Rust

### 4.1 Command surface
- Expose a small, intentional set of Tauri commands.
- Each command should have a clear purpose and clear input validation.
- Avoid leaking raw native access through generic “run this” style commands.

### 4.2 Validation
- Validate inputs at the command boundary, not only in the UI.
- Reject unexpected shapes, oversized payloads, and unsafe paths.
- Treat IPC inputs as untrusted even if they originate in the same app’s frontend.

### 4.3 Secure data movement
- Sensitive material should travel through the minimal command surface needed.
- Avoid logging or echoing secrets/keys/tokens through IPC, logs, or error messages.
- Do not put sensitive material in places the frontend can casually read unless that access is intentional and protected.

---

## 5. Secure local storage

### 5.1 What must be protected
- Access tokens and session material.
- Any refresh material or device/session secrets the app chooses to keep locally.
- Sensitive cached business data where local exposure would be harmful.
- Sync metadata that could be used to tamper with or replay operations if misused.

### 5.2 Storage mechanisms
- Use the platform’s protected storage mechanisms for credentials/session material rather than plaintext files or ordinary app folders where possible.
- Encrypt sensitive local material where appropriate and where the platform supports it.
- Keep the key material management as simple and auditable as possible; do not invent a custom crypto protocol unless there is a clear need and review.

### 5.3 SQLite security
- The local SQLite database should not be treated as a secret vault by default, but sensitive columns should be handled carefully.
- If sensitive data is stored in SQLite, consider encryption or column-level protection for the most sensitive fields.
- Do not rely on “the file is in a user folder” as the only protection for financial or credential material.

### 5.4 Temp and export artifacts
- Clean up temporary files.
- Be careful with exported files: they may contain sensitive business data.
- Do not leave sensitive exports in obvious unsecured locations longer than necessary.

---

## 6. Authentication and session handling

### 6.1 No hardcoded credentials
- Never hardcode API secrets, signing credentials, or production passwords.
- Configuration should come from secure local storage, environment, or platform-specific secure storage, not from source code.

### 6.2 Session continuity and limits
- If the app keeps a local session for offline continuity, that session must be stored securely.
- The app should still respect the session’s scope: business, branch, permissions.
- Logout and session invalidation should clean up local material appropriately.

### 6.3 Re-auth for sensitive actions
- For sensitive financial actions, consider local confirmation or re-authentication where appropriate.
- Offline, the app should still be able to preserve the user’s authorized intent without giving the next person who sits at the device unrestricted access.

---

## 7. Business-level data isolation on the device

Since SokoOS is multi-tenant:
- Local data for one business should not leak to another business’s local context.
- The app should keep active business/branch context explicit.
- Exports, logs, and temp data should be scoped or labeled so they do not accidentally expose another business’s data.
- If multiple local profiles/users are supported, their data should be isolated appropriately.

---

## 8. Input validation

### 8.1 Where validation happens
- In the UI for usability.
- In the sync/outbox layer for data integrity.
- At IPC boundaries for safety.
- Against the same shared Zod schemas where applicable, so the desktop app does not invent its own ideas about valid payloads.

### 8.2 What validation protects
- Money values and quantities.
- UUIDs and identifiers.
- Dates, statuses, and lifecycle transitions.
- File types and sizes for imports/exports/attachments.
- Sync payloads and retries.

---

## 9. Secure synchronization

Sync is a trust boundary. The desktop app should not assume that every local operation is safe to replay without rules.

### 9.1 Sync protections
- Use stable ids and idempotency keys where the backend uses them.
- Validate outbound sync payloads before sending.
- Treat sync failures and conflicts as security/integrity events, not just network events.
- Log sync actions for auditability without logging secrets.
- Do not allow the outbox or local state to become a mechanism for creating duplicate financial effects.

### 9.2 Anti-replay and tamper resistance
- If offline state can be edited locally, the app should detect obvious tampering where feasible and should never silently trust a corrupted outbox as if it were authoritative financial history.
- The backend’s enforcement remains the final safeguard for financial integrity; the desktop app should reduce, not replace, that reliance.

---

## 10. Logging and observability security

### 10.1 What to log
- Startup/shutdown events.
- Sync start/end and per-operation outcomes.
- Conflicts and retries.
- Permission denied or auth-related events.
- Errors with enough context to diagnose, but not enough to expose secrets.

### 10.2 What never to log
- Passwords.
- Tokens or keys in usable form.
- Full payment details beyond what is needed for safe diagnostics.
- Other personal or sensitive data that does not need to be in logs.

---

## 11. Updates and integrity

### 11.1 Update safety
- Updates must preserve local databases and sync queues.
- An update should not silently delete pending operations or local business data.
- Update artifacts and installers should be handled through the platform’s expected distribution path, with signing where required.

### 11.2 Local integrity checks
- Where practical, the app should detect obvious local data corruption and recover gracefully rather than behaving unpredictably.
- The app should not assume local SQLite is always perfectly consistent after a crash; it should recover or report problems.

---

## 12. Hardware and peripheral security

For barcode scanners, receipt printers, and similar integrations:
- Treat peripheral access as modular and scoped.
- Do not expose raw device control broadly to the frontend.
- Sanitize scanned input as untrusted data.
- Keep hardware integrations behind a small, auditable native surface.

---

## 13. Compliance and data handling

The existing platform’s compliance posture should be preserved:
- Personal data, financial records, and business registration/tax information are sensitive.
- Patient medical records are out of scope for the initial release.
- Local handling of personal and financial data should be consistent with the platform’s data-protection expectations and any relevant Ugandan data protection requirements referenced by the existing docs.

---

## 14. Security acceptance criteria

Before treating security as done for a release, verify:
- The frontend cannot perform arbitrary native actions outside the intended command surface.
- Tokens/session material are stored securely, not in plaintext where avoidable.
- Sensitive exports and temp files are handled carefully.
- Business isolation is preserved locally.
- Sync does not create duplicate financial effects through naive retries.
- Logs do not leak secrets.
- Input validation is present at UI, IPC, and sync boundaries.
- No secrets are hardcoded.
- Offline-sensitive actions have appropriate local confirmation or session constraints.

---

## 15. Dependencies and review gates

Security-sensitive changes should be reviewed before release:
- Any expansion of Tauri capabilities.
- Any change to how tokens/session material are stored.
- Any new native command that touches files, processes, or peripherals.
- Any change to sync retry or outbox behavior that could affect financial integrity.
- Any change that affects business isolation on the device.

---

## 16. Decisions recorded here

1. Tauri capabilities are least-privilege and intentionally small.
2. IPC is constrained to a small audited command surface with validation at the boundary.
3. Credentials and session material are stored securely, not in plaintext where avoidable.
4. Sensitive data in SQLite is handled with care; file-location alone is not the protection.
5. Multi-business isolation is preserved locally, not just server-side.
6. Sync is treated as a trust boundary with idempotency, validation, and conflict safety.
7. Logs are useful but must not leak secrets.
8. No secrets are hardcoded; updates must preserve local data and sync queues.
