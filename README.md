# DecoyPhrase

DecoyPhrase is a decentralized, zero-knowledge vault application built on the Arweave blockchain. It features plausible deniability through a multi-password architecture, allowing users to store sensitive data securely while maintaining the ability to disclose alternative "decoy" contents under duress.

## Features

- **Zero-Knowledge Architecture**: All files are encrypted client-side before transmission. The server and storage providers never see your raw data or passwords.
- **Plausible Deniability**: Support for up to three distinct passwords (Primary, Secondary, Tertiary). Each password unlocks a completely different set of files, making it impossible for an adversary to prove the existence of other hidden data.
- **Decentralized Storage**: Files are stored permanently on the Arweave blockchain using Turbo for high-throughput uploads.
- **Encrypted File Management**: Full file system capabilities including upload, folder organization, and secure retrieval.

## Architecture

The application is built with **Next.js 14** and uses **React Context** for state management.

- **Authentication**: Users authenticate purely client-side. The password derives encryption keys used to decrypt the user's specific file index.
- **Storage Layer**: Leveraging **Turbo** (Arweave L2) for subsidized and instant data availability.
- **Security**:
  - Keys are derived using PBKDF2/Argon2 (depending on implementation specifics).
  - Files are encrypted using AES-GCM (standard for authenticated encryption).

## Prerequisites

- **Node.js**: Version 18.17 or higher.
- **Arweave Wallet**: You need an Arweave wallet JSON Web Key (JWK) to act as the master funding source for uploads.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/decoyphrase/decoyphrase-core.git
   cd decoyphrase
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file in the root directory. You must provide a Master Wallet JWK to fund the Turbo upload service.

   ```bash
   cp .env.example .env.local
   ```

   Open `.env.local` and add your wallet configuration:

   ```env
   # Your Arweave Wallet JWK (JSON format stringified)
   NEXT_PUBLIC_MASTER_WALLET_JWK={"kty":"RSA","n":"...","e":"AQAB",...}
   ```

   _Note: Ensure the wallet has a small amount of AR or Turbo credits to facilitate uploads._

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to access the vault.

## Security Notice

This software provides client-side encryption. However, for maximum security:

1. Always run this application in a trusted environment (localhost or a verified deployment).
2. Do not lose your passwords. Due to the zero-knowledge design, there is no password recovery mechanism. If you lose your password, your data is cryptographically inaccessible forever.

## License

MIT
