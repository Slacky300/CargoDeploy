import express, { Request, Response } from 'express';
import httpProxy from 'http-proxy';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 8090;

const BASE_PATH = process.env.S3_BUCKET_FOLDER_URL;
app.use(express.json());
const proxy = httpProxy.createProxyServer();


app.use((req: Request, res: Response) => {
    const hostname = req.hostname;
    const subdomain = hostname.split('.')[0];
    console.log('Subdomain:', subdomain);

    const resolvesTo = `${BASE_PATH}/${subdomain}`;

    // Check if the request URL has a file extension
    if (req.url && req.url.includes('.')) {
        proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
    } else {
        // Serve index.html for any route that does not include a file extension
        req.url = '/index.html';
        proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
    }
});

proxy.on('proxyReq', (proxyReq, req, res) => {
    // Adjust the path if it is the root URL
    if (proxyReq.path === '/') {
        proxyReq.path = '/index.html';
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Reverse Proxy Running on port ${PORT}`));