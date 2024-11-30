const { Model, DataTypes } = require('sequelize');
const sequelize = require('../Config/database'); // Ensure this is the correct path to your database configuration

class BlockLeads extends Model {}

BlockLeads.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lead_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    clinic_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    block_type: {
      type: DataTypes.STRING(255),
    },
    block_ip_address: {
      type: DataTypes.STRING(255),
    },
    block_phone_number: {
      type: DataTypes.STRING(250),
    },
    block_reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    created_by: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_by: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'BlockLeads',
    tableName: 'block_leads',
    timestamps: false, 
  }
);

module.exports = BlockLeads;
