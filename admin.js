const form = document.querySelector("#invite-form");
const guestField = document.querySelector("#guest-name");
const baseField = document.querySelector("#base-url");
const result = document.querySelector("#invite-result");
const linkOutput = document.querySelector("#guest-link");
const messageOutput = document.querySelector("#invite-message");
const copyStatus = document.querySelector("#copy-status");
let inviteUrl = "";
let inviteMessage = "";

const celebrationText = [
  "🪔 19th November | Janeu Ceremony\n10:00 AM onwards · Rihayash, Rajnagar, Nagpur\nMaps: https://www.google.com/maps/search/?api=1&query=Rihayash+Rajnagar+Nagpur",
  "🌼 20th November | Haldi Carnival\n11:00 AM onwards · Dublin, Nagpur\nMaps: https://www.google.com/maps/search/?api=1&query=Dublin+Nagpur",
  "🎶 20th November | Sangeet Ceremony\n7:00 PM onwards · Dublin, Nagpur\nMaps: https://www.google.com/maps/search/?api=1&query=Dublin+Nagpur",
  "🐎 21st November | Baarat\n10:00 AM onwards · Signature Resorts, Nagpur\nMaps: https://www.google.com/maps/search/?api=1&query=Signature+Resorts+Surabardi+Road+Nagpur",
  "✨ 21st November | Wedding Reception\n7:00 PM onwards · Signature Resorts, Nagpur\nMaps: https://www.google.com/maps/search/?api=1&query=Signature+Resorts+Surabardi+Road+Nagpur",
].join("\n\n");

form.addEventListener("submit", event => {
  event.preventDefault();
  const guest = guestField.value.trim().replace(/\s+/g, " ");
  if (!guest) {
    guestField.focus();
    return;
  }

  try {
    const destination = new URL(baseField.value.trim());
    destination.searchParams.set("guest", guest);
    inviteUrl = destination.toString();
  } catch {
    copyStatus.textContent = "Enter a valid invitation website URL first.";
    baseField.focus();
    return;
  }

  inviteMessage = `Dear ${guest},\n\nWith immense joy, we invite you to celebrate the beautiful beginning of Ria and Manas’s new journey together. Your presence, love, and blessings will make these special moments even more memorable.\n\nWEDDING CELEBRATIONS\n\n${celebrationText}\n\nOpen your personal invitation: ${inviteUrl}\n\nWith love,\nRia & Manas`;
  linkOutput.href = inviteUrl;
  linkOutput.textContent = inviteUrl;
  document.querySelector("#open-link").href = inviteUrl;
  messageOutput.value = inviteMessage;
  result.hidden = false;
  copyStatus.textContent = "Personal invitation created.";
  result.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
});

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  messageOutput.value = text;
  messageOutput.focus();
  messageOutput.select();
  if (!document.execCommand("copy")) throw new Error("Clipboard unavailable");
}

document.querySelector("#copy-message").addEventListener("click", async () => {
  if (!inviteMessage) return;
  try {
    await copyText(inviteMessage);
    copyStatus.textContent = "Complete message and invitation link copied.";
  } catch {
    copyStatus.textContent = "Select the message above and copy it.";
  }
});

document.querySelector("#copy-link").addEventListener("click", async () => {
  if (!inviteUrl) return;
  try {
    await copyText(inviteUrl);
    copyStatus.textContent = "Invitation link copied.";
  } catch {
    copyStatus.textContent = "The link is shown above; select and copy it.";
  }
});
