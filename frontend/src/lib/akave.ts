import { encrypt } from '@/utils/lit';
import { v4 as uuidv4 } from 'uuid';
import { FRANKY_AGENTS_BUCKET } from './constants';

// Akave API endpoint
export const AKAVE_API_URL = 'http://3.88.107.110:8000';
const CHAT_HISTORY_BUCKET = 'chat-history';

type JsonData = Record<string, any>;

interface UploadResult {
    fileName: string | null;
    success: boolean;
}

interface DownloadResult {
    data: JsonData | null;
    success: boolean;
}

/**
 * Helper function to implement retry logic
 */
async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
): Promise<T> {
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            console.error(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error.message);

            if (i < maxRetries - 1) {
                const delay = initialDelay * (i + 1);
                console.log(`Retrying in ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * Ensures that a bucket exists in Akave
 */
export async function ensureBucketExists(bucketName: string): Promise<boolean> {
    console.log(`Ensuring bucket '${bucketName}' exists...`);

    return withRetry(async () => {
        const checkResponse = await fetch(`${AKAVE_API_URL}/buckets/${bucketName}`, {
            method: 'GET',
        });

        if (checkResponse.ok) {
            console.log(`Bucket '${bucketName}' already exists`);
            return true;
        }

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
 * Uploads JSON data to Akave bucket (browser version)
 */
export async function uploadJsonToAkave(
    jsonData: JsonData,
    bucketName: string = CHAT_HISTORY_BUCKET
): Promise<UploadResult> {
    console.log(`Uploading JSON data to Akave bucket '${bucketName}'...`);

    try {
        const bucketExists = await ensureBucketExists(bucketName);
        if (!bucketExists) {
            console.error(`Failed to ensure bucket ${bucketName} exists`);
            return { fileName: null, success: false };
        }

        const uniqueId = uuidv4();
        const fileName = `${uniqueId}.json`;

        // Browser environment - use native FormData
        const formData = new FormData();
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
            type: 'application/json',
        });
        formData.append('file', blob, fileName);

        await uploadFormData(formData, bucketName);
        return { fileName: uniqueId, success: true };
    } catch (error: any) {
        console.error('Error uploading JSON to Akave:', error);
        return { fileName: null, success: false };
    }
}

export async function uploadJsonToAkaveWithFileName(
    jsonData: JsonData,
    inputFileName: string,
    bucketName: string = CHAT_HISTORY_BUCKET
): Promise<UploadResult> {
    console.log(`Uploading JSON data to Akave bucket '${bucketName}'...`);

    try {
        const bucketExists = await ensureBucketExists(bucketName);
        if (!bucketExists) {
            console.error(`Failed to ensure bucket ${bucketName} exists`);
            return { fileName: null, success: false };
        }

        const fileName = `${inputFileName}.json`;

        // Browser environment - use native FormData
        const formData = new FormData();
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
            type: 'application/json',
        });
        formData.append('file', blob, fileName);

        await uploadFormData(formData, bucketName);
        return { fileName: inputFileName, success: true };
    } catch (error: any) {
        console.error('Error uploading JSON to Akave:', error);
        return { fileName: null, success: false };
    }
}

/**
 * Upload form data to Akave (browser version)
 */
export async function uploadFormData(formData: FormData, bucketName: string): Promise<any> {
    console.log(`Uploading Form data to Akave bucket '${bucketName}'...`);
    const bucketExists = await ensureBucketExists(bucketName);
    if (!bucketExists) {
        console.error(`Failed to ensure bucket ${bucketName} exists`);
        return { fileName: null, success: false };
    }
    const uploadOperation = async () => {
        const uploadResponse = await fetch(`${AKAVE_API_URL}/buckets/${bucketName}/files`, {
            method: 'POST',
            body: formData,
            // No need to set headers - browser's FormData handles this automatically
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed with status ${uploadResponse.status}: ${errorText}`);
        }

        return await uploadResponse.json();
    };

    const uploadResult = await withRetry(uploadOperation);
    console.log('JSON uploaded successfully to Akave:', uploadResult);
    return uploadResult;
}

/**
 * Retrieves a JSON file from Akave bucket
 */
export async function getJsonFromAkave(
    fileName: string,
    bucketName: string = CHAT_HISTORY_BUCKET
): Promise<DownloadResult> {
    console.log(`Retrieving JSON file '${fileName}' from Akave bucket '${bucketName}'...`);

    if (!fileName || typeof fileName !== 'string') {
        console.error(`Invalid file name format: ${fileName}`);
        return { data: null, success: false };
    }

    try {
        const fullFileName = `${fileName}.json`;

        const downloadOperation = async () => {
            const response = await fetch(
                `${AKAVE_API_URL}/buckets/${bucketName}/files/${fullFileName}/download`
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Download failed with status ${response.status}: ${errorText}`);
            }

            return await response.json();
        };

        const data = await withRetry(downloadOperation);
        console.log(`Successfully retrieved JSON data for '${fileName}'`);
        return { data, success: true };
    } catch (error: any) {
        console.error(`Error retrieving JSON from Akave:`, error);
        return { data: null, success: false };
    }
}


export async function uploadCharacterToAkave(characterData: any, agentName: string, secretsText: string = "") {
    try {
        const bucketName = FRANKY_AGENTS_BUCKET;

        // Ensure the bucket exists
        const bucketExists = await ensureBucketExists(bucketName);
        if (!bucketExists) {
            console.error("Failed to ensure bucket exists");
            return null;
        }

        // Create a copy of character data to modify
        const dataToUpload = { ...characterData };

        // If secrets are provided, encrypt them
        if (secretsText.trim()) {
            try {
                console.log("Encrypting secrets with Lit Protocol...");
                const { ciphertext, dataToEncryptHash } = await encrypt(secretsText, false);

                // Add encrypted secrets to the character data
                dataToUpload.encryptedSecrets = ciphertext;

                // Ensure secretsHash has 0x prefix
                const formattedHash = dataToEncryptHash.startsWith('0x')
                    ? dataToEncryptHash
                    : `0x${dataToEncryptHash}`;

                dataToUpload.secretsHash = formattedHash;
                console.log("Secrets encrypted successfully with hash:", formattedHash);
            } catch (error) {
                console.error("Failed to encrypt secrets:", error);
                return null;
            }
        }

        // Convert character data to JSON string
        const jsonData = JSON.stringify(dataToUpload, null, 2);

        // Create a Blob from the JSON data
        const blob = new Blob([jsonData], { type: 'application/json' });

        // Generate a random string to make filename unique
        const secureFilename = `${agentName}-frankyagent-xyz.json`;

        // Create a File object from the Blob with the secure random filename
        const file = new File([blob], secureFilename, { type: 'application/json' });

        // Create FormData
        const formData = new FormData();
        formData.append('file', file);

        // Upload to Akave bucket
        const uploadResponse = await fetch(`${AKAVE_API_URL}/buckets/${bucketName}/files`, {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            console.error('Failed to upload character data:', await uploadResponse.text());
            return null;
        }

        const uploadResult = await uploadResponse.json();
        console.log('Character data uploaded successfully:', uploadResult);

        // Return the download URL
        const downloadUrl = `${AKAVE_API_URL}/buckets/${bucketName}/files/${secureFilename}/download`;
        console.log('Akave download URL:', downloadUrl);

        return downloadUrl;
    } catch (error) {
        console.error('Error uploading character data to Akave:', error);
        return null;
    }
}
