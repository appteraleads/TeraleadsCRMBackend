const { Op } = require("sequelize");
const Conversations = require("../Modal/Conversation");
const Notes = require("../Modal/Note");
const { Lead, User } = require("../Modal/index");

const { sendMessageFromTelnyxNumber } = require("./TelnyxController");
const dayjs = require("dayjs");
const { sendEmailFun } = require("./CommonController");

const sendMessage = async (req, res) => {
  const data = req.body;
  try {
    const timestamp = new Date().toISOString();
    const { text, from, to, send_type, schedule_date_time, lead_id } = data;

    // Prepare the conversation record
    const conversationData = {
      message: text,
      status: "",
      direction: "Outbound",
      from,
      to,
      lead_id,
      unseen: true,
      record_type: "SMS",
      send_type,
      received_at: timestamp,
      created_on: timestamp,
    };

    if (send_type === "Schedule") {
      conversationData.schedule_date_time = schedule_date_time;
    } else {
      await sendMessageFromTelnyxNumber(from, to, text);
    }
    await Lead.update({ updated_at: new Date() }, { where: { id: lead_id } });
    // Insert conversation into the database
    const conversation = await Conversations.create(conversationData);
    res.status(200).json({ message: "Message Sent", conversation });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ error: "An error occurred while sending the message." });
  }
};

const sendEmail = async (req, res) => {
  const data = req.body;
  try {
    const timestamp = new Date().toISOString();
    const { to, from, subject, text, send_type, lead_id, schedule_date_time } =
      data;

    const emailData = {
      message: text,
      status: "",
      direction: "Outbound",
      from,
      to,
      subject,
      lead_id,
      unseen: true,
      record_type: "Email",
      send_type,
      received_at: timestamp,
      created_on: timestamp,
    };

    if (send_type === "Schedule") {
      emailData.schedule_date_time = schedule_date_time;
    } else {
      await sendEmailFun(to, from, subject, text);
    }
    // Insert email into the database
    await Conversations.create(emailData);
    res.status(200).json({ message: "Mail Sent" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while sending the email." });
  }
};

const sendMessageScheduler = async () => {
  try {
    const currentMinuteStart = dayjs().startOf("minute").toDate();
    const currentMinuteEnd = dayjs().endOf("minute").toDate();

    console.log(`Current Minute Start: ${currentMinuteStart}`);
    console.log(`Current Minute End: ${currentMinuteEnd}`);

    // Fetch conversations scheduled for the current minute
    const scheduledConversations = await Conversations.findAll({
      where: {
        send_type: "Schedule",
        schedule_date_time: {
          [Op.between]: [currentMinuteStart, currentMinuteEnd],
        },
      },
    });

    if (scheduledConversations.length === 0) {
      console.log("No scheduled messages found.");
      return { message: "No scheduled messages to send." };
    }

    const results = await Promise.all(
      scheduledConversations.map(async (conversation) => {
        try {
          const { from, to, message, subject, record_type } = conversation;

          if (record_type === "Email") {
            await sendEmailFun(to, from, subject, message);
          } else {
            await sendMessageFromTelnyxNumber(from, to, message);
          }

          // Update the conversation status to "Sent"
          await conversation.update({ sendType: "Sent" });
          return { status: "success", to };
        } catch (error) {
          console.error(`Failed to send message to ${to}:`, error);
          return { status: "failed", to, error };
        }
      })
    );

    return { results };
  } catch (error) {
    console.error("Error in sendMessageScheduler:", error);
    return { error: "An error occurred while scheduling messages." };
  }
};

const getAllLeadsForConversation = async (req, res) => {
  try {
    const { page = 1, limit = 20, searchText = "" } = req.body;
    const leads = await Lead.findAll({
      include: [
        {
          model: Notes,
          include: [
            {
              model: User,
            },
          ],
        },
      ],
    });
    return res.status(200).json({
      page,
      pageSize: limit,
      leadsListData: leads,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: error.message });
  }
};

const getConversationByLeadId = async (req, res) => {
  try {
    const { lead_id } = req.body;

    if (!lead_id) {
      return res.status(400).send({ error: "LeadId is required." });
    }

    const conversations = await Conversations.findAll({
      where: { lead_id: lead_id },
      order: [["created_on", "ASC"]],
    });

    if (conversations.length === 0) {
      return res
        .status(204)
        .send({ message: "No conversations found for the provided LeadId." });
    }

    return res.status(200).send({ conversations });
  } catch (err) {
    console.error("Error retrieving conversations:", err);
    return res
      .status(500)
      .send({ error: "An error occurred while retrieving conversations." });
  }
};

module.exports = {
  sendMessage,
  sendEmail,
  getConversationByLeadId,
  getAllLeadsForConversation,
  sendMessageScheduler,
};
