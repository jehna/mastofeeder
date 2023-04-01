export type ActivityPubMessage<T, O> = {
  "@context": "https://www.w3.org/ns/activitystreams";
  id: string;
  type: T;
  actor: string;
  object: O;
};
