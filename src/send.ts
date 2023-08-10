import { ActivityPubMessage } from "./ActivityPubMessage";
import crypto from "crypto";
import { PRIVATE_KEY } from "./env";
import fetch from "node-fetch";

export const send = async <Message extends ActivityPubMessage<string, any>>(
  message: Message,
  toActor: string
) => {
  const inbox = toActor + "/inbox"; // TODO: Fetch inbox URL from actor's server
  const { hostname, pathname } = new URL(inbox);

  const digestHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(message))
    .digest("base64");
  const signer = crypto.createSign("sha256");
  const d = new Date();
  const stringToSign = `(request-target): post ${pathname}\nhost: ${hostname}\ndate: ${d.toUTCString()}\ndigest: SHA-256=${digestHash}`;
  signer.update(stringToSign);
  signer.end();
  const signature = signer.sign(PRIVATE_KEY);
  const signature_b64 = signature.toString("base64");
  const keyId = `${message.actor}/#main-key`;
  let header = `keyId="${keyId}",headers="(request-target) host date digest",algorithm="rsa-sha256",signature="${signature_b64}"`;

  const req = await fetch(inbox, {
    headers: {
      Date: d.toUTCString(),
      Digest: `SHA-256=${digestHash}`,
      Signature: header,
    },
    method: "POST",
    body: JSON.stringify(message),
  });

  if (!req.ok) {
    throw new Error(
      `Failed to send message to ${inbox}: ${
        req.statusText
      } / ${await req.text()}`
    );
  }
};
