import mongoose from 'mongoose';

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    throw new Error('MONGO_URI is not configured.');
  }

  const maxRetries = 15;
  const initialDelayMs = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(mongoUri);
      console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
      return;
    } catch (error) {
      console.warn(`MongoDB connection attempt ${attempt}/${maxRetries} failed. Retrying...`);
      if (attempt === maxRetries) {
        throw new Error('Failed to connect to MongoDB after multiple retries.');
      }
      const delay = Math.min(initialDelayMs * Math.pow(1.5, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
