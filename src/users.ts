import { Route, route, Response, URL } from "typera-express";
import fs from "fs";
import * as Option from "fp-ts/lib/Option";
import url from "url";
import { fetchAndParse } from "./fetch-and-parse";

type ActivityStreamUserResponse = {
  "@context": [
    "https://www.w3.org/ns/activitystreams",
    "https://w3id.org/security/v1"
  ];
  id: string;
  type: "Person";
  following?: string;
  followers?: string;
  inbox?: string;
  outbox?: string;
  preferredUsername: string;
  name?: string;
  summary?: string;
  url?: string;
  icon?: {
    type: "Image";
    mediaType: string;
    url: string;
  };
  publicKey: {
    id: string;
    owner: string;
    publicKeyPem: string;
  };
};

const urlParser: URL.Conversion<string> = (s: string) => {
  try {
    if (url.parse(s).protocol !== null)
      throw new Error("Should not provude protocol");
    const parsedUrl = url.parse(`https://${s}`);
    if (parsedUrl.hostname === null) throw new Error("Hostname is null");
    return Option.some(parsedUrl.hostname);
  } catch {
    return Option.none;
  }
};

export const usersRoute: Route<
  Response.Ok<ActivityStreamUserResponse> | Response.NotFound
> = route
  .useParamConversions({ url: urlParser })
  .get("/:username(url)")
  .handler(async (req) => {
    const { username } = req.routeParams;
    const parsed = await fetchAndParse(username);
    if (Option.isNone(parsed)) return Response.notFound();

    const id = `https://${req.req.hostname}/${encodeURIComponent(username)}`;
    return Response.ok({
      "@context": [
        "https://www.w3.org/ns/activitystreams",
        "https://w3id.org/security/v1",
      ],
      id,
      type: "Person",
      preferredUsername: req.routeParams.username,
      inbox: `${id}/inbox`,
      icon: {
        type: "Image",
        mediaType: "image/x-icon",
        url: `https://xkcd.com/s/919f27.ico`,
      },
      publicKey: {
        id: `${id}#main-key`,
        owner: id,
        publicKeyPem: fs.readFileSync("public.pem", "utf8"),
      },
    });
  });
