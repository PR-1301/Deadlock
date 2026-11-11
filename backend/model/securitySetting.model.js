const mongoose = require("mongoose");

const SecuritySettingSchema = new mongoose.Schema({
    key: {
        type: String,
        default: "global_security",
        unique: true
    },
    disableCopyPaste: {
        type: Boolean,
        default: false
    },
    allowDevTools: {
        type: Boolean,
        default: false
    },
    forceFullscreen: {
        type: Boolean,
        default: false
    },
    blockDevTools: {
        type: Boolean,
        default: false
    },
    blockAiAssistant: {
        type: Boolean,
        default: false
    },
    enableLogging: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model("SecuritySetting", SecuritySettingSchema);
