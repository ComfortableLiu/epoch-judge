# API Rate Limiting Test Cases

## Test Environment Setup

### Prerequisites
1. API server running on `http://localhost:3000`
2. Redis server running and accessible
3. Database initialized and seeded

### Environment Variables
```bash
# Optional - override defaults
export THROTTLE_ENABLED=true
export THROTTLE_TTL=60
export THROTTLE_LIMIT=60
export THROTTLE_AUTH_LIMIT=5
export THROTTLE_SUBMISSION_LIMIT=10
export API_URL=http://localhost:3000/api/v1
```

---

## Test Suite 1: Global Rate Limiting

### Test Case 1.1: Default Global Limit (60 requests/minute)
**Objective**: Verify global rate limiting works with default configuration

**Steps**:
1. Register a test user and obtain JWT token
2. Make 60 requests to `/problems` endpoint within 1 minute
3. Verify all 60 requests return HTTP 200
4. Make 1 additional request
5. Verify the 61st request returns HTTP 429

**Expected Result**:
- Requests 1-60: HTTP 200
- Request 61: HTTP 429

**Test Script**:
```bash
# Register user
TOKEN=$(curl -s -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"username":"testuser","password":"testpass123"}' | \
  node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(0)).accessToken)")

# Test rate limiting
for i in $(seq 1 65); do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$API/problems" -H "Authorization: Bearer $TOKEN")
  echo "Request $i: $STATUS"
  if [ "$STATUS" -eq 429 ]; then
    echo "Rate limited at request $i"
    break
  fi
done
```

### Test Case 1.2: Custom Global Limit
**Objective**: Verify global rate limiting respects custom THROTTLE_LIMIT

**Steps**:
1. Set `THROTTLE_LIMIT=10` environment variable
2. Restart API server
3. Make 10 requests to `/problems` endpoint
4. Verify all 10 requests return HTTP 200
5. Make 1 additional request
6. Verify the 11th request returns HTTP 429

**Expected Result**:
- Requests 1-10: HTTP 200
- Request 11: HTTP 429

---

## Test Suite 2: Auth Endpoint Rate Limiting

### Test Case 2.1: Register Endpoint Limit (5 requests/minute)
**Objective**: Verify `/auth/register` has 5 requests/minute limit

**Steps**:
1. Make 5 registration requests with different usernames within 1 minute
2. Verify all 5 requests return HTTP 200/201
3. Make 1 additional registration request
4. Verify the 6th request returns HTTP 429

**Expected Result**:
- Requests 1-5: HTTP 200/201
- Request 6: HTTP 429

**Test Script**:
```bash
for i in $(seq 1 7); do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"testuser_$i\",\"password\":\"testpass123\"}")
  echo "Register request $i: $STATUS"
  if [ "$STATUS" -eq 429 ]; then
    echo "Rate limited at request $i"
    break
  fi
done
```

### Test Case 2.2: Login Endpoint Limit (5 requests/minute)
**Objective**: Verify `/auth/login` has 5 requests/minute limit

**Steps**:
1. Register a test user
2. Make 5 login requests within 1 minute
3. Verify all 5 requests return HTTP 200
4. Make 1 additional login request
5. Verify the 6th request returns HTTP 429

**Expected Result**:
- Requests 1-5: HTTP 200
- Request 6: HTTP 429

### Test Case 2.3: Auth Rate Limit Per User
**Objective**: Verify rate limiting is per-user for auth endpoints

**Steps**:
1. Register User A and User B
2. Make 5 login requests for User A
3. Verify User A is rate limited on 6th request
4. Make 1 login request for User B
5. Verify User B is NOT rate limited

**Expected Result**:
- User A: Rate limited after 5 requests
- User B: Not rate limited (separate limit)

---

## Test Suite 3: Submission Endpoint Rate Limiting

### Test Case 3.1: Submission Create Limit (10 requests/minute)
**Objective**: Verify `POST /submissions` has 10 requests/minute limit

**Steps**:
1. Register user and obtain token
2. Make 10 submission creation requests within 1 minute
3. Verify all 10 requests return HTTP 200/201
4. Make 1 additional submission request
5. Verify the 11th request returns HTTP 429

**Expected Result**:
- Requests 1-10: HTTP 200/201
- Request 11: HTTP 429

### Test Case 3.2: Submission List Not Rate Limited Separately
**Objective**: Verify `GET /submissions` uses global rate limit (60/min)

**Steps**:
1. Register user and obtain token
2. Make 60 `GET /submissions` requests within 1 minute
3. Verify all 60 requests return HTTP 200
4. Make 1 additional request
5. Verify the 61st request returns HTTP 429

**Expected Result**:
- Requests 1-60: HTTP 200
- Request 61: HTTP 429

---

## Test Suite 4: SSE Endpoint Exemption

### Test Case 4.1: SSE Endpoint Not Rate Limited
**Objective**: Verify SSE endpoint is exempt from rate limiting

**Steps**:
1. Register user and obtain token
2. Create a submission to get submission number
3. Make 65 requests to `/submissions/:number/stream` within 1 minute
4. Verify all requests return HTTP 200 (or timeout, not 429)

**Expected Result**:
- All requests: HTTP 200 or timeout (connection established)
- No requests: HTTP 429

**Test Script**:
```bash
# Get submission number
SUBMISSION_NUMBER=$(curl -s "$API/submissions" -H "Authorization: Bearer $TOKEN" | \
  node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(0))[0]?.number || '1')")

# Test SSE endpoint
for i in $(seq 1 65); do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 1 \
    "$API/submissions/$SUBMISSION_NUMBER/stream" -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
  echo "SSE request $i: $STATUS"
  if [ "$STATUS" -eq 429 ]; then
    echo "UNEXPECTED: SSE endpoint rate limited at request $i"
    break
  fi
done
```

---

## Test Suite 5: Environment Variable Configuration

### Test Case 5.1: THROTTLE_ENABLED=false
**Objective**: Verify rate limiting is disabled when `THROTTLE_ENABLED=false`

**Steps**:
1. Set `THROTTLE_ENABLED=false` environment variable
2. Restart API server
3. Make 65 requests to `/problems` endpoint
4. Verify all 65 requests return HTTP 200

**Expected Result**:
- All requests: HTTP 200 (no rate limiting)

### Test Case 5.2: Custom TTL
**Objective**: Verify custom TTL configuration

**Steps**:
1. Set `THROTTLE_TTL=30` (30 seconds)
2. Restart API server
3. Make 60 requests within 30 seconds
4. Verify rate limiting triggers
5. Wait 31 seconds
6. Make 1 additional request
7. Verify request succeeds

**Expected Result**:
- Requests within 30s: Rate limited after 60
- Request after 31s: HTTP 200

### Test Case 5.3: Custom Auth Limit
**Objective**: Verify custom auth limit configuration

**Steps**:
1. Set `THROTTLE_AUTH_LIMIT=3`
2. Restart API server
3. Make 3 login requests
4. Verify all 3 requests return HTTP 200
5. Make 1 additional request
6. Verify the 4th request returns HTTP 429

**Expected Result**:
- Requests 1-3: HTTP 200
- Request 4: HTTP 429

---

## Test Suite 6: Edge Cases and Error Handling

### Test Case 6.1: Rate Limit Reset After Window
**Objective**: Verify rate limits reset after the time window

**Steps**:
1. Make 60 requests to trigger rate limit
2. Wait for 61 seconds (window duration + 1)
3. Make 1 additional request
4. Verify request succeeds

**Expected Result**:
- Request after window reset: HTTP 200

### Test Case 6.2: Different IPs Have Separate Limits
**Objective**: Verify rate limiting is per-IP address

**Steps**:
1. From IP A, make 60 requests to trigger rate limit
2. From IP B, make 1 request
3. Verify IP B request succeeds

**Expected Result**:
- IP A: Rate limited after 60 requests
- IP B: Not rate limited (separate limit)

### Test Case 6.3: Concurrent Requests
**Objective**: Verify rate limiting works with concurrent requests

**Steps**:
1. Send 65 concurrent requests using `xargs` or `parallel`
2. Verify exactly 60 requests succeed
3. Verify 5 requests return HTTP 429

**Expected Result**:
- 60 requests: HTTP 200
- 5 requests: HTTP 429

---

## Test Suite 7: Response Format

### Test Case 7.1: 429 Response Headers
**Objective**: Verify 429 response includes proper headers

**Steps**:
1. Trigger rate limit
2. Inspect response headers

**Expected Headers**:
- `Retry-After`: Seconds until rate limit resets
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Time when rate limit resets

### Test Case 7.2: 429 Response Body
**Objective**: Verify 429 response body format

**Expected Response Body**:
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

---

## Test Suite 8: Integration with Other Features

### Test Case 8.1: Rate Limiting with Authentication
**Objective**: Verify rate limiting works with authenticated requests

**Steps**:
1. Register user and obtain token
2. Make requests with valid token
3. Verify rate limiting applies to authenticated requests

### Test Case 8.2: Rate Limiting with Different HTTP Methods
**Objective**: Verify rate limiting applies to all HTTP methods

**Steps**:
1. Make GET, POST, PUT, DELETE requests to same endpoint
2. Verify all methods count toward rate limit

---

## Automated Test Execution

### Quick Test (5 minutes)
```bash
# Run functional tests
./test-rate-limiting.sh

# Run configuration tests
./test-rate-limiting-env.sh
```

### Full Test Suite (30 minutes)
```bash
# Run all test cases manually following the steps above
# Document results in test report
```

### CI/CD Integration
```yaml
# Add to CI pipeline
- name: Rate Limiting Tests
  run: |
    cd apps/api/src
    chmod +x test-rate-limiting.sh test-rate-limiting-env.sh
    ./test-rate-limiting-env.sh
    # Start API and run functional tests
    npm run start:dev &
    sleep 10
    ./test-rate-limiting.sh
```

---

## Test Data Cleanup

After testing, clean up test data:
```bash
# Remove test users
curl -X DELETE "$API/admin/users/testuser_*" -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Notes

1. **Timing Sensitivity**: Some tests depend on timing. Allow ±1 second tolerance.
2. **Network Latency**: High latency may affect rate limit calculations.
3. **Redis State**: Rate limits are stored in Redis. Restarting Redis resets all limits.
4. **Multiple Instances**: In production with multiple API instances, rate limits are shared via Redis.

---

**Document Version**: 1.0
**Last Updated**: $(date)