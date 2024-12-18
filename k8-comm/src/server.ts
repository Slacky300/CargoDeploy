import express from 'express';
import jobRoutes from './routes/job.routes.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { connectDB } from './utils/dbConnect.js';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 8080;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cargodeploy';

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

const start = async () => {
    try {
        await connectDB(MONGODB_URI);
        console.log('Connected to MongoDB!');

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
            const { projectId } = socket.handshake.query;
            if (!projectId) {
                console.warn('Client connected without projectId. Disconnecting...');
                socket.disconnect(true);
                return;
            }

            socket.join(projectId);
            console.log(`Client connected to logs for project: ${projectId}`);

            socket.on('disconnect', () => {
                console.log(`Client disconnected from logs of project: ${projectId}`);
            });
        });

        subscriber.on('pmessage', (pattern, channel, message) => {
            const projectId = channel.split(':')[1]; // Extract projectId from channel
            io.to(projectId).emit('logUpdate', { projectId, logs: message });
        });

    } catch (err: any) {
        console.error('Error during server startup:', err.message);
        process.exit(1); // Terminate the process on critical error
    }
};

start();
