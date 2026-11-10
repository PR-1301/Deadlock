const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const TeamModel = require("../model/team.model");

const TARGET_DB_NAME = "Deadlock";

function parseArgs(argv) {
    const flags = {
        dryRun: false,
        includePending: false,
        skipExisting: false,
        help: false,
    };

    for (const arg of argv) {
        if (arg === "--dry-run") flags.dryRun = true;
        else if (arg === "--include-pending") flags.includePending = true;
        else if (arg === "--skip-existing") flags.skipExisting = true;
        else if (arg === "--help" || arg === "-h") flags.help = true;
    }

    return flags;
}

function printHelp() {
    console.log(`
Sync Teams & Members from Registration Atlas DB -> Deadlock DB (Non-Destructive)

Usage:
  node scripts/syncTeams.js [options]
  npm run sync-teams [-- options]

Options:
  --dry-run           Analyze and preview changes without writing to Deadlock DB
  --include-pending   Include non-confirmed (pending) registrations too (default: confirmed only)
  --skip-existing     Only insert brand-new teams; do not update members on existing teams
  -h, --help          Show this help message

Safety guarantees:
  - Source Atlas DB is accessed strictly read-only.
  - No teams, matches, submissions, or existing data are ever deleted from Deadlock DB.
  - Existing teams keep their currentRound, deadlockResult, questions, and match state.
`);
}

async function detectSourceDatabase(sourceConn) {
    if (process.env.SOURCE_DB_NAME) {
        return sourceConn.useDb(process.env.SOURCE_DB_NAME).db;
    }

    const admin = sourceConn.db.admin();
    const { databases } = await admin.listDatabases();

    for (const dbInfo of databases) {
        if (["admin", "local", "config"].includes(dbInfo.name)) continue;
        const db = sourceConn.useDb(dbInfo.name).db;
        const collections = await db.listCollections().toArray();
        const names = new Set(collections.map((c) => c.name));
        if (names.has("registrations") && names.has("participants")) {
            return db;
        }
    }

    throw new Error(
        "Could not locate a database containing 'registrations' and 'participants' collections on the source cluster."
    );
}

function buildParticipantIndexes(participants) {
    const byId = new Map();
    const byRegistrationId = new Map();

    for (const p of participants) {
        const idStr = String(p._id);
        byId.set(idStr, p);

        if (p.registration) {
            const regStr = String(p.registration);
            if (!byRegistrationId.has(regStr)) {
                byRegistrationId.set(regStr, []);
            }
            byRegistrationId.get(regStr).push(p);
        }
    }

    return { byId, byRegistrationId };
}

function resolveMemberNames(reg, participantIndexes) {
    const { byId, byRegistrationId } = participantIndexes;
    const seenIds = new Set();
    const orderedDocs = [];

    const addParticipant = (p) => {
        if (!p) return;
        const idStr = String(p._id);
        if (seenIds.has(idStr)) return;
        seenIds.add(idStr);
        orderedDocs.push(p);
    };

    // 1. Leader first (if explicitly referenced)
    if (reg.leader) {
        addParticipant(byId.get(String(reg.leader)));
    }

    // 2. Members referenced in registration.members array
    if (Array.isArray(reg.members)) {
        for (const memberId of reg.members) {
            addParticipant(byId.get(String(memberId)));
        }
    }

    // 3. Any additional participants linked via participant.registration === reg._id
    const linked = byRegistrationId.get(String(reg._id)) || [];
    // Ensure role === 'leader' comes before 'member' if leader wasn't already added
    linked.sort((a, b) => {
        if (a.role === "leader" && b.role !== "leader") return -1;
        if (a.role !== "leader" && b.role === "leader") return 1;
        return 0;
    });
    for (const p of linked) {
        addParticipant(p);
    }

    const names = orderedDocs
        .map((p) => (p.name || p.email || p.rollNo || "").toString().trim())
        .filter(Boolean);

    return names;
}

function arraysEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
        return false;
    }
    return a.every((val, idx) => val === b[idx]);
}

async function main() {
    const flags = parseArgs(process.argv.slice(2));
    if (flags.help) {
        printHelp();
        process.exit(0);
    }

    const sourceUri = process.env.SOURCE_MONGO_URI;
    const targetUri = process.env.MONGO_URI;

    if (!sourceUri) {
        console.error(
            "ERROR: SOURCE_MONGO_URI is missing. Make sure backend/.env defines SOURCE_MONGO_URI for the registration database."
        );
        process.exit(1);
    }

    if (!targetUri) {
        console.error(
            "ERROR: MONGO_URI is missing. Make sure backend/.env defines MONGO_URI for the Deadlock database."
        );
        process.exit(1);
    }

    console.log("============================================================");
    console.log("  Deadlock Team & Member Sync");
    console.log(`  Mode: ${flags.dryRun ? "DRY RUN (no DB writes)" : "LIVE SYNC (non-destructive)"}`);
    console.log(
        `  Filter: ${flags.includePending ? "ALL registration statuses" : "CONFIRMED registrations only"}`
    );
    console.log("============================================================");

    let sourceConn;
    let targetConn;

    try {
        sourceConn = await mongoose.createConnection(sourceUri).asPromise();
        const sourceDb = await detectSourceDatabase(sourceConn);
        console.log(`[SOURCE] Connected to database: "${sourceDb.databaseName}" (read-only)`);

        // Step 1: Fetch all participants (members) first
        const participants = await sourceDb
            .collection("participants")
            .find({})
            .toArray();
        console.log(`[SOURCE] Fetched ${participants.length} participant records.`);
        const participantIndexes = buildParticipantIndexes(participants);

        // Step 2: Fetch team registrations
        const regQuery = flags.includePending ? {} : { status: "confirmed" };
        const registrations = await sourceDb
            .collection("registrations")
            .find(regQuery)
            .sort({ createdAt: 1 })
            .toArray();
        console.log(
            `[SOURCE] Fetched ${registrations.length} team registration(s) matching query.`
        );

        // Deduplicate registrations by case-insensitive teamName (preferring latest confirmed)
        const resolvedTeamsMap = new Map();
        for (const reg of registrations) {
            const rawName = (reg.teamName || reg.name || "").toString().trim();
            if (!rawName) {
                console.warn(`[WARN] Skipping registration ${reg._id} with empty teamName.`);
                continue;
            }

            let members = resolveMemberNames(reg, participantIndexes);
            if (members.length === 0) {
                console.warn(
                    `[WARN] Team "${rawName}" (${reg._id}) has 0 resolved members.`
                );
            }
            if (members.length > 3) {
                console.warn(
                    `[WARN] Team "${rawName}" has ${members.length} members; truncating to 3 to match Team schema.`
                );
                members = members.slice(0, 3);
            }

            const key = rawName.toLowerCase();
            if (resolvedTeamsMap.has(key)) {
                console.warn(
                    `[WARN] Duplicate team name "${rawName}" in source query; keeping latest entry.`
                );
            }
            resolvedTeamsMap.set(key, {
                name: rawName,
                members,
                status: reg.status,
                regCode: reg.regCode || null,
            });
        }

        // Step 3: Connect to Target Deadlock DB and merge safely without erasing anything
        targetConn = await mongoose
            .createConnection(targetUri, { dbName: TARGET_DB_NAME })
            .asPromise();
        console.log(`[TARGET] Connected to database: "${targetConn.name}"`);

        const TargetTeam = targetConn.model("Team", TeamModel.schema);
        const existingTeams = await TargetTeam.find({});
        console.log(
            `[TARGET] Found ${existingTeams.length} existing team(s) in Deadlock DB (all preserved).`
        );

        const existingByName = new Map();
        for (const t of existingTeams) {
            existingByName.set(t.name.trim().toLowerCase(), t);
        }

        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (const [key, srcTeam] of resolvedTeamsMap.entries()) {
            const existing = existingByName.get(key);

            if (!existing) {
                console.log(
                    `[INSERT] ${srcTeam.name} -> members: [${srcTeam.members.join(", ")}]${
                        srcTeam.regCode ? ` (${srcTeam.regCode})` : ""
                    }`
                );
                if (!flags.dryRun) {
                    await TargetTeam.create({
                        name: srcTeam.name,
                        members: srcTeam.members,
                        isActive: true,
                        currentRound: "pending",
                        deadlockResult: "pending",
                        currentQuestionIndex: 0,
                        questions: [],
                    });
                }
                insertedCount++;
            } else if (flags.skipExisting || arraysEqual(existing.members, srcTeam.members)) {
                console.log(
                    `[SKIP]   ${existing.name} -> already exists (${
                        arraysEqual(existing.members, srcTeam.members)
                            ? "members unchanged"
                            : "--skip-existing"
                    })`
                );
                skippedCount++;
            } else {
                console.log(
                    `[UPDATE] ${existing.name} -> members: [${existing.members.join(
                        ", "
                    )}] => [${srcTeam.members.join(", ")}] (round/game state preserved)`
                );
                if (!flags.dryRun) {
                    await TargetTeam.updateOne(
                        { _id: existing._id },
                        { $set: { members: srcTeam.members } }
                    );
                }
                updatedCount++;
            }
        }

        const finalCount = flags.dryRun
            ? existingTeams.length + insertedCount
            : await TargetTeam.countDocuments();

        console.log("\n============================================================");
        console.log("  Sync Summary");
        console.log("------------------------------------------------------------");
        console.log(`  Source teams processed : ${resolvedTeamsMap.size}`);
        console.log(`  Newly inserted         : ${insertedCount}`);
        console.log(`  Members updated        : ${updatedCount}`);
        console.log(`  Skipped (unchanged)    : ${skippedCount}`);
        console.log(`  Total teams in Deadlock: ${finalCount}`);
        console.log("  Deleted / erased       : 0 (guaranteed)");
        console.log("============================================================");
    } finally {
        if (sourceConn) await sourceConn.close();
        if (targetConn) await targetConn.close();
    }
}

main().catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
});
