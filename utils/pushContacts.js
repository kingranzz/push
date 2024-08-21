const logger = require("./logger");
const readUsers = require("./readUsers");
const getDateTime = require("./getDateTime");
const { readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

module.exports = async (
  pk,
  msg,
  participants,
  myContacts,
  text,
  jeda,
  msgType,
  media
) => {
  let target;
  const setting = JSON.parse(
    readFileSync(join(__dirname, "../data/setting.json"))
  );
  const histories = JSON.parse(
    readFileSync(join(__dirname, "../data/histories.json"))
  );
  let { data } = await readUsers();

  if (setting.features.filterContacts && setting.features.filterHistory) {
    target = participants.filter(
      (participant) =>
        !myContacts.some((contact) => contact.id === participant) &&
        !histories.some((history) => history === participant)
    );
  } else if (
    setting.features.filterContacts &&
    !setting.features.filterHistory
  ) {
    target = participants.filter(
      (participant) => !myContacts.some((contact) => contact.id === participant)
    );
  } else if (
    !setting.features.filterContacts &&
    setting.features.filterHistory
  ) {
    target = participants.filter(
      (participant) => !histories.some((history) => history === participant)
    );
  } else {
    target = participants;
  }

  target = target.filter((v) => v !== `${pk.number}@s.whatsapp.net`);
  const id = msg.key.remoteJid;
  const hText = `⚡\x20*${global.name}\x20ヅ*\x20|\x20*PUSH KONTAK*\n\n`;
  const fText = `\n*⌱\x20${getDateTime()}*\n`;
  const fcStatus = `${setting.features.filterContacts ? "ACTIVE" : "INACTIVE"}`;
  const fhStatus = `${setting.features.filterHistory ? "ACTIVE" : "INACTIVE"}`;
  const textPc = text;
  const jedaPc = parseInt(jeda);
  const resStart = await pk.sendMessage(
    id,
    {
      text: `${hText}*PUSH KONTAK START*\x20🚀\n*Filter Kontak: _${fcStatus}_*\n*Filter History: _${fhStatus}_*\n*Participants:*\x20${
        participants.length
      }\n*Target:*\x20${target.length}\n*Jeda:*\x20${
        jedaPc / 1000
      }s\n*Elapsed:*\x20${
        (jedaPc * target.length) / 1000
      }s\n*Pesan:*\x20-\n*Text:*\x20${textPc}\n${fText}`,
    },
    { quoted: msg }
  );
  if (target.length <= 0) {
    setTimeout(() => {
      pk.sendMessage(
        id,
        {
          text: `${hText}*PUSH KONTAK GAGAL*\x20‼️\n*Filter Kontak: _${fcStatus}_*\n*Filter History: _${fhStatus}_*\n*Participants:*\x20${
            participants.length
          }\n*Target:*\x20${target.length}\n*Jeda:*\x20${
            jedaPc / 1000
          }s\n*Elapsed:*\x20${
            (jedaPc * target.length) / 1000
          }s\n*Pesan:*\x20Target ${
            target.length
          }\n*Text:*\x20${textPc}\n${fText}`,
          edit: resStart.key,
        },
        { quoted: msg }
      );
    }, 3000);
    return;
  }
  let index = 0;
  const loop = setInterval(async () => {
    if (index >= target.length) {
      logger(
        "success",
        "PUSH KONTAK",
        `Push kontak sukses, ${index} pesan telah berhasil dikirim.`
      );
      await pk.sendMessage(msg.key.remoteJid, {
        text: `${hText}*PUSH KONTAK SUKSES*\x20✅\n*Filter Kontak: _${fcStatus}_*\n*Filter History: _${fhStatus}_*\n*Participants:*\x20${
          participants.length
        }\n*Target:*\x20${target.length}\n*Jeda:*\x20${
          jedaPc / 1000
        }s\n*Elapsed:*\x20${
          (jedaPc * target.length) / 1000
        }s\n*Pesan:*\x20Pesan telah berhasil dikirim ke ${index} pengguna dalam ${
          (jedaPc * target.length) / 1000
        } detik.\n*Text:*\x20${textPc}\n${fText}`,
        edit: resStart.key,
      });
      return clearInterval(loop);
    } else {
      try {
        if (msgType === "imageMessage") {
          await pk.sendMessage(target[index], {
            image: { url: media },
            caption: textPc,
          });
        } else {
          await pk.sendMessage(target[index], { text: textPc });
        }
        data = data.filter((user) => user != target[index]);
        histories.push(target[index]);
        writeFileSync(
          join(__dirname, "../data/users.json"),
          JSON.stringify(data)
        );
        writeFileSync(
          join(__dirname, "../data/histories.json"),
          JSON.stringify(histories)
        );
        logger(
          "success",
          `PUSH KONTAK ${index + 1}`,
          `\x1b[1mPesan telah berhasil dikirim ke ${
            target[index].split("@")[0]
          }\x1b[0m`
        );

        index++;
      } catch (err) {
        logger("error", "PUSH KONTAK", err);
        logger(
          "error",
          `PUSH KONTAK ${index + 1}`,
          `\x1b[1mPesan gagal dikirim ke ${target[index].split("@")[0]}\x1b[0m`
        );
        if (err === "Connection Closed") {
          process.exit();
        }
      }
    }
  }, jedaPc);
};
