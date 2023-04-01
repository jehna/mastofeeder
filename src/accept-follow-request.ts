import SQL from "sql-template-strings";
import { Route, route, Response, Parser } from "typera-express";
import { urlParser } from "./url-parser";
import * as t from "io-ts";
import { fetchUrlInfo } from "./fetch-url-info";
import * as Option from "fp-ts/lib/Option";
import { openDb } from "./db";
import { v4 as uuid } from "uuid";
import { send } from "./send";
import { ActivityPubMessage } from "./ActivityPubMessage";

const followRequest = t.type({
  "@context": t.literal("https://www.w3.org/ns/activitystreams"),
  id: t.string,
  type: t.literal("Follow"),
  actor: t.string, // Follower
  object: t.string, // To be followed
});
type FollowRequest = t.TypeOf<typeof followRequest>;

const acceptActivity = (
  serverHostname: string,
  followedHostname: string,
  activityToAccept: ActivityPubMessage<any, any>
) =>
  ({
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `https://${serverHostname}/${uuid()}`,
    type: "Accept",
    actor: `https://${serverHostname}/${encodeURIComponent(followedHostname)}`,
    object: activityToAccept,
  } as const);

export const acceptFollowRequestRoute: Route<
  Response.Ok | Response.BadRequest<string>
> = route
  .useParamConversions({ url: urlParser })
  .post("/:hostname(url)/inbox")
  .use(Parser.body(followRequest))
  .handler(async (req) => {
    const { hostname } = req.routeParams;
    const { actor: follower, object } = req.body;

    const id = `https://${req.req.hostname}/${encodeURIComponent(hostname)}`;
    if (object !== id)
      return Response.badRequest("Object does not match username");

    const info = await fetchUrlInfo(hostname);
    if (Option.isNone(info) === null)
      return Response.badRequest("Domain does not have a feed");

    try {
      await acceptFollowRequest(hostname, follower);
      await informFollower(req.req.hostname, hostname, follower, req.body);
      return Response.ok();
    } catch (e) {
      console.error(e);
      return Response.badRequest("Error following domain");
    }
  });

const acceptFollowRequest = async (hostname: string, follower: string) => {
  const db = await openDb();
  await db.run(
    SQL`INSERT INTO followers (hostname, follower) VALUES (${hostname}, ${follower})`
  );
};

const informFollower = async (
  serverHostname: string,
  followedHostname: string,
  follower: string,
  request: FollowRequest
) => {
  const message = acceptActivity(serverHostname, followedHostname, request);
  await send(message, follower);
};
