import { ethers } from 'ethers';

// Basic ABI stub for a simple escrow contract with a deposit method.
// Adjust to match the actual contract once available.
const DEFAULT_ESCROW_ABI = [
  // function deposit(uint256 matchId) payable
  "function deposit(uint256 matchId) payable",
];

// PUBLIC_INTERFACE
export async function sendEscrowDeposit({ signer, matchId, amountEth, escrowAddress = process.env.REACT_APP_ESCROW_ADDRESS, escrowAbi = DEFAULT_ESCROW_ABI }) {
  /**
   * Sends an escrow deposit transaction to the specified contract.
   * Requires signer (from ethers) and environment variable REACT_APP_ESCROW_ADDRESS.
   */
  if (!signer) {
    throw new Error('No signer found. Please connect your wallet.');
  }
  if (!escrowAddress) {
    throw new Error('Missing REACT_APP_ESCROW_ADDRESS. Set it in the environment.');
  }
  if (!amountEth || Number(amountEth) <= 0) {
    throw new Error('Invalid amount for deposit.');
  }
  // Fallback: if matchId is not numeric, default to 0 but allow backend linkage by wallet/tx.
  const numericMatchId = Number.isFinite(Number(matchId)) ? Number(matchId) : 0;

  const contract = new ethers.Contract(escrowAddress, escrowAbi, signer);
  const value = ethers.utils.parseEther(String(amountEth));

  // Gas estimate can fail if ABI/method mismatch. Wrap it for clearer error.
  try {
    // Optional: await contract.estimateGas.deposit(numericMatchId, { value });
  } catch (e) {
    // Continue; we'll still try to send the tx.
    // eslint-disable-next-line no-console
    console.warn('Gas estimation failed, attempting to send anyway:', e);
  }

  const tx = await contract.deposit(numericMatchId, { value });
  const receipt = await tx.wait();
  return {
    txHash: receipt?.transactionHash || tx?.hash,
    receipt,
  };
}
