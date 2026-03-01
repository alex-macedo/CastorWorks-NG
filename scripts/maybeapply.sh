#!/bin/bash
set -euo pipefail
patch="$1"
read -d '' content <<'PATCH'
${patch}
PATCH
set +e
apply_patch <<"EOF"
$content
