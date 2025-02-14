"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const typesense_1 = require("./lib/typesense");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const port = 3000;
app.post("/search", async (req, res) => {
    const query = req.body.question;
    if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
    }
    const answer = await (0, typesense_1.getAnswer)({
        query,
    });
    res.send(answer);
});
app.get("/index-reviews", async (req, res) => {
    const totalIndexed = await (0, typesense_1.indexReviewsToTypesense)();
    res.json({
        message: `Indexing completed. Total reviews indexed: ${totalIndexed}`,
    });
});
app.get("/search", async (req, res) => {
    const query = req.query.question;
    if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
    }
    const result = await (0, typesense_1.getSearchResult)({
        query,
    });
    res.json({ result });
});
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
