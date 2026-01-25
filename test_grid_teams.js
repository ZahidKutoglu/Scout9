// STEP 1: Test GRID Central Data Feed
// This tests if your API key works and if you can fetch teams

require('dotenv').config({ path: '.env.local' });


const GRID_API_KEY = process.env.GRID_API_KEY;
const GRID_CENTRAL_API = "https://api-op.grid.gg/central-data/graphql";

async function testTeams() {
    const query = `
    query GetTeams {
      teams(first: 5, after: null) {
        totalCount
        pageInfo {
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
        edges {
          cursor
          node {
            id
            name
            logoUrl
            colorPrimary
            colorSecondary
          }
        }
      }
    }
  `;

    const res = await fetch(GRID_CENTRAL_API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": GRID_API_KEY
        },
        body: JSON.stringify({ query })
    });

    const data = await res.json();

    if (data.errors) {
        console.error("❌ GraphQL Error:", data.errors);
        return;
    }

    console.log("✅ Teams fetched:\n");

    data.data.teams.edges.forEach(({ node }) => {
        console.log({
            id: node.id,
            name: node.name,
            logo: node.logoUrl
        });
    });
}

testTeams().catch(console.error);

