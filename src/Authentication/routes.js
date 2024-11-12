const { Router } = require("express");
const passport = require("passport");
const middleware = require("../Middleware/index");
const authController = require("./authController");
const leadsController = require("../Controller/LeadsController");
const treatmentController = require('../Controller/TreatmentController')
const notesController = require('../Controller/NotesController');
const ConversationsController = require('../Controller/ConversationsController');
const telnyxController = require('../Controller/TelnyxController');
const multer = require("multer");
const jwt = require('jsonwebtoken'); 
require("dotenv").config();
const upload = multer({ dest: "uploads/" });
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
// Authentication Routes
router.post("/user", authController.createUser);
router.post("/user-update", authController.updateUser);
router.post("/login", authController.login);
router.post("/activate", authController.activate);
router.post("/resend-activation-link", authController.reSendActivationLink);
router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/set-password", authController.setPassword);
router.post("/reset-password", authController.resetPassword);

// Google auth routes
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    async (req, res) => {
      try {
        // Generate JWT token
        const token = jwt.sign({ id: req.user.id, email: req.user.email }, JWT_SECRET, { expiresIn: '6h' });
  
        // Redirect back to the frontend with the token
        res.redirect(`http://localhost:3000/login?token=${token}`);
      } catch (error) {
        console.error("Error during Google callback:", error);
        res.status(500).send("Internal Server Error");
      }
    }
  );

// Facebook auth routes
// router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
// router.get(
//   "/facebook/callback",
//   passport.authenticate("facebook"),
//   (req, res) => {
//     const token = jwt.sign(
//       { id: req.user.id, email: req.user.email },
//       process.env.JWT_SECRET,
//       { expiresIn: "1h" }
//     );
//     res.json({ token });
//   }
// );

// // Lead Management Routes
router.post("/create-leads",middleware?.verifyToken, leadsController.createLeads);
router.post("/update-leads",middleware?.verifyToken, leadsController.updateLead);
router.post("/duplicate-leads",middleware?.verifyToken, leadsController.duplicateLeads);
router.post("/get-leads",middleware?.verifyToken, leadsController.getAllLeads);
router.post("/get-kanban-leads",middleware?.verifyToken, leadsController.getAllLeadsKanbanView);
router.get("/get-leads-by-id/:id",middleware?.verifyToken, leadsController.getLeadById);
router.delete('/deleteLeadById',middleware?.verifyToken, leadsController.deleteLeadById);
router.post("/delete-lead/:id",middleware?.verifyToken, leadsController.deleteLeads);
router.get("/export-leads",middleware?.verifyToken, leadsController.exportLeads);
router.post("/resendAppointmentMail", middleware?.verifyToken,leadsController.handleResendAppointmentMail);
// Webhook To Store Form Lead Routes
router.post("/form-leads-webhook", leadsController.formLeadWebhook);

//Treatment Routes
router.get("/get-treatmentOptions",middleware?.verifyToken, treatmentController.getTreatmentOptions);



//Appointment Confirmation Routes
router.get("/confirmAppointment/:id", leadsController.confirmAppointment);
router.get("/rescheduleAppointment/:id", leadsController.rescheduleAppointment);
router.post("/confirmAppointment/webhook-telnyx", leadsController.confirmAppointmentWebhookTelnyx);

// // Notes Management Routes
router.get("/get-note/:lead_id",middleware?.verifyToken, notesController.getNotes);
router.post("/save-note",middleware?.verifyToken, notesController.saveNotes);
router.put("/update-note/:noteId",middleware?.verifyToken, notesController.updateNotes);
router.delete("/delete-note/:noteId", middleware?.verifyToken,notesController.deleteNote);
router.post("/uploadFile/:userId",middleware?.verifyToken, upload.single("file"), notesController.uploadFile);

// // Conversation Management Routes
router.post("/sendMessage",middleware?.verifyToken, ConversationsController.sendMessage);
router.post("/sendEmail",middleware?.verifyToken, ConversationsController.sendEmail);
router.post("/get-conversationByLeadId",middleware?.verifyToken, ConversationsController.getConversationByLeadId);
router.post("/get-allLeadsListForConversation",middleware?.verifyToken, ConversationsController.getAllLeadsListForConversation);
router.put("/conversations/unseen/:lead_id",middleware?.verifyToken, ConversationsController.handleConversationUnseen);
router.put("/conversations/LeadTF/:id",middleware?.verifyToken, ConversationsController.handleConversationLead);

// // Telnyx Webhook Route
router.post("/webhook_getResponseFromTelnyx", telnyxController.webhook_getResponseFromTelnyx);

module.exports = router;
