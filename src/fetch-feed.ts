import { fetchUrlInfo } from "./fetch-url-info";
import * as Option from "fp-ts/lib/Option";
import { xml2js, Element } from "xml-js";
import { findAll, findOne, text } from "./xml-utils";

export const fetchFeed = async (hostname: string): Promise<RssItem[]> => {
  const urlInfo = await fetchUrlInfo(hostname);
  if (Option.isNone(urlInfo)) return [];
  const res = await fetch(urlInfo.value.rssUrl);
  if (!res.ok) return [];
  const xml = await res.text();
  const items = parseRssItems(xml);
  return items;
};

export type RssItem = (
  | { title?: string; description: string }
  | { title: string; description?: string }
) & {
  link?: string;
  pubDate?: string;
  guid?: string;
};

const parseRssItems = (xml: string): RssItem[] => {
  const doc = xml2js(xml, { compact: false }) as Element;
  const items = findAll("item", doc);

  return items.map((item) => {
    const title = text(findOne("title", item))!;
    const description = text(findOne("description", item));
    const link = text(findOne("link", item));
    const pubDate = text(findOne("pubDate", item));
    const guid = text(findOne("guid", item));
    return {
      title,
      description,
      link,
      pubDate,
      guid,
    };
  });
};
