"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.typesense = exports.CONVERSATION_MODEL_ID = exports.REVIEWS_COLLECTION_NAME = exports.HISTORY_COLLECTION_NAME = exports.GOOGLE_MAPS_CONTRIBUTOR_ID = exports.OPENAI_API_KEY = exports.TYPESENSE_API_KEY = exports.TYPESENSE_PROTOCOL = exports.TYPESENSE_PORT = exports.TYPESENSE_HOST = void 0;
exports.getAnswer = getAnswer;
exports.getSearchResult = getSearchResult;
exports.initReviewsCollection = initReviewsCollection;
exports.indexReviewsToTypesense = indexReviewsToTypesense;
const typesense_1 = require("typesense");
const serpAPI_1 = require("./serpAPI");
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    TYPESENSE_HOST: zod_1.z.string().min(1),
    TYPESENSE_PORT: zod_1.z.string().min(1),
    TYPESENSE_PROTOCOL: zod_1.z.string().min(1),
    TYPESENSE_API_KEY: zod_1.z.string().min(1),
    OPENAI_API_KEY: zod_1.z.string().min(1),
    GOOGLE_MAPS_CONTRIBUTOR_ID: zod_1.z.string().min(1),
});
// This gives you a typed env object
const env = envSchema.parse({
    TYPESENSE_HOST: process.env.TYPESENSE_HOST,
    TYPESENSE_PORT: process.env.TYPESENSE_PORT,
    TYPESENSE_PROTOCOL: process.env.TYPESENSE_PROTOCOL,
    TYPESENSE_API_KEY: process.env.TYPESENSE_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_MAPS_CONTRIBUTOR_ID: process.env.GOOGLE_MAPS_CONTRIBUTOR_ID,
});
// Remove the old check and variables
exports.TYPESENSE_HOST = env.TYPESENSE_HOST, exports.TYPESENSE_PORT = env.TYPESENSE_PORT, exports.TYPESENSE_PROTOCOL = env.TYPESENSE_PROTOCOL, exports.TYPESENSE_API_KEY = env.TYPESENSE_API_KEY, exports.OPENAI_API_KEY = env.OPENAI_API_KEY, exports.GOOGLE_MAPS_CONTRIBUTOR_ID = env.GOOGLE_MAPS_CONTRIBUTOR_ID;
exports.HISTORY_COLLECTION_NAME = "google-reviews-conversation-history-store";
exports.REVIEWS_COLLECTION_NAME = "google-reviews";
exports.CONVERSATION_MODEL_ID = "google-reviews-conversation-model";
const typesense = new typesense_1.Client({
    nodes: [
        {
            host: exports.TYPESENSE_HOST,
            port: parseInt(exports.TYPESENSE_PORT),
            protocol: exports.TYPESENSE_PROTOCOL,
        },
    ],
    apiKey: process.env.TYPESENSE_API_KEY || "xyz",
    connectionTimeoutSeconds: 2,
});
exports.typesense = typesense;
const TYPESENSE_BASE_URL = `${exports.TYPESENSE_PROTOCOL}://${exports.TYPESENSE_HOST}:${exports.TYPESENSE_PORT}`;
const reviewsSchema = {
    name: exports.REVIEWS_COLLECTION_NAME,
    fields: [
        { name: "placeTitle", type: "string" },
        { name: "placeAddress", type: "string" },
        { name: "placeType", type: "string", optional: true },
        { name: "date", type: "string" },
        { name: "snippet", type: "string", optional: true },
        {
            name: "embedding",
            type: "float[]",
            optional: true,
            embed: {
                from: ["placeTitle", "placeAddress", "placeType", "date", "snippet"],
                model_config: {
                    model_name: "openai/text-embedding-ada-002",
                    api_key: exports.OPENAI_API_KEY,
                },
            },
        },
    ],
};
const conversationHistorySchema = {
    name: exports.HISTORY_COLLECTION_NAME,
    fields: [
        { name: "conversation_id", type: "string" },
        { name: "model_id", type: "string" },
        { name: "timestamp", type: "int32" },
        { name: "role", type: "string", index: false },
        { name: "message", type: "string", index: false },
    ],
};
async function getAnswer({ query }) {
    const searchResult = await fetch(`${TYPESENSE_BASE_URL}/multi_search?q=${query}&conversation=true&conversation_model_id=${exports.CONVERSATION_MODEL_ID}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-TYPESENSE-API-KEY": exports.TYPESENSE_API_KEY,
        },
        body: JSON.stringify({
            searches: [
                {
                    collection: exports.REVIEWS_COLLECTION_NAME,
                    query_by: "embedding",
                    exclude_fields: "embedding",
                    prefix: false,
                },
            ],
        }),
    }).then((res) => res.json());
    return searchResult.conversation.answer;
}
async function getSearchResult({ query }) {
    const searchResult = await fetch(`${TYPESENSE_BASE_URL}/multi_search?q=${query}&conversation=true&conversation_model_id=${exports.CONVERSATION_MODEL_ID}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-TYPESENSE-API-KEY": exports.TYPESENSE_API_KEY,
        },
        body: JSON.stringify({
            searches: [
                {
                    collection: exports.REVIEWS_COLLECTION_NAME,
                    query_by: "embedding",
                    exclude_fields: "embedding",
                    prefix: false,
                    per_page: 30,
                },
            ],
        }),
    }).then((res) => res.json());
    return searchResult;
}
async function initReviewsCollection() {
    try {
        const existingCollection = await typesense
            .collections(exports.REVIEWS_COLLECTION_NAME)
            .retrieve();
        if (existingCollection) {
            await typesense.collections(exports.REVIEWS_COLLECTION_NAME).delete();
        }
    }
    catch (err) {
        console.error(`Error deleting ${exports.REVIEWS_COLLECTION_NAME} collection in Typesense`, err);
    }
    try {
        await typesense.collections().create(reviewsSchema);
        console.log(`Created ${exports.REVIEWS_COLLECTION_NAME} collection in Typesense`);
    }
    catch (err) {
        console.error(`Error creating ${exports.REVIEWS_COLLECTION_NAME} collection in Typesense`, err);
        throw err;
    }
}
const initConversationHistoryCollection = async ({ historyCollectionName, }) => {
    try {
        const existingCollection = await typesense
            .collections(historyCollectionName)
            .retrieve();
        if (existingCollection) {
            await typesense.collections(historyCollectionName).delete();
        }
    }
    catch (err) {
        console.error(`Error deleting ${historyCollectionName} collection in Typesense`, err);
    }
    try {
        await typesense.collections().create(conversationHistorySchema);
        console.log(`Created ${historyCollectionName} collection in Typesense`);
    }
    catch (err) {
        console.error(`Error creating ${historyCollectionName} collection in Typesense`, err);
        throw err;
    }
};
const deleteConversationModel = async ({ id }) => {
    await fetch(`${TYPESENSE_BASE_URL}/conversations/models/${id}`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "X-TYPESENSE-API-KEY": process.env.TYPESENSE_API_KEY || "",
        },
    });
};
const createConversationModel = async ({ id, historyCollectionName, }) => {
    await fetch(`${TYPESENSE_BASE_URL}/conversations/models`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-TYPESENSE-API-KEY": process.env.TYPESENSE_API_KEY || "",
        },
        body: JSON.stringify({
            id,
            model_name: "openai/gpt-4o",
            history_collection: historyCollectionName,
            api_key: process.env.OPENAI_API_KEY,
            system_prompt: "You are an assistant for question-answering. You can only make conversations based on the provided context. If a response cannot be formed strictly using the provided context, politely say you do not have knowledge about that topic.",
            max_bytes: 16384,
        }),
    });
};
const initConversationModel = async ({ id, historyCollectionName, }) => {
    try {
        const existingModel = await typesense.conversations().models(id).retrieve();
        if (existingModel) {
            await deleteConversationModel({ id });
        }
    }
    catch (err) {
        console.error("Error deleting conversation model:", err);
    }
    try {
        await createConversationModel({ id, historyCollectionName });
    }
    catch (err) {
        console.error("Error creating conversation model:", err);
        throw err;
    }
};
async function indexReviewsToTypesense() {
    let nextPageToken;
    let totalImported = 0;
    try {
        await initReviewsCollection();
        do {
            const response = await (0, serpAPI_1.getContributorReviews)({
                contributor_id: exports.GOOGLE_MAPS_CONTRIBUTOR_ID,
                num: 200,
                next_page_token: nextPageToken,
            });
            const documents = response.reviews
                .filter((review) => review.place_info.title && review.place_info.address)
                .map((review) => ({
                placeTitle: review.place_info.title,
                placeAddress: review.place_info.address,
                placeType: review.place_info.type,
                date: review.date,
                snippet: review.snippet,
            }));
            await typesense
                .collections(exports.REVIEWS_COLLECTION_NAME)
                .documents()
                .import(documents);
            totalImported += documents.length;
            nextPageToken = response.serpapi_pagination?.next_page_token;
            console.log(`Imported ${totalImported} reviews till now`);
        } while (nextPageToken);
    }
    catch (err) {
        console.error("Error importing reviews to Typesense");
        // @ts-ignore
        const failedImports = err.importResults
            .map((result, index) => ({ result, index }))
            .filter(({ result }) => !result.success);
        failedImports.forEach(({ result, index }) => {
            console.error(`Failed document at index ${index}:`, result);
        });
    }
    try {
        await initConversationHistoryCollection({
            historyCollectionName: exports.HISTORY_COLLECTION_NAME,
        });
        await initConversationModel({
            id: exports.CONVERSATION_MODEL_ID,
            historyCollectionName: exports.HISTORY_COLLECTION_NAME,
        });
    }
    catch (err) {
        console.error("Error initializing conversational features", err);
        throw err;
    }
    return totalImported;
}
