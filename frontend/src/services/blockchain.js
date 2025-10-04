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

/** Normalize reading env in a safe way for CRA. */
function readEnv(key) {
  try {
    return process.env[key];
  } catch {
    return undefined;
  }
}

/** PUBLIC_INTERFACE */
export function getEnv() {
  /** Returns normalized environment configuration consumed by the dApp. */
  const DEFAULTS = {
    chainId: 11155111, // Sepolia by default
    explorerBase: 'https://sepolia.etherscan.io',
    escrowAddress: '',
  };

  const rawChainId = readEnv('REACT_APP_CHAIN_ID');
  const chainId = Number(rawChainId);
  const explorerBase = (readEnv('REACT_APP_BLOCK_EXPLORER_BASE') || '').trim();
  const escrowAddress = (readEnv('REACT_APP_ESCROW_ADDRESS') || '').trim();

  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    const missing = [];
    if (!rawChainId) missing.push('REACT_APP_CHAIN_ID');
    if (!explorerBase) missing.push('REACT_APP_BLOCK_EXPLORER_BASE');
    if (!escrowAddress) missing.push('REACT_APP_ESCROW_ADDRESS');

    if (missing.length) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Env] Missing environment variables: ${missing.join(
          ', '
        )}. Using defaults where possible. Review frontend/.env.example for guidance.`
      );
    }

    if (rawChainId && (!Number.isFinite(chainId) || chainId <= 0)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Env] REACT_APP_CHAIN_ID="${rawChainId}" is not a valid positive number. Falling back to default (${DEFAULTS.chainId}).`
      );
    }

    if (explorerBase && !/^https?:\/\/.+/i.test(explorerBase)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Env] REACT_APP_BLOCK_EXPLORER_BASE should be a valid URL (e.g., https://sepolia.etherscan.io). Received "${explorerBase}".`
      );
    }

    if (escrowAddress && !/^0x[a-fA-F0-9]{40}$/.test(escrowAddress)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Env] REACT_APP_ESCROW_ADDRESS appears invalid. Expected 0x-prefixed 40 hex chars. Received "${escrowAddress}".`
      );
    }
  }

  return {
    chainId: Number.isFinite(chainId) && chainId > 0 ? chainId : DEFAULTS.chainId,
    explorerBase: explorerBase || DEFAULTS.explorerBase,
    escrowAddress: escrowAddress || DEFAULTS.escrowAddress,
  };
}

const ENV = {
  ESCROW_ADDRESS: readEnv('REACT_APP_ESCROW_ADDRESS'),
  CHAIN_ID: readEnv('REACT_APP_CHAIN_ID'),
  EXPLORER: readEnv('REACT_APP_BLOCK_EXPLORER_BASE'),
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
    const base = getExplorerBase();
    if (!base || !txHash) return undefined;
    return `${base.replace(/\/+$/, '')}/tx/${txHash}`;
  }
}

/** Internal helper to ensure we always use a clean base URL (no trailing slash). */
function sanitizedBase(url) {
  if (!url) return '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

// PUBLIC_INTERFACE
export function getConfiguredChainId() {
  /** Returns the configured chainId (number), with sane defaults and dev warnings handled by getEnv. */
  return getEnv().chainId;
}

// PUBLIC_INTERFACE
export function getExplorerBase() {
  /** Returns the explorer base URL from configuration with sane defaults. */
  return getEnv().explorerBase;
}

// PUBLIC_INTERFACE
export function getEscrowAddress() {
  /** Returns the configured escrow contract address (may be empty string if not set). */
  return getEnv().escrowAddress;
}

// PUBLIC_INTERFACE
export function buildAddressUrl(address) {
  /** Builds a block explorer URL for a contract or wallet address. Returns empty string if inputs are missing. */
  const base = getExplorerBase();
  if (!base || !address) return '';
  return `${sanitizedBase(base)}/address/${address}`;
}

// PUBLIC_INTERFACE
export function buildTxUrl(txHash) {
  /** Builds a block explorer URL for a transaction hash. Returns empty string if inputs are missing. */
  const base = getExplorerBase();
  if (!base || !txHash) return '';
  return `${sanitizedBase(base)}/tx/${txHash}`;
}

// PUBLIC_INTERFACE
export function isValidEthAddress(address) {
  /** Lightweight validation for Ethereum addresses (0x + 40 hex chars). */
  return /^0x[a-fA-F0-9]{40}$/.test(address || '');
}

// PUBLIC_INTERFACE
export function warnIfIncompatibleChain(currentChainId) {
  /**
   * Logs a non-intrusive warning if the wallet's currentChainId does not match the configured chainId.
   * Returns true when compatible, false when incompatible.
   */
  const configured = getConfiguredChainId();
  if (currentChainId && configured && Number(currentChainId) !== Number(configured)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Blockchain] Wallet chain (${currentChainId}) does not match configured chain (${configured}). Some actions may fail.`
    );
    return false;
  }
  return true;
}

/**
 * PUBLIC_INTERFACE
 * sendEscrowDeposit
 * Backward-compatible helper kept for existing imports.
 * Delegates to a transient BlockchainClient instance.
 * @param {{ signer: ethers.Signer, matchId: string|number, amountEth: number|string, escrowAddress?: string, escrowAbi?: any[] }} params
 * @returns {Promise<{txHash: string, receipt?: any}>}
 */
export async function sendEscrowDeposit({ signer, matchId, amountEth, escrowAddress = readEnv('REACT_APP_ESCROW_ADDRESS'), escrowAbi = DEFAULT_ESCROW_ABI }) {
  /** This is a public function. */
  const client = new BlockchainClient({ escrowAddress, escrowAbi, signer });
  return client.deposit({ wagerId: matchId, amountEth });
}
