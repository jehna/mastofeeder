import { openDb } from "./db";
import { fetchFeed, RssItem } from "./fetch-feed";
import SQL from "sql-template-strings";
import { send } from "./send";
import { JSDOM } from "jsdom";
import { v4 as uuid } from "uuid";
import { serverHostname } from "./env";

export const fetchAndSendAllFeeds = async () => {
  const hostnames = await getUniqueHostnames();
  for (const followedHostname of hostnames) {
    const items = await fetchFeed(followedHostname);
    for (const item of items.reverse()) {
      const wasNew = await insertItem(followedHostname, item);
      if (wasNew) {
        await notifyFollowers(followedHostname, item);
      }
    }
  }
};

const getUniqueHostnames = async () => {
  const db = await openDb();
  const hostnames = await db.all<{ hostname: string }[]>(
    "SELECT DISTINCT hostname FROM followers"
  );
  return hostnames.map((row) => row.hostname);
};

const insertItem = async (hostname: string, item: RssItem) => {
  const db = await openDb();
  const wasNew = await db.run(
    SQL`INSERT OR IGNORE INTO seen (hostname, id) VALUES (${hostname}, ${uniqueIdentifier(
      item
    )})`
  );
  return wasNew.changes === 1;
};

const uniqueIdentifier = (item: RssItem) => {
  return item.guid ?? item.link ?? item.title ?? item.description;
};

const notifyFollowers = async (followedHostname: string, item: RssItem) => {
  const followers = await getFollowers(followedHostname);
  for (const follower of followers) {
    await sendNotification(follower, followedHostname, item);
  }
};

const getFollowers = async (hostname: string) => {
  const db = await openDb();
  const followers = await db.all<{ follower: string }[]>(
    SQL`SELECT follower FROM followers WHERE hostname = ${hostname}`
  );
  return followers.map((row) => row.follower);
};

const sendNotification = async (
  follower: string,
  followedHostname: string,
  item: RssItem
) => {
  const message = createNoteMessage(
    followedHostname,
    rssItemToNoteHtml(item),
    getDescriptionImages(item.description ?? "")
  );
  await send(message, follower);
};

const createNoteMessage = (
  followedHostname: string,
  content: string,
  images: Image[]
) => {
  const actor = `https://${serverHostname}/${encodeURIComponent(
    followedHostname
  )}`;
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `https://${serverHostname}/${uuid()}`,
    type: "Create",
    actor,
    published: new Date().toISOString(),
    object: {
      id: `https://${serverHostname}/${uuid()}`,
      type: "Note",
      published: new Date().toISOString(),
      attributedTo: actor,
      content,
      sensitive: false,
      to: "https://www.w3.org/ns/activitystreams#Public",
      attachment: images.map((image) => ({
        type: "Image",
        mediaType: `image/${image.type}`,
        url: image.url,
        name: image.alt,
      })),
    },
  } as const;
};

const rssItemToNoteHtml = (item: RssItem) => {
  const title = item.title ? `<h1>${item.title}</h1>` : "";
  const descStripped = item.description?.replace(/<img[^>]*>/g, "");
  const description = descStripped ? `<p>${descStripped}</p>` : "";
  const link = item.link ? `<a href="${item.link}">${item.link}</a>` : "";
  return `${title}\n\n${description}\n\n${link}`;
};

type Image = {
  url: string;
  type: string;
  alt?: string;
};

const getDescriptionImages = (description: string): Image[] => {
  const document = new JSDOM(description).window.document;
  return [...document.querySelectorAll("img")]
    .map((img) => ({
      url: img.getAttribute("src") ?? "",
      type:
        img.getAttribute("src")?.split(".").pop()?.replace("jpg", "jpeg") ??
        "jpeg",
      alt: img.getAttribute("alt") ?? img.getAttribute("title") ?? undefined,
    }))
    .filter((img) => img.url !== "");
};
