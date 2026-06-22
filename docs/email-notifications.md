# Email Notification Requirements

**Application:** Goddard School Enrollment Application  
**Last updated:** June 2026

## Overview

This document defines the application scenarios where email notifications should be sent to users. It is intended as the source of truth for backend email triggers, frontend expectations, QA coverage, and future template work.

Priority levels:

- **Informational:** Confirms an action or shares a non-urgent status update.
- **Important:** Requires timely awareness or follow-up, but does not immediately block access or enrollment.
- **Critical:** Blocks account access, enrollment progress, security recovery, or urgent compliance follow-up.

## Recipient Rules

- **Primary Parent:** The parent account owner for the enrollment.
- **Secondary Parent:** Include when `secondary_parent_email` or `additional_parent_email` exists on the enrollment and the notification concerns the child, forms, classroom placement, or enrollment progress.
- **Account owner only:** Authentication, invite, password, activation, and deactivation emails should go only to the email address tied to that user account.
- **Admin:** School-level administrator for one school.
- **Super Admin:** System-level administrator managing schools and cross-school operations.
- **Do not send emails for read-only actions:** Searching, filtering, exporting, viewing dashboards, downloading PDFs/ZIPs, and local UI-only edits should not trigger email unless explicitly listed below.

---

## 1. Authentication and Account Access

| Scenario | Trigger Event | Recipient | Purpose | Email Content Summary | Priority Level |
|---|---|---|---|---|---|
| Parent enrollment invitation | Admin invites a parent from Admin Dashboard, Parent Management, or Classroom Details. API: `POST /enrollments/parent-invite`. | Primary Parent. Secondary Parent if a separate secondary invite/account is created. | Allow parents to activate their portal account and begin enrollment tasks. | School name; parent name; child name; assigned classroom; secure account setup link; expiration guidance; school contact details. | Critical |
| Resend parent invitation or confirmation | Admin clicks resend for a parent with incomplete signup. API: `POST /enrollments/resend-confirmation`. | Parent account owner for the selected parent record. | Restore access when the original invite was missed, expired, or filtered. | Reminder wording; secure setup/confirmation link; child/school context; support contact; link expiration note. | Important |
| Admin account invitation | Super Admin or authorized Admin invites a school admin. API: `POST /auth/invite-create` or Supabase admin invite. | Newly invited Admin. | Give the admin access to the school admin portal. | School name; role; inviter/school context; secure setup link; expiration guidance; login URL. | Critical |
| Resend admin invitation | Super Admin or authorized Admin resends an invite to an unverified admin. API: `POST /auth/admin-resend-invite`. | Unverified Admin. | Let an invited admin complete account setup after missing or losing the original email. | Reminder wording; secure setup link; school name; role; support contact. | Important |
| Initial school owner invite | Super Admin creates a school and provides the first owner/admin. API: `POST /schools/with-owner`, followed by a Supabase admin invite (`supabase.auth.admin.inviteUserByEmail`). | First Admin/owner for the new school. | Complete onboarding for the newly created school. | School name; subdomain or portal URL; admin role; secure setup link; next steps for configuring school data. | Critical |
| Self-registration email confirmation | User signs up from `/signup` and Supabase requires email confirmation. | Registering user. | Verify ownership of the email before account activation. | Confirmation link; account email; expiry note; instructions to return to login after confirmation. | Critical |
| Password reset request | User submits `/forgot-password`. API: `POST /auth/forgot-password`. | Requesting user, whether Parent, Admin, or Super Admin. | Let a user regain access securely. | Password reset link; expiry note; school context if available; warning to ignore the email if they did not request it. | Important |
| Password changed confirmation | User successfully sets or resets a password on `/set-password`. | Account owner. | Confirm that account credentials changed. | Timestamp; account email; school/portal name; support contact; warning to report the change if unexpected. | Important |
| Session/security anomaly alert | Backend detects suspicious login, repeated failed login attempts, or password reset abuse. | Account owner; optionally Super Admin for system-level abuse. | Warn users and administrators about possible account compromise. | Account email; event type; timestamp; approximate location/IP if available; recommended action such as password reset or support contact. | Critical |

---

## 2. Parent and Enrollment Lifecycle

| Scenario | Trigger Event | Recipient | Purpose | Email Content Summary | Priority Level |
|---|---|---|---|---|---|
| New child added to existing parent | Admin adds a child to an existing parent account. API: `POST /enrollments/add-child`. | Primary Parent; Secondary Parent when associated with the child. | Confirm that the child was added and prompt completion of required tasks. | Child name; date of birth; classroom; enrollment status; forms assigned immediately; portal link. | Important |
| Parent account deactivated | Admin deactivates a parent account. API: `DELETE /parent/{parentId}`. | Deactivated Parent account owner. | Notify the parent that portal access has been revoked. | Effective date/time; school name; what access is disabled; contact information if this was unexpected. | Important |
| Parent account reactivated | Admin reactivates a parent account. API: `PATCH /parent/{parentId}/activate`. | Reactivated Parent account owner. | Notify the parent that portal access is restored. | Reactivation confirmation; login URL; school name; support contact. | Informational |
| Student archived or made inactive | Admin changes a child status to archived/inactive. API: `PATCH /children/{childId}/status` with `status: archive`. | Primary Parent; Secondary Parent when present. | Inform parents that the child's enrollment record is no longer active for normal form workflows. | Child name; effective date; archived/inactive status; impact on forms; school contact for questions. | Important |
| Student reactivated | Admin changes a child status back to active. API: `PATCH /children/{childId}/status` with `status: active`. | Primary Parent; Secondary Parent when present. | Inform parents that the child's enrollment workflow is active again. | Child name; active status; any pending forms; portal link. | Informational |
| Student classroom transfer (individual) | Admin transfers a single student to another classroom. API: `POST /class-promotions/{enrollmentId}`. | Primary Parent; Secondary Parent when present. | Keep parents informed of classroom placement changes. | Child name; previous classroom; new classroom; effective date; reason if supplied; note about any new required forms. | Informational |
| Bulk student promotion or transfer | Admin runs a bulk class promotion. API: `POST /class-promotions/bulk`. | Primary and Secondary Parents for each affected student (individual emails per family). | Notify each family of their own child's classroom change. | Child name; prior classroom; new classroom; effective date; promotion reason; school contact. | Informational |
| Enrollment completed and fully approved | All required forms for a child are approved and the enrollment status reaches completed/admin-approved. | Primary Parent; Secondary Parent when present; optionally Admin as a daily digest. | Confirm that enrollment requirements are complete. | Child name; completion date; approved forms summary; next enrollment steps or upcoming program start information; school contact. | Important |

---

## 3. Form Assignment, Submission, Review, and Reminders

| Scenario | Trigger Event | Recipient | Purpose | Email Content Summary | Priority Level |
|---|---|---|---|---|---|
| Form assigned to an individual student | Admin assigns one or more forms from Student Management. API: `POST /student-form-assignments/assign`. | Primary Parent; Secondary Parent when present. | Notify parents that new paperwork is available and may require action. | Child name; form names; due dates; required/optional status; direct portal link; school contact. | Important |
| Form assigned to all students in a classroom | Admin assigns forms to a class. API: `POST /student-form-assignments/assign-to-class` and/or `POST /class-form-overrides`. | Primary and Secondary Parents for each affected child (individual emails per family). | Notify affected families about classroom-specific form requirements. | Child name; classroom; form names; due dates; portal link; whether this is a new requirement. | Important |
| Form assigned to all students in the school | Admin assigns a form globally. API: `POST /student-form-assignments/assign-to-school`. | Primary and Secondary Parents for every active enrolled child. | Notify all families of a school-wide form requirement. | Form name; due date; required/optional status; portal link; school name. | Important |
| Parent submits a form | Parent completes and submits a form in the Fillout-embedded form view. Fillout webhook triggers status change to `in_progress` or `submitted`. | Admin for the school; optionally Primary Parent as confirmation. | Alert admin that a form is ready for review; confirm submission to the parent. | Child name; form name; submission timestamp; link to review queue (Admin); submission confirmation and next steps (Parent). | Important |
| Form approved by Admin | Admin clicks Approve on a form submission. API: `PUT /student-form-assignments/review` with `status: approved`. | Primary Parent; Secondary Parent when present. | Confirm to parents that the reviewed form has been approved. | Child name; form name; approved date; reviewer name if displayable; any admin notes; remaining forms count and portal link. | Important |
| Form rejected / revision requested by Admin | Admin clicks Reject on a form submission with notes. API: `PUT /student-form-assignments/review` with `status: rejected`. | Primary Parent; Secondary Parent when present. | Prompt parents to correct and resubmit the form with context on what needs to change. | Child name; form name; rejection date; reviewer notes/reason; direct portal link to reopen and edit the form; school contact. | Critical |
| Form due date reminder — manual (individual) | Admin clicks "Send Reminder" for a specific form in Due Forms Tracking. API: `POST /emails/bulk-form-reminders` (single entry). | Parent(s) on the form record — primary and secondary emails if both are present. | Prompt the parent to complete a specific form before or after its due date. | Form name; child name; classroom; due date; current status; direct portal link; school contact. | Important |
| Form due date reminder — bulk (pending) | Admin clicks "Remind Pending" in Due Forms Tracking. API: `POST /emails/bulk-form-reminders` (batch). | All Parents whose selected forms have `status: pending`. | Remind all families with outstanding pending forms in a single admin action. | Form name; child name; classroom; due date; portal link per child/form. Each parent receives their own email. | Important |
| Form due date reminder — bulk (in progress) | Admin clicks "Remind In Progress" in Due Forms Tracking. API: `POST /emails/bulk-form-reminders` (batch). | All Parents whose selected forms have `status: in_progress`. | Prompt families who have started but not completed their forms. | Form name; child name; classroom; due date; portal link to resume. | Important |
| Form due date reminder — bulk (overdue) | Admin clicks "Remind Overdue" in Due Forms Tracking. API: `POST /emails/bulk-form-reminders` (batch). | All Parents whose selected forms have `status: overdue`. | Urgently remind families that a form's deadline has passed. | Form name; child name; classroom; original due date; overdue notice; portal link; request to act immediately. | Critical |
| Form due date reminder — bulk (selected) | Admin selects specific form rows in Due Forms and clicks "Remind Selected". API: `POST /emails/bulk-form-reminders` (batch of selected IDs). | Parents for only the selected form records. | Targeted reminder for a specific subset of forms. | Form name; child name; classroom; due date; status; portal link. | Important |

---

## 4. Admin and School Management

| Scenario | Trigger Event | Recipient | Purpose | Email Content Summary | Priority Level |
|---|---|---|---|---|---|
| New school created | Super Admin creates a school via School Management. API: `POST /schools/with-owner`. | First school Admin/owner. | Confirm school creation and prompt the admin to begin configuration. | School name; subdomain; portal URL; admin role; secure account setup link; next steps. | Critical |
| School deleted | Super Admin deletes a school via School Management. API: `DELETE /schools/{schoolId}`. | School Admin(s) associated with the deleted school; Super Admin as audit record. | Notify affected admins that the school and all associated data have been removed. | School name; deletion timestamp; data removal scope (students, parents, forms); Super Admin contact. | Critical |
| Admin account deleted | Super Admin or authorized Admin deletes an admin user. API: `DELETE /users/admin`. | Deleted Admin account owner. | Confirm to the removed admin that their access has been revoked. | Account email; school name; effective date; Super Admin or support contact if this was unexpected. | Important |
| Admin profile updated | Admin updates another admin's profile. API: `PUT /users/admin`. | Updated Admin account owner. | Confirm the profile change and alert the user if they did not initiate it. | Fields changed (first name, last name, phone); timestamp; school name; note to contact support if unexpected. | Informational |

---

## 5. Email Delivery Failure and Suppression

These scenarios describe system-level notifications that arise from email infrastructure errors. They are distinct from user-facing notification emails.

| Scenario | Trigger Event | Recipient | Purpose | Email Content Summary | Priority Level |
|---|---|---|---|---|---|
| Email bounce / suppression detected | Backend returns `HTTP 502` or error code `EXTERNAL_SERVICE_ERROR` when sending a parent invite, admin invite, or resend confirmation. | Admin or Super Admin who initiated the action. | Alert the administrator that email delivery failed so they can take corrective action. | Recipient email address; action attempted (invite, resend, reminder); reason (address suppressed or previously bounced); suggested actions (verify address, ask recipient to whitelist, use an alternative address). | Critical |
| Bulk reminder partial failure | `POST /emails/bulk-form-reminders` response includes `total_failed > 0` and a `failed_emails` array. | Admin who triggered the bulk reminder. | Report partial delivery failure inline so the admin can follow up with specific families. | Count of successful sends; count of failed sends; list of failed email addresses; suggestion to retry individually or verify addresses. | Important |

---

## Summary Reference Table

| # | Section | Scenario | Recipient(s) | Priority |
|---|---|---|---|---|
| 1.1 | Auth | Parent enrollment invitation | Primary Parent, Secondary Parent | Critical |
| 1.2 | Auth | Resend parent invitation | Parent account owner | Important |
| 1.3 | Auth | Admin account invitation | Invited Admin | Critical |
| 1.4 | Auth | Resend admin invitation | Unverified Admin | Important |
| 1.5 | Auth | Initial school owner invite | First Admin/owner | Critical |
| 1.6 | Auth | Self-registration email confirmation | Registering user | Critical |
| 1.7 | Auth | Password reset request | Requesting user | Important |
| 1.8 | Auth | Password changed confirmation | Account owner | Important |
| 1.9 | Auth | Session/security anomaly alert | Account owner, optionally Super Admin | Critical |
| 2.1 | Enrollment | New child added | Primary Parent, Secondary Parent | Important |
| 2.2 | Enrollment | Parent account deactivated | Deactivated Parent | Important |
| 2.3 | Enrollment | Parent account reactivated | Reactivated Parent | Informational |
| 2.4 | Enrollment | Student archived/inactive | Primary Parent, Secondary Parent | Important |
| 2.5 | Enrollment | Student reactivated | Primary Parent, Secondary Parent | Informational |
| 2.6 | Enrollment | Student classroom transfer (individual) | Primary Parent, Secondary Parent | Informational |
| 2.7 | Enrollment | Bulk student promotion or transfer | Primary and Secondary Parents per child | Informational |
| 2.8 | Enrollment | Enrollment completed and fully approved | Primary Parent, Secondary Parent, optionally Admin | Important |
| 3.1 | Forms | Form assigned to individual student | Primary Parent, Secondary Parent | Important |
| 3.2 | Forms | Form assigned to all students in classroom | Primary and Secondary Parents per child | Important |
| 3.3 | Forms | Form assigned to all students in school | All active Parents | Important |
| 3.4 | Forms | Parent submits a form | Admin; optionally Primary Parent (confirmation) | Important |
| 3.5 | Forms | Form approved by Admin | Primary Parent, Secondary Parent | Important |
| 3.6 | Forms | Form rejected / revision requested | Primary Parent, Secondary Parent | Critical |
| 3.7 | Forms | Manual reminder — individual | Parent(s) on form record | Important |
| 3.8 | Forms | Bulk reminder — pending | Parents with pending forms | Important |
| 3.9 | Forms | Bulk reminder — in progress | Parents with in-progress forms | Important |
| 3.10 | Forms | Bulk reminder — overdue | Parents with overdue forms | Critical |
| 3.11 | Forms | Bulk reminder — selected rows | Parents for selected forms | Important |
| 4.1 | Admin/School | New school created | First school Admin/owner | Critical |
| 4.2 | Admin/School | School deleted | School Admin(s), Super Admin | Critical |
| 4.3 | Admin/School | Admin account deleted | Deleted Admin | Important |
| 4.4 | Admin/School | Admin profile updated | Updated Admin | Informational |
| 5.1 | Delivery | Email bounce/suppression detected | Admin or Super Admin who triggered action | Critical |
| 5.2 | Delivery | Bulk reminder partial failure | Admin who triggered bulk | Important |
