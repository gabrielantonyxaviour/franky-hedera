import { PinataSDK } from "pinata-web3";

/**
 * Uploads a JSON object to Pinata IPFS and returns the URL
 * @param jsonData Any JSON data to upload
 * @returns Promise with the URL of the uploaded content
 */
export async function uploadJsonToPinata(
    jsonData: any
): Promise<string> {
    console.log("🔵 Starting Pinata upload process...");
    
    // Get the gateway domain from environment variables or use a default
    const gatewayDomain = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "amethyst-impossible-ptarmigan-368.mypinata.cloud";
    console.log("🔵 Using gateway domain:", gatewayDomain);
    
    // Check if Pinata JWT is set
    const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT || '';
    if (!pinataJwt) {
        console.error("❌ PINATA JWT IS MISSING! Check your .env.local file.");
    } else {
        console.log("✅ Pinata JWT configured");
    }
    
    console.log("🔵 Initializing Pinata SDK...");
    const pinata = new PinataSDK({
        pinataJwt,
        pinataGateway: gatewayDomain,
    });

    // Convert JSON object to string
    const jsonString = JSON.stringify(jsonData, null, 2);
    console.log("🔵 Prepared JSON data:", jsonData);
    
    // Create a random filename to avoid collisions
    const filename = `${Math.floor(Math.random() * 100000000)}.json`;
    console.log("🔵 Generated filename:", filename);

    // Create a File object from the JSON string
    const file = new File([jsonString], filename, {
        type: "application/json",
    });
    console.log("🔵 Created File object with size:", file.size, "bytes");

    try {
        console.log("🔵 Attempting to upload to Pinata...");
        // Upload to Pinata
        const upload = await pinata.upload.file(file);
        console.log("✅ JSON Upload successful!", upload);
        console.log("🔵 IPFS Hash:", upload.IpfsHash);
        console.log("🔵 Pin Size:", upload.PinSize, "bytes");
        console.log("🔵 Timestamp:", upload.Timestamp);
        
        // Construct gateway URL using the gateway domain
        const url = `https://${gatewayDomain}/ipfs/${upload.IpfsHash}`;
        console.log("✅ Gateway URL:", url);
        
        return url;
    } catch (error) {
        console.error("❌ Error uploading to Pinata:", error);
        console.error("❌ Error details:", JSON.stringify(error, null, 2));
        throw error;
    }
}