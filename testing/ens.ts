import { normalize } from "viem/ens";

import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

async function main() {
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });
  const ensAddress = await publicClient.getEnsAddress({
    name: normalize("test.frankyagent.xyz"),
  });
  console.log(ensAddress);
  const ensText = await publicClient.getEnsText({
    name: normalize("test.frankyagent.xyz"),
    key: "url",
  });
  console.log(ensText);
}

main();
