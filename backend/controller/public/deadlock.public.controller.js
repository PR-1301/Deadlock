const DeadlockMatch = require("../../model/deadlock.model");
const DeadlockQuestion = require("../../model/deadlockQuestion");
const DeadlockSubmission = require("../../model/deadlockSubmission.model");
const Team = require("../../model/team.model");
const { runCode } = require("../../utils/piston");

/*
----------------------------------------------------
PLAYER SUBMIT ANSWER
POST /api/public/deadlock/submit
----------------------------------------------------
*/
const { validateSubmission } = require("../../utils/solutionRunner");

/*
----------------------------------------------------
PLAYER SUBMIT ANSWER
POST /api/public/deadlock/submit
----------------------------------------------------
*/
exports.submitDeadlock = async (req, res) => {
    try {
        const { matchId, teamId, questionId, language, code } = req.body;

        // Validate match
        const match = await DeadlockMatch.findById(matchId);
        if (!match) {
            return res.status(404).json({ message: "Match not found" });
        }

        if (match.status !== "ongoing") {
            return res.status(400).json({ message: "Match is not ongoing" });
        }

        // Validate team
        const isTeamA = match.teamA.toString() === teamId;
        const isTeamB = match.teamB.toString() === teamId;

        if (!isTeamA && !isTeamB) {
            return res.status(403).json({ message: "Team not in this match" });
        }

        // Get CURRENT question from match (AUTHORITATIVE)
        // SELF-HEALING: If index is out of bounds (e.g. from previous bug), fetch a new question immediately
        if (!match.questions || match.questions.length <= match.currentQuestionIndex) {
            console.warn(`[Self-Healing] Match ${matchId} out of sync (Index ${match.currentQuestionIndex} >= Length ${match.questions.length}). repairing...`);

            // Fetch any valid question to fill the gap
            const count = await DeadlockQuestion.countDocuments();
            const randomSkip = Math.floor(Math.random() * count);
            const rescueQuestion = await DeadlockQuestion.findOne().skip(randomSkip);

            if (rescueQuestion) {
                match.questions.push(rescueQuestion._id);
                await match.save(); // Save immediately to persist fix
                console.log(`[Self-Healing] Match repaired. Added question ${rescueQuestion._id}`);
            } else {
                return res.status(500).json({ message: "Game State Error: Database empty, cannot repair match." });
            }
        }
        const currentQuestionId = match.questions[match.currentQuestionIndex];

        // Validate correct question submit
        if (currentQuestionId.toString() !== questionId) {
            return res.status(409).json({
                message: "Question mismatch or already solved. Please refresh.",
                currentQuestionIndex: match.currentQuestionIndex
            });
        }

        const question = await DeadlockQuestion.findById(currentQuestionId);
        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        let verdict = "AC";
        let error = null;

        // Run code against all test cases (1 visible, 2 hidden)
        for (const testCase of question.testCases) {
            const validation = await validateSubmission({
                language,
                code,
                question,
                testCase
            });

            if (!validation.success) {
                verdict = validation.verdict;
                error = validation.error || `Failed on ${testCase.isHidden ? 'hidden' : 'visible'} test case`;
                break;
            }
        }

        // Save submission
        await DeadlockSubmission.create({
            matchId: matchId,
            teamId: teamId,
            questionId: currentQuestionId,
            language,
            verdict,
            answer: code,
            isCorrect: verdict === "AC",
            error: error
        });

        // If failed -> stop here
        if (verdict !== "AC") {
            return res.json({
                success: false,
                verdict,
                error
            });
        }

        // Move tug
        if (isTeamA) {
            match.tugPosition -= 1; // Alpha pulls negative
            match.scoreA += 1;
            match.pullHistory.push('A');
        } else {
            match.tugPosition += 1; // Omega pulls positive
            match.scoreB += 1;
            match.pullHistory.push('B');
        }

        // Win condition check (-maxPull or +maxPull)
        const maxPull = match.maxPull || 4;
        let winnerId = null, loserId = null;

        if (match.tugPosition <= -maxPull) {
            winnerId = match.teamA;
            loserId = match.teamB;
            match.status = "finished";
        } else if (match.tugPosition >= maxPull) {
            winnerId = match.teamB;
            loserId = match.teamA;
            match.status = "finished";
        }

        if (match.status !== "finished") {
            // Advance to next question only if not finished
            match.currentQuestionIndex += 1;

            // DYNAMIC DIFFICULTY SHIFTING
            // Map absolute tugPosition to difficulty
            // 0 -> Easy, 1-2 -> Medium, 3 -> Hard
            const absPos = Math.abs(match.tugPosition);
            let nextDifficulty = "medium";
            if (absPos >= 3) nextDifficulty = "hard";
            else if (absPos === 0) nextDifficulty = "easy";

            // SAFETY: Check if we already have a question at this index
            if (match.questions.length <= match.currentQuestionIndex) {
                // Fetch a random question of the target difficulty that hasn't been used in this match
                const usedQuestionIds = match.questions;

                // Count available
                const count = await DeadlockQuestion.countDocuments({
                    difficulty: nextDifficulty,
                    _id: { $nin: usedQuestionIds }
                });

                let nextQuestion = null;
                if (count > 0) {
                    const randomSkip = Math.floor(Math.random() * count);
                    nextQuestion = await DeadlockQuestion.findOne({
                        difficulty: nextDifficulty,
                        _id: { $nin: usedQuestionIds }
                    }).skip(randomSkip);
                }

                // FALLBACK: If strictly filtered pool is empty, relax constraints
                if (!nextQuestion) {
                    const countAny = await DeadlockQuestion.countDocuments({ difficulty: nextDifficulty });
                    if (countAny > 0) {
                        const randomSkip = Math.floor(Math.random() * countAny);
                        nextQuestion = await DeadlockQuestion.findOne({ difficulty: nextDifficulty }).skip(randomSkip);
                    }
                }

                // FINAL FALLBACK: Any random question
                if (!nextQuestion) {
                    const countAll = await DeadlockQuestion.countDocuments();
                    if (countAll > 0) {
                        const randomSkip = Math.floor(Math.random() * countAll);
                        nextQuestion = await DeadlockQuestion.findOne().skip(randomSkip);
                    }
                }

                if (nextQuestion) {
                    match.questions.push(nextQuestion._id);
                } else {
                    console.error("CRITICAL: No questions available in database!");
                    match.status = "finished";
                }
            }
        }

        if (match.status === "finished") {
            match.winner = winnerId;
            match.loser = loserId;

            // Update team records
            if (winnerId) {
                await Team.findByIdAndUpdate(winnerId, {
                    currentRound: "crack-the-code",
                    deadlockResult: "win"
                });

                // ATOMIC FIRST BLOOD ASSIGNMENT
                // Ensure state exists, then assign if firstBloodTeamId is null.
                const GameState = require("../../model/gameState.model");
                await GameState.get();
                await GameState.updateOne(
                    { key: 'GLOBAL_STATE', firstBloodTeamId: null },
                    { $set: { firstBloodTeamId: winnerId } }
                );
            }

            if (loserId) {
                await Team.findByIdAndUpdate(loserId, {
                    currentRound: "eliminated",
                    deadlockResult: "lose"
                });
            }
        }

        await match.save();

        res.json({
            success: true,
            verdict: "AC",
            tugPosition: match.tugPosition,
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            status: match.status,
            nextQuestionIndex: match.currentQuestionIndex,
            winner: winnerId,
            loser: loserId
        });
    } catch (err) {
        console.error("Deadlock submit error:", err);
        res.status(500).json({ message: "Submission failed", error: err.message });
    }
};

//get match state
exports.getMatchState = async (req, res) => {
    try {
        const match = await DeadlockMatch.findById(req.params.id)
            .populate("teamA teamB winner")
            .populate("questions");

        if (!match) {
            return res.status(404).json({ message: "Match not found" });
        }

        const currentQuestion =
            match.questions[match.currentQuestionIndex];

        res.json({
            teamA: match.teamA,
            teamB: match.teamB,
            tugPosition: match.tugPosition,
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            maxPull: match.maxPull,
            status: match.status,
            winner: match.winner,
            currentQuestionIndex: match.currentQuestionIndex,
            totalQuestions: match.questions.length,
            currentQuestion,
            pullHistory: match.pullHistory
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};


exports.getMatchByTeam = async (req, res) => {
    try {
        const { teamId } = req.params;
        // Basic validation
        if (!teamId || teamId.length !== 24) {
            return res.status(400).json({ message: "Invalid ID" });
        }

        const match = await DeadlockMatch.findOne({
            $or: [{ teamA: teamId }, { teamB: teamId }],
            status: { $in: ["lobby", "ongoing"] }
        }).populate("teamA teamB", "name members");

        if (!match) {
            return res.status(200).json({
                success: false,
                message: "No active match found."
            });
        }

        const isTeamA = match.teamA._id.toString() === teamId;
        const opponent = isTeamA ? match.teamB : match.teamA;

        res.json({
            matchId: match._id,
            status: match.status,
            team: isTeamA ? "A" : "B",
            opponentName: opponent ? opponent.name : "PENDING...",
            opponentMembers: opponent && Array.isArray(opponent.members) ? opponent.members : [],
            tugPosition: match.tugPosition,
            maxPull: match.maxPull
        });
    } catch (error) {
        console.error("Match by team error:", error);
        res.status(500).json({ message: "System error." });
    }
};
