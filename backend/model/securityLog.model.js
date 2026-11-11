const mongoose = require("mongoose");

const SecurityLogSchema = new mongoose.Schema(
    {
        teamName: {
            type: String,
            required: true,
            trim: true,
            default: "UNKNOWN",
            index: true
        },
        type: {
            type: String,
            enum: ["ALERT", "TAB_SWITCH", "WINDOW_SWITCH", "INFO"],
            default: "ALERT",
            index: true
        },
        category: {
            type: String,
            enum: [
                "COPY",
                "PASTE",
                "CUT",
                "TAB_SWITCH",
                "WINDOW_SWITCH",
                "DEVTOOLS",
                "AI_ASSISTANT",
                "CONTEXT_MENU",
                "SHORTCUT",
                "FULLSCREEN",
                "OTHER"
            ],
            default: "OTHER",
            index: true
        },
        action: {
            type: String,
            trim: true,
            default: ""
        },
        message: {
            type: String,
            required: true,
            trim: true
        },
        page: {
            type: String,
            trim: true,
            default: ""
        },
        blocked: {
            type: Boolean,
            default: true
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    { timestamps: false }
);

SecurityLogSchema.index({ timestamp: -1 });
SecurityLogSchema.index({ category: 1, timestamp: -1 });

module.exports = mongoose.model("SecurityLog", SecurityLogSchema);
