export function getFlavorTextForPeriod(period: number): string {
  const ambientMessages = [
    "The halls smell like glue sticks again.",
    "Someone's passing notes in math class.",
    "You hear whispers of a candy trade in the gym...",
    "Locker 39 is making weird noises.",
    "Mrs. Han is in a *mood* today.",
  ];

  return ambientMessages[Math.floor(Math.random() * ambientMessages.length)];
}
