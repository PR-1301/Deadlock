const express = require("express");
const router = express.Router();

const Team = require("../../model/team.model");
const CrackCodeSession = require("../../model/CrackCodeSession");
const CrackCodeSubmission = require("../../model/CrackCodeSubmission");
const CrackCodeAttempt = require("../../model/CrackCodeAttempt");
const GameState = require("../../model/gameState.model");
const {
  QUESTIONS,
  DEFAULT_QUESTION_ID,
  getQuestionById,
  toAdminSummary,
} = require("../../config/crackCodeQuestions");

const getSelectedQuestionId = async () => {
  const state = await GameState.get();
  return getQuestionById(state.crackCodeQuestionId) ? state.crackCodeQuestionId : DEFAULT_QUESTION_ID;
};

/*
  GET /admin/crack-code/questions
  - Lists the available questions and which one is selected for the round
*/
router.get("/questions", async (req, res) => {
  try {
    const activeSession = await CrackCodeSession.findOne().select("questionId");
    return res.json({
      questions: QUESTIONS.map(toAdminSummary),
      selectedQuestionId: await getSelectedQuestionId(),
      // While a round is running the question is locked to what the sessions were created with
      activeQuestionId: activeSession ? activeSession.questionId || DEFAULT_QUESTION_ID : null,
      locked: !!activeSession,
    });
  } catch (error) {
    console.error("CrackCode QUESTIONS error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/*
  PUT /admin/crack-code/question
  Body: { questionId }
  - Selects the question for the next round. Rejected while a round is running.
*/
router.put("/question", async (req, res) => {
  try {
    const { questionId } = req.body || {};
    if (!getQuestionById(questionId)) {
      return res.status(400).json({ message: "Unknown questionId" });
    }
    if (await CrackCodeSession.findOne()) {
      return res.status(409).json({
        message: "Round in progress. Reset the systems before changing the question.",
      });
    }
    await GameState.updateOne(
      { key: "GLOBAL_STATE" },
      { $set: { crackCodeQuestionId: questionId } },
      { upsert: true }
    );
    return res.json({ message: "Question selected", selectedQuestionId: questionId });
  } catch (error) {
    console.error("CrackCode SELECT QUESTION error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/*
  POST /admin/crack-code/start
  Body (optional): { questionId }  - falls back to the selected question

  - Admin starts the Crack the Code game
  - Creates one CrackCodeSession per active team, locked to the chosen question
*/
router.post("/start", async (req, res) => {
  try {
    const requestedId = req.body && req.body.questionId;
    if (requestedId && !getQuestionById(requestedId)) {
      return res.status(400).json({ message: "Unknown questionId" });
    }
    const questionId = requestedId || (await getSelectedQuestionId());

    // Fetch ONLY teams that won their Deadlock matches
    const teams = await Team.find({ deadlockResult: 'win' });

    if (teams.length === 0) {
      return res.status(400).json({
        message: "STALEMATE DETECTED: No winning teams eligible for decryption.",
      });
    }
    const alreadyStarted = await CrackCodeSession.findOne();
    if (alreadyStarted) {
      return res.status(400).json({
        message: "Crack the Code game already started",
      });
    }
    await GameState.updateOne(
      { key: "GLOBAL_STATE" },
      { $set: { crackCodeQuestionId: questionId } },
      { upsert: true }
    );

    // Create CrackCodeSession for each team
    const startedAt = new Date();
    for (const team of teams) {
      await CrackCodeSession.create({
        teamId: team._id,
        questionId,
        attemptsUsed: 0,
        startedAt,
      });
    }

    return res.json({
      message: "Crack the Code game started successfully",
      questionId,
    });
  } catch (error) {
    console.error("CrackCode START error:", error);
    return res.status(500).json({
      message: "Internal server error while starting Crack the Code",
      error: error.message,
    });
  }
});

/*
  GET /admin/crack-code/winner-info
  - Fetches the team details of the first winner
*/
router.get("/winner-info", async (req, res) => {
  try {
    // 1. Fetch the absolute winner (first one)
    const winnerSubmission = await CrackCodeSubmission.findOne({ finalWinner: true })
      .populate("teamId", "name members");

    // 2. Fetch ALL successful breaches, sorted by time
    const allSuccessful = await CrackCodeSubmission.find({ isCorrect: true })
      .sort({ submittedAt: 1 })
      .populate("teamId", "name members");

    return res.json({
      winnerFound: !!winnerSubmission,
      winner: winnerSubmission ? {
        teamName: winnerSubmission.teamId.name,
        members: winnerSubmission.teamId.members,
        submittedAt: winnerSubmission.submittedAt
      } : null,
      allBreaches: allSuccessful.map(sub => ({
        id: sub._id,
        teamId: sub.teamId._id,
        teamName: sub.teamId.name,
        members: sub.teamId.members,
        submittedAt: sub.submittedAt,
        isAbsoluteWinner: sub.finalWinner
      }))
    });
  } catch (error) {
    console.error("Winner info error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/reset", async (req, res) => {
  try {
    // 1. Purge Crack Code Specific Data ONLY
    await CrackCodeSession.deleteMany({});
    await CrackCodeSubmission.deleteMany({});
    await CrackCodeAttempt.deleteMany({});

    // 2. Reset Glitch Availability (Keep the First Blood winner, but let them use the skill again)
    await GameState.updateOne(
      { key: 'GLOBAL_STATE' },
      {
        $set: {
          glitchUsed: false,
          glitchActiveUntil: null
        }
      },
      { upsert: true }
    );

    return res.json({
      message: "All Crack the Code sessions, submissions, and attempts have been purged. First Blood winner preserved; Glitch skill reset.",
    });
  } catch (error) {
    console.error("CrackCode RESET error:", error);
    return res.status(500).json({
      message: "Internal server error while resetting sessions",
    });
  }
});

module.exports = router;
