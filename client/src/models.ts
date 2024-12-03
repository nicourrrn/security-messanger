import JSChaCha20 from "js-chacha20";
import { JSEncrypt } from "jsencrypt";

export const baseUrl = "http://localhost:8000";

export class Message {
  source: string;
  data: Uint8Array;

  constructor(source: string, data: Uint8Array) {
    this.source = source;
    this.data = data;
  }

  static withSource(source: string): Message {
    return new Message(source, new Uint8Array());
  }

  static empty(): Message {
    return new Message("", new Uint8Array());
  }
}

export class Cryptor {
  rsaCrypter: JSEncrypt;
  serverKey: string | null;

  constructor(serverKey: string | null, publicKey: string, privateKey: string) {
    if (serverKey !== null) {
      this.serverKey = serverKey;
    } else {
      this.serverKey = null;
    }

    this.rsaCrypter = new JSEncrypt();
    this.rsaCrypter.setPublicKey(publicKey);
    this.rsaCrypter.setPrivateKey(privateKey);
  }

  static generateKeys(): Cryptor {
    const keys = new JSEncrypt({
      default_key_size: "2048",
    });
    return new Cryptor(null, keys.getPublicKey(), keys.getPrivateKey());
  }

  serverKeyUpdate(key: string) {
    console.log(key);
    this.serverKey = key;
  }

  decryptPrivacy(data: string): string {
    const result = this.rsaCrypter.decrypt(data);
    return typeof result === "string" ? result : "";
  }

  encryptServer(message: Message): Message {
    if (this.serverKey === null) {
      return message;
    }

    message.data = new JSChaCha20(
      Uint8Array.from(this.serverKey ?? ""),
      Uint8Array.from("123456789012"),
    ).encrypt(message.data);
    return message;
  }

  decryptServer(message: Message): Message {
    if (this.serverKey === null) {
      return message;
    }

    message.data = new JSChaCha20(
      Uint8Array.from(this.serverKey ?? ""),
      Uint8Array.from("123456789012"),
    ).decrypt(message.data);
    return message;
  }
}

export class Room {
  name: string;
  messages: Message[];
  cryptor: JSChaCha20;

  constructor(name: string) {
    this.name = name;
    this.messages = [];
    this.cryptor = new JSChaCha20();
  }

  sendMessage(message: Message) {
    this.messages.push(message);
  }
}
