/**
 * Formats an address to be compatible with viem's 0x hex string format
 * This is a workaround for TypeScript's type constraints in JavaScript
 * 
 * @param {string} address - The address to format
 * @returns {string} - Properly formatted address or empty string if invalid
 */
export function formatAddressForViem(address) {
  if (!address || typeof address !== 'string') {
    return '';
  }
  
  // Ensure the address is a lowercase hex string with 0x prefix
  let formatted = address.toLowerCase().trim();
  if (!formatted.startsWith('0x')) {
    formatted = '0x' + formatted;
  }
  
  // Validate that it's a 42-character Ethereum address (0x + 40 hex characters)
  if (/^0x[0-9a-f]{40}$/i.test(formatted)) {
    return formatted;
  }
  
  return '';
} 