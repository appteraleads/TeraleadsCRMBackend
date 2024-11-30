const { Model, DataTypes } = require('sequelize');
const sequelize = require('../Config/database'); // Adjust path based on your project structure
const User = require('./User'); // Assuming you have a User model
const Clinic = require('./Clinic'); // Assuming you have a Clinic model

class NotificationSetting extends Model {}

NotificationSetting.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User, // Reference to the User model
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    clinic_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Clinic, // Reference to the Clinic model
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    receive_notifications_sms: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    receive_notifications_email: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    receive_inapp_notification: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notifications_dnd: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notify_appointment_booked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notify_lead_reschedule: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notify_confirmed_appointment: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notify_appointment_rescheduled_canceled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notify_appointment_near: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notify_newlead_added: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notify_lead_assignments: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notify_mentioned_lead_notes: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notify_conversation_receive_newmessage: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notify_campaign_sent_scheduled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notify_getinsights_campaign_performance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'NotificationSetting',
    tableName: 'notification_settings',
    timestamps: false, // Disable Sequelize auto timestamps
  }
);

// Define relationships
NotificationSetting.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
NotificationSetting.belongsTo(Clinic, { foreignKey: 'clinic_id', as: 'clinic' });

module.exports = NotificationSetting;
