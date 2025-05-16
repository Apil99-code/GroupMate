import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import OTP from "../models/OTP.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import { sendOTPEmail } from "../config/email.js";
import crypto from "crypto";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    if (!email.endsWith('@gmail.com')) {
      return res.status(400).json({ message: "Only Gmail addresses are allowed" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    // Save OTP to database
    await OTP.create({
      email,
      otp: hashedOTP,
      fullName,
      password, // This will be hashed after OTP verification
      type: 'signup'
    });

    // Send OTP via email
    await sendOTPEmail(email, otp);

    res.status(200).json({ 
      message: "OTP sent successfully",
      email
    });
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifySignupOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    const otpRecord = await OTP.findOne({ 
      email, 
      otp: hashedOTP,
      type: 'signup'
    });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Create user after OTP verification
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(otpRecord.password, salt);

    const newUser = new User({
      fullName: otpRecord.fullName,
      email: otpRecord.email,
      password: hashedPassword,
    });

    await newUser.save();
    await OTP.deleteOne({ _id: otpRecord._id });

    // Generate JWT token
    generateToken(newUser._id, res);

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
    });
  } catch (error) {
    console.log("Error in verify signup OTP:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { username, bio, preferredDestinations, travelStyle, language, currency, theme, layout, notifications, profilePic } = req.body;
    const userId = req.user._id;

    const updateData = {
      username,
      bio,
      preferredDestinations,
      travelStyle,
      language,
      currency,
      theme,
      layout,
      notifications
    };

    // Only update profile picture if provided
    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      updateData.profilePic = uploadResponse.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.log("error in change password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
