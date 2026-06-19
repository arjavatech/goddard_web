import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Bell,
  Search,
  Moon,
  Sun,
  Archive,
  Trash2,
  CheckCheck,
  RefreshCw,
  Filter,
  Home,
  Users,
  User,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

import NotificationCard from "./NotificationCard";
import NotificationModal from "./NotificationModal";

import {
  initialNotifications,
} from "./notificationData";
import type {
  Notification
} from "./notificationData";

const STORAGE_KEY = "goddard_notifications";
const THEME_KEY = "goddard_theme";

const PAGE_SIZE = 8;

type FilterType =
  | "all"
  | "read"
  | "unread"
  | "archived";

const Notifications2: React.FC = () => {
  const [darkMode, setDarkMode] =
    useState<boolean>(false);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [searchTerm, setSearchTerm] =
    useState<string>("");

  const [filter, setFilter] =
    useState<FilterType>("all");

  const [
    selectedNotifications,
    setSelectedNotifications,
  ] = useState<number[]>([]);

  const [
    selectedNotification,
    setSelectedNotification,
  ] = useState<Notification | null>(
    null
  );

  const [isModalOpen, setIsModalOpen] =
    useState<boolean>(false);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string>("");

  const [page, setPage] =
    useState<number>(1);

  const [refreshing, setRefreshing] =
    useState<boolean>(false);

  const loadMoreRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const touchStartY =
    useRef<number>(0);

  useEffect(() => {
    const savedTheme =
      localStorage.getItem(THEME_KEY);

    if (savedTheme) {
      setDarkMode(
        savedTheme === "dark"
      );
    }

    const savedNotifications =
      localStorage.getItem(
        STORAGE_KEY
      );

    setTimeout(() => {
      try {
        if (savedNotifications) {
          setNotifications(
            JSON.parse(
              savedNotifications
            ) as Notification[]
          );
        } else {
          setNotifications(
            initialNotifications
          );
        }
      } catch {
        setError(
          "Unable to load notifications"
        );
      } finally {
        setLoading(false);
      }
    }, 1200);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        notifications
      )
    );
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(
      THEME_KEY,
      darkMode
        ? "dark"
        : "light"
    );
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      darkMode
    );
  }, [darkMode]);

  const unreadCount = useMemo(
    (): number =>
      notifications.filter(
        (n) =>
          !n.read &&
          !n.archived
      ).length,
    [notifications]
  );

  const filteredNotifications =
    useMemo(
      (): Notification[] => {
        let data = [
          ...notifications,
        ];

        if (searchTerm) {
          data = data.filter(
            (item) =>
              item.title
                .toLowerCase()
                .includes(
                  searchTerm.toLowerCase()
                ) ||
              item.message
                .toLowerCase()
                .includes(
                  searchTerm.toLowerCase()
                )
          );
        }

        switch (filter) {
          case "read":
            data = data.filter(
              (n) => n.read
            );
            break;

          case "unread":
            data = data.filter(
              (n) => !n.read
            );
            break;

          case "archived":
            data = data.filter(
              (n) =>
                n.archived
            );
            break;

          default:
            break;
        }

        return data;
      },
      [
        notifications,
        searchTerm,
        filter,
      ]
    );

  const visibleNotifications =
    filteredNotifications.slice(
      0,
      page * PAGE_SIZE
    );

  const todayNotifications =
    visibleNotifications.filter(
      (n) =>
        n.section === "today"
    );

  const earlierNotifications =
    visibleNotifications.filter(
      (n) =>
        n.section === "earlier"
    );

  const toggleTheme =
    (): void => {
      setDarkMode(
        (prev) => !prev
      );
    };

  const openNotification = (
    notification: Notification
  ): void => {
    setSelectedNotification(
      notification
    );

    setIsModalOpen(true);

    if (!notification.read) {
      markAsRead(
        notification.id
      );
    }
  };

  const markAsRead = (
    id: number
  ): void => {
    setNotifications(
      (prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                read: true,
              }
            : n
        )
    );
  };

  const markAllRead =
    (): void => {
      setNotifications(
        (prev) =>
          prev.map((n) => ({
            ...n,
            read: true,
          }))
      );
    };

  const deleteNotification = (
    id: number
  ): void => {
    setNotifications(
      (prev) =>
        prev.filter(
          (n) =>
            n.id !== id
        )
    );
  };

  const archiveNotification = (
    id: number
  ): void => {
    setNotifications(
      (prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                archived:
                  !n.archived,
              }
            : n
        )
    );
  };

  const toggleSelect = (
    id: number
  ): void => {
    setSelectedNotifications(
      (prev) =>
        prev.includes(id)
          ? prev.filter(
              (item) =>
                item !== id
            )
          : [
              ...prev,
              id,
            ]
    );
  };

  const bulkDelete =
    (): void => {
      setNotifications(
        (prev) =>
          prev.filter(
            (n) =>
              !selectedNotifications.includes(
                n.id
              )
          )
      );

      setSelectedNotifications(
        []
      );
    };

  const requestPermission =
    async (): Promise<void> => {
      if (
        "Notification" in
        window
      ) {
        await Notification.requestPermission();
      }
    };

  const sendTestNotification =
    (): void => {
      if (
        Notification.permission ===
        "granted"
      ) {
        new Notification(
          "Goddard School",
          {
            body:
              "You have a new notification",
          }
        );
      }
    };

  const refreshNotifications =
    (): void => {
      setRefreshing(true);

      setTimeout(() => {
        setNotifications(
          [
            ...initialNotifications,
          ]
        );

        setRefreshing(false);
      }, 1500);
    };

  useEffect(() => {
    const observer =
      new IntersectionObserver(
        (entries) => {
          if (
            entries[0]
              .isIntersecting
          ) {
            setPage(
              (prev) =>
                prev + 1
            );
          }
        }
      );

    if (
      loadMoreRef.current
    ) {
      observer.observe(
        loadMoreRef.current
      );
    }

    return () =>
      observer.disconnect();
  }, []);

  const handleTouchStart = (
    e: React.TouchEvent<HTMLDivElement>
  ): void => {
    touchStartY.current =
      e.touches[0].clientY;
  };

  const handleTouchEnd = (
    e: React.TouchEvent<HTMLDivElement>
  ): void => {
    const endY =
      e.changedTouches[0]
        .clientY;

    if (
      endY -
        touchStartY.current >
      120
    ) {
      refreshNotifications();
    }
  };
  if (loading) {
  return (
    <div
      className={`min-h-screen p-6 ${
        darkMode
          ? "bg-gray-950"
          : "bg-gray-50"
      }`}
    >
      <div className="space-y-4 animate-pulse">
        {[...Array(6)].map(
          (
            _: undefined,
            index: number
          ) => (
            <div
              key={index}
              className={`h-28 rounded-2xl ${
                darkMode
                  ? "bg-gray-800"
                  : "bg-white"
              }`}
            />
          )
        )}
      </div>
    </div>
  );
}

if (error) {
  return (
    <div
      className={`min-h-screen flex items-center justify-center ${
        darkMode
          ? "bg-gray-950 text-white"
          : "bg-gray-50 text-gray-900"
      }`}
    >
      <div className="text-center">
        <Bell
          size={60}
          className="mx-auto mb-4 text-red-500"
        />

        <h2 className="text-xl font-bold">
          {error}
        </h2>
      </div>
    </div>
  );
}

return (
  <div
    onTouchStart={
      handleTouchStart
    }
    onTouchEnd={
      handleTouchEnd
    }
    className={`min-h-screen transition-all duration-300 pb-28 ${
      darkMode
        ? "bg-gray-950 text-white"
        : "bg-gray-50 text-gray-900"
    }`}
  >
    {/* Header */}
    <div
      className={`sticky top-0 z-30 backdrop-blur-lg border-b ${
        darkMode
          ? "bg-gray-950/80 border-gray-800"
          : "bg-white/80 border-gray-200"
      }`}
    >
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Notifications
            </h1>

            <p className="text-sm text-gray-500">
              Goddard School
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={
                requestPermission
              }
              className="px-3 py-2 rounded-xl bg-yellow-500 text-white text-sm"
            >
              Enable Push
            </button>

            <button
              type="button"
              onClick={
                sendTestNotification
              }
              className="relative p-3 rounded-xl bg-yellow-500 text-white"
            >
              <Bell size={18} />

              {unreadCount >
                0 && (
                <span className="absolute -top-2 -right-2 h-5 min-w-[20px] rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={
                toggleTheme
              }
              className="p-3 rounded-xl bg-gray-200 dark:bg-gray-800"
            >
              {darkMode ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search
            size={18}
            className="absolute left-4 top-3.5 text-gray-400"
          />

          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(
              e: React.ChangeEvent<HTMLInputElement>
            ) =>
              setSearchTerm(
                e.target.value
              )
            }
            className={`w-full pl-11 pr-4 py-3 rounded-2xl outline-none border ${
              darkMode
                ? "bg-gray-900 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto mt-4">
          {(
            [
              "all",
              "read",
              "unread",
              "archived",
            ] as FilterType[]
          ).map(
            (
              item: FilterType
            ) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setFilter(
                    item
                  )
                }
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm capitalize transition ${
                  filter ===
                  item
                    ? "bg-yellow-500 text-white"
                    : darkMode
                    ? "bg-gray-800"
                    : "bg-white"
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>

        {/* Bulk Actions */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={
              markAllRead
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white"
          >
            <CheckCheck size={16} />
            Mark All Read
          </button>

          <button
            type="button"
            onClick={
              bulkDelete
            }
            disabled={
              !selectedNotifications.length
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white disabled:opacity-50"
          >
            <Trash2 size={16} />
            Bulk Delete
          </button>

          <button
            type="button"
            onClick={
              refreshNotifications
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {refreshing && (
          <div className="mt-3 text-sm text-blue-500">
            Refreshing
            notifications...
          </div>
        )}
      </div>
    </div>

    {/* Notifications */}
    <div className="max-w-5xl mx-auto p-4">
      {visibleNotifications.length ===
      0 ? (
        <div className="text-center py-24">
          <Bell
            size={60}
            className="mx-auto mb-4 text-gray-400"
          />

          <h3 className="text-xl font-semibold">
            No Notifications
          </h3>

          <p className="text-gray-500 mt-2">
            You're all caught
            up.
          </p>
        </div>
      ) : (
        <>
          {todayNotifications.length >
            0 && (
            <>
              <h2 className="font-bold text-lg mb-4">
                Today
              </h2>

              <div className="space-y-4">
                <AnimatePresence>
                  {todayNotifications.map(
                    (
                      notification: Notification
                    ) => (
                      <NotificationCard
                        key={
                          notification.id
                        }
                        notification={
                          notification
                        }
                        darkMode={
                          darkMode
                        }
                        selected={selectedNotifications.includes(
                          notification.id
                        )}
                        onSelect={
                          toggleSelect
                        }
                        onOpen={
                          openNotification
                        }
                        onDelete={
                          deleteNotification
                        }
                        onArchive={
                          archiveNotification
                        }
                        onMarkRead={
                          markAsRead
                        }
                      />
                    )
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {earlierNotifications.length >
            0 && (
            <>
              <h2 className="font-bold text-lg mt-8 mb-4">
                Earlier
              </h2>

              <div className="space-y-4">
                <AnimatePresence>
                  {earlierNotifications.map(
                    (
                      notification: Notification
                    ) => (
                      <NotificationCard
                        key={
                          notification.id
                        }
                        notification={
                          notification
                        }
                        darkMode={
                          darkMode
                        }
                        selected={selectedNotifications.includes(
                          notification.id
                        )}
                        onSelect={
                          toggleSelect
                        }
                        onOpen={
                          openNotification
                        }
                        onDelete={
                          deleteNotification
                        }
                        onArchive={
                          archiveNotification
                        }
                        onMarkRead={
                          markAsRead
                        }
                      />
                    )
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          <div
            ref={loadMoreRef}
            className="h-10"
          />
        </>
      )}
    </div>

    {/* Bottom Navigation */}
    <div
      className={`fixed bottom-0 left-0 right-0 border-t ${
        darkMode
          ? "bg-gray-900 border-gray-800"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="max-w-5xl mx-auto flex justify-around py-4">
        <button
          type="button"
          className="flex flex-col items-center text-gray-500"
        >
          <Home size={22} />
          <span className="text-xs mt-1">
            Home
          </span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center text-gray-500"
        >
          <Users size={22} />
          <span className="text-xs mt-1">
            Users
          </span>
        </button>

        <button
          type="button"
          className="relative flex flex-col items-center text-yellow-500"
        >
          <Bell size={22} />

          {unreadCount >
            0 && (
            <span className="absolute -top-2 left-5 h-5 min-w-[20px] rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount}
            </span>
          )}

          <span className="text-xs mt-1">
            Notifications
          </span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center text-gray-500"
        >
          <User size={22} />
          <span className="text-xs mt-1">
            Profile
          </span>
        </button>
      </div>
    </div>

    <NotificationModal
      isOpen={
        isModalOpen
      }
      notification={
        selectedNotification
      }
      darkMode={
        darkMode
      }
      onClose={() =>
        setIsModalOpen(
          false
        )
      }
    />
  </div>
);
};

export default Notifications2;