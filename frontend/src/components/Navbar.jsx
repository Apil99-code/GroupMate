import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, Settings, User, Bell, BarChart3, Receipt, MapPin, Calendar, Check, X, Users, Map } from "lucide-react";
import { useState, useEffect } from "react";
import { axiosInstance } from "../lib/axios";
import { io as clientIo } from "socket.io-client";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  // Helper to get auth token from localStorage (or use your preferred method)
  const getAuthToken = () => localStorage.getItem("token");

  // Format time for notifications
  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffInSeconds = Math.floor((now - notifDate) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return notifDate.toLocaleDateString();
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!authUser) return;
      try {
        const response = await axiosInstance.get("/notifications");
        setNotifications(response.data);
      } catch (error) {
        console.error("Failed to fetch notifications:", error?.response?.data || error.message);
        setNotifications([]);
      }
    };
    fetchNotifications();

    // Set up polling for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    // Socket.io live notifications
    let socket;
    if (authUser?._id) {
      socket = clientIo('/', { query: { userId: authUser._id } });
      socket.on('notification', (notification) => {
        setNotifications((prev) => [notification, ...prev]);
      });
    }

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, [authUser]);

  const markAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif._id === id ? { ...notif, read: true } : notif))
    );
    try {
      await fetch(`/api/notifications/${id}/mark-as-read`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${getAuthToken()}`,
        },
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    try {
      await fetch("/api/notifications/mark-all-as-read", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${getAuthToken()}`,
        },
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const filteredNotifications = notifications.filter((notif) =>
    activeTab === "all" ? true : notif.type === activeTab
  );

  // Accept friend request
  const acceptFriendRequest = async (notif) => {
    try {
      await axiosInstance.post("/friends/accept", { from: notif.from?._id || notif.from });
      // Mark notification as read
      markAsRead(notif._id);
      // Optionally, refetch friends or notifications
    } catch (err) {
      // Optionally show error
    }
  };

  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 
    backdrop-blur-lg bg-base-100/80"
    >
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-lg font-bold">GroupMate</h1>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {authUser && (
              <>
                <Link to={"/"} className="btn btn-sm btn-ghost gap-2">
                  <User className="size-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>

                <Link to={"/trip"} className="btn btn-sm btn-ghost gap-2">
                  <User className="size-4" />
                  <span className="hidden sm:inline">Trip</span>
                </Link>

                <Link to={"/expense"} className="btn btn-sm btn-ghost gap-2">
                  <Receipt className="size-4" />
                  <span className="hidden sm:inline">Expenses</span>
                </Link>

                <Link to={"/homepage"} className="btn btn-sm btn-ghost gap-2">
                  <User className="size-4" />
                  <span className="hidden sm:inline">Group</span>
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {authUser && (
              <>
                <div className="dropdown dropdown-end">
                  <label tabIndex={0} className="btn btn-sm btn-ghost gap-2 indicator">
                    <Bell className="size-4" />
                    <span className="indicator-item badge badge-sm badge-primary">
                      {notifications.filter((notif) => !notif.read).length}
                    </span>
                  </label>
                  <div tabIndex={0} className="dropdown-content z-[1] card card-compact shadow bg-base-100 w-80">
                    <div className="card-body">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-lg">Notifications</h3>
                        <div className="flex gap-2">
                          <button className="btn btn-xs btn-ghost" onClick={markAllAsRead}>
                            Mark all as read
                          </button>
                          <button className="btn btn-xs btn-ghost">
                            <Settings className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="tabs tabs-boxed mb-2">
                        <a
                          className={`tab ${activeTab === "all" ? "tab-active" : ""}`}
                          onClick={() => setActiveTab("all")}
                        >
                          All
                        </a>
                        <a
                          className={`tab ${activeTab === "trip" ? "tab-active" : ""}`}
                          onClick={() => setActiveTab("trip")}
                        >
                          Trips
                        </a>
                        <a
                          className={`tab ${activeTab === "message" ? "tab-active" : ""}`}
                          onClick={() => setActiveTab("message")}
                        >
                          Messages
                        </a>
                        <a
                          className={`tab ${activeTab === "expense" ? "tab-active" : ""}`}
                          onClick={() => setActiveTab("expense")}
                        >
                          Expenses
                        </a>
                      </div>
                      
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {filteredNotifications.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">
                            <p>No notifications</p>
                          </div>
                        ) : (
                          filteredNotifications.map((notif) => (
                            <div
                              key={notif._id}
                              className={`flex gap-3 p-2 hover:bg-base-200 rounded-lg transition-colors ${
                                notif.read ? "opacity-50" : ""
                              }`}
                            >
                              <div className={`p-2 rounded-full h-fit ${
                                notif.type === "trip" ? "bg-blue-100" :
                                notif.type === "message" ? "bg-green-100" :
                                notif.type === "expense" ? "bg-red-100" :
                                notif.type === "friend_request" ? "bg-yellow-100" :
                                "bg-purple-100"
                              }`}>
                                {notif.type === "trip" && <Calendar className="w-4 h-4 text-blue-500" />}
                                {notif.type === "message" && <MessageSquare className="w-4 h-4 text-green-500" />}
                                {notif.type === "expense" && <Receipt className="w-4 h-4 text-red-500" />}
                                {notif.type === "location" && <MapPin className="w-4 h-4 text-purple-500" />}
                                {notif.type === "friend_request" && <Users className="w-4 h-4 text-yellow-500" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between">
                                  <p className="text-sm font-medium">
                                    {notif.type === "friend_request"
                                      ? `${notif.from?.fullName || "Someone"} sent you a friend request`
                                      : notif.title}
                                  </p>
                                  <span className="text-xs text-gray-500">{formatTime(notif.createdAt)}</span>
                                </div>
                                <p className="text-xs text-gray-600">{notif.message}</p>
                              </div>
                              {notif.type === "friend_request" && !notif.read ? (
                                <button className="btn btn-xs btn-success" onClick={() => acceptFriendRequest(notif)}>
                                  Accept
                                </button>
                              ) : !notif.read && (
                                <button className="btn btn-xs btn-ghost" onClick={() => markAsRead(notif._id)}>
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {authUser && (
              <>
                <Link to={"/profile"} className="btn btn-sm btn-ghost gap-2">
                  <User className="size-4" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>
                <button className="btn btn-sm btn-ghost gap-2" onClick={logout}>
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
