const { DataTypes } = require('sequelize');
const sequelize = require('../Config/database'); // Adjust the path to your Sequelize database configuration

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    clinic_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Optional field
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false, // Required field
    },
    lead_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Optional field
    },
    website_name:{
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true, // Optional field for additional info
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'unread',
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'notifications', // Table name to match your database
    timestamps: false, // We have custom `created_at` and `updated_at`
});

module.exports = Notification;
