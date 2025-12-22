/**
 * Basic usage example for jvc-hltb
 */

const HLTBClient = require('../src/index');

async function main() {
  console.log('🎮 jvc-hltb - Basic Usage Example\n');
  
  // Create a new client instance
  const hltb = new HLTBClient();
  
  // List of games to look up
  const games = [
    'The Legend of Zelda: Breath of the Wild',
    'Super Mario Odyssey',
    'Hollow Knight',
    'Mega Man',
    'Dark Souls'
  ];
  
  try {
    for (const gameName of games) {
      console.log(`\n🔍 Searching: ${gameName}`);
      console.log('-'.repeat(50));
      
      const duration = await hltb.getGameDuration(gameName);
      
      if (duration) {
        console.log(`✅ Found: ${gameName}`);
        console.log(`   Main Story:    ${hltb.formatDuration(duration.mainStory) || 'N/A'}`);
        console.log(`   Main + Extras: ${hltb.formatDuration(duration.mainExtras) || 'N/A'}`);
        console.log(`   Completionist: ${hltb.formatDuration(duration.completionist) || 'N/A'}`);
        console.log(`   URL: https://howlongtobeat.com/game/${duration.gameId}`);
      } else {
        console.log(`❌ Not found: ${gameName}`);
      }
    }
    
  } finally {
    // Always clean up when done
    await hltb.destroy();
  }
  
  console.log('\n✨ Done!');
}

main().catch(console.error);
