const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();  

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

const deployment = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
        name: 'my-nodejs-app',
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                app: 'my-nodejs-app',
            },
        },
        template: {
            metadata: {
                labels: {
                    app: 'my-nodejs-app',
                },
            },
            spec: {
                containers: [
                    {
                        name: 'my-nodejs-container',
                        image: 'rehman300/container-deploy:v0.3',
                        ports: [
                            {
                                containerPort: 8080,
                            },
                        ],
                        env: [
                            { name: 'GIT_REPOSITORY__URL', value: 'https://github.com/Saurabh-Rana17/sewer-monitoring-system-client.git' },
                            { name: 'PROJECT_ID', value: 'p9' },
                        ],
                    },
                ],
            },
        },
    },
};

const createDeployment = async () => {
    const appsApi = kc.makeApiClient(k8s.AppsV1Api);
    try {
        await appsApi.createNamespacedDeployment('default', deployment);
        console.log('Deployment created successfully');
    } catch (err) {
        console.error('Error creating deployment:', err);
    }
};

const createService = async () => {
    const service = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
            name: 'my-nodejs-service',
        },
        spec: {
            selector: {
                app: 'my-nodejs-app',
            },
            ports: [
                {
                    protocol: 'TCP',
                    port: 80,
                    targetPort: 8080,
                },
            ],
            type: 'NodePort', 
        },
    };

    try {
        await k8sApi.createNamespacedService('default', service);
        console.log('Service created successfully');
    } catch (err) {
        console.error('Error creating service:', err);
    }
};

const main = async () => {
    await createDeployment();
    await createService();
};

main();
