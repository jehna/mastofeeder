import * as Option from "fp-ts/lib/Option";
import { JSDOM } from "jsdom";
import { openDb } from "./db";
import SQL from "sql-template-strings";
import { parseUsernameToDomainWithPath } from "./parse-domain";
import { Element, xml2js } from "xml-js";
import { findOne, text } from "./xml-utils";
import fetch from "node-fetch";
import { base32 } from "rfc4648";

type UrlInfo = {
  rssUrl: string;
  icon?: string;
  name: string;
};

const cacheUrlInfo = async (hostname: string) => {
  const db = await openDb();
  const cached = await db.get<{
    rss_url?: string;
    icon?: string;
    name: string;
  }>(
    SQL`SELECT * FROM url_info_cache WHERE hostname COLLATE NOCASE = ${hostname} COLLATE NOCASE`
  );
  if (cached) {
    if (cached.rss_url)
      return Option.some({
        rssUrl: cached.rss_url,
        icon: cached.icon,
        name: cached.name,
      });
    return Option.none;
  }

  const urlInfo = await _fetchUrlInfo(hostname);
  if (Option.isSome(urlInfo)) {
    await db.run(
      SQL`INSERT INTO url_info_cache (hostname, rss_url, icon, name) VALUES (${hostname}, ${urlInfo.value.rssUrl}, ${urlInfo.value.icon}, ${urlInfo.value.name})`
    );
  } else {
    await db.run(
      SQL`INSERT INTO url_info_cache (hostname, name) VALUES (${hostname}, ${hostname})`
    );
  }

  return urlInfo;
};

export const fetchUrlInfo = cacheUrlInfo;

const _fetchUrlInfo = async (username: string): Promise<Option.Option<UrlInfo>> => {
  console.log(`Fetching feed URL info for username ${username}...`);
  for (const url of possibleUrlsFromUsername(username)) {
    console.log(`Trying ${url}...`);
    try {
      const result = await _tryFetchUrlInfo(new URL(url));
      if (Option.isSome(result)) {
        console.log(`Feed URL found: ${result.value.rssUrl}.`);
        return result;
      }
    } catch {};
  }

  console.log(`No feeds found for username ${username}.`);
  return Option.none;
};

const possibleUrlsFromUsername = (username: string): string[] => {
  const paths = possiblePathsFromUsername(username);
  const httpsUrls = paths.map((path) => `https://${path}`);
  const httpUrls = paths.map((path) => `http://${path}`);
  return httpsUrls.concat(httpUrls);
}

const possiblePathsFromUsername = (username: string): string[] => {
  const inferredPath = parseUsernameToDomainWithPath(username)
  return [
    username,
    username.replace(/\.\./g, "/"),
    base32decode(username),
    `${username}.rss`,
    `${username}.xml`,
    `${username}/feed/`,
    `${inferredPath}`,
    `${inferredPath}.rss`,
    `${inferredPath}.xml`,
    `${inferredPath}/feed/`,
  ].filter(function(item, pos, self) {
    // remove duplicate paths
    return self.indexOf(item) === pos;
  })
}

const base32decode = (username: string): string => {
  const [hostname, base32encodedPath] = username.split("._.");
  if (!base32encodedPath) { return username }
  const uint8array = base32.parse(base32encodedPath, { loose: true });
  const path = new TextDecoder().decode(uint8array);
  return `${hostname}/${path}`
}

const _tryFetchUrlInfo = async (url: URL): Promise<Option.Option<UrlInfo>> =>{
  let res = await fetch(url);
  if (!res.ok) return Option.none;

  const content = await res.text();
  const isFeed = ["application/xml", "application/rss+xml", "text/xml"].some(
    (type) => res.headers.get("Content-Type")?.startsWith(type)
  );

  if (isFeed) return Option.some(getUrlInfoFromFeed(url, content));
  return await getUrlInfoFromPage(url, content);
}

const getUrlInfoFromFeed = (url: URL, content: string): UrlInfo =>
  ({
    rssUrl: url.toString(),
    name: parseNameFromFeed(content) ?? url.toString(),
    icon: getIconFromFeed(content),
  });

const parseNameFromFeed = (rss: string): string | undefined => {
  const doc = xml2js(rss, { compact: false }) as Element;
  return text(findOne("title", doc)) ?? undefined;
}

const getIconFromFeed = (rss: string): string | undefined => {
  const doc = xml2js(rss, { compact: false }) as Element;
  return text(findOne("icon", doc)) ?? text(findOne("url", findOne("image", doc)));
};

const getUrlInfoFromPage = async(url: URL, content: string): Promise<Option.Option<UrlInfo>> => {
  const linkedUrl = getFullUrl(getLinkedFeedUrl(content), url);
  if (!linkedUrl) return Option.none;

  let res = await fetch(linkedUrl);
  if (!res.ok) return Option.none;

  let linkedInfo = getUrlInfoFromFeed(new URL(linkedUrl, url), await res.text());
  let icon = getPngIcon(content);
  if (icon) {
    linkedInfo.icon = icon;
  }
  return Option.some(linkedInfo);
}

const getLinkedFeedUrl = (html: string): string | undefined =>
  new JSDOM(html).window.document
    .querySelector('link[type="application/rss+xml"]')
    ?.getAttribute("href") ?? undefined;

const getFullUrl = (url: string | undefined, base: URL | undefined): URL | undefined => {
  if (!url || !base) return undefined;
  return new URL(url, base);
};

const getPngIcon = (html: string): string | undefined => {
  const document = new JSDOM(html).window.document;
  const icons = [
    ...getLinkHref(document, "apple-touch-icon"),
    ...getLinkHref(document, "icon"),
    ...getLinkHref(document, "shortcut icon"),
    ...getMetaContent(document, "og:image"),
  ];
  return icons.find((icon) => icon.endsWith(".png") || icon.endsWith("gif")); // TODO: Local proxy to convert .ico to .png
};

const getLinkHref = (doc: Document, rel: string): string[] =>
  [...doc.querySelectorAll(`link[rel="${rel}"]`)].flatMap((link) => {
    const href = link.getAttribute("href");
    return href ? [href] : [];
  });

const getMetaContent = (doc: Document, property: string): string[] =>
  [...doc.querySelectorAll(`meta[property="${property}"]`)].flatMap((meta) => {
    const content = meta.getAttribute("content");
    return content ? [content] : [];
  });
