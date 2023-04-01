import * as Option from "fp-ts/lib/Option";

export const fetchAndParse = async (
  hostname: string
): Promise<Option.Option<string>> => {
  try {
    const res = await fetch(`https://${hostname}/`);
    if (!res.ok) return Option.none;
    const html = await res.text();
    return getRssUrl(html);
  } catch {
    return Option.none;
  }
};

const getRssUrl = (html: string): Option.Option<string> => {
  // TODO
  return Option.none;
};
