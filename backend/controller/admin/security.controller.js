const SecuritySetting = require("../../model/securitySetting.model");
const SecurityLog = require("../../model/securityLog.model");

const VALID_TYPES = new Set(["ALERT", "TAB_SWITCH", "WINDOW_SWITCH", "INFO"]);
const VALID_CATEGORIES = new Set([
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
]);

let cachedEnableLogging = null;

const isViolationLoggingEnabled = async () => {
    if (typeof cachedEnableLogging === "boolean") {
        return cachedEnableLogging;
    }
    try {
        const doc = await SecuritySetting.findOne({ key: "global_security" })
            .select("enableLogging")
            .lean();
        cachedEnableLogging = Boolean(doc?.enableLogging);
    } catch {
        cachedEnableLogging = false;
    }
    return cachedEnableLogging;
};

const inferCategory = (rawCategory, rawType, message = "") => {
    const upper = String(rawCategory || "").toUpperCase().trim();
    if (VALID_CATEGORIES.has(upper)) return upper;

    const msg = String(message || "").toLowerCase();
    if (rawType === "TAB_SWITCH" || msg.includes("tab")) return "TAB_SWITCH";
    if (rawType === "WINDOW_SWITCH" || msg.includes("window") || msg.includes("blur")) return "WINDOW_SWITCH";
    if (msg.includes("paste") || msg.includes("drag")) return "PASTE";
    if (msg.includes("copy")) return "COPY";
    if (msg.includes("cut")) return "CUT";
    if (msg.includes("context") || msg.includes("right-click")) return "CONTEXT_MENU";
    if (msg.includes("gemini") || msg.includes("side panel") || msg.includes("ai assistant")) return "AI_ASSISTANT";
    if (msg.includes("devtool") || msg.includes("inspect")) return "DEVTOOLS";
    if (msg.includes("fullscreen")) return "FULLSCREEN";
    if (msg.includes("shortcut") || msg.includes("print") || msg.includes("source")) return "SHORTCUT";
    return "OTHER";
};

const normalizeSecurityLogPayload = (raw = {}) => {
    const rawType = String(raw.type || "ALERT").toUpperCase().trim();
    const type = VALID_TYPES.has(rawType) ? rawType : "ALERT";
    const message = String(raw.message || "Security policy event").trim().slice(0, 300) || "Security policy event";
    const category = inferCategory(raw.category, type, message);
    const teamName = String(raw.teamName || "UNKNOWN").trim().slice(0, 120) || "UNKNOWN";
    const action = String(raw.action || "").trim().slice(0, 80);
    const page = String(raw.page || "").trim().slice(0, 80);
    const blocked = typeof raw.blocked === "boolean" ? raw.blocked : type === "ALERT";
    const parsedTime = raw.timestamp ? new Date(raw.timestamp) : new Date();
    const timestamp = Number.isNaN(parsedTime.getTime()) ? new Date() : parsedTime;

    return { teamName, type, category, action, message, page, blocked, timestamp };
};

const recordSecurityLog = async (io, rawPayload = {}) => {
    const loggingEnabled = await isViolationLoggingEnabled();
    if (!loggingEnabled) {
        return { skipped: true };
    }

    const normalized = normalizeSecurityLogPayload(rawPayload);
    let savedLog = normalized;

    try {
        const created = await SecurityLog.create(normalized);
        savedLog = created.toObject ? created.toObject() : created;
    } catch (dbErr) {
        console.error(">>> [SECURITY] Failed to persist security log:", dbErr.message);
        savedLog = {
            ...normalized,
            _id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        };
    }

    if (io) {
        io.to("admin-room").emit("new-log", savedLog);
    }

    return savedLog;
};

const clearAllSecurityLogs = async (io) => {
    await SecurityLog.deleteMany({});
    if (io) {
        io.to("admin-room").emit("security-logs-cleared");
    }
};

exports.recordSecurityLog = recordSecurityLog;
exports.clearAllSecurityLogs = clearAllSecurityLogs;

exports.getSecuritySettings = async (req, res) => {
    try {
        let settings = await SecuritySetting.findOne({ key: "global_security" });
        if (!settings) {
            settings = await SecuritySetting.create({ key: "global_security" });
        }
        cachedEnableLogging = Boolean(settings.enableLogging);
        res.json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateSecuritySettings = async (req, res) => {
    try {
        const {
            disableCopyPaste,
            disableTextSelection,
            allowDevTools,
            forceFullscreen,
            blockDevTools,
            blockAiAssistant,
            enableLogging
        } = req.body;

        let settings = await SecuritySetting.findOneAndUpdate(
            { key: "global_security" },
            {
                disableCopyPaste: Boolean(disableCopyPaste),
                disableTextSelection: Boolean(disableTextSelection),
                allowDevTools: Boolean(allowDevTools),
                forceFullscreen: Boolean(forceFullscreen),
                blockDevTools: Boolean(blockDevTools),
                blockAiAssistant: Boolean(blockAiAssistant),
                enableLogging: Boolean(enableLogging)
            },
            { new: true, upsert: true }
        );

        cachedEnableLogging = Boolean(settings.enableLogging);

        // Broadcast changes to all clients
        const io = req.app.get("io");
        if (io) {
            const plainSettings = settings.toObject ? settings.toObject() : settings;
            console.log(">>> [SECURITY] Broadcasting new settings (JSON):", plainSettings);
            io.emit("security-settings-updated", plainSettings);
        } else {
            console.warn(">>> [SECURITY] IO instance NOT FOUND in app");
        }

        res.json({ success: true, settings, message: "Security settings updated and broadcasted." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createSecurityLog = async (req, res) => {
    try {
        const io = req.app.get("io");
        const log = await recordSecurityLog(io, req.body || {});
        if (log?.skipped) {
            return res.status(200).json({ success: true, skipped: true });
        }
        res.status(201).json({ success: true, log });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSecurityLogs = async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 250, 1), 500);
        const query = {};

        if (req.query.category && req.query.category !== "ALL") {
            query.category = String(req.query.category).toUpperCase().trim();
        }
        if (req.query.teamName) {
            query.teamName = { $regex: String(req.query.teamName).trim(), $options: "i" };
        }

        const [logs, categoryCounts] = await Promise.all([
            SecurityLog.find(query).sort({ timestamp: -1 }).limit(limit).lean(),
            SecurityLog.aggregate([
                { $group: { _id: "$category", count: { $sum: 1 } } }
            ])
        ]);

        const stats = categoryCounts.reduce((acc, row) => {
            acc[row._id] = row.count;
            return acc;
        }, {});

        res.json({ success: true, logs, stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.clearSecurityLogs = async (req, res) => {
    try {
        const io = req.app.get("io");
        await clearAllSecurityLogs(io);
        res.json({ success: true, message: "Security logs cleared." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
