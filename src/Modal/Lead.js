const { Model, DataTypes } = require("sequelize");
const sequelize = require("../Config/database");

class Lead extends Model {}

Lead.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    clinic_id: {
      type: DataTypes.INTEGER,
    },
    assign_to: {
      type: DataTypes.STRING(100),
    },
    created_by: {
      type: DataTypes.STRING(100),
    },
    created_on: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_by: {
      type: DataTypes.STRING(100),
    },
    updated_on: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    email: {
      type: DataTypes.STRING(255),
    },
    email_verify: {
      type: DataTypes.STRING(20),
      defaultValue: "unverified",
    },
    finance_score: {
      type: DataTypes.STRING(20),
    },
    first_name: {
      type: DataTypes.STRING(100),
    },
    form_status: {
      type: DataTypes.STRING(50),
    },
    gcld_google: {
      type: DataTypes.STRING(50),
    },
    ip_address: {
      type: DataTypes.STRING(45),
    },
    last_name: {
      type: DataTypes.STRING(100),
    },
    lead_status: {
      type: DataTypes.STRING(50),
    },
    lead_type: {
      type: DataTypes.STRING(50),
    },
    note_for_doctor: {
      type: DataTypes.TEXT,
    },
    phone_number: {
      type: DataTypes.STRING(20),
    },
    phone_verify: {
      type: DataTypes.STRING(20),
      defaultValue: "unverified",
    },
    treatment: {
      type: DataTypes.STRING(100),
    },
    utm_campaign: {
      type: DataTypes.STRING(100),
    },
    utm_medium: {
      type: DataTypes.STRING(100),
    },
    utm_source: {
      type: DataTypes.STRING(100),
    },
    unique_id: {
      type: DataTypes.STRING(50),
      unique: true,
    },
    user_name: {
      type: DataTypes.STRING(100),
    },
    website_name: {
      type: DataTypes.STRING(255),
    },
    home_owner: {
      type: DataTypes.STRING(45),
    },
    co_signer: {
      type: DataTypes.STRING(45),
    },
    annual_salary: {
      type: DataTypes.STRING,
    },
    appointment_status: {
      type: DataTypes.STRING,
    },
    how_to_contact: {
      type: DataTypes.STRING,
    },
    treatment_value: {
      type: DataTypes.INTEGER,
    },
    appointment_date_time: {
      type: DataTypes.STRING,
    },
    appointment_date_time_end: {
      type: DataTypes.STRING,
    },
    appointment_duration: {
      type: DataTypes.STRING,
    },
    appointment_time: {
      type: DataTypes.STRING,
    },
    appointment_notes: {
      type: DataTypes.STRING,
    },
    contacted_attempts: {
      type: DataTypes.STRING,
    },
    close_amount: {
      type: DataTypes.INTEGER,
    },
    recording_url: {
      type: DataTypes.STRING,
    },
    phone_number_to: {
      type: DataTypes.STRING,
    },
    call_session_id: {
      type: DataTypes.STRING,
      unique: true,
    },
    hangup_cause: {
      type: DataTypes.STRING,
    },
    call_start_time: {
      type: DataTypes.STRING,
    },
    conversations_lead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    avatar_color: {
      type: DataTypes.STRING,
    },
  },

  {
    sequelize,
    modelName: "Lead",
    tableName: "leads",
    timestamps: false,
  }
);

module.exports = Lead;
