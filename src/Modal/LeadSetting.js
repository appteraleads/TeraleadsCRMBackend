const { DataTypes } = require("sequelize");
const sequelize = require("../Config/database");
const LeadSetting = sequelize.define(
  "LeadSetting",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    clinic_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    duplicate_lead_handling: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lead_assignment_rules: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_on: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    updated_on: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "lead_settings",
    timestamps: false,
  }
);

module.exports = LeadSetting;
