// api-server.js

const express = require('express');
const { Queue } = require('bullmq');
const cors = require('cors');

// --- 1. Basic Server Setup ---
const app = express();
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(cors()); // Enable Cross-Origin Resource Sharing for your frontend

// --- 2. Redis Connection Setup ---
// This uses the exact same environment variables as your worker
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
};

// --- 3. Create a Queue instance (for adding jobs) ---
// This MUST be the same queue name your worker is listening to
const sqlExecutionQueue = new Queue('sql-execution-queue', { connection: redisConnection });

// --- 4. Define the API Endpoint ---
// Your Next.js app will make a POST request to this route
app.post('/schedule-job', async (req, res) => {
  try {
    // Get the S3 file key from the request body sent by the frontend
    const { s3Key } = req.body;

    if (!s3Key) {
      return res.status(400).json({ status: 'error', message: 's3Key is required in the request body.' });
    }

    // Add the job to the queue. The worker will pick this up automatically.
    const job = await sqlExecutionQueue.add('process-sql-file', { s3Key });

    console.log(`[API] Job successfully scheduled with ID: ${job.id}`);

    // Send a success response back to the frontend
    res.status(202).json({
      status: 'success',
      message: 'Job scheduled successfully!',
      jobId: job.id,
    });

  } catch (error) {
    console.error('[API] Failed to schedule job:', error);
    res.status(500).json({ status: 'error', message: 'Failed to schedule the job.' });
  }
});

// --- 5. Health Check Endpoint ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// --- 6. Start the Server ---
const PORT = process.env.PORT || 3000; // The internal port for the container
app.listen(PORT, () => {
  console.log(`[API] Server is listening on port ${PORT}`);
  console.log(`[API] Ready to accept jobs for the '${sqlExecutionQueue.name}' queue.`);
});