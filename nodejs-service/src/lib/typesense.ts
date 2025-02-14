import { Client } from "typesense";
import { getContributorReviews } from "./serpAPI";
import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();

const envSchema = z.object({
  TYPESENSE_HOST: z.string().min(1),
  TYPESENSE_PORT: z.string().min(1),
  TYPESENSE_PROTOCOL: z.string().min(1),
  TYPESENSE_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  GOOGLE_MAPS_CONTRIBUTOR_ID: z.string().min(1),
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
export const {
  TYPESENSE_HOST,
  TYPESENSE_PORT,
  TYPESENSE_PROTOCOL,
  TYPESENSE_API_KEY,
  OPENAI_API_KEY,
  GOOGLE_MAPS_CONTRIBUTOR_ID,
} = env;

export const HISTORY_COLLECTION_NAME =
  "google-reviews-conversation-history-store";
export const REVIEWS_COLLECTION_NAME = "google-reviews";
export const CONVERSATION_MODEL_ID = "google-reviews-conversation-model";

const typesense = new Client({
  nodes: [
    {
      host: TYPESENSE_HOST,
      port: parseInt(TYPESENSE_PORT),
      protocol: TYPESENSE_PROTOCOL,
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || "xyz",
  connectionTimeoutSeconds: 2,
});

const TYPESENSE_BASE_URL = `${TYPESENSE_PROTOCOL}://${TYPESENSE_HOST}:${TYPESENSE_PORT}`;

const reviewsSchema = {
  name: REVIEWS_COLLECTION_NAME,
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
          api_key: OPENAI_API_KEY,
        },
      },
    },
  ],
};

const conversationHistorySchema = {
  name: HISTORY_COLLECTION_NAME,
  fields: [
    { name: "conversation_id", type: "string" },
    { name: "model_id", type: "string" },
    { name: "timestamp", type: "int32" },
    { name: "role", type: "string", index: false },
    { name: "message", type: "string", index: false },
  ],
};

export async function getAnswer({ query }: { query: string }) {
  const searchResult = await fetch(
    `${TYPESENSE_BASE_URL}/multi_search?q=${query}&conversation=true&conversation_model_id=${CONVERSATION_MODEL_ID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TYPESENSE-API-KEY": TYPESENSE_API_KEY,
      },
      body: JSON.stringify({
        searches: [
          {
            collection: REVIEWS_COLLECTION_NAME,
            query_by: "embedding",
            exclude_fields: "embedding",
            prefix: false,
          },
        ],
      }),
    }
  ).then((res) => res.json());
  return searchResult.conversation.answer;
}

export async function getSearchResult({ query }: { query: string }) {
  const searchResult = await fetch(
    `${TYPESENSE_BASE_URL}/multi_search?q=${query}&conversation=true&conversation_model_id=${CONVERSATION_MODEL_ID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TYPESENSE-API-KEY": TYPESENSE_API_KEY,
      },
      body: JSON.stringify({
        searches: [
          {
            collection: REVIEWS_COLLECTION_NAME,
            query_by: "embedding",
            exclude_fields: "embedding",
            prefix: false,
            per_page: 30,
          },
        ],
      }),
    }
  ).then((res) => res.json());
  return searchResult;
}

export async function initReviewsCollection() {
  try {
    const existingCollection = await typesense
      .collections(REVIEWS_COLLECTION_NAME)
      .retrieve();
    if (existingCollection) {
      await typesense.collections(REVIEWS_COLLECTION_NAME).delete();
    }
  } catch (err) {
    console.error(
      `Error deleting ${REVIEWS_COLLECTION_NAME} collection in Typesense`,
      err
    );
  }

  try {
    await typesense.collections().create(reviewsSchema as any);
    console.log(`Created ${REVIEWS_COLLECTION_NAME} collection in Typesense`);
  } catch (err) {
    console.error(
      `Error creating ${REVIEWS_COLLECTION_NAME} collection in Typesense`,
      err
    );
    throw err;
  }
}

const initConversationHistoryCollection = async ({
  historyCollectionName,
}: {
  historyCollectionName: string;
}) => {
  try {
    const existingCollection = await typesense
      .collections(historyCollectionName)
      .retrieve();
    if (existingCollection) {
      await typesense.collections(historyCollectionName).delete();
    }
  } catch (err) {
    console.error(
      `Error deleting ${historyCollectionName} collection in Typesense`,
      err
    );
  }
  try {
    await typesense.collections().create(conversationHistorySchema as any);
    console.log(`Created ${historyCollectionName} collection in Typesense`);
  } catch (err) {
    console.error(
      `Error creating ${historyCollectionName} collection in Typesense`,
      err
    );
    throw err;
  }
};

const deleteConversationModel = async ({ id }: { id: string }) => {
  await fetch(`${TYPESENSE_BASE_URL}/conversations/models/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-TYPESENSE-API-KEY": process.env.TYPESENSE_API_KEY || "",
    },
  });
};

const createConversationModel = async ({
  id,
  historyCollectionName,
}: {
  id: string;
  historyCollectionName: string;
}) => {
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
      system_prompt:
        "You are an assistant for question-answering. You can only make conversations based on the provided context. If a response cannot be formed strictly using the provided context, politely say you do not have knowledge about that topic.",
      max_bytes: 16384,
    }),
  });
};

const initConversationModel = async ({
  id,
  historyCollectionName,
}: {
  id: string;
  historyCollectionName: string;
}) => {
  try {
    const existingModel = await typesense.conversations().models(id).retrieve();
    if (existingModel) {
      await deleteConversationModel({ id });
    }
  } catch (err) {
    console.error("Error deleting conversation model:", err);
  }
  try {
    await createConversationModel({ id, historyCollectionName });
  } catch (err) {
    console.error("Error creating conversation model:", err);
    throw err;
  }
};

export async function indexReviewsToTypesense() {
  let nextPageToken: string | undefined;
  let totalImported = 0;

  try {
    await initReviewsCollection();
    do {
      const response = await getContributorReviews({
        contributor_id: GOOGLE_MAPS_CONTRIBUTOR_ID,
        num: 200,
        next_page_token: nextPageToken,
      });
      const documents = response.reviews
        .filter(
          (review) => review.place_info.title && review.place_info.address
        )
        .map((review) => ({
          placeTitle: review.place_info.title,
          placeAddress: review.place_info.address,
          placeType: review.place_info.type,
          date: review.date,
          snippet: review.snippet,
        }));

      await typesense
        .collections(REVIEWS_COLLECTION_NAME)
        .documents()
        .import(documents);
      totalImported += documents.length;

      nextPageToken = response.serpapi_pagination?.next_page_token;
      console.log(`Imported ${totalImported} reviews till now`);
    } while (nextPageToken);
  } catch (err) {
    console.error("Error importing reviews to Typesense");
    // @ts-ignore
    const failedImports = err.importResults
      .map((result: any, index: number) => ({ result, index }))
      .filter(({ result }: { result: any }) => !result.success);
    failedImports.forEach(
      ({ result, index }: { result: any; index: number }) => {
        console.error(`Failed document at index ${index}:`, result);
      }
    );
  }

  try {
    await initConversationHistoryCollection({
      historyCollectionName: HISTORY_COLLECTION_NAME,
    });
    await initConversationModel({
      id: CONVERSATION_MODEL_ID,
      historyCollectionName: HISTORY_COLLECTION_NAME,
    });
  } catch (err) {
    console.error("Error initializing conversational features", err);
    throw err;
  }

  return totalImported;
}

export { typesense };
