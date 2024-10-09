const { Router } = require("express");
const passport = require("passport");
const authcontroller = require("./authController");

const router = Router();

router.post("/user", authcontroller.creeateUser);
router.post("/login", authcontroller.login);
router.post("/activate", authcontroller.activate);
router.post("/resend-activation-link", authcontroller.reSendActivationLink);
router.post("/send-otp", authcontroller.sendOtp);
router.post("/verify-otp", authcontroller.verifyOtp);
router.post("/set-password", authcontroller.setPassword);
router.post("/reset-password", authcontroller.resetPassword);


router.get(
    "/google-login",
    passport.authenticate("google", { scope: ["openid", "profile", "email"] })
  );

  router.get(
    "/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/api/v1/auth/google-login",
    }),
    (req, res) => {

      res.redirect("http://localhost:3000/dashboard"); 
    }
  );

  router.get("/userGoogle", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user); // Return the user profile
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  router.get('/facebook',
    passport.authenticate('facebook', { scope: ['email'] })
  );
  
  // Route for Facebook callback
  router.get('/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/' }),
    function(req, res) {
      res.redirect("http://localhost:3000/dashboard"); 
    }
  );
module.exports = router;
