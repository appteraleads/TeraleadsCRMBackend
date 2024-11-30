// models/TelnyxCallLogs.js

const { DataTypes } = require("sequelize");
const sequelize = require("../Config/database"); // Adjust the path as needed

const TelnyxCallLogs = sequelize.define(
  "TelnyxCallLogs",
  {
    lead_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    clinic_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    caller_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    recipient_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    call_start: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    call_end: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    duration: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    call_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    direction: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    recording_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    session_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    uuid: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    updated_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "telnyx_call_logs",
    timestamps: true, // Automatically handle created_at and updated_at
    underscored: true,
  }
);

module.exports = TelnyxCallLogs;
