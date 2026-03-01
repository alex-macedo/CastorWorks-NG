#!/bin/bash

# Script to dismiss Dependabot security alerts for xlsx package
# Requires GitHub CLI (gh) to be installed and authenticated

set -e

REPO="alex-macedo/engproapp"
PACKAGE="xlsx"
REASON="tolerable_risk"
COMMENT="Vulnerable dependency is required for Excel import/export functionality. Risk is accepted with current mitigations in place. See SECURITY.md and docs/SECURITY_XLSX_VULNERABILITY.md for details."

echo "🔍 Finding Dependabot alerts for $PACKAGE package..."

# Get list of open alerts for xlsx
ALERTS=$(gh api repos/$REPO/dependabot/alerts --jq ".[] | select(.dependency.package.name == \"$PACKAGE\" and .state == \"open\") | .number")

if [ -z "$ALERTS" ]; then
  echo "✅ No open alerts found for $PACKAGE"
  exit 0
fi

echo "Found alerts: $ALERTS"
echo ""

for ALERT_NUMBER in $ALERTS; do
  echo "📋 Dismissing alert #$ALERT_NUMBER..."
  
  gh api repos/$REPO/dependabot/alerts/$ALERT_NUMBER \
    -X PATCH \
    -f state="dismissed" \
    -f dismissed_reason="$REASON" \
    -f dismissed_comment="$COMMENT"
  
  echo "✅ Alert #$ALERT_NUMBER dismissed"
done

echo ""
echo "✅ All xlsx alerts have been dismissed"
echo "📝 Reason: $REASON"
echo "💬 Comment: $COMMENT"

