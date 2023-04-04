import { route, Route, Response } from "typera-express";

export const redirectToGithubRoute: Route<Response.TemporaryRedirect> = route
  .get("/")
  .handler(() =>
    Response.temporaryRedirect(
      "<meta http-equiv='refresh' content='0; url='https://github.com/jehna/mastofeeder'>",
      {
        location: "https://github.com/jehna/mastofeeder",
      }
    )
  );
