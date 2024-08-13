import dotenv from 'dotenv';
dotenv.config();
export const S3_REGION = process.env.S3_REGION || '';
export const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || '';
export const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || '';
console.log('S3_REGION:', S3_REGION);
console.log('S3_ACCESS_KEY_ID:', S3_ACCESS_KEY_ID);
console.log('S3_SECRET_ACCESS_KEY:', S3_SECRET_ACCESS_KEY);
console.log(process.env.S3_REGION);
console.log(process.env.S3_ACCESS_KEY_ID);
console.log(process.env.S3_SECRET_ACCESS_KEY);
if (!S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error('One or more required environment variables are missing.');
}
