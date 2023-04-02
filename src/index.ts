import express from "express";
import bodyParser from "body-parser";
import { routes } from "./routes";
import { fetchAndSendAllFeeds } from "./fetch-and-send-all-feeds";
import { forever } from "./forever";

const app = express();

app.use(bodyParser.json({ type: "application/activity+json" }));

app.use(routes);

app.use("*", (req, res) => {
  console.log(req.baseUrl);
  console.dir(req.body, { depth: null });
  res.status(404).send("Not found");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

forever(1000 * 60 * 60 * 24, fetchAndSendAllFeeds);
