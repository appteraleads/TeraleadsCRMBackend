const pool = require("../../database");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const query = require("../Authentication/queries");

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.Google_Client_ID,
      clientSecret: process.env.Google_Client_secret,
      callbackURL: "/api/v1/auth/google/callback",
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
    
      try {
        const result = await pool.query(
          "SELECT * FROM users WHERE email = $1",
          [profile.emails[0].value]
        );
        const user = result.rows[0];
        if (!user) {
          const values = [
            profile.displayName,
            profile.emails[0].value,
            profile.photos[0].value,
            "G",
          ];
          pool.query(query.createGoogleUserQuery, values, async (error, results) => {
            if (error) {
              console.log(error)
              return done(new Error("Database error occurred"), null);
            }
            return done(null, profile);
          });
        }else{
          return done(null, profile);
        }
      } catch (error) {
        console.error(error);
        return done(new Error("Internal server error."), null);
      }
    }
  )
);

// Facebook Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "/api/v1/auth/facebook/callback",
  profileFields: ['id', 'displayName', 'photos', 'email']
},
async function(accessToken, refreshToken, profile, done) {
  
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [profile.emails[0].value]
    );
    const user = result.rows[0];
    if (!user) {
      const values = [
        profile.displayName,
        profile.emails[0].value,
        profile.photos[0].value,
        "F",
      ];
     
      pool.query(query.createFaceBookUserQuery, values, async (error, results) => {
        if (error) {
          console.log(error)
          return done(new Error("Database error occurred"), null);
        }
        return done(null, profile);
      });
    }else{
      return done(null, profile);
    }
  } catch (error) {
    console.error(error);
    return done(new Error("Internal server error."), null);
  }
}
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;
