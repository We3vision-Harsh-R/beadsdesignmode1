#!/bin/bash
# Uploads deploy/beads-design-hostinger.zip to Hostinger via TUS, given fresh
# credentials from hosting_generateUploadURLV1 (url/auth_key/rest_auth_key).
set -e
URL="$1"
AUTH="$2"
REST="$3"
FILE="deploy/beads-design-hostinger.zip"
SIZE=$(stat -c%s "$FILE")
curl -s -i -X POST "${URL}/beads-design.zip?override=true" \
  -H "X-Auth: ${AUTH}" -H "X-Auth-Rest: ${REST}" -H "Tus-Resumable: 1.0.0" \
  -H "Upload-Length: ${SIZE}" -H "Upload-Offset: 0" | head -3
curl -s -i -X PATCH "${URL}/beads-design.zip?override=true" \
  -H "X-Auth: ${AUTH}" -H "X-Auth-Rest: ${REST}" -H "Tus-Resumable: 1.0.0" \
  -H "Content-Type: application/offset+octet-stream" -H "Upload-Offset: 0" \
  --data-binary "@${FILE}" | head -5
