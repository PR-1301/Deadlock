const Team = require("../model/team.model");
const { runCode } = require("../utils/piston");

/*
    POST /api/public/code/execute
    
    Request Body:
    {
        language: "python",
        version: "3.10.0",
        files: [
            {
                content: "print('Hello World')"
            }
        ],
        stdin: "optional input",
        args: ["optional", "args"]
    }

    Response:
    {
        output: "Hello World\n",
        error: "" 
    }
*/

// Migrated to runCode utility using Wandbox

const CrackCodeSession = require("../model/CrackCodeSession");
const CrackCodeAttempt = require("../model/CrackCodeAttempt");

const executeCode = async (req, res) => {
    try {
        const { teamId, language, version, files, stdin, args } = req.body;

        if (!teamId) {
            return res.status(400).json({
                message: "Team ID is required"
            });
        }

        if (!language || !version || !files || files.length === 0) {
            return res.status(400).json({
                message: "Language, version, and files are required"
            });
        }

        // --- GLITCH ENFORCEMENT ---
        const GameState = require("../model/gameState.model");
        const state = await GameState.findOne({ key: 'GLOBAL_STATE' });
        if (state && state.glitchActiveUntil && new Date() < new Date(state.glitchActiveUntil)) {
            if (state.firstBloodTeamId && state.firstBloodTeamId.toString() !== teamId) {
                return res.status(403).json({
                    success: false,
                    message: "SYSTEM GLITCH ACTIVE - ACCESS DENIED"
                });
            }
        }
        // --------------------------

        // 1. Find Session
        const mongoose = require("mongoose");
        const queryTeamId = mongoose.Types.ObjectId.isValid(teamId) ? new mongoose.Types.ObjectId(teamId) : teamId;

        const session = await CrackCodeSession.findOne({ teamId: queryTeamId });
        if (!session) {
            console.log("CTC Session not found for teamId:", teamId);
            return res.status(404).json({
                message: "Session not found for this team"
            });
        }

        // 2. Execute Code (using Wandbox via runCode utility)
        const result = await runCode({
            language,
            code: files[0].content,
            input: stdin || ""
        });

        const output = result.run.stdout;
        const error = result.run.stderr;


        session.attemptsUsed += 1;
        await session.save();

        await CrackCodeAttempt.create({
            teamId,
            crackCodeSessionId: session._id,
            input: stdin || "", // Saving input/stdin
            code: files[0].content, // Saving the submitted code
            output: output || error || "", // Saving whatever came back
            attemptNumber: session.attemptsUsed
        });

        return res.json({
            output: output,
            error: error
        });

    } catch (error) {
        console.error("Code execution error:", error.message);
        return res.status(500).json({
            message: "Error executing code",
            error: error.message
        });
    }
};

module.exports = {
    executeCode
};
