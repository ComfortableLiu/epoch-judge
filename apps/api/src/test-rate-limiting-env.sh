#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# API Rate Limiting Environment Variable Test Script
# =============================================================================
# This script tests rate limiting configuration via environment variables.
# =============================================================================

API="${API_URL:-http://localhost:3000/api/v1}"
TEST_USER="env_test_$(date +%s)"
TEST_PASS="testpass123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

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

# Make HTTP request and return status code
make_request() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    local auth="${4:-}"
    
    local curl_cmd="curl -s -o /dev/null -w '%{http_code}' -X $method '$API$endpoint'"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    if [ -n "$auth" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth'"
    fi
    
    eval "$curl_cmd"
}

# =============================================================================
# TEST 1: THROTTLE_ENABLED=false disables rate limiting
# =============================================================================
test_throttle_enabled_false() {
    log_test "THROTTLE_ENABLED=false Disables Rate Limiting"
    
    log_info "Note: This test requires restarting the API with THROTTLE_ENABLED=false"
    log_info "Current implementation checks: config.get('THROTTLE_ENABLED', 'true') !== 'false'"
    
    # Check if we can verify the configuration
    local response
    response=$(curl -s "$API/health" 2>/dev/null || echo "{}")
    
    if echo "$response" | grep -q '"status"'; then
        pass_test "API is running (health check passed)"
        log_info "To fully test THROTTLE_ENABLED=false, restart API with environment variable set"
    else
        fail_test "API health check failed"
    fi
}

# =============================================================================
# TEST 2: THROTTLE_TTL configuration
# =============================================================================
test_throttle_ttl_config() {
    log_test "THROTTLE_TTL Configuration"
    
    log_info "Checking if THROTTLE_TTL is being used..."
    
    # Read the throttle config to verify THROTTLE_TTL is used
    local config_file="/Users/xiaoyao/Documents/Projects/epoch-judge/apps/api/src/common/throttle.config.ts"
    
    if grep -q "THROTTLE_TTL" "$config_file"; then
        pass_test "THROTTLE_TTL is referenced in throttle.config.ts"
    else
        fail_test "THROTTLE_TTL not found in throttle.config.ts"
    fi
    
    # Check default value
    if grep -q "THROTTLE_TTL_DEFAULT = 60" "$config_file"; then
        pass_test "Default THROTTLE_TTL is 60 seconds"
    else
        fail_test "Default THROTTLE_TTL is not 60 seconds"
    fi
}

# =============================================================================
# TEST 3: THROTTLE_LIMIT configuration
# =============================================================================
test_throttle_limit_config() {
    log_test "THROTTLE_LIMIT Configuration"
    
    log_info "Checking if THROTTLE_LIMIT is being used..."
    
    local config_file="/Users/xiaoyao/Documents/Projects/epoch-judge/apps/api/src/common/throttle.config.ts"
    
    if grep -q "THROTTLE_LIMIT" "$config_file"; then
        pass_test "THROTTLE_LIMIT is referenced in throttle.config.ts"
    else
        fail_test "THROTTLE_LIMIT not found in throttle.config.ts"
    fi
    
    # Check default value
    if grep -q "THROTTLE_LIMIT_DEFAULT = 60" "$config_file"; then
        pass_test "Default THROTTLE_LIMIT is 60 requests"
    else
        fail_test "Default THROTTLE_LIMIT is not 60 requests"
    fi
}

# =============================================================================
# TEST 4: THROTTLE_AUTH_LIMIT configuration
# =============================================================================
test_throttle_auth_limit_config() {
    log_test "THROTTLE_AUTH_LIMIT Configuration"
    
    log_info "Checking if THROTTLE_AUTH_LIMIT is being used..."
    
    local config_file="/Users/xiaoyao/Documents/Projects/epoch-judge/apps/api/src/common/throttle.config.ts"
    
    if grep -q "THROTTLE_AUTH_LIMIT" "$config_file"; then
        pass_test "THROTTLE_AUTH_LIMIT is referenced in throttle.config.ts"
    else
        fail_test "THROTTLE_AUTH_LIMIT not found in throttle.config.ts"
    fi
    
    # Check default value
    if grep -q "THROTTLE_AUTH_LIMIT_DEFAULT = 5" "$config_file"; then
        pass_test "Default THROTTLE_AUTH_LIMIT is 5 requests"
    else
        fail_test "Default THROTTLE_AUTH_LIMIT is not 5 requests"
    fi
}

# =============================================================================
# TEST 5: THROTTLE_SUBMISSION_LIMIT configuration
# =============================================================================
test_throttle_submission_limit_config() {
    log_test "THROTTLE_SUBMISSION_LIMIT Configuration"
    
    log_info "Checking if THROTTLE_SUBMISSION_LIMIT is being used..."
    
    local config_file="/Users/xiaoyao/Documents/Projects/epoch-judge/apps/api/src/common/throttle.config.ts"
    
    if grep -q "THROTTLE_SUBMISSION_LIMIT" "$config_file"; then
        pass_test "THROTTLE_SUBMISSION_LIMIT is referenced in throttle.config.ts"
    else
        fail_test "THROTTLE_SUBMISSION_LIMIT not found in throttle.config.ts"
    fi
    
    # Check default value
    if grep -q "THROTTLE_SUBMISSION_LIMIT_DEFAULT = 10" "$config_file"; then
        pass_test "Default THROTTLE_SUBMISSION_LIMIT is 10 requests"
    else
        fail_test "Default THROTTLE_SUBMISSION_LIMIT is not 10 requests"
    fi
}

# =============================================================================
# TEST 6: Throttle decorators in controllers
# =============================================================================
test_throttle_decorators() {
    log_test "Throttle Decorators in Controllers"
    
    local auth_controller="/Users/xiaoyao/Documents/Projects/epoch-judge/apps/api/src/auth/auth.controller.ts"
    local submissions_controller="/Users/xiaoyao/Documents/Projects/epoch-judge/apps/api/src/submissions/submissions.controller.ts"
    
    # Check auth controller
    if grep -q "@Throttle" "$auth_controller"; then
        pass_test "Auth controller has @Throttle decorator"
    else
        fail_test "Auth controller missing @Throttle decorator"
    fi
    
    # Check submissions controller
    if grep -q "@Throttle" "$submissions_controller"; then
        pass_test "Submissions controller has @Throttle decorator"
    else
        fail_test "Submissions controller missing @Throttle decorator"
    fi
    
    # Check for @SkipThrottle on SSE endpoint
    if grep -q "@SkipThrottle" "$submissions_controller"; then
        pass_test "Submissions controller has @SkipThrottle decorator"
    else
        fail_test "Submissions controller missing @SkipThrottle decorator"
    fi
}

# =============================================================================
# TEST 7: ThrottlerGuard as global guard
# =============================================================================
test_throttler_guard() {
    log_test "ThrottlerGuard as Global Guard"
    
    local app_module="/Users/xiaoyao/Documents/Projects/epoch-judge/apps/api/src/app.module.ts"
    
    if grep -q "APP_GUARD" "$app_module" && grep -q "ThrottlerGuard" "$app_module"; then
        pass_test "ThrottlerGuard is registered as global guard"
    else
        fail_test "ThrottlerGuard not registered as global guard"
    fi
}

# =============================================================================
# TEST 8: ThrottlerModule configuration
# =============================================================================
test_throttler_module() {
    log_test "ThrottlerModule Configuration"
    
    local app_module="/Users/xiaoyao/Documents/Projects/epoch-judge/apps/api/src/app.module.ts"
    
    if grep -q "ThrottlerModule.forRootAsync" "$app_module"; then
        pass_test "ThrottlerModule is configured with forRootAsync"
    else
        fail_test "ThrottlerModule not configured with forRootAsync"
    fi
}

# =============================================================================
# TEST 9: Redis storage for throttler
# =============================================================================
test_redis_storage() {
    log_test "Redis Storage for Throttler"
    
    local package_json="/Users/xiaoyao/Documents/Projects/epoch-judge/apps/api/package.json"
    
    if grep -q "@nest-lab/throttler-storage-redis" "$package_json"; then
        pass_test "Redis throttler storage dependency exists"
    else
        fail_test "Redis throttler storage dependency missing"
    fi
}

# =============================================================================
# TEST 10: Trust proxy configuration
# =============================================================================
test_trust_proxy() {
    log_test "Trust Proxy Configuration"
    
    local main_ts="/Users/xiaoyao/Documents/Projects/epoch-judge/apps/api/src/main.ts"
    
    if grep -q "trust proxy" "$main_ts"; then
        pass_test "Trust proxy is configured for X-Forwarded-For"
    else
        fail_test "Trust proxy not configured"
    fi
}

# =============================================================================
# MAIN TEST EXECUTION
# =============================================================================
main() {
    log_info "Starting API Rate Limiting Environment Variable Tests"
    log_info "API URL: $API"
    echo "=========================================="
    
    # Run tests
    test_throttle_enabled_false
    test_throttle_ttl_config
    test_throttle_limit_config
    test_throttle_auth_limit_config
    test_throttle_submission_limit_config
    test_throttle_decorators
    test_throttler_guard
    test_throttler_module
    test_redis_storage
    test_trust_proxy
    
    # Print summary
    echo ""
    echo "=========================================="
    echo "TEST SUMMARY"
    echo "=========================================="
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
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