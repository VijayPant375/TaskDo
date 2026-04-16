import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, index: true },
  password: { type: String, default: null },
  googleId: { type: String, default: null, index: true, sparse: true },
  isOAuthUser: { type: Boolean, default: false },
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
