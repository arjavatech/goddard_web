import React, { useRef } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  UserPlus,
  FileText,
  School,
  CheckCircle,
  AlertCircle,
  Archive,
  Trash2,
} from "lucide-react";

import { Notification } from "./notificationData";

interface NotificationCardProps {
  notification: Notification;
  selected: boolean;
  darkMode: boolean;
  onSelect: (id: number) => void;
  onOpen: (notification: Notification) => void;
  onDelete: (id: number) => void;
  onArchive: (id: number) => void;
  onMarkRead: (id: number) => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  selected,
  darkMode,
  onSelect,
  onOpen,
  onDelete,
  onArchive,
  onMarkRead,
}) => {
  const startX = useRef<number | null>(null);

  const handleTouchStart = (
    e: React.TouchEvent<HTMLDivElement>
  ): void => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (
    e: React.TouchEvent<HTMLDivElement>
  ): void => {
    if (startX.current === null) return;

    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX.current;

    if (diff > 100) {
      onMarkRead(notification.id);
    }

    if (diff < -100) {
      onDelete(notification.id);
    }

    startX.current = null;
  };

  const getTypeIcon = (): React.ReactElement => {
    switch (notification.type) {
      case "student":
        return <UserPlus size={20} />;

      case "form":
        return <FileText size={20} />;

      case "classroom":
        return <School size={20} />;

      case "approval":
        return <CheckCircle size={20} />;

      case "account":
        return <AlertCircle size={20} />;

      default:
        return <Bell size={20} />;
    }
  };

  const getTypeColor = (): string => {
    switch (notification.type) {
      case "student":
        return "bg-green-100 text-green-600";

      case "form":
        return "bg-blue-100 text-blue-600";

      case "classroom":
        return "bg-purple-100 text-purple-600";

      case "approval":
        return "bg-orange-100 text-orange-600";

      case "account":
        return "bg-red-100 text-red-600";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getPriorityColor = (): string => {
    switch (notification.priority) {
      case "high":
        return "bg-red-500";

      case "medium":
        return "bg-yellow-500";

      case "low":
        return "bg-green-500";

      default:
        return "bg-gray-500";
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 ${
        darkMode
          ? "bg-gray-900 border-gray-800"
          : "bg-white border-gray-200"
      }`}
    >
      {!notification.read && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" />
      )}

      <div className="p-4">
        <div className="flex gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() =>
              onSelect(notification.id)
            }
            className="mt-1 h-4 w-4"
          />

          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${getTypeColor()}`}
          >
            {getTypeIcon()}
          </div>

          <div
            className="flex-1 min-w-0"
            onClick={() =>
              onOpen(notification)
            }
          >
            <div className="flex items-center justify-between gap-2">
              <h3
                className={`font-semibold truncate ${
                  darkMode
                    ? "text-white"
                    : "text-gray-900"
                }`}
              >
                {notification.title}
              </h3>

              <span
                className={`w-3 h-3 rounded-full ${getPriorityColor()}`}
              />
            </div>

            <p
              className={`text-sm mt-1 line-clamp-2 ${
                darkMode
                  ? "text-gray-400"
                  : "text-gray-600"
              }`}
            >
              {notification.message}
            </p>

            <div className="flex items-center justify-between mt-3">
              <span
                className={`text-xs ${
                  darkMode
                    ? "text-gray-500"
                    : "text-gray-500"
                }`}
              >
                {notification.timestamp}
              </span>

              {!notification.read && (
                <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded-full">
                  Unread
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {!notification.read && (
            <button
              type="button"
              onClick={() =>
                onMarkRead(notification.id)
              }
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-green-500 text-white hover:bg-green-600 transition"
            >
              <CheckCircle size={16} />
              Read
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              onArchive(notification.id)
            }
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-blue-500 text-white hover:bg-blue-600 transition"
          >
            <Archive size={16} />
            {notification.archived
              ? "Unarchive"
              : "Archive"}
          </button>

          <button
            type="button"
            onClick={() =>
              onDelete(notification.id)
            }
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-red-500 text-white hover:bg-red-600 transition"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default NotificationCard;