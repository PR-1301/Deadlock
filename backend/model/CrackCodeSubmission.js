const mongoose = require("mongoose");

const crackCodeSubmissionSchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
        required: true,
    },
    crackCodeSessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CrackCodeSession",
        required: true,
    },
    submittedLogic: {
        type: String,
        required: true,
    },
    isCorrect: {
        type: Boolean,
        default: false,
    },
    submittedAt: {
        type: Date,
        default: Date.now,
    },
    finalWinner: {
        type: Boolean,
        default: false,
    },
});

// Race-safety: enforced by MongoDB, not by "check then insert" in application code.
// Only ONE submission can ever be the final winner...
crackCodeSubmissionSchema.index(
    { finalWinner: 1 },
    { unique: true, partialFilterExpression: { finalWinner: true } }
);
// ...and a team can submit only once per session.
crackCodeSubmissionSchema.index({ teamId: 1, crackCodeSessionId: 1 }, { unique: true });

module.exports = mongoose.model(
    "CrackCodeSubmission",
    crackCodeSubmissionSchema
);
