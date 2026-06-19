import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Clock,
  Archive,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  FileText,
  School,
  Bell,
} from "lucide-react";

import { Notification } from "./notificationData";

interface NotificationModalProps {
  isOpen: boolean;
  notification: Notification | null;
  darkMode: boolean;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  notification,
  darkMode,
  onClose,
}) => {
  if (!notification) return null;

  const getTypeIcon = (): React.ReactElement => {
    switch (notification.type) {
      case "student":
        return <UserPlus size={24} />;

      case "form":
        return <FileText size={24} />;

      case "classroom":
        return <School size={24} />;

      case "approval":
        return <CheckCircle2 size={24} />;

      case "account":
        return <AlertCircle size={24} />;

      default:
        return <Bell size={24} />;
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
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
          >
            <div
              className={`w-full md:max-w-2xl rounded-t-3xl shadow-2xl ${
                darkMode
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-900"
              }`}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3">
                <div className="h-1.5 w-14 rounded-full bg-gray-400" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold">
                  Notification Details
                </h2>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[75vh] overflow-y-auto">
                <div className="flex items-start gap-4">
                  <div
                    className={`h-14 w-14 rounded-2xl flex items-center justify-center ${getTypeColor()}`}
                  >
                    {getTypeIcon()}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">
                      {notification.title}
                    </h3>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <span
                        className={`px-3 py-1 rounded-full text-white text-xs ${getPriorityColor()}`}
                      >
                        {notification.priority.toUpperCase()}
                      </span>

                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          notification.read
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {notification.read
                          ? "READ"
                          : "UNREAD"}
                      </span>

                      {notification.archived && (
                        <span className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700 flex items-center gap-1">
                          <Archive size={12} />
                          ARCHIVED
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                <div
                  className={`mt-6 flex items-center gap-2 text-sm ${
                    darkMode
                      ? "text-gray-400"
                      : "text-gray-500"
                  }`}
                >
                  <Clock size={16} />
                  {notification.timestamp}
                </div>

                {/* Full Content */}
                <div
                  className={`mt-6 rounded-2xl p-5 ${
                    darkMode
                      ? "bg-gray-800"
                      : "bg-gray-50"
                  }`}
                >
                  <h4 className="font-semibold text-lg mb-3">
                    Description
                  </h4>

                  <p
                    className={`leading-7 ${
                      darkMode
                        ? "text-gray-300"
                        : "text-gray-700"
                    }`}
                  >
                    {notification.fullContent}
                  </p>
                </div>

                {/* Status Card */}
                <div
                  className={`mt-6 rounded-2xl p-5 ${
                    darkMode
                      ? "bg-gray-800"
                      : "bg-gray-50"
                  }`}
                >
                  <h4 className="font-semibold mb-4">
                    Notification Status
                  </h4>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Status</span>

                      <span
                        className={
                          notification.read
                            ? "text-green-500 font-medium"
                            : "text-yellow-500 font-medium"
                        }
                      >
                        {notification.read
                          ? "Read"
                          : "Unread"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Archived</span>

                      <span
                        className={
                          notification.archived
                            ? "text-blue-500 font-medium"
                            : "text-gray-500 font-medium"
                        }
                      >
                        {notification.archived
                          ? "Yes"
                          : "No"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Priority</span>

                      <span className="capitalize font-medium">
                        {notification.priority}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Type</span>

                      <span className="capitalize font-medium">
                        {notification.type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full mt-6 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-2xl font-semibold transition"
                >
                  Close Notification
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationModal;