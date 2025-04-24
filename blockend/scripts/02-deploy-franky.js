const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const isMainnet = true;

  console.log("Deploying Franky with the account:", deployer.address);
  console.log(
    "Account balance:",
    (await deployer.provider.getBalance(deployer.address)).toString()
  );

  const network = hre.network.name;
  console.log(`Deploying to ${network}...`);

  const accountImplementation = "0x93C85d1A88272115A8E8Ed36816326981fb0BEFF";

  const Franky = await ethers.getContractFactory("Franky");
  const franky = await Franky.deploy(
    accountImplementation,
    "Franky Agents",
    "$FRANKY",
    "Franky Agents Collection",
    {
      gasLimit: 3_450_000,
      value: ethers.parseEther("15"),
    }
  );

  await franky.waitForDeployment();
  const frankyAddress = await franky.getAddress();

  console.log("Franky deployed to:", frankyAddress);

  // Save deployment information
  const deploymentData = {
    network: network,
    franky: frankyAddress,
    timestamp: new Date().toISOString(),
  };

  const deploymentDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir);
  }

  fs.writeFileSync(
    path.join(deploymentDir, `${network}-deployment.json`),
    JSON.stringify(deploymentData, null, 2)
  );

  // Verify Franky contract
  console.log("Waiting for block confirmations...");
  await franky.deploymentTransaction().wait(5);

  // Verify contract on Etherscan if not on a local network
  if (network !== "localhost" && network !== "hardhat") {
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: frankyAddress,
        constructorArguments: [
          accountImplementation,
          tokenAddress,
          protocolBps,
        ],
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.log("Error verifying contract:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
