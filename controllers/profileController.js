const db = require("../config/db");

const getProfile = async (req, res) => {
  try {
    // req.user is set by authenticate middleware (user id from JWT)
    const userId = req.user.id;
    // Get user info
    const userRes = await db.query("SELECT username, email, signup_method, profile_image FROM users WHERE user_id = $1", [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: "User not found" });
    const user = userRes.rows[0];
    // Get profile info
    const profileRes = await db.query("SELECT about_me, contact_number, company_name, last_login FROM user_profiles WHERE email = $1", [user.email]);
    const profile = profileRes.rows[0] || {};
    res.json({
      username: user.username,
      email: user.email,
      signup_method: user.signup_method,
      profile_image: user.profile_image || null,
      last_login: profile.last_login || null,
      about_me: profile.about_me || "",
      contact_number: profile.contact_number || "",
      company_name: profile.company_name || "",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

const upsertProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { about_me, contact_number, company_name } = req.body;
    // Get user email
    const userRes = await db.query("SELECT email FROM users WHERE user_id = $1", [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: "User not found" });
    const email = userRes.rows[0].email;
    // Upsert profile
    await db.query(
      `INSERT INTO user_profiles (email, about_me, contact_number, company_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET about_me = $2, contact_number = $3, company_name = $4`,
      [email, about_me, contact_number, company_name]
    );
    res.json({ message: "Profile updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all users (superuser only)
const getAllUsers = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user is superuser
    const userRes = await db.query("SELECT is_superuser FROM users WHERE user_id = $1", [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: "User not found" });
    
    if (!userRes.rows[0].is_superuser) {
      return res.status(403).json({ message: "Access denied. Superuser required." });
    }
    
    // Get all users with their basic info
    const usersRes = await db.query(`
      SELECT 
        user_id,
        username,
        email,
        signup_method,
        is_superuser,
        created_at
      FROM users 
      ORDER BY created_at DESC
    `);
    
    res.json(usersRes.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { getProfile, upsertProfile, getAllUsers }; 