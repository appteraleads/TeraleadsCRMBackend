const { DataTypes } = require('sequelize');
const sequelize = require('../Config/database'); // Adjust this to your actual database config

const AppointmentSetting = sequelize.define('AppointmentSetting', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    clinic_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    appointment_time_zone: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    appointment_days_week: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    appointment_date_format: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    appointment_duration: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    appointment_reminders_sms: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    appointment_reminders_email: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    appointment_reminders_3days: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    appointment_reminders_24hours: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    appointment_reminders_1hours: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    appointment_confirmation_request: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    cancellation_notification: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    created_on: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    created_by: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    updated_on: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_by: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    timestamps: false, // Disable Sequelize's automatic creation of createdAt and updatedAt
    tableName: 'appointment_setting' // Ensure the table name matches the one in the database
});

module.exports = AppointmentSetting;
