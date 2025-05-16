import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";
import TripPage from "./pages/TripPage";
import ExpensePage from "./pages/ExpensePage";
// import ChatPage from "./pages/ChatPage";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useEffect } from "react";
import { UNSAFE_DataRouterContext, UNSAFE_DataRouterStateContext } from 'react-router-dom';

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

// Configure React Router future flags
UNSAFE_DataRouterContext.futureFlagBehavior = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    checkAuth().catch((error) => {
      console.error("Authentication check failed:", error.message);
    });
  }, [checkAuth]);

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  return (
    <div data-theme={theme}>
      <Navbar />
      
      <main className="pt-8 min-h-screen">
        <Routes>
          <Route path="/" element={authUser ? <DashboardPage /> : <Navigate to="/login" />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/settings" element={authUser ? <SettingsPage /> : <Navigate to="/login" />} />
          <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="/trip" element={authUser ? <TripPage /> : <Navigate to="/login" />} />
          <Route path="/expense" element={authUser ? <ExpensePage /> : <Navigate to="/login" />} />
          <Route path="/homepage" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="*" element={<div>404 - Page Not Found</div>} />
        </Routes>
      </main>
      <Toaster />
    </div>
  );
};

export default App;
