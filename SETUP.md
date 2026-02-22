# DecoyPhrase MVP Setup Guide

## Prerequisites

1. **Install Wander Wallet**
   - Chrome Extension: https://www.arconnect.io
   - This is required for Arweave blockchain authentication

2. **Get Testnet AR Tokens**
   - Visit: https://faucet.arweave.net
   - Request free testnet tokens for testing

## Installation

```bash
npm install
```

## Required Dependencies

The following packages are needed:

```json
{
  "arweave": "^1.14.4",
  "arweave-wallet-connector": "^1.0.2"
}
```

## Environment Configuration

Create `.env.local` file:

```env
NEXT_PUBLIC_ARWEAVE_HOST=arweave.net
NEXT_PUBLIC_ARWEAVE_PORT=443
NEXT_PUBLIC_ARWEAVE_PROTOCOL=https
NEXT_PUBLIC_NETWORK=testnet
```

For mainnet, change:

```env
NEXT_PUBLIC_NETWORK=mainnet
```

## Development

```bash
npm run dev
```

Open http://localhost:3000

## Features Implemented

### Phase 1-4 Complete ✅

- Arweave wallet connection (Wander/ArConnect)
- End-to-end encryption (AES-256-GCM)
- Upload encrypted files to Arweave
- Query and download files by wallet address
- File management with localStorage caching
- Wallet connection UI

### Phase 5 Partial ✅

- Character mapping template (94 characters)
- Password transformation logic
- Mapping validation

### Phase 6 Complete ✅

- Arweave utilities
- Transaction ID formatting
- Address shortening

## Usage Flow

1. **Connect Wallet**
   - Click "Connect Wallet" button
   - Approve connection in Wander extension

2. **Create File**
   - Files are automatically encrypted with your wallet address
   - Uploaded to Arweave testnet
   - Stored permanently on blockchain

3. **View Files**
   - Files are queried by your wallet address
   - Auto-decrypt when opened
   - Cached locally for performance

## Security Notes

- **Zero-Knowledge**: Platform cannot decrypt your files
- **Encryption Key**: Derived from your wallet address
- **No Password Storage**: All encryption client-side
- **Blockchain Permanence**: Files stored on Arweave forever

## Testing

### Wallet Connection

1. Install Wander extension
2. Create/import wallet
3. Connect to app
4. Check balance display

### File Operations

1. Create new file
2. Wait for "Pending confirmation" status
3. Sync files (refresh button)
4. Open file to decrypt

### Arweave Explorer

View your transactions:

- https://viewblock.io/arweave/address/YOUR_ADDRESS

## Troubleshooting

### Wallet Not Detected

- Install Wander extension from https://www.arconnect.io
- Refresh page after installation

### Upload Failed

- Check testnet AR balance (need tokens for gas)
- Get tokens from https://faucet.arweave.net
- Verify wallet connection

### Files Not Loading

- Click sync button (refresh icon)
- Check browser console for errors
- Verify wallet address is correct

## Architecture

```
User → Connect Wallet → Create File → Encrypt (client) → Upload to Arweave
                                                              ↓
User ← Decrypt (client) ← Download ← Query by address ← Arweave
```

## Next Steps

- Complete MarkdownEditor mapping mode
- Add DashboardView mapping stats
- Add FileDetailsPanel TX ID links
- Mainnet migration guide
