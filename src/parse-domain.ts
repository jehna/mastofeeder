import fs from "fs";

const TLDS = fs.readFileSync(`./tlds.dat`, "utf8").split("\n").filter(Boolean);

export const parseUsernameToDomainWithPath = (username: string) => {
  const parts = username.split(".");
  for (let i = 1; i < parts.length; i++) {
    const tld = parts[i];
    if (TLDS.includes(tld)) {
      const domainPart = parts.slice(0, i + 1).join(".");
      return [domainPart, ...parts.slice(i + 1)].join("/");
    }
  }
  return username;
};
