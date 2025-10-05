import { ethers } from 'ethers';

/**
 * PUBLIC_INTERFACE
 * BlockchainClient
 * A thin wrapper around ethers.js for deposit flows. Reads environment configuration and exposes
 * helpers for provider/network/account access and escrow interactions.
 *
 * Environment:
 * - REACT_APP_ESCROW_ADDRESS: string (required for deposit)
 * - REACT_APP_CHAIN_ID: string|number (optional; UI may warn on wrong network)
 * - REACT_APP_BLOCK_EXPLORER_BASE: string (optional; for tx links)
 *
 * ABI:
 * - Placeholder assumes a deposit(uint256 wagerId) payable method.
 * - TODO: Replace ABI and methods when the escrow contract is finalized. See INTEGRATION_NOTES.md.
 */

/** Minimal placeholder ABI. Update with the real contract ABI. */
const DEFAULT_ESCROW_ABI = [
  "function deposit(uint256 wagerId) payable",
];

function getEnv(key) {
  try {
    return process.env[key];
  } catch {
    return undefined;
  }
}

const ENV = {
  ESCROW_ADDRESS: getEnv('REACT_APP_ESCROW_ADDRESS'),
  CHAIN_ID: getEnv('REACT_APP_CHAIN_ID'),
  EXPLORER: getEnv('REACT_APP_BLOCK_EXPLORER_BASE'),
};

if (process.env.NODE_ENV !== 'production') {
  if (!ENV.ESCROW_ADDRESS) {
    // eslint-disable-next-line no-console
    console.warn('[BlockchainClient] Missing REACT_APP_ESCROW_ADDRESS; deposit() will fail until set.');
  }
  if (!ENV.CHAIN_ID) {
    // eslint-disable-next-line no-console
    console.warn('[BlockchainClient] REACT_APP_CHAIN_ID not set; network mismatch checks will be limited.');
  }
}

/**
 * PUBLIC_INTERFACE
 */
export class BlockchainClient {
  /**
   * @param {Object=} opts
   * @param {string=} opts.escrowAddress
   * @param {Array=} opts.escrowAbi
   * @param {ethers.Signer=} opts.signer
   */
  constructor({ escrowAddress, escrowAbi, signer } = {}) {
    this.escrowAddress = escrowAddress || ENV.ESCROW_ADDRESS || "";
    this.escrowAbi = escrowAbi || DEFAULT_ESCROW_ABI;
    /** @type {ethers.Signer|undefined} */
    this.signer = signer;
  }

  /**
   * PUBLIC_INTERFACE
   * connectProvider
   * Set/replace the signer. Typically obtained from a web3 wallet connection.
   * @param {ethers.Signer} signer
   */
  connectProvider(signer) {
    /** This is a public function. */
    this.signer = signer;
  }

  /**
   * PUBLIC_INTERFACE
   * getNetwork
   * Return current network information from the signer/provider, if available.
   * @returns {Promise<{chainId?: string|number, name?: string}>}
   */
  async getNetwork() {
    /** This is a public function. */
    if (!this.signer) return {};
    const provider = this.signer.provider;
    if (!provider) return {};
    try {
      const net = await provider.getNetwork();
      return { chainId: net?.chainId, name: net?.name };
    } catch {
      return {};
    }
  }

  /**
   * PUBLIC_INTERFACE
   * getAccount
   * Return current account address if a signer is available.
   * @returns {Promise<string|undefined>}
   */
  async getAccount() {
    /** This is a public function. */
    if (!this.signer) return undefined;
    try {
      return await this.signer.getAddress();
    } catch {
      return undefined;
    }
  }

  /**
   * PUBLIC_INTERFACE
   * deposit
   * Send a deposit transaction to the escrow contract.
   *
   * TODO: Confirm final ABI, method name, and parameter types with on-chain contract.
   *
   * @param {Object} params
   * @param {string|number} params.wagerId
   * @param {number|string} params.amountEth
   * @param {Object=} params.options  Additional tx options
   * @returns {Promise<{ txHash: string, receipt?: any }>}
   */
  async deposit({ wagerId, amountEth, options } = {}) {
    /** This is a public function. */
    if (!this.signer) {
      throw new Error('No signer found. Please connect your wallet.');
    }
    if (!this.escrowAddress) {
      throw new Error('Missing REACT_APP_ESCROW_ADDRESS. Set it in the environment.');
    }
    const numericWagerId = Number.isFinite(Number(wagerId)) ? Number(wagerId) : 0;
    const value = ethers.utils.parseEther(String(amountEth));

    // Instantiate contract and attempt gas estimation (optional).
    const contract = new ethers.Contract(this.escrowAddress, this.escrowAbi, this.signer);
    try {
      // TODO: uncomment and adjust parameter order if estimation is desired and ABI is confirmed.
      // await contract.estimateGas.deposit(numericWagerId, { value, ...(options || {}) });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[BlockchainClient] Gas estimation failed; attempting to send anyway:', e);
    }

    const tx = await contract.deposit(numericWagerId, { value, ...(options || {}) });
    const receipt = await tx.wait();
    return { txHash: receipt?.transactionHash || tx?.hash, receipt };
  }

  /**
   * PUBLIC_INTERFACE
   * formatTxLink
   * Create a block explorer link for a transaction hash if REACT_APP_BLOCK_EXPLORER_BASE is set.
   * @param {string} txHash
   */
  formatTxLink(txHash) {
    /** This is a public function. */
    if (!ENV.EXPLORER || !txHash) return undefined;
    return `${ENV.EXPLORER.replace(/\/+$/, '')}/tx/${txHash}`;
  }
}

/**
 * PUBLIC_INTERFACE
 * sendEscrowDeposit
 * Backward-compatible helper kept for existing imports.
 * Delegates to a transient BlockchainClient instance.
 * @param {{ signer: ethers.Signer, matchId: string|number, amountEth: number|string, escrowAddress?: string, escrowAbi?: any[] }} params
 * @returns {Promise<{txHash: string, receipt?: any}>}
 */
export async function sendEscrowDeposit({ signer, matchId, amountEth, escrowAddress = ENV.ESCROW_ADDRESS, escrowAbi = DEFAULT_ESCROW_ABI }) {
  /** This is a public function. */
  const client = new BlockchainClient({ escrowAddress, escrowAbi, signer });
  return client.deposit({ wagerId: matchId, amountEth });
}
