import mongoose from 'mongoose';
import { getServiceEnvValue, isContainerRuntime } from './runtimeConfig.js';

export async function connectDB() {
  const mongoUri = getServiceEnvValue('MONGO_URI', 'INTERNAL_MONGO_URI');

  if (!mongoUri) {
    throw new Error('MONGO_URI is not configured.');
  }

  const maxRetries = 15;
  const initialDelayMs = 2000;
  const keepRetrying = isContainerRuntime();
  let attempt = 0;

  while (keepRetrying || attempt < maxRetries) {
    attempt += 1;
    try {
      await mongoose.connect(mongoUri);
      console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
      return;
    } catch (error) {
      const attemptLabel = keepRetrying ? `${attempt}/unbounded` : `${attempt}/${maxRetries}`;
      console.warn(`MongoDB connection attempt ${attemptLabel} failed. Retrying...`);

      if (!keepRetrying && attempt === maxRetries) {
        throw new Error('Failed to connect to MongoDB after multiple retries.');
      }

      const delay = Math.min(initialDelayMs * Math.pow(1.5, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
