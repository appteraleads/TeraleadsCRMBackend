const { Model, DataTypes } = require("sequelize");
const sequelize = require("../Config/database");
class OtpVerification extends Model {}

OtpVerification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
    },
    expiry: {
      type: DataTypes.DATE,
    },
    otp: {
      type: DataTypes.STRING(10),
    },
    user_id: {
      type: DataTypes.STRING(50),
    },
    created_on: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "OtpVerification",
    tableName: "otp_verifications",
    timestamps: false,
  }
);

module.exports = OtpVerification;
