require('dotenv').config();

const S3_REGION = process.env.S3_REGION;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;

module.exports = {
    S3_REGION,
    S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY,
};