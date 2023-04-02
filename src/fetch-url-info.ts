import * as Option from "fp-ts/lib/Option";
import { JSDOM } from "jsdom";
import path from "path";

type UrlInfo = {
  rssUrl: string;
  icon?: string;
};

export const fetchUrlInfo = async (
  hostname: string
): Promise<Option.Option<UrlInfo>> => {
  try {
    const res = await fetch(`https://${hostname}/`);
    if (!res.ok) return Option.none;
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
    });
  } catch (e) {
    console.error(e);
    return Option.none;
  }
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
  return icons.find((icon) => icon.endsWith(".png")); // TODO: Local proxy to convert .ico to .png
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
