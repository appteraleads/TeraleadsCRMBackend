require("dotenv").config();
const { Op, Sequelize } = require("sequelize");
const Lead = require("../Modal/Lead");
const AppointmentSetting = require("../Modal/AppointmentSetting");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const axios = require("axios");
const { sendEmail } = require("./LeadsController");
const jwt = require("jsonwebtoken");
const Notification = require("../Modal/Notification");
const NotificationSetting = require("../Modal/NotificationSetting");
const {
  NotificationsAppointmentReminder,
} = require("../Common/NotificationTypeFormatehtml");
const { Clinic, User } = require("../Modal");
dayjs.extend(utc);

const getOverviewDetails = async (req, res) => {
  const { search = "", searchType = "text" } = req.body;
  try {
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
    // Get total count, confirmed count, not confirmed count, and today's appointments
    const result = await Lead.findAll({
      attributes: [
        // Total appointments count where lead_status is 'Appointment'
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.literal(
              "CASE WHEN lead_status = 'Appointment' THEN 1 END"
            )
          ),
          "total_appointments",
        ],
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.literal("CASE WHEN lead_status = 'NoShow' THEN 1 END")
          ),
          "total_noShow",
        ],
        // Confirmed appointments count
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.literal(
              "CASE WHEN appointment_status = 'Confirmed' AND lead_status = 'Appointment' THEN 1 END"
            )
          ),
          "confirmed_appointments",
        ],
        // Not confirmed appointments count
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.literal(
              "CASE WHEN appointment_status = 'Not Confirmed' AND lead_status = 'Appointment' THEN 1 END"
            )
          ),
          "not_confirmed_appointments",
        ],
        // Today's appointments count using CURRENT_DATE for PostgreSQL
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.literal(
              "CASE WHEN DATE(appointment_date_time) = CURRENT_DATE THEN 1 END"
            )
          ),
          "today_appointments",
        ],
      ],
      raw: true, // This will return the result as a plain object instead of a Sequelize instance
    });

    const upcomingLeads = await Lead.findAll({
      where: {
        [Op.and]: [
          { lead_status: "Appointment", appointment_status: "Confirmed" },
          Sequelize.where(
            Sequelize.fn(
              "TO_TIMESTAMP",
              Sequelize.col("appointment_date_time"),
              "YYYY-MM-DD HH24:MI:SS"
            ),
            {
              [Op.gt]: Sequelize.literal(
                "CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dubai'"
              ),
            }
          ),
          whereClause,
        ],
      },
      order: [
        [
          Sequelize.fn(
            "TO_TIMESTAMP",
            Sequelize.col("appointment_date_time"),
            "YYYY-MM-DD HH24:MI:SS"
          ),
          "ASC",
        ],
      ],
    });

    const pastLeads = await Lead.findAll({
      where: {
        [Op.and]: [
          { lead_status: "Appointment" },
          Sequelize.where(
            Sequelize.fn(
              "TO_TIMESTAMP",
              Sequelize.col("appointment_date_time"),
              "YYYY-MM-DD HH24:MI:SS"
            ),
            {
              [Op.lt]: Sequelize.literal(
                "CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dubai'"
              ),
            }
          ),
          whereClause,
        ],
      },
      order: [
        [
          Sequelize.fn(
            "TO_TIMESTAMP",
            Sequelize.col("appointment_date_time"),
            "YYYY-MM-DD HH24:MI:SS"
          ),
          "DESC",
        ],
      ],
    });

    // Send both the overview and future leads in the response
    res.json({
      overview: result[0], // The overview counts
      upcomingappointments: upcomingLeads, // The leads for today or future appointments
      pastAppointments: pastLeads,
    });
  } catch (error) {
    console.error("Error getting overview details:", error);
    res.status(500).json({ message: "Error getting overview details" });
  }
};

const getAllLeadsForAppointment = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      searchType,
      filterSearch,
    } = req.body;

    const offset = (page - 1) * limit;
    let whereClause = {
      appointment_date_time: { [Op.ne]: null }, // Ensure appointment_date_time is not null
    };

    // Handling search for appointment_status and lead_status
    if (search) {
      if (searchType === "status") {
        whereClause.appointment_status = { [Op.eq]: `${search}` }; // Case-insensitive search
      } else if (searchType === "lead") {
        whereClause.lead_status = { [Op.eq]: `${search}` }; // Case-insensitive search
      }
    }

    // Handling filterSearch parameters
    if (
      filterSearch?.appointment_status ||
      filterSearch?.appointment_date_time
    ) {
      const conditions = [];

      if (filterSearch?.appointment_status) {
        conditions.push({
          appointment_status: { [Op.eq]: filterSearch.appointment_status },
        });
      }

      if (filterSearch?.appointment_date_time) {
        // Format the appointment_date_time using dayjs to ensure it's in the correct format
        const formattedDateTime = dayjs(
          filterSearch.appointment_date_time,
          "MMM DD YYYY hh:mm A"
        ).format("MMM DD YYYY hh:mm A");

        // Ensure the formatted date is valid
        if (dayjs(formattedDateTime, "MMM DD YYYY hh:mm A").isValid()) {
          // Use the Op.like to match the format stored in the database
          conditions.push({
            appointment_date_time: {
              [Op.like]: formattedDateTime, // Use `LIKE` instead of `EQ` for exact matching of formatted date
            },
          });
        } else {
          return res.status(400).json({ message: "Invalid date format." });
        }
      }

      if (conditions.length > 0) {
        whereClause = { ...whereClause, [Op.and]: conditions };
      }
    }

    // Fetch leads and count total records based on whereClause
    const { rows: leads, count: totalRecords } = await Lead.findAndCountAll({
      where: whereClause,
      limit,
      order: [["appointment_date_time", "DESC"]], // Ordering by appointment_date_time in descending order
      offset,
    });

    // Count specific statuses
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

    // Send response
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
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};

const getAllLeadStatusNotConfirm = async (req, res) => {
  try {
    // Extract search query from the request
    const { search } = req.query;

    // Define the search conditions
    let whereConditions = {
      lead_status: "Appointment",
      appointment_status: "Not Confirmed",
    };

    // If a search term is provided, apply search conditions for firstname, lastname, or phone_number
    if (search) {
      whereConditions[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } }, // Case-insensitive search for firstname
        { last_name: { [Op.iLike]: `%${search}%` } }, // Case-insensitive search for lastname
        { phone_number: { [Op.iLike]: `%${search}%` } }, // Case-insensitive search for phone number
      ];
    }

    // Fetch leads with the provided conditions
    const leads = await Lead.findAll({
      where: whereConditions,
      order: [["created_on", "DESC"]], // Optionally, order by creation date (or any other field)
    });

    // Send a 200 status code for a successful response
    res.status(200).json({
      success: true,
      data: leads,
    });
  } catch (error) {
    // Handle different types of errors:
    console.error("Error fetching leads:", error);

    // Database-related errors (Sequelize validation or query errors)
    if (error.name === "SequelizeDatabaseError") {
      return res
        .status(500)
        .json({ success: false, message: "Database error occurred" });
    }

    // Validation or other client-side errors
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid search parameters or query format",
        details: error.errors, // You can send more specific validation error details
      });
    }

    // General errors (e.g., missing fields, other internal issues)
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again later.",
      error: error.message, // Optionally, send the error message for debugging
    });
  }
};

const bulkResendConfirmationMail = async (req, res) => {
  try {
    const { selectedLeads } = req.body; // Array of selected lead IDs

    if (!selectedLeads || selectedLeads.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No leads selected for resend.",
      });
    }

    // Fetch lead details for the selected leads
    const leads = await Lead.findAll({
      where: {
        id: selectedLeads, // Get the leads with the given IDs
      },
    });

    // Check if leads were found
    if (!leads || leads.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No leads found with the provided IDs.",
      });
    }

    // Initialize email promises array
    const emailPromises = [];

    // Loop through each lead and send email if conditions are met
    for (let leadDetails of leads) {
      // Process leads only if they have status 'Appointment'
      if (leadDetails?.lead_status === "Appointment") {
        const token = jwt.sign(
          { id: leadDetails.id, email: leadDetails.email },
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );

        if (leadDetails?.email && leadDetails?.user_name) {
          try {
            // Fetching the user data from an external API (example)
            const response = await axios.get(
              `https://${leadDetails?.user_name}.com/vtigerapi.php`
            );

            // Prepare data for the email
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

            // Add the email sending operation to the emailPromises array
            emailPromises.push(
              sendEmail(
                "confirmation-email.html",
                tempdata,
                "AppointmentConfirmation",
                response?.data
              )
            );
          } catch (error) {
            console.error(
              `Failed to send email to ${leadDetails.email} due to error: `,
              error
            );
          }
        }
      }
    }

    // Wait for all email promises to resolve
    await Promise.all(emailPromises);

    return res.status(200).json({
      success: true,
      message: `${emailPromises.length} confirmation email(s) have been sent successfully.`,
    });
  } catch (error) {
    console.error("Error in bulkResendConfirmationMail:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while sending confirmation emails.",
      error: error.message,
    });
  }
};

const getLeadListAccodingToStatus = async (req, res) => {
  const { type } = req.query;

  try {
    let leads = [];

    switch (type) {
      case "Today":
        // Fetch today's appointments when appointment_date_time is a string
        leads = await Lead.findAll({
          where: Sequelize.literal(
            "CASE WHEN appointment_date_time::DATE = CURRENT_DATE THEN TRUE ELSE FALSE END" // Return boolean value
          ),
          raw: true, // Return plain data instead of Sequelize instances
        });
        break;
      case "Total Appointments":
        // Fetch all appointments regardless of status
        leads = await Lead.findAll({
          where: {
            lead_status: "Appointment",
          },
          raw: true,
        });
        break;

      case "Confirmed Appointments":
        // Fetch confirmed appointments
        leads = await Lead.findAll({
          where: {
            appointment_status: "Confirmed",
            lead_status: "Appointment",
          },
          raw: true,
        });
        break;

      case "Not Confirmed Appointments":
        // Fetch not confirmed appointments
        leads = await Lead.findAll({
          where: {
            appointment_status: "Not Confirmed",
            lead_status: "Appointment",
          },
          raw: true,
        });
        break;
      case "No Show Rate":
        // Fetch not confirmed appointments
        leads = await Lead.findAll({
          where: {
            lead_status: "NoShow",
          },
          raw: true,
        });
        break;

      default:
        return res.status(400).json({ error: "Invalid lead type" });
    }

    // Return the leads as a response
    return res.status(200).json({ leads });
  } catch (error) {
    console.error("Error fetching lead data:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while fetching lead data" });
  }
};

const getCalenderDataForAppointment = async (req, res) => {
  try {
    const { type, data } = req.body;

    let startDate, endDate;

    // Adjust date calculations based on FullCalendar's view types
    if (type === "dayGridMonth") {
      startDate = dayjs(data?.start)
        .startOf("month")
        .format("YYYY-MM-DD HH:mm:ss");
      endDate = dayjs(data?.end).endOf("month").format("YYYY-MM-DD HH:mm:ss");

      // Fetch appointments within the month range
      const leads = await Lead.findAll({
        where: {
          // lead_status: "Appointment",
          appointment_date_time: {
            [Op.between]: [startDate, endDate],
          },
        },
      });

      if (!leads || leads.length === 0) {
        return res.status(204).json({ message: "No appointment data found" });
      }

      return res.status(200).json({ appointmentData: leads });
    } else if (type === "timeGridWeek" || type === "timeGridDay") {
      // Adjust for week or day view
      startDate = dayjs(data?.start).format("YYYY-MM-DD HH:mm:ss");
      endDate = dayjs(data?.end).format("YYYY-MM-DD HH:mm:ss");

      // Fetch appointments within the given range
      const leads = await Lead.findAll({
        where: {
          // lead_status: "Appointment",
          appointment_date_time: {
            [Op.between]: [startDate, endDate],
          },
        },
      });

      if (!leads || leads.length === 0) {
        return res.status(204).json({ message: "No appointment data found" });
      }

      return res.status(200).json({ appointmentData: leads });
    }

    return res.status(400).json({
      error:
        "Invalid type provided. Use 'dayGridMonth', 'timeGridWeek', or 'timeGridDay'",
    });
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error fetching lead data:", error);

    // Handle specific error types
    if (error.name === "SequelizeDatabaseError") {
      return res.status(500).json({ error: "Database error occurred" });
    }
    if (error.name === "SequelizeConnectionError") {
      return res.status(503).json({ error: "Database connection error" });
    }

    // Handle general errors
    return res
      .status(500)
      .json({ error: "An unexpected error occurred while fetching lead data" });
  }
};

const createAppointmentSetting = async (req, res) => {
  try {
    const data = req.body;
    const token = req.headers.authorization?.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(data);
    const appointmentSetting = await AppointmentSetting.create({
      clinic_id: parseInt(data?.clinic_id),
      appointment_time_zone: data?.appointment_time_zone,
      appointment_days_week: data?.appointment_days_week,
      appointment_date_format: data?.appointment_date_format,
      appointment_duration: data?.appointment_duration,
      appointment_reminders_sms: data?.appointment_reminders_sms,
      appointment_reminders_email: data?.appointment_reminders_email,
      appointment_reminders_3days: data?.appointment_reminders_3days,
      appointment_reminders_24hours: data?.appointment_reminders_24hours,
      appointment_reminders_1hours: data?.appointment_reminders_1hours,
      appointment_confirmation_request: data?.appointment_confirmation_request,
      cancellation_notification: data?.cancellation_notification,
      created_by: decoded?.email,
      updated_by: decoded?.email,
    });

    res.status(201).json(appointmentSetting);
  } catch (error) {
    console.error("Error creating appointment setting:", error);

    // Handle Sequelize validation errors
    if (error.name === "SequelizeValidationError") {
      const validationErrors = error.errors.map((err) => err.message);
      return res
        .status(400)
        .json({ message: "Validation errors.", errors: validationErrors });
    }

    // Handle unexpected errors
    res.status(500).json({
      message:
        "An error occurred while creating the appointment setting. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const updateAppointmentSetting = async (req, res) => {
  try {
    const { id } = req.params; // Record ID to update
    const data = req.body; // Updated data
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "Authorization token is missing" });
    }

    // Decode the JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Find the existing appointment setting by primary key
    const appointmentSetting = await AppointmentSetting.findByPk(id);

    if (!appointmentSetting) {
      return res.status(404).json({ message: "Appointment setting not found" });
    }

    // Update the appointment setting
    await appointmentSetting.update({
      clinic_id: data?.clinic_id, // Ensure client sends valid data
      appointment_time_zone: data?.appointment_time_zone,
      appointment_days_week: data?.appointment_days_week,
      appointment_date_format: data?.appointment_date_format,
      appointment_duration: data?.appointment_duration,
      appointment_reminders_sms: data?.appointment_reminders_sms,
      appointment_reminders_email: data?.appointment_reminders_email,
      appointment_reminders_3days: data?.appointment_reminders_3days,
      appointment_reminders_24hours: data?.appointment_reminders_24hours,
      appointment_reminders_1hours: data?.appointment_reminders_1hours,
      appointment_confirmation_request: data?.appointment_confirmation_request,
      cancellation_notification: data?.cancellation_notification,
      updated_by: decoded?.email, // Update only 'updated_by'
    });

    res.status(200).json({
      message: "Appointment setting updated successfully",
      data: appointmentSetting,
    });
  } catch (error) {
    console.error("Error updating appointment setting:", error);
    res.status(500).json({
      message: "An error occurred while updating the appointment setting",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getAppointmentSettingsByClinic = async (req, res) => {
  try {
    const { clinic_id } = req.params;

    if (!clinic_id) {
      return res.status(400).json({ message: "Clinic ID is required." });
    }

    const appointmentSetting = await AppointmentSetting.findOne({
      where: { clinic_id },
    });

    if (!appointmentSetting) {
      return res.status(404).json({
        message: "No appointment settings found for the given clinic ID.",
      });
    }

    res.status(200).json(appointmentSetting);
  } catch (error) {
    console.error("Error fetching appointment settings:", error);
    res.status(500).json({
      message:
        "An error occurred while fetching appointment settings. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getAppointmentSettingById = async (req, res) => {
  try {
    const appointmentSetting = await AppointmentSetting.findByPk(req.params.id);
    if (!appointmentSetting) {
      return res.status(404).json({ message: "Appointment setting not found" });
    }
    res.status(200).json(appointmentSetting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendNotificationUpcomingAppointmentReminder = async () => {
  try {
    const upcomingLeads = await Lead.findAll({
      where: {
        [Op.and]: [
          { lead_status: "Appointment", appointment_status: "Confirmed" },
          Sequelize.where(
            Sequelize.fn(
              "DATE_TRUNC",
              Sequelize.literal("'minute'"), 
              Sequelize.fn(
                "TO_TIMESTAMP",
                Sequelize.col("appointment_date_time"),
                "YYYY-MM-DD HH24:MI:SS"
              )
            ),
            {
              [Op.eq]: Sequelize.literal(
                "DATE_TRUNC('minute', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dubai') + INTERVAL '1 hour'"
              ),
            }
          ),
        ],
      },
      raw: true,
    });

    // If no upcoming leads, return early
    if (!upcomingLeads || upcomingLeads.length === 0) {
      console.log("No upcoming leads found.");
      return;
    }

    // Create an array of promises to handle all notifications
    const notificationPromises = upcomingLeads?.map(async (leadDetails) => {
      const user = await User.findOne({
        where: { clinic_id: leadDetails?.clinic_id },
      });

      const notificationSettingDetails = await NotificationSetting.findOne({
        where: {
          clinic_id: leadDetails?.clinic_id,
          user_id: user?.id,
        },
      });

      const message_html = NotificationsAppointmentReminder(
        leadDetails?.first_name + " " + leadDetails?.last_name,
        dayjs(leadDetails?.appointment_date_time, "MMM DD YYYY HH:mm A").format(
          "MMM DD YYYY"
        ) +
          " " +
          dayjs(
            leadDetails?.appointment_date_time,
            "MMM DD YYYY HH:mm A"
          ).format("hh:mm A")
      );

      if (
        notificationSettingDetails?.receive_inapp_notification &&
        notificationSettingDetails?.notify_appointment_near
      ) {
        await Notification.create({
          clinic_id: leadDetails.clinic_id,
          user_id: parseInt(user?.id),
          website_name: leadDetails.website_name,
          lead_id: leadDetails.id,
          type: "Appointments",
          message: message_html,
          metadata: leadDetails,
          status: "unread",
        });
      }
    });

    // Wait for all notifications to be sent
    await Promise.all(notificationPromises);

    console.log("Notifications sent successfully.");
    return true; // Return success if everything went well
  } catch (error) {
    console.error("Error fetching upcoming leads:", error);
    return false; // Return false in case of error
  }
};

module.exports = {
  getAllLeadsForAppointment,
  getOverviewDetails,
  getAllLeadStatusNotConfirm,
  bulkResendConfirmationMail,
  getLeadListAccodingToStatus,
  getCalenderDataForAppointment,
  createAppointmentSetting,
  getAppointmentSettingsByClinic,
  getAppointmentSettingById,
  updateAppointmentSetting,
  sendNotificationUpcomingAppointmentReminder,
};
