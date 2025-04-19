import { PinataSDK } from "pinata";

export async function uploadImageToPinata(
    file: any
): Promise<string> {
    const pinata = new PinataSDK({
        pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT,
        pinataGateway: "amethyst-impossible-ptarmigan-368.mypinata.cloud",
    });
    // Upload to Pinata
    const upload = await pinata.upload.file(file);
    console.log("JSON Upload successful:", upload);
    //   const data = await pinata.gateways.get(upload.cid);
    //   console.log(data);
    const url = await pinata.gateways.createSignedURL({
        cid: upload.cid,
        expires: 99999999999,
    });

    return url
}