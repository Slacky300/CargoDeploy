import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";
import { S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } from "./constants.js";
import dotenv from "dotenv";
dotenv.config();
console.log("Importing from path:", path.resolve(__dirname, './constants'));
const s3Client = new S3Client({
    region: S3_REGION,
    credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
});
const PROJECT_ID = process.env.PROJECT_ID;
async function init() {
    console.log("🚀 Starting deployment process...");
    const outDirPath = path.join(process.cwd(), "output");
    console.log(`📁 Navigating to output directory: ${outDirPath}`);
    const p = exec(`cd ${outDirPath} && npm install && npm run build`);
    if (p.stdout) {
        p.stdout.on("data", (data) => {
            console.log(`🛠️ [Build Output]: ${data.toString()}`);
        });
    }
    if (p.stderr) {
        p.stderr.on("data", (data) => {
            console.error(`❌ [Build Error]: ${data.toString()}`);
        });
    }
    p.on("close", async (code) => {
        if (code === 0) {
            console.log("✅ Build completed successfully.");
        }
        else {
            console.error(`⚠️ Build process exited with code ${code}.`);
            return;
        }
        const possibleFolders = ["dist", "build"];
        let distFolderPath = null;
        console.log("🔍 Searching for build output folder...");
        for (const folder of possibleFolders) {
            const possibleFolderPath = path.join(process.cwd(), "output", folder);
            if (fs.existsSync(possibleFolderPath)) {
                distFolderPath = possibleFolderPath;
                console.log(`📂 Found output folder: ${folder}`);
                break;
            }
        }
        if (!distFolderPath) {
            console.error("❌ Error: Neither 'dist' nor 'build' folder found!");
            return;
        }
        const distFolderContents = fs.readdirSync(distFolderPath);
        console.log(`📦 Found ${distFolderContents.length} files to upload.`);
        for (const file of distFolderContents) {
            const filePath = path.join(distFolderPath, file);
            if (fs.lstatSync(filePath).isDirectory())
                continue;
            console.log(`☁️ Uploading file: ${file}`);
            const command = new PutObjectCommand({
                Bucket: "build007-images",
                Key: `__outputs/${PROJECT_ID}/${file}`,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath) || undefined,
            });
            try {
                await s3Client.send(command);
                console.log(`✅ Successfully uploaded file: ${filePath}`);
            }
            catch (err) {
                console.error(`❌ Error uploading file '${file}':`, err);
                throw err;
            }
        }
        console.log("🎉 All files uploaded successfully. Deployment process completed.");
    });
}
init().catch((err) => {
    console.error("❌ Deployment process encountered an error:", err);
});
