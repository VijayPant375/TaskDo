import mongoose from 'mongoose';

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    throw new Error('MONGO_URI is not configured.');
  }

  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
