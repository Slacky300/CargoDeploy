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

console.log(process.env.IMAGE_NAME);
const logsToPublish: string[] = [];

redis.on('connect', () => {
    console.log('Publisher connected to Redis 🚀');
});

const triggerWebHookForSendingMails = async (status: string) => {
    try {
        const res = await fetch(`${process.env.N8N_WEBHOOK_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: status,
                subject: `Deployment ${status.toUpperCase()}`,
                body: `<!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Deployment Status Update</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background-color: #f9f9f9;
                            margin: 0;
                            padding: 0;
                            color: #333;
                        }
                        .container {
                            max-width: 600px;
                            margin: 20px auto;
                            background-color: #fff;
                            border: 1px solid #ddd;
                            border-radius: 8px;
                            overflow: hidden;
                            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                        }
                        .header {
                            background-color: #333;
                            color: #fff;
                            text-align: center;
                            padding: 20px;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 24px;
                            letter-spacing: 1px;
                        }
                        .content {
                            padding: 20px;
                        }
                        .content h2 {
                            color: #333;
                            font-size: 20px;
                            margin-bottom: 10px;
                        }
                        .content p {
                            line-height: 1.6;
                            margin: 0 0 10px;
                        }
                        .highlight {
                            font-weight: bold;
                            color: #000;
                        }
                        .status {
                            display: inline-block;
                            padding: 10px 20px;
                            font-size: 18px;
                            border-radius: 4px;
                            margin: 20px 0;
                        }
                        .status.success {
                            background-color: #4caf50;
                            color: #fff;
                        }
                        .status.failed {
                            background-color: #f44336;
                            color: #fff;
                        }
                        .footer {
                            text-align: center;
                            font-size: 14px;
                            color: #888;
                            padding: 10px;
                            border-top: 1px solid #ddd;
                            background-color: #f9f9f9;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Deployment Notification</h1>
                        </div>
                        <div class="content">
                            <h2>Hello,</h2>
                            <p>We wanted to inform you about the recent status of your deployment:</p>
                            <div class="status {{status.toLowerCase()}}">
                                Deployment <span class="highlight">{{status.toUpperCase()}}</span>
                            </div>
                            <p>If you have any questions or need assistance, please don't hesitate to reach out to us.</p>
                            <p>Thank you for choosing our service.</p>
                        </div>
                        <div class="footer">
                            &copy; 2025 Deployment Service. All rights reserved.
                        </div>
                    </div>
                </body>
                </html>
                `
            })
        })
    } catch (error) {
        logger.error('Error triggering webhook:', error);
    }
}

const saveLogsToDatabase = async (logs: string[], deploymentId: string) => {
    try {
        const res = await fetch(`${process.env.FRONTEND_URL}/api/logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': `${process.env.CLERK_KEY}`
            },
            body: JSON.stringify({ logs, deploymentId })
        });
        const data = await res.json();
        if (res.status === 201) {
            console.log(data);
        } else {
            console.log(data);
            console.log('Error saving logs to database');
        }
    } catch (error) {
        logger.error('Error saving logs to database:', error);
    }
}

const publishLogs = async (slug: string, logs: any) => {
    try {
        const chunkSize = 1024;
        for (let i = 0; i < logs.length; i += chunkSize) {
            const chunk = logs.slice(i, i + chunkSize);
            await redis.publish(slug, chunk);
            logsToPublish.push(chunk);
        }
    } catch (error) {
        logger.error('Error publishing logs to Redis:', error);
    }
};

const streamContainerLogs = async (namespace: string, podName: string, containerName: string, channelName: string) => {
    try {
        const logStream = new k8s.Log(kc);
        const logOptions = {
            follow: true,
            tailLines: 10,
        };

        const log = await logStream.log(namespace, podName, containerName, process.stdout, logOptions);

        log.on('data', async (chunk: any) => {
            const logData = chunk.toString('utf8');
            logger.info(logData);
            await publishLogs(channelName, logData);
        });

        log.on('error', async (error: any) => {
            logger.error(`Error streaming logs for container ${containerName}:`, error);
            await publishLogs(channelName, `Error streaming logs: ${error.message}`);
            await updateDeploymentStatus(channelName, channelName.split(":")[1], "FAILED");
        });

        log.on('end', async () => {
            const pod = await coreApi.readNamespacedPod(podName, namespace);
            if (pod.body.status?.phase === 'Failed') {
                logger.error(`Pod ${podName} failed.`);
                await publishLogs(channelName, `Pod ${podName} failed.`);
                await updateDeploymentStatus(channelName, channelName.split(":")[1], "FAILED");
                await triggerWebHookForSendingMails("failed");
            } else {
                logger.info(`Finished streaming logs for container ${containerName}`);
                await saveLogsToDatabase(logsToPublish, channelName.split(":")[1]);
                await updateDeploymentStatus(channelName, channelName.split(":")[1], "SUCCESS");
                await triggerWebHookForSendingMails("success");
            }
        });
    } catch (error) {
        logger.error(`Error streaming logs for container ${containerName}:`, error);
        await updateDeploymentStatus(channelName, channelName.split(":")[1], "FAILED");
        await triggerWebHookForSendingMails("failed");
    }
};

const getPodName = async (jobName: string, retries = 5, delay = 5000): Promise<string> => {
    try {
        const labelSelector = `job-name=${jobName}`;
        for (let i = 0; i < retries; i++) {
            const pods = await coreApi.listNamespacedPod('default', undefined, undefined, undefined, undefined, labelSelector);

            if (pods.body.items.length > 0) {
                return pods.body.items[0].metadata?.name || '';
            }

            logger.info(`No pods found for the job ${jobName}. Retrying (${i + 1}/${retries})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        logger.error(`No pods found for the job ${jobName} after ${retries} retries.`);
        return '';
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
        } else if (phase === 'Succeeded') {
            podReady = true;
        } else if (phase === 'Failed') {
            logger.error(`Pod ${podName} failed.`);
            await publishLogs(channelName, `Pod ${podName} failed.`);
            await updateDeploymentStatus(channelName, channelName.split(":")[1], "FAILED");
            await triggerWebHookForSendingMails("failed");
            throw new Error(`Pod ${podName} failed.`);
        } else {
            logger.info(`Waiting for pod ${podName} to be ready...`);
            await publishLogs(channelName, `Waiting for pod ${podName} to be ready...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
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
        await updateDeploymentStatus(`logs:${project_id}`, project_id, "FAILED");
        await triggerWebHookForSendingMails("failed");
        throw error;
    }
};


const updateDeploymentStatus = async (channelName: string, deploymentId: string, status: string): Promise<void> => {
    try {
        const nextResult = await fetch(`${process.env.FRONTEND_URL}/api/deployment?deploymentIdWithStatus=${deploymentId}-${status}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": `${process.env.CLERK_KEY}`
            },
        });
        const nextData = await nextResult.json();
        if (nextResult.status === 200) {
            console.log(nextData);
            publishLogs(channelName, `${status}`);
        }
    } catch (error) {
        logger.error('Error updating deployment status:', error);
        throw error;
    }
}

export const createJob = async (
    git_url: string,
    project_id: string,
    root_folder: string,
    env_variables: { name: string, value: string }[],
    branch: string,
    deploymentId: string,
    access_token?: string,
    name?: string,
): Promise<void> => {
    const uniqueId = uuidv4();
    const jobName = `s3-upload-job-${uniqueId}`;
    const containerName: string = `s3-upload-container-${uniqueId}`;
    const channelName = `logs:${deploymentId}`;

    console.log("project_name", name);

    console.log('Creating job:', jobName);
    console.log("channelName", channelName);

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
                            image: process.env.IMAGE_NAME || "rehman300/container-deploy:v0.7",
                            env: [
                                { name: 'GIT_REPOSITORY_URL', value: git_url },
                                { name: 'PROJECT_ID', value: project_id },
                                { name: 'SOURCE_DIRECTORY', value: root_folder },
                                { name: 'BRANCH', value: branch },
                                { name: 'ACCESS_TOKEN', value: access_token },
                                ...(env_variables ? env_variables.map(envVar => ({ name: envVar.name, value: envVar.value })) : []),
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
        await publishLogs(channelName, `Job ${jobName} created successfully`);

        const podName = await getPodName(jobName);
        if (!podName) {
            throw new Error('Pod name is undefined');
        }

        await getPodLogs(podName, project_id);
        await streamContainerLogs('default', podName, containerName, channelName);

    } catch (err) {
        logger.error('Error creating Job:', err);
        await updateDeploymentStatus(channelName, deploymentId, "FAILED");
        await triggerWebHookForSendingMails("failed");
        throw err;
    }
};