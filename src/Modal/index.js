const Note = require("./Note");
const User = require("./User");
const Lead = require("./Lead");
const Conversation = require("./Conversation");
const Clinic = require("./Clinic");
const Role = require("./Role");
const TelnyxCallLogs = require("./TelnyxCallLogs");
const LeadSetting = require("./LeadSetting");

Lead.hasMany(Note, { foreignKey: "lead_id" });
Lead.hasMany(Conversation, { foreignKey: "lead_id" });
User.hasMany(Note, { foreignKey: "user_id" });

Note.belongsTo(User, { foreignKey: "user_id" });
Note.belongsTo(Lead, { foreignKey: "lead_id" });
Conversation.belongsTo(Lead, { foreignKey: "lead_id" });

User.belongsTo(Clinic, { foreignKey: "clinic_id" });
Clinic.hasMany(User, { foreignKey: "clinic_id" });

User.belongsTo(Role, { foreignKey: "role_id" });
Role.hasMany(User, { foreignKey: "role_id" });

LeadSetting.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(LeadSetting, { foreignKey: "user_id" });

TelnyxCallLogs.belongsTo(Lead, { foreignKey: "lead_id" });

// In the Lead model
Lead.hasMany(TelnyxCallLogs, { foreignKey: "lead_id" });

module.exports = { Note, User, Lead, Conversation, Role, Clinic };
