// Quick network test
import { API_URL } from './src/config/api';

console.log('═══════════════════════════════════════');
console.log('API Configuration Test');
console.log('═══════════════════════════════════════');
console.log('API_URL:', API_URL);
console.log('process.env.EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
console.log('Expected: https://roomify-server-production.up.railway.app/api');
console.log('═══════════════════════════════════════');

// Test fetch
console.log('\nTesting network fetch...');
fetch('https://roomify-server-production.up.railway.app/health')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Network fetch SUCCESS:', data);
  })
  .catch(err => {
    console.log('❌ Network fetch FAILED:', err.message);
  });
