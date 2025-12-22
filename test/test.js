/**
 * jvc-hltb Test Script
 * 
 * Usage: node test/test.js [game name]
 * Example: node test/test.js "Mega Man"
 */

const HLTBClient = require('../src/index');

async function runTest() {
  const gameName = process.argv[2] || 'Mega Man';
  
  console.log(`\n🧪 Testing jvc-hltb with: "${gameName}"`);
  console.log('='.repeat(60));
  
  const hltb = new HLTBClient();
  
  try {
    const duration = await hltb.getGameDuration(gameName);
    
    if (duration) {
      console.log('\n✅ Data found!\n');
      console.log('Duration data:');
      console.log(`  • Game ID: ${duration.gameId}`);
      console.log(`  • Main Story: ${duration.mainStory ? `${duration.mainStory} hours (${hltb.formatDuration(duration.mainStory)})` : 'N/A'}`);
      console.log(`  • Main + Extras: ${duration.mainExtras ? `${duration.mainExtras} hours (${hltb.formatDuration(duration.mainExtras)})` : 'N/A'}`);
      console.log(`  • Completionist: ${duration.completionist ? `${duration.completionist} hours (${hltb.formatDuration(duration.completionist)})` : 'N/A'}`);
      console.log(`  • HLTB URL: https://howlongtobeat.com/game/${duration.gameId}`);
    } else {
      console.log('\n❌ No data found');
      console.log('The game might not exist on HowLongToBeat or the name might not match exactly.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await hltb.destroy();
  }
  
  console.log('='.repeat(60));
  console.log('');
}

runTest();
