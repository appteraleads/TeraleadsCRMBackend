const nodemailer = require("nodemailer");
const TreatmentDetail = require("../Modal/TreatmentOption");
const User = require("../Modal/User");
const path = require("path");
const fs = require("fs");

// Function to upload file information to PostgreSQL
const uploadFileToPostgreSQL = async (filePath, userId) => {
  const timestamp = Date.now();
  const fileName = path.basename(filePath);
  const publicUrl = `https://yourstorageurl.com/Notes/${userId}/${timestamp}/${fileName}`; // Adjust the URL as necessary

  try {
    // Save the file info to the PostgreSQL database
    await TreatmentDetail.create({
      userId: userId,
      fileName: fileName,
      filePath: publicUrl, // Store the public URL of the file
      createdAt: new Date(),
    });

    console.log("File URL:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error("Error saving file information to PostgreSQL:", error);
    throw error;
  }
};

// Function to send an email
const sendEmailFun = async (to, from, subject, text) => {
  // Create a transporter for nodemailer
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
    from: from,
    to: to,
    subject: subject,
    text: text,
  };

  return transporter.sendMail(mailOptions);
};

// Trigger email message (adjusted as needed)
const triggerEmailMessage = (req, res) => {
  console.log(req.data);
  // Call to listMessages if needed
};

// Get callback for email message
const getCallbackEmailMessage = (req, res) => {
  console.log(req.data);
};

// Upload file and save information
const handleFileUpload = async (req, res) => {
  const userId = req.body.userId; // Assuming user ID is passed in the request body
  const localFilePath = req.file.path; // Adjust based on your file upload logic

  try {
    const publicUrl = await uploadFileToPostgreSQL(localFilePath, userId);
    res.status(200).json({
      message: "File uploaded and information saved successfully",
      fileUrl: publicUrl,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error uploading file", error: error.message });
  }
};

const handleGenrateAuthToken = async () => {
  const email = "app@teraleads.com";
  const user = await User.findOne({ where: { email: email } });
  const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "12h",
  });
  return res.status(200).json({
    token,
    expiresIn: "3h",
  });
};

module.exports = {
  sendEmailFun,
  uploadFileToPostgreSQL,
  triggerEmailMessage,
  getCallbackEmailMessage,
  handleFileUpload, // Add this function to handle file uploads
};
