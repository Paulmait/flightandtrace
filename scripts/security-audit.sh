#!/bin/bash

# FlightTrace Security Audit Script
# Comprehensive security checks before going live

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FAILED_CHECKS=0
WARNINGS=0

echo -e "${GREEN}FlightTrace Security Audit${NC}"
echo "=========================="
echo "Running comprehensive security checks..."
echo

# Function to check and report
check() {
    local name="$1"
    local command="$2"
    local expected="$3"
    
    echo -n "Checking $name... "
    
    if eval "$command"; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo -e "  ${YELLOW}Expected: $expected${NC}"
        ((FAILED_CHECKS++))
        return 1
    fi
}

warn() {
    local name="$1"
    local command="$2"
    
    echo -n "Checking $name... "
    
    if eval "$command"; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ WARNING${NC}"
        ((WARNINGS++))
        return 1
    fi
}

# 1. Environment Security
echo -e "\n${BLUE}1. Environment Security${NC}"
echo "----------------------"

check "Environment file permissions" \
    "[ -f .env ] && [ $(stat -c %a .env 2>/dev/null || stat -f %p .env | cut -c 4-6) -eq 600 ]" \
    ".env file should have 600 permissions"

check "No hardcoded secrets" \
    "! grep -r 'sk_live\|pk_live\|password.*=.*[\"'\''][^\"'\'']*[\"'\'']' --include='*.py' --include='*.js' src/" \
    "No hardcoded API keys or passwords in source code"

check "Git ignores .env" \
    "grep -q '^\.env$' .gitignore" \
    ".env should be in .gitignore"

# 2. Dependencies Security
echo -e "\n${BLUE}2. Dependencies Security${NC}"
echo "-----------------------"

echo -n "Checking Python dependencies for vulnerabilities... "
if command -v safety &> /dev/null; then
    cd backend
    if safety check --json > /tmp/safety_report.json 2>&1; then
        echo -e "${GREEN}✓ No vulnerabilities found${NC}"
    else
        vuln_count=$(python3 -c "import json; print(len(json.load(open('/tmp/safety_report.json'))['vulnerabilities']))" 2>/dev/null || echo "unknown")
        echo -e "${RED}✗ Found $vuln_count vulnerabilities${NC}"
        ((FAILED_CHECKS++))
    fi
    cd ..
else
    echo -e "${YELLOW}⚠ safety not installed (pip install safety)${NC}"
    ((WARNINGS++))
fi

echo -n "Checking npm dependencies for vulnerabilities... "
cd frontend
if npm audit --json > /tmp/npm_audit.json 2>&1; then
    echo -e "${GREEN}✓ No vulnerabilities found${NC}"
else
    high_vulns=$(python3 -c "import json; data=json.load(open('/tmp/npm_audit.json')); print(data['metadata']['vulnerabilities']['high'] + data['metadata']['vulnerabilities']['critical'])" 2>/dev/null || echo "0")
    if [ "$high_vulns" -gt 0 ]; then
        echo -e "${RED}✗ Found $high_vulns high/critical vulnerabilities${NC}"
        ((FAILED_CHECKS++))
    else
        echo -e "${YELLOW}⚠ Found low/moderate vulnerabilities${NC}"
        ((WARNINGS++))
    fi
fi
cd ..

# 3. API Security
echo -e "\n${BLUE}3. API Security${NC}"
echo "--------------"

# Start the API server in background for testing
echo "Starting API server for security tests..."
cd backend
python -m uvicorn src.api.fastapi_app:app --host 127.0.0.1 --port 8001 &
API_PID=$!
cd ..
sleep 5

# Test rate limiting
echo -n "Testing rate limiting... "
RATE_LIMIT_WORKS=true
for i in {1..100}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001/api/health 2>/dev/null)
    if [ "$response" = "429" ]; then
        break
    fi
    if [ $i -eq 100 ]; then
        RATE_LIMIT_WORKS=false
    fi
done

if $RATE_LIMIT_WORKS; then
    echo -e "${GREEN}✓ Rate limiting active${NC}"
else
    echo -e "${RED}✗ Rate limiting not working${NC}"
    ((FAILED_CHECKS++))
fi

# Test authentication
echo -n "Testing authentication required... "
response=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8001/users/1/tail_numbers 2>/dev/null)
if [ "$response" = "401" ] || [ "$response" = "403" ]; then
    echo -e "${GREEN}✓ Authentication required${NC}"
else
    echo -e "${RED}✗ Unauthenticated access allowed${NC}"
    ((FAILED_CHECKS++))
fi

# Test CORS
echo -n "Testing CORS configuration... "
response=$(curl -s -H "Origin: https://evil.com" -I http://127.0.0.1:8001/api/health 2>/dev/null | grep -i "access-control-allow-origin")
if [ -z "$response" ] || [[ "$response" != *"evil.com"* ]]; then
    echo -e "${GREEN}✓ CORS properly configured${NC}"
else
    echo -e "${RED}✗ CORS allows any origin${NC}"
    ((FAILED_CHECKS++))
fi

# Kill API server
kill $API_PID 2>/dev/null || true

# 4. Database Security
echo -e "\n${BLUE}4. Database Security${NC}"
echo "-------------------"

check "Database file permissions" \
    "[ ! -f backend/data/flights.db ] || [ $(stat -c %a backend/data/flights.db 2>/dev/null || stat -f %p backend/data/flights.db | cut -c 4-6) -le 644 ]" \
    "Database file should not be world-writable"

# 5. SSL/TLS Security
echo -e "\n${BLUE}5. SSL/TLS Security${NC}"
echo "------------------"

if [ -f "/etc/nginx/sites-enabled/flighttrace" ]; then
    check "SSL protocols" \
        "grep -q 'ssl_protocols.*TLSv1.2.*TLSv1.3' /etc/nginx/sites-enabled/flighttrace" \
        "Only TLS 1.2 and 1.3 should be enabled"
    
    check "Security headers configured" \
        "grep -q 'add_header Strict-Transport-Security' /etc/nginx/sites-enabled/flighttrace" \
        "HSTS header should be configured"
else
    echo -e "${YELLOW}⚠ Nginx configuration not found (run on production server)${NC}"
    ((WARNINGS++))
fi

# 6. Code Security
echo -e "\n${BLUE}6. Code Security${NC}"
echo "---------------"

echo -n "Checking for SQL injection vulnerabilities... "
if ! grep -r "execute.*%.*%" --include="*.py" backend/src/ 2>/dev/null | grep -v "# nosec"; then
    echo -e "${GREEN}✓ No SQL string formatting found${NC}"
else
    echo -e "${RED}✗ Potential SQL injection risk${NC}"
    ((FAILED_CHECKS++))
fi

echo -n "Checking for XSS vulnerabilities... "
if ! grep -r "dangerouslySetInnerHTML\|innerHTML" --include="*.js" --include="*.jsx" frontend/ 2>/dev/null | grep -v "// nosec"; then
    echo -e "${GREEN}✓ No dangerous HTML operations${NC}"
else
    echo -e "${YELLOW}⚠ Potential XSS risk (review manually)${NC}"
    ((WARNINGS++))
fi

# 7. Authentication Security
echo -e "\n${BLUE}7. Authentication Security${NC}"
echo "-------------------------"

echo -n "Checking password hashing... "
if grep -q "from passlib.context import CryptContext" backend/src/core/auth.py && \
   grep -q "bcrypt" backend/src/core/auth.py; then
    echo -e "${GREEN}✓ Using bcrypt for passwords${NC}"
else
    echo -e "${RED}✗ Not using secure password hashing${NC}"
    ((FAILED_CHECKS++))
fi

echo -n "Checking JWT implementation... "
if grep -q "from jose import.*jwt" backend/src/core/auth.py; then
    echo -e "${GREEN}✓ Using python-jose for JWT${NC}"
else
    echo -e "${RED}✗ JWT not properly implemented${NC}"
    ((FAILED_CHECKS++))
fi

# 8. Data Protection
echo -e "\n${BLUE}8. Data Protection${NC}"
echo "-----------------"

check "GDPR compliance implementation" \
    "grep -q 'delete_user_data' backend/src/core/user.py" \
    "User data deletion should be implemented"

check "Privacy policy exists" \
    "grep -q 'PRIVACY_POLICY' backend/src/core/legal_documents.py" \
    "Privacy policy should be defined"

# 9. Payment Security
echo -e "\n${BLUE}9. Payment Security${NC}"
echo "------------------"

check "No credit card storage" \
    "! grep -r 'card_number\|cvv\|credit_card' --include='*.py' backend/src/" \
    "No credit card data should be stored"

check "Stripe webhook validation" \
    "grep -q 'stripe.Webhook.construct_event' backend/src/core/stripe_payment.py" \
    "Stripe webhooks should be validated"

# 10. Logging Security
echo -e "\n${BLUE}10. Logging Security${NC}"
echo "-------------------"

check "No sensitive data in logs" \
    "! grep -r 'password.*logger\|logger.*password' --include='*.py' backend/src/" \
    "Passwords should not be logged"

# Generate Security Report
echo -e "\n${BLUE}Generating Security Report...${NC}"

cat > security-audit-report.txt << EOF
FlightTrace Security Audit Report
Generated: $(date)

Summary:
--------
Failed Checks: $FAILED_CHECKS
Warnings: $WARNINGS

Recommendations:
---------------
EOF

if [ $FAILED_CHECKS -gt 0 ]; then
    cat >> security-audit-report.txt << EOF

CRITICAL - Fix these before going live:
EOF
    
    if ! [ -f .env ] || [ $(stat -c %a .env 2>/dev/null || stat -f %p .env | cut -c 4-6) -ne 600 ]; then
        echo "- Set .env file permissions to 600" >> security-audit-report.txt
    fi
    
    if [ "$high_vulns" -gt 0 ]; then
        echo "- Fix high/critical npm vulnerabilities (run: npm audit fix)" >> security-audit-report.txt
    fi
fi

if [ $WARNINGS -gt 0 ]; then
    cat >> security-audit-report.txt << EOF

Warnings to address:
EOF
    echo "- Review and fix warnings listed above" >> security-audit-report.txt
fi

# Additional security checks
cat >> security-audit-report.txt << EOF

Security Checklist:
------------------
[$([ $FAILED_CHECKS -eq 0 ] && echo "x" || echo " ")] All critical security checks passed
[$(command -v safety &> /dev/null && echo "x" || echo " ")] Python dependency scanning enabled
[ ] Penetration testing completed
[ ] Security headers verified (securityheaders.com)
[ ] SSL configuration tested (ssllabs.com)
[ ] OWASP Top 10 review completed
[ ] Security monitoring configured
[ ] Incident response plan documented
[ ] Backup and recovery tested
[ ] Access logs reviewed

Pre-Launch Checklist:
--------------------
[ ] Production environment variables set
[ ] Debug mode disabled
[ ] Error messages don't leak information
[ ] Admin interface secured
[ ] API documentation access restricted
[ ] Rate limiting tested under load
[ ] HTTPS enforced everywhere
[ ] Secrets rotated from development
[ ] Security.txt file created
[ ] Bug bounty program considered

Compliance Checklist:
--------------------
[ ] GDPR compliance verified
[ ] CCPA compliance verified
[ ] Terms of Service published
[ ] Privacy Policy published
[ ] Cookie Policy published
[ ] Data retention policy implemented
[ ] User consent mechanisms working
[ ] Data export functionality tested
[ ] Data deletion functionality tested
[ ] Audit trail complete
EOF

echo
echo "----------------------------------------"
if [ $FAILED_CHECKS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All security checks passed!${NC}"
    echo -e "${GREEN}FlightTrace is ready for production.${NC}"
else
    echo -e "${RED}✗ Security issues found!${NC}"
    echo -e "${YELLOW}Failed checks: $FAILED_CHECKS${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo
    echo -e "Review ${YELLOW}security-audit-report.txt${NC} for details."
    echo -e "${RED}DO NOT deploy until all critical issues are fixed!${NC}"
fi
echo "----------------------------------------"

# Create security.txt file for production
cat > frontend/public/.well-known/security.txt << EOF
Contact: security@flighttrace.com
Expires: $(date -d '+1 year' --iso-8601)
Acknowledgments: https://flighttrace.com/security/thanks
Preferred-Languages: en
Canonical: https://flighttrace.com/.well-known/security.txt
Policy: https://flighttrace.com/security/policy
Hiring: https://flighttrace.com/careers
EOF

echo
echo -e "${GREEN}Security report saved to: security-audit-report.txt${NC}"
echo -e "${GREEN}Security.txt created at: frontend/public/.well-known/security.txt${NC}"

exit $FAILED_CHECKS