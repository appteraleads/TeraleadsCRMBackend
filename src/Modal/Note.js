const { Model, DataTypes } = require("sequelize");
const sequelize = require("../Config/database");
const User = require("./User");
const Lead = require("./Lead");
class Note extends Model {}

Note.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    created_by: {
      type: DataTypes.STRING(255),
    },
    created_on: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_by: {
      type: DataTypes.STRING(255),
    },
    updated_on: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    lead_id: {
      type: DataTypes.INTEGER,
    },
    content: {
      type: DataTypes.TEXT,
    },
    user_id: {
      type: DataTypes.INTEGER,
    },
  },
  {
    sequelize,
    modelName: "Note",
    tableName: "notes",
    timestamps: false,
  }
);
Note.belongsTo(User, { foreignKey: "user_id" });
Note.belongsTo(Lead, { foreignKey: "lead_id" });

module.exports = Note;
