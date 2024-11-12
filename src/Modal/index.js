const Note = require("./Note");
const User = require("./User");
const Lead = require("./Lead");
const Conversation = require("./Conversation");

Lead.hasMany(Note, { foreignKey: "lead_id" });
Lead.hasMany(Conversation, { foreignKey: "lead_id" });
User.hasMany(Note, { foreignKey: "user_id" });

Note.belongsTo(User, { foreignKey: "user_id" });
Note.belongsTo(Lead, { foreignKey: "lead_id" });
Conversation.belongsTo(Lead, { foreignKey: "lead_id" });

module.exports = { Note, User, Lead ,Conversation};
