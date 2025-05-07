import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// Define types directly to avoid import issues
interface Player {
  id: string;
  name: string;
  createdAt: Date;
}

interface PitchSettings {
  matchDuration: number;
  maxGoals: number;
  allowDraws: boolean;
  customColors?: {
    primary: string;
    secondary: string;
  };
}

interface Pitch {
  id: string;
  name: string;
  location?: string;
  description?: string;
  logo?: string;
  createdAt: Date;
  referees: string[];
  customSettings?: PitchSettings;
}

interface Team {
  id: string;
  name: string;
  players: Player[];
  wins: number;
  losses: number;
  draws: number;
  createdAt: Date;
  pitchId: string;
}

// Mock pitches for the demo
const mockPitches: Pitch[] = [
  {
    id: "pitch1",
    name: "Soccerdome",
    location: "Downtown",
    description: "Indoor 5-a-side pitch with professional turf",
    createdAt: new Date(),
    referees: ["referee1", "referee2"],
    customSettings: {
      matchDuration: 900, // 15 minutes
      maxGoals: 7,
      allowDraws: false,
    },
  },
  {
    id: "pitch2",
    name: "Powerleague",
    location: "Northside",
    description: "Outdoor pitch with floodlights",
    createdAt: new Date(),
    referees: ["referee1"],
    customSettings: {
      matchDuration: 1200, // 20 minutes
      maxGoals: 10,
      allowDraws: true,
    },
  },
];

// Mock teams for today
const mockTodaysTeams: Team[] = [
  {
    id: "1",
    name: "Lightning Warriors",
    players: [
      { id: "1", name: "John Doe", createdAt: new Date() },
      { id: "2", name: "Jane Smith", createdAt: new Date() },
      { id: "3", name: "Alex Johnson", createdAt: new Date() },
      { id: "4", name: "Sam Wilson", createdAt: new Date() },
      { id: "5", name: "Mike Brown", createdAt: new Date() },
    ],
    wins: 2,
    losses: 1,
    draws: 0,
    createdAt: new Date(),
    pitchId: "pitch1",
  },
  {
    id: "2",
    name: "Royal Eagles",
    players: [
      { id: "6", name: "Tom Smith", createdAt: new Date() },
      { id: "7", name: "Kate Wilson", createdAt: new Date() },
      { id: "8", name: "James Brown", createdAt: new Date() },
      { id: "9", name: "Emma Johnson", createdAt: new Date() },
      { id: "10", name: "Chris Davis", createdAt: new Date() },
    ],
    wins: 1,
    losses: 2,
    draws: 0,
    createdAt: new Date(),
    pitchId: "pitch2",
  },
];

const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>(mockTodaysTeams);
  const [showAddTeamForm, setShowAddTeamForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [showAddPlayerForm, setShowAddPlayerForm] = useState<string | null>(
    null
  );
  const [newPlayerName, setNewPlayerName] = useState("");
  const [selectedPitch, setSelectedPitch] = useState<string>(mockPitches[0].id);
  const [pitches, _setPitches] = useState<Pitch[]>(mockPitches);
  const [noPitchSelected, setNoPitchSelected] = useState(false);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  // Filter teams by selected pitch
  const filteredTeams = teams.filter((team) => team.pitchId === selectedPitch);

  const handleAddTeam = () => {
    if (newTeamName.trim() === "") return;

    const newTeam: Team = {
      id: (teams.length + 1).toString(),
      name: newTeamName,
      players: [],
      wins: 0,
      losses: 0,
      draws: 0,
      createdAt: new Date(),
      pitchId: selectedPitch,
    };

    setTeams([...teams, newTeam]);
    setNewTeamName("");
    setShowAddTeamForm(false);
  };

  const handleAddPlayer = (teamId: string) => {
    if (newPlayerName.trim() === "") return;

    const updatedTeams = teams.map((team) => {
      if (team.id === teamId) {
        const newPlayer: Player = {
          id: (team.players.length + 1).toString(),
          name: newPlayerName,
          createdAt: new Date(),
        };
        return {
          ...team,
          players: [...team.players, newPlayer],
        };
      }
      return team;
    });

    setTeams(updatedTeams);
    setNewPlayerName("");
    setShowAddPlayerForm(null);
  };

  // Find the selected pitch
  const selectedPitchObject = pitches.find(
    (pitch) => pitch.id === selectedPitch
  );

  return (
    <div>
      {/* Pitch Selection Section */}
      <div className="bg-dark-lighter p-6 rounded-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-xl"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-4">Select a Pitch</h2>
          <p className="text-gray-400 mb-4">
            First, choose a pitch where you want to play today:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {pitches.map((pitch) => (
              <div
                key={pitch.id}
                onClick={() => {
                  setSelectedPitch(pitch.id);
                  setNoPitchSelected(false);
                }}
                className={`cursor-pointer transition-all duration-200 border ${
                  selectedPitch === pitch.id
                    ? "border-primary bg-dark-lighter shadow-lg shadow-primary/10"
                    : "border-gray-700 bg-dark hover:border-gray-500"
                } rounded-lg p-4 relative overflow-hidden`}
              >
                <div
                  className={`absolute top-0 right-0 w-2 h-full ${
                    selectedPitch === pitch.id ? "bg-primary" : "bg-transparent"
                  }`}
                ></div>
                <h3 className="font-bold text-lg">{pitch.name}</h3>
                <p className="text-gray-400 text-sm">{pitch.location}</p>
                <p className="text-gray-500 text-xs mt-2">
                  {pitch.description}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <div>
              <Link
                to="/pitches"
                className="text-primary text-sm hover:underline flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 11l5-5m0 0l5 5m-5-5v12"
                  />
                </svg>
                Browse more pitches
              </Link>
            </div>
            {selectedPitchObject && (
              <div className="text-sm text-gray-400">
                Match duration:{" "}
                {selectedPitchObject.customSettings?.matchDuration
                  ? selectedPitchObject.customSettings.matchDuration / 60
                  : 15}{" "}
                minutes
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Header with stats */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold sport-gradient-text mb-2">
              Today's Teams at {selectedPitchObject?.name}
            </h2>
            <p className="text-gray-400 text-sm">
              Create or join teams for today's matches (
              {new Date().toLocaleDateString()})
            </p>
          </div>
          <button
            className="btn-primary mt-4 md:mt-0 flex items-center"
            onClick={() => {
              if (!selectedPitch) {
                setNoPitchSelected(true);
                return;
              }
              setShowAddTeamForm(!showAddTeamForm);
            }}
          >
            {showAddTeamForm ? (
              <span>Cancel</span>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
                Create New Team
              </>
            )}
          </button>
        </div>

        {noPitchSelected && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-md mb-4">
            Please select a pitch first before creating a team.
          </div>
        )}

        {/* Form to add a new team */}
        {showAddTeamForm && (
          <div className="bg-dark-lighter p-4 rounded-lg mb-6 border border-gray-700">
            <h3 className="text-lg font-bold mb-3">Create New Team</h3>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="bg-dark border border-gray-700 rounded px-4 py-2 flex-grow focus:outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button
                  className="btn-primary flex-grow md:flex-grow-0"
                  onClick={handleAddTeam}
                >
                  Create Team
                </button>
                <button
                  className="btn-secondary flex-grow md:flex-grow-0"
                  onClick={() => setShowAddTeamForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Teams grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTeams.length > 0 ? (
            filteredTeams.map((team) => (
              <div
                key={team.id}
                className="team-card hover:border-primary/50 transition-colors duration-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {team.name}
                    </h3>
                    <div className="flex gap-3 text-xs text-gray-400 mt-1">
                      <span className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 mr-1 text-green-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {team.wins} W
                      </span>
                      <span className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 mr-1 text-red-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {team.losses} L
                      </span>
                      <span className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 mr-1 text-yellow-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {team.draws} D
                      </span>
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-full text-xs ${
                      team.players.length < 5
                        ? "bg-primary/20 text-primary"
                        : "bg-red-500/20 text-red-500"
                    }`}
                  >
                    {team.players.length < 5
                      ? `Need ${5 - team.players.length} more`
                      : "Full team"}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">
                    Players ({team.players.length}/5)
                  </h4>
                  <div className="space-y-2">
                    {team.players.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center py-1.5 px-3 bg-dark-lighter rounded"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs mr-3">
                          {player.name.charAt(0)}
                        </div>
                        <span className="text-sm">{player.name}</span>
                      </div>
                    ))}

                    {team.players.length < 5 &&
                      showAddPlayerForm !== team.id && (
                        <button
                          className="w-full py-1.5 px-3 border border-dashed border-gray-600 rounded flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary transition-colors duration-200"
                          onClick={() => setShowAddPlayerForm(team.id)}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-2"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                          </svg>
                          Join this team
                        </button>
                      )}

                    {showAddPlayerForm === team.id && (
                      <div className="flex items-center gap-2 mt-3">
                        <input
                          type="text"
                          placeholder="Your name"
                          value={newPlayerName}
                          onChange={(e) => setNewPlayerName(e.target.value)}
                          className="bg-dark border border-gray-700 rounded px-3 py-1.5 text-sm flex-grow focus:outline-none focus:border-primary"
                        />
                        <button
                          className="btn-primary text-sm py-1.5"
                          onClick={() => handleAddPlayer(team.id)}
                        >
                          Join
                        </button>
                        <button
                          className="btn-secondary text-sm py-1.5"
                          onClick={() => setShowAddPlayerForm(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-12 bg-dark-lighter rounded-xl border border-gray-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto text-gray-600 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-gray-400 mb-4">
                No teams yet at this pitch for today
              </p>
              <button
                className="btn-primary"
                onClick={() => setShowAddTeamForm(true)}
              >
                Create the first team
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamsPage;
