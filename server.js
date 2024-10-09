const express = require("express");
const authRoutes = require("./src/Authentication/routes");
const passport = require("./src/Config/passportConfig");
const cors = require("cors");
const session = require("express-session");
const app = express();
const port = 8080;
require("dotenv").config();
app.use(cors());

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  res.send("hello fareed");
});

app.use("/api/v1/auth", authRoutes);

app.listen(port, () => console.log("app listening on port"));
