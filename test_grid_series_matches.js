require('dotenv').config({ path: '.env.local' });

const API_URL = "https://api-op.grid.gg/central-data/graphql";
const API_KEY = process.env.GRID_API_KEY;
const SERIES_ID = "2653988";

const query = `
query GetSeriesMatches($id: ID!) {
  series(id: $id) {
    id
    matches {
      id
      startTime
      status
    }
  }
}
`;

async function run() {
    const res = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
        },
        body: JSON.stringify({
            query,
            variables: { id: SERIES_ID },
        }),
    });

    const json = await res.json();

    if (json.errors) {
        console.error("❌ GraphQL Error:", json.errors);
        return;
    }

    console.log("✅ Matches in series:");
    console.log(json.data.series.matches);
}

run();
