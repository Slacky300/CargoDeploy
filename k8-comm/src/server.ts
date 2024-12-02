import express from 'express';
import authRoutes from './routes/auth.routes.js';
import jobRoutes from './routes/job.routes.js'
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { connectDB } from './utils/dbConnect.js';


const app = express();

const PORT = process.env.PORT ?? 8080;

app.use(express.json());


app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use(errorHandler);



const start = async () => {
    try {
        await connectDB('mongodb://localhost:27017/cargodeploy');
        console.log("Connected to Mongodb, but what's the purpose? 🤡")
        app.listen(PORT, () => {
            console.log(`Job server started at ${PORT} 🏃‍♂️🏃‍♂️`)
        });
    } catch (err) {
        console.error("Failed to connect to MONGODB, BYEBYE ⚰️");
        process.exit(1);
    }
}

start();