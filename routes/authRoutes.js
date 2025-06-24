const express = require("express");
const { signup, login, googleAuth, signupWithOtp, verifyOtp } = require("../controllers/authController");
const { getProfile, upsertProfile, getAllUsers } = require("../controllers/profileController");
const { deleteUserData, getUserProfile, getUserProfileById } = require("../controllers/userController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/signup-otp", signupWithOtp);
router.post("/verify-otp", verifyOtp);
router.get("/profile", authenticate, getProfile);
router.post("/profile", authenticate, upsertProfile);
router.get("/users", authenticate, getAllUsers);

// New routes for user data management
router.delete("/user/data/:id", authenticate, deleteUserData);
router.get("/user/profile", authenticate, getUserProfile);
router.get("/user/profile/:id", authenticate, getUserProfileById);

module.exports = router;