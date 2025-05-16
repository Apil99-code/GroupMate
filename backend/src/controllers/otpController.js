import OTP from '../models/OTP.js';
import { sendOTPEmail } from '../config/email.js';
import crypto from 'crypto';
import { generateToken } from '../utils/auth.js';

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email format
    if (!email.endsWith('@gmail.com')) {
      return res.status(400).json({ message: 'Only Gmail addresses are allowed' });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash the OTP before storing
    const hashedOTP = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');

    // Save OTP to database
    await OTP.create({
      email,
      otp: hashedOTP,
      type: 'reset'
    });

    // Send OTP via email
    const emailSent = await sendOTPEmail(email, otp);

    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send OTP email' });
    }

    res.status(200).json({ 
      message: 'OTP sent successfully',
      email: email
    });
  } catch (error) {
    console.error('Error in sendOTP:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find the OTP document
    const otpDoc = await OTP.findOne({ 
      email,
      type: 'reset'
    });

    if (!otpDoc) {
      return res.status(400).json({ message: 'OTP not found or expired' });
    }

    // Hash the provided OTP
    const hashedOTP = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');

    // Compare hashed OTPs
    if (hashedOTP !== otpDoc.otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Delete the used OTP
    await OTP.deleteOne({ _id: otpDoc._id });

    // Generate JWT token
    const token = generateToken({ email });

    res.status(200).json({ 
      message: 'OTP verified successfully',
      token
    });
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 