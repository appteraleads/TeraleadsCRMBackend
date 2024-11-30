const { Model, DataTypes } = require("sequelize");
const sequelize = require("../Config/database");

class Role extends Model {}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    role_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    permission_group: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_on: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Role",
    tableName: "roles",
    timestamps: false,
  }
);

module.exports = Role;
