import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp-up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 0 },  // Ramp-down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must be under 500ms
    http_req_failed: ['rate<0.01'],    // Less than 1% failure rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

export default function () {
  const email = `test_user_${__VU}_${__ITER}@example.com`;
  const password = 'TestPassword123!';

  // 1. Register
  let registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    email: email,
    password: password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  // Check registration; skip if user already exists (400) or success (201)
  check(registerRes, {
    'registered or already exists': (r) => r.status === 201 || r.status === 400,
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
    'has token': (r) => r.json().token !== undefined,
  });

  if (!loginCheck) {
    return;
  }

  const token = loginRes.json().token;
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
  };

  // 3. List Files
  let listRes = http.get(`${BASE_URL}/files`, { headers: authHeaders });
  check(listRes, {
    'list files successful': (r) => r.status === 200,
  });

  // 4. Upload File (Streamed)
  // Generating a small dummy "encrypted" file
  const fileData = http.file(randomString(1024), 'test-load.bin');
  
  const payload = {
    encryptedFile: fileData,
    originalName: 'load-test-file.txt',
    encryptedKey: 'dummy-encrypted-key-base64',
    iv: 'dummy-iv-base64',
  };

  let uploadRes = http.post(`${BASE_URL}/upload`, payload, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  check(uploadRes, {
    'upload successful': (r) => r.status === 200,
    'upload status success': (r) => r.json().status === 'success',
  });

  sleep(1);
}
