const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Adjust the path to your database configuration

const ClinicCloseDate = sequelize.define('ClinicCloseDate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  clinic_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  appointment_close_dates: {
    type: DataTypes.STRING,
    allowNull: true, // Optional
  },
  appointment_from_time: {
    type: DataTypes.STRING,
    allowNull: true, // Optional
  },
  appointment_end_time: {
    type: DataTypes.STRING,
    allowNull: true, // Optional
  },
  created_on: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
  created_by: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    onUpdate: DataTypes.NOW,
    allowNull: true, // Nullable
  },
  updated_by: {
    type: DataTypes.STRING,
    allowNull: true, // Nullable
  },
}, {
  tableName: 'clinicclosedates', // Matches your SQL table name
  timestamps: false, // Disable Sequelize's default timestamps
});

module.exports = ClinicCloseDate;
