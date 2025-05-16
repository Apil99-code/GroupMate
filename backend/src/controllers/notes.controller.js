import Note from "../models/notes.model.js";

// Create a new note
export const createNote = async (req, res) => {
  try {
    const { content, coordinates } = req.body;
    const userId = req.user._id;

    const note = await Note.create({
      userId,
      content,
      coordinates
    });

    res.status(201).json(note);
  } catch (error) {
    console.error("Error in createNote:", error.message);
    res.status(500).json({ message: "Failed to create note", error: error.message });
  }
};

// Get all notes for a user
export const getUserNotes = async (req, res) => {
  try {
    const userId = req.user._id;
    const notes = await Note.find({ userId })
      .sort({ createdAt: -1 });

    res.status(200).json(notes);
  } catch (error) {
    console.error("Error in getUserNotes:", error.message);
    res.status(500).json({ message: "Failed to fetch notes", error: error.message });
  }
};

// Update a note
export const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const note = await Note.findOne({ _id: id, userId });
    if (!note) {
      return res.status(404).json({ message: "Note not found or unauthorized" });
    }

    note.content = content;
    await note.save();

    res.status(200).json(note);
  } catch (error) {
    console.error("Error in updateNote:", error.message);
    res.status(500).json({ message: "Failed to update note", error: error.message });
  }
};

// Delete a note
export const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const note = await Note.findOne({ _id: id, userId });
    if (!note) {
      return res.status(404).json({ message: "Note not found or unauthorized" });
    }

    await note.deleteOne();
    res.status(200).json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error in deleteNote:", error.message);
    res.status(500).json({ message: "Failed to delete note", error: error.message });
  }
};
