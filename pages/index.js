import { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Target, 
  Activity, 
  Search, 
  TrendingUp, 
  AlertCircle, 
  Brain,
  Download,
  Share2,
  Calendar,
  ChevronDown,
  Zap,
  Shield,
  BarChart3,
  Cpu,
  History,
  LayoutDashboard,
  Users
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Home() {
  const [teamInput, setTeamInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [recentTeams, setRecentTeams] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, stats, prediction
  const [showToast, setShowToast] = useState(false);
  const [oppInput, setOppInput] = useState('');
  const [oppResults, setOppResults] = useState([]);
  const [showOppDropdown, setShowOppDropdown] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [predictLoading, setPredictLoading] = useState(false);
  const dropdownRef = useRef(null);
  const oppDropdownRef = useRef(null);

  useEffect(() => {
    // Handle deep linking from shareable URLs
    const params = new URLSearchParams(window.location.search);
    const sharedDataParam = params.get('data');
    const teamIdParam = params.get('team');

    if (sharedDataParam && !result) {
      try {
        // Instant load from the shared data payload
        const decodedData = JSON.parse(decodeURIComponent(atob(sharedDataParam)));
        
        // Ensure aiInsight.players is always an array to prevent "empty section" errors
        if (decodedData.aiInsight && !decodedData.aiInsight.players) {
          decodedData.aiInsight.players = [];
        }
        
        setResult(decodedData);
        setTeamInput(decodedData.teamName);
        if (decodedData.targetOpponent) {
          setSelectedOpponent(decodedData.targetOpponent);
          setOppInput(decodedData.targetOpponent.name);
        }
        setActiveTab('overview');
        // Clean up the URL so the payload doesn't clutter the address bar
        window.history.replaceState({}, '', window.location.pathname);
      } catch (err) {
        console.error("Failed to decode shared data:", err);
        // Fallback to regular load if decoding fails
        if (teamIdParam) triggerTeamLoad(teamIdParam);
      }
    } else if (teamIdParam && !result) {
      triggerTeamLoad(teamIdParam);
    }
  }, []);

  const triggerTeamLoad = async (teamId) => {
    try {
      const res = await fetch(`/api/teams`);
      if (res.ok) {
        const teams = await res.json();
        const team = teams.find(t => t.id === teamId) || { id: teamId, name: 'Shared Team' };
        handleAnalyze(null, team);
      }
    } catch (err) {
      console.error("Deep link load error:", err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (oppDropdownRef.current && !oppDropdownRef.current.contains(event.target)) {
        setShowOppDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('recentTeams');
    if (saved) setRecentTeams(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (isSelecting) {
        setIsSelecting(false);
        return;
      }

      if (teamInput.length >= 2) {
        try {
          const res = await fetch(`/api/teams?search=${encodeURIComponent(teamInput)}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data);
            setShowDropdown(true);
          }
        } catch (err) {
          console.error("Search error:", err);
        }
      } else if (teamInput.length === 0) {
        try {
          const res = await fetch(`/api/teams`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data);
          }
        } catch (err) {
          console.error("Initial fetch error:", err);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [teamInput]);

  const saveTeam = (team) => {
    const updated = [team, ...recentTeams.filter(t => t.id !== team.id)].slice(0, 5);
    setRecentTeams(updated);
    localStorage.setItem('recentTeams', JSON.stringify(updated));
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (oppInput.length >= 2) {
        try {
          const res = await fetch(`/api/teams?search=${encodeURIComponent(oppInput)}`);
          if (res.ok) {
            const data = await res.json();
            setOppResults(data);
            setShowOppDropdown(true);
          }
        } catch (err) {
          console.error("Opponent search error:", err);
        }
      } else {
        setOppResults([]);
        setShowOppDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [oppInput]);

  const handleAnalyze = async (e, team = null) => {
    if (e) e.preventDefault();
    
    let targetTeam = team;
    if (!targetTeam && searchResults.length > 0) {
      targetTeam = searchResults[0];
    }
    
    if (!targetTeam) return;

    setLoading(true);
    setError(null);
    setShowDropdown(false);
    setIsSelecting(true);
    setTeamInput(targetTeam.name);
    setSelectedOpponent(null);
    setOppInput('');
    // Set search results to the selected team so that if the user clicks back in the bar,
    // they see the current team instead of "No results found"
    setSearchResults([targetTeam]);
    
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamId: targetTeam.id,
          teamName: targetTeam.name 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze');
      
      setResult(data);
      saveTeam({ id: targetTeam.id, name: targetTeam.name });
      setActiveTab('overview');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const simulateMatch = async (opponent) => {
    if (!result || !opponent) return;
    
    setPredictLoading(true);
    setSelectedOpponent(opponent);
    setOppInput(opponent.name);
    setShowOppDropdown(false);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamId: result.teamId,
          teamName: result.teamName,
          targetOpponentId: opponent.id,
          targetOpponentName: opponent.name
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to simulate match');
      
      // Update only the prediction part of the result
      setResult(prev => ({
        ...prev,
        prediction: data.prediction
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setPredictLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!result) return;
    
    setLoading(true);
    try {
      // Create a temporary container for the full report
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1200px';
      container.style.background = '#050505';
      container.style.color = 'white';
      container.style.padding = '60px';
      container.className = 'pdf-export-container';
      
      // 1. Header Section
      const header = document.createElement('div');
      header.innerHTML = `
        <div style="margin-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 30px;">
          <div style="color: #3b82f6; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 15px;">PROPRIETARY SCOUTING REPORT</div>
          <h1 style="font-size: 60px; font-weight: 900; margin: 0; letter-spacing: -2px;">${result.teamName} <span style="color: #3b82f6;">.</span></h1>
          <div style="color: #666; font-size: 14px; margin-top: 10px; font-weight: bold; text-transform: uppercase;">Generated on ${new Date().toLocaleDateString()} | Powered by Scout9</div>
        </div>
      `;
      container.appendChild(header);

      // 2. Score & Stats Section
      const statsGrid = document.createElement('div');
      statsGrid.style.display = 'grid';
      statsGrid.style.gridTemplateColumns = '1fr 1fr 1fr';
      statsGrid.style.gap = '20px';
      statsGrid.style.marginBottom = '40px';
      
      statsGrid.innerHTML = `
        <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
          <div style="color: #3b82f6; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 15px;">Scout Score</div>
          <div style="font-size: 64px; font-weight: 900; font-style: italic;">${result.scoutScore}</div>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
          <div style="color: #10b981; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 15px;">Win Rate</div>
          <div style="font-size: 64px; font-weight: 900; font-style: italic;">${result.stats.game.wins.percentage}%</div>
        </div>
        <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
          <div style="color: #f43f5e; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 15px;">Avg Elims</div>
          <div style="font-size: 64px; font-weight: 900; font-style: italic;">${result.stats.series.kills.avg.toFixed(1)}</div>
        </div>
      `;
      container.appendChild(statsGrid);

      // 3. AI Insights
      const insights = document.createElement('div');
      insights.style.background = 'rgba(255,255,255,0.03)';
      insights.style.padding = '40px';
      insights.style.borderRadius = '40px';
      insights.style.border = '1px solid rgba(255,255,255,0.1)';
      insights.style.marginBottom = '40px';
      
      insights.innerHTML = `
        <h3 style="font-size: 24px; font-weight: 900; text-transform: uppercase; font-style: italic; margin-bottom: 25px;">Intelligence Report</h3>
        <div style="margin-bottom: 30px;">
          <div style="color: #3b82f6; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 10px;">Executive Summary</div>
          <p style="color: #ccc; font-size: 18px; line-height: 1.6;">${result.aiInsight.summary}</p>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div style="background: rgba(16, 185, 129, 0.05); padding: 20px; border-radius: 20px; border: 1px solid rgba(16, 185, 129, 0.1);">
            <div style="color: #10b981; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 5px;">Primary Strength</div>
            <div style="color: #eee; font-size: 14px;">${result.aiInsight.strength}</div>
          </div>
          <div style="background: rgba(244, 63, 94, 0.05); padding: 20px; border-radius: 20px; border: 1px solid rgba(244, 63, 94, 0.1);">
            <div style="color: #f43f5e; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 5px;">Strategic Risk</div>
            <div style="color: #eee; font-size: 14px;">${result.aiInsight.risk}</div>
          </div>
        </div>
      `;
      container.appendChild(insights);

      // 4. Action Plan
      const actionPlan = document.createElement('div');
      actionPlan.style.marginBottom = '40px';
      actionPlan.innerHTML = `
        <h3 style="font-size: 24px; font-weight: 900; text-transform: uppercase; font-style: italic; margin-bottom: 25px;">Scout Action Plan</h3>
        <div style="display: grid; gap: 15px;">
          ${result.aiInsight.nextSteps.map((step, i) => `
            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 20px; display: flex; align-items: center; gap: 20px;">
              <div style="width: 40px; height: 40px; background: #3b82f6; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900;">0${i+1}</div>
              <div style="color: #eee; font-weight: 600;">${step}</div>
            </div>
          `).join('')}
        </div>
      `;
      container.appendChild(actionPlan);

      // 5. Prediction
      const prediction = document.createElement('div');
      prediction.style.marginBottom = '40px';
      prediction.style.background = 'rgba(59, 130, 246, 0.05)';
      prediction.style.padding = '40px';
      prediction.style.borderRadius = '40px';
      prediction.style.border = '1px solid rgba(59, 130, 246, 0.2)';
      prediction.style.textAlign = 'center';
      
      prediction.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 20px;">
          <h3 style="font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Match Prediction</h3>
          ${result.targetOpponent ? '<span style="background: #3b82f6; color: white; font-size: 8px; font-weight: 900; padding: 4px 8px; border-radius: 4px; text-transform: uppercase;">Targeted Simulation</span>' : ''}
        </div>
        <div style="display: flex; justify-content: center; gap: 40px; align-items: center;">
          <div style="flex: 1; min-width: 0;">
            <div style="color: #666; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 10px;">Predicted Score</div>
            <div style="color: #3b82f6; font-size: 48px; font-weight: 900; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${result.prediction.predictedScore}</div>
          </div>
          <div style="width: 1px; height: 60px; background: rgba(255,255,255,0.1); flex-shrink: 0;"></div>
          <div style="flex: 1; min-width: 0;">
            <div style="color: #666; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 10px;">Opponent</div>
            <div style="color: #fff; font-size: 24px; font-weight: 900; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${result.prediction.opponent}</div>
          </div>
          <div style="width: 1px; height: 60px; background: rgba(255,255,255,0.1); flex-shrink: 0;"></div>
          <div style="flex: 1; min-width: 0;">
            <div style="color: #666; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 10px;">Confidence</div>
            <div style="color: ${result.prediction.confidence === 'High' ? '#10b981' : '#f59e0b'}; font-size: 32px; font-weight: 900; font-style: italic;">${result.prediction.confidence}</div>
          </div>
        </div>
        <div style="margin-top: 30px; color: #888; font-style: italic; font-size: 16px;">"${result.prediction.note}"</div>
      `;
      container.appendChild(prediction);

      // 6. Tactical Insights (PDF)
      const tactical = document.createElement('div');
      tactical.style.background = 'rgba(255,255,255,0.03)';
      tactical.style.padding = '40px';
      tactical.style.borderRadius = '40px';
      tactical.style.border = '1px solid rgba(255,255,255,0.1)';
      tactical.style.marginBottom = '40px';
      
      tactical.innerHTML = `
        <h3 style="font-size: 24px; font-weight: 900; text-transform: uppercase; font-style: italic; margin-bottom: 25px;">Tactical Analysis</h3>
        <div style="margin-bottom: 25px;">
            <div style="color: #10b981; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 10px;">Default Site Setups</div>
            <p style="color: #ccc; font-size: 14px; line-height: 1.6;">${result.aiInsight.tactical.defaultSiteSetups}</p>
        </div>
        <div>
            <div style="color: #8b5cf6; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 10px;">Player Tendencies</div>
            <p style="color: #ccc; font-size: 14px; line-height: 1.6;">${result.aiInsight.tactical.playerTendencies}</p>
        </div>
      `;
      container.appendChild(tactical);

      // 7. Player Analytics (PDF)
      if (result.aiInsight.players && result.aiInsight.players.length > 0) {
        const playerAnalytics = document.createElement('div');
        playerAnalytics.style.background = 'rgba(255,255,255,0.03)';
        playerAnalytics.style.padding = '40px';
        playerAnalytics.style.borderRadius = '40px';
        playerAnalytics.style.border = '1px solid rgba(255,255,255,0.1)';
        playerAnalytics.style.marginTop = '40px';
        
        playerAnalytics.innerHTML = `
          <h3 style="font-size: 24px; font-weight: 900; text-transform: uppercase; font-style: italic; margin-bottom: 25px;">Individual Player Analytics</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            ${result.aiInsight.players.map(player => `
              <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                  <div>
                    <div style="font-size: 20px; font-weight: 900; color: #fff;">${player.nickname}</div>
                    <div style="font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase;">${player.role}</div>
                    <div style="font-size: 8px; color: #444; font-weight: bold; text-transform: uppercase; margin-top: 2px;">
                      ${player.fullName ? `${player.fullName} • ` : ''} ${player.nationality || ''} ${player.age ? `• ${player.age} Y/O` : ''}
                    </div>
                  </div>
                  <div style="color: #10b981; font-size: 10px; font-weight: 900; text-transform: uppercase;">${player.stat}</div>
                </div>
                <div style="color: #3b82f6; font-size: 18px; font-weight: 900; margin-bottom: 5px;">${player.rating.toFixed(2)} Rating</div>
                <p style="color: #888; font-size: 12px; font-style: italic; line-height: 1.4; margin: 0;">"${player.impact}"</p>
              </div>
            `).join('')}
          </div>
        `;
        container.appendChild(playerAnalytics);
      }

      document.body.appendChild(container);

      // Render with html2canvas
      const canvas = await html2canvas(container, {
        backgroundColor: '#050505',
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        width: 1200
      });
      
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Handle multiple pages if the report is long
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      pdf.save(`Scout9-Report-${result.teamName.replace(/\s+/g, '-')}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
      setError('Failed to export PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    
    try {
      // 1. Prepare the data for sharing
      // We encode the result object so it can be loaded instantly without a new API call
      const sharedData = {
        teamId: result.teamId,
        teamName: result.teamName,
        targetOpponent: result.targetOpponent,
        scoutScore: result.scoutScore,
        stats: result.stats,
        aiInsight: result.aiInsight,
        prediction: result.prediction,
        timestamp: new Date().getTime()
      };
      
      const encodedData = btoa(encodeURIComponent(JSON.stringify(sharedData)));
      
      // 2. Construct the URL with the data payload
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('data', encodedData);
      const shareUrl = url.toString();



      // 3. Copy to clipboard immediately (like Reels/YouTube)
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }


    } catch (err) {
      console.error('Error sharing:', err);
      setError('Failed to share report. Link was not copied.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <nav className=" bg-[#050505]/85 sticky top-0 z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
            setResult(null);
            setTeamInput('');
            setSelectedOpponent(null);
            setOppInput('');
            window.location.href = '/';
          }}>
            <span className="text-5xl font-black tracking-tighter italic">SCOUT<span className="text-blue-500">9</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-pointer">Platform</a>
              <a href="#" className="text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-pointer">Insights</a>
              <a href="#" className="text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-pointer">Team</a>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <button className="glass px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase flex items-center gap-2 border-white/10 hover:border-blue-500/50 transition-all cursor-pointer">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Grid Engine Live
            </button>
          </div>
        </div>
      </nav>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 duration-300">
          <div className="glass px-6 py-4 rounded-2xl flex items-center gap-3 border-emerald-500/30 shadow-2xl shadow-emerald-500/10">
            <div className="bg-emerald-500/20 p-1.5 rounded-lg">
              <Zap className="w-4 h-4 text-emerald-500 fill-current" />
            </div>
            <p className="text-sm font-bold text-white tracking-tight">Report link copied to clipboard!</p>
          </div>
        </div>
      )}

      <main className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col ${!result ? 'min-h-[calc(100vh-160px)] justify-center' : ''}`}>
        {/* Search Hero */}
        <div className={`text-center relative ${!result ? 'mb-0' : 'mb-20'}`}>
          <div className="inline-block px-4 py-1.5 mb-6 glass rounded-full text-[10px] font-bold tracking-[0.2em] uppercase text-blue-400 border-blue-500/20">
            Next-Gen Esports Intelligence
          </div> 
          <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-[0.9]">
            UNCOVER THE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
              NEXT CHAMPIONS
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
            Harness the power of GRID high-granularity data and advanced AI to scout professional teams with surgical precision.
          </p>
          
          <form onSubmit={handleAnalyze} className="relative max-w-2xl mx-auto" ref={dropdownRef}>
            <div className="glass p-2 rounded-[24px] shadow-2xl shadow-blue-500/10 border-white/10 focus-within:border-blue-500/30 transition-all">
              <div className="flex items-center gap-2">
                <div className="pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  value={teamInput}
                  onChange={(e) => setTeamInput(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Enter team name (e.g. Liquid, T1, G2)..."
                  className="block w-full py-4 bg-transparent outline-none text-lg font-medium placeholder:text-gray-600"
                />
                <button
                  type="submit"
                  disabled={loading || (teamInput.length < 2 && searchResults.length === 0)}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Analyze <Zap className="w-4 h-4 fill-current" /></>
                  )}
                </button>
              </div>
            </div>
            
            {showDropdown && (
              <div className="absolute z-50 w-full mt-3 bg-[#0a0a0a] rounded-3xl shadow-2xl overflow-hidden border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
                {searchResults.length > 0 ? (
                  <div className="max-h-[400px] overflow-y-auto">
                    {searchResults.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => handleAnalyze(null, team)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 glass rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden bg-white/5">
                            {team.logoUrl ? (
                              <img 
                                src={team.logoUrl} 
                                alt={team.name} 
                                className="w-7 h-7 object-contain"
                                crossOrigin="anonymous"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'block';
                                }}
                              />
                            ) : null}
                            <Trophy className={`w-5 h-5 text-gray-500 ${team.logoUrl ? 'hidden' : 'block'}`} />
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-white text-lg">{team.name}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">GRID ID: {team.id}</div>
                          </div>
                        </div>
                        <ChevronDown className="w-5 h-5 text-gray-600 -rotate-90 group-hover:text-blue-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                ) : teamInput.length >= 2 ? (
                  <div className="p-8 text-center">
                    <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No teams found matching "{teamInput}"</p>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-gray-500 uppercase tracking-widest font-bold">
                    Start typing to search GRID database
                  </div>
                )}
              </div>
            )}
          </form>

          {recentTeams.length > 0 && (
            <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                <History className="w-3 h-3" /> Recent:
              </div>
              {recentTeams.map(team => (
                <button
                  key={team.id}
                  onClick={() => handleAnalyze(null, team)}
                  className="glass px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-blue-400 hover:border-blue-500/30 transition-all active:scale-95 cursor-pointer"
                >
                  {team.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-12 glass p-5 rounded-2xl border-red-500/20 flex items-center gap-4 text-red-400 animate-in zoom-in-95 duration-300">
            <div className="bg-red-500/20 p-2 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Results Area */}
        {result && (
          <div id="report-content" className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Report Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-white/5 pb-12">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded-lg uppercase tracking-[0.2em] border border-blue-500/20">
                    Proprietary Analysis
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold uppercase tracking-widest">
                    <Calendar className="w-3.5 h-3.5" /> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
                  {result.teamName} <span className="text-blue-500">.</span>
                </h2>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={exportPDF}
                  className="glass group flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-sm hover:border-blue-500/50 transition-all active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  Export Data
                </button>
                <button 
                  onClick={handleShare}
                  className="glass group p-3.5 rounded-2xl hover:border-purple-500/50 transition-all active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>

            {/* Dashboard Navigation */}
            <div className="flex gap-2 mb-8 glass p-1.5 rounded-2xl w-fit no-export">
              {[
                { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                { id: 'players', label: 'Players', icon: Users },
                { id: 'tactical', label: 'Tactical Feed', icon: Activity },
                { id: 'stats', label: 'Advanced Stats', icon: BarChart3 },
                { id: 'prediction', label: 'Match Prediction', icon: Target },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-12">
              {/* Overview Section */}
              <div id="section-overview" className={(activeTab === 'overview' ? 'block' : 'hidden export-only')}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-left-4 duration-500">
                  {/* Score Column */}
                  <div className="lg:col-span-4 space-y-8">
                    {/* Scout Score Gauge */}
                    <div className="glass p-10 rounded-[40px] relative overflow-hidden group border-white/10 hover:border-blue-500/20 transition-all duration-500">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Cpu className="w-32 h-32 rotate-12" />
                      </div>
                      <div className="relative z-10 text-center">
                        <div className="inline-block px-3 py-1 mb-6 glass rounded-full text-[10px] font-black uppercase tracking-widest text-blue-400">
                          Aggregate Rating
                        </div>
                        <div className="relative w-48 h-48 mx-auto mb-8">
                          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                            <circle
                              className="text-white/5"
                              strokeWidth="8"
                              stroke="currentColor"
                              fill="transparent"
                              r="42"
                              cx="50"
                              cy="50"
                            />
                            <circle
                              className="text-blue-500 transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                              strokeWidth="8"
                              strokeDasharray={`${result.scoutScore * 2.64} 264`}
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="transparent"
                              r="42"
                              cx="50"
                              cy="50"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-6xl font-black tracking-tighter italic">{result.scoutScore}</span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Score</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed font-medium">
                          Proprietary Scout9 algorithm analyzing performance, consistency, and opposition strength.
                        </p>
                      </div>
                    </div>

                    {/* High Level Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass p-6 rounded-3xl group transition-all hover:border-emerald-500/20">
                        <Target className="w-5 h-5 text-emerald-500 mb-3" />
                        <div className="text-3xl font-black mb-1">{result.stats.game.wins.percentage}%</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Win Rate</div>
                      </div>
                      <div className="glass p-6 rounded-3xl group transition-all hover:border-purple-500/20">
                        <TrendingUp className="w-5 h-5 text-purple-500 mb-3" />
                        <div className="text-3xl font-black mb-1">{result.stats.series.kills.avg.toFixed(1)}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Avg Kills</div>
                      </div>
                    </div>
                  </div>

                  {/* Analysis Column */}
                  <div className="lg:col-span-8 space-y-8">
                    {/* AI Performance Summary */}
                    <div className="glass rounded-[40px] p-10 relative overflow-hidden group">
                      <div className="scan-line" />
                      <div className="flex items-center gap-4 mb-8">
                        <div className="bg-purple-600/20 p-3 rounded-2xl">
                          <Brain className="w-6 h-6 text-purple-400" />
                        </div>
                        <h3 className="text-2xl font-black tracking-tight uppercase italic">Intelligence Report</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                          <div>
                            <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3">Executive Summary</div>
                            <p className="text-gray-300 text-lg leading-relaxed font-medium">
                              {result.aiInsight.summary}
                            </p>
                          </div>
                          <div className="flex flex-col gap-4">
                            <div className="glass p-5 rounded-2xl border-emerald-500/10">
                              <div className="flex items-center gap-3 mb-2">
                                <Shield className="w-4 h-4 text-emerald-500" />
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Primary Strength</span>
                              </div>
                              <p className="text-sm font-medium text-gray-300">{result.aiInsight.strength}</p>
                            </div>
                            <div className="glass p-5 rounded-2xl border-red-500/10">
                              <div className="flex items-center gap-3 mb-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Strategic Risk</span>
                              </div>
                              <p className="text-sm font-medium text-gray-300">{result.aiInsight.risk}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-3">Scout Action Plan</div>
                          <div className="space-y-4">
                            {result.aiInsight.nextSteps.map((step, i) => (
                              <div key={i} className="glass-hover glass p-5 rounded-2xl flex gap-5 group/item cursor-pointer">
                                <div className="w-10 h-10 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black group-hover/item:bg-blue-600 group-hover/item:text-white transition-all">
                                  0{i + 1}
                                </div>
                                <p className="text-sm font-semibold text-gray-400 group-hover/item:text-white transition-colors leading-relaxed">
                                  {step}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Players Section */}
              <div id="section-players" className={(activeTab === 'players' ? 'block' : 'hidden export-only')}>
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {result.aiInsight.players?.map((player, i) => (
                      <div key={i} className="glass p-8 rounded-[32px] relative overflow-hidden group hover:border-blue-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Users className="w-20 h-20" />
                        </div>
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center font-black text-blue-400">
                              {player.nickname.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="px-3 py-1 glass rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-500 border-emerald-500/20">
                              {player.stat}
                            </div>
                          </div>
                          <h4 className="text-2xl font-black tracking-tight mb-1 group-hover:text-blue-400 transition-colors">{player.nickname}</h4>
                        <div className="flex flex-col gap-1 mb-4">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{player.role}</div>
                            {(player.fullName || player.nationality || player.age) && (
                              <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest flex items-center gap-2 flex-wrap">
                                {player.fullName && <span className="text-gray-400">{player.fullName}</span>}
                                {player.nationality && <span>• {player.nationality}</span>}
                                {player.age && <span>• {player.age} Y/O</span>}
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Impact Rating</span>
                              <span className="text-lg font-black italic text-blue-400">{player.rating.toFixed(2)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${(player.rating / 2.0) * 100}%` }} />
                            </div>
                            <p className="text-sm font-medium text-gray-400 leading-relaxed italic">
                              "{player.impact}"
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tactical Section */}
              <div id="section-tactical" className={(activeTab === 'tactical' ? 'block' : 'hidden export-only')}>
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Live Feed Mock */}
                    <div className="glass rounded-[40px] p-10 relative overflow-hidden group">
                      <div className="scan-line" />
                      <div className="flex items-center gap-4 mb-8">
                        <div className="bg-blue-600/20 p-3 rounded-2xl">
                          <Activity className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="text-2xl font-black tracking-tight uppercase italic">Live Tactical Feed</h3>
                      </div>
                      <div className="space-y-4">
                        {result.aiInsight.tactical.liveFeed.map((event, i) => (
                          <div key={i} className="flex items-start gap-4 p-4 glass rounded-2xl border-blue-500/10 hover:border-blue-500/30 transition-all">
                            <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 animate-pulse" />
                            <p className="text-sm font-medium text-gray-300">{event}</p>
                          </div>
                        ))}
                        <div className="pt-4 flex justify-center">
                          <div className="px-4 py-1.5 glass rounded-full text-[10px] font-black text-blue-500 uppercase tracking-widest animate-pulse">
                            Monitoring Real-time State...
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Site Setups & Tendencies */}
                    <div className="space-y-6">
                      <div className="glass p-8 rounded-[32px] border-emerald-500/10">
                        <div className="flex items-center gap-3 mb-4">
                          <Shield className="w-5 h-5 text-emerald-500" />
                          <h4 className="text-lg font-black uppercase italic tracking-tight">Default Site Setups</h4>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed font-medium">
                          {result.aiInsight.tactical.defaultSiteSetups}
                        </p>
                      </div>
                      <div className="glass p-8 rounded-[32px] border-purple-500/10">
                        <div className="flex items-center gap-3 mb-4">
                          <Brain className="w-5 h-5 text-purple-500" />
                          <h4 className="text-lg font-black uppercase italic tracking-tight">Player Tendencies</h4>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed font-medium">
                          {result.aiInsight.tactical.playerTendencies}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Section */}
              <div id="section-stats" className={(activeTab === 'stats' ? 'block' : 'hidden export-only')}>
                <div className="animate-in fade-in zoom-in-95 duration-500 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="glass p-8 rounded-3xl">
                      <div className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Total Series</div>
                      <div className="text-5xl font-black italic">{result.stats.series.count}</div>
                      <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full w-[65%]" />
                      </div>
                  </div>
                  <div className="glass p-8 rounded-3xl">
                      <div className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Games Played</div>
                      <div className="text-5xl font-black italic">{result.stats.game.count}</div>
                      <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full w-[80%]" />
                      </div>
                  </div>
                  <div className="glass p-8 rounded-3xl">
                      <div className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Win Percentage</div>
                      <div className="text-5xl font-black italic text-emerald-500">{result.stats.game.wins.percentage}%</div>
                      <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${result.stats.game.wins.percentage}%` }} />
                      </div>
                  </div>
                  <div className="glass p-8 rounded-3xl">
                      <div className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Elims per Series</div>
                      <div className="text-5xl font-black italic text-red-500">{result.stats.series.kills.avg.toFixed(1)}</div>
                      <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full w-[55%]" />
                      </div>
                  </div>
                </div>
              </div>

              {/* Prediction Section */}
              <div id="section-prediction" className={(activeTab === 'prediction' ? 'block' : 'hidden export-only')}>
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto w-full">
                  
                  {/* Opponent Selection (Interactive) */}
                  <div className="mb-8 glass p-6 rounded-[32px] border-blue-500/20 no-export">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-1 w-full relative" ref={oppDropdownRef}>
                        <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 ml-2">Change Opponent</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={oppInput}
                            onChange={(e) => setOppInput(e.target.value)}
                            onFocus={() => setShowOppDropdown(true)}
                            placeholder="Search for an opponent..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 outline-none focus:border-blue-500/50 transition-all font-bold"
                          />
                          <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        </div>

                        {showOppDropdown && oppResults.length > 0 && (
                          <div className="absolute z-[60] w-full mt-2 bg-[#0a0a0a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden max-h-60 overflow-y-auto">
                            {oppResults.map((opp) => (
                              <button
                                key={opp.id}
                                onClick={() => simulateMatch(opp)}
                                className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left group"
                              >
                                <div className="w-8 h-8 glass rounded-lg flex items-center justify-center bg-white/5 shrink-0">
                                  {opp.logoUrl ? (
                                    <img src={opp.logoUrl} alt={opp.name} className="w-5 h-5 object-contain" crossOrigin="anonymous" />
                                  ) : (
                                    <Trophy className="w-4 h-4 text-gray-600" />
                                  )}
                                </div>
                                <span className="font-bold text-sm">{opp.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="hidden md:block h-12 w-px bg-white/10" />
                      <div className="flex flex-col items-center md:items-start shrink-0">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Live Simulation</span>
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${predictLoading ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                          <span className="text-xs font-black uppercase tracking-tighter">AI Engine Ready</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass rounded-[40px] p-12 text-center border-blue-500/20 overflow-hidden relative">
                    {predictLoading && (
                      <div className="absolute inset-0 bg-[#050505]/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-blue-400 font-black uppercase tracking-widest text-xs animate-pulse">Recalculating Match Odds...</p>
                      </div>
                    )}
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
                    <h3 className="text-2xl font-black uppercase italic tracking-widest mb-12">Match Simulation</h3>
                    
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 mb-16">
                        <div className="space-y-4 flex-1">
                          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Predicted Score</div>
                          <div className="text-6xl md:text-8xl font-black tracking-tighter text-blue-500 italic drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] truncate">
                              {result.prediction.predictedScore}
                          </div>
                        </div>
                        <div className="h-24 w-px bg-white/10 hidden md:block shrink-0" />
                        <div className="space-y-4 flex-1 min-w-0">
                          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Opponent</div>
                          <div className="text-3xl md:text-4xl font-black tracking-tight text-white italic truncate px-2" title={result.prediction.opponent}>
                              {result.prediction.opponent}
                          </div>
                        </div>
                        <div className="h-24 w-px bg-white/10 hidden md:block shrink-0" />
                        <div className="space-y-4 flex-1">
                          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">AI Confidence</div>
                          <div className={`text-4xl md:text-5xl font-black tracking-tight italic ${
                              result.prediction.confidence === 'High' ? 'text-emerald-500' : 'text-amber-500'
                          }`}>
                              {result.prediction.confidence}
                          </div>
                        </div>
                    </div>

                    {selectedOpponent && (
                      <div className="mb-12 flex justify-center no-export">
                        <div className="glass px-6 py-3 rounded-2xl flex items-center gap-3 border-blue-500/30">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
                            Simulated against: <span className="text-white">{selectedOpponent.name}</span>
                          </span>
                          <button 
                            onClick={() => {
                              setSelectedOpponent(null);
                              setOppInput('');
                              handleAnalyze(null, { id: result.teamId, name: result.teamName });
                            }}
                            className="ml-4 text-[10px] font-black text-gray-500 hover:text-white transition-colors uppercase tracking-widest underline underline-offset-4"
                          >
                            Reset to Default
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="glass p-8 rounded-3xl bg-blue-500/5 border-blue-500/10 inline-block text-left max-w-2xl">
                        <div className="flex items-start gap-4">
                          <Brain className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
                          <div>
                              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Model Reasoning</div>
                              <p className="text-lg font-medium text-gray-300 italic leading-relaxed">
                                  "{result.prediction.note}"
                              </p>
                          </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-20">
             {[1,2,3,4].map(i => (
               <div key={i} className="h-32 glass rounded-3xl border-dashed border-white/20 flex flex-col items-center justify-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10" />
                  <div className="h-2 w-16 bg-white/10 rounded-full" />
               </div>
             ))}
          </div>
        )}
      </main>

      <footer className="mt-40 border-t border-white/5 py-16 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 grayscale opacity-50">
              <Zap className="w-5 h-5 text-blue-500 fill-current" />
              <span className="text-xl font-black tracking-tighter italic">SCOUT<span className="text-blue-500">9</span></span>
            </div>
            <p className="text-gray-600 text-sm max-w-md mx-auto leading-relaxed">
              Elevating esports scouting through deep data and machine learning. <br />
              Powered by <span className="text-gray-400 font-bold">GRID</span> Data Feed & <span className="text-gray-400 font-bold">OpenAI</span>.
            </p>
            <div className="flex gap-6 mt-4">
              <a href="#" className="text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest">Privacy</a>
              <a href="#" className="text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest">Terms</a>
              <a href="#" className="text-xs font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
