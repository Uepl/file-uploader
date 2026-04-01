import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Profiles for different environments
const profiles = {
  smoke: { 
    executor: 'ramping-vus',
    stages: [
      { duration: '1m', target: 1 }, 
    ],
  },
  load: { // For staging/production with higher limits
    executor: 'ramping-vus',
    stages: [
      { duration: '30s', target: 10 },
      { duration: '1m', target: 10 },
      { duration: '30s', target: 0 },
    ],
  }
};

// Default to smoke test if running on low-power environment
export const options = {
  scenarios: {
    default: profiles[__ENV.PROFILE || 'smoke']
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'], 
    http_req_failed: ['rate<0.05'],    
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

export default function () {
  // Use a unique email per iteration to avoid conflicts
  const email = `test_user_deploy_${Date.now()}_${__ITER}@example.com`;
  const password = 'TestPassword123!';

  // 1. Register
  let registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    email: email,
    password: password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(registerRes, {
    'registered or exists': (r) => r.status === 201 || r.status === 400,
  });

  // 2. Login
  let loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: email,
    password: password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const loginCheck = check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  if (!loginCheck) {
    sleep(2);
    return;
  }

  const token = loginRes.json().token;
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  // 3. List
  http.get(`${BASE_URL}/files`, { headers: authHeaders });

  // 4. Upload (Only if we haven't hit the 3-per-hour limit)
  // Generating a tiny file to save bandwidth/CPU on e2-micro
  const fileData = http.file(randomString(512), 'smoke-test.bin');
  
  const payload = {
    encryptedFile: fileData,
    originalName: 'smoke-test.txt',
    encryptedKey: 'dummy-key',
    iv: 'dummy-iv',
  };

  let uploadRes = http.post(`${BASE_URL}/upload`, payload, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  check(uploadRes, {
    'upload handled': (r) => r.status === 200 || r.status === 429,
  });

  // Sleep longer between iterations to avoid hitting rate limits
  sleep(5); 
}
