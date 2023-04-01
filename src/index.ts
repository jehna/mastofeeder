import express from "express";
import bodyParser from "body-parser";
import { routes } from "./routes";

const app = express();

app.use(bodyParser.json({ type: "application/activity+json" }));

app.use(routes);

app.use("*", (req, res) => {
  console.log(req.baseUrl);
  console.log(req.body);
  res.status(404).send("Not found");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
