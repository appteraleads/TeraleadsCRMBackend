const jwt = require("jsonwebtoken");
require("dotenv").config();
const TelnyxCallLogs = require("../Modal/TelnyxCallLogs");
const Lead = require("../Modal/Lead");
const { Op, Sequelize } = require("sequelize");
// Get all call logs
const getAllCallLogs = async (req, res) => {
  try {
    const callLogs = await TelnyxCallLogs.findAll({
      attributes: [
        [Sequelize.col("TelnyxCallLogs.phone_number"), "phone_number"], // Phone number
        [
          Sequelize.fn("COUNT", Sequelize.col("TelnyxCallLogs.phone_number")),
          "total_count", // Count of entries per phone_number
        ],
        [
          Sequelize.fn("MAX", Sequelize.col("TelnyxCallLogs.created_at")),
          "latest_created_at", // Most recent created_at in the group
        ],
      ],
      include: [
        {
          model: Lead,
          required: false, // Include Lead details if available
          where: Sequelize.where(
            Sequelize.cast(TelnyxCallLogs.sequelize.col("lead_id"), "INTEGER"),
            Op.eq,
            Sequelize.col("Lead.id")
          ),
        },
      ],
      group: [
        Sequelize.col("TelnyxCallLogs.phone_number"), // Group by phone_number
        Sequelize.col("Lead.id"), // Include Lead.id to join Lead details
      ],
      order: [
        [Sequelize.fn("MAX", Sequelize.col("TelnyxCallLogs.created_at")), "DESC"],
      ], // Order by latest created_at
    });

    return res.status(200).json(callLogs);
  } catch (error) {
    console.error("Error fetching call logs:", error);
    return res.status(500).json({ error: "Failed to fetch call logs" });
  }
};

// Create a new call log
const createCallLog = async (req, res) => {
  try {
    const data = req.body;

    let decoded;
    const token = req.headers.authorization?.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Create new call log
    const newCallLog = await TelnyxCallLogs.create({
      lead_id: data?.lead_id ? parseInt(data?.lead_id) : null,
      clinic_id: data?.clinic_id,
      caller_number: data?.caller_number,
      recipient_id: data?.recipient_id,
      phone_number: data?.phone_number,
      call_start: data?.call_start,
      call_end: data?.call_end,
      duration: data?.duration,
      call_status: data?.call_status,
      direction: data?.direction,
      recording_url: data?.recording_url,
      notes: data?.notes,
      session_id: data?.session_id,
      uuid: data?.uuid,
      created_by: decoded?.email,
      updated_by: decoded?.email,
    });

    return res.status(201).json(newCallLog);
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error creating call log:", error);

    // Check if the error is a Sequelize validation error
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ error: "Invalid data format" });
    }

    // Return a generic 500 error for other unexpected issues
    return res
      .status(500)
      .json({ error: "Failed to create call log. Please try again later." });
  }
};

// Update an existing call log
const updateCallLog = async (req, res) => {
  try {
    const data = req.body; // Get data from request body

    const updatedCallLog = await TelnyxCallLogs.update(
      {
        call_start: data?.call_start,
        call_end: data?.call_end,
        duration: data?.duration,
        call_status: data?.call_status,
      },
      {
        where: { uuid: data?.uuid },
      }
    );

    if (updatedCallLog[0] > 0) {
      return res.status(200).json({ message: "Call log updated successfully" });
    } else {
      return res.status(404).json({ error: "Call log not found" });
    }
  } catch (error) {
    console.error("Error updating call log:", error);
    return res.status(500).json({ error: "Failed to update call log" });
  }
};

// Delete a call log
const deleteCallLog = async (req, res) => {
  try {
    const id = req.params.id; // Get ID from request parameters

    const deletedCount = await TelnyxCallLogs.destroy({
      where: { id }, // Specify the condition to find the correct record
    });

    if (deletedCount > 0) {
      return res.status(200).json({ message: "Call log deleted successfully" });
    } else {
      return res.status(404).json({ error: "Call log not found" });
    }
  } catch (error) {
    console.error("Error deleting call log:", error);
    return res.status(500).json({ error: "Failed to delete call log" });
  }
};

module.exports = {
  getAllCallLogs,
  createCallLog,
  updateCallLog,
  deleteCallLog,
};
