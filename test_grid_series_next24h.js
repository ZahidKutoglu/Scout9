require('dotenv').config({ path: '.env.local' });

const GRID_API_KEY = process.env.GRID_API_KEY;
const GRID_API = "https://api-op.grid.gg/central-data/graphql";

async function testSeries() {
    const query = `
    query GetAllSeriesNext14Days {
      allSeries(
        first: 20
        filter: {
          startTimeScheduled: {
            gte: "2024-04-24T15:00:07+02:00"
            lte: "2024-04-25T15:00:07+02:00"
          }
        } 
        orderBy: StartTimeScheduled
      ) {
        totalCount
        edges {
          node {
            id
            startTimeScheduled
            title {
              nameShortened
            }
            tournament {
              nameShortened
            }
            format {
              nameShortened
            }
            teams {
              baseInfo {
                name
              }
            }
          }
        }
      }
    }
  `;

    const res = await fetch(GRID_API, {
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

    console.log(`✅ Found ${data.data.allSeries.totalCount} series:\n`);

    data.data.allSeries.edges.forEach(({ node }) => {
        console.log({
            id: node.id,
            game: node.title?.nameShortened,
            tournament: node.tournament?.nameShortened,
            time: node.startTimeScheduled,
            format: node.format?.nameShortened,
            teams: node.teams.map(t => t.baseInfo.name)
        });
    });
}

testSeries();