const db = require("../config/db");

// Delete user data by ID
const deleteUserData = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is trying to delete their own data or is a superuser
    const currentUserRes = await db.query("SELECT is_superuser FROM users WHERE user_id = $1", [userId]);
    if (currentUserRes.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const isSuperuser = currentUserRes.rows[0].is_superuser;
    
    if (!isSuperuser && parseInt(id) !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. You can only delete your own data or must be a superuser." 
      });
    }

    // Find the user to delete
    const userToDeleteRes = await db.query("SELECT * FROM users WHERE user_id = $1", [id]);
    
    if (userToDeleteRes.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Delete the user
    await db.query("DELETE FROM users WHERE user_id = $1", [id]);

    res.status(200).json({ 
      success: true, 
      message: "User data deleted successfully" 
    });

  } catch (error) {
    console.error("Error deleting user data:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

// Get user profile details with login method and associated data
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find user with all associated data
    const userRes = await db.query(`
      SELECT 
        user_id,
        username, 
        email, 
        is_superuser as role, 
        signup_method, 
        profile_image, 
        created_at, 
        updated_at
      FROM users 
      WHERE user_id = $1
    `, [userId]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const user = userRes.rows[0];

    // Get additional user data based on signup method
    let additionalData = {};
    
    if (user.signup_method === 'email') {
      // For email users, you might want to include additional fields
      additionalData = {
        emailVerified: true, // Assuming OTP verification means email is verified
        lastLogin: user.updated_at
      };
    } else if (user.signup_method === 'google') {
      // For Google users, you might want to include Google-specific data
      additionalData = {
        googleVerified: true,
        lastLogin: user.updated_at
      };
    }

    // Get profile data if exists
    const profileRes = await db.query("SELECT about_me, contact_number, company_name FROM user_profiles WHERE email = $1", [user.email]);
    const profile = profileRes.rows[0] || {};

    // Combine user data with additional data
    const userProfile = {
      id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role ? 'superuser' : 'user',
      signupMethod: user.signup_method,
      profileImage: user.profile_image,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      aboutMe: profile.about_me || "",
      contactNumber: profile.contact_number || "",
      companyName: profile.company_name || "",
      ...additionalData
    };

    res.status(200).json({ 
      success: true, 
      data: userProfile 
    });

  } catch (error) {
    console.error("Error getting user profile:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

// Get user profile by user_id (with authorization)
const getUserProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    // Check if user is trying to access their own profile or is a superuser
    const currentUserRes = await db.query("SELECT is_superuser FROM users WHERE user_id = $1", [currentUserId]);
    if (currentUserRes.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Current user not found" 
      });
    }

    const isSuperuser = currentUserRes.rows[0].is_superuser;
    
    // Allow access if user is requesting their own profile or is a superuser
    if (!isSuperuser && parseInt(id) !== currentUserId) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. You can only view your own profile or must be a superuser." 
      });
    }

    // Find user with all associated data
    const userRes = await db.query(`
      SELECT 
        user_id,
        username, 
        email, 
        is_superuser as role, 
        signup_method, 
        profile_image, 
        created_at, 
        updated_at
      FROM users 
      WHERE user_id = $1
    `, [id]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const user = userRes.rows[0];

    // Get additional user data based on signup method
    let additionalData = {};
    
    if (user.signup_method === 'email') {
      additionalData = {
        emailVerified: true,
        lastLogin: user.updated_at
      };
    } else if (user.signup_method === 'google') {
      additionalData = {
        googleVerified: true,
        lastLogin: user.updated_at
      };
    }

    // Get profile data if exists
    const profileRes = await db.query("SELECT about_me, contact_number, company_name FROM user_profiles WHERE email = $1", [user.email]);
    const profile = profileRes.rows[0] || {};

    // Combine user data with additional data
    const userProfile = {
      id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role ? 'superuser' : 'user',
      signupMethod: user.signup_method,
      profileImage: user.profile_image,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      aboutMe: profile.about_me || "",
      contactNumber: profile.contact_number || "",
      companyName: profile.company_name || "",
      ...additionalData
    };

    res.status(200).json({ 
      success: true, 
      data: userProfile 
    });

  } catch (error) {
    console.error("Error getting user profile by ID:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

module.exports = {
  deleteUserData,
  getUserProfile,
  getUserProfileById
}; 