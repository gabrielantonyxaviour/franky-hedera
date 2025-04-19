export function shortenAddress(address: string): string {
  console.log("[shorten address]");
  console.log(address);
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
