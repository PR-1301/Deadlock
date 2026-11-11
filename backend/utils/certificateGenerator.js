const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const mongoose = require("mongoose");
const Team = require("../model/team.model");

const CACHE_DIR = path.resolve(__dirname, "../cache/certificates");
const TEMPLATE_PATH = path.resolve(__dirname, "../../frontend/public/LOC-Certificate.png");
const PYTHON_SCRIPT = path.resolve(__dirname, "../scripts/generate_team_cert.py");

/**
 * Escape regex special characters in a string
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Fetch member names dynamically from the LOC (Source) Database
 * Returns array of member names, or falls back to team.members
 */
async function getMembersFromLOCDatabase(team) {
    const sourceUri = process.env.SOURCE_MONGO_URI;
    if (!sourceUri) {
        return team.members || [];
    }

    let sourceConn = null;
    try {
        sourceConn = await mongoose
            .createConnection(sourceUri, { serverSelectionTimeoutMS: 4000 })
            .asPromise();

        // LOC Database detection (default "test" or SOURCE_DB_NAME)
        const dbName = process.env.SOURCE_DB_NAME || "test";
        const sourceDb = sourceConn.useDb(dbName).db;

        const cleanName = (team.name || "").trim();
        const reg = await sourceDb.collection("registrations").findOne({
            $or: [
                { teamName: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, "i") } },
                { name: { $regex: new RegExp(`^${escapeRegex(cleanName)}$`, "i") } },
            ],
        });

        if (reg) {
            const participantIds = [];
            if (reg.leader) participantIds.push(reg.leader);
            if (Array.isArray(reg.members)) {
                for (const m of reg.members) participantIds.push(m);
            }

            const query = {
                $or: [
                    { _id: { $in: participantIds } },
                    { registration: reg._id },
                ],
            };

            const participants = await sourceDb
                .collection("participants")
                .find(query)
                .toArray();

            const byId = new Map(participants.map((p) => [String(p._id), p]));
            const byReg = participants.filter((p) => p.registration && String(p.registration) === String(reg._id));

            const ordered = [];
            const seen = new Set();
            const addP = (p) => {
                if (!p) return;
                const id = String(p._id);
                if (seen.has(id)) return;
                seen.add(id);
                ordered.push(p);
            };

            if (reg.leader) addP(byId.get(String(reg.leader)));
            if (Array.isArray(reg.members)) {
                for (const mid of reg.members) addP(byId.get(String(mid)));
            }
            byReg.sort((a, b) => (a.role === "leader" ? -1 : 1));
            for (const p of byReg) addP(p);

            const names = ordered
                .map((p) => (p.name || p.email || p.rollNo || "").toString().trim())
                .filter(Boolean);

            if (names.length > 0) {
                // If member names differ from Deadlock DB, update Deadlock DB non-destructively
                if (JSON.stringify(team.members) !== JSON.stringify(names)) {
                    await Team.updateOne({ _id: team._id }, { $set: { members: names } }).catch(() => {});
                }
                return names;
            }
        }
    } catch (err) {
        console.warn("[CERT] Could not connect/query LOC Database:", err.message);
    } finally {
        if (sourceConn) {
            try {
                await sourceConn.close();
            } catch (_) {}
        }
    }

    return team.members || [];
}

/**
 * Generates certificates for a given teamId and returns the path to the ZIP archive.
 */
async function generateTeamCertificates(teamId) {
    if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
        throw new Error("Invalid teamId provided");
    }

    const team = await Team.findById(teamId);
    if (!team) {
        throw new Error("Team not found in Deadlock database");
    }

    if (!fs.existsSync(TEMPLATE_PATH)) {
        throw new Error(`Certificate template not found at: ${TEMPLATE_PATH}`);
    }

    // 1. Fetch dynamic members from LOC database (with fallback to team.members)
    const members = await getMembersFromLOCDatabase(team);
    if (!members || members.length === 0) {
        throw new Error(`No member names found for team '${team.name}'`);
    }

    // 2. Ensure cache directory
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    const outputZip = path.join(CACHE_DIR, `${teamId}.zip`);

    // 3. Check if cached zip already exists and is recent
    if (fs.existsSync(outputZip)) {
        const stats = fs.statSync(outputZip);
        const teamUpdated = new Date(team.updatedAt || 0).getTime();
        // If file exists and is newer than last team update and non-empty, use cache
        if (stats.size > 1000 && stats.mtimeMs > teamUpdated) {
            return {
                filePath: outputZip,
                filename: `${team.name.replace(/\s+/g, "_")}_Certificates.zip`,
                teamName: team.name,
                members,
            };
        }
    }

    // 4. Run python script to render certificates and package zip
    await new Promise((resolve, reject) => {
        const args = [
            PYTHON_SCRIPT,
            "--team-name",
            team.name,
            "--members",
            JSON.stringify(members),
            "--template",
            TEMPLATE_PATH,
            "--output-zip",
            outputZip,
        ];

        execFile("python3", args, (err, stdout, stderr) => {
            if (err) {
                console.error("[CERT] Python renderer failed:", stderr || err.message);
                return reject(new Error("Failed to render team certificates"));
            }
            resolve(outputZip);
        });
    });

    return {
        filePath: outputZip,
        filename: `${team.name.replace(/\s+/g, "_")}_Certificates.zip`,
        teamName: team.name,
        members,
    };
}

module.exports = {
    generateTeamCertificates,
    getMembersFromLOCDatabase,
};

