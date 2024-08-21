const getDateTime = require("./getDateTime");
const { join } = require("path");
const { readFileSync } = require("fs");

module.exports = async (pk, msg, participants, myContacts, name) => {
  const fileName = `Kontak_${name}.vcf`;
  const setting = JSON.parse(
    readFileSync(join(__dirname, "../data/setting.json"))
  );
  let newDataContacts;
  if (setting.features.filterContacts) {
    newDataContacts = participants.filter(
      (participant) => !myContacts.some((contact) => contact.id === participant)
    );
  } else {
    newDataContacts = participants;
  }
  const id = msg.key.remoteJid;
  const hText = `⚡\x20*${global.name}\x20ヅ*\x20|\x20*SAVE KONTAK*\n\n`;
  const fText = `\n*⌱\x20${getDateTime()}*`;
  const fcStatus = `${setting.features.filterContacts ? "ACTIVE" : "INACTIVE"}`;

  const resStart = await pk.sendMessage(
    id,
    {
      text: `${hText}*SAVE KONTAK START*\x20🚀\n*Filter Kontak Status:\x20_${fcStatus}_*\n*Prefix:*\x20${name}\n*Participants:*\x20${participants.length}\n*Target:*\x20${newDataContacts.length}\n*Pesan:*\x20-\n${fText}`,
    },
    { quoted: msg }
  );

  if (newDataContacts.length <= 0) {
    setTimeout(() => {
      pk.sendMessage(
        id,
        {
          text: `${hText}*SAVE KONTAK GAGAL*\x20‼️\n*Filter Kontak Status:\x20_${fcStatus}_*\n*Prefix:*\x20${name}\n*Participants:*\x20${participants.length}\n*Target:*\x20${newDataContacts.length}\n*Pesan:*\x20Semua nomor target sudah tersimpan dikontak\n${fText}`,
          edit: resStart.key,
        },
        { quoted: msg }
      );
    }, 3000);
    return;
  }
  try {
    const bufferVcard = newDataContacts
      .map((part, index) => {
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\x20-\x20${
          index + 1
        }\nORG:-\nTEL;type=CELL;type=VOICE;waid=${part.split("@")[0]}:+${
          part.split("@")[0]
        }\nEND:VCARD`;
      })
      .join("\n");
    setTimeout(async () => {
      await pk.sendMessage(id, { delete: resStart.key });
      return pk.sendMessage(
        id,
        {
          document: Buffer.from(bufferVcard),
          fileName: fileName,
          caption: `${hText}*SAVE KONTAK SUKSES*\x20✅\n*Filter Kontak Status:\x20_${fcStatus}_*\n*Prefix:*\x20${name}\n*Participants:*\x20${participants.length}\n*Target:*\x20${newDataContacts.length}\n*Pesan:*\x20Semua nomor target telah berhasil ditambahkan ke file _${fileName}_\n${fText}`,
          mimetype: "text/vcard",
        },
        { quoted: msg }
      );
    }, 3000);
  } catch (err) {
    pk.reply(err);
    pk.reportError("UTILS SAVE CONTACTS", err);
  }
};
