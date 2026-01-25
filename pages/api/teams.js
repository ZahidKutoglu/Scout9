import axios from "axios";

const GRID_API_URL = process.env.GRID_API_URL || "https://api-op.grid.gg/central-data/graphql";
const GRID_API_KEY = process.env.GRID_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { search } = req.query;

  try {
    const query = `
      query GetTeams($search: String) {
        teams(
          first: 10, 
          filter: { 
            name: { contains: $search } 
          }
        ) {
          edges {
            node {
              id
              name
              logoUrl
            }
          }
        }
      }
    `;

    const response = await axios.post(
      GRID_API_URL,
      { 
        query, 
        variables: { search: search || "" } 
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": GRID_API_KEY,
        },
      }
    );

    if (response.data.errors) {
      console.error("GRID Search Errors:", JSON.stringify(response.data.errors, null, 2));
      return res.status(500).json({ error: "Failed to fetch teams from GRID", details: response.data.errors });
    }

    const teams = response.data.data.teams.edges.map(edge => edge.node);
    res.status(200).json(teams);
  } catch (err) {
    console.error("Teams Search Error:", err.message);
    res.status(500).json({ error: "Failed to search teams" });
  }
}
