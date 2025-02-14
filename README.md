Typesense + Node.js service for Google Maps reviews search using natural language.

## Requirements

- Node.js
- Docker
- SerpAPI key - To retrieve Google Maps reviews
- OpenAI API key - To generate embeddings & answers
- Google Maps contributor ID - To retrieve Google Maps reviews from a specific contributor

# Setup

1. Clone the repository
2. Create a `.env` file in the root directory with the correct environment variables. See `.env.example` for reference.
3. Run `docker compose up` to start the Typesense server
