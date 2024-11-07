const { Note, User, Lead } = require("../Modal/index");
const jwt = require("jsonwebtoken");
const { uploadFileToPostgreSQL } = require("./CommonController"); // Adjust this import

const uploadFile = async (req, res) => {
  const userId = req.params.userId; // Ensure userId is a valid user identifier in your database
  const localFilePath = req.file.path; // Make sure the file upload middleware is configured correctly

  try {
    const fileUrl = await uploadFileToPostgreSQL(localFilePath, userId); // Update to save file info in PostgreSQL
    res.status(200).json({ message: "File uploaded successfully!", fileUrl });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
};

const getNotes = async (req, res) => {
  const { lead_id } = req.params; // Ensure leadId is a valid identifier

  if (!lead_id) {
    return res.status(400).json({ message: "Lead ID is required" });
  }

  try {
    const notes = await Note.findAll({
      where: { lead_id },
      include: [
        {
          model: Lead,
        },
        {
          model: User,
        },
      ],
      order: [["created_on", "DESC"]],
    });

    if (!notes.length) {
      return res
        .status(204)
        .json({ message: "No comments found for the given leadId" });
    }

    res.status(200).json(notes);
  } catch (error) {
    console.error("Error fetching notes with user info:", error);
    res
      .status(500)
      .json({ error: "Error fetching notes with user info", error });
  }
};

const saveNotes = async (req, res) => {
  const { content, lead_id } = req.body;
  const authHeader = req.headers.authorization;

  if (!content || !lead_id) {
    return res.status(400).send("Content and LeadId are required");
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const timestamp = new Date();

    const newNote = await Note.create({
      content,
      created_on: timestamp,
      created_by: decoded.email,
      lead_id,
      user_id: decoded.id,
    });

    res.status(201).json(newNote);
  } catch (error) {
    console.error("Error saving note:", error);
    res.status(500).send("Error saving note");
  }
};

const updateNotes = async (req, res) => {
  const { noteId } = req.params;
  const { content } = req.body;
  const authHeader = req.headers.authorization;

  if (!content) {
    return res.status(400).json({ message: "Content is required" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const note = await Note.findByPk(noteId);

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    note.content = content;
    note.updated_on = new Date();
    note.updated_by = decoded.email; // Use userId from the token

    await note.save();

    res.status(200).json({ message: "Note updated successfully" });
  } catch (error) {
    console.error("Error updating note:", error);
    res
      .status(500)
      .json({ message: "Failed to update note", error: error.message });
  }
};

const deleteNote = async (req, res) => {
  const { noteId } = req.params;

  if (!noteId) {
    return res.status(400).json({ error: "Note ID is required" });
  }

  try {
    const note = await Note.findByPk(noteId);
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    await note.destroy();
    res.status(200).json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ error: "Error deleting note" });
  }
};

module.exports = { getNotes, saveNotes, updateNotes, deleteNote, uploadFile };
