const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(
    "Deploying FrankyENSRegistrar with the account:",
    deployer.address
  );
  console.log(
    "Account balance:",
    (await deployer.provider.getBalance(deployer.address)).toString()
  );

  const network = hre.network.name;
  console.log(`Deploying to ${network}...`);

  // TODO: Replace with actual registry
  const registry = "0xf1f32db0bb3a6beec0c26dade4c79fd6554fef12";
  const franky = "0x831822743247cbDf74fA651fceb21B1f9D5CDBfa";

  const FrankyENSRegistrar = await ethers.getContractFactory(
    "FrankyENSRegistrar"
  );
  const frankyENSRegistrar = await FrankyENSRegistrar.deploy(registry, franky);

  await frankyENSRegistrar.waitForDeployment();
  const frankyAddress = await frankyENSRegistrar.getAddress();

  console.log("FrankyENSRegistrar deployed to:", frankyAddress);

  // Save deployment information
  const deploymentData = {
    network: network,
    frankyENSRegistrar: frankyAddress,
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

  // Verify FrankyENSRegistrar contract
  console.log("Waiting for block confirmations...");
  await frankyENSRegistrar.deploymentTransaction().wait(5);

  // Verify contract on Etherscan if not on a local network
  if (network !== "localhost" && network !== "hardhat") {
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: frankyAddress,
        constructorArguments: [registry, franky],
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
