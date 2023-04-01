import { router, route, Route, Response } from "typera-express";
import { webfingerRoute } from "./webfinger";

const helloRoute: Route<Response.Ok<string>> = route
  .get("/")
  .handler(() => Response.ok("Hello, world!"));

export const routes = router(helloRoute, webfingerRoute).handler();
