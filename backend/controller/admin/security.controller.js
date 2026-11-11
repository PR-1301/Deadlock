const SecuritySetting = require("../../model/securitySetting.model");

exports.getSecuritySettings = async (req, res) => {
    try {
        let settings = await SecuritySetting.findOne({ key: "global_security" });
        if (!settings) {
            settings = await SecuritySetting.create({ key: "global_security" });
        }
        res.json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateSecuritySettings = async (req, res) => {
    try {
        const { disableCopyPaste, disableTextSelection, allowDevTools, forceFullscreen } = req.body;

        let settings = await SecuritySetting.findOneAndUpdate(
            { key: "global_security" },
            {
                disableCopyPaste: Boolean(disableCopyPaste),
                disableTextSelection: Boolean(disableTextSelection),
                allowDevTools: Boolean(allowDevTools),
                forceFullscreen: Boolean(forceFullscreen)
            },
            { new: true, upsert: true }
        );

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
