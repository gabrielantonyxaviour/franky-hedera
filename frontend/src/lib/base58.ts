// Simple base58 encoding/decoding utility
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function encodeBase58(input: string): string {
  const bytes = Buffer.from(input);
  let output = '';
  
  // Convert bytes to base58 string
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < output.length; j++) {
      const current = ALPHABET.indexOf(output[j]) * 256 + carry;
      carry = current / 58 | 0;
      output = output.substring(0, j) + ALPHABET[current % 58] + output.substring(j + 1);
    }
    while (carry) {
      output = ALPHABET[carry % 58] + output;
      carry = carry / 58 | 0;
    }
  }
  
  // Add leading '1's for each leading zero byte
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    output = '1' + output;
  }
  
  return output;
}

export function decodeBase58(input: string): string {
  const bytes = [0];
  
  // Convert base58 string to bytes
  for (let i = 0; i < input.length; i++) {
    const value = ALPHABET.indexOf(input[i]);
    if (value === -1) {
      throw new Error('Invalid base58 character');
    }
    
    for (let j = 0; j < bytes.length; j++) {
      bytes[j] *= 58;
    }
    bytes[0] += value;
    
    let carry = 0;
    for (let j = 0; j < bytes.length; j++) {
      bytes[j] += carry;
      carry = bytes[j] >> 8;
      bytes[j] &= 0xff;
    }
    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  
  // Add leading zeros
  for (let i = 0; i < input.length && input[i] === '1'; i++) {
    bytes.unshift(0);
  }
  
  return Buffer.from(bytes).toString();
} 