## Introduction

As an active google maps contributor, I find the lack of an intuitive interface to recall places, food etc one have documented rather surprising. So I thought of solving this problem for myself.

Typesense is used to power the RAG pipeline and SerpAPI to fetch the google maps reviews for a contributor. Both combined result in a web service that you can hit to query your reviews using natural language.

I specifically wanted an experience straight from my iPhone so have created two apple shortcuts (one textual and another voice based) to call the web service and get the results.

https://github.com/user-attachments/assets/d74f757e-72aa-4b2f-a5b4-74e5f057e942

## Requirements

- Node.js
- Docker
- SerpAPI key - To retrieve Google Maps reviews
- OpenAI API key - To generate embeddings & answers
- Google Maps contributor ID - To retrieve Google Maps reviews from a specific contributor

# Setup

1. Clone the repository
2. Create a `.env` file in the root directory with the correct environment variables. See `.env.example` for reference.
3. Create a `typesense-data` directory in the root directory.
4. Run `docker compose up` to start the service.

# How to use with Apple shortcuts ?

https://github.com/user-attachments/assets/0cde2e0e-c9a5-47c3-ab21-edd6445c3fde
