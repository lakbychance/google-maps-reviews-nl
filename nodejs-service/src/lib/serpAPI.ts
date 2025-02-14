interface ContributorReviewsParams {
  contributor_id: string;
  gl?: string; // country code
  hl?: string; // language code
  next_page_token?: string;
  num?: number; // max 200
}

interface Contributor {
  name: string;
  thumbnail: string;
  points: number;
  level: number;
  local_guide: boolean;
  contributions: {
    reviews: number;
    ratings: number;
    photos: number;
    videos: number;
    answers: number;
    edits: number;
    places_added: number;
    roads_added: number;
    facts_checked: number;
    qa: number;
    published_lists: number;
  };
}

interface Review {
  place_info: {
    title: string;
    address: string;
    gps_coordinates: {
      latitude: number;
      longitude: number;
    };
    type?: string;
    thumbnail: string;
    data_id: string;
  };
  date: string;
  snippet: string;
  translated_snippet?: string;
  review_id: string;
  rating: number;
  likes: number;
  link: string;
  details?: Record<string, string>;
  translated_details?: Record<string, string>;
  images?: Array<{
    title: string;
    thumbnail: string;
    date: string;
    snippet?: string;
    video?: string;
  }>;
  response?: {
    date: string;
    snippet: string;
    translated_snippet?: string;
  };
}

interface ContributorReviewsResponse {
  contributor: Contributor;
  reviews: Review[];
  serpapi_pagination?: {
    next: string;
    next_page_token: string;
  };
}

export async function getContributorReviews(
  params: ContributorReviewsParams
): Promise<ContributorReviewsResponse> {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) throw new Error("SERP_API_KEY environment variable is required");

  const searchParams = new URLSearchParams({
    engine: "google_maps_contributor_reviews",
    api_key: apiKey,
    contributor_id: params.contributor_id,
    ...(params.gl && { gl: params.gl }),
    ...(params.hl && { hl: params.hl }),
    ...(params.next_page_token && { next_page_token: params.next_page_token }),
    ...(params.num && { num: params.num.toString() }),
    no_cache: "true",
  });

  const response = await fetch(
    `https://serpapi.com/search?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error(`SerpAPI request failed: ${response.statusText}`);
  }

  return response.json();
}
