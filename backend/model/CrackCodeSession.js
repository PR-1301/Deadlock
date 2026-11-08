const mongoose = require("mongoose");

const crackCodeSessionSchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
        required: true,
    },
    // Question this round is locked to (see config/crackCodeQuestions.js)
    questionId: {
        type: String,
        default: null,
    },
    // sha256(language + code) of the last code that passed every visible AND hidden case.
    // Submit is only accepted as correct if the submitted code matches this hash.
    validatedCodeHash: {
        type: String,
        default: null,
    },
    attemptsUsed: {
        type: Number,
        default: 0,
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
    endedAt: {
        type: Date,
        default: null,
    },
});

module.exports = mongoose.model(
    "CrackCodeSession",
    crackCodeSessionSchema
);
