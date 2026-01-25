import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json());

/* -------------------- CONFIG -------------------- */

const GRID_API_URL = process.env.GRID_API_URL;
const GRID_API_KEY = process.env.GRID_API_KEY;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/* -------------------- HELPERS -------------------- */

async function gridQuery(query, variables = {}) {
    const res = await axios.post(
        GRID_API_URL,
        { query, variables },
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${GRID_API_KEY}`,
            },
        }
    );

    if (res.data.errors) {
        throw new Error(JSON.stringify(res.data.errors));
    }

    return res.data.data;
}

/* -------------------- SCOUT SCORE -------------------- */

function calculateScoutScore(stats) {
    const winRate = stats.game?.wins?.percentage || 0;
    const avgKills = stats.series?.kills?.avg || 0;
    const gamesPlayed = stats.game?.count || 0;

    // Simple, explainable formula (hackathon-friendly)
    const score =
        winRate * 0.5 +
        avgKills * 2 +
        Math.min(gamesPlayed, 50) * 0.3;

    return Math.round(score);
}

/* -------------------- ROUTES -------------------- */

/**
 * POST /analyze
 * body: { teamId: "83" }
 */
app.post("/analyze", async (req, res) => {
    const { teamId } = req.body;

    if (!teamId) {
        return res.status(400).json({ error: "teamId required" });
    }

    try {
        /* 1️⃣ Fetch team stats */
        const statsQuery = `
      query TeamStats {
        teamStatistics(
          teamId: "${teamId}",
          filter: { timeWindow: LAST_3_MONTHS }
        ) {
          game {
            count
            wins {
              percentage
            }
          }
          series {
            count
            kills {
              avg
            }
          }
        }
      }
    `;

        const statsData = await gridQuery(statsQuery);
        const stats = statsData.teamStatistics;

        /* 2️⃣ Scout Score */
        const scoutScore = calculateScoutScore(stats);

        /* 3️⃣ AI Insight */
        const aiPrompt = `
You are an esports scout.

Team statistics:
- Win rate: ${stats.game.wins.percentage}%
- Avg kills per series: ${stats.series.kills.avg}
- Games played: ${stats.game.count}
- Scout Score: ${scoutScore}/100

Write:
1. A short performance summary
2. One strength
3. One risk
4. A recommendation
`;

        const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a professional esports analyst." },
                { role: "user", content: aiPrompt },
            ],
        });

        /* 4️⃣ Mocked match prediction (clearly labeled) */
        const mockPrediction = {
            predictedScore: "2-1",
            confidence: scoutScore > 70 ? "High" : "Medium",
            note: "Simulated prediction based on historical performance",
        };

        /* 5️⃣ Final response */
        res.json({
            teamId,
            scoutScore,
            stats,
            aiInsight: aiResponse.choices[0].message.content,
            prediction: mockPrediction,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Analysis failed" });
    }
});

/* -------------------- SERVER -------------------- */

app.listen(process.env.PORT, () => {
    console.log(`🚀 Scout9 backend running on port ${process.env.PORT}`);
});
