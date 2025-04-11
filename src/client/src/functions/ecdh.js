"use strict";
import config from "../config";

const ecdh = {
    generateKeyPair: async function () {
        return await config.crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-521"
            },
            true,
            ["deriveKey"]
        );
    },
    deriveSecretKey: async function (privateKey, publicKey) {
        return await config.crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: publicKey
            },
            privateKey,
            {
                name: "AES-GCM",
                length: 256
            },
            true,
            ["encrypt", "decrypt"]
        );
    },
    exportPublicKey: async function (key) {
        const exported = await config.crypto.subtle.exportKey("raw", key);
        return Array.from(new Uint8Array(exported));
    },
    exportPrivateKey: async function (key) {
        const exported = await config.crypto.subtle.exportKey("raw", key);
        return Array.from(new Uint8Array(exported));
    },
    importPublicKey: async function (rawKey) {
        return await config.crypto.subtle.importKey(
            "raw",
            new Uint8Array(rawKey),
            {
                name: "ECDH",
                namedCurve: "P-521"
            },
            true,
            []
        );
    },
    exportKey: async function (key) {
        return await config.crypto.subtle.exportKey("jwk", key);
    },
    importKey: async function (jwk, type) {
        return await config.crypto.subtle.importKey(
            "jwk",
            jwk,
            {
                name: "ECDH",
                namedCurve: "P-521"
            },
            true,
            type === "public" ? [] : ["deriveKey"]
        );
    }
};

export default ecdh;