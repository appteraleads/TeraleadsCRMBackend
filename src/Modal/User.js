const { Model, DataTypes } = require("sequelize");
const sequelize = require("../Config/database"); // Adjust the path to your database configuration file

class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    activated_yn: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    activation_link: {
      type: DataTypes.TEXT,
    },
    activation_link_expire: {
      type: DataTypes.DATE,
    },
    arch_digital_workflow_yn: {
      type: DataTypes.BOOLEAN,
    },
    clinic_name: {
      type: DataTypes.STRING(255),
    },
    clinic_id: {
      type: DataTypes.INTEGER,
    },
    iv_encrypted_password: {
      type: DataTypes.STRING(255),
    },
    clinic_size: {
      type: DataTypes.STRING(50),
    },
    clinic_website: {
      type: DataTypes.TEXT,
    },
    dentist_full_name: {
      type: DataTypes.STRING(255),
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
    },
    in_house_arch_lab_yn: {
      type: DataTypes.BOOLEAN,
    },
    login_type: {
      type: DataTypes.CHAR(1),
      defaultValue: "N",
    },
    patients_average_per_week: {
      type: DataTypes.STRING(255),
    },
    phone: {
      type: DataTypes.STRING(15),
    },
    profile_picture: {
      type: DataTypes.TEXT,
    },
    password: {
      type: DataTypes.STRING(255),
    },
    services_frequently: {
      type: DataTypes.TEXT,
    },
    role_id: {
      type: DataTypes.INTEGER,
    },
    avatar_color: {
      type: DataTypes.STRING(255),
    },
    role_name: {
      type: DataTypes.STRING(255),
    },
    created_on: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    created_by: {
      type: DataTypes.STRING(255),
    },
    updated_on: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_by: {
      type: DataTypes.STRING(255),
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: false, // Disable automatic timestamps since we have custom ones
  }
);

module.exports = User;
