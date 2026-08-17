const baseUrl = (process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const BASE = `${baseUrl}/api`;

async function testApi() {
  console.log('--- Testing Daily Wellness API ---');
  console.log('Base URL:', baseUrl);
  let cookie = '';

  // 1. Signup
  const email = `testuser_${Date.now()}@example.com`;
  const password = 'securepassword123';
  console.log(`1. Signing up user: ${email}...`);

  const signupRes = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const signupData = await signupRes.json();
  console.log('Signup status:', signupRes.status, signupData);

  const setCookie = signupRes.headers.get('set-cookie');
  if (setCookie) {
    cookie = setCookie.split(';')[0];
  }

  // 2. GET /auth/me
  console.log('\n2. Testing GET /api/auth/me...');
  const meRes = await fetch(`${BASE}/auth/me`, {
    headers: { Cookie: cookie }
  });
  console.log('Me status:', meRes.status, await meRes.json());

  // 3. POST /api/checkin (Atomic Upsert)
  const todayStr = new Date().toISOString().split('T')[0];
  console.log(`\n3. Submitting Check-In for date: ${todayStr}...`);
  const checkinRes = await fetch(`${BASE}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      date: todayStr,
      sleep_hours: 8,
      mood: 9,
      energy: 9
    })
  });
  const checkinData = await checkinRes.json();
  console.log('Check-in status:', checkinRes.status, checkinData);

  // 4. GET /api/checkin/today
  console.log('\n4. Fetching today checkin...');
  const todayRes = await fetch(`${BASE}/checkin/today?date=${todayStr}`, {
    headers: { Cookie: cookie }
  });
  console.log('Today status:', todayRes.status, await todayRes.json());

  // 5. GET /api/checkin/last7days
  console.log('\n5. Fetching 7-day trend...');
  const trendRes = await fetch(`${BASE}/checkin/last7days?date=${todayStr}`, {
    headers: { Cookie: cookie }
  });
  const trendData = await trendRes.json();
  console.log('Trend status:', trendRes.status, 'Items count:', trendData.trend?.length);

  // 6. Test Future Date Rejection
  console.log('\n6. Testing Future Date Rejection (2030-01-01)...');
  const futureRes = await fetch(`${BASE}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      date: '2030-01-01',
      sleep_hours: 8,
      mood: 8,
      energy: 8
    })
  });
  console.log('Future date rejection status:', futureRes.status, await futureRes.json());

  // 7. Logout
  console.log('\n7. Logging out...');
  const logoutRes = await fetch(`${BASE}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookie }
  });
  console.log('Logout status:', logoutRes.status, await logoutRes.json());

  console.log('\n--- ALL API TESTS COMPLETED ---');
}

testApi().catch(console.error);
