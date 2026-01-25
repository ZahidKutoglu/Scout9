// Mock AI summary generator
export const generateScoutingReport = async (teamName, matchData) => {
  // Simulating AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const winRate = (matchData.filter(m => m.result === 'W').length / matchData.length * 100).toFixed(0);
  const avgKda = (matchData.reduce((acc, m) => acc + parseFloat(m.kda), 0) / matchData.length).toFixed(2);

  return {
    summary: `${teamName} has shown a ${winRate}% win rate over their last ${matchData.length} matches. They tend to excel in mid-game transitions but have shown vulnerabilities when pressured early. Their recent performance against top-tier teams suggests a reliance on individual playmaking rather than coordinated utility usage.`,
    recommendations: [
      `Aggressive early-game invades to disrupt their default setups.`,
      `Targeted bans on high-impact playmaking agents to force them onto secondary comfort picks.`,
      `Utilization of counter-utility to neutralize their signature defensive rotations.`,
      `Focus on isolating their top performer (AVG KDA: ${avgKda}) during site takes.`,
    ]
  };
};
