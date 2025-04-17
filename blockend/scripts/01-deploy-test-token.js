const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying TestFrankyToken with the account:", deployer.address);
  console.log(
    "Account balance:",
    (await deployer.provider.getBalance(deployer.address)).toString()
  );

  const network = hre.network.name;
  console.log(`Deploying to ${network}...`);

  const TestFrankyToken = await ethers.getContractFactory("TestFrankyToken");
  const testFrankyToken = await TestFrankyToken.deploy(deployer.address);

  await testFrankyToken.waitForDeployment();
  const frankyAddress = await testFrankyToken.getAddress();

  console.log("TestFrankyToken deployed to:", frankyAddress);

  // Save deployment information
  const deploymentData = {
    network: network,
    testFrankyToken: frankyAddress,
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

  // Verify TestFrankyToken contract
  console.log("Waiting for block confirmations...");
  await testFrankyToken.deploymentTransaction().wait(5);

  // Verify contract on Etherscan if not on a local network
  if (network !== "localhost" && network !== "hardhat") {
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: frankyAddress,
        constructorArguments: [deployer.address],
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
