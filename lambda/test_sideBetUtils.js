const assert = require('assert');
const {
  calculateSideBetStats,
  validateSideBets,
  migrateLegacySideBets,
} = require('./utils/sideBetUtils');

function runTests() {
  console.log('Running sideBetUtils tests...');

  // Test 1: basic participation and win with timesParticipated weighting
  const games = [
    {
      id: 'g1',
      results: [
        {
          userId: 'u1',
          sideBets: [
            { sideBetId: 'sb1', name: 'Test Bet', amount: 10, participated: true, won: true, timesParticipated: 2 },
          ],
        },
        {
          userId: 'u2',
          sideBets: [
            { sideBetId: 'sb1', name: 'Test Bet', amount: 10, participated: true, won: false, timesParticipated: 1 },
          ],
        },
      ],
    },
  ];

  const statsU1 = calculateSideBetStats(games, 'u1');
  // Participants weight = 2 + 1 = 3, winners weight = 2
  // totalPot = 3 * 10 = 30, u1's share = (2/2)*30 = 30 -> net winnings accounted in calculateSideBetStats as winnings (not net)
  assert(statsU1.totalParticipations === 2, 'u1 totalParticipations should be 2');
  assert(statsU1.totalCosts === 20, 'u1 totalCosts should be 20');
  // Expect totalWinnings to include computed winnings (30)
  assert(statsU1.totalWinnings === 30, `u1 totalWinnings should be 30 but got ${statsU1.totalWinnings}`);

  // Test 2: validateSideBets rejects winner without participation
  const badResults = [
    {
      userId: 'u3',
      sideBets: [
        { sideBetId: 'sb1', name: 'Test Bet', amount: 5, participated: false, won: true, timesParticipated: 0 },
      ],
    },
  ];

  const groupConfig = [{ id: 'sb1', name: 'Test Bet', amount: 5, isActive: true }];
  const errors = validateSideBets(badResults, groupConfig);
  assert(errors.length > 0, 'validateSideBets should return errors for winner without participation');

  // Test 3: migrateLegacySideBets sets timesParticipated
  const legacyResult = { bestHandParticipant: true, bestHandWinner: false };
  const migrated = migrateLegacySideBets(legacyResult, groupConfig);
  assert(Array.isArray(migrated.sideBets), 'migrated should contain sideBets array');
  assert(migrated.sideBets[0].timesParticipated === 1, 'legacy migrated timesParticipated should be 1');

  console.log('All sideBetUtils tests passed');
}

runTests();
