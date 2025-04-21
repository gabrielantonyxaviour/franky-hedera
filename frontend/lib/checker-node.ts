import { ethers } from 'ethers';
import { publicClient } from '@/lib/utils';

export class CheckerNode {
  public readonly address: string;
  private readonly privateKey: string;
  public isRegistered: boolean = false;

  constructor(privateKey: string) {
    const wallet = new ethers.Wallet(privateKey);
    this.address = wallet.address;
    this.privateKey = privateKey;
  }

  // Register this node as a checker
  async register() {
    try {
      // Create a wallet from the private key
      const wallet = new ethers.Wallet(this.privateKey);
      
      // Sign a registration message
      const message = `Register checker node: ${this.address}`;
      const signature = await wallet.signMessage(message);

      // Store registration in local storage
      if (typeof window !== 'undefined') {
        localStorage.setItem('checker_node', JSON.stringify({
          address: this.address,
          registeredAt: new Date().toISOString(),
          signature
        }));
      }

      this.isRegistered = true;
      return true;
    } catch (error) {
      console.error('Failed to register checker node:', error);
      return false;
    }
  }

  // Sign a device check result
  async signCheck(deviceId: string, checkResult: any) {
    if (!this.isRegistered) {
      throw new Error('Checker node is not registered');
    }

    const wallet = new ethers.Wallet(this.privateKey);
    const message = JSON.stringify({
      deviceId,
      checkResult,
      timestamp: new Date().toISOString(),
      checkerNode: this.address
    });

    return wallet.signMessage(message);
  }

  // Verify if a check was signed by a registered checker
  static async verifyCheck(checkData: any, signature: string, checkerAddress: string) {
    try {
      const message = JSON.stringify(checkData);
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === checkerAddress.toLowerCase();
    } catch {
      return false;
    }
  }
}

// Helper function to create or load a checker node
export async function getOrCreateCheckerNode(): Promise<CheckerNode> {
  // Try to load existing checker node
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('checker_node');
    if (stored) {
      const data = JSON.parse(stored);
      const node = new CheckerNode(data.privateKey);
      node.isRegistered = true;
      return node;
    }
  }

  // Create new checker node with random private key
  const privateKey = ethers.Wallet.createRandom().privateKey;
  const node = new CheckerNode(privateKey);
  await node.register();
  return node;
} 