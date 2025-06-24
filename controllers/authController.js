const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper: send OTP email
const sendOtpEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for Signup',
    text: `Your OTP for signup is: ${otp}`,
  });
};

// Signup with OTP (Step 1)
const signupWithOtp = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if user already exists
    const userExists = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Store OTP in user_otps table (upsert)
    await db.query(
      `INSERT INTO user_otps (email, otp, created_at) VALUES ($1, $2, NOW())
       ON CONFLICT (email) DO UPDATE SET otp = $2, created_at = NOW()`,
      [email, otp]
    );
    // Send OTP email
    await sendOtpEmail(email, otp);
    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Verify OTP and create user (Step 2)
const verifyOtp = async (req, res) => {
  const { name, email, password, otp } = req.body;
  try {
    // Check OTP
    const otpRow = await db.query("SELECT * FROM user_otps WHERE email = $1", [email]);
    if (otpRow.rows.length === 0 || otpRow.rows[0].otp !== otp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create user
    const newUser = await db.query(
      "INSERT INTO users (username, email, password, is_superuser, signup_method) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, email, hashedPassword, false, 'email']
    );
    // Delete OTP after use
    await db.query("DELETE FROM user_otps WHERE email = $1", [email]);
    res.status(201).json({ message: "User registered successfully", user: newUser.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

const signup = async (req,res) => {
    const { name, email, password} = req.body;

    try {
        const userExists = await db.query("SELECT * FROM users where email = $1", [email]);
        if (userExists.rows.length>0){
            return res.status(400).json({message: "User already exists"});
        } 

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await db.query(
            "INSERT into users (username, email, password, is_superuser, signup_method) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [name, email, hashedPassword, false, 'email']
        );

        res.status(201).json({message: "User Registered successfully", user:newUser.rows[0]});
    } catch (error) {
        console.log(error);
        res.status(500).json({message: "Sever Error"});
    }
};


const login = async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);
      if (user.rows.length === 0) {
        return res.status(400).json({ message: "Invalid credentials" });
      }
  
      const isPasswordValid = await bcrypt.compare(password, user.rows[0].password);
      if (!isPasswordValid) return res.status(400).json({ message: "Invalid credentials" });
  
      const token = jwt.sign({ id: user.rows[0].user_id }, process.env.JWT_SECRET, { expiresIn: "5h" });
  
      res.status(200).json({
        token,
        name: user.rows[0].username,
        email: user.rows[0].email,
        profileImage: user.rows[0].profile_image || null,
        signupMethod: user.rows[0].signup_method || 'email',
        isSuperuser: user.rows[0].is_superuser || false
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server Error" });
    }
  };
  

// Google OAuth signup/login
const googleAuth = async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if user exists
    let user = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) {
      // Create new user with signup_method 'google' and profile_image
      const newUser = await db.query(
        "INSERT INTO users (username, email, password, is_superuser, signup_method, profile_image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [name, email, null, false, 'google', picture]
      );
      user = newUser;
    } else {
      // Update existing user's profile image if it's a Google login
      await db.query(
        "UPDATE users SET profile_image = $1 WHERE email = $2",
        [picture, email]
      );
    }
    // Generate JWT
    const jwtToken = jwt.sign({ id: user.rows[0].user_id }, process.env.JWT_SECRET, { expiresIn: "5h" });
    res.status(200).json({
      token: jwtToken,
      name: user.rows[0].username,
      email: user.rows[0].email,
      profileImage: picture,
      signupMethod: 'google',
      isSuperuser: user.rows[0].is_superuser || false
    });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Invalid Google token" });
  }
};

module.exports = {signup, login, googleAuth, signupWithOtp, verifyOtp};