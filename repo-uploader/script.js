const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
const { S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = require("./constants");

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

const PROJECT_ID = process.env.PROJECT_ID;

async function init() {
  console.log("Executing script.js");
  const outDirPath = path.join(__dirname, "output");

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  p.stdout.on("data", function (data) {
    console.log(data.toString());
  });

  p.stdout.on("error", function (data) {
    console.log("Error", data.toString());
  });

  p.on("close", async function () {
    console.log("Build Complete");

    const possibleFolders = ["dist", "build"];
    let distFolderPath = null;
    for (const folder of possibleFolders) {
      const possibleFolderPath = path.join(__dirname, "output", folder);
      if (fs.existsSync(possibleFolderPath)) {
        distFolderPath = possibleFolderPath;
        break;
      }
    }
    if (!distFolderPath) {
      console.error("Neither 'dist' nor 'build' folder found!");
      return;
    }

    const distFolderContents = fs.readdirSync(distFolderPath, {
      recursive: true,
    });

    for (const file of distFolderContents) {
      const filePath = path.join(distFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) continue;

      console.log("Uploading", file);

      const command = new PutObjectCommand({
        Bucket: "build007-images",
        Key: `__outputs/${PROJECT_ID}/${file}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath),
      });
      try {
        await s3Client.send(command);
        console.log("Uploaded file", filePath);
      } catch (err) {
        console.error("Error uploading file:", err);
        throw err;
      }
    }
    console.log("Done...");
  });
}

init();
