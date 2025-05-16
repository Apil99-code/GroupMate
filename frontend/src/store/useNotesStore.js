import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

export const useNotesStore = create((set, get) => ({
  notes: [],
  isLoading: false,
  isSubmitting: false,

  // Get all notes for the logged-in user
  getNotes: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get('/notes');
      set({ notes: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch notes");
    } finally {
      set({ isLoading: false });
    }
  },

  // Create a new note
  createNote: async (noteData) => {
    set({ isSubmitting: true });
    try {
      const res = await axiosInstance.post("/notes", noteData);
      set((state) => ({
        notes: [...state.notes, res.data]
      }));
      toast.success("Note added successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create note");
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  // Update a note
  updateNote: async (id, content) => {
    set({ isSubmitting: true });
    try {
      const res = await axiosInstance.put(`/notes/${id}`, { content });
      set((state) => ({
        notes: state.notes.map((note) =>
          note._id === id ? res.data : note
        )
      }));
      toast.success("Note updated successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update note");
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  // Delete a note
  deleteNote: async (id) => {
    set({ isSubmitting: true });
    try {
      await axiosInstance.delete(`/notes/${id}`);
      set((state) => ({
        notes: state.notes.filter((note) => note._id !== id)
      }));
      toast.success("Note deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete note");
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  // Clear notes
  clearNotes: () => {
    set({ notes: [] });
  }
}));
