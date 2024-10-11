const { Router } = require("express");
const passport = require("passport");
const authcontroller = require("./authController");
const { googleLogin, facebookLogin } = require('./authSocialController');

const router = Router();

router.post("/user", authcontroller.creeateUser);
router.post("/login", authcontroller.login);
router.post("/activate", authcontroller.activate);
router.post("/resend-activation-link", authcontroller.reSendActivationLink);
router.post("/send-otp", authcontroller.sendOtp);
router.post("/verify-otp", authcontroller.verifyOtp);
router.post("/set-password", authcontroller.setPassword);
router.post("/reset-password", authcontroller.resetPassword);

// Google login route
router.post('/login/google', googleLogin);

// Facebook login route
router.post('/login/facebook', facebookLogin);

module.exports = router;
