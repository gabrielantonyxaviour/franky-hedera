import { PinataSDK } from "pinata";

export async function uploadImageToPinata(
    file: any
): Promise<string> {
    const pinata = new PinataSDK({
        pinataJwt: process.env.PINATA_JWT,
        pinataGateway: "amethyst-impossible-ptarmigan-368.mypinata.cloud",
    });

    const upload = await pinata.upload.public.file(file)
    console.log("JSON Upload successful:", upload);
   
    return "https://amethyst-impossible-ptarmigan-368.mypinata.cloud/files/"+upload.cid
}


export async function uploadJsonToPinata(
    jsonData: any
): Promise<string> {
    const pinata = new PinataSDK({
        pinataJwt: process.env.PINATA_JWT,
        pinataGateway: "amethyst-impossible-ptarmigan-368.mypinata.cloud",
    });
    console.log("Uploading")
    console.log(jsonData)
    // Upload to Pinata
    const upload = await pinata.upload.public.json(jsonData);
    console.log("JSON Upload successful:", upload);
    return "https://amethyst-impossible-ptarmigan-368.mypinata.cloud/files/"+upload.cid
}