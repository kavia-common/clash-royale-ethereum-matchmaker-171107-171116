# Escrow UI Integration Notes

This UI is wired for a future backend + web3 integration.

- EscrowModal props:
  - onInitiate({ opponentId, wagerEth }): call your backend to create a match intent and return any reservation/intent ID if needed. The stub simulates latency for now.
  - onDeposit({ opponentId, wagerEth }): perform the Ethereum deposit using ethers.js and a configured ESCROW contract address. Return `{ txHash }`. The current implementation stubs a successful delay.

- Where to connect web3:
  - Import `useEthereumWallet()` to access `provider` and `signer`.
  - Example pseudocode:
    ```js
    import { ethers } from 'ethers';
    const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
    const tx = await contract.deposit(opponentId, { value: ethers.utils.parseEther(String(wagerEth)) });
    const receipt = await tx.wait();
    return { txHash: receipt.transactionHash };
    ```

- Environment variables:
  - Add `REACT_APP_ESCROW_ADDRESS` to hold the contract address.
  - Add `REACT_APP_API_URL` for backend endpoints.

- UX states:
  - review -> confirm -> pending -> success/failure; both prominent and accessible.
  - Ocean Professional theme alignment (primary #2563EB, secondary #F59E0B, error #EF4444).

- Entry points:
  - Challenge button lives in ProfileList and opens EscrowModal for the selected opponent.

