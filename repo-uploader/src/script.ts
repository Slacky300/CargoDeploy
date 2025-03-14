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
  credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
});

const PROJECT_ID = process.env.PROJECT_ID as string;
const ALLOWED_COMMANDS = ["vite build", "react-scripts build", "next build"];

function isValidCommand(cmd: string, packageJson: any): boolean {
  return (
    ALLOWED_COMMANDS.some(allowedCmd => cmd.includes(allowedCmd)) &&
    packageJson.scripts &&
    Object.values(packageJson.scripts).some(script => typeof script === 'string' && script.includes(cmd))
  );
}

async function validateAndRunBuild() {
  console.log("🚀 Validating build environment...");
  
  // The output directory is where exec.sh copied the source files
  const outputPath = path.join("/home/app/output");
  console.log(`📂 Output directory: ${outputPath}`);
  
  const packageJsonPath = path.join(outputPath, "package.json");
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error("❌ package.json not found! Ensure this is a frontend project.");
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const buildCommand = packageJson.scripts?.build;

  if (!buildCommand || !isValidCommand(buildCommand, packageJson)) {
    console.error("⚠️ Invalid or unsafe build command. Only frontend build scripts are allowed!");
    return;
  }
  
  console.log("🔄 Running secure build process...");
  const p = exec(`cd ${outputPath} && npm install && npm run build`);

  p.stdout?.on("data", (data) => console.log(`ℹ️ Build log: ${data}`));
  p.stderr?.on("data", (data) => console.error(`⚠️ Build error: ${data}`));
  
  p.on("close", async (code) => {
    if (code !== 0) {
      console.error(`❌ Build process failed with code ${code}`);
      return;
    }
    console.log("✅ Build completed successfully.");
    await uploadBuildFiles();
  });
}

async function uploadBuildFiles() {
  const distPaths = ["dist", "build", "out", ".next"];
  const outputPath = "/home/app/output";
  let buildFolder = distPaths.map(f => path.join(outputPath, f)).find(fs.existsSync);

  if (!buildFolder) {
    console.error("⚠️ No valid build output found!");
    return;
  }

  console.log(`📂 Found build folder: ${buildFolder}, uploading to S3...`);
  try {
    await uploadDirectory(buildFolder, `__outputs/${PROJECT_ID}`);
    console.log("✅ Upload complete!");
  } catch (err) {
    console.error("❌ Upload failed:", err);
  }
}

async function uploadDirectory(directoryPath: string, s3Prefix: string) {
  for (const item of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const fullPath = path.join(directoryPath, item.name);
    const s3Key = path.join(s3Prefix, item.name).replace(/\\/g, "/");

    if (item.isDirectory()) {
      await uploadDirectory(fullPath, s3Key);
    } else {
      console.log(`📄 Uploading ${item.name}...`);
      try {
        await s3Client.send(new PutObjectCommand({
          Bucket: "build007-images",
          Key: s3Key,
          Body: fs.createReadStream(fullPath),
          ContentType: mime.lookup(fullPath) || undefined,
        }));
        console.log(`✅ Uploaded: ${item.name}`);
      } catch (err) {
        console.error(`❌ Failed to upload: ${item.name}`, err);
      }
    }
  }
}

validateAndRunBuild().catch(err => console.error("❌ Deployment failed:", err));