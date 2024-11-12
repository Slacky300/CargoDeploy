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
      // Recursively upload the directory
      await uploadDirectory(fullPath, s3Key);
    } else if (item.isFile()) {
      // Upload the file
      console.log("Uploading", fullPath);

      const command = new PutObjectCommand({
        Bucket: "build007-images",
        Key: s3Key,
        Body: fs.createReadStream(fullPath),
        ContentType: mime.lookup(fullPath) || undefined,
      });

      try {
        await s3Client.send(command);
        console.log("Uploaded file", fullPath);
      } catch (err) {
        console.error("Error uploading file:", err);
        throw err;
      }
    }
  }
}

async function init() {
  console.log("Executing script.js");
  const outDirPath = path.join(__dirname, "../output");

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  if (!p.stdout || !p.stderr) {
    console.error("Failed to start the build process");
    return;
  }

  p.stdout.on("data", (data: string) => {
    console.log(data.toString());
  });

  p.stderr.on("error", (error: ExecException | null, data: string) => {
    console.error("Error", data.toString(), error);
  });

  p.on("close", async (code: number) => {
    if (code !== 0) {
      console.error(`Build process exited with code ${code}`);
      return;
    }

    console.log("Build Complete");

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
      console.error("Neither 'dist' nor 'build' folder found!");
      return;
    }

    await uploadDirectory(distFolderPath, `__outputs/${PROJECT_ID}`);

    console.log("Done...");
  });
}

init().catch((err) => console.error("Initialization failed:", err));