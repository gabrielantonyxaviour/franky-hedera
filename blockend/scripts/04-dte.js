const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Reading signature with account:", deployer.address);

  const hash =
    "0x02c14fc77c83f6baf4cdaf008a6b0ffd0ad64255d2ac76c303c968b8bf44bc43";
  const signature =
    "0x6c7e60023621dafffa80e8c59ee6ae08bb431835d105c9a85064ceb40080d3c671b4b70cdce284dc3bfe89e9a8460d9f9a68130af4bf1e20759c70ce8aaaf5811b";

  const Franky = await ethers.getContractFactory("Franky");
  const franky = await Franky.attach(
    "0xC9a1563801f67206586375be66405050430dBF60"
  );

  const signer = await franky.recoverSigner(hash, signature);
  console.log("Recovered signer:", signer);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
