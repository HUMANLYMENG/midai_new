import albumArt from 'album-art';

async function testAlbumArt() {
  console.log('Testing album-art library...\n');
  
  // Test 1: Artist only
  try {
    console.log('Test 1: Artist "Taylor Swift"');
    const result1 = await albumArt('Taylor Swift');
    console.log('Result:', result1);
    console.log('Type:', typeof result1);
    console.log('---');
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test 2: Artist + Album
  try {
    console.log('\nTest 2: Artist "Taylor Swift" Album "1989"');
    const result2 = await albumArt('Taylor Swift', { album: '1989', size: 'large' });
    console.log('Result:', result2);
    console.log('Type:', typeof result2);
    console.log('---');
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test 3: Artist + Album with different size
  try {
    console.log('\nTest 3: Artist "The Beatles" Album "Abbey Road" size: medium');
    const result3 = await albumArt('The Beatles', { album: 'Abbey Road', size: 'medium' });
    console.log('Result:', result3);
    console.log('Type:', typeof result3);
    console.log('---');
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // Test 4: Non-existent artist
  try {
    console.log('\nTest 4: Non-existent artist "XYZ123NonExistent"');
    const result4 = await albumArt('XYZ123NonExistent');
    console.log('Result:', result4);
    console.log('Type:', typeof typeof result4);
    console.log('Is null/undefined:', result4 === null || result4 === undefined);
    console.log('---');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAlbumArt();
