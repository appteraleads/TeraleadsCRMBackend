const { Op } = require("sequelize");
const Notes = require("../Modal/Note");
const { Lead, User, Conversation } = require("../Modal/index");
const sequelize = require("../Config/database");
const { sendMessageFromTelnyxNumber } = require("./TelnyxController");
const dayjs = require("dayjs");
const { sendEmailFun } = require("./CommonController");

const sendMessage = async (req, res) => {
  const data = req.body;
  try {
    const timestamp = new Date().toISOString();
    const { text, from, to, send_type, schedule_date_time, lead_id, type } =
      data;
    if (type === "Direct") {
      let lead = await Lead.findOne({ where: { phone_number: to } });
      const conversationData = {
        message: text,
        status: "",
        direction: "Outbound",
        from,
        to,
        lead_id: lead?.id,
        unseen: true,
        record_type: "SMS",
        send_type,
        received_at: timestamp,
        created_on: timestamp,
      };
      if (send_type === "Schedule") {
        conversationData.schedule_date_time = schedule_date_time;
      } else {
        await sendMessageFromTelnyxNumber("+13083050002", to, text);
      }
      await Lead.update(
        {
          created_on: new Date(),
          updated_on: new Date(),
          conversations_lead: true,
        },
        { where: { id: lead?.id } }
      );
      const conversation = await Conversation.create(conversationData);

      res.status(200).json({ message: "Message Sent", conversation });
    } else {
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
        await sendMessageFromTelnyxNumber("+13083050002", to, text);
      }
      await Lead.update(
        {
          created_on: new Date(),
          updated_on: new Date(),
          conversations_lead: true,
        },
        { where: { id: lead_id } }
      );
      // Insert conversation into the database
      const conversation = await Conversation.create(conversationData);

      res.status(200).json({ message: "Message Sent", conversation });
    }
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
    const {
      to,
      from,
      subject,
      text,
      send_type,
      lead_id,
      schedule_date_time,
      type,
    } = data;

    if (type === "Direct") {
      // Find lead by email
      
      let lead;
      try {
        lead = await Lead.findOne({ where: { email: to } });
        if (!lead) {
          return res
            .status(404)
            .json({ error: `Lead not found for email: ${to}` });
        }
      } catch (leadError) {
        console.error("Error finding lead:", leadError);
        return res.status(500).json({ error: "Error finding lead" });
      }

      // Prepare email data
      const emailData = {
        message: text,
        status: "",
        direction: "Outbound",
        from,
        to,
        subject,
        lead_id: lead?.id,
        unseen: true,
        record_type: "Email",
        send_type,
        received_at: timestamp,
        created_on: timestamp,
      };

      if (send_type === "Schedule") {
        emailData.schedule_date_time = schedule_date_time;
      } else {
        try {
          // Call the sendEmail function (email sending logic)
          await sendEmailFun(to, from, subject, text);
        } catch (emailSendError) {
          
          return res.status(500).json({ error: "Error sending email" });
        }
      }

      // Save the email to the Conversation table
      try {
        await Conversation.create(emailData);
      } catch (conversationError) {
        console.error("Error creating conversation:", conversationError);
        return res.status(500).json({ error: "Error creating conversation" });
      }

      // Update the lead
      try {
        await Lead.update(
          {
            created_on: new Date(),
            updated_on: new Date(),
            conversations_lead: true,
          },
          { where: { id: lead?.id } }
        );
      } catch (leadUpdateError) {
        console.error("Error updating lead:", leadUpdateError);
        return res.status(500).json({ error: "Error updating lead" });
      }

      return res.status(200).json({ message: "Mail Sent" });
    } else {
      // Handle other types of emails (non-Direct)
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
        try {
          await sendEmailFun(to, from, subject, text);
        } catch (emailSendError) {
          console.error("Error sending email:", emailSendError);
          return res.status(500).json({ error: "Error sending email" });
        }
      }

      // Save the email to the Conversation table
      try {
        await Conversation.create(emailData);
      } catch (conversationError) {
        console.error("Error creating conversation:", conversationError);
        return res.status(500).json({ error: "Error creating conversation" });
      }

      // Update the lead if available
      if (lead_id) {
        try {
          await Lead.update(
            {
              created_on: new Date(),
              updated_on: new Date(),
              conversations_lead: true,
            },
            { where: { id: lead_id } }
          );
        } catch (leadUpdateError) {
          console.error("Error updating lead:", leadUpdateError);
          return res.status(500).json({ error: "Error updating lead" });
        }
      }

      return res.status(200).json({ message: "Mail Sent" });
    }
  } catch (error) {
    console.error("Error in sendEmail function:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while processing the request." });
  }
};

const sendMessageScheduler = async () => {
  try {
    const currentMinuteStart = dayjs().startOf("minute").toDate();
    const currentMinuteEnd = dayjs().endOf("minute").toDate();

    const scheduledConversations = await Conversation.findAll({
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

const getAllLeadsForConversationWebSocket = async () => {
  try {
    const leads = await Lead.findAll({
      where: { conversations_lead: true },
      attributes: {
        include: [
          [
            sequelize.literal(`
              (SELECT COUNT(*) FROM "conversations" AS c
               WHERE c."lead_id" = "Lead"."id" 
               AND c."unseen" = false)
            `),
            "unseenCount",
          ],
        ],
      },
      include: [
        {
          model: Notes,
          include: [{ model: User }],
        },
        {
          model: Conversation,
          required: false,
          where: { record_type: { [Op.in]: ["Email", "SMS"] } },
          order: [["created_on", "ASC"]], // Sort conversations in ascending order
        },
      ],
      order: [["created_on", "DESC"]], // Limit results to avoid fetching excessive data
      limit: 50,
    });

    const leadsWithConversationTypes = leads.map((lead) => {
      // Separate arrays for email and SMS conversations
      const emails = [];
      const sms = [];
      let latestMessages = []; // This will hold the latest message(s) from each type

      // Sort conversations into Email and SMS arrays
      lead.Conversations.forEach((conversation) => {
        if (conversation.record_type === "Email") {
          emails.push(conversation);
        } else if (conversation.record_type === "SMS") {
          sms.push(conversation);
        }
      });

      // Sort each array in ascending order of 'created_on' field (earliest first)
      emails.sort((a, b) => new Date(a.created_on) - new Date(b.created_on));
      sms.sort((a, b) => new Date(a.created_on) - new Date(b.created_on));

      // Get the latest message for each type (email and SMS)
      if (emails.length > 0) {
        latestMessages.push(emails[emails.length - 1]); // Most recent email
      }
      if (sms.length > 0) {
        latestMessages.push(sms[sms.length - 1]); // Most recent SMS
      }

      // Remove Conversations and include sorted emails, sms, and latest messages
      const { Conversations, unseenCount, ...leadWithoutConversations } =
        lead.toJSON();
      leadWithoutConversations.Conversations = { emails, sms };
      leadWithoutConversations.unseenCount = unseenCount;
      leadWithoutConversations.latestMessages = latestMessages; // Add the array of latest messages
      return leadWithoutConversations;
    });

    return leadsWithConversationTypes;
  } catch (error) {
    console.error("Error fetching leads:", error);
  }
};
const getAllLeadsListForConversation = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", searchType = "text" } = req.body;
    let whereClause = {};

    if (search && searchType === "text") {
      whereClause = {
        [Op.or]: [
          { user_name: { [Op.iLike]: `%${search}%` } },
          { treatment: { [Op.iLike]: `%${search}%` } },
          { phone_number: { [Op.iLike]: `%${search}%` } },
          { lead_type: { [Op.iLike]: `%${search}%` } },
          { lead_status: { [Op.iLike]: `%${search}%` } },
          { last_name: { [Op.iLike]: `%${search}%` } },
          { first_name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ],
      };
    }
    const leads = await Lead.findAll({
      where: {
        ...whereClause, // Keep any additional conditions you already have
      },
      attributes: {
        include: [
          [
            sequelize.literal(`
              (SELECT COUNT(*) FROM "conversations" AS c
               WHERE c."lead_id" = "Lead"."id" 
               AND c."unseen" = false)
            `),
            "unseenCount",
          ],
        ],
      },
      include: [
        {
          model: Notes,
          include: [{ model: User }],
        },
        {
          model: Conversation,
          required: false,
          where: { record_type: { [Op.in]: ["Email", "SMS"] } },
          order: [["created_on", "ASC"]], // Sort conversations in ascending order
        },
      ],
      order: [["created_on", "DESC"]], // Limit results to avoid fetching excessive data
      limit: 50,
    });

    const leadsWithConversationTypes = leads.map((lead) => {
      // Separate arrays for email and SMS conversations
      const emails = [];
      const sms = [];
      let latestMessages = []; // This will hold the latest message(s) from each type

      // Sort conversations into Email and SMS arrays
      lead.Conversations.forEach((conversation) => {
        if (conversation.record_type === "Email") {
          emails.push(conversation);
        } else if (conversation.record_type === "SMS") {
          sms.push(conversation);
        }
      });

      // Sort each array in ascending order of 'created_on' field (earliest first)
      emails.sort((a, b) => new Date(a.created_on) - new Date(b.created_on));
      sms.sort((a, b) => new Date(a.created_on) - new Date(b.created_on));

      // Get the latest message for each type (email and SMS)
      if (emails.length > 0) {
        latestMessages.push(emails[emails.length - 1]); // Most recent email
      }
      if (sms.length > 0) {
        latestMessages.push(sms[sms.length - 1]); // Most recent SMS
      }

      // Remove Conversations and include sorted emails, sms, and latest messages
      const { Conversations, unseenCount, ...leadWithoutConversations } =
        lead.toJSON();
      leadWithoutConversations.Conversations = { emails, sms };
      leadWithoutConversations.unseenCount = unseenCount;
      leadWithoutConversations.latestMessages = latestMessages; // Add the array of latest messages
      return leadWithoutConversations;
    });
    return res.status(200).json({
      page,
      pageSize: limit,
      leadsListData: leadsWithConversationTypes,
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

    // Fetch conversations from the database
    const conversations = await Conversation.findAll({
      where: { lead_id: lead_id },
      order: [["created_on", "ASC"]],
    });

    if (conversations.length === 0) {
      return res
        .status(204)
        .send({ message: "No conversations found for the provided LeadId." });
    }

    // Separate conversations into SMS and Mail arrays
    const smsConversations = conversations.filter(
      (conversation) => conversation.record_type === "SMS"
    );
    const mailConversations = conversations.filter(
      (conversation) => conversation.record_type === "Email"
    );

    // Return the response with separate arrays
    return res.status(200).send({
      smsConversations,
      mailConversations,
    });
  } catch (err) {
    console.error("Error retrieving conversations:", err);
    return res
      .status(500)
      .send({ error: "An error occurred while retrieving conversations." });
  }
};

const handleConversationUnseen = async (req, res) => {
  const { lead_id } = req.params;
  if (!lead_id) {
    return res.status(400).json({ error: "lead_id is required" });
  }

  try {
    // Fetch conversations where `unseen` is true for the given lead_id
    const updatedConversations = await Conversation.update(
      { unseen: true }, // Update unseen field to false
      {
        where: {
          lead_id,
        },
      }
    );

    // Check if any conversations were updated
    if (updatedConversations[0] === 0) {
      return res
        .status(404)
        .json({ message: "No unseen conversations found for this lead." });
    }

    // Return success response
    return res.status(200).json({
      message: "Conversations marked as seen successfully",
      updatedCount: updatedConversations[0], // Number of rows updated
    });
  } catch (error) {
    console.error("Error marking conversations as seen:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while updating conversations." });
  }
};

const handleConversationLead = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "lead_id is required" });
  }

  try {
    // Fetch conversations where `unseen` is true for the given lead_id
    const updatedConversations = await Lead.update(
      {
        created_on: new Date(),
        updated_on: new Date(),
        conversations_lead: true,
      },
      { where: { id } }
    );

    // Check if any conversations were updated
    if (updatedConversations[0] === 0) {
      return res
        .status(404)
        .json({ message: "No unseen conversations found for this lead." });
    }

    // Return success response
    return res.status(200).json({
      message: "Conversations marked as seen successfully",
      updatedCount: updatedConversations[0], // Number of rows updated
    });
  } catch (error) {
    console.error("Error marking conversations as seen:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while updating conversations." });
  }
};
module.exports = {
  sendMessage,
  sendEmail,
  getConversationByLeadId,
  getAllLeadsListForConversation,
  getAllLeadsForConversationWebSocket,
  sendMessageScheduler,
  handleConversationUnseen,
  handleConversationLead,
};
