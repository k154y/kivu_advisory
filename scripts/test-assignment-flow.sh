#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"

if [ -z "${ADMIN_TOKEN:-}" ]; then
  echo "ERROR: ADMIN_TOKEN is not set."
  echo ""
  echo "Run like this:"
  echo "export ADMIN_TOKEN='PASTE_ADMIN_ACCESS_TOKEN_HERE'"
  echo "./scripts/test-assignment-flow.sh"
  exit 1
fi

TS="$(date +%s)"
ACCOUNTANT_EMAIL="accountant_${TS}@kivuadvisory.com"
ACCOUNTANT_PASSWORD="Accountant2026!"
DIRECT_CLIENT_EMAIL="direct_client_${TS}@example.com"
ASSIGNMENT_CLIENT_EMAIL="assignment_client_${TS}@example.com"

json_pick() {
  python3 - "$@" <<'PY'
import json
import sys

paths = sys.argv[1:]
raw = sys.stdin.read()

try:
    data = json.loads(raw)
except Exception:
    sys.exit(0)

def get_path(obj, path):
    current = obj
    for part in path.split("."):
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, list) and part.isdigit():
            index = int(part)
            if index < 0 or index >= len(current):
                return None
            current = current[index]
        else:
            return None
    return current

for path in paths:
    value = get_path(data, path)
    if value is not None and value != "":
        if isinstance(value, (dict, list)):
            print(json.dumps(value))
        else:
            print(value)
        sys.exit(0)
PY
}

pretty_json() {
  python3 -m json.tool 2>/dev/null || cat
}

require_value() {
  name="$1"
  value="$2"
  response="$3"

  if [ -z "$value" ]; then
    echo ""
    echo "ERROR: Could not read $name from response."
    echo "Response was:"
    printf '%s\n' "$response" | pretty_json
    exit 1
  fi
}

admin_post() {
  url="$1"
  body="$2"

  curl -sS -X POST "$url" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    --data-binary "$body"
}

admin_patch() {
  url="$1"
  body="$2"

  curl -sS -X PATCH "$url" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    --data-binary "$body"
}

public_post() {
  url="$1"
  body="$2"

  curl -sS -X POST "$url" \
    -H "Content-Type: application/json" \
    --data-binary "$body"
}

accountant_get() {
  url="$1"

  curl -sS "$url" \
    -H "Authorization: Bearer $ACCOUNTANT_TOKEN"
}

accountant_patch() {
  url="$1"
  body="$2"

  curl -sS -X PATCH "$url" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCOUNTANT_TOKEN" \
    --data-binary "$body"
}

echo ""
echo "=================================================="
echo "KIVU ADVISORY ASSIGNMENT FLOW TEST"
echo "Base URL: $BASE_URL"
echo "=================================================="

echo ""
echo "PART A: Create request for direct admin resolution"
DIRECT_REQUEST_BODY=$(cat <<JSON
{
  "requester_name": "Direct Resolution Test Client",
  "requester_email": "$DIRECT_CLIENT_EMAIL",
  "requester_phone": "+250788333333",
  "requester_company": "Direct Resolution Test Company",
  "title": "Direct Tax Support",
  "description": "This request will be completed directly by admin without assigning an accountant.",
  "priority": "normal",
  "preferred_contact_method": "email",
  "expected_deadline": "2026-09-15"
}
JSON
)

DIRECT_CREATE_RESPONSE="$(public_post "$BASE_URL/service-requests" "$DIRECT_REQUEST_BODY")"
printf '%s\n' "$DIRECT_CREATE_RESPONSE" | pretty_json

DIRECT_REQUEST_ID="$(printf '%s' "$DIRECT_CREATE_RESPONSE" | json_pick \
  "data.id" \
  "data.request.id" \
  "data.service_request.id" \
  "data.service_request_id" \
  "request.id" \
  "service_request.id" \
  "id"
)"

require_value "DIRECT_REQUEST_ID" "$DIRECT_REQUEST_ID" "$DIRECT_CREATE_RESPONSE"

echo ""
echo "PART A: Admin resolves request directly"
DIRECT_RESOLVE_BODY=$(cat <<JSON
{
  "status": "completed",
  "admin_notes": "Request completed directly by admin without assignment.",
  "internal_notes": "No accountant assignment was needed."
}
JSON
)

DIRECT_RESOLVE_RESPONSE="$(admin_patch "$BASE_URL/admin/service-requests/status?id=$DIRECT_REQUEST_ID" "$DIRECT_RESOLVE_BODY")"
printf '%s\n' "$DIRECT_RESOLVE_RESPONSE" | pretty_json

echo ""
echo "PART B STEP 1: Create accountant account"
CREATE_ACCOUNTANT_BODY=$(cat <<JSON
{
  "full_name": "Test Accountant $TS",
  "email": "$ACCOUNTANT_EMAIL",
  "phone": "+250788111111",
  "password": "$ACCOUNTANT_PASSWORD"
}
JSON
)

CREATE_ACCOUNTANT_RESPONSE="$(admin_post "$BASE_URL/admin/accountants" "$CREATE_ACCOUNTANT_BODY")"
printf '%s\n' "$CREATE_ACCOUNTANT_RESPONSE" | pretty_json

ACCOUNTANT_USER_ID="$(printf '%s' "$CREATE_ACCOUNTANT_RESPONSE" | json_pick \
  "data.id" \
  "data.user_id" \
  "data.user.id" \
  "data.accountant_user_id" \
  "data.accountant.id" \
  "data.accountant.user_id" \
  "user.id" \
  "accountant.id" \
  "id"
)"

require_value "ACCOUNTANT_USER_ID" "$ACCOUNTANT_USER_ID" "$CREATE_ACCOUNTANT_RESPONSE"

echo ""
echo "PART B STEP 2: Create new visitor service request"
ASSIGNMENT_REQUEST_BODY=$(cat <<JSON
{
  "requester_name": "Assignment Test Client",
  "requester_email": "$ASSIGNMENT_CLIENT_EMAIL",
  "requester_phone": "+250788222222",
  "requester_company": "Assignment Test Company",
  "title": "Bookkeeping Support",
  "description": "I need monthly bookkeeping support for my business records.",
  "priority": "high",
  "preferred_contact_method": "email",
  "expected_deadline": "2026-09-15"
}
JSON
)

ASSIGNMENT_REQUEST_RESPONSE="$(public_post "$BASE_URL/service-requests" "$ASSIGNMENT_REQUEST_BODY")"
printf '%s\n' "$ASSIGNMENT_REQUEST_RESPONSE" | pretty_json

ASSIGNMENT_REQUEST_ID="$(printf '%s' "$ASSIGNMENT_REQUEST_RESPONSE" | json_pick \
  "data.id" \
  "data.request.id" \
  "data.service_request.id" \
  "data.service_request_id" \
  "request.id" \
  "service_request.id" \
  "id"
)"

require_value "ASSIGNMENT_REQUEST_ID" "$ASSIGNMENT_REQUEST_ID" "$ASSIGNMENT_REQUEST_RESPONSE"

echo ""
echo "PART B STEP 3: Assign request to accountant"
CREATE_ASSIGNMENT_BODY=$(cat <<JSON
{
  "service_request_id": "$ASSIGNMENT_REQUEST_ID",
  "accountant_user_id": "$ACCOUNTANT_USER_ID",
  "priority": "high",
  "due_date": "2026-09-15",
  "notes": "Please review the client bookkeeping needs and start the file.",
  "internal_notes": "Check if client has uploaded supporting documents."
}
JSON
)

CREATE_ASSIGNMENT_RESPONSE="$(admin_post "$BASE_URL/admin/assignments" "$CREATE_ASSIGNMENT_BODY")"
printf '%s\n' "$CREATE_ASSIGNMENT_RESPONSE" | pretty_json

ASSIGNMENT_ID="$(printf '%s' "$CREATE_ASSIGNMENT_RESPONSE" | json_pick \
  "data.id" \
  "data.assignment.id" \
  "data.assignment_id" \
  "assignment.id" \
  "id"
)"

require_value "ASSIGNMENT_ID" "$ASSIGNMENT_ID" "$CREATE_ASSIGNMENT_RESPONSE"

echo ""
echo "PART B STEP 4: Login as accountant"
ACCOUNTANT_LOGIN_BODY=$(cat <<JSON
{
  "email": "$ACCOUNTANT_EMAIL",
  "password": "$ACCOUNTANT_PASSWORD"
}
JSON
)

ACCOUNTANT_LOGIN_RESPONSE="$(public_post "$BASE_URL/auth/login" "$ACCOUNTANT_LOGIN_BODY")"
printf '%s\n' "$ACCOUNTANT_LOGIN_RESPONSE" | pretty_json

ACCOUNTANT_TOKEN="$(printf '%s' "$ACCOUNTANT_LOGIN_RESPONSE" | json_pick \
  "data.access_token" \
  "data.token" \
  "data.tokens.access_token" \
  "access_token" \
  "token" \
  "tokens.access_token"
)"

require_value "ACCOUNTANT_TOKEN" "$ACCOUNTANT_TOKEN" "$ACCOUNTANT_LOGIN_RESPONSE"

echo ""
echo "PART B STEP 5: Accountant lists assigned work"
ACCOUNTANT_ASSIGNMENTS_RESPONSE="$(accountant_get "$BASE_URL/accountant/assignments")"
printf '%s\n' "$ACCOUNTANT_ASSIGNMENTS_RESPONSE" | pretty_json

echo ""
echo "PART B STEP 6: Accountant updates assignment status"
UPDATE_ASSIGNMENT_BODY=$(cat <<JSON
{
  "status": "in_progress",
  "notes": "I have started reviewing the bookkeeping request."
}
JSON
)

UPDATE_ASSIGNMENT_RESPONSE="$(accountant_patch "$BASE_URL/accountant/assignments/status?id=$ASSIGNMENT_ID" "$UPDATE_ASSIGNMENT_BODY")"
printf '%s\n' "$UPDATE_ASSIGNMENT_RESPONSE" | pretty_json

echo ""
echo "PART B STEP 7: Admin closes main service request after quality control"
CLOSE_REQUEST_BODY=$(cat <<JSON
{
  "status": "completed",
  "admin_notes": "Work completed and request closed.",
  "internal_notes": "Accountant assignment reviewed and completed."
}
JSON
)

CLOSE_REQUEST_RESPONSE="$(admin_patch "$BASE_URL/admin/service-requests/status?id=$ASSIGNMENT_REQUEST_ID" "$CLOSE_REQUEST_BODY")"
printf '%s\n' "$CLOSE_REQUEST_RESPONSE" | pretty_json

echo ""
echo "=================================================="
echo "TEST FINISHED"
echo "Direct request ID:      $DIRECT_REQUEST_ID"
echo "Accountant email:       $ACCOUNTANT_EMAIL"
echo "Accountant user ID:     $ACCOUNTANT_USER_ID"
echo "Assignment request ID:  $ASSIGNMENT_REQUEST_ID"
echo "Assignment ID:          $ASSIGNMENT_ID"
echo "=================================================="
