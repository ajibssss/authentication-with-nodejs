const router = require("express").Router();
const User = require("../models/user");
const verifyToken = require("../middelwares/verify-token");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Login
router.post("/auth/login", async (req, res) => {
  try {
    let foundUser = await User.findOne({
      email: req.body.email
    });
    if (!foundUser) {
      res.status(403).json({
        success: false,
        message: "Authentication failed, User not found"
      });
    } else {
      if (foundUser.comparePassword(req.body.password)) {
        let token = jwt.sign(foundUser.toJSON(), process.env.SECRET, {
          expiresIn: 604800 // 1 week
        });

        res.json({
          success: true,
          token: token
        });
      } else {
        res.status(403).json({
          success: false,
          message: "Authentication failed, Wrong password!"
        });
      }
    }
  } catch (err) {
    console.log(err)
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// Sign Up
router.post("/auth/signup", async (req, res) => {
  console.log(res);
  if (!req.body.email || !req.body.password) {
    res.json({
      success: false,
      message: "Please enter your email and password"
    });
  } else {
    try {
      let newUser = new User();
      newUser.name = req.body.name;
      newUser.email = req.body.email;
      newUser.password = req.body.password;

      await newUser.save();
      let token = jwt.sign(newUser.toJSON(), process.env.SECRET, {
        expiresIn: 604800 //1 WEEK
      });

      res.json({
        success: true,
        token: token,
        message: "Successfully created"
      });
    } catch (err) {
      console.log(err)
      res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }
});

router.post("/auth/forgotPassword", async (req, res) => {
  console.log(res);
  if (process.env.GOOGLE_APP_EMAIL && process.env.GOOGLE_APP_PW) {
    const email = req.body.email;
    User.findOne({ email }, (err, user) => {
      if (err || !user) {
        return res
          .status(400)
          .json({ error: "User with this email does not exist" });
      }

      const token = jwt.sign(
        { _id: user._id },
        process.env.RESET_PASSWORD_KEY,
        { expiresIn: "15m" }
      );

      let mailTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GOOGLE_APP_EMAIL,
          pass: process.env.GOOGLE_APP_PW
        }
      });

      const data = {
        to: email,
        subject: "Reset Account Password Link",
        html: `
        <h3>Please click the link below to reset your password</h3>
        <p>${process.env.CLIENT_URL}/reset?token=${token}</p>
        `
      };

      return user.updateOne({ resetLink: token }, (err, user) => {
        if (err) {
          return res.status(400).json({ error: "Reset password link error" });
        } else {
          mailTransporter.sendMail(data, function(error, body) {
            if (error) {
              return res.status(400).json({ error: error.message });
            }
            return res
              .status(200)
              .json({
                message: "Email has been sent, please follow the instructions"
              });
          });
        }
      });
    });
  } else {
    return res
      .status(400)
      .json({
        error:
          "You have not set up an account to send an email or a reset password key for jwt"
      });
  }
});

router.post("/auth/updatePassword", async (req, res) => {
  console.log(res);
  const { token, password } = req.body;
  if (token) {
    jwt.verify(token, process.env.RESET_PASSWORD_KEY, function(
      error,
      decodedData
    ) {
      if (error) {
        return res
          .status(400)
          .json({ error: "Incorrect token or it is expired" });
      }
      User.findOne({ resetLink: token }, (err, user) => {
        if (err || !user) {
          return res
            .status(400)
            .json({ error: "User with this token does not exist" });
        }

        user.password = password
        user.save((err, result) =>  {
          if (err) {
            console.log(err)
            return res.status(400).json({ error: "Reset Password Error" });
          } else {
            return res
              .status(200)
              .json({ message: "Your password has been changed" });
          }
        });
      });
    });
  } else {
    return res.status(401).json({ error: "Authentication Error" });
  }
});
// Get Profile
router.get("/auth/user", verifyToken, async (req, res) => {
  try {
    let foundUser = await User.findOne({
      _id: req.decoded._id
    }).populate("address");
    if (foundUser) {
      res.json({
        success: true,
        user: foundUser
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// Update profile
router.put("/auth/user", verifyToken, async (req, res) => {
  try {
    let foundUser = await User.findOne({
      _id: req.decoded._id
    });

    if (foundUser) {
      if (req.body.name) foundUser.name = req.body.name;
      if (req.body.email) foundUser.email = req.body.email;
      if (req.body.password) foundUser.password = req.body.password;

      await foundUser.save();

      res.json({
        success: true,
        message: "Successfully updated"
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
module.exports = router;
