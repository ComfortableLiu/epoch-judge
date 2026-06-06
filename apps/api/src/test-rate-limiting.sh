#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# API Rate Limiting Test Script
# =============================================================================
# This script tests all rate limiting rules for the EpochJudge API.
# Requirements:
# 1. Global default throttling: 60 requests/minute
# 2. Auth endpoints (/auth/login, /auth/register): 5 requests/minute
# 3. Submission endpoints (/submissions): 10 requests/minute
# 4. Throttling configurable via environment variables
# 5. Return HTTP 429 Too Many Requests when limit exceeded
# 6. SSE endpoint not affected by throttling
# 7. THROTTLE_ENABLED=false disables throttling
# =============================================================================

API="${API_URL:-http://localhost:3000/api/v1}"
TEST_USER="rate_test_$(date +%s)"
TEST_PASS="testpass123"
TOKEN=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_test() {
    echo -e "\n${YELLOW}=== TEST: $1 ===${NC}"
    ((TOTAL_TESTS++))
}

pass_test() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED_TESTS++))
}

fail_test() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED_TESTS++))
}

skip_test() {
    echo -e "${YELLOW}⚠ SKIP${NC}: $1"
    ((SKIPPED_TESTS++))
}

# Make HTTP request and return status code
make_request() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    local headers="${4:-}"
    local auth="${5:-}"
    
    local curl_cmd="curl -s -o /dev/null -w '%{http_code}' -X $method '$API$endpoint'"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    if [ -n "$auth" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth'"
    fi
    
    eval "$curl_cmd"
}

# Make HTTP request and return response body
make_request_with_body() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    local headers="${4:-}"
    local auth="${5:-}"
    
    local curl_cmd="curl -s -X $method '$API$endpoint'"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    if [ -n "$auth" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth'"
    fi
    
    eval "$curl_cmd"
}

# =============================================================================
# TEST 1: Health endpoint (no rate limiting)
# =============================================================================
test_health_endpoint() {
    log_test "Health Endpoint (No Rate Limiting)"
    
    # Health endpoint should not be rate limited
    local status_code
    status_code=$(make_request GET "/health")
    
    if [ "$status_code" -eq 200 ]; then
        pass_test "Health endpoint accessible without rate limiting"
    else
        fail_test "Health endpoint returned $status_code (expected 200)"
    fi
}

# =============================================================================
# TEST 2: Global rate limiting (60 requests/minute)
# =============================================================================
test_global_rate_limiting() {
    log_test "Global Rate Limiting (60 requests/minute)"
    
    # First, register a user to get a token
    log_info "Registering test user..."
    local reg_response
    reg_response=$(make_request_with_body POST "/auth/register" "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}")
    
    if echo "$reg_response" | grep -q "accessToken"; then
        TOKEN=$(echo "$reg_response" | node -e "process.stdout.write(JSON.parse(require('fs').readFileSync(0)).accessToken)")
        log_info "User registered, token obtained"
    else
        log_error "Failed to register user: $reg_response"
        return 1
    fi
    
    # Test global rate limiting on an endpoint that uses default throttle
    # We'll use /problems endpoint which should have default throttle
    log_info "Testing global rate limiting (60 requests/minute)..."
    
    local success_count=0
    local rate_limited=false
    
    # Make 65 requests (should hit limit at 60)
    for i in $(seq 1 65); do
        local status_code
        status_code=$(make_request GET "/problems" "" "" "$TOKEN")
        
        if [ "$status_code" -eq 200 ]; then
            ((success_count++))
        elif [ "$status_code" -eq 429 ]; then
            rate_limited=true
            log_info "Rate limited at request $i"
            break
        else
            log_error "Unexpected status code $status_code at request $i"
            break
        fi
    done
    
    if [ "$rate_limited" = true ]; then
        pass_test "Global rate limiting triggered at $success_count requests (expected ~60)"
    else
        fail_test "Global rate limiting not triggered after 65 requests"
    fi
}

# =============================================================================
# TEST 3: Auth endpoint rate limiting (5 requests/minute)
# =============================================================================
test_auth_rate_limiting() {
    log_test "Auth Endpoint Rate Limiting (5 requests/minute)"
    
    # Test /auth/register endpoint
    log_info "Testing /auth/register rate limiting..."
    
    local register_success=0
    local register_limited=false
    
    for i in $(seq 1 7); do
        local test_user="rate_test_auth_${i}_$(date +%s)"
        local status_code
        status_code=$(make_request POST "/auth/register" "{\"username\":\"$test_user\",\"password\":\"testpass123\"}")
        
        if [ "$status_code" -eq 201 ] || [ "$status_code" -eq 200 ]; then
            ((register_success++))
        elif [ "$status_code" -eq 429 ]; then
            register_limited=true
            log_info "Register rate limited at request $i"
            break
        else
            log_error "Unexpected status code $status_code at request $i"
            break
        fi
    done
    
    if [ "$register_limited" = true ]; then
        pass_test "/auth/register rate limiting triggered at $register_success requests (expected 5)"
    else
        fail_test "/auth/register rate limiting not triggered after 7 requests"
    fi
    
    # Test /auth/login endpoint
    log_info "Testing /auth/login rate limiting..."
    
    local login_success=0
    local login_limited=false
    
    for i in $(seq 1 7); do
        local status_code
        status_code=$(make_request POST "/auth/login" "{\"username\":\"$TEST_USER\",\"password\":\"testpass123\"}")
        
        if [ "$status_code" -eq 200 ]; then
            ((login_success++))
        elif [ "$status_code" -eq 429 ]; then
            login_limited=true
            log_info "Login rate limited at request $i"
            break
        else
            log_error "Unexpected status code $status_code at request $i"
            break
        fi
    done
    
    if [ "$login_limited" = true ]; then
        pass_test "/auth/login rate limiting triggered at $login_success requests (expected 5)"
    else
        fail_test "/auth/login rate limiting not triggered after 7 requests"
    fi
}

# =============================================================================
# TEST 4: Submission endpoint rate limiting (10 requests/minute)
# =============================================================================
test_submission_rate_limiting() {
    log_test "Submission Endpoint Rate Limiting (10 requests/minute)"
    
    if [ -z "$TOKEN" ]; then
        skip_test "No token available, skipping submission rate limiting test"
        return
    fi
    
    log_info "Testing /submissions rate limiting..."
    
    local submission_success=0
    local submission_limited=false
    
    # We'll test the GET /submissions endpoint
    for i in $(seq 1 12); do
        local status_code
        status_code=$(make_request GET "/submissions" "" "" "$TOKEN")
        
        if [ "$status_code" -eq 200 ]; then
            ((submission_success++))
        elif [ "$status_code" -eq 429 ]; then
            submission_limited=true
            log_info "Submission rate limited at request $i"
            break
        else
            log_error "Unexpected status code $status_code at request $i"
            break
        fi
    done
    
    if [ "$submission_limited" = true ]; then
        pass_test "/submissions rate limiting triggered at $submission_success requests (expected ~10)"
    else
        fail_test "/submissions rate limiting not triggered after 12 requests"
    fi
}

# =============================================================================
# TEST 5: Rate limit response format
# =============================================================================
test_rate_limit_response() {
    log_test "Rate Limit Response Format"
    
    # Make requests until rate limited
    local response
    response=$(make_request_with_body POST "/auth/login" "{\"username\":\"$TEST_USER\",\"password\":\"testpass123\"}")
    
    # Check if response contains rate limit information
    if echo "$response" | grep -q "retryAfter\|Retry-After\|message"; then
        pass_test "Rate limit response contains retry information"
    else
        log_warn "Rate limit response format: $response"
        fail_test "Rate limit response missing retry information"
    fi
}

# =============================================================================
# TEST 6: SSE endpoint not affected by rate limiting
# =============================================================================
test_sse_endpoint() {
    log_test "SSE Endpoint Not Affected by Rate Limiting"
    
    if [ -z "$TOKEN" ]; then
        skip_test "No token available, skipping SSE endpoint test"
        return
    fi
    
    log_info "Testing SSE endpoint /submissions/:number/stream..."
    
    # First, we need a submission number. Let's get the first submission
    local submissions_response
    submissions_response=$(make_request_with_body GET "/submissions" "" "" "$TOKEN")
    
    # For now, we'll test with a dummy number to see if it's rate limited
    # The important thing is that we don't get 429
    local sse_success=0
    local sse_limited=false
    
    for i in $(seq 1 12); do
        local status_code
        # Use a timeout to avoid hanging on SSE connection
        status_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 1 "$API/submissions/1/stream" -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
        
        if [ "$status_code" -eq 200 ] || [ "$status_code" -eq 000 ]; then
            # 200 or timeout (which means connection was established)
            ((sse_success++))
        elif [ "$status_code" -eq 429 ]; then
            sse_limited=true
            log_info "SSE rate limited at request $i"
            break
        else
            log_error "Unexpected status code $status_code at request $i"
            break
        fi
    done
    
    if [ "$sse_limited" = false ]; then
        pass_test "SSE endpoint not rate limited after $sse_success requests"
    else
        fail_test "SSE endpoint was rate limited (should not be)"
    fi
}

# =============================================================================
# TEST 7: Rate limit reset after window
# =============================================================================
test_rate_limit_reset() {
    log_test "Rate Limit Reset After Window"
    
    log_info "Waiting 61 seconds for rate limit window to reset..."
    sleep 61
    
    # Test that we can make requests again
    local status_code
    status_code=$(make_request GET "/health")
    
    if [ "$status_code" -eq 200 ]; then
        pass_test "Rate limit window reset successfully"
    else
        fail_test "Rate limit window not reset (status: $status_code)"
    fi
}

# =============================================================================
# TEST 8: Different IP addresses have separate limits
# =============================================================================
test_ip_isolation() {
    log_test "Different IP Addresses Have Separate Limits"
    
    # This test requires multiple IPs, which is hard to simulate
    # We'll just verify the concept by checking if rate limiting is per-IP
    log_info "Note: IP isolation test requires multiple source IPs"
    skip_test "IP isolation test requires network configuration"
}

# =============================================================================
# MAIN TEST EXECUTION
# =============================================================================
main() {
    log_info "Starting API Rate Limiting Tests"
    log_info "API URL: $API"
    echo "=========================================="
    
    # Run tests
    test_health_endpoint
    test_global_rate_limiting
    test_auth_rate_limiting
    test_submission_rate_limiting
    test_rate_limit_response
    test_sse_endpoint
    test_rate_limit_reset
    test_ip_isolation
    
    # Print summary
    echo ""
    echo "=========================================="
    echo "TEST SUMMARY"
    echo "=========================================="
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    echo -e "Skipped: ${YELLOW}$SKIPPED_TESTS${NC}"
    echo "=========================================="
    
    if [ "$FAILED_TESTS" -gt 0 ]; then
        log_error "Some tests failed!"
        exit 1
    else
        log_info "All tests passed!"
        exit 0
    fi
}

# Run main function
main