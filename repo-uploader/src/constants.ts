import dotenv from 'dotenv';

dotenv.config();

export const S3_REGION: string = process.env.S3_REGION || '';
export const S3_ACCESS_KEY_ID: string = process.env.S3_ACCESS_KEY || '';
export const S3_SECRET_ACCESS_KEY: string = process.env.S3_SECRET_ACCESS_KEY || '';
export const REDIS_URL: string = process.env.REDIS_URL || '';



if (!S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  throw new Error('One or more required environment variables are missing.');
}
