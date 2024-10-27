import express, { Request, Response } from 'express';
import httpProxy from 'http-proxy';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 8090;

const BASE_PATH = process.env.S3_BUCKET_FOLDER_URL;

const proxy = httpProxy.createProxyServer();

app.use((req: Request, res: Response) => {
    const hostname = req.hostname;
    const subdomain = hostname.split('.')[0];
    if(subdomain === 'cargodeploy'){
        return res.send('Welcome to Cargo Deploy');
    }
    console.log('Subdomain:', subdomain);

    const resolvesTo = `${BASE_PATH}/${subdomain}`;

    proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
});

// @ts-ignore: Ignore TypeScript type checking for this block
proxy.on('proxyReq', (proxyReq, req, res) => {
    const url = req.url;
    if (url === '/') {
        proxyReq.path += 'index.html';
    }
});

app.listen(PORT, () => console.log(`Reverse Proxy Running on port ${PORT}`));