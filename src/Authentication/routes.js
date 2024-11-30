require("dotenv").config();
const jwt = require('jsonwebtoken'); 
const multer = require("multer");
const { Router } = require("express");
const passport = require("passport");
const middleware = require("../Middleware/index");
const authController = require("./authController");
const leadsController = require("../Controller/LeadsController");
const treatmentController = require('../Controller/TreatmentController')
const notesController = require('../Controller/NotesController');
const ConversationsController = require('../Controller/ConversationsController');
const AppointmentController =require('../Controller/AppointmentsController')
const telnyxController = require('../Controller/TelnyxController');
const SettingController = require('../Controller/SetttingController')
const ClinicController = require('../Controller/ClinicController')
const CallLogsController = require("../Controller/CallLogsController")
const upload = multer({ dest: "uploads/" });
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;

//  Authentication Routes
router.post("/user", authController.createUser);
router.post("/user-update", authController.updateUser);
router.post("/login", authController.login);
router.post("/activate", authController.activate);
router.post("/resend-activation-link", authController.reSendActivationLink);
router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/set-password", authController.setPassword);
router.post("/reset-password", authController.resetPassword);

//  Google auth routes
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
        const token = jwt.sign({ id: req.user.id, email: req.user.email }, JWT_SECRET, { expiresIn: '6h' });
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


//  Setting Management Routes
router.get("/getLoginUserDetails",middleware?.verifyToken, SettingController.handleGetLoginUserDetails);
router.post("/send-otp-update-email",middleware?.verifyToken, SettingController.sendOtpForUpdateEmailPassword);
router.post("/verify-otp-email-password",middleware?.verifyToken, SettingController.handleUpdateEmailPassword);
router.delete("/delete-user/:id",middleware?.verifyToken, authController.deleteUser);
router.post("/inviteTeamMember",middleware?.verifyToken, authController.inviteTeamMember);
router.post("/getAllClinicUserDetails/:clinic_id",middleware?.verifyToken, SettingController.getAllClinicUserDetails);

//  Clinic user & role Routes
router.post("/populatePermissions",middleware?.verifyToken, authController.populatePermissions);
router.post("/createRoles",middleware?.verifyToken, authController.createRole);
router.get("/getAllRoles",middleware?.verifyToken, authController.getAllRoles);
router.post("/updateRoles",middleware?.verifyToken, authController.updateRole);
router.delete("/delete-role/:id",middleware?.verifyToken, authController.deleteRole);
router.post("/assignRoles",middleware?.verifyToken, authController.assignRoles);

//  Clinic Management Routes
router.post('/create-update-clinic/:clinic_id',middleware?.verifyToken, ClinicController.createOrUpdateClinic);
router.get('/get-clinic-details',middleware?.verifyToken,ClinicController.getClinicDetails);
router.delete('/clinic/:id',middleware?.verifyToken,ClinicController.deleteClinic);

// Create a new clinic setting
router.post('/clinicclosedates',middleware?.verifyToken,SettingController.createClinicCloseDate);
router.put('/clinicclosedates/:id',middleware?.verifyToken,SettingController.updateClinicCloseDate);
router.delete('/clinicclosedates/:id',middleware?.verifyToken,SettingController.deleteClinicCloseDate);
router.get('/clinicclosedates/clinic/:clinic_id',middleware?.verifyToken,SettingController.getClinicCloseDatesByClinicId);
router.get('/createAppointmentSetting/clinic/:clinic_id',middleware?.verifyToken,AppointmentController.createAppointmentSetting);

// Create a new appointment setting
router.post('/appointment-settings', middleware?.verifyToken,AppointmentController.createAppointmentSetting);
router.get('/appointment-settings/:clinic_id', middleware?.verifyToken,AppointmentController.getAppointmentSettingsByClinic);
router.get('/appointment-settings/:id',middleware?.verifyToken,AppointmentController.getAppointmentSettingById);
router.post('/appointment-settings/:id', middleware?.verifyToken,AppointmentController.updateAppointmentSetting);

// notification-settings
router.post('/notification-settings',middleware?.verifyToken,SettingController.createOrUpdateNotificationSetting);
router.get('/notification-settings',middleware?.verifyToken,SettingController.getNotificationSetting);

//lead-settings
router.post('/lead-settings',middleware?.verifyToken,SettingController.createOrUpdateLeadSetting);
router.get('/lead-setting/:clinic_id',middleware?.verifyToken,SettingController.getLeadSettingByClinicId);

// block lead
router.post('/createBlockLead',middleware?.verifyToken,leadsController.createBlockLead);
router.get('/blockLead/:clinic_id',middleware?.verifyToken,leadsController.getAllBlockLeads);
router.post('/updateBlockLead',middleware?.verifyToken,leadsController.updateBlockLead);
router.delete('/blocklead/:id',middleware?.verifyToken,leadsController.deleteBlockLeadById);

//  Lead Management Routes
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

//  Webhook To Store Form Lead Routes
router.post("/form-leads-webhook", leadsController.formLeadWebhook);

//  Telnyx Webhook Route
router.post("/webhook_getResponseFromTelnyx", telnyxController.webhook_getResponseFromTelnyx);
router.post("/telnyxCall", telnyxController.outboundCallWithTelxyn);

router.get("/outbound-calls-webhook", telnyxController.outboundcallsWebhook);

//  Treatment Routes
router.get("/get-treatmentOptions",middleware?.verifyToken, treatmentController.getTreatmentOptions);

//  Appointment Confirmation Routes
router.get("/confirmAppointment/:id", leadsController.confirmAppointment);
router.get("/rescheduleAppointment/:id", leadsController.rescheduleAppointment);
router.post("/confirmAppointment/webhook-telnyx", leadsController.confirmAppointmentWebhookTelnyx);

//  Notes Management Routes
router.get("/get-note/:lead_id",middleware?.verifyToken, notesController.getNotes);
router.post("/save-note",middleware?.verifyToken, notesController.saveNotes);
router.put("/update-note/:noteId",middleware?.verifyToken, notesController.updateNotes);
router.delete("/delete-note/:noteId", middleware?.verifyToken,notesController.deleteNote);
router.post("/uploadFile/:userId",middleware?.verifyToken, upload.single("file"), notesController.uploadFile);

//  Conversation Management Routes
router.post("/sendMessage",middleware?.verifyToken, ConversationsController.sendMessage);
router.post("/sendEmail",middleware?.verifyToken, ConversationsController.sendEmail);
router.post("/get-conversationByLeadId",middleware?.verifyToken, ConversationsController.getConversationByLeadId);
router.post("/get-allLeadsListForConversation",middleware?.verifyToken, ConversationsController.getAllLeadsListForConversation);
router.put("/conversations/unseen/:lead_id",middleware?.verifyToken, ConversationsController.handleConversationUnseen);
router.put("/conversations/LeadTF/:id",middleware?.verifyToken, ConversationsController.handleConversationLead);

//  Appointments Management Routes
router.post("/get-AllleadsForAppointment",middleware?.verifyToken, AppointmentController.getAllLeadsForAppointment);
router.post("/get-AppointmentOverview",middleware?.verifyToken, AppointmentController.getOverviewDetails);
router.get("/get-AllLeadStatusNotConfirm",middleware?.verifyToken, AppointmentController.getAllLeadStatusNotConfirm);
router.post("/bulk-resend-confirmation-mail",middleware?.verifyToken, AppointmentController.bulkResendConfirmationMail);
router.get("/get-LeadListAccodingToStatus",middleware?.verifyToken, AppointmentController.getLeadListAccodingToStatus);
router.post("/get-calenderDataForAppointment",middleware?.verifyToken, AppointmentController.getCalenderDataForAppointment);

// Call Logs
router.post("/createCallLog",middleware?.verifyToken, CallLogsController.createCallLog);
router.get("/get-CallLog",middleware?.verifyToken, CallLogsController.getAllCallLogs);
router.post("/updateCallLog",middleware?.verifyToken, CallLogsController.updateCallLog);

module.exports = router;
