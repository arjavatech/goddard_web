import React, { useEffect, useMemo, useState } from "react";
import {
  Bell, Home, Users, User,
  CheckCircle, XCircle, FileText, UserPlus, UserX, Filter, CheckCheck, Trash2
} from "lucide-react";

type NotificationType = "parent" | "form" | "approval" | "rejected" | "reminder" | "deactivate";
type SectionName = "Today" | "Earlier";
type FilterType = "all" | "unread" | "read";

interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  section: SectionName;
}

const seedNotifications: Notification[] = [
  { id: 1, type: "parent", title: "New Parent Added", description: "A new parent account has been created.", time: "5 min ago", unread: true, section: "Today" },
  { id: 2, type: "form", title: "New Form Assigned", description: "Health declaration form assigned.", time: "15 min ago", unread: true, section: "Today" },
  { id: 3, type: "approval", title: "Form Approved", description: "Medical form approved.", time: "30 min ago", unread: false, section: "Today" },
  { id: 4, type: "rejected", title: "Form Rejected", description: "Permission form requires correction.", time: "Yesterday", unread: false, section: "Earlier" },
  { id: 5, type: "reminder", title: "Due Form Reminder", description: "Form submission due tomorrow.", time: "Yesterday", unread: true, section: "Earlier" },
  { id: 6, type: "deactivate", title: "Account Deactivated", description: "Parent account deactivated.", time: "2 days ago", unread: false, section: "Earlier" },
];

export default function Notifications() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem("notifications");
    return saved ? JSON.parse(saved) : seedNotifications;
  });

  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      return filter === "all" ? true : filter === "unread" ? n.unread : !n.unread;
    });
  }, [notifications, filter]);

  const markRead = (id: number) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));

  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));

  const deleteNotification = (id: number) =>
    setNotifications(prev => prev.filter(n => n.id !== id));

  const iconFor = (type: NotificationType) => {
    switch (type) {
      case "parent": return <UserPlus className="text-blue-600" size={20} />;
      case "form": return <FileText className="text-indigo-600" size={20} />;
      case "approval": return <CheckCircle className="text-green-600" size={20} />;
      case "rejected": return <XCircle className="text-red-600" size={20} />;
      case "deactivate": return <UserX className="text-gray-600" size={20} />;
      default: return <Bell className="text-orange-500" size={20} />;
    }
  };

  const Section = ({ name }: { name: SectionName }) => {
    const items = filtered.filter(x => x.section === name);
    if (!items.length) return null;

    return (
      <>
        <h3 className="px-4 mt-6 mb-3 text-xs font-bold uppercase text-slate-500">{name}</h3>
        <div className="space-y-3 px-4">
          {items.map(n => (
            <div key={n.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex gap-3">
                <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center">
                  {iconFor(n.type)}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{n.title}</h4>
                      <p className="text-sm text-slate-500 mt-1">{n.description}</p>
                    </div>
                    {n.unread && <span className="h-2 w-2 rounded-full bg-blue-500 mt-2" />}
                  </div>

                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-slate-400">{n.time}</span>

                    <div className="flex gap-2">
                      {n.unread && (
                        <button onClick={() => markRead(n.id)} className="p-1.5 rounded-full bg-[#00A8E1] text-white" title="Mark as read">
                          <CheckCheck size={14} />
                        </button>
                      )}
                      <button onClick={() => deleteNotification(n.id)} className="p-1.5 rounded-full bg-red-500 text-white" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <div className="sticky top-0 bg-white border-b border-slate-200 z-50">
        <div className="p-4 flex items-center justify-between">
          <div className="w-8" />
          <img src="./images/gs_logo_lynnwood.png" alt="Goddard School" className="h-12 w-auto" />
          <button className="rounded-xl border p-2">
            <Filter size={18} />
          </button>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center gap-2">
            {(["all", "unread", "read"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-[10px] text-sm font-medium capitalize transition-all duration-200 ${filter === f
                    ? "bg-[#00A8E1]  text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
              >
                {f}
              </button>
            ))}

            <button
              onClick={markAllRead}
              className="ml-auto text-sm font-medium text-[#00A8E1] hover:text-[#0088b8] transition-colors"
            >
              Mark all read
            </button>
          </div>
        </div>
      </div>

      <Section name="Today" />
      <Section name="Earlier" />

      {filtered.length === 0 && (
        <div className="p-10 text-center text-slate-500">
          No notifications found.
        </div>
      )}


    </div>
  );
}
