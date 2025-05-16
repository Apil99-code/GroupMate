import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(v);
      },
      message: props => `${props.value} is not a valid Gmail address!`
    }
  },
  otp: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: false
  },
  password: {
    type: String,
    required: false
  },
  type: {
    type: String,
    enum: ['signup', 'login', 'reset'],
    default: 'signup'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // Document will be automatically deleted after 5 minutes
  }
});

// Create index on email for faster lookups
otpSchema.index({ email: 1 });

// Create TTL index on createdAt for automatic document deletion
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

const OTP = mongoose.model('OTP', otpSchema);

export default OTP; 