import type { Component } from "solid-js";
import { createSignal, createEffect, For } from "solid-js";
import { createTimer } from "@solid-primitives/timer";
import { Cryptor, Message, baseUrl } from "./models";
import { Base64 } from "js-base64";

const registration = async (
  crypter: Cryptor,
  serverName: string,
): Promise<string> => {
  const publicKey = crypter.rsaCrypter
    .getPublicKey()
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\n/g, "")
    .trim();
  const resp = await fetch(
    `${baseUrl}/room/${serverName}/join?password=password`,
    {
      method: "GET",
      headers: {
        "Public-Key": publicKey,
      },
    },
  );
  const data = (await resp.json()).encryptedKey;
  return crypter.decryptPrivacy(data);
};

const sendMessage = async (message: Message, serverName: string) => {
  const resp = await fetch(`${baseUrl}/room/${serverName}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: message.source,
      data: Base64.fromUint8Array(message.data),
    }),
  });
  let status = await resp.json().then((data) => data["status"]);
  return status;
};

const App: Component = () => {
  const [crypter, setCrypter] = createSignal<Cryptor>(Cryptor.generateKeys());
  createEffect(async () => {
    const key = await registration(crypter(), "main");
    setCrypter((prev) => {
      prev.serverKeyUpdate(key);
      return prev;
    });
  });

  const [text, setText] = createSignal("");
  const [username, setUsername] = createSignal("");
  const [room, setRoom] = createSignal("main");
  const [messages, setMessages] = createSignal([] as Message[]);

  createTimer(
    async () => {
      const resp = await fetch(`${baseUrl}/room/${room()}/messages`, {
        method: "GET",
      });
      const data = await resp.json().then((data) => data["messages"]);
      const newMessages = data.map(
        (rawMessage: { source: string; data: string }) => {
          let message = new Message(
            rawMessage.source,
            Base64.toUint8Array(rawMessage.data),
          );

          return crypter().decryptServer(message);
        },
      );
      setMessages(newMessages);
    },
    1000,
    setInterval,
  );

  return (
    <div class="">
      <header>Your room: {room()}</header>
      <main>
        <form
          onSubmit={() => {
            const encodedData = new TextEncoder().encode(text());
            let message = crypter().encryptServer(
              new Message(username(), encodedData),
            );
            console.log(sendMessage(message, "main"));
          }}
          action={"javascript:void(0)"}
        >
          <label for="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username()}
            onInput={(event) => setUsername(event.target.value)}
          />
          <label for="message">Message:</label>
          <input
            type="text"
            id="message"
            value={text()}
            onInput={(event) => setText(event.target.value)}
          />
          <input type="submit" value="Send message" />
        </form>
        <div>
          <For each={messages()}>
            {(message) => (
              <div>
                <p>From: {message.source}</p>
                <p>Message: {new TextDecoder().decode(message.data)}</p>
              </div>
            )}
          </For>
        </div>
      </main>

      <footer></footer>
    </div>
  );
};

export default App;
