# Form Assignment Guide

## Overview
This document provides a comprehensive guide to the form assignment system in the Goddard School Enrollment Application. It covers the entire lifecycle of forms from creation to completion, including assignment methods, status tracking, and best practices.

---

## Table of Contents
1. [Form Assignment Basics](#form-assignment-basics)
2. [Assignment Methods](#assignment-methods)
3. [Form Statuses](#form-statuses)
4. [Assignment Workflows](#assignment-workflows)
5. [Parent Experience](#parent-experience)
6. [Admin Management](#admin-management)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Form Assignment Basics

### What is Form Assignment?
Form assignment is the process of assigning enrollment forms to students (and their parents) for completion. Each form represents a required document or information collection step in the enrollment process.

### Key Concepts
- **Form Template**: A reusable form definition created by admins
- **Form Assignment**: A specific instance of a form assigned to a student
- **Form Submission**: The completed data submitted by a parent
- **Form Status**: The current state of a form assignment (pending, in progress, submitted, approved, etc.)

### Form Types
1. **Child-Specific Forms**: Forms assigned to individual children (e.g., Medical History, Emergency Contacts)
2. **Family Forms**: Forms that apply to the entire family (e.g., Household Information, Payment Authorization)

---

## Assignment Methods

### 1. Individual Student Assignment

**Location**: Admin Portal → Students → Select Student → Manage Forms

**Steps**:
1. Navigate to Student Management
2. Find the student in the list
3. Click the three-dot menu (⋯) next to the student
4. Select "Manage Forms"
5. Check the forms you want to assign
6. Click "Assign Forms"

**Use Case**: Assigning specific forms to individual students based on their unique needs or enrollment stage.

**Example**:
```
Student: Emma Johnson
Classroom: Toddler Room A
Forms to Assign:
  ☑ Medical History Form
  ☑ Emergency Contact Information
  ☑ Allergy Information
```

### 2. Bulk Assignment to All Students

**Location**: Admin Portal → Forms → Select Form → Assign to All Students

**Steps**:
1. Navigate to Forms Management
2. Find the form template in the list
3. Click "Assign to All Students" button
4. Confirm the bulk assignment
5. System assigns the form to all active students

**Use Case**: Rolling out a new required form to all enrolled students at once.

**Example**:
```
Form: Annual Health Update 2025
Action: Assign to All Students
Result: Form assigned to 45 active students across all classrooms
```

### 3. Classroom-Based Assignment

**Location**: Admin Portal → Classrooms → Select Classroom → Manage Forms

**Steps**:
1. Navigate to Classrooms
2. Select a specific classroom
3. Click "Manage Forms"
4. Select forms to assign
5. Click "Assign to Classroom"
6. All students in that classroom receive the forms

**Use Case**: Assigning classroom-specific forms (e.g., field trip permission for a specific age group).

**Example**:
```
Classroom: Pre-K Room B
Students: 12 students
Forms to Assign:
  ☑ Field Trip Permission - Zoo Visit
  ☑ Swimming Activity Consent
```

### 4. Automatic Assignment on Enrollment

**Trigger**: When a new parent is invited and a child is enrolled

**Process**:
1. Admin invites parent via "Invite Parent" form
2. System creates parent and child accounts
3. Default forms (marked as "school_default") are automatically assigned
4. Parent receives invitation email with enrollment instructions

**Use Case**: Ensuring all new enrollments start with the required baseline forms.

**Example**:
```
New Enrollment: Sophia Martinez
Auto-Assigned Forms:
  • Registration Form
  • Parent Information
  • Emergency Contacts
  • Medical History
  • Immunization Records
```

---

## Form Statuses

### Status Lifecycle

```
┌─────────────┐
│   PENDING   │ ← Form assigned, not yet started
└──────┬──────┘
       │
       ↓
┌─────────────┐
│    DRAFT    │ ← Parent started but hasn't submitted
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  PENDING    │ ← Parent submitted, awaiting admin review
│  APPROVAL   │
└──────┬──────┘
       │
       ├──────→ ┌─────────────┐
       │        │  REVISION   │ ← Admin requested changes
       │        │  REQUESTED  │
       │        └──────┬──────┘
       │               │
       │               ↓
       │        (Parent revises and resubmits)
       │               │
       │               ↓
       ↓        ┌─────────────┐
┌─────────────┐ │  PENDING    │
│  APPROVED   │←┤  APPROVAL   │
└─────────────┘ └─────────────┘
```

### Status Definitions

| Status | Description | Parent View | Admin Action Required |
|--------|-------------|-------------|----------------------|
| **Pending** | Form assigned but not started | "Start Form" button visible | None |
| **Draft** | Parent started filling out | "Continue Form" button visible | None |
| **Pending Approval** | Parent submitted for review | "Submitted - Under Review" | Review and approve/reject |
| **Revision Requested** | Admin requested changes | "Revise Form" button with notes | Wait for resubmission |
| **Approved** | Admin approved the form | "Approved" badge, download available | None |
| **Rejected** | Admin rejected the form | "Rejected" badge with reason | None (final state) |
| **Overdue** | Past due date, not completed | Red "Overdue" indicator | Send reminder |

### Status Colors

- **Pending**: Gray/Neutral
- **Draft**: Blue (In Progress)
- **Pending Approval**: Yellow/Orange (Needs Attention)
- **Revision Requested**: Orange (Action Required)
- **Approved**: Green (Complete)
- **Rejected**: Red (Error)
- **Overdue**: Red (Urgent)

---

## Assignment Workflows

### Workflow 1: New Student Enrollment

```
1. Admin invites parent
   ↓
2. System creates accounts and assigns default forms
   ↓
3. Parent receives invitation email
   ↓
4. Parent logs in and sees dashboard with assigned forms
   ↓
5. Parent completes forms one by one
   ↓
6. Admin reviews and approves each submission
   ↓
7. Enrollment progress reaches 100%
```

### Workflow 2: Mid-Year Form Update

```
1. Admin creates new form template (e.g., "Winter Health Update")
   ↓
2. Admin assigns to all students via "Assign to All Students"
   ↓
3. System sends notification emails to all parents
   ↓
4. Parents log in and see new form in their dashboard
   ↓
5. Parents complete and submit
   ↓
6. Admin reviews in "Due Forms" section
   ↓
7. Admin approves or requests revisions
```

### Workflow 3: Classroom-Specific Event

```
1. Admin creates event-specific form (e.g., "Field Trip Permission")
   ↓
2. Admin navigates to specific classroom
   ↓
3. Admin assigns form to all students in that classroom
   ↓
4. Only parents of students in that classroom receive the form
   ↓
5. Parents complete by due date
   ↓
6. Admin tracks completion in classroom view
```

---

## Parent Experience

### Dashboard View

When a parent logs in, they see:

1. **Child Selector**: Dropdown to switch between multiple children
2. **Enrollment Progress**: Visual progress bar showing completion percentage
3. **Forms & Documents Section**: List of all assigned forms with statuses

### Form Card Information

Each form card displays:
- **Form Title**: Name of the form
- **Status Badge**: Current status (Pending, Draft, Pending Approval, Approved, etc.)
- **Due Date**: Deadline for completion (if set)
- **Last Updated**: Date of last activity
- **Action Button**: Context-specific action (Start, Continue, View, Download)

### Completing a Form

**Steps**:
1. Click on a form card with "Pending" or "Draft" status
2. Form opens in an embedded Fillout.com iframe
3. Parent fills out all required fields
4. Parent clicks "Submit" within the form
5. Form status changes to "Pending Approval"
6. Parent receives confirmation message

### Viewing Completed Forms

**For Approved Forms**:
- Download button (↓) appears on the form card
- Click to download PDF version
- "Download All" button downloads all approved forms as ZIP

**For Forms Under Review**:
- Status shows "Pending Approval"
- No download available until approved
- Parent can see submission timestamp

### Revision Requests

**When Admin Requests Revision**:
1. Form status changes to "Revision Requested"
2. Parent sees admin's revision notes
3. "Revise Form" button appears
4. Parent clicks to reopen and edit
5. Parent resubmits after making changes
6. Status returns to "Pending Approval"

---

## Admin Management

### Forms Management Page

**Location**: Admin Portal → Forms

**Features**:
- View all form templates
- Create new form templates
- Edit existing forms
- Assign forms to students
- Track assignment statistics

### Creating a Form Template

**Steps**:
1. Click "Add Form" button
2. Fill in form details:
   - **Form Name**: Descriptive title
   - **Form Link**: Fillout.com form URL
   - **Due Date**: Deadline for completion
   - **Status**: `school_default` (auto-assign) or `active` (manual assign)
3. Click "Create Form"
4. Form template is now available for assignment

**Example**:
```
Form Name: Summer Camp Registration 2025
Form Link: https://form.fillout.com/t/abc123xyz
Due Date: 2025-05-15
Status: active (manual assignment only)
```

### Reviewing Form Submissions

**Location**: Admin Portal → Due Forms

**View Options**:
- **All Forms**: Complete list of all form assignments
- **Overdue**: Forms past their due date
- **Pending Approval**: Forms submitted and awaiting review
- **Pending**: Forms not yet started by parents

**Review Actions**:
1. Click on a form submission
2. View submitted data
3. Choose action:
   - **Approve**: Mark as complete
   - **Request Revision**: Send back with notes
   - **Reject**: Decline submission (rare)

### Sending Reminders

**Individual Reminder**:
1. Navigate to Due Forms
2. Find the form assignment
3. Click "Remind" button
4. System sends email reminder to parent

**Bulk Reminders**:
1. Use "Remind" dropdown in Due Forms
2. Select "Remind All Overdue" or "Remind All Pending Approval"
3. System sends batch email reminders

### Tracking Progress

**Dashboard Metrics**:
- Total active forms
- Pending enrollments
- Completion rates by classroom
- Overdue form count

**Classroom View**:
- Enrollment progress per classroom
- Student-by-student completion status
- Classroom-specific form assignments

---

## Best Practices

### For Admins

#### 1. Form Creation
- ✅ Use clear, descriptive form names
- ✅ Set realistic due dates (at least 7-14 days)
- ✅ Test forms before assigning to all students
- ✅ Include instructions in form descriptions
- ❌ Don't create duplicate forms with similar names
- ❌ Don't set due dates in the past

#### 2. Assignment Strategy
- ✅ Assign default forms immediately upon enrollment
- ✅ Batch assign seasonal forms (e.g., annual updates) to all students at once
- ✅ Use classroom-based assignment for age-specific forms
- ✅ Stagger due dates to avoid overwhelming parents
- ❌ Don't assign too many forms at once (max 5-7 per batch)
- ❌ Don't assign forms without clear due dates

#### 3. Review Process
- ✅ Review submissions within 2-3 business days
- ✅ Provide specific, actionable revision notes
- ✅ Approve complete and accurate submissions promptly
- ✅ Use revision requests instead of rejections when possible
- ❌ Don't leave submissions in "Pending Approval" for extended periods
- ❌ Don't reject without clear explanation

#### 4. Communication
- ✅ Send reminders for overdue forms weekly
- ✅ Notify parents when forms are approved
- ✅ Provide help center resources for common questions
- ✅ Be responsive to parent inquiries
- ❌ Don't spam parents with excessive reminders
- ❌ Don't assume parents understand the process without guidance

### For Parents

#### 1. Form Completion
- ✅ Complete forms as soon as they're assigned
- ✅ Fill out all required fields accurately
- ✅ Review before submitting
- ✅ Keep copies of submitted forms
- ❌ Don't wait until the due date
- ❌ Don't submit incomplete information

#### 2. Dashboard Management
- ✅ Check dashboard regularly for new forms
- ✅ Monitor enrollment progress
- ✅ Download approved forms for records
- ✅ Respond promptly to revision requests
- ❌ Don't ignore overdue form notifications
- ❌ Don't submit forms multiple times

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Parent didn't receive invitation email
**Solution**:
1. Check spam/junk folder
2. Verify email address in admin portal
3. Resend invitation: Parents → Find parent → ⋯ → "Resend Confirmation"

#### Issue: Form shows as "Pending" but parent says they submitted
**Possible Causes**:
- Parent didn't click final "Submit" button in form
- Network issue during submission
- Form wasn't properly saved

**Solution**:
1. Ask parent to check form status in their dashboard
2. If still showing "Draft", ask them to resubmit
3. Check form submission logs in admin portal

#### Issue: Parent can't access assigned form
**Possible Causes**:
- Form link is broken
- Form was deleted from Fillout.com
- Browser compatibility issue

**Solution**:
1. Test form link in admin portal
2. Verify form exists in Fillout.com
3. Ask parent to try different browser
4. Reassign form if necessary

#### Issue: Enrollment progress not updating
**Possible Causes**:
- Forms pending approval not counted as complete
- Cached data in browser
- System sync delay

**Solution**:
1. Approve pending submissions
2. Refresh browser page
3. Wait 5-10 minutes for system sync
4. Contact support if issue persists

#### Issue: Bulk assignment didn't assign to all students
**Possible Causes**:
- Some students are archived
- Classroom filter was active
- System timeout during bulk operation

**Solution**:
1. Check student status (active vs. archived)
2. Clear any active filters
3. Retry bulk assignment
4. Manually assign to missed students if needed

#### Issue: Parent sees forms for wrong child
**Possible Causes**:
- Multiple children enrolled
- Wrong child selected in dropdown
- Data sync issue

**Solution**:
1. Ask parent to check child selector dropdown
2. Verify correct child is selected
3. Refresh page
4. Contact support if forms are truly misassigned

---

## Technical Details

### Form Assignment Data Structure

```typescript
interface FormAssignment {
  formId: string;              // Unique form assignment ID
  formName: string;            // Display name of the form
  filloutFormId: string;       // Fillout.com form identifier
  childId: string;             // Student the form is assigned to
  enrollmentId: string;        // Enrollment record ID
  status: FormStatus;          // Current status
  assignedAt: string;          // ISO date of assignment
  dueDate: string | null;      // ISO date of deadline
  submittedAt: string | null;  // ISO date of submission
  approvedAt: string | null;   // ISO date of approval
  recentPdfLink: string | null; // Download link for approved form
  recentEditLink: string | null; // Edit link for revisions
  revisionNotes: string | null; // Admin notes for revisions
}
```

### Form Status Values

```typescript
type FormStatus = 
  | 'pending'           // Assigned, not started
  | 'draft'             // In progress
  | 'pending_approval'  // Submitted, awaiting review
  | 'revision_requested' // Sent back for changes
  | 'approved'          // Completed and approved
  | 'rejected'          // Declined by admin
  | 'overdue';          // Past due date
```

### API Endpoints

```
POST   /api/forms/assign              - Assign form to student(s)
POST   /api/forms/assign-bulk         - Bulk assign to multiple students
GET    /api/forms/assignments         - Get all form assignments
PATCH  /api/forms/assignments/:id     - Update form status
POST   /api/forms/review               - Approve/reject submission
POST   /api/forms/remind               - Send reminder email
GET    /api/forms/submissions/:id     - Get form submission data
```

---

## Appendix

### Form Assignment Checklist

**Before Assigning Forms**:
- [ ] Form template is created and tested
- [ ] Form link is valid and accessible
- [ ] Due date is set (if applicable)
- [ ] Form instructions are clear
- [ ] Target students/classrooms are identified

**After Assigning Forms**:
- [ ] Verify assignments appear in student records
- [ ] Confirm parents receive notification emails
- [ ] Monitor submission progress
- [ ] Review submissions promptly
- [ ] Send reminders for overdue forms

### Quick Reference: Admin Actions

| Task | Location | Action |
|------|----------|--------|
| Create form template | Forms → Add Form | Fill form details and save |
| Assign to one student | Students → Student → ⋯ → Manage Forms | Select forms and assign |
| Assign to all students | Forms → Form → Assign to All | Confirm bulk assignment |
| Assign to classroom | Classrooms → Classroom → Manage Forms | Select forms and assign |
| Review submission | Due Forms → Form → View | Approve or request revision |
| Send reminder | Due Forms → Form → Remind | Confirm reminder email |
| Download form | Students → Student → Forms → Download | Click download icon |

### Quick Reference: Parent Actions

| Task | Location | Action |
|------|----------|--------|
| View assigned forms | Dashboard → Forms & Documents | Scroll to forms section |
| Start new form | Dashboard → Form card → Start Form | Click button to open form |
| Continue draft | Dashboard → Form card → Continue | Click button to resume |
| Submit form | Within form → Submit | Complete and submit |
| Revise form | Dashboard → Form card → Revise | Click button to edit |
| Download approved form | Dashboard → Form card → Download | Click download icon |
| Download all forms | Dashboard → Forms section → Download All | Click button for ZIP |

---

## Support

For additional help with form assignment:
- **Email**: support@goddardschool.com
- **Phone**: +1 (800) 000-0000
- **Help Center**: Available in admin and parent portals
- **Admin Guide**: Detailed feature documentation in admin portal

---

*Last Updated: 2025*
*Version: 1.0*
