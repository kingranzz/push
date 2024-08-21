module.exports = () => {
  const today = new Date();
  const days = today.getDate();
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ][today.getMonth()];
  const years = today.getFullYear();
  const hours = today.getHours().toString().padStart(2, "0");
  const minutes = today.getMinutes().toString().padStart(2, "0");
  const seconds = today.getSeconds().toString().padStart(2, "0");
  return `\x20\x20${hours}:${minutes}:${seconds}\x20\x20${days}\x20${months}\x20${years}`;
};
