//
//
// services/blockchain.js
//
// PUBLIC_INTERFACE
// Provides blockchain interactions with dry-run support. If REACT_APP_DRY_RUN_ESCROW=true
// or REACT_APP_ESCROW_ADDRESS is missing, simulate deposits and transaction status.
//

/**
 * Determine if we run escrow in dry-run.
 * This is true if REACT_APP_DRY_RUN_ESCROW=true or no escrow address is configured.
 * Avoid crashing previews when envs are missing.
 */
const DRY_RUN =
  String(process.env.REACT_APP_DRY_RUN_ESCROW || "").toLowerCase() === "true" ||
  !process.env.REACT_APP_ESCROW_ADDRESS;

/**
 * PUBLIC_INTERFACE
 * Address of the escrow contract when not in dry-run. Null otherwise.
 */
const ESCROW_ADDRESS = process.env.REACT_APP_ESCROW_ADDRESS || null;

// Simple event emitter
class SimpleEmitter {
  constructor() {
    this.l = {};
  }
  on(evt, fn) {
    this.l[evt] = this.l[evt] || [];
    this.l[evt].push(fn);
    return () => this.off(evt, fn);
  }
  off(evt, fn) {
    this.l[evt] = (this.l[evt] || []).filter((f) => f !== fn);
  }
  emit(evt, ...args) {
    (this.l[evt] || []).forEach((fn) => fn(...args));
  }
}

// PUBLIC_INTERFACE
export function getEscrowClient() {
  if (DRY_RUN) {
    const emitter = new SimpleEmitter();
    // PUBLIC_INTERFACE
    async function deposit({ from, wagerId, amountEth }) {
      // simulate progress
      const txHash = "0xMOCK" + Math.random().toString(16).slice(2, 10);
      emitter.emit("tx:submitted", { txHash, from, wagerId, amountEth });

      await new Promise((r) => setTimeout(r, 300));
      emitter.emit("tx:pending", { txHash });

      await new Promise((r) => setTimeout(r, 600));
      emitter.emit("tx:confirmed", { txHash, blockNumber: 123456 });

      return {
        txHash,
        wait: async () => ({
          status: 1,
          transactionHash: txHash,
          blockNumber: 123456,
        }),
      };
    }

    return {
      dryRun: true,
      address: null,
      emitter,
      deposit,
    };
  }

  // Real scaffold (avoid importing heavy libs if not installed; tests shouldn't require)
  // Placeholder ABI — do not perform real calls without ABI.
  const ABI = [];
  // In a real integration we'd create a provider and signer using window.ethereum and ethers.js.
  // For now, provide a shape-compatible stub that throws if used without proper ABI.
  return {
    dryRun: false,
    address: ESCROW_ADDRESS,
    emitter: new SimpleEmitter(),
    // PUBLIC_INTERFACE
    async deposit() {
      if (!ABI.length) {
        throw new Error("Escrow ABI not configured. Cannot perform real deposit.");
      }
      throw new Error("Not implemented: real chain interaction.");
    },
  };
}
