const { Model, DataTypes } = require("sequelize");
const sequelize = require("../Config/database");

class Clinic extends Model {}

Clinic.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    clinic_logo: {
      type: DataTypes.TEXT,
    },
    clinic_favicon: {
      type: DataTypes.TEXT,
    },
    clinic_name: {
      type: DataTypes.STRING(256),
      allowNull: false,
    },
    clinic_phone_number: {
      type: DataTypes.STRING(256),
    },
    clinic_website: {
      type: DataTypes.STRING(256),
    },
    clinic_address_state: {
      type: DataTypes.STRING(256),
    },
    clinic_address_zip_code: {
      type: DataTypes.STRING(256),
    },
    clinic_address_street: {
      type: DataTypes.STRING(256),
    },
    clinic_address_city: {
      type: DataTypes.STRING(256),
    },
    clinic_address_country: {
      type: DataTypes.STRING(256),
    },
    monday_from: {
      type: DataTypes.STRING(256),
    },
    monday_to: {
      type: DataTypes.STRING(256),
    },
    monday_closed: {
      type: DataTypes.STRING(256),
    },
    tuesday_from: {
      type: DataTypes.STRING(256),
    },
    tuesday_to: {
      type: DataTypes.STRING(256),
    },
    tuesday_closed: {
      type: DataTypes.STRING(256),
    },
    wednesday_from: {
      type: DataTypes.STRING(256),
    },
    wednesday_to: {
      type: DataTypes.STRING(256),
    },
    wednesday_closed: {
      type: DataTypes.STRING(256),
    },
    thursday_from: {
      type: DataTypes.STRING(256),
    },
    thursday_to: {
      type: DataTypes.STRING(256),
    },
    thursday_closed: {
      type: DataTypes.STRING(256),
    },
    friday_from: {
      type: DataTypes.STRING(256),
    },
    friday_to: {
      type: DataTypes.STRING(256),
    },
    friday_closed: {
      type: DataTypes.STRING(256),
    },
    saturday_from: {
      type: DataTypes.STRING(256),
    },
    saturday_to: {
      type: DataTypes.STRING(256),
    },
    saturday_closed: {
      type: DataTypes.STRING(256),
    },
    sunday_from: {
      type: DataTypes.STRING(256),
    },
    sunday_to: {
      type: DataTypes.STRING(256),
    },
    sunday_closed: {
      type: DataTypes.STRING(256),
    },
    whatsapp_number: {
      type: DataTypes.STRING(256),
    },
    instagram_url: {
      type: DataTypes.STRING(256),
    },
    facebook_url: {
      type: DataTypes.STRING(256),
    },
    x_url: {
      type: DataTypes.STRING(256),
    },
    tiktok_url: {
      type: DataTypes.STRING(256),
    },
    created_on: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    created_by: {
      type: DataTypes.STRING(100),
    },
    updated_on: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_by: {
      type: DataTypes.STRING(100),
    },
  },
  {
    sequelize,
    modelName: "Clinic",
    tableName: "clinic",
    timestamps: false, // Set to true if you want createdAt and updatedAt fields
  }
);

module.exports = Clinic;
