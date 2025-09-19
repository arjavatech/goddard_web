# Missing API Endpoints

This document tracks backend endpoints (or response enhancements) required by the parent dashboard (`src/pages/Dashboard.tsx`) and the admin portal under `src/pages/admin`.

| Endpoint | Purpose | Expected Payload | Notes |
| --- | --- | --- | --- |
| `GET /users/me` (enhancement) | Include guardian context needed to scope downstream calls | Add `parent_id` and `school_id` when the authenticated user is a parent | Presently returns only `role` and optionally `school_id`; both fields are required and should always be present in mock mode. |
| `GET /parents/{parent_id}/children` | Return the list of children linked to the logged-in guardian | Array of children with `child_id`, `first_name`, `last_name`, `dob`, `age`, `class_name`, `enrollment_id` | Avoid fetching every child for the school; data feeds the child selector and overview cards. |
| `GET /parents/{parent_id}/children/{child_id}/profile` | Provide detailed child metadata for dashboard cards | Object containing `dob`, `age`, `class_name`, `enrollment_id`, `enrollment_progress` | Needed to populate DOB/age rows and normalized progress metrics. |
| `GET /parents/{parent_id}/children/{child_id}/forms` | Surface assigned forms with richer metadata | Array with `assignment_id`, `form_template_id`, `title`, `status`, `due_date`, `last_updated`, `launch_url` | Supplies the per-child “Forms & Documents” grid and progress calculations. |
| `GET /student-form-assignments/{assignment_id}` | Enrich individual assignments with template info | Object containing template metadata (`form_template_id`, `title`, `description`, `launch_url`) | Alternative to the bulk child forms API; required if assignments are resolved one-by-one. |
| `GET /parents/{parent_id}/family-forms` | Provide family-level documents shared across children | Array with `title`, `status`, `last_updated`, `due_date`, `launch_url` | Currently using form templates as a proxy; backend endpoint should distinguish family assignments. |
| `GET /parents/{parent_id}/actions/next` | Supply the next actionable task for Quick Actions | Object with `label`, `launch_url`, `due_date`, `context_child_id` | Enables actionable buttons instead of disabled placeholders. |
| `GET /schools/{school_id}/enrollment-insights` | Populate the “Important Information” card | Object with `upcoming_deadline`, `required_documents[]`, `contact.phone`, `contact.email` | Consolidates school announcements and deadlines for guardians. |

## Admin Portal (`/admin/*`)

| Endpoint | Purpose | Expected Payload | Notes |
| --- | --- | --- | --- |
| `GET /classrooms?school_id={id}` (enhancement) | Supply classroom metadata for dashboards and management lists | Include `capacity`, `age_group`, `lead_teachers`, `enrollment_count` | Current response only returns `id` and `class_name`, leaving cards without context. |
| `GET /enrollments/class-wise-count?school_id={id}` (enhancement) | Drive classroom progress metrics | Add `completed_count`, `pending_count`, `default_form_names[]` | Present payload lacks completion/assignment data, so progress bars cannot be calculated. |
| `GET /enrollments/school-forms?school_id={id}` (enhancement) | Power student and parent rosters | Extend with `enrollment_id`, guardian names, normalized form summaries | Needed to avoid guessing guardian relationships from email strings. |
| `GET /reports/activity-feed` | Populate admin recent activity timeline | Array of events (`type`, `actor`, `subject`, `timestamp`, `context_url`) | No activity API exists; the dashboard currently shows a placeholder message. |
| `GET /classrooms/{id}` | Fetch detailed classroom profile | Object with `name`, `capacity`, `age_group`, `teachers`, `notes` | Classroom detail page falls back to IDs without this endpoint. |
| `GET /classrooms/{id}/forms` | List forms assigned to a classroom | Array with `form_template_id`, `title`, `status`, `due_date`, `assigned_by` | Required for classroom form review and to replace placeholder notices. |
| `POST /classrooms/{id}/forms` & `DELETE /classrooms/{id}/forms/{form_id}` | Manage classroom-level form overrides | Accept assignments/removals with audit fields | Enables actual form assignment actions instead of disabled UI controls. |
| `POST /form-templates` / `PUT /form-templates` / `DELETE /form-templates` | CRUD operations for form catalog | Standard template payload (name, status, Fillout IDs, display order) | Admin UI is read-only until these endpoints exist. |
| `GET /parents/details?school_id={id}` (enhancement) | Provide rich parent roster data | Include guardian first/last name, invitation status, linked children count | Existing payload returns only email and a boolean flag, limiting management views. |
| `GET /parents/{parent_id}` | Fetch a single parent profile | Object with names, phone numbers, mailing address, linked children | Parent detail page currently re-fetches the entire list and still lacks core info. |
| `POST /enrollments/parent-invite` & `POST /enrollments/add-child` | Support onboarding/invite flows from admin | Request body mirroring invite form inputs and success metadata | Without these endpoints the admin UI cannot action invite buttons. |
| `GET /parents/{parent_id}/family-forms` (enhancement) | List family-wide documents for review | Array with form metadata plus latest submission status | Needed for parent detail review modals. |
| `GET /form-submissions/latest` (admin access) | Surface latest submissions with review URLs | Include `form_template_id`, `review_url`, `submitted_at`, `status` | Enables approve/reject workflows in parent review pages. |
| `GET /children/{child_id}` | Retrieve child demographics | Object with `first_name`, `last_name`, `dob`, `classroom_id`, guardian references | Student management relies on this to avoid inferring from enrollment snapshots. |
| `GET /student-form-assignments?school_id={id}` (enhancement) | Relate assignments to classrooms/students | Include `child_id`, `classroom_id`, `form_template`, `status`, `due_date` | Current payload omits classroom or child names, preventing useful aggregation. |

> Implementing the endpoints above (or expanding existing responses) will unblock the parent dashboard and admin portal from using hard-coded placeholders and enable true CRUD workflows for classrooms, forms, parents, and students. Once shipped, the corresponding data hooks can be updated to wire in launch URLs, deadlines, and actionable buttons.
