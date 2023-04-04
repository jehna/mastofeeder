import * as Option from "fp-ts/lib/Option";
import { JSDOM } from "jsdom";
import path from "path";
import { openDb } from "./db";
import SQL from "sql-template-strings";
import { parseUsernameToDomainWithPath } from "./parse-domain";
import { Element, xml2js } from "xml-js";
import { findOne, text } from "./xml-utils";

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
  }>(SQL`SELECT * FROM url_info_cache WHERE hostname = ${hostname}`);
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

const _fetchUrlInfo = async (
  username: string
): Promise<Option.Option<UrlInfo>> => {
  const hostname = parseUsernameToDomainWithPath(username);
  try {
    let res = await fetch(`https://${hostname}/`);
    let hasXmlExtension = false; // TODO: Refactor, the logic is getting messy
    if (!res.ok) {
      res = await fetch(`https://${hostname}.xml`);
      hasXmlExtension = true;
    }
    if (!res.ok) return Option.none;

    const isRss = ["application/xml", "application/rss+xml", "text/xml"].some(
      (type) => res.headers.get("Content-Type")?.startsWith(type)
    );
    if (isRss)
      return Option.some({
        rssUrl: `https://${hostname}` + (hasXmlExtension ? ".xml" : ""),
        name: parseNameFromRss(await res.text(), hostname),
        icon: await getIconForDomain(hostname),
      });

    const html = await res.text();
    const rssUrl =
      ensureFullUrl(getRssValue(html), hostname) ??
      (await tryWordpressFeed(hostname));
    if (!rssUrl)
      return hostname.endsWith("/blog")
        ? Option.none
        : fetchUrlInfo(hostname + "/blog");

    return Option.some({
      rssUrl,
      icon: ensureFullUrl(getPngIcon(html), hostname),
      name: parseNameFromRss(
        await fetch(rssUrl).then((res) => res.text()),
        hostname
      ),
    });
  } catch (e) {
    console.error(e);
    return Option.none;
  }
};

const parseNameFromRss = (rss: string, fallback: string): string => {
  const doc = xml2js(rss, { compact: false }) as Element;
  return text(findOne("title", doc)) ?? fallback;
};
const tryWordpressFeed = async (
  hostname: string
): Promise<string | undefined> => {
  const res = await fetch(`https://${hostname}/feed/`);
  return res.ok ? `https://${hostname}/feed/` : undefined;
};

const getRssValue = (html: string): string | undefined =>
  new JSDOM(html).window.document
    .querySelector('link[type="application/rss+xml"]')
    ?.getAttribute("href") ?? undefined;

const ensureFullUrl = (
  urlOrPath: string | undefined,
  hostname: string
): string | undefined => {
  if (!urlOrPath) return undefined;
  try {
    const url = new URL(urlOrPath);
    if (url.hostname !== null) return urlOrPath;
  } catch {}

  return path.join(`https://${hostname}`, urlOrPath);
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

const getIconForDomain = async (url: string): Promise<string | undefined> => {
  const domain = new URL(`https://${url}`).hostname;
  const html = await fetch(`https://${domain}/`).then((res) => res.text());
  return ensureFullUrl(getPngIcon(html), domain);
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
