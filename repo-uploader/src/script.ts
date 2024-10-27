import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";
import { fileURLToPath } from "url";
import { S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } from "./constants.js";

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
      await uploadDirectory(fullPath, s3Key);
    } else if (item.isFile()) {
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

async function buildInDocker(rootDir: string) {
  return new Promise<void>((resolve, reject) => {
    const buildCommand = `
      docker run --rm -v ${rootDir}:/app -w /app node:16-alpine sh -c "npm install && npm run build"
    `;

    const buildProcess = exec(buildCommand);

    if (!buildProcess.stdout || !buildProcess.stderr) {
      return reject(new Error("Failed to start the build process"));
    }

    buildProcess.stdout.on("data", (data: string) => {
      console.log(data.toString());
    });

    buildProcess.stderr.on("data", (data: string) => {
      console.error(data.toString());
    });

    buildProcess.on("close", (code: number) => {
      if (code !== 0) {
        return reject(new Error(`Build process exited with code ${code}`));
      }
      resolve();
    });
  });
}

async function init() {
  console.log("Executing script.js");
  const rootDirPath = path.join(__dirname, "../output");

  try {
    await buildInDocker(rootDirPath);

    console.log("Build Complete");

    const possibleFolders = ["dist", "build"];
    let distFolderPath: string | null = null;

    for (const folder of possibleFolders) {
      const possibleFolderPath = path.join(rootDirPath, folder);
      if (fs.existsSync(possibleFolderPath)) {
        distFolderPath = possibleFolderPath;
        break;
      }
    }

    if (!distFolderPath) {
      throw new Error("Neither 'dist' nor 'build' folder found!");
    }

    await uploadDirectory(distFolderPath, `__outputs/${PROJECT_ID}`);
    console.log("Upload Complete");
  } catch (err) {
    console.error("Process failed:", err);
  }
}

init().catch((err) => console.error("Initialization failed:", err));
