// Simple base58 encoding/decoding utility
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ALPHABET_MAP = ALPHABET.split('').reduce((acc, char, i) => {
  acc[char] = i;
  return acc;
}, {} as { [key: string]: number });

export function encodeBase58(input: string): string {
  const bytes = Buffer.from(input, 'hex');
  let output = '';
  
  // Convert bytes to base58 string
  let num = BigInt('0x' + bytes.toString('hex'));
  const base = BigInt(58);
  
  while (num > BigInt(0)) {
    const remainder = Number(num % base);
    output = ALPHABET[remainder] + output;
    num = num / base;
  }
  
  // Add leading '1's for each leading zero byte
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    output = '1' + output;
  }
  
  return output;
}

export function decodeBase58(input: string): string {
  if (!input || input.length === 0) return '';
  
  let num = BigInt(0);
  const base = BigInt(58);
  
  // Convert base58 string to number
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const value = ALPHABET_MAP[char];
    if (value === undefined) {
      throw new Error('Invalid base58 character: ' + char);
    }
    num = num * base + BigInt(value);
  }
  
  // Convert to hex string
  let hex = num.toString(16);
  
  // Ensure even length
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  
  // Add leading zeros
  for (let i = 0; i < input.length && input[i] === '1'; i++) {
    hex = '00' + hex;
  }
  
  return hex;
} 