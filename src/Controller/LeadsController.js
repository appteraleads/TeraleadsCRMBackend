require("dotenv").config();
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const axios = require("axios");
const XLSX = require("xlsx");
const { Parser } = require("json2csv");
const { Op } = require("sequelize");
const TreatmentOption = require("../Modal/TreatmentOption");
const Conversations = require("../Modal/Conversation");
const Lead = require("../Modal/Lead");
const BlockLeads = require("../Modal/BlockLeads");
const Notification = require("../Modal/Notification");
const Clinic = require("../Modal/Clinic");
const User = require("../Modal/User");
const NotificationSetting = require("../Modal/NotificationSetting");
const jwt = require("jsonwebtoken");
const { sendMessageFromTelnyxNumber } = require("./TelnyxController");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const { darkColors } = require("../Common/Color");

const {
  NotificationsNewLead,
  NotificationsAppointmentIsBooked,
  NotificationsAppointmentConfirmed,
  NotificationsLeadRescheduleRequest,
  NotificationsAppointmentStatus,
} = require("../Common/NotificationTypeFormatehtml");
dayjs.extend(utc);

const sendEmail = async (MailTemplate, data, mailtype, clientwebsite) => {
  const templatePath = path.join(__dirname, "../MailTemplate", MailTemplate);
  let emailTemplate = fs.readFileSync(templatePath, "utf8");

  if (mailtype === "AppointmentConfirmation") {
    emailTemplate = emailTemplate.replace(
      "{{appointmentDate}}",
      data?.appointmentDate
    );
    emailTemplate = emailTemplate.replace(
      "{{appointmentTime}}",
      data?.appointmentTime
    );
    emailTemplate = emailTemplate.replace("{{treatment}}", data?.treatment);
    emailTemplate = emailTemplate.replace("{{firstName}}", data?.firstName);
    emailTemplate = emailTemplate.replace("{{lastName}}", data?.lastName);
    emailTemplate = emailTemplate.replace(
      "{{urlConfirmAppointment}}",
      data?.urlConfirmAppointment
    );
    emailTemplate = emailTemplate.replace(
      "{{urlRescheduleAppointment}}",
      data?.urlRescheduleAppointment
    );
    emailTemplate = emailTemplate.replace("{{clinicname}}", data?.clinicname);
    emailTemplate = emailTemplate.replace(
      "{{clientLogo}}",
      clientwebsite?.website?.logo
    );
  } else if (mailtype === "AppointmentConfirmed") {
    emailTemplate = emailTemplate.replace("{{firstName}}", data?.firstName);
    emailTemplate = emailTemplate.replace("{{lastName}}", data?.lastName);
    emailTemplate = emailTemplate.replace(
      "{{appointmentDate}}",
      data?.appointmentDate
    );
    emailTemplate = emailTemplate.replace(
      "{{appointmentTime}}",
      data?.appointmentTime
    );
    emailTemplate = emailTemplate.replace("{{treatment}}", data?.treatment);
    emailTemplate = emailTemplate.replace("{{clinicphone}}", data?.clinicphone);
    emailTemplate = emailTemplate.replace(
      "{{clinicaddress}}",
      data?.clinicaddress
    );
    emailTemplate = emailTemplate.replace("{{clinicname}}", data?.clinicname);
    emailTemplate = emailTemplate.replace(
      "{{clientLogo}}",
      clientwebsite?.website?.logo
    );
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: data?.email,
    subject: data?.subject,
    html: emailTemplate,
  };

  return transporter.sendMail(mailOptions);
};

const createLeads = async (req, res) => {
  const data = req.body;
  const token = req.headers.authorization?.split("Bearer ")[1];

  // Verify JWT token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  try {
    if (Object.keys(data).length > 0) {
      // Fetch treatment option price
      const treatmentOption = await TreatmentOption.findOne({
        where: {
          treatment_option: data?.treatment,
          url: data?.clinic_name,
        },
        attributes: ["price"],
      });
      const randomNumber = Math.floor(Math.random() * 60);

      // Create the lead
      await Lead.create({
        first_name: data?.first_name,
        last_name: data?.last_name,
        phone_number: data?.phone_number,
        email: data?.email,
        finance_score: data?.finance_score,
        treatment: data?.treatment,
        assign_to: data?.clinic_name,
        user_name: data?.clinic_name,
        lead_type: "Form_lead",
        lead_status: data?.lead_status,
        treatment_value: treatmentOption?.price,
        annual_salary: data?.annual_salary,
        co_signer: data?.co_signer,
        home_owner: data?.home_owner,
        avatar_color: darkColors[randomNumber],
        created_by: decoded?.email,
        updated_by: decoded?.email,
        // Do not set created_on and updated_on; they will use the default values
      });

      return res.status(200).json({ message: "Leads added successfully!" });
    } else {
      return res.status(204).json({ message: "Content not found!" });
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const updateLead = async (req, res) => {
  const data = req.body;
  let id = data?.id;
  const token = req.headers.authorization?.split("Bearer ")[1];

  // Verify JWT token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  try {
    const timestamp = new Date();
    const leadDetails = await Lead.findByPk(id);

    if (!leadDetails) {
      res.status(404).json({ message: "Lead not found" });
    } else {
      if (
        data?.lead_status === "Appointment" &&
        data?.appointment_status === "Cancelled"
      ) {
        const notificationSettingDetails = await NotificationSetting.findOne({
          where: {
            clinic_id: leadDetails?.clinic_id,
            user_id: decoded?.id,
          },
        });

        const message_html = NotificationsAppointmentStatus(
          leadDetails?.first_name + " " + leadDetails?.last_name,
          dayjs(data?.appointment_date_time, "MMM DD YYYY HH:mm A").format(
            "MMM DD YYYY"
          ) +
            " " +
            dayjs(data?.appointment_date_time, "MMM DD YYYY HH:mm A").format(
              "hh:mm A"
            ),
          data?.appointment_status
        );

        if (
          notificationSettingDetails?.receive_inapp_notification &&
          notificationSettingDetails?.notify_appointment_rescheduled_canceled
        ) {
          await Notification.create({
            clinic_id: leadDetails.clinic_id,
            user_id: parseInt(decoded.id),
            website_name: leadDetails.website_name,
            lead_id: leadDetails.id,
            type: "Appointments",
            message: message_html,
            metadata: leadDetails,
            status: "unread",
          });
        }
      } else if (
        data?.lead_status === "Appointment" ||
        data?.appointment_date_time
      ) {
        const token = jwt.sign(
          {
            id: decoded?.id,
            lead_id: leadDetails.id,
            email: leadDetails.email,
          },
          process.env.JWT_SECRET,
          {
            expiresIn: "24h",
          }
        );

        if (leadDetails?.email && leadDetails?.user_name) {
          const response = await axios.get(
            `https://${leadDetails?.user_name}.com/vtigerapi.php`
          );
         
          let tempdata = {
            appointmentDate: dayjs(
              data?.appointment_date_time,
              "MMM DD YYYY HH:mm A"
            ).format("MMM DD YYYY"),
            appointmentTime: dayjs(
              data?.appointment_date_time,
              "MMM DD YYYY HH:mm A"
            ).format("hh:mm A"),
            treatment: leadDetails?.treatment,
            firstName: leadDetails?.first_name,
            lastName: leadDetails?.last_name,
            urlConfirmAppointment: `${process.env.BASE_URL}/api/v1/auth/confirmAppointment/${token}`,
            urlRescheduleAppointment: `${process.env.BASE_URL}/api/v1/auth/rescheduleAppointment/${token}`,
            clinicname: leadDetails?.assign_to,
            subject: "Appointment Confirmation",
            email:leadDetails?.email
          };
        
          await sendEmail(
            "confirmation-email.html",
            tempdata,
            "AppointmentConfirmation",
            response?.data
          );
         
        }
      
        const messageText = `Hey ${leadDetails?.first_name || ""} ${
          leadDetails?.last_name || ""
        },
Appointment Scheduled for: October 21, 2024 at 1:30 AM
To confirm reply: 1
To reschedule reply: 2
Thanks,
Houston Implant Clinic
(346) 347-1690`;

        await sendMessageFromTelnyxNumber(
          "+13083050002",
          leadDetails?.phone_number,
          messageText
        );

        let conversationData = {
          message: messageText,
          status: "",
          direction: "Outbound",
          from: leadDetails?.phone_number,
          to: "+13083050002",
          lead_id: leadDetails.id,
          unseen: true,
          record_type: "message",
          received_at: timestamp,
          created_on: timestamp,
        };

        await Conversations.create(conversationData);
        data.appointment_status = "Not Confirmed";

        const notificationSettingDetails = await NotificationSetting.findOne({
          where: {
            clinic_id: leadDetails?.clinic_id,
            user_id: decoded?.id,
          },
        });

        const message_html = NotificationsAppointmentIsBooked(
          leadDetails?.first_name + " " + leadDetails?.last_name,
          dayjs(data?.appointment_date_time, "MMM DD YYYY HH:mm A").format(
            "MMM DD YYYY"
          ) +
            " " +
            dayjs(data?.appointment_date_time, "MMM DD YYYY HH:mm A").format(
              "hh:mm A"
            )
        );

        if (
          notificationSettingDetails?.receive_inapp_notification &&
          notificationSettingDetails?.notify_confirmed_appointment
        ) {
          await Notification.create({
            clinic_id: leadDetails.clinic_id,
            user_id: parseInt(decoded.id),
            website_name: leadDetails.website_name,
            lead_id: leadDetails.id,
            type: "Appointments",
            message: message_html,
            metadata: leadDetails,
            status: "unread",
          });
        }
      } else if (data?.LeadStatus === "AllLeads") {
        data.appointment_status = "Not Confirmed";
      }
      if (data.appointment_date_time) {
        data.appointment_date_time = dayjs(data?.appointment_date_time).format(
          "YYYY-MM-DD HH:mm:ss"
        );
        data.appointment_date_time_end = dayjs(data?.appointment_date_time)
          .add(
            parseInt(
              data?.appointment_duration
                ? data?.appointment_duration
                : leadDetails?.appointment_duration
                ? leadDetails?.appointment_duration
                : 30
            ),
            "minute"
          )
          .format("YYYY-MM-DD HH:mm:ss");
      }

      data.updated_by = decoded?.email;
      data.updated_on = timestamp;
      await Lead.update(data, { where: { id } });
      res.status(200).json({ message: "Lead updated successfully!" });
    }
  } catch (error) {
    res.status(400).json({ error: error });
  }
};

const duplicateLeads = async (req, res) => {
  const { body: data } = req;
  const token = req.headers.authorization?.split("Bearer ")[1];

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (Object.keys(data).length === 0) {
      return res.status(204).json({ message: "Content not found!" });
    }

    // Create a new lead with required fields
    await Lead.create({
      ...data,
      created_by: decoded.email,
      updated_by: decoded.email,
      created_on: new Date(),
      updated_on: new Date(),
    });

    return res
      .status(200)
      .json({ message: "Duplicate lead created successfully!" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const getAllLeads = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", searchType = "text" } = req.body;
    const offset = (page - 1) * limit;
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
    } else if (search && searchType === "datetime") {
      let startDate, endDate;

      switch (search) {
        case "today":
          startDate = dayjs().startOf("day").toDate();
          endDate = dayjs().endOf("day").toDate();
          break;
        case "Last7days":
          startDate = dayjs().subtract(7, "day").startOf("day").toDate();
          endDate = dayjs().endOf("day").toDate();
          break;
        case "Last14days":
          startDate = dayjs().subtract(14, "day").startOf("day").toDate();
          endDate = dayjs().endOf("day").toDate();
          break;
        case "Last30days":
          startDate = dayjs().subtract(30, "day").startOf("day").toDate();
          endDate = dayjs().endOf("day").toDate();
          break;
        case "Last3months":
          startDate = dayjs().subtract(3, "month").startOf("day").toDate();
          endDate = dayjs().endOf("day").toDate();
          break;
        case "Last6months":
          startDate = dayjs().subtract(6, "month").startOf("day").toDate();
          endDate = dayjs().endOf("day").toDate();
          break;
        case "Thismonth":
          startDate = dayjs().startOf("month").toDate();
          endDate = dayjs().endOf("month").toDate();
          break;
        case "Thisyear":
          startDate = dayjs().startOf("year").toDate();
          endDate = dayjs().endOf("year").toDate();
          break;
        default:
          break;
      }

      if (startDate && endDate) {
        whereClause = {
          created_on: {
            [Op.between]: [startDate, endDate],
          },
        };
      }
    }

    const { rows: leads, count: totalRecords } = await Lead.findAndCountAll({
      where: whereClause,
      limit,
      order: [["created_on", "DESC"]],
      offset,
    });

    // Count total leads with specific statuses
    const appointmentCountResult = await Lead.count({
      where: { lead_status: "Appointment", ...whereClause },
    });

    const closedLeadCountResult = await Lead.count({
      where: { lead_status: "Closed", ...whereClause },
    });

    const noShowLeadCountResult = await Lead.count({
      where: { lead_status: "NoShow", ...whereClause },
    });

    const totalRevenue = await Lead.sum("close_amount", {
      where: { lead_status: "Closed", ...whereClause },
    });

    res.status(200).json({
      leads,
      totalRecords,
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit),
      appointment_total: appointmentCountResult,
      closed_total: closedLeadCountResult,
      noShow_total: noShowLeadCountResult,
      total_revenue: totalRevenue,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllLeadsKanbanView = async (req, res) => {
  const { search, searchType = "text" } = req.body;

  const leadStatus = [
    "AllLeads",
    "Contacted",
    "Appointment",
    "RescheduleRequested",
    "NoShow",
    "NoMoney",
    "Undecided",
    "Closed",
    "Lost",
    "LiveAgent",
  ];

  // Initialize categorizedLeads with an empty array for each status
  const categorizedLeads = leadStatus.reduce((acc, status) => {
    acc[status] = [];
    return acc;
  }, {});

  // Set up a whereClause based on search parameters
  let whereClause = {};

  if (searchType === "text") {
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
  } else if (searchType === "datetime") {
    let startDate, endDate;

    switch (search) {
      case "today":
        startDate = dayjs().startOf("day").toDate();
        endDate = dayjs().endOf("day").toDate();
        break;
      case "Last7days":
        startDate = dayjs().subtract(7, "day").startOf("day").toDate();
        endDate = dayjs().endOf("day").toDate();
        break;
      case "Last14days":
        startDate = dayjs().subtract(14, "day").startOf("day").toDate();
        endDate = dayjs().endOf("day").toDate();
        break;
      case "Last30days":
        startDate = dayjs().subtract(30, "day").startOf("day").toDate();
        endDate = dayjs().endOf("day").toDate();
        break;
      case "Last3months":
        startDate = dayjs().subtract(3, "month").startOf("day").toDate();
        endDate = dayjs().endOf("day").toDate();
        break;
      case "Last6months":
        startDate = dayjs().subtract(6, "month").startOf("day").toDate();
        endDate = dayjs().endOf("day").toDate();
        break;
      case "Thismonth":
        startDate = dayjs().startOf("month").toDate();
        endDate = dayjs().endOf("month").toDate();
        break;
      case "Thisyear":
        startDate = dayjs().startOf("year").toDate();
        endDate = dayjs().endOf("year").toDate();
        break;
      default:
        break;
    }

    if (startDate && endDate) {
      whereClause = {
        created_on: {
          [Op.between]: [startDate, endDate],
        },
      };
    }
  }

  try {
    // Fetch leads based on the search filter and order by `created_on` in descending order
    const leads = await Lead.findAll({
      where: whereClause,
      order: [["created_on", "DESC"]],
    });

    // Prepare amount list and populate categorized leads
    const amountList = leadStatus.map((status) => ({
      status,
      amount: 0, // default to 0
    }));

    leads.forEach((lead) => {
      const status = lead.lead_status || "AllLeads";
      const field =
        status === "Closed" ? lead.close_amount : lead.treatment_value;

      // Add lead to the corresponding status category
      if (leadStatus.includes(status)) {
        categorizedLeads[status].push(lead);
      } else {
        categorizedLeads["AllLeads"].push(lead);
      }

      // Accumulate total for each status
      const amountEntry = amountList.find((entry) => entry.status === status);
      if (amountEntry && field != null) {
        amountEntry.amount += parseFloat(field) || 0; // Convert to float, defaulting to 0 if invalid
      }
    });

    res.status(200).json({ categorizedLeads, amountList });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(400).json({ error: error.message });
  }
};

const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const conversations = await Conversation.findAll({
      where: { leadId: id },
      order: [["Created_On", "DESC"]],
    });

    const notes = await Note.findAll({
      where: { LeadId: id },
      order: [["Created_On", "ASC"]],
    });

    res.status(200).json({
      lead,
      conversations,
      notes,
    });
  } catch (error) {
    console.error("Error fetching lead and conversations:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteLeadById = async (req, res) => {
  const { id } = req.body;
  try {
    // Check if the lead exists
    const lead = await Lead.findByPk(id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Delete the lead
    await lead.destroy();

    // Send a success response after deletion
    return res.status(200).json({ message: "Lead deleted successfully!" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    // Send an error response
    return res
      .status(500)
      .json({ message: "Failed to delete lead", error: error.message });
  }
};

const deleteLeads = async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .json({ message: "Invalid input, expected an array of lead IDs." });
  }

  try {
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const lead = await Lead.findByPk(id);
          if (!lead) {
            return { id, error: "Lead not found" };
          }
          await lead.destroy();
          return { id };
        } catch (error) {
          return { id, error: error.message };
        }
      })
    );

    const successfulDeletes = results
      .filter((result) => !result.error)
      .map((result) => result.id);
    const failedDeletes = results.filter((result) => result.error);

    res.status(200).json({
      message: "Delete operation completed",
      successfulDeletes,
      failedDeletes,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const confirmAppointment = async (req, res) => {
  const token = req.params?.id;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  try {
    const lead = await Lead.findByPk(decoded?.lead_id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found." });
    }

    const response = await axios.get(
      `https://${lead.user_name}.com/vtigerapi.php`
    );

    const tempdata = {
      firstName: lead.first_name,
      lastName: lead.last_name,
      appointmentDate: dayjs(
        lead?.appointment_date_time,
        "MMM DD YYYY HH:mm A"
      ).format("MMM DD YYYY"),
      appointmentTime: dayjs(
        lead?.appointment_date_time,
        "MMM DD YYYY HH:mm A"
      ).format("hh:mm A"),
      treatment: lead.treatment,
      clinicphone: response.data.website?.phone || "",
      clinicaddress: response.data.website?.address || "",
      clinicname: lead.assign_to,
      subject: "Appointment Confirmed",
    };
    if (lead.appointment_status != "Confirmed") {
      sendEmail(
        "confirmed-email.html",
        tempdata,
        "AppointmentConfirmed",
        response.data
      );
    }

    console.log(lead?.clinic_id, decoded.id);
    const notificationSettingDetails = await NotificationSetting.findOne({
      where: { clinic_id: lead?.clinic_id, user_id: decoded.id },
    });

    const message_html = NotificationsAppointmentConfirmed(
      lead?.first_name + " " + lead?.last_name,
      lead?.appointment_date_time
    );
    if (
      notificationSettingDetails?.receive_inapp_notification &&
      notificationSettingDetails?.notify_confirmed_appointment
    ) {
      await Notification.create({
        clinic_id: lead.clinic_id,
        user_id: decoded.id,
        website_name: lead.website_name,
        lead_id: lead.id,
        type: "Appointments",
        message: message_html,
        metadata: lead,
        status: "unread",
      });
    }
    console.log(
      "yes",
      notificationSettingDetails?.receive_inapp_notification,
      notificationSettingDetails?.notify_confirmed_appointment
    );
    await lead.update({
      lead_status: "Appointment",
      appointment_status: "Confirmed",
    });
    res.redirect(`https://${lead.user_name}.com/confirmation`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const rescheduleAppointment = async (req, res) => {
  const token = req.params?.id;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  try {
    const lead = await Lead.findByPk(decoded?.lead_id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found." });
    }

    const notificationSettingDetails = await NotificationSetting.findOne({
      where: { clinic_id: lead?.clinic_id, user_id: decoded.id },
    });

    const message_html = NotificationsLeadRescheduleRequest(
      lead?.first_name + " " + lead?.last_name,
      lead?.appointment_date_time
    );
    if (
      notificationSettingDetails?.receive_inapp_notification &&
      notificationSettingDetails?.notify_lead_reschedule
    ) {
      await Notification.create({
        clinic_id: lead.id,
        user_id: decoded.id,
        website_name: lead?.website_name,
        lead_id: lead.id,
        type: "Appointments",
        message: message_html,
        metadata: lead,
        status: "unread",
      });
    }

    await lead.update({
      lead_status: "RescheduleRequested",
      appointment_status: "Not Confirmed",
    });

    res.redirect(`https://${lead.user_name}.com/reschedule`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const confirmAppointmentWebhookTelnyx = async (req, res) => {
  const webhookEvent = req.body.data.event_type;
  // https://7042-94-202-12-105.ngrok-free.app/api/v1/auth/confirmAppointment/webhook-telnyx
  if (webhookEvent === "message.received") {
    const receivedMessage = req.body.data.payload.text;
    const fromNumber = req.body.data.payload.from.phone_number;

    // Handle the customer's reply
    try {
      // Find the latest Lead based on the phone number and creation date
      const lead = await Lead.findOne({
        where: { phone_number: fromNumber },
        order: [["updated_on", "DESC"]],
      });

      if (lead) {
        if (receivedMessage.toLowerCase() === "1") {
          // Update lead to confirmed appointment
          await lead.update({
            lead_status: "Appointment",
            appointment_status: "Confirmed",
          });
        } else if (receivedMessage.toLowerCase() === "2") {
          // Update lead to reschedule requested
          await lead.update({
            lead_status: "RescheduleRequested",
            appointment_status: "Not Confirmed",
          });
        }
      } else {
        console.log("No matching records found.");
      }
    } catch (error) {
      console.error("Error occurred:", error);
    }
  }

  res.status(200).send("Webhook received");
};

const exportLeads = async (req, res) => {
  try {
    // Fetch leads from the database
    const leads = await Lead.findAll();
    const leadsData = leads.map((lead) => ({
      ID: lead.id || "", // Unique ID for the lead
      AssignTo: lead.assign_to || "",
      CreatedBy: lead.created_by || "",
      CreatedOn: lead.created_on || "",
      UpdatedBy: lead.updated_by || "",
      UpdatedOn: lead.updated_on || "",
      Email: lead.email || "",
      EmailVerify: lead.email_verify || "",
      FinanceScore: lead.finance_score || "",
      FirstName: lead.first_name || "",
      FormStatus: lead.form_status || "",
      GCLDGoogle: lead.gcld_google || "",
      IPAddress: lead.ip_address || "",
      LastName: lead.last_name || "",
      LeadStatus: lead.lead_status || "",
      LeadType: lead.lead_type || "",
      NoteForDoctor: lead.note_for_doctor || "",
      PhoneNumber: lead.phone_number || "",
      PhoneVerify: lead.phone_verify || "",
      Treatment: lead.treatment || "",
      UTMCampaign: lead.utm_campaign || "",
      UTMMedium: lead.utm_medium || "",
      UTMSource: lead.utm_source || "",
      UniqueID: lead.unique_id || "",
      UserName: lead.user_name || "",
      WebsiteName: lead.website_name || "",
      HomeOwner: lead.home_owner || "",
      CoSigner: lead.co_signer || "",
      AnnualSalary: lead.annual_salary || "",
      AppointmentStatus: lead.appointment_status || "",
      HowToContact: lead.how_to_contact || "",
      TreatmentValue: lead.treatment_value || "",
      AppointmentDate: lead.appointment_date_time || "",
      AppointmentTime: lead.appointment_time || "",
      AppointmentNotes: lead.appointment_notes || "",
      ContactedAttempts: lead.contacted_attempts || "",
      CloseAmount: lead.close_amount || "",
      RecordingURL: lead.recording_url || "",
      PhoneNumberTo: lead.phone_number_to || "",
      CallSessionID: lead.call_session_id || "",
      HangupCause: lead.hangup_cause || "",
      CallStartTime: lead.call_start_time || "",
    }));

    const format = req.query.format || "excel"; // Default to excel format

    // Handle CSV format
    if (format === "csv") {
      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(leadsData);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=leads_data.csv"
      );
      return res.status(200).send(csv);
    } else {
      // Handle Excel format
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(leadsData);
      XLSX.utils.book_append_sheet(wb, ws, "LeadsData");

      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=leads_data.xlsx"
      );

      return res.status(200).send(excelBuffer);
    }
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).json({ error: error.message });
  }
};

const handleResendAppointmentMail = async (req, res) => {
  const { id } = req.body;
  try {
    const leadDetails = await Lead.findByPk(id);

    if (!leadDetails) {
      res.status(404).json({ message: "Lead not found" });
    } else {
      if (leadDetails?.lead_status === "Appointment") {
        const token = jwt.sign(
          { id: leadDetails.id, email: leadDetails.email },
          process.env.JWT_SECRET,
          {
            expiresIn: "24h",
          }
        );

        if (leadDetails?.email && leadDetails?.user_name) {
          const response = await axios.get(
            `https://${leadDetails?.user_name}.com/vtigerapi.php`
          );

          let tempdata = {
            appointmentDate: dayjs(
              leadDetails?.appointment_date_time,
              "MMM DD YYYY HH:mm A"
            ).format("MMM DD YYYY"),
            appointmentTime: dayjs(
              leadDetails?.appointment_date_time,
              "MMM DD YYYY HH:mm A"
            ).format("hh:mm A"),
            treatment: leadDetails?.treatment,
            firstName: leadDetails?.first_name,
            lastName: leadDetails?.last_name,
            urlConfirmAppointment: `${process.env.BASE_URL}/api/v1/auth/confirmAppointment/${token}`,
            urlRescheduleAppointment: `${process.env.BASE_URL}/api/v1/auth/rescheduleAppointment/${token}`,
            clinicname: leadDetails?.assign_to,
            subject: "Appointment Confirmation",
          };
          await sendEmail(
            "confirmation-email.html",
            tempdata,
            "AppointmentConfirmation",
            response?.data
          );
        }
      }
      res
        .status(200)
        .json({ message: "Appointment Confirmation Mail Send successfully!" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const formLeadWebhook = async (req, res) => {
  try {
    // Destructure request body for ease of use
    const {
      first_name,
      last_name,
      phone_number,
      email,
      finance_score,
      treatment,
      message,
      email_verify,
      phone_verify,
      unique_id,
      treatment_value,
      how_to_contact,
      ip_address,
      assign_to,
      note_for_doctor,
      user_name,
      website_name,
      utm_campaign,
      utm_medium,
      utm_source,
      co_signer,
      annual_salary,
      home_owner,
    } = req.body;

    // Validate required fields early on
    const requiredFields = [
      "first_name",
      "last_name",
      "phone_number",
      "email",
      "user_name",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "Missing required fields",
        requiredFields: missingFields,
      });
    }

    // Generate a random color index
    const randomNumber = Math.floor(Math.random() * 60);

    // Retrieve clinic and user details
    const [clinicDetails, userDetails] = await Promise.all([
      Clinic.findOne({ where: { clinic_name: user_name } }),
      User.findOne({ where: { clinic_name: user_name } }),
    ]);
    const notificationSettingDetails = await NotificationSetting.findOne({
      where: { clinic_id: clinicDetails?.id, user_id: userDetails?.id },
    });
    // Validate if clinic and user are found
    if (!clinicDetails || !userDetails) {
      return res.status(404).json({
        message: "Clinic or user not found",
      });
    }

    // Attempt to create a new lead
    const LeadInfo = await Lead.create({
      first_name,
      last_name,
      phone_number,
      email,
      finance_score,
      treatment,
      message,
      email_verify,
      phone_verify,
      unique_id,
      how_to_contact,
      ip_address,
      assign_to,
      note_for_doctor,
      user_name,
      website_name,
      utm_campaign,
      utm_medium,
      utm_source,
      avatar_color: darkColors[randomNumber],
      lead_type: "Form_lead",
      lead_status: "AllLeads",
      treatment_value,
      co_signer,
      annual_salary,
      home_owner,
      clinic_id: clinicDetails.id,
      created_by: user_name,
      updated_by: user_name,
      created_on: new Date(),
      updated_on: new Date(),
    });

    // Notification creation
    const message_html = NotificationsNewLead(first_name + " " + last_name);
    if (notificationSettingDetails?.notify_newlead_added) {
      await Notification.create({
        clinic_id: clinicDetails.id,
        user_id: userDetails.id,
        website_name,
        lead_id: LeadInfo.id,
        type: "Leads",
        message: message_html,
        metadata: LeadInfo,
        status: "unread",
      });
    }

    // Respond with success
    res.status(201).json({
      message: "Lead stored successfully",
    });
  } catch (error) {
    console.error("Error storing lead:", error);

    // Handle different types of errors
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors.map((err) => err.message),
      });
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "Duplicate entry detected",
        error: error.message,
      });
    }

    // Generic server error response
    res.status(500).json({
      message: "Failed to store lead due to a server error",
      error: error.message,
    });
  }
};

const createBlockLead = async (req, res) => {
  try {
    // Extract and verify the token
    const token = req.headers["authorization"]?.split(" ")[1]; // Bearer token
    if (!token) {
      return res
        .status(401)
        .json({ error: "Access token is missing or invalid." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const created_by = decoded?.email;
    const updated_by = decoded?.email;

    const { block_ip_address, block_type, block_phone_number } = req.body;

    // Validate block type and corresponding fields
    if (!["Number", "IP", "both"].includes(block_type)) {
      return res.status(400).json({
        error: "Invalid block_type. Must be one of: 'Number', 'IP', or 'both'.",
      });
    }

    // Build the query dynamically based on the block_type
    const query = {};
    if (block_type === "Number" || block_type === "both") {
      if (!block_phone_number) {
        return res
          .status(400)
          .json({ error: "block_phone_number is required." });
      }
      query.phone_number = block_phone_number;
    }
    if (block_type === "IP" || block_type === "both") {
      if (!block_ip_address) {
        return res.status(400).json({ error: "block_IP_address is required." });
      }
      query.ip_address = block_ip_address;
    }

    // Find the lead based on the constructed query
    const lead = await Lead.findOne({ where: query });

    if (!lead) {
      return res.status(404).json({
        error: `No lead found with the provided ${
          block_type === "both"
            ? "IP address and phone number"
            : block_type === "IP"
            ? "IP address"
            : "phone number"
        }.`,
      });
    }

    // Create the block lead record
    await BlockLeads.create({
      ...req.body,
      lead_id: lead.id,
      created_by,
      updated_by,
    });

    res.status(200).json({
      message: "Block lead created successfully",
    });
  } catch (error) {
    // Handle errors
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors.map((e) => e.message),
      });
    }

    if (error.name === "SequelizeDatabaseError") {
      return res.status(400).json({
        error: "Database error",
        details: error.message,
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Invalid token. Please provide a valid access token.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Access token has expired. Please log in again.",
      });
    }

    console.error("Error in createBlockLead:", error);
    res.status(500).json({
      error: "Internal server error",
      details: "An unexpected error occurred. Please try again later.",
    });
  }
};

const getAllBlockLeads = async (req, res) => {
  try {
    const { clinic_id } = req.params;

    if (!clinic_id) {
      return res.status(400).json({
        error: "clinic_id is required to fetch block leads.",
      });
    }

    const blockLeads = await BlockLeads.findAll({
      where: {
        clinic_id,
      },
    });

    res.status(200).json(blockLeads);
  } catch (error) {
    console.error("Error fetching block leads:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

const updateBlockLead = async (req, res) => {
  try {
    // Extract and verify the token
    const token = req.headers["authorization"]?.split(" ")[1]; // Bearer token
    if (!token) {
      return res
        .status(401)
        .json({ error: "Access token is missing or invalid." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const updated_by = decoded?.email;

    const { block_ip_address, block_type, block_phone_number, block_id } =
      req.body;

    // Validate block type and corresponding fields
    if (!["Number", "IP", "both"].includes(block_type)) {
      return res.status(400).json({
        error: "Invalid block_type. Must be one of: 'Number', 'IP', or 'both'.",
      });
    }

    // Validate block_id (the record to update must be provided)
    if (!block_id) {
      return res.status(400).json({ error: "block_id is required." });
    }

    // Build the query dynamically based on the block_type
    const query = {};
    if (block_type === "Number" || block_type === "both") {
      if (!block_phone_number) {
        return res
          .status(400)
          .json({ error: "block_phone_number is required." });
      }
      query.phone_number = block_phone_number;
    }
    if (block_type === "IP" || block_type === "both") {
      if (!block_ip_address) {
        return res.status(400).json({ error: "block_ip_address is required." });
      }
      query.ip_address = block_ip_address;
    }

    // Find the lead based on the constructed query
    const lead = await Lead.findOne({ where: query });

    if (!lead) {
      return res.status(404).json({
        error: `No lead found with the provided ${
          block_type === "both"
            ? "IP address and phone number"
            : block_type === "IP"
            ? "IP address"
            : "phone number"
        }.`,
      });
    }

    // Find the existing BlockLeads record to update
    const blockLead = await BlockLeads.findOne({ where: { id: block_id } });

    if (!blockLead) {
      return res.status(404).json({ error: "Block lead not found." });
    }

    // Update the block lead record
    await blockLead.update({
      ...req.body,
      updated_by,
    });

    res.status(200).json({
      message: "Block lead updated successfully",
    });
  } catch (error) {
    // Handle errors
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors.map((e) => e.message),
      });
    }

    if (error.name === "SequelizeDatabaseError") {
      return res.status(400).json({
        error: "Database error",
        details: error.message,
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Invalid token. Please provide a valid access token.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Access token has expired. Please log in again.",
      });
    }

    console.error("Error in updateBlockLead:", error);
    res.status(500).json({
      error: "Internal server error",
      details: "An unexpected error occurred. Please try again later.",
    });
  }
};

const deleteBlockLeadById = async (req, res) => {
  try {
    const blockLead = await BlockLeads.findByPk(req.params.id);
    if (!blockLead) {
      return res.status(404).json({ error: "Block lead not found" });
    }
    await blockLead.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  createLeads,
  updateLead,
  getAllLeads,
  getLeadById,
  deleteLeads,
  getAllLeadsKanbanView,
  confirmAppointment,
  rescheduleAppointment,
  exportLeads,
  formLeadWebhook,
  deleteLeadById,
  duplicateLeads,
  confirmAppointmentWebhookTelnyx,
  handleResendAppointmentMail,
  sendEmail,
  createBlockLead,
  getAllBlockLeads,
  updateBlockLead,
  deleteBlockLeadById,
};
