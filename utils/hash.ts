import { z } from "zod";

const ipSchema = z.string().min(1, "IP cannot be empty");


export async function generateIPHash(ip: string): Promise<string> {
  const keyHex = Bun.env.IP_HMAC_KEY_HEX;

  if (!keyHex || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error("IP_HMAC_KEY_HEX must be a 64-character hex-encoded HMAC key.");
  }

  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < keyBytes.length; i++) {
    keyBytes[i] = Number.parseInt(keyHex.slice(i * 2, i * 2 + 2), 16);
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(ipSchema.parse(ip)),
  );
  const hashHex = Array.from(new Uint8Array(mac))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `anon_${hashHex.substring(0, 24)}`;
}

export interface EncryptedIp {
  algorithm: "AES-256-GCM";
  nonce: string;
  ciphertext: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/** Encrypts an IP address; retain nonce and ciphertext together to decrypt later. */
export async function encryptIP(ip: string): Promise<EncryptedIp> {
  const plaintext = ipSchema.parse(ip);
  const keyHex = Bun.env.KEY32_HEX;

  if (!keyHex || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error("KEY32_HEX must be a 64-character hex-encoded AES-256 key.");
  }

  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < keyBytes.length; i++) {
    keyBytes[i] = Number.parseInt(keyHex.slice(i * 2, i * 2 + 2), 16);
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    new TextEncoder().encode(plaintext),
  );

  return {
    algorithm: "AES-256-GCM",
    nonce: toBase64(nonce),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}
