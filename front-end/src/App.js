import InputField from './components/InputField';
import { useState, useEffect } from 'react';
import dennis from './dennis.png';
import logo from './logo.ico';
import './App.css';

function App() {
  const [csvData, setCsvData] = useState('');
  const [playerInputs, setPlayerInputs] = useState(Array(10).fill(''));
  const [playerRoles, setPlayerRoles] = useState(Array(10).fill([]));
  const [generatedPlayers, setGeneratedPlayers] = useState([]);
  const [defaultRank, setDefaultRank] = useState('iron1');
  const [apiErrors, setApiErrors] = useState(Array(10).fill(false));
  const [playerDataWithPuuids, setPlayerDataWithPuuids] = useState([]);
  const [processedRankedData, setProcessedRankedData] = useState([]);
  const [generatedTeams, setGeneratedTeams] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerateTime, setLastGenerateTime] = useState(0);
  const [cooldownDisplay, setCooldownDisplay] = useState(0);

  // Update cooldown display every second when rate limited
  useEffect(() => {
    let interval;
    if (isGenerateRateLimited()) {
      interval = setInterval(() => {
        setCooldownDisplay(getRemainingCooldown());
      }, 1000);
    } else {
      setCooldownDisplay(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lastGenerateTime, cooldownDisplay]);

  async function getPlayerData(player) {
    const apikey = process.env.REACT_APP_API_KEY;

    const usr = player.split('#')
    const url = 'https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/'+ usr[0] +'/'+ usr[1] +'?api_key='+ apikey;
    
    try {
      const response = await fetch(url, {
          method: 'GET',
          headers: {
              'Accept': 'application/json'
          }
      });

      if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const jsonResponse = await response.json();
      return jsonResponse;
    } catch (error) {
        console.error('Error:', error);
        return { error: error.message, status: error.message.includes('404') ? 404 : 'unknown' };
    }
}
async function getRankedData(puuid) {
  const apikey = process.env.REACT_APP_API_KEY;
  const url = 'https://na1.api.riotgames.com/lol/league/v4/entries/by-puuid/'+ puuid +'?api_key=' + apikey;
  
  try {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const jsonResponse = await response.json();
    return jsonResponse;
  } catch (error) {
      console.error('Error:', error);
      return null;
  }
}

  function convertRomanToInteger(roman) {
    const romanNumerals = {
      'I': 1,
      'II': 2,
      'III': 3,
      'IV': 4
    };
    return romanNumerals[roman] || 0;
  }

  function calculateSkillValue(tier, rank) {
    // Tier values (higher = better)
    const tierValues = {
      'IRON': 100,
      'BRONZE': 200,
      'SILVER': 300,
      'GOLD': 400,
      'PLATINUM': 500,
      'EMERALD': 600,
      'DIAMOND': 700,
      'MASTER': 800,
      'GRANDMASTER': 900,
      'CHALLENGER': 1000
    };
    
    // Rank values (lower number = better, so we subtract from 5)
    // Rank 1 = best, Rank 4 = worst within tier
    const rankValue = rank > 0 ? (5 - rank) * 10 : 0;
    
    // Base tier value + rank adjustment
    const baseValue = tierValues[tier] || 0;
    const skillValue = baseValue + rankValue;
    
    return skillValue;
  }

  function generateRandomTeams(players) {
    // Check if we have an even number of players
    if (players.length % 2 !== 0) {
      throw new Error(`Team generation requires an even number of players. Current count: ${players.length}`);
    }
    
    // Shuffle players randomly
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    // Ensure equal team sizes by splitting exactly in half
    const midPoint = Math.floor(players.length / 2);
    const team1 = shuffledPlayers.slice(0, midPoint);
    const team2 = shuffledPlayers.slice(midPoint);
    
    // Assign roles if enabled
    const assignRoles = document.querySelector('input[name="generateRoles"]:checked')?.value === 'yes';
    if (assignRoles) {
      assignRolesToTeams(team1, team2);
    }
    
    return {
      blueTeam: team1,
      redTeam: team2,
      blueTotalSkill: team1.reduce((sum, player) => sum + player.skillValue, 0),
      redTotalSkill: team2.reduce((sum, player) => sum + player.skillValue, 0)
    };
  }

  function generateBalancedTeams(players) {
    // Check if we have an even number of players
    if (players.length % 2 !== 0) {
      throw new Error(`Team generation requires an even number of players. Current count: ${players.length}`);
    }
    
    // Sort players by skill value (highest to lowest)
    const sortedPlayers = [...players].sort((a, b) => b.skillValue - a.skillValue);
    
    const team1 = [];
    const team2 = [];
    let team1Skill = 0;
    let team2Skill = 0;
    
    // Ensure equal team sizes by processing players in pairs
    const midPoint = Math.floor(players.length / 2);
    
    // First, distribute the top players to balance skill with randomization
    for (let i = 0; i < midPoint; i++) {
      const randomFactor = Math.random();
      const skillDifference = Math.abs(team1Skill - team2Skill);
      
      // If teams are very close in skill, add more randomization
      if (skillDifference < 100) {
        if (randomFactor < 0.5) {
          team1.push(sortedPlayers[i]);
          team1Skill += sortedPlayers[i].skillValue;
        } else {
          team2.push(sortedPlayers[i]);
          team2Skill += sortedPlayers[i].skillValue;
        }
      } else {
        // Standard balanced distribution with some randomness
        if (team1Skill <= team2Skill) {
          // 80% chance to follow balance logic, 20% chance to go against it
          if (randomFactor < 0.8) {
            team1.push(sortedPlayers[i]);
            team1Skill += sortedPlayers[i].skillValue;
          } else {
            team2.push(sortedPlayers[i]);
            team2Skill += sortedPlayers[i].skillValue;
          }
        } else {
          // 80% chance to follow balance logic, 20% chance to go against it
          if (randomFactor < 0.8) {
            team2.push(sortedPlayers[i]);
            team2Skill += sortedPlayers[i].skillValue;
          } else {
            team1.push(sortedPlayers[i]);
            team1Skill += sortedPlayers[i].skillValue;
          }
        }
      }
    }
    
    // Then distribute the remaining players to maintain balance and equal team sizes
    for (let i = midPoint; i < players.length; i++) {
      if (team1.length < midPoint) {
        team1.push(sortedPlayers[i]);
        team1Skill += sortedPlayers[i].skillValue;
      } else {
        team2.push(sortedPlayers[i]);
        team2Skill += sortedPlayers[i].skillValue;
      }
    }
    
    // Assign roles if enabled
    const assignRoles = document.querySelector('input[name="generateRoles"]:checked')?.value === 'yes';
    if (assignRoles) {
      assignRolesToTeams(team1, team2);
    }
    
    return {
      blueTeam: team1,
      redTeam: team2,
      blueTotalSkill: team1Skill,
      redTotalSkill: team2Skill
    };
  }

  function generateFullBalanceTeams(players) {
    // Check if we have an even number of players
    if (players.length % 2 !== 0) {
      throw new Error(`Team generation requires an even number of players. Current count: ${players.length}`);
    }
    
    // Sort players by skill value (highest to lowest)
    const sortedPlayers = [...players].sort((a, b) => b.skillValue - a.skillValue);
    const midPoint = Math.floor(players.length / 2);
    
    // Try all possible combinations to find the most balanced teams
    let bestDifference = Infinity;
    let bestTeams = null;
    
    // Generate all possible combinations of players for team 1
    const generateCombinations = (arr, size) => {
      if (size === 0) return [[]];
      if (arr.length === 0) return [];
      
      const [first, ...rest] = arr;
      const withoutFirst = generateCombinations(rest, size);
      const withFirst = generateCombinations(rest, size - 1).map(combo => [first, ...combo]);
      
      return [...withoutFirst, ...withFirst];
    };
    
    const team1Combinations = generateCombinations(sortedPlayers, midPoint);
    
    // Evaluate each combination to find the most balanced
    team1Combinations.forEach(team1Players => {
      const team2Players = sortedPlayers.filter(player => !team1Players.includes(player));
      
      const team1Skill = team1Players.reduce((sum, player) => sum + player.skillValue, 0);
      const team2Skill = team2Players.reduce((sum, player) => sum + player.skillValue, 0);
      
      const difference = Math.abs(team1Skill - team2Skill);
      
      if (difference < bestDifference) {
        bestDifference = difference;
        bestTeams = {
          blueTeam: team1Players,
          redTeam: team2Players,
          blueTotalSkill: team1Skill,
          redTotalSkill: team2Skill
        };
      }
    });
    
    const result = bestTeams || {
      blueTeam: sortedPlayers.slice(0, midPoint),
      redTeam: sortedPlayers.slice(midPoint),
      blueTotalSkill: sortedPlayers.slice(0, midPoint).reduce((sum, player) => sum + player.skillValue, 0),
      redTotalSkill: sortedPlayers.slice(midPoint).reduce((sum, player) => sum + player.skillValue, 0)
    };
    
    // Assign roles if enabled
    const assignRoles = document.querySelector('input[name="generateRoles"]:checked')?.value === 'yes';
    if (assignRoles) {
      assignRolesToTeams(result.blueTeam, result.redTeam);
    }
    
    return result;
  }

  function assignRolesToTeams(team1, team2) {
    const playerCount = team1.length + team2.length;
    
    // Determine required roles based on team size
    let requiredRoles = [];
    if (playerCount === 10) {
      requiredRoles = ['TOP', 'JGL', 'MID', 'BOT', 'SUP'];
    } else if (playerCount === 8) {
      requiredRoles = ['TOP', 'JGL', 'MID', 'BOT']; // Skip SUP
    } else if (playerCount === 6) {
      requiredRoles = ['TOP', 'MID', 'BOT']; // Skip JGL and SUP
    } else {
      console.error('Invalid team size for role assignment:', playerCount);
      return;
    }
    
    // Helper function to assign roles to a single team
    const assignRolesToTeam = (team) => {
      const assignedRoles = {};
      const unassignedPlayers = [...team];
      
      // First pass: assign players to their preferred roles
      for (const role of requiredRoles) {
        const preferredPlayers = unassignedPlayers.filter(player => 
          player.selectedRoles && player.selectedRoles.includes(role)
        );
        
        if (preferredPlayers.length > 0) {
          // Choose the highest ranked player for this role
          const bestPlayer = preferredPlayers.reduce((best, current) => 
            current.skillValue > best.skillValue ? current : best
          );
          
          assignedRoles[role] = bestPlayer;
          unassignedPlayers.splice(unassignedPlayers.indexOf(bestPlayer), 1);
        }
      }
      
      // Second pass: assign remaining players to unassigned roles
      for (const role of requiredRoles) {
        if (!assignedRoles[role]) {
          if (unassignedPlayers.length > 0) {
            // Choose the highest ranked unassigned player
            const bestPlayer = unassignedPlayers.reduce((best, current) => 
              current.skillValue > best.skillValue ? current : best
            );
            
            assignedRoles[role] = bestPlayer;
            unassignedPlayers.splice(unassignedPlayers.indexOf(bestPlayer), 1);
          }
        }
      }
      
      // Update players with their assigned roles
      Object.entries(assignedRoles).forEach(([role, player]) => {
        player.assignedRole = role;
      });
      
      return assignedRoles;
    };
    
    // Assign roles to both teams
    const team1Roles = assignRolesToTeam(team1);
    const team2Roles = assignRolesToTeam(team2);
    
  }

  const handleInputChange = (value, index) => {
    const newInputs = [...playerInputs];
    newInputs[index - 1] = value;
    setPlayerInputs(newInputs);
    
    // Reset API error for this player when they edit the field
    if (apiErrors[index - 1]) {
      setApiErrors(prev => {
        const newErrors = [...prev];
        newErrors[index - 1] = false;
        return newErrors;
      });
    }
  };

  const handleRolesChange = (roles, index) => {
    const newRoles = [...playerRoles];
    newRoles[index - 1] = roles;
    setPlayerRoles(newRoles);
  };

  const handleCsvSubmit = () => {
    if (!csvData.trim()) return;
    
    try {
      // Parse CSV data (assuming format: name#tag,role1,role2,role3...)
      const lines = csvData.trim().split('\n');
      const newInputs = [...playerInputs];
      const newRoles = [...playerRoles];
      
      lines.forEach((line, index) => {
        if (index < 10) { // Only process first 10 players
          const parts = line.split(',');
          if (parts.length >= 1) {
            newInputs[index] = parts[0]; // First part is name#tag
            
            // Parse roles if they exist
            if (parts.length > 1) {
              const roles = parts.slice(1).filter(role => {
                const trimmedRole = role.trim();
                return ['TOP', 'JGL', 'MID', 'BOT', 'SUP', 'FILL'].some(validRole => 
                  validRole.toLowerCase() === trimmedRole.toLowerCase()
                );
              }).map(role => {
                // Convert to proper case (TOP, JGL, MID, BOT, SUP, FILL)
                const trimmedRole = role.trim();
                if (trimmedRole.toLowerCase() === 'top') return 'TOP';
                if (trimmedRole.toLowerCase() === 'jgl') return 'JGL';
                if (trimmedRole.toLowerCase() === 'mid') return 'MID';
                if (trimmedRole.toLowerCase() === 'bot') return 'BOT';
                if (trimmedRole.toLowerCase() === 'sup') return 'SUP';
                if (trimmedRole.toLowerCase() === 'fill') return 'FILL';
                return trimmedRole; // Fallback
              });
              newRoles[index] = roles;
            }
          }
        }
      });
      
      setPlayerInputs(newInputs);
      setPlayerRoles(newRoles);
      
      
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV data. Please check the format.');
    }
  };

  const handleClearAll = () => {
    setPlayerInputs(Array(10).fill(''));
    setPlayerRoles(Array(10).fill([]));
    setCsvData('');
    setGeneratedPlayers([]);
    setPlayerDataWithPuuids([]);
    setProcessedRankedData([]);
    setGeneratedTeams([]);
    setApiErrors(Array(10).fill(false));
  };

  const handleRerollTeams = () => {
    if (processedRankedData.length === 0) return;
    
    // Generate new teams based on current generation type
    const generationType = document.querySelector('input[name="generationType"]:checked')?.value || 'fullyRandom';
    
    let teams;
    if (generationType === 'balanced') {
      teams = generateBalancedTeams(processedRankedData);
    } else if (generationType === 'fullBalance') {
      teams = generateFullBalanceTeams(processedRankedData);
    }
    else {
      teams = generateRandomTeams(processedRankedData);
    }
    
    setGeneratedTeams(teams);
  };

  const handleGenerate = async () => {
    // Check rate limit
    if (isGenerateRateLimited()) {
      const remaining = getRemainingCooldown();
      alert(`Generate Teams is on cooldown. Please wait ${remaining} more seconds.`);
      return;
    }

    // Set loading state
    setIsGenerating(true);
    
    // Filter out empty player inputs
    const validPlayers = playerInputs.filter(input => input.trim() !== '');
    
    // Check if we have an even number of players
    if (validPlayers.length % 2 !== 0) {
      alert(`Team generation requires an even number of players. Current count: ${validPlayers.length}. Please add or remove a player to make it even.`);
      setIsGenerating(false);
      return;
    }
    
    // Check if we have enough players for role assignment
    const assignRoles = document.querySelector('input[name="generateRoles"]:checked')?.value === 'yes';
    if (assignRoles && validPlayers.length < 6) {
      alert('Role assignment requires at least 6 players. Please add more players or set "Assign Roles" to "No".');
      setIsGenerating(false);
      return;
    }
    
    // Reset API errors
    setApiErrors(new Array(10).fill(false));
    
    try {
      // Get player data for each valid player
      const playerDataPromises = validPlayers.map(async (player) => {
        const result = await getPlayerData(player);
        if (result.error) {
          // Mark this player as having an API error
          const playerIndex = playerInputs.indexOf(player);
          setApiErrors(prev => {
            const newErrors = [...prev];
            newErrors[playerIndex] = true;
            return newErrors;
          });
          return null;
        }
        return result;
      });
      
      const playerResults = await Promise.all(playerDataPromises);
      const successfulPlayers = playerResults.filter(result => result !== null);
      
      if (successfulPlayers.length === 0) {
        alert('No valid players found. Please check your player names and try again.');
        setIsGenerating(false);
        return;
      }
      
      // Store successful player data
      setPlayerDataWithPuuids(successfulPlayers);
      
      // Get ranked data for each player
      const rankedDataPromises = successfulPlayers.map(async (player) => {
        const rankedData = await getRankedData(player.puuid);
        return {
          name: player.gameName + '#' + player.tagLine,
          rankedData: rankedData
        };
      });
      
      const rankedResults = await Promise.all(rankedDataPromises);
      
      // Process ranked data
      const processedData = rankedResults.map(player => {
        const { rankedData } = player;
        let tier, rank;
        
        if (rankedData.length === 2) {
          // Find RANKED_SOLO_5x5 entry
          const soloEntry = rankedData.find(entry => entry.queueType === 'RANKED_SOLO_5x5');
          if (soloEntry) {
            tier = soloEntry.tier;
            rank = convertRomanToInteger(soloEntry.rank);
          } else {
            // Use first entry if no solo queue found
            tier = rankedData[0].tier;
            rank = convertRomanToInteger(rankedData[0].rank);
          }
        } else if (rankedData.length === 1) {
          tier = rankedData[0].tier;
          rank = convertRomanToInteger(rankedData[0].rank);
        } else {
          // No ranked data, use default
          const [defaultTier, defaultRankNum] = defaultRank.split(/(?=\d)/);
          tier = defaultTier.toUpperCase();
          rank = parseInt(defaultRankNum);
        }
        
        const skillValue = calculateSkillValue(tier, rank);
        
        return {
          name: player.name,
          tier: tier,
          rank: rank,
          skillValue: skillValue
        };
      });
      
      setProcessedRankedData(processedData);
      
      // Generate teams based on generation type
      const generationType = document.querySelector('input[name="generationType"]:checked')?.value;
      let teams;
      
      try {
        if (generationType === 'random') {
          teams = generateRandomTeams(processedData);
        } else if (generationType === 'balanced') {
          teams = generateBalancedTeams(processedData);
        } else if (generationType === 'fullBalance') {
          teams = generateFullBalanceTeams(processedData);
        } else {
          teams = generateRandomTeams(processedData); // Default fallback
        }
        
        setGeneratedTeams(teams);
        
        // Set the last generate time for rate limiting
        setLastGenerateTime(Date.now());
        
      } catch (error) {
        alert(error.message);
        return;
      } finally {
        setIsGenerating(false);
      }
      
    } catch (error) {
      console.error('Error generating teams:', error);
      alert('An error occurred while generating teams. Please try again.');
      setIsGenerating(false);
    }
  };

  // Function to check if role assignment should be disabled
  const shouldDisableRoleAssignment = () => {
    const validPlayers = playerInputs.filter(input => input.trim() !== '');
    return validPlayers.length < 6;
  };

  // Function to check if Generate Teams is rate limited
  const isGenerateRateLimited = () => {
    const now = Date.now();
    const timeSinceLastGenerate = now - lastGenerateTime;
    return timeSinceLastGenerate < 30000; // 30 seconds in milliseconds
  };

  // Function to get remaining cooldown time
  const getRemainingCooldown = () => {
    const now = Date.now();
    const timeSinceLastGenerate = now - lastGenerateTime;
    const remaining = Math.ceil((30000 - timeSinceLastGenerate) / 1000);
    return remaining > 0 ? remaining : 0;
  };

  // Function to handle role assignment change
  const handleRoleAssignmentChange = (value) => {
    if (value === 'yes' && shouldDisableRoleAssignment()) {
      alert('Role assignment requires at least 6 players. Please add more players first.');
      return;
    }
    // The radio button will be handled by the disabled state
  };

  // Function to get rank color
  const getRankColor = (tier) => {
    const rankColors = {
      'IRON': '#8B8B8B',      // Grey
      'BRONZE': '#CD7F32',    // Bronze
      'SILVER': '#C0C0C0',    // Silver
      'GOLD': '#FFD700',      // Gold
      'PLATINUM': '#E5E4E2',  // Platinum
      'EMERALD': '#50C878',   // Emerald green
      'DIAMOND': '#B9F2FF',   // Diamond blue
      'MASTER': '#8d42f5',    // Purple (stays the same)
      'GRANDMASTER': '#FF4444', // Red
      'CHALLENGER': '#FFD700'   // Yellow
    };
    return rankColors[tier] || '#8d42f5'; // Default to purple if tier not found
  };

  return (
    <div className="App">
      <div className="header">
        <h1>THANOS v2.0 - HUY'S CUSTOM GAME BALANCER</h1>
        <h3>Perfectly balanced, as all things should be - Made possible by our sponsor:</h3>
        <a href="https://dpm.lol/Dragonbolt0005-NA1" target="_blank" rel="noopener noreferrer">
          <img src={dennis} alt="dennis" className="dennis-logo" />
        </a>
      </div>
      
      <div className="main-content">
        <div className="input-section">
          <h3>Players</h3>
          <div className="players-container">
            <div className="players-column">
              {playerInputs.slice(0, 5).map((input, index) => (
                <InputField
                  key={index}
                  label={`Player ${index + 1}`}
                  value={input}
                  selectedRoles={playerRoles[index]}
                  apiError={apiErrors[index]}
                  onInputChange={(value) => handleInputChange(value, index)}
                  onRolesChange={(roles) => handleRolesChange(roles, index)}
                />
              ))}
            </div>
            <div className="players-column">
              {playerInputs.slice(5, 10).map((input, index) => (
                <InputField
                  key={index + 5}
                  label={`Player ${index + 6}`}
                  value={input}
                  selectedRoles={playerRoles[index + 5]}
                  apiError={apiErrors[index + 5]}
                  onInputChange={(value) => handleInputChange(value, index + 5)}
                  onRolesChange={(roles) => handleRolesChange(roles, index + 5)}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="middle-panel">
          <div className="options-panel">
            <h3>Options</h3>
            
            <div className="option-group">
              <label className="option-label">Generation Type:</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input type="radio" name="generationType" value="fullyRandom" defaultChecked />
                  <span>Fully Random</span>
                </label>
                <label className="radio-option">
                  <input type="radio" name="generationType" value="balanced" />
                  <span>Semi-Random Balanced</span>
                </label>
                <label className="radio-option">
                  <input type="radio" name="generationType" value="fullBalance" />
                  <span>Fully Balanced</span>
                </label>
              </div>
            </div>
            
            <div className="option-group">
              <label className="option-label">Assign Roles:</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input 
                    type="radio" 
                    name="generateRoles" 
                    value="yes" 
                    defaultChecked
                    disabled={shouldDisableRoleAssignment()}
                    onChange={() => handleRoleAssignmentChange('yes')}
                  />
                  <span>Yes</span>
                </label>
                <label className="radio-option">
                  <input 
                    type="radio" 
                    name="generateRoles" 
                    value="no"
                    disabled={shouldDisableRoleAssignment()}
                    onChange={() => handleRoleAssignmentChange('no')}
                  />
                  <span>No</span>
                </label>
              </div>
              {shouldDisableRoleAssignment() && (
                <p className="role-disabled-warning">
                  Role assignment requires at least 6 players
                </p>
              )}
            </div>
            
            <div className="option-group">
              <label className="option-label">Default Unranked To:</label>
              <div className="rank-select">
                <select className="rank-dropdown" value={defaultRank} onChange={(e) => setDefaultRank(e.target.value)}>
                  <option value="iron1">Iron 1</option>
                  <option value="iron2">Iron 2</option>
                  <option value="iron3">Iron 3</option>
                  <option value="iron4">Iron 4</option>
                  <option value="bronze1">Bronze 1</option>
                  <option value="bronze2">Bronze 2</option>
                  <option value="bronze3">Bronze 3</option>
                  <option value="bronze4">Bronze 4</option>
                  <option value="silver1">Silver 1</option>
                  <option value="silver2">Silver 2</option>
                  <option value="silver3">Silver 3</option>
                  <option value="silver4">Silver 4</option>
                  <option value="gold1">Gold 1</option>
                  <option value="gold2">Gold 2</option>
                  <option value="gold3">Gold 3</option>
                  <option value="gold4">Gold 4</option>
                  <option value="platinum1">Platinum 1</option>
                  <option value="platinum2">Platinum 2</option>
                  <option value="platinum3">Platinum 3</option>
                  <option value="platinum4">Platinum 4</option>
                  <option value="emerald1">Emerald 1</option>
                  <option value="emerald2">Emerald 2</option>
                  <option value="emerald3">Emerald 3</option>
                  <option value="emerald4">Emerald 4</option>
                  <option value="diamond1">Diamond 1</option>
                  <option value="diamond2">Diamond 2</option>
                  <option value="diamond3">Diamond 3</option>
                  <option value="diamond4">Diamond 4</option>
                  <option value="masters">Master</option>
                  <option value="grandmaster">Grandmaster</option>
                  <option value="challenger">Challenger</option>
                </select>
              </div>
            </div>
            
            <button className="clear-all-btn" onClick={handleClearAll}>
              Reset
            </button>
            
            <button className="generate-btn" onClick={handleGenerate} disabled={isGenerating || isGenerateRateLimited()}>
              {isGenerating ? (
                <>
                  <span className="spinner"></span>
                  Generating...
                </>
              ) : isGenerateRateLimited() ? (
                `Cooldown: ${cooldownDisplay}s`
              ) : (
                'Generate Teams'
              )}
            </button>
            
            {generatedTeams && (generatedTeams.blueTeam || generatedTeams.redTeam) && (
              <button className="reroll-btn" onClick={handleRerollTeams}>
                Reroll Teams
              </button>
            )}
          </div>
        </div>
        
        <div className="csv-panel">
          <h3>CSV Autofill</h3>
          
          <div className="csv-input-group">
            <label className="csv-label">CSV Data:</label>
            <textarea
              className="csv-textarea"
              placeholder="Enter CSV data (format: name#tag,role1,role2...)"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              rows={6}
            />
            <button 
              className="csv-submit-btn"
              onClick={handleCsvSubmit}
              disabled={!csvData.trim()}
            >
              Submit
            </button>
          </div>
          
          <div className="csv-help">
            <p>Format: PlayerName#Tag,TOP,JGL,MID,BOT,SUP</p>
            <p>One player per line, roles are optional</p>
          </div>
        </div>
        
        <div className="teams-display">
          <div className="team-section">
            <h3 className="team-title blue-team">Blue Side</h3>
            <div className="team-players">
              {generatedTeams.blueTeam ? generatedTeams.blueTeam.map((player, index) => (
                <div key={index} className="team-player">
                  <span className="player-role">{player.assignedRole || 'No Role'}</span>
                  <a 
                    href={`https://dpm.lol/${player.name.replace('#', '-')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="player-name"
                  >
                    {player.name}
                  </a>
                  <span className="player-rank" style={{ color: getRankColor(player.tier) }}>{player.tier} {player.rank > 0 ? player.rank : ''}</span>
                  <span className="player-mmr">({player.skillValue})</span>
                </div>
              )) : (
                <div className="no-teams">No teams generated yet</div>
              )}
            </div>
            {generatedTeams.blueTeam && (
              <div className="team-total">
                Total MMR: {generatedTeams.blueTotalSkill}
              </div>
            )}
          </div>
          
          <div className="team-section">
            <h3 className="team-title red-team">Red Side</h3>
            <div className="team-players">
              {generatedTeams.redTeam ? generatedTeams.redTeam.map((player, index) => (
                <div key={index} className="team-player">
                  <span className="player-role">{player.assignedRole || 'No Role'}</span>
                  <a 
                    href={`https://dpm.lol/${player.name.replace('#', '-')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="player-name"
                  >
                    {player.name}
                  </a>
                  <span className="player-rank" style={{ color: getRankColor(player.tier) }}>{player.tier} {player.rank > 0 ? player.rank : ''}</span>
                  <span className="player-mmr">({player.skillValue})</span>
                </div>
              )) : (
                <div className="no-teams">No teams generated yet</div>
              )}
            </div>
            {generatedTeams.redTotalSkill && (
              <div className="team-total">
                Total MMR: {generatedTeams.redTotalSkill}
              </div>
            )}
          </div>
        </div>
      </div>
      <footer>
        <div className="footer-content">
          <img src={logo} alt="Logo" className="footer-logo" />
          <p>BY HUY TRUONG - HUYTRUONG.CA - HUY@HUYTRUONG.CA</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
