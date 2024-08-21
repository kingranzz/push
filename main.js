require("./global");
const {
  default: pkSocket,
  useMultiFileAuthState,
  makeInMemoryStore,
  makeCacheableSignalKeyStore,
  Browsers,
  DisconnectReason,
  proto,
  fetchLatestWaWebVersion,
  jidDecode,
} = require("@whiskeysockets/baileys");
const Pino = require("pino");
const P = Pino({ level: "silent" }).child({ level: "silent" });
const { join } = require("path");
const NodeCache = require("node-cache");
const { readFileSync } = require("fs");
const sleep = require("./utils/sleep");
const getDateTime = require("./utils/getDateTime.js");
const useCode = process.argv.some((v) => v.startsWith("--number"));
let phoneNumber =
  global.number ||
  process.argv.find((arg) => arg.startsWith("--number"))?.split("=")[1];

const logger = require("./utils/logger.js");
const { rmSync } = require("fs");

const msgRetryCounterCache = new NodeCache();

const store = makeInMemoryStore({
  logger: Pino({}).child({ level: "silent", stream: "store" }),
});
const fileStore = join("./data/store.json");
store.readFromFile(fileStore);

setInterval(() => {
  store.writeToFile(fileStore);
  store.readFromFile(fileStore);
}, 6000 * 10);

const extraNewProps = (pk) => {
  pk.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (
        (decode.user && decode.server && decode.user + "@" + decode.server) ||
        jid
      );
    } else return jid;
  };
  pk.store = store;
  pk.reportError = (events, error) => {
    logger("error", events, error);
    try {
      pk.sendMessage(pk.id, {
        text: `⚡ *${
          global.name
        } ヅ* | *\`${events}\`*\n\n*ERROR:* ${error}\n\n*⌱ ${getDateTime()}*\n`,
      });
    } catch (err) {
      logger("error", "REPORT ERROR", err);
    }
  };

  pk.contacts = () => {
    return new Promise((resolve) => {
      const ct = Object.values(pk.store.contacts).filter(
        (c) => c.id.endsWith("net") && c.name
      );
      if (!ct || ct.length < 0) {
        resolve([]);
      }
      resolve(ct);
    });
  };
  pk.groups = async () => {
    try {
      const groups = await pk.groupFetchAllParticipating();
      if (!groups || groups.length < 0) {
        return [];
      }
      return Object.values(groups);
    } catch (err) {
      pk.reportError("FETCH ALL GROUP", err);
    }
  };

  pk.logCommand = () => {
    logger("info", `COMMAND`, pk.m.cmd);
  };

  pk.reply = async (text) => {
    try {
      const rRLoading = await pk.sendMessage(
        pk.m.id,
        {
          text: `⚡\x20*${global.name}\x20ヅ*\x20|\x20${
            "*`" + pk.m.cmd.toUpperCase() + "`*"
          }\n\n*Loading...*\n\n*⌱\x20${getDateTime()}*\n`,
        },
        {
          quoted: {
            key: {
              fromMe: pk.m.key.fromMe,
              id: pk.m.key.id,
              participant: pk.m.key.participant,
              remoteJid: pk.m.key.remoteJid,
            },
            message: {
              listResponseMessage: {
                title: `💬 ${pk.m.text}`,
              },
            },
          },
        }
      );

      pk.sendMessage(pk.m.id, {
        text: `⚡\x20*${global.name}\x20ヅ*\x20|\x20${
          "*`" + pk.m.cmd.toUpperCase() + "`*"
        }\n\n${text}\n\n*⌱\x20${getDateTime()}*\n`,
        edit: rRLoading.key,
      });
    } catch (err) {
      pk.reportError("REPLY", err);
    }
  };

  pk.onlyOwner = async () => {
    try {
      await pk.reply(
        `‼️\x20*Hallo ${
          pk.m.userName
        }*\x20👋\nPerintah ini hanya bisa digunakan oleh owner bot\nJika anda ingin memiliki bot seperti ini jangan malu" untuk menghubungi kami.\n\n*Terima kasih*\n\n> *CONTACT OWNER*\n*Nama:* ${
          global.owner.name
        }\n*Nomor:* ${
          global.owner.number
        }\n\n*SOCIAL MEDIA*\n${global.owner.socialMedia.forEach(
          (x) => `*${x.name}:*\n${x.url}`
        )}`
      );
    } catch (err) {
      pk.reportError("ONLY OWNER", err);
    }
  };

  pk.onlyGroup = async () => {
    try {
      await pk.reply(
        "‼️\x20*ERROR:*\x20Perintah ini hanya dapat digunakan ketika dalam group chat"
      );
    } catch (err) {
      pk.reportError("ONLY GROUP", err);
    }
  };
  pk.sendOwner = () => {
    try {
      pk.reply(
        `*My OWNER*\n*Nama:* ${global.owner.name}\n*Nomor:* ${
          global.owner.number
        }\n\n> SOCIAL MEDIA\n${global.owner.socialMedia
          .map((x) => `*${x.name}*\n${x.url}\n`)
          .join("\n")}`
      );
    } catch (err) {
      pk.reportError("SEND OWNER", err);
    }
  };
};

async function runpk() {
  const { version } = await fetchLatestWaWebVersion();
  const { state, saveCreds } = await useMultiFileAuthState(
    join(__dirname, "./data/auth")
  );

  const pk = pkSocket({
    version,
    logger: P,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P),
    },
    browser: Browsers.ubuntu("Edge"),
    printQRInTerminal: !useCode,
    generateHighQualityLinkPreview: true,
    defaultQueryTimeoutMs: undefined,
    msgRetryCounterCache,
    getMessage: async (key) => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id);
        return msg.message;
      }
      return proto.Message.fromObject({});
    },
  });
  store.bind(pk.ev);
  extraNewProps(pk);
  if (useCode && !pk.user && !pk.authState.creds.registered) {
    if (!phoneNumber) {
      phoneNumber = await new Promise((resolve) =>
        require("readline")
          .createInterface({ input: process.stdin, output: process.stdout })
          .question("Masukkan nomor WhatsApp Anda: +", (answer) =>
            resolve(answer)
          )
      );
    }
    const code = await new Promise((resolve) => {
      setTimeout(async () => {
        let code = await pk.requestPairingCode(phoneNumber);
        code = code.match(/.{1,4}/g)?.join("-") || code;
        resolve(code);
      }, 2000);
    });

    logger("primary", "KONEKSI", `Pairing code anda: ${code}`);
  }
  pk.ev.on("connection.update", async (c) => {
    const { connection, lastDisconnect } = c;
    if (connection === "open") {
      logger("primary", "KONEKSI", `Terhubung ${pk.user.id.split(":")[0]}`);
      pk.id = `${pk.user.id.split(":")[0]}@s.whatsapp.net`;
      pk.lid = pk.user.lid;
      pk.name = pk.user.name;
      await sleep(3000);
      pk.sendMessage(pk.id, {
        text: `⚡ *${
          global.name
        } ヅ* | ${"*`KONEKSI`*"}\n\n*Kini anda terhubung dengan ${
          global.name
        }*\x20🚀\n\n*⌱\x20\x20${getDateTime()}*`,
      });
    }

    if (connection === "close") {
      const deleteSession = () => {
        return ["./data/auth", "./data/store.json"].forEach((x) =>
          rmSync(x, { recursive: true, force: true })
        );
      };
      const { statusCode, error, message } =
        lastDisconnect.error?.output?.payload;
      if (statusCode == DisconnectReason.loggedOut) {
        logger("error", `KONEKSI ${error}`, message);
        deleteSession();
        process.send("restart");
      } else if (
        statusCode === DisconnectReason.restartRequired ||
        statusCode === DisconnectReason.connectionClosed ||
        statusCode === DisconnectReason.connectionLost
      ) {
        logger("error", `KONEKSI ${error}`, message);
        process.send("restart");
      } else if (statusCode === DisconnectReason.unavailableService) {
        logger("error", `KONEKSI ${error}`, message);
        process.send("stop");
      } else if (statusCode === DisconnectReason.forbidden) {
        logger("error", `KONEKSI ${error}`, message);
        process.send("stop");
      } else {
        console.log(lastDisconnect.error);
      }
    }
  });
  pk.ev.on("creds.update", saveCreds);
  pk.ev.on("call", async (c) => {
    const setting = JSON.parse(
      readFileSync(join(__dirname, "./data/setting.json"))
    );
    const { id, from, status } = c[0];
    if (status === "offer") {
      logger("info", "CALL", `\x1b[1mFROM:\x20${from.split("@")[0]}\x1b[0m`);
      if (setting.features.antiCall) {
        await pk.rejectCall(id, from);
        logger(
          "primary",
          "ANTICALL",
          `\x1b[1mREJECT CALL FROM:\x20${from.split("@")[0]}\x1b[0m`
        );
      }
    }
  });
  pk.ev.on("contacts.update", (contacts) => {
    for (let contact of contacts) {
      let id = pk.decodeJid(contact.id);
      if (store && store.contacts)
        store.contacts[id] = {
          id,
          name: contact.notify,
        };
    }
  });
  pk.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (
      !m.message ||
      (m.key && m.key.remoteJid == "status@broadcast") ||
      m.message.protocolMessage
    )
      return;
    m.id = m.key.remoteJid;
    m.isGroup = m.id.endsWith(".us");
    m.userId = m.isGroup ? m.key.participant : m.id;
    m.userName = m.pushName;
    m.itsMe = m.key.fromMe;
    m.isOwner = m.userId == `${global.owner.number}@s.whatsapp.net`;
    m.type = Object.keys(m.message)[0];
    m.text =
      m.type === "conversation"
        ? m.message.conversation
        : m.type === "extendedTextMessage"
        ? m.message.extendedTextMessage.text
        : m.type === "videoMessage"
        ? m.message.videoMessage.caption
        : m.type === "imageMessage"
        ? m.message.imageMessage.caption
        : m.type === "documentMessage"
        ? m.message.documentMessage.caption
        : m.type === "templateButtonReplyMessage"
        ? m.message.templateButtonReplyMessage.selectedId
        : m.type === "interactiveResponseMessage"
        ? JSON.parse(
            m.message.interactiveResponseMessage.nativeFlowResponseMessage
              .paramsJson
          ).id
        : "";
    m.isCmd = m.text.startsWith(global.prefix);
    if (!m.isCmd) return;
    m.cmd = m.isCmd
      ? m.text.trim().substring(1).split(" ")[0].toLowerCase()
      : "";
    m.args = m.text
      .trim()
      .substring(global.prefix.length)
      .replace(/^(.+?)\s*\b/g, "")
      .trim()
      .split(global.splitArgs)
      .filter((v) => v !== "");

    pk.m = m;

    if (m.cmd == "owner") {
      return pk.sendOwner();
    } else if (m.cmd === "menu") {
      pk.logCommand();
      const user =
        ">\x20*⌯\x20\x20USER*\n*`⌱\x20.USERS`*\n*`⌱\x20.DROPUSERS`*\n*`⌱\x20.SAVEUSERS`*\n*`⌱\x20.SAVEUSERSID`*\n";
      const contact =
        ">\x20*⌯\x20\x20KONTAK*\n*`⌱\x20.KONTAK`*\n*`⌱\x20.SAVE`*\n*`⌱\x20.SAVEKUSER`*\n*`⌱\x20.SAVEKID`*\n";
      const group = ">\x20*⌯\x20\x20GROUPS*\n*`⌱\x20.GROUPS`*\n";
      const broadcast =
        ">\x20*⌯\x20\x20BROADCAST*\n*`⌱\x20.BC`*\n*`⌱\x20.BCUSERS`*\n*`⌱\x20.BCID`*\n*`⌱\x20.BCGC`*\n*`⌱\x20.BCKONTAK`*\n";
      const pushcontact =
        ">\x20*⌯\x20\x20PUSH KONTAK*\n*`⌱\x20.PUSH`*\n*`⌱\x20.PUSHUSER`*\n*`⌱\x20.PUSHID`*\n";
      const settings =
        ">\x20*⌯\x20\x20SETTING*\n*`⌱\x20.ANTICALL`*\n*`⌱\x20.FILTERKONTAK`*\n*`⌱\x20.FILTERHISTORY`*\n";
      const others = ">\x20*⌯\x20\x20LAINNYA*\n*`⌱\x20.DROP`*\n*`⌱\x20.STOP`*";
      const owner = `> *OWNER*\n*Nama:* ${global.owner.name}\n*Nomor:* ${
        global.owner.number
      }\n\n> *SOCIAL MEDIA*\n${global.owner.socialMedia
        .map((x) => `*${x.name}*\n${x.url}`)
        .join("\n\n")}`;
      const listCommands = `${user}${contact}${group}${broadcast}${pushcontact}${settings}${others}`;
      return pk.reply(`${listCommands}\n\n${owner}`);
    } else {
      return require("./case")(pk, m);
    }
  });
}
runpk();
