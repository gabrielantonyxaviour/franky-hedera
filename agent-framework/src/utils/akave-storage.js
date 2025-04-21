import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

// Akave API endpoint
const AKAVE_API_URL = 'http://3.88.107.110:8000';
const CHAT_HISTORY_BUCKET = 'chat-history';

/**
 * Helper function to implement retry logic
 * @param {Function} operation - Async function to execute
 * @param {number} [maxRetries=3] - Maximum number of retries
 * @param {number} [initialDelay=1000] - Initial delay in ms (will be multiplied by attempt number)
 * @returns {Promise<any>} - Result of the operation
 */
async function withRetry(operation, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.error(`Operation failed (attempt ${i+1}/${maxRetries}):`, error.message);
      
      if (i < maxRetries - 1) {
        const delay = initialDelay * (i + 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Ensures that a bucket exists in Akave
 * @param {string} bucketName - The name of the bucket to check/create
 * @returns {Promise<boolean>} - True if bucket exists or was created successfully
 */
export async function ensureBucketExists(bucketName) {
  console.log(`Ensuring bucket '${bucketName}' exists...`);
  
  return withRetry(async () => {
    // First check if bucket exists
    const checkResponse = await fetch(`${AKAVE_API_URL}/buckets/${bucketName}`, {
      method: 'GET',
    });
    
    if (checkResponse.ok) {
      console.log(`Bucket '${bucketName}' already exists`);
      return true;
    }
    
    // If bucket doesn't exist or we got an error other than 404, create it
    console.log(`Bucket '${bucketName}' not found, creating...`);
    
    const createResponse = await fetch(`${AKAVE_API_URL}/buckets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bucketName }),
    });
    
    if (createResponse.ok) {
      console.log(`Created bucket '${bucketName}'`);
      return true;
    } else {
      const errorText = await createResponse.text();
      console.error('Failed to create bucket:', errorText);
      throw new Error(`Failed to create bucket: ${errorText}`);
    }
  });
}

/**
 * Uploads JSON data to Akave bucket
 * @param {object} jsonData - The JSON data to upload
 * @param {string} [bucketName=CHAT_HISTORY_BUCKET] - The bucket name to use
 * @returns {Promise<{fileName: string|null, success: boolean}>} - The filename (without extension) and success status
 */
export async function uploadJsonToAkave(jsonData, bucketName = CHAT_HISTORY_BUCKET) {
  console.log(`Uploading JSON data to Akave bucket '${bucketName}'...`);
  
  try {
    // Ensure the bucket exists
    const bucketExists = await ensureBucketExists(bucketName);
    if (!bucketExists) {
      console.error(`Failed to ensure bucket ${bucketName} exists`);
      return { fileName: null, success: false };
    }

    // Generate a unique filename using UUID v4
    const uniqueId = uuidv4();
    const fileName = `${uniqueId}.json`;
    
    // Check if we're in a Node.js environment
    const isNode = typeof process !== 'undefined' && 
                 process.versions != null && 
                 process.versions.node != null;
    
    // Create a FormData object
    const form = new FormData();
    
    if (isNode) {
      // Node.js environment - use fs to create a temporary file
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, fileName);
      
      try {
        // Write JSON to the temporary file
        fs.writeFileSync(tempFilePath, JSON.stringify(jsonData, null, 2), 'utf8');
        
        // Add file to form data
        form.append('file', fs.createReadStream(tempFilePath), {
          filename: fileName,
          contentType: 'application/json',
        });
        
        // Upload to Akave
        const uploadResult = await uploadFormData(form, bucketName);
        
        // Return the filename without extension (to be used as history ID)
        return { fileName: uniqueId, success: true };
      } finally {
        // Clean up the temporary file
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log(`Cleaned up temporary file: ${tempFilePath}`);
          }
        } catch (cleanupError) {
          console.error('Failed to clean up temporary file:', cleanupError);
          // Don't throw this error as it's just cleanup
        }
      }
    } else {
      // Browser environment - use Blob
      const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { 
        type: 'application/json' 
      });
      
      // Add file to form data
      form.append('file', jsonBlob, fileName);
      
      // Upload to Akave
      const uploadResult = await uploadFormData(form, bucketName);
      
      // Return the filename without extension (to be used as history ID)
      return { fileName: uniqueId, success: true };
    }
  } catch (error) {
    console.error('Error uploading JSON to Akave:', error);
    return { fileName: null, success: false };
  }
}

/**
 * Helper function to upload FormData to Akave
 * @param {FormData} form - The form data to upload
 * @param {string} bucketName - The bucket name to use
 * @returns {Promise<object>} - The upload result
 */
async function uploadFormData(form, bucketName) {
  const uploadOperation = async () => {
    // Prepare headers - form.getHeaders() is only available in Node.js
    const headers = typeof form.getHeaders === 'function' 
      ? form.getHeaders() 
      : undefined; // In browser environments, fetch will set the proper headers automatically
    
    const uploadResponse = await fetch(`${AKAVE_API_URL}/buckets/${bucketName}/files`, {
      method: 'POST',
      body: form,
      headers: headers, // Use the headers if available
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed with status ${uploadResponse.status}: ${errorText}`);
    }
    
    return await uploadResponse.json();
  };
  
  // Execute with retry logic
  const uploadResult = await withRetry(uploadOperation);
  console.log('JSON uploaded successfully to Akave:', uploadResult);
  return uploadResult;
}

/**
 * Retrieves a JSON file from Akave bucket
 * @param {string} fileName - The filename (without extension) to retrieve
 * @param {string} [bucketName=CHAT_HISTORY_BUCKET] - The bucket name to use
 * @returns {Promise<{data: object|null, success: boolean}>} - The retrieved data and success status
 */
export async function getJsonFromAkave(fileName, bucketName = CHAT_HISTORY_BUCKET) {
  console.log(`Retrieving JSON file '${fileName}' from Akave bucket '${bucketName}'...`);
  
  // Validate the fileName format (should be a UUID)
  if (!fileName || typeof fileName !== 'string' || !fileName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    console.error(`Invalid file name format: ${fileName}`);
    return { data: null, success: false };
  }
  
  try {
    // Construct the full filename with extension
    const fullFileName = `${fileName}.json`;
    
    // Define the operation with built-in error handling
    const downloadOperation = async () => {
      const response = await fetch(`${AKAVE_API_URL}/buckets/${bucketName}/files/${fullFileName}/download`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Download failed with status ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    };
    
    // Execute with retry logic
    const data = await withRetry(downloadOperation);
    console.log(`Successfully retrieved JSON data for '${fileName}'`);
    return { data, success: true };
  } catch (error) {
    console.error(`Error retrieving JSON from Akave:`, error);
    return { data: null, success: false };
  }
} 