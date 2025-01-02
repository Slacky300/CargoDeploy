import { exec, ExecException } from "child_process";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";
import { fileURLToPath } from "url";
import { S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } from "./constants.js";

// Recreate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

const PROJECT_ID = process.env.PROJECT_ID as string;

async function uploadDirectory(directoryPath: string, s3Prefix: string) {
  const items = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(directoryPath, item.name);
    const s3Key = path.join(s3Prefix, item.name).replace(/\\/g, "/");

    if (item.isDirectory()) {
      console.log(`📂 Processing directory: ${item.name}`);
      await uploadDirectory(fullPath, s3Key);
    } else if (item.isFile()) {
      console.log(`📄 Uploading file: ${item.name}`);

      const command = new PutObjectCommand({
        Bucket: "build007-images",
        Key: s3Key,
        Body: fs.createReadStream(fullPath),
        ContentType: mime.lookup(fullPath) || undefined,
      });

      try {
        await s3Client.send(command);
        console.log(`✅ Successfully uploaded: ${item.name}`);
      } catch (err) {
        console.error(`❌ Failed to upload: ${item.name}`);
        throw err;
      }
    }
  }
}

async function init() {
  console.log("🚀 Starting deployment process...");

  const outDirPath = path.join(__dirname, "../output");

  console.log("🔄 Running build process. Please wait...");
  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  if (!p.stdout || !p.stderr) {
    console.error("⚠️ Failed to initialize the build process. Please check your setup.");
    return;
  }

  p.stdout.on("data", (data: string) => {
    console.log(`ℹ️ Build log: ${data.toString()}`);
  });

  p.stderr.on("data", (data: string) => {
    console.error(`⚠️ Build error: ${data.toString()}`);
  });

  p.on("close", async (code: number) => {
    if (code !== 0) {
      console.error(`❌ Build process exited with code ${code}. Please check the logs for more details.`);
      return;
    }

    console.log("✅ Build process completed successfully.");

    const possibleFolders = ["dist", "build"];
    let distFolderPath: string | null = null;

    for (const folder of possibleFolders) {
      const possibleFolderPath = path.join(__dirname, "../output", folder);
      if (fs.existsSync(possibleFolderPath)) {
        distFolderPath = possibleFolderPath;
        break;
      }
    }

    if (!distFolderPath) {
      console.error("⚠️ Deployment folder not found! Ensure the build script generates a 'dist' or 'build' folder.");
      return;
    }

    console.log(`📂 Found build folder: ${distFolderPath}`);
    console.log("🔄 Uploading files to the cloud. This may take a moment...");

    try {
      await uploadDirectory(distFolderPath, `__outputs/${PROJECT_ID}`);
      console.log("✅ All files successfully uploaded to the cloud.");
    } catch (err) {
      console.error("❌ An error occurred during the upload process. Please try again.");
    }

    console.log("🎉 Deployment process completed!");
  });
}

init().catch((err) => console.error("❌ Deployment initialization failed:", err));
