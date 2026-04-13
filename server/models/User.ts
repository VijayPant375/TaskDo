import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, index: true },
  username: { type: String, unique: true, required: true, index: true },
  password: String,
  googleId: String,
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);
