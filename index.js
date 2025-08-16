// index.js

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require('@adiwajshing/baileys');
const pino = require('pino');
require('dotenv').config();

// Function to start the bot
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth');

  const socket = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
  });

  // Save authentication credentials when they update
  socket.ev.on('creds.update', saveCreds);

  // Connection events handler
  socket.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);

      // Reconnect if not logged out
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('Bot is connected!');
    }
  });

  // Message events handler
  socket.ev.on('messages.upsert', async ({ messages }) => {
    const message = messages[0];
    if (!message.key.fromMe && !message.key.remoteJid.includes('status@broadcast')) {
      const from = message.key.remoteJid;
      const text = message.message?.extendedTextMessage?.text || message.message?.conversation;

      if (text) {
        console.log(`Received message from ${from}: ${text}`);
        await socket.sendMessage(from, { text: `You sent: ${text}` });
      }
    }
  });
}

startBot();