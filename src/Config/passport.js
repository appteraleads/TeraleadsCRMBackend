require('dotenv').config(); // Load environment variables

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const { User } = require('../Modal/User'); // Adjust the path based on your project structure

// Log the environment variables to check if they're loaded
console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID);
console.log("Google Client Secret:", process.env.GOOGLE_CLIENT_SECRET);

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/v1/auth/google/callback',
    passReqToCallback: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ where: { googleId: profile.id } });
      if (user) {
        return done(null, user);
      }
      user = await User.create({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        photoURL: profile.photos[0].value,
      });
      return done(null, user);
    } catch (error) {
      console.error("Error in Google strategy callback:", error);
      return done(error, null);
    }
  }
));

// Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: '/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails', 'photos']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ where: { facebookId: profile.id } });
      if (user) {
        return done(null, user);
      }
      user = await User.create({
        facebookId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        photoURL: profile.photos[0].value,
      });
      return done(null, user);
    } catch (error) {
      console.error("Error in Facebook strategy callback:", error);
      return done(error, null);
    }
  }
));

// Serialize user to store user ID in session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  const user = await User.findByPk(id); // Adjust based on your user model
  done(null, user);
});
