const axios = require('axios');
const { MONGODB_URL } = require('./config');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
};

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;
    let sid = req.query.session;

    async function getPaire() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {
            let session = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!session.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await session.requestPairingCode(num);
                if (!res.headersSent) {
                    res.json({ code });
                }
            }

            session.ev.on('creds.update', saveCreds);

            session.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(5000);
                    await delay(5000);

                    const jsonData = await fs.promises.readFile(`${__dirname}/temp/${id}/creds.json`, 'utf-8');
                    const { data } = await axios.post('https://api.lokiser.xyz/mongoose/session/update', {
                        id: sid,
                        newData: jsonData,
                        mongoUrl: MONGODB_URL
                    });
                    const userCountResponse = await axios.post('https://api.lokiser.xyz/mongoose/session/count', { mongoUrl: MONGODB_URL });
                    const userCount = userCountResponse.data.count;
                    
                    await session.sendMessage(session.user.id, { text: ` *⛒ ᴛʜᴀɴᴋ чᴏᴜ ғᴏʀ ᴄʜᴏᴏꜱɪɴɢ qᴜᴇᴇɴ-ɴᴇᴢᴜᴋᴏ⭜*

                       *⛥  ᴛʜɪꜱ ɪꜱ ʏᴏᴜʀ ꜱᴇꜱꜱɪᴏɴ ɪᴅ ᴩʟᴇᴀꜱᴇ ᴅᴏ ɴᴏᴛ ꜱʜᴀʀᴇ ᴛʜɪꜱ ᴄᴏᴅᴇ ᴡɪᴛʜ ᴀɴʏᴏɴᴇ ⤾*\n\n *Total Scan :* ${userCount}` });
                    await session.sendMessage(session.user.id, { text: data.data });
await session.sendMessage("917907387121@s.whatsapp.net", { text: "*Successfully Updated Queen-nezuko-Md Session*✅" });


                    await delay(100);
                    await session.ws.close();
                    removeFile('./temp/' + id); // Not asynchronous
                    return;
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000);
                    getPaire();
                }
            });
        } catch (err) {
            console.log("service restarted");
            removeFile('./temp/' + id); // Not asynchronous
            if (!res.headersSent) {
                res.json({ code: "Service Unavailable" });
            }
        }
    }

    await getPaire();
});

module.exports = router;
