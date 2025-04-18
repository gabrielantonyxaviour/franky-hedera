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

  const accountImplementation = isMainnet
    ? "0x699dF6635F536E77231E484c6450aFFf726EeA02"
    : "0x699dF6635F536E77231E484c6450aFFf726EeA02";
  const tokenAddress = isMainnet
    ? "0x8340b5250e499df722db353b1680e853511dc1ad"
    : "0x486989cd189ED5DB6f519712eA794Cee42d75b29";
  const protocolBps = 1000;

  const Franky = await ethers.getContractFactory("Franky");
  const franky = await Franky.deploy(
    accountImplementation,
    tokenAddress,
    protocolBps
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
