const path = require('path');
require("dotenv").config({ path: path.resolve(__dirname, '.env') });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

//--------------------------------Import Routes--------------------------------
const crackCodeRoutes = require("./routes/admin/crackCode.route");
const publicCrackCodeRoutes = require("./routes/public/crackCode.route");

const deadlockAdminRoutes = require("./routes/admin/admin.route");
const adminAuthRoutes = require("./routes/admin/auth.route");
const { requireAdmin, verifyTokenWithDetails, isConfigured: adminAuthConfigured } = require("./utils/adminAuth");
const { recordSecurityLog } = require("./controller/admin/security.controller");
const deadlockRoute = require("./routes/public/deadlock.routes");


const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Attach io to app to use in controllers
app.set("io", io);

io.on("connection", (socket) => {
  console.log(">>> [SOCKET] User connected:", socket.id);

  // Admin room receives security logs: require a valid admin token to join
  // and evict automatically when the token expires.
  let adminExpiryTimer = null;
  const clearAdminExpiryTimer = () => {
    if (adminExpiryTimer) {
      clearTimeout(adminExpiryTimer);
      adminExpiryTimer = null;
    }
  };

  socket.on("join-admin", (token) => {
    clearAdminExpiryTimer();
    const details = verifyTokenWithDetails(token);
    if (!details.valid) {
      socket.leave("admin-room");
      console.log(">>> [SOCKET] Rejected admin join (invalid token):", socket.id);
      socket.emit("admin-auth-error", { message: "ADMIN AUTHENTICATION REQUIRED" });
      return;
    }
    socket.join("admin-room");
    console.log(">>> [SOCKET] Admin joined room:", socket.id);

    const remainingMs = Math.max(0, details.exp - Date.now());
    adminExpiryTimer = setTimeout(() => {
      socket.leave("admin-room");
      socket.emit("admin-auth-error", { message: "ADMIN SESSION EXPIRED" });
      console.log(">>> [SOCKET] Evicted expired admin socket:", socket.id);
    }, remainingMs);
  });

  socket.on("join-team", (teamName) => {
    // Standardize to use team identifiers consistent throughout
    socket.join(`team-${teamName}`);
    console.log(`>>> [SOCKET] Team [${teamName}] joined room:`, socket.id);
  });

  const handleSecurityReport = async (payload, ack) => {
    try {
      const saved = await recordSecurityLog(io, payload);
      if (saved?.skipped) {
        if (typeof ack === "function") ack({ ok: true, skipped: true });
        return;
      }
      console.log(`>>> [SECURITY] [${saved.category}] [${saved.teamName}] ${saved.message}`);
      if (typeof ack === "function") ack({ ok: true, id: saved._id });
    } catch (err) {
      console.error(">>> [SECURITY] Error logging event:", err.message);
      if (typeof ack === "function") ack({ ok: false });
    }
  };

  socket.on("report-security-violation", (data, ack) => {
    handleSecurityReport(data, ack);
  });

  socket.on("report-illegal-action", (data, ack) => {
    handleSecurityReport({ ...(data || {}), type: (data && data.type) || "ALERT" }, ack);
  });

  socket.on("report-tab-switch", (data, ack) => {
    handleSecurityReport({
      ...(data || {}),
      type: "TAB_SWITCH",
      category: (data && data.category) || "TAB_SWITCH",
      blocked: false
    }, ack);
  });

  socket.on("disconnect", () => {
    clearAdminExpiryTimer();
    console.log(">>> [SOCKET] User disconnected:", socket.id);
  });
});


app.use(cors({
  origin: "*",
}));

// Behind Render's proxy: use the client IP from X-Forwarded-For (login rate limiting)
app.set("trust proxy", 1);

app.use(express.json());

if (!adminAuthConfigured()) {
  console.warn(">>> [AUTH] ADMIN_PASSCODE is not set: admin login and admin APIs are disabled.");
}

app.get("/", (req, res) => {
  res.send("Deadlock backend running with Socket.io");
});

// --------------------------------Routes--------------------------------
app.use("/api/public/deadlock", deadlockRoute);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/deadlock", deadlockAdminRoutes); // public player routes + requireAdmin inside
app.use("/api/admin/crack-code", requireAdmin, crackCodeRoutes);
app.use("/api/public/crack-code", publicCrackCodeRoutes);
// app.use("/api/public/deadlock", publicDeadlockRoutes);
app.use("/api/public/glitch", require("./routes/public/glitch.routes"));

//-------------------------------Dev Route -------------------------------------
if (process.env.NODE_ENV !== "production") {
  app.use("/api/dev", require("./routes/dev/devSeed.routes"));
}

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

app.get("/health", (req, res) => {
  res.status(200).send("Server is running");
});

mongoose
  .connect(MONGO_URI, { dbName: 'Deadlock' })
  .then(() => {
    console.log("MongoDB connected");
    console.log("Connected to Database:", mongoose.connection.name);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed");
    console.error(err.message);
    process.exit(1);
  });

