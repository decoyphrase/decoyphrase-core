import { PasswordSlot } from "../types";

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const ITERATIONS = 100000;
const HASH = "SHA-256";

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
}

const getSubtleCrypto = (): SubtleCrypto => {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API not available");
  }
  return window.crypto.subtle;
};

const generateSalt = (): Uint8Array => {
  return window.crypto.getRandomValues(new Uint8Array(16));
};

const generateIV = (): Uint8Array => {
  return window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
};

const deriveKey = async (
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> => {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const importedKey = await subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );

  const derivedKey = await subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: HASH,
    },
    importedKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );

  return derivedKey;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  try {
    if (!base64) return new Uint8Array(0).buffer;

    // 1. Handle URL-safe characters and common encoding issues (space -> +)
    let str = base64.replace(/-/g, "+").replace(/_/g, "/").replace(/ /g, "+");

    // 2. Remove all non-base64 characters (including whitespace)
    str = str.replace(/[^A-Za-z0-9+/=]/g, "");

    // 3. Add padding if needed
    while (str.length % 4 !== 0) {
      str += "=";
    }

    // Standard Base64 decoding
    const binaryString = atob(str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    console.warn("Base64 decoding failed for string:", base64, error);
    // Return empty buffer rather than crashing
    return new Uint8Array(0).buffer;
  }
};

export const encryptData = async (
  data: string,
  password: string,
): Promise<EncryptedData> => {
  try {
    const subtle = getSubtleCrypto();
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKey(password, salt);

    const encryptedBuffer = await subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      dataBuffer,
    );

    return {
      ciphertext: arrayBufferToBase64(encryptedBuffer),
      iv: arrayBufferToBase64(iv),
      salt: arrayBufferToBase64(salt),
    };
  } catch {
    throw new Error("Failed to encrypt data");
  }
};

export const decryptData = async (
  encryptedData: EncryptedData,
  password: string,
): Promise<string> => {
  try {
    const subtle = getSubtleCrypto();
    const decoder = new TextDecoder();

    const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
    const ivBuffer = base64ToArrayBuffer(encryptedData.iv);
    const saltBuffer = base64ToArrayBuffer(encryptedData.salt);

    // Validate buffers before attempting crypto operations
    if (
      ciphertext.byteLength === 0 ||
      ivBuffer.byteLength === 0 ||
      saltBuffer.byteLength === 0
    ) {
      throw new Error("Invalid encrypted data: empty buffers");
    }

    const iv = new Uint8Array(ivBuffer);
    const salt = new Uint8Array(saltBuffer);

    const key = await deriveKey(password, salt);

    const decryptedBuffer = await subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      ciphertext,
    );

    return decoder.decode(decryptedBuffer);
  } catch {
    // Fail silently/gracefully as this is expected when:
    // 1. Password is wrong
    // 2. Data is not actually encrypted (random metadata)
    // 3. Base64 is invalid
    throw new Error("Failed to decrypt data");
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  try {
    const subtle = getSubtleCrypto();
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await subtle.digest(HASH, data);
    return arrayBufferToBase64(hashBuffer);
  } catch {
    throw new Error("Failed to hash password");
  }
};

export const deriveUserEncryptionKey = async (
  username: string,
  password: string,
): Promise<string> => {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const combinedData = encoder.encode(`${username}:${password}`);

  const salt = encoder.encode("decoyphrase-user-key");

  const importedKey = await subtle.importKey(
    "raw",
    combinedData,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const derivedBits = await subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: HASH,
    },
    importedKey,
    256,
  );

  return arrayBufferToBase64(derivedBits);
};

export const verifyPassword = async (
  username: string,
  password: string,
  testData: string = "test-verification",
): Promise<boolean> => {
  try {
    const encryptionKey = await deriveUserEncryptionKey(username, password);
    const encrypted = await encryptData(testData, encryptionKey);
    const decrypted = await decryptData(encrypted, encryptionKey);
    return decrypted === testData;
  } catch {
    return false;
  }
};

export const deriveMultipleKeys = async (
  username: string,
  passwords: { primary: string; secondary?: string; tertiary?: string },
): Promise<Record<PasswordSlot, string>> => {
  const keys: Partial<Record<PasswordSlot, string>> = {};

  keys.primary = await deriveUserEncryptionKey(username, passwords.primary);

  if (passwords.secondary) {
    keys.secondary = await deriveUserEncryptionKey(
      username,
      passwords.secondary,
    );
  }

  if (passwords.tertiary) {
    keys.tertiary = await deriveUserEncryptionKey(username, passwords.tertiary);
  }

  return keys as Record<PasswordSlot, string>;
};

export const verifyPasswordSlot = async (
  username: string,
  password: string,
  encryptedData: EncryptedData,
): Promise<boolean> => {
  try {
    const encryptionKey = await deriveUserEncryptionKey(username, password);
    await decryptData(encryptedData, encryptionKey);
    return true;
  } catch {
    return false;
  }
};

export const encryptJWK = async (
  jwk: Record<string, string>,
  password: string,
): Promise<EncryptedData> => {
  const jwkString = JSON.stringify(jwk);
  return encryptData(jwkString, password);
};

export const decryptJWK = async (
  encryptedData: EncryptedData,
  password: string,
): Promise<Record<string, string>> => {
  const jwkString = await decryptData(encryptedData, password);
  return JSON.parse(jwkString) as Record<string, string>;
};

export const deriveKeyFromPassword = async (
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> => {
  return deriveKey(password, salt);
};

export const encryptWithKey = async (
  data: string,
  key: string,
): Promise<EncryptedData> => {
  return encryptData(data, key);
};

export const decryptWithKey = async (
  encryptedData: EncryptedData,
  key: string,
): Promise<string> => {
  return decryptData(encryptedData, key);
};
