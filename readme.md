# 🚀 CargoDeploy (Build with buckets and manage with k8)

This project demonstrates an automated process of deploying a React application from a GitHub repository, building it inside a Kubernetes-managed container, and then uploading the build output to an S3 bucket. The deployment is managed by Kubernetes, while a reverse proxy server is used to serve the files based on subdomains.

## 🛠️ Tech Stack

- **Kubernetes**: Orchestrates containerized applications across multiple nodes, managing the deployment, scaling, and operations of the containers.
- **Docker**: Containerizes the application to ensure consistent environments across various stages of the build and deployment process.
- **Node.js & Express.js**: Used for writing the reverse proxy server, which serves the React app based on subdomains.
- **AWS S3**: Used to store the build output of the React application, allowing it to be served as static content.
- **TypeScript**: Provides static typing for JavaScript, improving code quality and maintainability.
- **AWS SDK**: Used to interact with AWS services like S3 for uploading files.

## 🌟 Features

1. **Automated Deployment**: A Docker image is used to spin up a Kubernetes Job that clones a GitHub repository, builds the React application, and uploads the build artifacts to an S3 bucket.
2. **Reverse Proxy with Subdomain Routing**: An Express.js-based reverse proxy routes requests to the appropriate S3 location based on the subdomain.
3. **Kubernetes Job Management**: Kubernetes Jobs are dynamically created, and the associated resources are cleaned up after completion to ensure that no unnecessary resources are left running.

## 📂 Project Structure

- **`k8-comm`**: Handles the deployment and service creation in Kubernetes. It defines a Kubernetes Job for building the React app and uploading it to S3.
- **`repo-uploader`**: Executes inside the container spun up by the Kubernetes Job. It builds the React app and uploads the build output to an S3 bucket.
- **`reverse-proxy-server`**: A TypeScript file that contains the reverse proxy server logic, which routes traffic to the appropriate S3 bucket location based on subdomains.

## 📝 Project Flow

1. **Kubernetes Job Execution**:
    - The `k8.js` script creates a Kubernetes Job that spins up a Docker container.
    - Inside the container, the `exec.sh` script is run, which sets environment variables, clones the GitHub repository, and executes the `script.js` file.
    - The React application is built using `npm run build`, and the build output is uploaded to the S3 bucket.

2. **Reverse Proxy Server**:
    - The reverse proxy server, written in TypeScript, listens for incoming requests.
    - It extracts the subdomain from the request, and routes the request to the appropriate S3 bucket folder where the build output is stored.
  
3. **Job Cleanup**:
    - After the Job completes, the resources associated with the Job (e.g., Pods) are deleted using the following command:
      ```bash
      kubectl delete job <job-name> --namespace <namespace> --cascade=foreground
      ```
    - the `--namespace` flag is not compulsory the default value of namespace is `default` only so unless you're working on a different namespace the `--namespace flag` is not required
    - A new script can be added to check if the Job has completed and then delete it automatically.

## 🔮 Future Enhancements:

1. **User Management**:
   - Each user will be able to manage multiple deployments, allowing for greater flexibility and scalability.
   - Logs will be maintained for each deployment, providing detailed insights and troubleshooting information.
   - PostgreSQL will be integrated as the database to store user data, deployment logs, and other relevant information, ensuring data integrity and easy retrieval.

2. **Frontend Platform**:
   - A user-friendly frontend platform will be developed to allow users to interact with the system effortlessly. 
   - This platform will provide a dashboard for managing deployments, viewing logs, and accessing other features. 
   - It will enhance the user experience by providing real-time feedback and analytics on deployment status and performance.

3. **Enhanced Security**:
   - Implement user authentication and authorization to secure access to deployments and logs.
   - Data encryption will be applied to sensitive information stored in the database and transmitted between services.
   - IAM roles and policies will be defined to restrict access to AWS resources, ensuring that only authorized actions are performed.

## 🚀 How to Deploy

- **Prerequisites**:
  - Kubernetes cluster up and running.
  - AWS account with an S3 bucket ready for storage.
  - Docker installed and configured on your local machine.

- **Deployment Steps**:
  1. Clone the repository.
  2. Set up the environment variables required for AWS access and Kubernetes configuration.
  3. Run the `k8.js` script to start the deployment process.
  4. Monitor the deployment and verify the build output in your S3 bucket.

- **Error Handling**:
  - Ensure that all dependencies are correctly installed and configured.
  - If a Job fails to execute, check the Kubernetes logs for detailed error messages.
  - Use the cleanup command to remove any orphaned resources and re-deploy if necessary.
