const fs = require("fs");
const path = require("path");
require("dotenv").config();
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const User = require("../Modal/User");
const Otp = require("../Modal/OtpVerification");
const CryptoJS = require("crypto-js");
const Clinic = require("../Modal/Clinic");
const Role = require("../Modal/Role");
const ClinicCloseDate = require("../Modal/ClinicCloseDate");
const NotificationSetting = require("../Modal/NotificationSetting");
const LeadSetting = require("../Modal/LeadSetting");
const Notification = require("../Modal/Notification");
const { Op } = require("sequelize");
const SECRET_KEY = "ed1fd0c7deea4aa7023c2195fb097a27";

const encryptPassword = (password) => {
  const iv = CryptoJS.lib.WordArray.random(16); // Generate random 16-byte IV
  const encrypted = CryptoJS.AES.encrypt(
    password,
    CryptoJS.enc.Utf8.parse(SECRET_KEY),
    { iv: iv }
  );

  // Return both the encrypted password and IV as base64 strings
  return {
    encryptedPassword: encrypted.toString(), // Encrypted password as base64 string
    iv: iv.toString(CryptoJS.enc.Base64), // IV as base64 string
  };
};

// Generate OTP
const generateOtp = () => {
  const otp = Math.floor(1000 + Math.random() * 9000); // Generates a 4-digit OTP
  return otp.toString();
};

// Function to send OTP email
const sendOtpEmail = async (email, subject, otp, userName) => {
  const templatePath = path.join(
    __dirname,
    "../MailTemplate",
    "otpEmailTemplate.html"
  );
  let emailTemplate = fs.readFileSync(templatePath, "utf8");
  emailTemplate = emailTemplate.replace("{{otp}}", otp);
  emailTemplate = emailTemplate.replace("{{userName}}", userName);

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
    to: "app@teraleads.com",
    subject: subject,
    html: emailTemplate,
  };

  return transporter.sendMail(mailOptions);
};

// Function to send OTP
const sendOtpForUpdateEmailPassword = async (req, res) => {
  const {
    user_id,
    email,
    confirmEmail,
    type,
    dentist_full_name,
    confirmNewPassword,
  } = req.body;

  // Check if email is provided
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    if (type === "email") {
      const user = await User.findOne({ where: { email: confirmEmail } });
      if (user) {
        return res.status(400).json({
          message: "This email is already in use by another account.",
        });
      }

      // Generate OTP and set expiry time (10 minutes)
      const otp = generateOtp();
      const expiry = new Date(Date.now() + 10 * 60 * 1000); // Current time + 10 minutes

      // Store OTP with expiry time and user ID
      await Otp.create({ email: confirmEmail, otp, expiry, user_id });

      // Send OTP email
      await sendOtpEmail(
        email,
        "Your OTP to Change Your Email for TeraCRM",
        otp,
        dentist_full_name
      );
      return res.status(200).json({
        message:
          "Please check your email, as we have sent an OTP for verification.",
      });
    } else {
      // If type is not 'email', send OTP to the provided email (for other purposes)
      const otp = generateOtp();
      const expiry = new Date(Date.now() + 10 * 60 * 1000); // Current time + 10 minutes
      const { encryptedPassword, iv } = encryptPassword(confirmNewPassword);

      // Store OTP with expiry time and user ID
      await Otp.create({
        email,
        otp,
        expiry,
        user_id,
        password: encryptedPassword,
        iv_encrypted_password: iv,
      });

      // Send OTP email
      await sendOtpEmail(
        email,
        "Your OTP to Change Your Password for TeraCRM",
        otp,
        dentist_full_name
      );

      // Respond with success message
      return res.status(200).json({
        message:
          "Please check your email, as we have sent an OTP for verification.",
      });
    }
  } catch (error) {
    console.error("Error in sendOtpForUpdateEmailPassword:", error);
    res.status(500).json({ message: "Error sending OTP." });
  }
};

const handleGetLoginUserDetails = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "Authorization token is missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userEmail = decoded.email;
    if (!userEmail) {
      return res.status(400).json({ message: "Email is missing in token" });
    }

    const user = await User.findOne({
      where: { email: userEmail },
      include: [
        {
          model: Clinic,
        },
        {
          model: Role,
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAllClinicUserDetails = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "Authorization token is missing" });
    }

    const clinic_id = req.params.clinic_id;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userEmail = decoded.email;
    if (!userEmail) {
      return res.status(400).json({ message: "Email is missing in token" });
    }
    const { search } = req.body;

    const searchConditions = search
      ? {
          [Op.or]: [
            { dentist_full_name: { [Op.iLike]: `%${search}%` } },
            { phone: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    const users = await User.findAll({
      where: {
        clinic_id: clinic_id,
        ...searchConditions,
      },
      include: [
        {
          model: Clinic,
        },
        {
          model: Role,
        },
      ],
      order: [["created_on", "ASC"]],
    });

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "Users not found" });
    }

    return res.status(200).json({ users });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const handleUpdateEmailPassword = async (req, res) => {
  try {
    const { user_id, otp, type } = req.body;

    // Common user retrieval
    const user = await User.findOne({ where: { id: user_id } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Common OTP retrieval with expiry check
    const otpEntry = await Otp.findOne({
      where: { user_id: user_id?.toString(), otp: otp?.toString() },
    });

    if (!otpEntry) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (type === "email") {
      console.log("email");
      await User.update({ email: otpEntry.email }, { where: { id: user_id } });

      await Otp.destroy({ where: { user_id: user_id?.toString() } });
      const user_data = await User.findOne({ where: { id: user_id } });
      const token = jwt.sign(
        { email: user_data.email },
        process.env.JWT_SECRET,
        {
          expiresIn: "6h",
        }
      );
      return res
        .status(200)
        .json({ message: "OTP verified successfully.", token });
    } else {
      // Update password and related fields, then remove the OTP entry
      await User.update(
        {
          password: otpEntry.password,
          iv_encrypted_password: otpEntry.iv_encrypted_password,
        },
        { where: { id: user_id } }
      );
      // Remove OTP entry after successful update
      await Otp.destroy({ where: { user_id: user_id?.toString() } });

      return res.status(200).json({ message: "OTP verified successfully." });
    }
  } catch (error) {
    console.error("Error updating email or password:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const createClinicCloseDate = async (req, res) => {
  try {
    const {
      clinic_id,
      appointment_close_dates,
      appointment_from_time,
      appointment_end_time,
      created_by,
    } = req.body;
    let decoded;
    const token = req.headers.authorization?.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!appointment_close_dates || !Array.isArray(appointment_close_dates)) {
      return res
        .status(400)
        .json({ error: "appointment_close_dates must be an array" });
    }

    // Map over the dates and create records
    const newCloseDates = await Promise.all(
      appointment_close_dates.map((date) =>
        ClinicCloseDate.create({
          clinic_id,
          appointment_close_dates: date, // Assign the date
          appointment_from_time,
          appointment_end_time,
          created_by: decoded?.email,
        })
      )
    );

    return res
      .status(201)
      .json({ message: "Records created successfully", data: newCloseDates });
  } catch (error) {
    console.error("Error creating records:", error);
    return res.status(500).json({ error: "Failed to create records" });
  }
};

const getClinicCloseDatesByClinicId = async (req, res) => {
  try {
    const { clinic_id } = req.params;

    const closeDates = await ClinicCloseDate.findAll({
      where: { clinic_id },
    });

    // Always return the data, even if empty
    return res.status(200).json(closeDates);
  } catch (error) {
    console.error("Error fetching records:", error);
    return res.status(500).json({ error: "Failed to fetch records" });
  }
};

const updateClinicCloseDate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      clinic_id,
      appointment_close_dates,
      appointment_from_time,
      appointment_end_time,
      updated_by,
    } = req.body;

    const closeDate = await ClinicCloseDate.findByPk(id);
    const token = req.headers.authorization?.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!closeDate) {
      return res.status(404).json({ error: "Record not found" });
    }

    await closeDate.update({
      clinic_id,
      appointment_close_dates,
      appointment_from_time,
      appointment_end_time,
      updated_by: decoded?.email,
    });

    return res
      .status(200)
      .json({ message: "Record updated successfully", data: closeDate });
  } catch (error) {
    console.error("Error updating record:", error);
    return res.status(500).json({ error: "Failed to update record" });
  }
};

const deleteClinicCloseDate = async (req, res) => {
  try {
    const { id } = req.params;

    const closeDate = await ClinicCloseDate.findByPk(id);

    if (!closeDate) {
      return res.status(404).json({ error: "Record not found" });
    }

    await closeDate.destroy();

    return res.status(200).json({ message: "Record deleted successfully" });
  } catch (error) {
    console.error("Error deleting record:", error);
    return res.status(500).json({ error: "Failed to delete record" });
  }
};

const createOrUpdateNotificationSetting = async (req, res) => {
  try {
    const { user_id, clinic_id, ...settings } = req.body; // Extract data from the request body
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded?.email;

    // Check if a record already exists
    let notificationSetting = await NotificationSetting.findOne({
      where: {
        user_id,
        clinic_id,
      },
    });

    if (notificationSetting) {
      // Update the existing record
      await notificationSetting.update({
        ...settings,
        updated_by: email,
      });

      return res.status(200).json({
        message: "Notification setting updated successfully",
        data: notificationSetting,
      });
    } else {
      // Create a new record
      notificationSetting = await NotificationSetting.create({
        user_id,
        clinic_id,
        ...settings,
        created_by: email,
        updated_by: email,
      });

      return res.status(201).json({
        message: "Notification setting created successfully",
        data: notificationSetting,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const getNotificationSetting = async (req, res) => {
  try {
    const { user_id, clinic_id } = req.query; // Extract query parameters

    if (!user_id || !clinic_id) {
      return res.status(400).json({
        message: "user_id and clinic_id are required",
      });
    }

    // Find notification setting by user_id and clinic_id
    const notificationSetting = await NotificationSetting.findOne({
      where: {
        user_id,
        clinic_id,
      },
    });

    if (!notificationSetting) {
      return res.status(404).json({
        message: "Notification setting not found",
      });
    }

    res.status(200).json({
      notificationSetting,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

const createOrUpdateLeadSetting = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Authorization token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const {
      clinic_id,
      user_id,
      duplicate_lead_handling,
      lead_assignment_rules,
    } = req.body;

    if (!clinic_id) {
      return res.status(400).json({ message: "clinic_id are required" });
    }

    // Check if the record exists
    let leadSetting = await LeadSetting.findOne({
      where: { clinic_id },
    });

    if (leadSetting) {
      // Update the existing record
      if (lead_assignment_rules === "Specific User Role") {
        await leadSetting.update({
          user_id,
          duplicate_lead_handling,
          lead_assignment_rules,
          updated_by: decoded?.email,
          updated_on: new Date(),
        });
      } else {
        await leadSetting.update({
          user_id: null,
          duplicate_lead_handling,
          lead_assignment_rules,
          updated_by: decoded?.email,
          updated_on: new Date(),
        });
      }

      return res.status(200).json({
        message: "Lead setting updated successfully",
        leadSetting,
      });
    } else {
      // Create a new record
      leadSetting = await LeadSetting.create({
        clinic_id,
        user_id,
        duplicate_lead_handling,
        lead_assignment_rules,
        created_by: decoded?.email,
        updated_by: decoded?.email,
      });

      return res.status(201).json({
        message: "Lead setting created successfully",
        leadSetting,
      });
    }
  } catch (error) {
    console.error("Error handling lead setting:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getLeadSettingByClinicId = async (req, res) => {
  try {
    const { clinic_id } = req.params;

    if (!clinic_id) {
      return res.status(400).json({ message: "clinic_id is required" });
    }

    const leadSetting = await LeadSetting.findOne({
      where: { clinic_id },
      include: [
        {
          model: User,
          required: false,
        },
      ],
    });

    if (!leadSetting) {
      return res.status(404).json({ message: "Lead setting not found" });
    }

    return res.status(200).json(leadSetting);
  } catch (error) {
    console.error("Error fetching lead setting:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAllNotificationByUserId = async (req, res) => {
  try {
    // Extract user_id from the request parameters
    const { user_id } = req.params; // Assuming user_id is passed as a route parameter

    if (!user_id) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    // Fetch notifications for the specified user
    const notifications = await Notification.findAll({
      where: { user_id },
      order: [["created_at", "DESC"]], // Order by created_at to get the latest notifications first
    });

    // Fetch count of unread notifications
    const unreadCount = await Notification.count({
      where: { user_id, status: "unread" },
    });

    if (notifications.length === 0) {
      return res.status(404).json({
        message: "No notifications found for this user",
      });
    }

    // Return notifications along with unread count
    res.status(200).json({
      notifications,
      unreadCount, // Include unread count in the response
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);

    // Handle server errors
    res.status(500).json({
      message: "Failed to fetch notifications due to a server error",
      error: error.message,
    });
  }
};

const markNotificationsAsRead = async (req, res) => {
  try {
    // Extract user_id from the request parameters
    const { id } = req.params; // Assuming user_id is passed as a route parameter

    // Update the status of all unread notifications for the given user to 'read'
    const [updatedCount] = await Notification.update(
      { status: "read" },
      {
        where: {
          id,
        },
      }
    );

    if (updatedCount === 0) {
      return res.status(404).json({
        message: "No unread notifications found for this user",
      });
    }

    // Return success response
    res.status(200).json({
      message: `${updatedCount} notification(s) marked as read`,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);

    // Handle server errors
    res.status(500).json({
      message: "Failed to mark all notifications as read due to a server error",
      error: error.message,
    });
  }
};

// Export functions
module.exports = {
  handleGetLoginUserDetails,
  handleUpdateEmailPassword,
  sendOtpForUpdateEmailPassword,
  getAllClinicUserDetails,
  createClinicCloseDate,
  getClinicCloseDatesByClinicId,
  updateClinicCloseDate,
  deleteClinicCloseDate,
  createOrUpdateNotificationSetting,
  getNotificationSetting,
  createOrUpdateLeadSetting,
  getLeadSettingByClinicId,
  getAllNotificationByUserId,
  markNotificationsAsRead,
};
