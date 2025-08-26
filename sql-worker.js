// workers/sql-worker.js


require('dotenv').config({ path: './.env.local' });

// --- 1. Import necessary libraries ---
const { Worker } = require('bullmq');
const connection = require('./redis-config');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

// --- 2. Configure Connections ---



// This creates an AWS S3 client.
// It will automatically read credentials (AWS_ACCESS_KEY_ID, etc.)
// from your .env.local file. This is why that file is critical.
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
});

// A helper function to simulate a delay, like a real database query would have.
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// --- 3. Define the Job Processor ---
// This is the main function where all the work happens.
// It receives a 'job' object from the queue, which contains the data sent by the API.
const processor = async (job) => {
  
  // --- CHANGE 1: Get the dynamic S3 file path from the job data ---
  // Instead of a hardcoded filename, we now read the 's3Key' property
  // that the API route added to the job.
  const { s3Key } = job.data;

  // A safety check. If the API somehow forgot to add the s3Key, the job will fail.
  if (!s3Key) {
    throw new Error('Job failed: The job data is missing the required "s3Key" property.');
  }

  console.log(`[Worker] Received job #${job.id}. Starting processing for S3 file: ${s3Key}`);

  try {
    // --- CHANGE 2: Use the dynamic s3Key to create the S3 command ---
    // The 'Key' now uses the variable we got from the job data. This tells
    // S3 exactly which file to retrieve for this specific job.
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key, 
    });
    
    // Send the command to AWS S3 and wait for the file response.
    const response = await s3Client.send(command);
    // Convert the file's content from a stream into a plain string.
    const queriesJsonString = await response.Body.transformToString();

    // --- CHANGE 3: Parse the new JSON structure ---
    // The JSON string is now parsed. Based on your example, this will create
    // an array of objects, like [{id: "...", query: "..."}, ...].
    const queryObjects = JSON.parse(queriesJsonString);
    console.log(`[Worker] Successfully loaded ${queryObjects.length} queries from ${s3Key}.`);

    // --- CHANGE 4: Loop through the new structure and access the 'query' property ---
    // We loop through each object in the array. For each 'item', we can now
    // access its 'id' and its 'query' properties.
    for (const item of queryObjects) {
      console.log(`[Worker] Executing query ID ${item.id}: "${item.query.substring(0, 50)}..."`);
      await sleep(750); // Simulate the time it takes to run the query.
    }

    const resultMessage = `Successfully executed all ${queryObjects.length} queries from file ${s3Key}.`;
    console.log(`[Worker] Job #${job.id} has completed successfully.`);
    return { status: 'Completed', message: resultMessage };

  } catch (error) {
    // If anything goes wrong (file not found, invalid JSON, etc.), we catch it here.
    console.error(`[Worker] Job #${job.id} failed with an error:`, error.message);
    // It is important to re-throw the error so BullMQ knows the job failed
    // and can potentially retry it later.
    throw error;
  }
};


// --- 4. Create and Start the Worker ---
console.log('[Worker] Worker process is starting up and waiting for jobs...');

// This creates the new worker instance. It tells BullMQ:
// - Which queue to listen to ('sql-execution-queue')
// - Which function to run when a job arrives (the 'processor' function we defined)
// - How to connect to Redis
const worker = new Worker('sql-execution-queue', processor, { connection });

// --- 5. (Optional but Recommended) Add Event Listeners for Logging ---
worker.on('completed', (job, result) => {
  console.log(`[Worker-Event] Job ${job.id} completed. Result: ${result.message}`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker-Event] Job ${job.id} failed. Error:`, err.message);
});