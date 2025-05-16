import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useTripStore = create((set, get) => ({
  trips: [],
  isTripsLoading: false,
  isTripSubmitting: false,
  selectedTrip: null,
  showEditModal: false,
  showShareModal: false,
  showCreateFromChatModal: false,
  selectedChatGroup: null,
  sharedLocations: {},

  // Fetch all trips
  getTrips: async () => {
    set({ isTripsLoading: true });
    try {
      const res = await axiosInstance.get("/trips");
      set({ trips: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch trips");
    } finally {
      set({ isTripsLoading: false });
    }
  },

  // Create a trip from chat
  createTripFromChat: async (tripData) => {
    set({ isTripSubmitting: true });
    try {
      const res = await axiosInstance.post("/trips/from-chat", tripData);
      set((state) => ({ 
        trips: [...state.trips, res.data],
        showCreateFromChatModal: false,
        selectedChatGroup: null
      }));
      toast.success("Trip created successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create trip");
      throw error;
    } finally {
      set({ isTripSubmitting: false });
    }
  },

  // Update trip members
  updateTripMembers: async (tripId, members) => {
    set({ isTripSubmitting: true });
    try {
      const res = await axiosInstance.put(`/trips/${tripId}/members`, { members });
      set((state) => ({
        trips: state.trips.map((trip) => 
          trip._id === tripId ? res.data : trip
        ),
        selectedTrip: state.selectedTrip?._id === tripId ? res.data : state.selectedTrip
      }));
      toast.success("Trip members updated successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update trip members");
      throw error;
    } finally {
      set({ isTripSubmitting: false });
    }
  },

  // Get trip expenses (both group and personal)
  getTripExpenses: async (tripId) => {
    try {
      const res = await axiosInstance.get(`/trips/${tripId}/expenses`);
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch trip expenses");
      throw error;
    }
  },

  // Set selected chat group for trip creation
  setSelectedChatGroup: (chatGroup) => {
    set({ 
      selectedChatGroup: chatGroup,
      showCreateFromChatModal: true
    });
  },

  // Close create from chat modal
  closeCreateFromChatModal: () => {
    set({ 
      showCreateFromChatModal: false,
      selectedChatGroup: null
    });
  },

  // Create a new trip
  createTrip: async (tripData) => {
    try {
      const response = await axiosInstance.post("/trips", {
        ...tripData,
        userId: useAuthStore.getState().authUser._id, // Ensure userId is included
        destination: tripData.location || tripData.destination // Use location as destination if not explicitly provided
      });
      return response.data;
    } catch (error) {
      console.error('Error creating trip:', error);
      throw error;
    }
  },
  // Update a trip
  updateTrip: async (id, tripData) => {
    set({ isTripSubmitting: true });
    try {
      const res = await axiosInstance.put(`/trips/${id}`, tripData);
      set((state) => ({
        trips: state.trips.map((trip) => 
          trip._id === id ? res.data : trip
        ),
        selectedTrip: state.selectedTrip?._id === id ? res.data : state.selectedTrip
      }));
      toast.success("Trip updated successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update trip");
      throw error;
    } finally {
      set({ isTripSubmitting: false, showEditModal: false });
    }
  },

  // Delete a trip
  deleteTrip: async (id) => {
    set({ isTripSubmitting: true });
    try {
      await axiosInstance.delete(`/trips/${id}`);
      set((state) => ({
        trips: state.trips.filter((trip) => trip._id !== id),
        selectedTrip: state.selectedTrip?._id === id ? null : state.selectedTrip
      }));
      toast.success("Trip deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete trip");
      throw error;
    } finally {
      set({ isTripSubmitting: false });
    }
  },

  // Share trip
  shareTrip: async (id, shareData) => {
    try {
      const res = await axiosInstance.post(`/trips/${id}/share`, shareData);
      set((state) => ({
        trips: state.trips.map((trip) =>
          trip._id === id ? { ...trip, ...res.data } : trip
        ),
      }));
      toast.success("Trip shared successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to share trip");
      throw error;
    }
  },

  // Mark trip as completed
  markTripAsCompleted: async (id) => {
    set({ isTripSubmitting: true });
    try {
      const res = await axiosInstance.put(`/trips/${id}/complete`);
      set((state) => ({
        trips: state.trips.map((trip) =>
          trip._id === id ? res.data : trip
        ),
      }));
      toast.success("Trip marked as completed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to mark trip as completed");
    } finally {
      set({ isTripSubmitting: false });
    }
  },

  // Get trip analytics
  getTripAnalytics: () => {
    const trips = get().trips;
    const totalBudget = trips.reduce((sum, trip) => sum + trip.budget, 0);
    const completedTrips = trips.filter((trip) => trip.status === "completed").length;
    return { totalBudget, completedTrips };
  },

  // Set selected trip
  setSelectedTrip: (trip) => {
    set({ selectedTrip: trip });
  },

  // Clear selected trip
  clearSelectedTrip: () => {
    set({ selectedTrip: null });
  },

  // Toggle edit modal
  toggleEditModal: (show) => {
    set({ showEditModal: show });
  },

  // Toggle share modal
  toggleShareModal: (show) => {
    set({ showShareModal: show });
  },

  // Join a trip
  joinTrip: async (tripId) => {
    set({ isTripSubmitting: true });
    try {
      const res = await axiosInstance.post(`/trips/${tripId}/join`);
      set((state) => ({
        trips: state.trips.map((trip) =>
          trip._id === tripId ? res.data : trip
        ),
      }));
      toast.success("Successfully joined the trip");
      return res.data;
    } catch (error) {
      console.error("Join trip error:", error);
      toast.error(error.response?.data?.message || "Failed to join trip");
      throw error;
    } finally {
      set({ isTripSubmitting: false });
    }
  },

  // Share location with group or all users
  shareLocation: async (location, groupId = null) => {
    try {
      const socket = useAuthStore.getState().socket;
      if (!socket) throw new Error("Socket not connected");

      socket.emit("shareLocation", {
        groupId,
        location: {
          coordinates: [location.longitude, location.latitude],
          address: location.address || null
        }
      });

      // Update local state
      set((state) => ({
        sharedLocations: {
          ...state.sharedLocations,
          [useAuthStore.getState().authUser._id]: {
            ...location,
            timestamp: new Date()
          }
        }
      }));

      // Subscribe to location updates
      socket.on("locationUpdate", (data) => {
        set((state) => ({
          sharedLocations: {
            ...state.sharedLocations,
            [data.userId]: {
              coordinates: data.location.coordinates,
              address: data.location.address,
              timestamp: data.timestamp
            }
          }
        }));
      });
    } catch (error) {
      toast.error("Failed to share location");
      throw error;
    }
  },
}));
