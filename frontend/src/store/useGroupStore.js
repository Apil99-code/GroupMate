import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  isGroupsLoading: false,
  isGroupMessagesLoading: false,
  isMessageSending: false,
  isCreatingGroup: false,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalMessages: 0,
    hasMore: true
  },

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  getGroupMessages: async (groupId, page = 1) => {
    set({ isGroupMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages?page=${page}`);
      set((state) => ({
        groupMessages: page === 1 ? res.data.messages : [...(state.groupMessages || []), ...res.data.messages],
        selectedGroup: {
          ...state.selectedGroup,
          messages: page === 1 ? res.data.messages : [...(state.selectedGroup?.messages || []), ...res.data.messages]
        },
        pagination: {
          currentPage: res.data.currentPage,
          totalPages: res.data.totalPages,
          totalMessages: res.data.totalMessages,
          hasMore: res.data.currentPage < res.data.totalPages
        }
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },

  loadMoreMessages: async (groupId) => {
    const { pagination, getGroupMessages } = get();
    if (pagination.hasMore && !pagination.isLoading) {
      await getGroupMessages(groupId, pagination.currentPage + 1);
    }
  },

  createGroup: async (groupData) => {
    set({ isCreatingGroup: true });
    try {
      const res = await axiosInstance.post("/groups", groupData);
      set((state) => ({
        groups: [...state.groups, res.data]
      }));
      toast.success("Group created successfully");
      return res.data;
    } catch (error) {
      set({ isCreatingGroup: false });
      toast.error(error.response?.data?.message || "Failed to create group");
      throw error;
    }
  },

  sendGroupMessage: async (groupId, messageData) => {
    set({ isMessageSending: true });
    try {
      console.log('Sending group message:', { groupId, messageData });
      const res = await axiosInstance.post(`/groups/${groupId}/messages`, messageData);
      console.log('Group message response:', res.data);
      
      // Don't update state here since the socket will handle it
      return res.data;
    } catch (error) {
      console.error('Error sending group message:', error);
      toast.error(error.response?.data?.message || "Failed to send message");
      throw error;
    } finally {
      set({ isMessageSending: false });
    }
  },

  addMessageReaction: async (groupId, messageId, emoji) => {
    try {
      const res = await axiosInstance.post(`/messages/${messageId}/reactions`, { emoji });
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add reaction");
      throw error;
    }
  },

  removeMessageReaction: async (groupId, messageId, emoji) => {
    try {
      const res = await axiosInstance.delete(`/messages/${messageId}/reactions/${emoji}`);
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove reaction");
      throw error;
    }
  },

  replyToMessage: async (groupId, messageData, replyToId) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/messages`, {
        ...messageData,
        replyTo: replyToId
      });
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reply");
      throw error;
    }
  },

  setSelectedGroup: (group) => {
    console.log('Setting selected group:', group);
    set({ 
      selectedGroup: group, 
      groupMessages: group?.messages || [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalMessages: 0,
        hasMore: true
      }
    });
    if (group?._id) {
      get().getGroupMessages(group._id);
    }
  },

  subscribeToGroupMessages: () => {
    const { selectedGroup } = get();
    if (!selectedGroup) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.error('Socket not initialized for group messages');
      return;
    }

    console.log('Subscribing to group messages for:', selectedGroup._id);
    
    // Remove any existing listeners to prevent duplicates
    socket.off("newGroupMessage");
    
    socket.on("newGroupMessage", (message) => {
      console.log('New group message received:', message);
      if (message.groupId === selectedGroup._id) {
        set((state) => {
          // Avoid duplicate messages
          const isDuplicate = state.groupMessages?.some(msg => 
            msg._id === message._id || 
            (msg.text === message.text && msg.sender === message.sender && 
             Math.abs(new Date(msg.createdAt) - new Date(message.createdAt)) < 1000)
          );
          if (isDuplicate) return state;

          const newGroupMessages = Array.isArray(state.groupMessages)
            ? [...state.groupMessages, message]
            : [message];

          const newSelectedGroupMessages = Array.isArray(state.selectedGroup?.messages)
            ? [...state.selectedGroup.messages, message]
            : [message];

          return {
            groupMessages: newGroupMessages,
            selectedGroup: {
              ...state.selectedGroup,
              messages: newSelectedGroupMessages
            }
          };
        });
      }
    });

    // Join the group's socket room
    socket.emit('joinGroup', selectedGroup._id);
  },

  unsubscribeFromGroupMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      const { selectedGroup } = get();
      if (selectedGroup?._id) {
        socket.emit('leaveGroup', selectedGroup._id);
      }
      socket.off("newGroupMessage");
    }
  },

  assignRole: async (groupId, userId, role) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/roles`, { userId, role });
      set((state) => ({
        groups: state.groups.map((group) =>
          group._id === groupId ? res.data : group
        ),
      }));
      toast.success("Role assigned successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign role");
    }
  },

  getGroupActivityLog: async (groupId) => {
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/activity-log`);
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch activity log");
      throw error;
    }
  },

  updateGroupName: async (groupId, newName) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/name`, { newName });
      set((state) => ({
        groups: state.groups.map((group) =>
          group._id === groupId ? res.data : group
        ),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup,
      }));
      toast.success("Group name updated successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group name");
      throw error;
    }
  },

  addGroupMember: async (groupId, email) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members`, { email });
      set((state) => ({
        groups: state.groups.map((group) =>
          group._id === groupId ? res.data : group
        ),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup,
      }));
      toast.success("Member added successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member");
      throw error;
    }
  },

  removeGroupMember: async (groupId, memberId) => {
    try {
      const res = await axiosInstance.delete(`/groups/${groupId}/members`, { data: { memberId } });
      set((state) => ({
        groups: state.groups.map((group) =>
          group._id === groupId ? res.data : group
        ),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup,
      }));
      toast.success("Member removed successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
      throw error;
    }
  },

  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}`);
      set((state) => ({
        groups: state.groups.filter((group) => group._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup,
      }));
      toast.success("Group deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete group");
      throw error;
    }
  },
}));