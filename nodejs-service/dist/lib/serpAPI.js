"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContributorReviews = getContributorReviews;
async function getContributorReviews(params) {
    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey)
        throw new Error("SERP_API_KEY environment variable is required");
    const searchParams = new URLSearchParams({
        engine: "google_maps_contributor_reviews",
        api_key: apiKey,
        contributor_id: params.contributor_id,
        ...(params.gl && { gl: params.gl }),
        ...(params.hl && { hl: params.hl }),
        ...(params.next_page_token && { next_page_token: params.next_page_token }),
        ...(params.num && { num: params.num.toString() }),
    });
    const response = await fetch(`https://serpapi.com/search?${searchParams.toString()}`);
    if (!response.ok) {
        throw new Error(`SerpAPI request failed: ${response.statusText}`);
    }
    return response.json();
}
