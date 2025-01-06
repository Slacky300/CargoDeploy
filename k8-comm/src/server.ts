import express from 'express';
import jobRoutes from './routes/job.routes.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { connectDB } from './utils/dbConnect.js';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import cors from 'cors';

dotenv.config();

const app = express();

app.use(cors(
    {
        origin: '*'
    }
));

const PORT = process.env.PORT || 8080;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const subscriber = new Redis(REDIS_URL);

app.use(express.json());
app.use('/api/v1/jobs', jobRoutes);
app.use(errorHandler);


const isSubscriberConnected = async () => {
    return new Promise((resolve, reject) => {
        subscriber.on('connect', () => {
            console.log('Subscriber connected to Redis 🚀');
            resolve(true);
        });
        subscriber.on('error', (err) => {
            console.error('Subscriber failed to connect to Redis:', err);
            reject(err);
        });
    });
};

app.get('/', (req, res) => {
    res.json({ message: 'Cargo Deploy Job Server 🚚' });
});

const start = async () => {
    try {

        await isSubscriberConnected();

        subscriber.psubscribe('logs:*', (err, count) => {
            if (err) {
                throw new Error('Failed to subscribe to Redis channels.');
            }
            console.log(`Subscribed to ${count} Redis channels.`);
        });

        const server = app.listen(PORT, () => {
            console.log(`Job server started on port ${PORT} 🏃‍♂️`);
        });

        const io = new Server(server, { cors: { origin: '*' } });

        io.on('connection', (socket) => {
            
            console.log('Client connected to server' , socket.id);

            socket.on('join', (deploymentId) => {
                console.log(`Client joined deployment: ${deploymentId}`);
                socket.join(deploymentId);
                io.to(deploymentId).emit('logUpdate', { deploymentId, logs: 'Client joined the deployment' });
            });
        
            socket.on('disconnect', (deploymentId) => {
                console.log(`Client disconnected from deployment: ${deploymentId}`);
            });
        });
        
        // Move the subscriber event listener outside to avoid duplication
        subscriber.on('pmessage', (pattern, channel, message) => {
            const deploymentId = channel.split(':')[1];
            console.log(`Sending logs to deployment: ${deploymentId}`);
            io.to(deploymentId).emit('logUpdate', { deploymentId, logs: message });
        });
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('Shutting down server...');
            await subscriber.quit();
            process.exit(0);
        });
        
     

    } catch (err: any) {
        console.error('Error during server startup:', err.message);
        process.exit(1); // Terminate the process on critical error
    }
};

start();
