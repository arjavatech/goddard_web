export type NotificationType =
  | "student"
  | "form"
  | "classroom"
  | "approval"
  | "account"
  | "reminder";

export type NotificationPriority =
  | "high"
  | "medium"
  | "low";

export type NotificationSection =
  | "today"
  | "earlier";

export interface NotificationTypeConfig {
  label: string;
  color: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  fullContent: string;
  type: NotificationType;
  priority: NotificationPriority;
  timestamp: string;
  section: NotificationSection;
  read: boolean;
  archived: boolean;
}

export const notificationTypes: Record<
  NotificationType,
  NotificationTypeConfig
> = {
  student: {
    label: "Student",
    color: "green",
  },
  form: {
    label: "Form",
    color: "blue",
  },
  classroom: {
    label: "Classroom",
    color: "purple",
  },
  approval: {
    label: "Approval",
    color: "orange",
  },
  account: {
    label: "Account",
    color: "red",
  },
  reminder: {
    label: "Reminder",
    color: "yellow",
  },
};

export const initialNotifications: Notification[] = [
  {
    id: 1,
    title: "New Student or Parent Added",
    message:
      'A new parent "Arun Kumar" has been added successfully.',
    fullContent:
      "A new parent account named Arun Kumar has been successfully added to the Goddard School Parent & Child Management System.",
    type: "student",
    priority: "high",
    timestamp: "9:30 AM",
    section: "today",
    read: false,
    archived: false,
  },

  {
    id: 2,
    title: "New Form Added",
    message:
      'A new form "Field Trip Permission Form" has been added.',
    fullContent:
      "Field Trip Permission Form has been added and assigned to Grade 3-A students.",
    type: "form",
    priority: "medium",
    timestamp: "9:20 AM",
    section: "today",
    read: false,
    archived: false,
  },

  {
    id: 3,
    title: "New Classroom Added",
    message:
      'A new classroom "Grade 4-B" has been added successfully.',
    fullContent:
      "Grade 4-B classroom has been successfully created and assigned to the school directory.",
    type: "classroom",
    priority: "medium",
    timestamp: "9:10 AM",
    section: "today",
    read: false,
    archived: false,
  },

  {
    id: 4,
    title: "Pending Approval Form",
    message:
      '"Medical Information Form" submitted by Kevin is pending approval.',
    fullContent:
      "Kevin submitted the Medical Information Form which is currently awaiting approval from the administrator.",
    type: "approval",
    priority: "high",
    timestamp: "9:00 AM",
    section: "today",
    read: false,
    archived: false,
  },

  {
    id: 5,
    title: "Account Deactivated",
    message:
      "Your account has been deactivated by the administrator.",
    fullContent:
      "Your account has been temporarily deactivated by the school administrator.",
    type: "account",
    priority: "high",
    timestamp: "Yesterday, 8:50 PM",
    section: "earlier",
    read: true,
    archived: false,
  },

  {
    id: 6,
    title: "Form Approved",
    message:
      '"Medical Information Form" submitted by Kevin has been approved.',
    fullContent:
      "Kevin's Medical Information Form has been reviewed and approved.",
    type: "approval",
    priority: "low",
    timestamp: "Yesterday, 8:40 PM",
    section: "earlier",
    read: true,
    archived: false,
  },

  {
    id: 7,
    title: "Form Rejected",
    message:
      '"Field Trip Permission Form" submitted by Kevin has been rejected.',
    fullContent:
      "Field Trip Permission Form submitted by Kevin was rejected by the school administrator.",
    type: "approval",
    priority: "high",
    timestamp: "Yesterday, 8:30 PM",
    section: "earlier",
    read: true,
    archived: false,
  },

  {
    id: 8,
    title: "New Child Added",
    message:
      'A new child "Kavin Arunkumar" has been added to your account.',
    fullContent:
      "Kavin Arunkumar has been successfully linked to your parent profile.",
    type: "student",
    priority: "medium",
    timestamp: "Yesterday, 8:20 PM",
    section: "earlier",
    read: true,
    archived: false,
  },

  {
    id: 9,
    title: "Form Added To Child",
    message:
      '"Medical Information Form" has been added to Kavin’s profile.',
    fullContent:
      "Medical Information Form is now available under Kavin's profile.",
    type: "form",
    priority: "medium",
    timestamp: "Yesterday, 8:10 PM",
    section: "earlier",
    read: true,
    archived: false,
  },

  {
    id: 10,
    title: "Due Form Reminder",
    message:
      '"Medical Information Form" is due on May 28, 2024.',
    fullContent:
      "Reminder: Please complete and submit the Medical Information Form before the due date.",
    type: "reminder",
    priority: "high",
    timestamp: "Yesterday, 7:50 PM",
    section: "earlier",
    read: false,
    archived: false,
  },

  {
    id: 11,
    title: "Parent Profile Updated",
    message:
      "Your profile information has been updated successfully.",
    fullContent:
      "The parent profile details were updated and saved successfully.",
    type: "account",
    priority: "low",
    timestamp: "Yesterday, 7:20 PM",
    section: "earlier",
    read: false,
    archived: false,
  },

  {
    id: 12,
    title: "New Announcement",
    message:
      "School annual day celebration details have been published.",
    fullContent:
      "Annual Day Celebration event information is now available in the announcements section.",
    type: "classroom",
    priority: "medium",
    timestamp: "Yesterday, 6:50 PM",
    section: "earlier",
    read: false,
    archived: false,
  },
];