import { URL } from "typera-express";
import url from "url";
import * as Option from "fp-ts/lib/Option";

export const urlParser: URL.Conversion<string> = (s: string) => {
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
