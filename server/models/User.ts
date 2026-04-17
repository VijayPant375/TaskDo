import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, index: true, trim: true, lowercase: true },
  username: { type: String, unique: true, required: true, index: true, trim: true },
  password: { type: String, default: null, select: false },
  googleId: { type: String, default: null, index: true, sparse: true },
  isOAuthUser: { type: Boolean, default: false },
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String, default: null, select: false },
  createdAt: { type: Date, default: Date.now }
});

userSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.mfaSecret;
    return ret;
  }
});

export const User = mongoose.model('User', userSchema);
