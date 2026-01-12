export function getChatGreeting(username?: string) {
  const hour = new Date().getHours();

  let period: "morning" | "afternoon" | "evening" | "night";

  if (hour >= 5 && hour < 12) period = "morning";
  else if (hour >= 12 && hour < 17) period = "afternoon";
  else if (hour >= 17 && hour < 22) period = "evening";
  else period = "night";

  const messages = {
    morning: [
      "Start your day with a chat ☀️",
      "New day, new conversations 🌅",
      "Say hi to someone this morning 👋",
    ],
    afternoon: [
      "Take a break and catch up 💬",
      "Any new messages waiting? ✨",
      "Good time to reconnect 🌤️",
    ],
    evening: [
      "Unwind with some conversations 🌆",
      "Evening chats hit different ✨",
      "Catch up before the day ends 💬",
    ],
    night: [
      "Late night chats? 🌙",
      "Someone might still be awake 👀",
      "End your day with a message 😴",
    ],
  };

  const list = messages[period];
  const text = list[Math.floor(Math.random() * list.length)];

  return username ? `${text}` : text;
}
