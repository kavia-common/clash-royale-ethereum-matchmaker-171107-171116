const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Champion'];
const names = [
  'AquaKnight', 'StormRider', 'AmberFox', 'BlueWhale', 'SeaWolf', 'CoralMage',
  'WaveBreaker', 'TideHunter', 'DeepDiver', 'Sapphire', 'Mariner', 'Harpooner',
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// PUBLIC_INTERFACE
export function generateMockProfiles(count = 18, { min = 0.01, max = 2.0 } = {}) {
  /** Generate mock user profiles with username, rank, avatar placeholder, and desired wager in ETH. */
  const profiles = [];
  for (let i = 0; i < count; i += 1) {
    const username = `${randomFrom(names)}${Math.floor(Math.random() * 900 + 100)}`;
    const rank = randomFrom(ranks);
    const wagerEth = Number((Math.random() * (max - min) + min).toFixed(2));

    profiles.push({
      id: `mock-${i}-${username}`,
      username,
      rank,
      avatarUrl: '', // placeholder for future real avatars
      wagerEth,
    });
  }
  return profiles;
}
