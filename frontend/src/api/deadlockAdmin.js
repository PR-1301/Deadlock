import axios from 'axios';
import { attachAdminAuth } from './adminAuth';

// Use environment variable if set, otherwise fallback to dynamic hostname for LAN support
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_URL = `${BASE_URL}/api/admin/deadlock`;

const api = attachAdminAuth(axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
}));

export const getTeams = async () => {
    try {
        const response = await api.get('/teams');
        return response.data;
    } catch (error) {
        console.error("Error fetching teams:", error);
        throw error;
    }
};

export const getMatches = async () => {
    try {
        const response = await api.get('/matches');
        return response.data;
    } catch (error) {
        console.error("Error fetching matches:", error);
        throw error;
    }
};

export const purgeMatches = async () => {
    try {
        const response = await api.delete('/matches');
        return response.data;
    } catch (error) {
        console.error("Error purging matches:", error);
        throw error;
    }
};

export const terminateSession = async () => {
    try {
        const response = await api.post('/terminate');
        return response.data;
    } catch (error) {
        console.error("Error terminating session:", error);
        throw error;
    }
};

export const createMatch = async () => {
    try {
        const response = await api.post('/match', {});
        return response.data;
    } catch (error) {
        console.error("Error creating match:", error);
        throw error;
    }
};

export const updateMatchTeams = async (matchId, teamAId, teamBId) => {
    try {
        const response = await api.patch(`/match/${matchId}/teams`, {
            teamA: teamAId,
            teamB: teamBId
        });
        return response.data;
    } catch (error) {
        console.error("Error updating match teams:", error);
        throw error;
    }
};

export const swapMatchTeams = async (matchId) => {
    try {
        const response = await api.patch(`/match/${matchId}/swap`);
        return response.data;
    } catch (error) {
        console.error("Error swapping teams:", error);
        throw error;
    }
};

export const resetMatch = async (matchId) => {
    try {
        const response = await api.patch(`/match/${matchId}/reset`);
        return response.data;
    } catch (error) {
        console.error("Error resetting match:", error);
        throw error;
    }
};

export const finishMatch = async (matchId, winnerId) => {
    try {
        const response = await api.patch(`/match/${matchId}/finish`, {
            winner: winnerId
        });
        return response.data;
    } catch (error) {
        console.error("Error finishing match:", error);
        throw error;
    }
};

export const startAllMatches = async (teamAIds, teamBIds) => {
    try {
        const response = await api.post('/deadlock/start-all', { teamAIds, teamBIds });
        return response.data;
    } catch (error) {
        console.error("Error starting all matches:", error);
        throw error;
    }
};

export const getMatchByTeamName = async (name) => {
    try {
        const response = await api.get(`/match/team/${name}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching match by team name:", error);
        throw error;
    }
};

export const shuffleQuestion = async (matchId) => {
    try {
        const response = await api.post(`/match/${matchId}/shuffle`);
        return response.data;
    } catch (error) {
        console.error("Error shuffling question:", error);
        throw error;
    }
};

export const promoteTeam = async (matchId, winnerTeamId) => {
    try {
        const response = await api.post('/match/promote', { matchId, winnerTeamId });
        return response.data;
    } catch (error) {
        console.error("Error promoting team:", error);
        throw error;
    }
};

export default api;
