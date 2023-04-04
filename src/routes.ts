import { router, route, Route, Response } from "typera-express";
import { followUnfollowRoute } from "./accept-follow-request";
import { usersRoute } from "./users";
import { webfingerRoute } from "./webfinger";
import { redirectToGithubRoute } from "./redirect-to-github-route";

export const routes = router(
  redirectToGithubRoute,
  webfingerRoute,
  usersRoute,
  followUnfollowRoute
).handler();
