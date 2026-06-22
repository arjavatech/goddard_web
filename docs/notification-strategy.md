# Notification Strategy — Goddard School Enrollment Application

This document defines every place in the application where notifications should be displayed to users, organized by role. For each notification, it specifies the location, trigger, purpose, and expected user action.

---

## Notification Types Used in This Application

| Type | Component | Behavior |
|------|-----------|----------|
| **Toast** | `Toast` via `ToastContext` | Slides in from top-center, auto-dismisses after 4 seconds. Used for transient success/error feedback. |
| **Inline Error Banner** | `<div className="bg-red-50 ...">` | Persists on the page until resolved. Used for data-load failures. |
| **Dialog / Modal** | `Notification` component or `Dialog` | Blocks interaction until dismissed. Used for confirmations and critical warnings. |
| **Inline Field Error** | `<p className="text-red-600">` | Appears directly below an input. Used for form validation. |

---

## 1. Parent Users

Parents access the application at `/dashboard` after logging in. Their experience is focused on viewing their children's enrollment status and submitting required forms.

---

### 1.1 Dashboard Data Load Failure

- **Where:** Top of the parent Dashboard page, above all content.
- **When:** The `fetchSingleParent` API call fails on page load (network error, missing school context, missing parent ID).
- **Why:** The parent's entire dashboard depends on this data. Without it, all cards show empty states, which would be confusing without explanation.
- **Type:** Inline Error Banner (red)
- **User Action:** Read the message. If the problem persists, contact the school administrator. No retry button is currently rendered — one should be added.

---

### 1.2 No Enrolled Children Found

- **Where:** Center of the Dashboard, replacing the child cards area.
- **When:** The API returns successfully but the parent has no children linked to their account.
- **Why:** Prevents confusion from an empty-looking dashboard with no explanation.
- **Type:** Inline empty-state message (not a toast).
- **User Action:** Contact the school administrator to confirm the enrollment was set up correctly.

---

### 1.3 Overdue Forms Warning

- **Where:** Inside the `EnrollmentProgress` card, in the `currentStep` label shown per child.
- **When:** One or more assigned forms have a `dueDate` in the past and are not yet completed.
- **Why:** Parents need to be alerted urgently to overdue submissions to avoid delays in their child's enrollment.
- **Type:** Inline status label within the progress card (e.g., "2 overdue forms").
- **User Action:** Navigate to the Forms & Documents section and complete the overdue forms immediately.

---

### 1.4 Form Submission / Completion Feedback

- **Where:** After a parent successfully completes and submits a form via the Fillout embed.
- **When:** The `onFormCompleted` callback fires, refreshing the dashboard data.
- **Why:** Confirms to the parent that their form was received and that the progress tracker is up to date.
- **Type:** Toast — `success`
- **Recommended Message:** "Form submitted successfully. Your enrollment progress has been updated."
- **User Action:** None required. The dashboard automatically refreshes.

> **Gap:** This toast is not currently implemented. The `handleFormCompleted` function only triggers a data refresh. A success toast should be added here.

---

### 1.5 Login — Invalid Credentials

- **Where:** Login page (`/login`), after form submission.
- **When:** `signInWithPassword` throws an error (wrong password, unrecognized email).
- **Why:** The parent must know that their credentials are incorrect so they can try again or reset their password.
- **Type:** Toast — `error`, with title "Login Failed".
- **User Action:** Re-enter credentials or click "Forgot password?" to reset.

---

### 1.6 Login — School Mismatch

- **Where:** Login page, inline below the password field.
- **When:** The authenticated user's `schoolId` does not match the school selected in the school selector.
- **Why:** The user signed into the wrong school portal and must be redirected to correct the school selection before proceeding.
- **Type:** Inline Error Banner (red) with a link back to school selection.
- **User Action:** Click "Go back and select correct school" to restart with the correct school selected.

---

### 1.7 Session Expiry / Auto-Logout

- **Where:** Any authenticated page.
- **When:** The user has been inactive for 30 minutes (`useSessionTimeout` hook triggers `signOut`).
- **Why:** Protects account security by automatically ending unattended sessions.
- **Type:** Currently only a `console.warn` 5 minutes before expiry. No visible warning is shown to the user.
- **User Action:** The user is redirected to the login page. They must sign back in.

> **Gap:** A warning toast or modal should be shown at the 25-minute mark (5 minutes before auto-logout) to give the user a chance to stay logged in. Example: "Your session will expire in 5 minutes due to inactivity. Click anywhere to stay logged in."

---

### 1.8 Forgot Password — Email Sent Confirmation

- **Where:** Forgot Password page (`/forgot-password`), after form submission.
- **When:** The password reset email is dispatched successfully.
- **Why:** The parent needs confirmation that the email is on its way and what to do next.
- **Type:** Toast — `success` or inline success message.
- **User Action:** Check email inbox and follow the reset link.

---

## 2. Admin Users

Admins access the application at `/admin/*`. Their responsibilities include managing parents, students, classrooms, and forms for their school.

---

### 2.1 Invite Parent — Success

- **Where:** Parent Management page and Admin Dashboard (both use `InviteParentModal`).
- **When:** `inviteParent` API call returns successfully.
- **Why:** Confirms to the admin that the invitation email has been sent to the new parent.
- **Type:** Toast — `success`
- **Message:** `"Invitation sent to {parentEmail}"` or `"Parent invitation sent successfully"`.
- **User Action:** None required. The parent list refreshes automatically.

---

### 2.2 Invite Parent — Email Already Exists

- **Where:** Inside the Invite Parent modal, on the email field.
- **When:** The entered email matches an existing parent email in the system (checked before API call or returned as a 409 conflict).
- **Why:** Prevents duplicate invitations and informs the admin that this parent already has an account.
- **Type:** Inline Field Error + Toast — `error`
- **Message:** `"Email already exists"`.
- **User Action:** Enter a different email address or locate the existing parent in the directory.

---

### 2.3 Invite Parent — Email Bounce

- **Where:** Inside the Invite Parent modal, on the email field.
- **When:** The email service returns a bounce error (HTTP 502 or `EMAIL_BOUNCE` error code).
- **Why:** The email address is invalid or previously bounced. Re-inviting would fail again and should not be retried automatically.
- **Type:** Inline Field Error + Toast — `error`
- **Message:** The specific bounce message from the API (e.g., "Email was suppressed by the mail provider…").
- **User Action:** Ask the parent to provide a different, valid email address.

---

### 2.4 Resend Parent Confirmation — Success / Failure

- **Where:** Parent Management page, via the "Resend" action in the parent row dropdown.
- **When:** `resendParentConfirmation` completes (success or HTTP error).
- **Why:** Tells the admin whether the confirmation email was re-sent so they can follow up with the parent appropriately.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"Confirmation email resent to {parentEmail}"`.
- **Error Messages:** `"Parent not found. Please refresh the page and try again."` (404), `"Invalid parent ID."` (400/422), bounce-specific message, or generic fallback.
- **User Action (on error):** Refresh the page and retry, or ask the parent to contact support.

---

### 2.5 Deactivate / Activate Parent — Success / Failure

- **Where:** Parent Management page, after confirming the deactivation or activation dialog.
- **When:** `deactivateParent` or `activateParent` API call completes.
- **Why:** Confirms the status change so the admin knows it was applied and can see it reflected in the directory.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"{parentName} deactivated"` / `"{parentName} activated"`.
- **User Action:** None required on success. On error, retry or contact support.

---

### 2.6 Add Child to Parent — Success / Failure

- **Where:** Parent Management page, after submitting the "Add Child" dialog.
- **When:** `addChild` API call completes.
- **Why:** Confirms the child was linked to the parent's account and is now visible in their profile.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"{childFirstName} {childLastName} added successfully"`.
- **User Action:** None required on success.

---

### 2.7 Add Form Template — Success / Failure / Duplicate

- **Where:** Forms Management page and Admin Dashboard, after the "Add Form" dialog is submitted.
- **When:** `createFormTemplate` API call completes.
- **Why:** Confirms whether the new form template was created or, if the name already exists, prompts the admin to rename it.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"Form template created successfully"` or `"Form created successfully"`.
- **Duplicate Error:** `"Form already exists with the same name."` — also sets an inline field error on the form name input.
- **User Action (on duplicate):** Change the form name in the input field and resubmit.

---

### 2.8 Edit Form Template — Success / Failure

- **Where:** Forms Management page, after the "Edit Form" dialog is submitted.
- **When:** `updateFormTemplate` API call completes.
- **Why:** Confirms the form was updated in the system.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"Form updated successfully"`.
- **User Action:** None required on success.

---

### 2.9 Assign Form to All Students — Success / Failure

- **Where:** Forms Management page, after confirming the "Assign to All Students" dialog.
- **When:** `assignFormToAllStudents` API call completes.
- **Why:** This is a bulk operation affecting every enrolled student. The admin needs confirmation it ran or an error if it did not.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"Form "{formName}" assigned to all students successfully!"`.
- **User Action:** None required on success.

---

### 2.10 Add Classroom — Success / Failure / Duplicate

- **Where:** Classroom Management page and Admin Dashboard, after the "Add Classroom" dialog is submitted.
- **When:** `createClassroom` API call completes.
- **Why:** Tells the admin whether the new classroom was created so they can start adding students to it.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"Classroom "{name}" created successfully"`.
- **Duplicate Error:** `"Classroom name already exists"`.
- **User Action (on duplicate):** Choose a unique classroom name.

---

### 2.11 Rename Classroom — Success / Failure

- **Where:** Classroom Management page, after the "Rename Classroom" dialog is submitted.
- **When:** `renameClassroom` API call completes.
- **Why:** Confirms the classroom name change was saved and is now visible to parents.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"Classroom renamed to "{newName}" successfully"`.
- **User Action:** None required on success.

---

### 2.12 Delete Classroom — Success / Failure / Blocked

- **Where:** Classroom Management page, after the "Delete Classroom" dialog is confirmed.
- **When:** `deleteClassroom` API call completes, or the user tries to delete a classroom that has students enrolled.
- **Why:** Deletions are irreversible. The admin must be informed of the outcome, and blocked if the classroom still has students.
- **Type:** Toast — `success` or `error`. Inline error in the dialog if students are enrolled.
- **Success Message:** `"Classroom "{name}" deleted successfully"`.
- **Blocked (in-dialog):** `"Cannot delete this classroom. It has {n} student(s) enrolled."` — Delete button is disabled.
- **User Action (blocked):** Transfer or archive all students from the classroom before attempting deletion.

---

### 2.13 Transfer Student to New Classroom — Success / Failure

- **Where:** Student Management page, after the "Transfer Student" dialog is confirmed.
- **When:** `promoteStudent` API call completes.
- **Why:** Classroom transfers affect a student's enrollment record. The admin needs to know the operation succeeded.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"Student transferred successfully!"`.
- **User Action:** None required on success.

---

### 2.14 Bulk Transfer Students — Success / Failure

- **Where:** Student Management page, after the "Bulk Grade Transfer" dialog is confirmed.
- **When:** `bulkPromoteStudents` API call completes.
- **Why:** Bulk operations affect many records at once. Clear confirmation prevents the admin from wondering whether it ran.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"Successfully transferred {n} students!"`.
- **User Action:** None required on success.

---

### 2.15 Form Download (All Forms for a Student) — Failure

- **Where:** Student Management page, in the student row actions dropdown.
- **When:** `downloadAllForms` API call fails.
- **Why:** The admin initiated a download and needs to know it failed so they can retry or investigate.
- **Type:** Toast — `error`
- **Message:** `"Failed to download forms. Please try again."`.
- **User Action:** Retry the download.

---

### 2.16 Invite Admin — Success / Failure

- **Where:** Admin Management page (accessible to Super Admins in the admin layout), after the "Invite Admin" dialog is submitted.
- **When:** `inviteAdmin` API call completes.
- **Why:** Confirms whether the new admin's invitation was sent.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"Invitation sent to {adminEmail}"`.
- **Role Conflict Error:** `"Already registered with different role"`.
- **User Action (on error):** Verify the email is not already in use under a different role.

---

### 2.17 Resend Admin Invite — Success / Failure

- **Where:** Admin Management page, in the admin row dropdown (visible only for unverified admins).
- **When:** `resendAdminInvite` API call completes.
- **Why:** Tells the admin whether the re-send was successful so they can follow up with the invitee.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"Invitation resent successfully to {adminEmail}"`.
- **User Action:** None required on success.

---

### 2.18 Update Admin Details — Success / Failure

- **Where:** Admin Management page, after the "Edit Admin" dialog is submitted.
- **When:** `updateAdmin` API call completes.
- **Why:** Confirms the admin record was updated.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"Admin updated successfully"`.
- **User Action:** None required on success.

---

### 2.19 Delete Admin — Success / Failure

- **Where:** Admin Management page, after the "Delete Admin" confirmation dialog.
- **When:** `deleteAdmin` API call completes.
- **Why:** Admin deletion is irreversible. The confirming user needs to know it succeeded.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"Admin deleted successfully"`.
- **User Action:** None required on success.

---

### 2.20 Dashboard Data Load Failure

- **Where:** Top of the Admin Dashboard, above the stat cards.
- **When:** `fetchDashboardMetrics` API call fails.
- **Why:** Without metrics the page is empty. The admin needs to know the data failed to load.
- **Type:** Inline Error Banner (red).
- **User Action:** Refresh the page or contact support if the problem persists.

---

## 3. Super Admin Users

Super Admins access the application at `/superadmin-arjava/*`. They manage schools, clients, and system-level users across all Goddard School locations.

---

### 3.1 Add School — Success / Partial Success / Failure

- **Where:** School Management page, after the "Add School" dialog is submitted.
- **When:** The school creation API call and the Supabase admin invite call complete.
- **Why:** School creation involves two separate operations. The admin needs to know whether both succeeded or if only the school was created but the admin invite failed.
- **Type:** Toast — `success` or `error`
- **Full Success:** `"School created and admin invite sent successfully"`.
- **Partial Success:** `"School created but failed to send admin invite"` — the school exists but the admin user has not been invited.
- **Full Failure:** `"Failed to create school"` or `"Error creating school"`.
- **User Action (partial success):** Manually invite the admin user through Admin Management or retry the invite flow.

---

### 3.2 Update School — Success

- **Where:** School Management page, after the "Edit School" dialog is submitted.
- **When:** The local school state is updated (note: currently no API call is made for updates — state is updated optimistically).
- **Why:** Confirms the change was applied.
- **Type:** Toast — `success`
- **Message:** `"School updated successfully"`.
- **User Action:** None required.

> **Gap:** The edit currently updates only local state without persisting to the backend API. A real API call should be added, and the toast should only fire on success.

---

### 3.3 Delete School — Success / Failure

- **Where:** School Management page, after confirming the "Delete School" dialog.
- **When:** The DELETE API call to `/schools/{id}` completes.
- **Why:** School deletion removes all associated data permanently. The super admin needs clear confirmation or an error message.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"School deleted successfully"`.
- **Failure Message:** `"Failed to delete school"` or `"Error deleting school"`.
- **User Action (on error):** Retry the deletion or investigate whether dependent data is preventing it.

---

### 3.4 System Status — Real-Time Alerts

- **Where:** Super Admin Dashboard, in the "System Status" card.
- **When:** Any of the monitored services (Database, API) change from Online/Connected to an error state.
- **Why:** The super admin is responsible for system health. Any outage must be surfaced immediately.
- **Type:** Badge change from `success` to `warning` or `destructive` within the card. A Toast — `error` should also fire for critical outages.
- **User Action:** Investigate the failing service and escalate if necessary.

> **Gap:** The System Status card currently shows static "Online" / "Connected" / "Active" badges with no real monitoring logic. Dynamic health checks and alert notifications need to be implemented.

---

### 3.5 Invite Super Admin — Success / Failure / Role Conflict

- **Where:** Super Admin Management page (if applicable), after the invite dialog is submitted.
- **When:** The invite API call completes.
- **Why:** Super admin invitations are high-privilege operations. Clear feedback prevents duplicate attempts.
- **Type:** Toast — `success` or `error`
- **Success Message:** `"Invitation sent to {email}"`.
- **Role Conflict:** `"Already registered with different role"`.
- **User Action (on role conflict):** Verify the target email does not already exist under a different user role.

---

### 3.6 Subscription Changes — Success / Failure

- **Where:** Subscription Management page, after any subscription plan modification.
- **When:** The subscription update API call completes.
- **Why:** Subscription changes directly affect what a school can access. The super admin needs confirmation.
- **Type:** Toast — `success` or `error`
- **User Action:** None required on success. On failure, retry or check API logs.

> **Gap:** The `SubscriptionManagement` and `SubscriptionPlans` pages do not appear to have toast notifications wired up. These should be added.

---

## 4. Cross-Role Notifications

These notifications apply regardless of the user's role.

---

### 4.1 Session Expiry Warning (All Roles)

- **Where:** Any authenticated page, displayed as a floating modal or persistent toast.
- **When:** 5 minutes before the 30-minute inactivity timeout fires (currently only a `console.warn` — **not visible to users**).
- **Why:** Auto-logout without warning causes loss of unsaved work and a disruptive experience.
- **Type:** Modal or persistent Toast — `warning`
- **Recommended Message:** "Your session will expire in 5 minutes due to inactivity. Click anywhere to stay logged in."
- **User Action:** Interact with the page to reset the session timer, or accept the logout.

---

### 4.2 Authentication / Token Errors (All Roles)

- **Where:** Any page making an authenticated API call.
- **When:** The token refresh fails or the user's session is invalidated by the backend.
- **Why:** The user should know their session has ended rather than seeing a blank page or silent failure.
- **Type:** Toast — `error`, followed by redirect to `/login`.
- **Message:** "Your session has ended. Please sign in again."
- **User Action:** Sign back in.

---

### 4.3 Network / Generic API Error (All Roles)

- **Where:** Any page where a data mutation is triggered (form submissions, CRUD operations).
- **When:** A fetch/API call fails with no specific error code (timeout, network offline, 500).
- **Why:** Users should never see a silent failure. Even if the error is non-specific, they should know the action did not complete.
- **Type:** Toast — `error`
- **Fallback Message:** "Something went wrong. Please try again."
- **User Action:** Retry the action. If it persists, contact support.

---

## 5. Notification Implementation Gaps (Summary)

The following notifications are needed but not yet implemented:

| # | Gap | Role | Priority |
|---|-----|------|----------|
| 1 | Form completion success toast on parent dashboard | Parent | High |
| 2 | Session expiry warning modal/toast (5 min before logout) | All | High |
| 3 | Assign forms to student — no toast on success or error | Admin | High |
| 4 | School update does not persist to backend, toast fires optimistically | Super Admin | High |
| 5 | Subscription management pages missing all toast notifications | Super Admin | Medium |
| 6 | System Status card uses static data with no real health monitoring | Super Admin | Medium |
| 7 | No retry button on dashboard load failure banners | Parent / Admin | Low |
| 8 | No confirmation toast when admin form assignment dialog closes without submitting | Admin | Low |
