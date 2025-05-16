import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSending: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true, messages: [] });
    try {
      console.log("Fetching messages for user:", userId);
      const res = await axiosInstance.get(`/messages/${userId}`);
      console.log("Received messages:", res.data);
      
      // Ensure we're setting a valid array of messages and normalize the data
      const messages = Array.isArray(res.data) ? res.data.map(message => ({
        ...message,
        senderId: message.senderId?._id || message.senderId,
        receiverId: message.receiverId?._id || message.receiverId
      })) : [];

      set({ 
        messages,
        isMessagesLoading: false 
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error(error.response?.data?.message || "Failed to fetch messages");
      set({ messages: [], isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    if (!selectedUser?._id) {
      toast.error("No user selected");
      return;
    }

    set({ isSending: true });
    try {
      console.log("Sending private message to:", selectedUser._id, messageData);
      
      // Ensure message data is properly structured
      const data = {
        text: messageData.text,
        receiverId: selectedUser._id,
        ...(messageData.image && { image: messageData.image })
      };

      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, data);
      console.log("Message sent response:", res.data);
      
      // Add the new message to the messages array with normalized data
      if (res.data) {
        const normalizedMessage = {
          ...res.data,
          senderId: res.data.senderId?._id || res.data.senderId,
          receiverId: res.data.receiverId?._id || res.data.receiverId
        };
        
        set((state) => ({
          messages: [...state.messages, normalizedMessage]
        }));
      }
      return res.data;
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error.response?.data?.message || "Failed to send message");
      throw error;
    } finally {
      set({ isSending: false });
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = window.socket;
    if (!socket) {
      console.error("Socket not initialized");
      return;
    }

    console.log("Subscribing to messages for user:", selectedUser._id);
    socket.on("newMessage", (message) => {
      console.log("New private message received:", message);
      
      // Normalize message data
      const normalizedMessage = {
        ...message,
        senderId: message.senderId?._id || message.senderId,
        receiverId: message.receiverId?._id || message.receiverId
      };

      if (
        normalizedMessage.senderId === selectedUser._id ||
        normalizedMessage.receiverId === selectedUser._id
      ) {
        set((state) => ({
          messages: [...state.messages, normalizedMessage]
        }));
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = window.socket;
    if (socket) {
      console.log("Unsubscribing from private messages");
      socket.off("newMessage");
    }
  },

  setSelectedUser: (user) => {
    console.log("Setting selected user:", user);
    set({ selectedUser: user, messages: [] });
    if (user?._id) {
      get().getMessages(user._id);
    }
  },
}));
