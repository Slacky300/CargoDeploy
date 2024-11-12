import express, { Request, Response } from 'express';
import { createJob } from './controllers/k8job.js';
import logger from './logger.js';

const app = express();

app.use(express.json());

app.post('/deploy', async (req: Request, res: Response) => {
    const { git_url, project_id, root_folder, env_variables } = req.body; // Accepting env_variables
    try {
        await createJob(git_url, project_id, root_folder, env_variables); // Pass env_variables to createJob
        res.status(200).json({ message: 'Job Created Successfully' });
    } catch (err) {
        logger.error('Error creating job via API:', err);
        res.status(500).json({ message: 'Error Creating Job' });
    }
});

app.listen(8000, () => {
    logger.info('K8s Job Controller Running on port 8000');
});
