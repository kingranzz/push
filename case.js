const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { writeFileSync, readFileSync } = require("fs");
const { writeFile } = require("fs/promises");
const { join } = require("path");
const pino = require("pino");
const logger = pino({ level: "silent" }).child({ level: "silent" });

module.exports = async (pk, m) => {
  const setting = JSON.parse(
    readFileSync(join(__dirname, "./data/setting.json"), "utf8")
  );
  let groupMetadata;
  let contacts;
  let idContact;
  let buffer;
  const outputImage = join(__dirname, "./data/img.jpg");
  switch (m.cmd) {
    case "users":
    case "user":
      pk.logCommand();
      if (!m.itsMe && !m.isOwner) {
        return pk.onlyOwner();
      }
      require("./utils/readUsers")()
        .then(async (res) => {
          if (!res.data || res.data.length === 0) {
            return pk.reply(
              `‼️\x20*Jumlah data pengguna saat ini ${res.data.length}*\nDapatkan data pengguna lebih banyak`
            );
          } else {
            return pk.reply(
              `🎉\x20*Jumlah data pengguna saat ini:\x20${res.data.length}*`
            );
          }
        })
        .catch(async (err) => {
          pk.reportError(m.cmd, err);
        });
      break;
    case "saveusers":
    case "saveuser":
      pk.logCommand();
      if (!m.itsMe && !m.isOwner) {
        return pk.onlyOwner();
      }
      if (!m.isGroup) {
        return pk.onlyGroup();
      }
      try {
        groupMetadata = await pk.groupMetadata(m.id);
        participants = groupMetadata.participants.map((part) => part.id);
        require("./utils/saveUsers")(participants)
          .then((res) =>
            pk.reply(
              `🎉\x20*Target ditemukan*\n*Nama Group:*\x20${
                groupMetadata.subject
              }\n*Owner Group:*\x20${
                groupMetadata.owner?.split("@")[0]
              }\n*Jumlah member:*\x20${groupMetadata.participants.length}\n\n*${
                res.data.newUsers.length
              } pengguna telah berhasil disimpan!*`
            )
          )
          .catch(async (err) => {
            pk.reportError("SAVE USERS", err);
          });
      } catch (err) {
        pk.reportError("SAVE USERS", err);
      }
      break;
    case "saveusersid":
    case "saveuserid":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }

      if (isNaN(parseInt(m.args[0]))) {
        return pk.reply(
          `‼️\x20*Perintah kurang lengkap atau tidak valid*\n*Contoh:*\x20.saveusersid\x202763622651837`
        );
      }
      try {
        if (m.args[0].endsWith("@g.us")) {
          groupMetadata = await pk.groupMetadata(m.args[0]);
        } else {
          groupMetadata = await pk.groupMetadata(`${m.args[0]}@g.us`);
        }
        participants = groupMetadata.participants.map((part) => part.id);
        return require("./utils/saveUsers")(participants)
          .then((res) => {
            return pk.reply(
              `🎉\x20*Target ditemukan*\n*Nama Group:*\x20${
                groupMetadata.subject
              }\n*Owner Group:*\x20${
                groupMetadata.owner?.split("@")[0]
              }\n*Jumlah member:*\x20${groupMetadata.participants.length}\n\n*${
                res.data.newUsers.length
              } pengguna telah berhasil disimpan!*`
            );
          })
          .catch(async (err) => {
            pk.reportError("SAVE USERS ID", err);
          });
      } catch (err) {
        pk.reportError("SAVE USERS ID", err);
      }
      break;
    case "dropusers":
    case "dropuser":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }
      await require("./utils/dropUsers")()
        .then(async (res) => {
          if (!res.data || res.data.length === 0) {
            return pk.reply(
              `‼️\x20*Jumlah data pengguna saat ini ${
                res.data.length || 0
              }*\nTidak ada data pengguna yang akan dihapus\nDapatkan data pengguna lebih banyak`
            );
          } else {
            return pk.reply(
              `🎉\x20*${res.data.length} data pengguna telah berhasil dihapus*`
            );
          }
        })
        .catch(async (err) => {
          pk.reportError("DROP USERS", err);
        });
      break;
    /*
     * KONTAK
     */
    case "contacts":
    case "contact":
    case "kontak":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }
      try {
        contacts = await pk.contacts();
        idContact = contacts.findIndex((contact) => contact.id === m.userId);
        if (contacts.length <= 0) {
          return pk.reply(`*Data Kontak: ${contacts.length}*`);
        }
        return pk.reply(
          `*Kontak:*\x20${contacts.length}\n\n${contacts
            .map(
              (contact) =>
                `*Name:*\x20${contact.name}\n*Number:*\x20${
                  contact.id.split("@")[0]
                }`
            )
            .join("\n\n")}`
        );
      } catch (err) {
        pk.reportError("READ KONTAK", err);
      }
      break;
    case "save":
    case "sv":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }
      if (m.isGroup) {
        try {
          if (!m.args[0]) {
            return pk.reply(
              `‼️\x20*Nama dibutuhkan*\n*Contoh:*\x20.save\x20${pk.name}`
            );
          }
          groupMetadata = await pk.groupMetadata(m.id);
          participants = groupMetadata.participants.map((part) => part.id);
          return require("./utils/saveContacts")(
            pk,
            m,
            participants,
            contacts,
            m.args[0]
          );
        } catch (err) {
          pk.reportError("SAVE KONTAK GROUP", err);
        }
      } else {
        try {
          let vcard;
          contacts = await pk.contacts();
          idContact = contacts.findIndex((contact) => contact.id === m.userId);
          if (idContact >= 0) {
            vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${
              contacts[idContact].name
            }\nORG:-\nTEL;type=CELL;type=VOICE;waid=${
              contacts[idContact].id.split("@")[0]
            }:+${contacts[idContact].id.split("@")[0]}\nEND:VCARD`;
          } else {
            vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${
              m.args[0]
            }\nORG:-\nTEL;type=CELL;type=VOICE;waid=${
              m.userId.split("@")[0]
            }:+${m.userId.split("@")[0]}\nEND:VCARD`;
          }
          await pk.sendMessage(
            m.id,
            {
              contacts: {
                displayName: m.args[0],
                contacts: [{ vcard }],
              },
            },
            { quoted: m }
          );
          return pk.reply(
            `*DONE,* Kontakmu sudah aku save.\nSave back *${pk.name}*`
          );
        } catch (err) {
          pk.reportError("SAVE KONTAK PC", err);
        }
      }
      break;
    case "savecontactusers":
    case "savecontactuser":
    case "savekontakuser":
    case "savekuser":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }
      if (!m.args[0]) {
        return pk.reply(
          `‼️\x20*Perintah kurang lengkap atau tidak valid*\n*Contoh:*\x20.savekuser\x20${pk.name}`
        );
      }
      require("./utils/readUsers")()
        .then(async (res) => {
          if (!res.data || res.data.length === 0) {
            return pk.reply(
              `‼️\x20*Data pengguna ${res.data.length || 0}*`
            );
          }
          return require("./utils/saveContacts")(
            pk,
            m,
            res.data,
            contacts,
            m.args[0]
          );
        })
        .catch(async (err) => {
          pk.reportError("SAVE KONTAK USER", err);
        });
      break;
    case "savecontactid":
    case "savekontakid":
    case "savekid":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }

      if (!m.args[0] || !m.args[1]) {
        return pk.reply(
          `‼️\x20*Perintah kurang lengkap atau tidak valid*\n*Contoh:*\x20.savekid\x20638165378166218@g.us|${pk.name}`
        );
      }
      try {
        contacts = await pk.contacts();
        if (m.args[0].endsWith("@g.us")) {
          groupMetadata = await pk.groupMetadata(m.args[0]);
        } else {
          groupMetadata = await pk.groupMetadata(`${m.args[0]}@g.us`);
        }
        participants = groupMetadata.participants.map((part) => part.id);
        return require("./utils/saveContacts")(
          pk,
          m,
          participants,
          contacts,
          m.args[1]
        );
      } catch (err) {
        pk.reportError("SAVE KONTAK GROUP ID", err);
      }
      break;
    case "groups":
    case "group":
      pk.logCommand();
      try {
        if (!m.isOwner && !m.itsMe) {
          return pk.onlyOwner();
        }
        const allGroups = await pk.groupFetchAllParticipating();
        if (
          !allGroups ||
          !Object.values(allGroups) ||
          Object.values(allGroups).length === 0
        ) {
          return pk.reply(`‼️\x20*Groups:* 0`);
        } else {
          return pk.reply(
            `🎉\x20*Jumlah group yang sudah anda join:*\x20${
              Object.values(allGroups).length
            }\n\n${Object.values(allGroups)
              .map(
                (group, index) =>
                  `${index + 1}.\x20*Nama group:*\x20${
                    group.subject
                  }\n\x20\x20\x20*Group id:*\x20${
                    group.id
                  }\n\x20\x20\x20*Group owner:*\x20${
                    group.owner?.split("@")[0]
                  }\n\x20\x20\x20*Jumlah member:*\x20${
                    group.participants.length
                  }`
              )
              .join("\n\n")}`
          );
        }
      } catch (err) {
        pk.reportError("SHOW GROUPS", err);
      }
      break;
    /*
     * BROADCAST
     */
    case "bc":
      pk.logCommand();
      if (!m.itsMe && !m.isOwner) {
        return pk.onlyOwner();
      }
      if (!m.isGroup) {
        return pk.onlyGroup();
      } else {
        if (!m.args[0] || !m.args[1]) {
          return pk.reply(
            `‼️\x20*Perintah kurang lengkap atau tidak valid*\n*Contoh:*\x20.bc\x205000|*Hello World*`
          );
        }
        try {
          contacts = await pk.contacts();
          groupMetadata = await pk.groupMetadata(m.id);
          participants = groupMetadata.participants.map((part) => part.id);
          if (m.type === "imageMessage") {
            buffer = await downloadMediaMessage(m, "buffer", {}, { logger });
            await writeFile(outputImage, buffer);
            return require("./utils/broadcast")(
              pk,
              m,
              participants,
              contacts,
              m.args[1].trim(),
              m.args[0],
              m.type,
              outputImage
            );
          } else {
            return require("./utils/broadcast")(
              pk,
              m,
              participants,
              contacts,
              m.args[1].trim(),
              m.args[0],
              m.type
            );
          }
        } catch (err) {
          pk.reportError("BROADCAST", err);
        }
      }
      break;
    case "bcusers":
    case "bcuser":
    case "bcu":
      pk.logCommand();
      if (!m.itsMe && !m.isOwner) {
        return pk.onlyOwner();
      }
      if (!m.args[0] || !m.args[1]) {
        return replyCommand(
          `‼️\x20*Perintah kurang lengkap atau tidak valid*\n*Contoh:*\x20.bcusers\x205000|*Hello world*`
        );
      }
      require("./utils/readUsers")()
        .then(async (res) => {
          if (!res.data || res.data.length === 0) {
            return replyCommand(
              `‼️\x20*Data pengguna:* ${res.data.length || 0}`
            );
          } else {
            if (m.type == "imageMessage") {
              buffer = await downloadMediaMessage(m, "buffer", {}, { logger });
              await writeFile(outputImage, buffer);
              return require("./utils/broadcast")(
                pk,
                m,
                res.data,
                contacts,
                m.args[1].trim(),
                m.args[0],
                m.type,
                outputImage
              );
            } else {
              return require("./utils/broadcast")(
                pk,
                m,
                res.data,
                contacts,
                m.args[1].trim(),
                m.args[0],
                m.type
              );
            }
          }
        })
        .catch(async (err) => {
          pk.reportError("BROADCAST USER", err);
        });
      break;
    case "bcid":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }
      if (!m.args[0] || isNaN(m.args[1]) || !m.args[2]) {
        return pk.reply(
          `‼️\x20*Perintah kurang lengkap atau tidak valid*\n*Contoh:*\x20.bcid\x2012036327065986379@g.us|5000| *Hello world*`
        );
      } else {
        try {
          contacts = await pk.contacts();
          if (m.args[0].endsWith("@g.us")) {
            groupMetadata = await pk.groupMetadata(m.args[0]);
          } else {
            groupMetadata = await pk.groupMetadata(`${m.args[0]}@g.us`);
          }
          participants = groupMetadata.participants.map((part) => part.id);
          if (m.type === "imageMessage") {
            buffer = await downloadMediaMessage(m, "buffer", {}, { logger });
            await writeFile(outputImage, buffer);
            return require("./utils/broadcast")(
              pk,
              m,
              participants,
              contacts,
              m.args[2].trim(),
              m.args[1],
              m.type,
              outputImage
            );
          } else {
            return require("./utils/broadcast")(
              pk,
              m,
              participants,
              contacts,
              m.args[2].trim(),
              m.args[1],
              m.type
            );
          }
        } catch (err) {
          pk.reportError("BROADCAST GROUP ID", err);
        }
      }
      break;
    case "bcgc":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }

      if (isNaN(m.args[0]) || !m.args[1]) {
        return pk.reply(
          `‼️\x20*Perintah kurang lengkap atau tidak valid*\n*Contoh:*\x20.bcgc\x205000| *Hello World*`
        );
      }
      try {
        contacts = await pk.contacts();
        const myGroups = await pk.groups();
        if (myGroups && myGroups.length <= 0) {
          return pk.reply(
            `‼️\x20*Groups 0*\nGabung lebih banyak group sekarang.`
          );
        } else {
          const myIdGroups = myGroups.map((group) => group.id);
          if (m.type === "imageMessage") {
            buffer = await downloadMediaMessage(m, "buffer", {}, { logger });
            await writeFile(outputImage, buffer);
            return require("./utils/broadcast")(
              pk,
              m,
              myIdGroups,
              contacts,
              m.args[1].trim(),
              m.args[0],
              m.type,
              outputImage
            );
          } else {
            return require("./utils/broadcast")(
              pk,
              m,
              myIdGroups,
              contacts,
              m.args[1].trim(),
              m.args[0],
              m.type
            );
          }
        }
      } catch (err) {
        pk.reportError("BROADCAST GROUPS", err);
      }
      break;
    case "bckontak":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }

      if (isNaN(m.args[0]) || !m.args[1]) {
        return pk.reply(
          `‼️\x20*Perintah kurang lengkap atau tidak valid*\n*Contoh:*\x20.bckontak\x205000| *Hello World*`
        );
      }
      if (setting.features.filterContacts) {
        return pk.reply(
          "*BROADCASTS GAGAL*‼️\n*Pesan:*\x20Broadcast tidak dapat dijalankan, Jika fitur *FILTER KONTAK _ACTIVE_*.\n_Untuk menonaktifkan fitur *FILTER KONTAK*, Jalankan perintah *`.FILTERKONTAK`*_."
        );
      } else {
        contacts = await pk.contacts();
        idContact = contacts.map((contact) => contact.id);
        try {
          if (m.type === "imageMessage") {
            buffer = await downloadMediaMessage(m, "buffer", {}, { logger });
            await writeFile(outputImage, buffer);
            return require("./utils/broadcast")(
              pk,
              m,
              idContact,
              contacts,
              m.args[1].trim(),
              m.args[0],
              m.type,
              outputImage
            );
          } else {
            return require("./utils/broadcast")(
              pk,
              m,
              idContact,
              contacts,
              m.args[1].trim(),
              m.args[0],
              m.type
            );
          }
        } catch (err) {
          pk.reportError("BROADCAST KONTAK", err);
        }
      }
      break;
    case "push":
    case "pk":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }
      if (!m.isGroup) {
        return pk.onlyGroup();
      }
      try {
        if (isNaN(m.args[0]) || !m.args[1]) {
          return pk.reply(
            `‼️\x20*Perintah kurang lengkap atau tidak valid*\n*Contoh:*\x20.push\x205000| *Hello World*`
          );
        } else {
          contacts = await pk.contacts();
          groupMetadata = await pk.groupMetadata(m.id);
          participants = groupMetadata.participants.map((part) => part.id);
          if (m.type === "imageMessage") {
            buffer = await downloadMediaMessage(m, "buffer", {}, { logger });
            await writeFile(outputImage, buffer);
            return require("./utils/pushContacts")(
              pk,
              m,
              participants,
              contacts,
              m.args[1].trim(),
              m.args[0],
              m.type,
              outputImage
            );
          } else {
            return require("./utils/pushContacts")(
              pk,
              m,
              participants,
              contacts,
              m.args[1].trim(),
              m.args[0],
              m.type
            );
          }
        }
      } catch (err) {
        pk.reportError("PUSH KONTAK GROUPS", err);
      }
      break;
    case "pushusers":
    case "pushuser":
    case "pku":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }

      if (isNaN(m.args[0]) || !m.args[1]) {
        return pk.reply(
          `‼️\x20*Perintah kurang lengkap atau tidak valid*\n*Contoh:*\x20.pushuser\x205000| *Hello World*`
        );
      }
      contacts = await pk.contacts();
      require("./utils/readUsers")()
        .then(async (res) => {
          if (!res.data || res.data.length === 0) {
            return pk.reply(
              `‼️\x20*Data pengguna ${
                res.data.length || 0
              }*\nDapatkan data pengguna lebih banyak`
            );
          } else {
            if (m.type === "imageMessage") {
              buffer = await downloadMediaMessage(m, "buffer", {}, { logger });
              await writeFile(outputImage, buffer);

              return require("./utils/pushContacts")(
                pk,
                m,
                res.data,
                contacts,
                m.args[1].trim(),
                m.args[0],
                m.type,
                outputImage
              );
            } else {
              return require("./utils/pushContacts")(
                pk,
                m,
                res.data,
                contacts,
                m.args[1].trim(),
                m.args[0],
                m.type
              );
            }
          }
        })
        .catch(async (err) => {
          pk.reportError("PUSH KONTAK USER", err);
        });
      break;
    case "pushid":
    case "pkid":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }
      try {
        if (!m.args[0] || isNaN(m.args[1]) || !m.args[2]) {
          return pk.reply(
            `‼️\x20\x20*Perintah yang anda berikan kurang lengkap atau tidak valid*\n*Contoh:*\x20.pushid\x20638649923773@g.us|5000|Hello world`
          );
        } else {
          contacts = await pk.contacts();
          if (m.args[0].endsWith("@g.us")) {
            groupMetadata = await pk.groupMetadata(m.args[0]);
          } else {
            groupMetadata = await pk.groupMetadata(`${m.args[0]}@g.us`);
          }
          participants = groupMetadata.participants.map((part) => part.id);
          if (m.type === "imageMessage") {
            buffer = await downloadMediaMessage(m, "buffer", {}, { logger });
            await writeFile(outputImage, buffer);
            return require("./utils/pushContacts")(
              pk,
              m,
              participants,
              contacts,
              m.args[2].trim(),
              m.args[1],
              m.type,
              outputImage
            );
          } else {
            return require("./utils/pushContacts")(
              pk,
              m,
              participants,
              contacts,
              m.args[2].trim(),
              m.args[1],
              m.type
            );
          }
        }
      } catch (err) {
        pk.reportError("PUSH KONTAK GROUP ID", err);
      }
      break;
    case "anticall":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }
      try {
        setting.features.antiCall = !setting.features.antiCall;
        writeFileSync(
          join(__dirname, "./data/setting.json"),
          JSON.stringify(setting)
        );
        return pk.reply(
          `*DONE!*\nStatus *_ANTI CALL_* saat ini *${
            setting.features.antiCall ? "ACTIVE" : "INACTIVE"
          }*`
        );
      } catch (err) {
        pk.reportError("SETTING ANTICALL", err);
      }
      break;
    case "filtercontacts":
    case "filtercontact":
    case "filterkontak":
    case "filterk":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }
      try {
        setting.features.filterContacts = !setting.features.filterContacts;
        writeFileSync(
          join(__dirname, "./data/setting.json"),
          JSON.stringify(setting)
        );
        return pk.reply(
          `*DONE!*\nStatus *_FILTER KONTAK_* saat ini *${
            setting.features.filterContacts ? "ACTIVE" : "INACTIVE"
          }*`
        );
      } catch (err) {
        pk.reportError("SETTING FILTER KONTAK", err);
      }
      break;
    case "filterhistories":
    case "filterhistory":
    case "filterhistori":
    case "filterh":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }

      try {
        setting.features.filterHistory = !setting.features.filterHistory;
        writeFileSync(
          join(__dirname, "./data/setting.json"),
          JSON.stringify(setting)
        );
        return pk.reply(
          `*DONE!*\nStatus *_FILTER HISTORY_* saat ini *${
            setting.features.filterHistory ? "ACTIVE" : "INACTIVE"
          }*`
        );
      } catch (err) {
        pk.reportError("SETTING FILYER HISTORY", err);
      }
      break;
    case "stop":
    case "restart":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }
      try {
        await pk.reply("*Restart dijalankan...*");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        process.send("restart");
      } catch (err) {
        pk.reportError("RESTART", err);
      }
      break;
    case "dropdb":
    case "drop":
      pk.logCommand();
      if (!m.isOwner && !m.itsMe) {
        return pk.onlyOwner();
      }
      try {
        writeFileSync(
          join(__dirname, "./data/histories.json"),
          JSON.stringify([])
        );
        writeFileSync(join(__dirname, "./data/users.json"), JSON.stringify([]));
        pk.reply(`*Done, Drop data user dan history telah berhasil.*`);
      } catch (err) {
        pk.reportError("DROP DATABASE", err);
      }
      break;
  }
};
