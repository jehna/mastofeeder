import { Element } from "xml-js";

export const findAll = (name: string, doc: Element): Element[] => {
  return (
    doc.elements?.flatMap((element) =>
      element.name === name ? [element] : findAll(name, element)
    ) ?? []
  );
};
export const findOne = (name: string, doc: Element | undefined): Element | undefined => {
  for (const element of doc?.elements ?? []) {
    if (element.name === name) return element;
    const found = findOne(name, element);
    if (found) return found;
  }
  return undefined;
};

export const text = (element?: Element): string | undefined => {
  const elem = element?.elements?.find(
    (e) => e.type === "text" || e.type === "cdata"
  );
  return elem?.text?.toString() ?? elem?.cdata?.toString();
};
