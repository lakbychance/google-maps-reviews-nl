import express from "express";
import { Request, Response } from "express";
import {
  getAnswer,
  getSearchResult,
  indexReviewsToTypesense,
} from "./lib/typesense";

const app = express();
app.use(express.json());
const port = process.env.PORT;

app.post("/search", async (req: Request, res: Response) => {
  const query = req.body.question as string;

  if (!query) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  const answer = await getAnswer({
    query,
  });

  res.send(answer);
});

app.get("/index-reviews", async (req: Request, res: Response) => {
  const totalIndexed = await indexReviewsToTypesense();
  res.json({
    message: `Indexing completed. Total reviews indexed: ${totalIndexed}`,
  });
});

app.get("/search", async (req: Request, res: Response) => {
  const query = req.query.question as string;

  if (!query) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  const result = await getSearchResult({
    query,
  });

  res.json({ result });
});

app.listen(port, () => {
  console.log(`Server running`);
});
