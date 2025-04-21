import { JsonRpcProvider, Wallet } from "ethers"
import { Randomness } from "randomness-js"
import dotenv from "dotenv"
import { Hex } from "viem"

dotenv.config()

async function main() {
    try {
        console.log("Initializing RPC provider...")
        const rpc = new JsonRpcProvider("https://api.calibration.node.glif.io/rpc/v1")
        console.log("RPC provider initialized.")

        console.log("Creating wallet...")
        const wallet = new Wallet(process.env.PRIVATE_KEY as Hex, rpc)
        console.log("Wallet created.")

        console.log("Creating Filecoin Calibnet randomness instance...")
        const randomness = Randomness.createFilecoinCalibnet(wallet)
        console.log("Randomness instance created.")

        console.log("Requesting randomness...")
        const response = await randomness.requestRandomness()
        console.log("Randomness response received:", response)

        console.log("Verifying randomness response...")
        await randomness.verify(response)
        console.log("Randomness response verified.")
    } catch (error) {
        console.error("An error occurred:", error)
    }
}

main()