const { Model, DataTypes } = require("sequelize");
const sequelize = require("../Config/database");
class Conversation extends Model {}

Conversation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    message: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.TEXT,
    },
    direction: {
      type: DataTypes.TEXT,
    },
    from: {
      type: DataTypes.STRING(20),
    },
    to: {
      type: DataTypes.STRING(20),
    },
    lead_id: {
      type: DataTypes.INTEGER,
    },
    unseen: {
      type: DataTypes.BOOLEAN,
    },
    record_type: {
      type: DataTypes.TEXT, 
    },
    send_type: {
      type: DataTypes.TEXT,
    },
    schedule_date_time: {
      type: DataTypes.DATE,
    },
    received_at: {
      type: DataTypes.DATE,
    },

    created_on: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    created_by: {
      type: DataTypes.STRING(255),
    },
    updated_by: {
      type: DataTypes.STRING(255),
    },
    updated_on: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    subject: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    modelName: "Conversation",
    tableName: "conversations",
    timestamps: false,
  }
);

module.exports = Conversation;
