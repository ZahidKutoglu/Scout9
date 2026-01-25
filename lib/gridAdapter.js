// GRID adapter for real and mock data
const GRID_API_KEY = process.env.GRID_API_KEY || '';

const MOCK_TEAMS = [
  { id: 't1', name: 'Team Liquid', game: 'Valorant' },
  { id: 't2', name: 'Sentinels', game: 'Valorant' },
  { id: 't3', name: 'G2 Esports', game: 'Valorant' },
  { id: 't4', name: 'Fnatic', game: 'Valorant' },
  { id: 't5', name: 'LOUD', game: 'Valorant' },
];

const MOCK_MATCH_DATA = {
  't1': [
    { opponent: 'Sentinels', score: '2-1', result: 'W', date: '2025-12-10', kda: '1.2', headshots: '25%' },
    { opponent: 'Fnatic', score: '0-2', result: 'L', date: '2025-12-05', kda: '0.8', headshots: '22%' },
    { opponent: 'G2 Esports', score: '2-0', result: 'W', date: '2025-11-28', kda: '1.5', headshots: '28%' },
    { opponent: 'LOUD', score: '2-1', result: 'W', date: '2025-11-20', kda: '1.1', headshots: '24%' },
    { opponent: 'Sentinels', score: '1-2', result: 'L', date: '2025-11-15', kda: '0.9', headshots: '21%' },
  ],
  't2': [
    { opponent: 'Team Liquid', score: '1-2', result: 'L', date: '2025-12-10', kda: '0.9', headshots: '23%' },
    { opponent: 'G2 Esports', score: '2-0', result: 'W', date: '2025-12-02', kda: '1.3', headshots: '26%' },
    { opponent: 'LOUD', score: '2-1', result: 'W', date: '2025-11-25', kda: '1.1', headshots: '24%' },
    { opponent: 'Team Liquid', score: '2-1', result: 'W', date: '2025-11-15', kda: '1.2', headshots: '25%' },
    { opponent: 'Fnatic', score: '1-2', result: 'L', date: '2025-11-08', kda: '1.0', headshots: '22%' },
  ],
};

async function graphqlFetch(query, variables = {}) {
  if (!GRID_API_KEY) return null;
  try {
    const res = await fetch('https://api.grid.gg/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': GRID_API_KEY
      },
      body: JSON.stringify({ query, variables })
    });
    const data = await res.json();
    if (data.errors) {
      console.error('GRID GraphQL Errors:', data.errors);
      return null;
    }
    return data.data;
  } catch (err) {
    console.error('GRID Fetch Error:', err);
    return null;
  }
}

export const fetchTeams = async () => {
  const query = `
    query GetTeams {
      allTeams(first: 20) {
        nodes {
          id
          name
        }
      }
    }
  `;
  const data = await graphqlFetch(query);
  if (data && data.allTeams && data.allTeams.nodes.length > 0) {
    return data.allTeams.nodes;
  }
  
  // Fallback to mock
  await new Promise(resolve => setTimeout(resolve, 300));
  return MOCK_TEAMS;
};

export const fetchMatchData = async (teamId) => {
  // Try real GRID data first if it's a real ID
  if (teamId && !teamId.startsWith('t')) {
     const query = `
      query GetTeamMatches($teamId: ID!) {
        team(id: $teamId) {
          series(first: 5) {
            nodes {
              id
              startTime
              teams {
                team {
                  name
                }
                score
              }
              games {
                id
              }
            }
          }
        }
      }
    `;
    const data = await graphqlFetch(query, { teamId });
    if (data && data.team && data.team.series) {
      return data.team.series.nodes.map(s => {
        const opponent = s.teams.find(t => t.team.id !== teamId)?.team.name || 'Unknown';
        const teamScore = s.teams.find(t => t.team.id === teamId)?.score || 0;
        const oppScore = s.teams.find(t => t.team.id !== teamId)?.score || 0;
        return {
          id: s.id,
          opponent,
          score: `${teamScore}-${oppScore}`,
          result: teamScore > oppScore ? 'W' : 'L',
          date: new Date(s.startTime).toLocaleDateString(),
          kda: 'N/A', // KDA would require deeper game stats
          headshots: 'N/A'
        };
      });
    }
  }

  // Fallback to mock
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_MATCH_DATA[teamId] || MOCK_MATCH_DATA['t1'];
};
