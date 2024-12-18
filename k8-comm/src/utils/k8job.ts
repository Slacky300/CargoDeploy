import k8s from '@kubernetes/client-node';
import { v4 as uuidv4 } from 'uuid';
import logger from '../logger.js';
import dotenv from 'dotenv';
import Redis from "ioredis";

dotenv.config();

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const batchApi = kc.makeApiClient(k8s.BatchV1Api);
const coreApi = kc.makeApiClient(k8s.CoreV1Api);

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");


redis.on('connect', () => {
    console.log('Publisher connected to Redis 🚀');
});

const publishLogs = async (slug: string, logs: any) => {
    try {
        const chunkSize = 1024; 
        for (let i = 0; i < logs.length; i += chunkSize) {
            const chunk = logs.slice(i, i + chunkSize);
            await redis.publish(slug, chunk);
        }
    } catch (error) {
        logger.error('Error publishing logs to Redis:', error);
    }
};

const getContainerLogs = async (podNamespace: string, podName: string, containerName: string, channelName: string) => {
    try {
        const podLogs = await coreApi.readNamespacedPodLog(podName, podNamespace, containerName, true);
        logger.info(`Logs from container ${containerName} in pod ${podName}:\n${podLogs.body}`);
        publishLogs(channelName, `Logs from container ${containerName} in pod ${podName}:\n${podLogs.body}`);
    } catch (error) {
        logger.error(`Error fetching logs for container ${containerName}:`, error);
    }
};

const getPodName = async (jobName: string): Promise<string> => {
    try {
        const labelSelector = `job-name=${jobName}`;
        const pods = await coreApi.listNamespacedPod('default', undefined, undefined, undefined, undefined, labelSelector);

        if (pods.body.items.length === 0) {
            logger.error('No pods found for the job');
            return '';
        }

        return pods.body.items[0].metadata?.name || '';
    } catch (error) {
        logger.error('Error fetching pod name:', error);
        return '';
    }
};

const waitForPodReady = async (podName: string, namespace = 'default', channelName: string) => {
    let podReady = false;
    while (!podReady) {
        const pod = await coreApi.readNamespacedPod(podName, namespace);
        const phase = pod.body.status?.phase;
        const containerStatuses = pod.body.status?.containerStatuses || [];
        const containersReady = containerStatuses.every(status => status.ready);

        if (phase === 'Running' && containersReady) {
            podReady = true;
        } else if (phase === 'Succeeded' || phase === 'Failed') {
            // Pod has completed or failed, stop waiting
            podReady = true;
        } else {
            logger.info(`Waiting for pod ${podName} to be ready...`);
            publishLogs(channelName, `Waiting for pod ${podName} to be ready...`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
        }
    }
};

const getPodLogs = async (podName: string, project_id: string): Promise<void> => {
    try {
        if (!podName) {
            logger.error('Pod name is undefined');
            return;
        }

        await waitForPodReady(podName, 'default', project_id);

        const logs = await coreApi.readNamespacedPodLog(podName, 'default');
        logger.info(`Logs from pod ${podName}:\n${logs.body}`);
    } catch (error) {
        logger.error('Error fetching pod logs:', error);
        throw error;
    }
};

export const createJob = async (
    git_url: string,
    project_id: string,
    root_folder: string,
    env_variables: Array<{ name: string, value: string }>,
    branch: string,
    access_token?: string,
): Promise<void> => {
    const uniqueId = uuidv4();
    const jobName = `s3-upload-job-${uniqueId}`;
    const containerName: string = `s3-upload-container-${uniqueId}`
    const channelName = `logs:${project_id}`;


    const job = {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: {
            name: jobName,
        },
        spec: {


            template: {
                metadata: {
                    labels: {
                        'job-name': jobName,
                    },
                },
                spec: {
                    containers: [
                        {
                            name: containerName,
                            image: process.env.IMAGE_NAME,
                            env: [
                                { name: 'GIT_REPOSITORY_URL', value: git_url },
                                { name: 'PROJECT_ID', value: project_id },
                                { name: 'SOURCE_DIRECTORY', value: root_folder },
                                { name: 'BRANCH', value: branch },
                                { name: 'ACCESS_TOKEN', value: access_token },
                                ...env_variables.map(envVar => ({ name: envVar.name, value: envVar.value }))
                            ],
                        },
                    ],
                    restartPolicy: 'Never',
                },
            },
            backoffLimit: 4,
        },
    };

    try {
        await batchApi.createNamespacedJob('default', job);
        logger.info(`Job ${jobName} created successfully`);
        publishLogs(channelName, `Job ${jobName} created successfully`);

        const podName = await getPodName(jobName);
        if (!podName) {
            throw new Error('Pod name is undefined');
        }

        await getPodLogs(podName, project_id);
        await getContainerLogs('default', podName, containerName, channelName);

    } catch (err) {
        logger.error('Error creating Job:', err);
        throw err;
    }
};
