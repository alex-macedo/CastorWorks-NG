#!/bin/bash

# Test WhatsApp settings QR code generation
echo "Testing WhatsApp QR code generation..."

# Open the app with session
agent-browser --session whatsapp_test open http://localhost:5173/login

# Debug: list all input fields
agent-browser --session whatsapp_test eval "Array.from(document.querySelectorAll('input')).map(input => input.id + ' ' + input.name + ' ' + input.type).join('\n')" > input_fields.txt
echo "Input fields found:"
cat input_fields.txt

# Do snapshot to establish refs
agent-browser --session whatsapp_test snapshot -i > /dev/null

# Fill login form using refs without @
echo "Filling login form with refs e1, e2, e3..."
agent-browser --session whatsapp_test fill @e1 "alex.macedo.ca@gmail.com"
agent-browser --session whatsapp_test fill @e2 "#yf7w*F2IR8^mdMa"
agent-browser --session whatsapp_test click @e3

# Wait for navigation
agent-browser --session whatsapp_test wait --url "**/architect" --timeout 10000

# Check current URL
CURRENT_URL=$(agent-browser --session whatsapp_test get url)
echo "Current URL after login: $CURRENT_URL"

if [[ $CURRENT_URL == *"login"* ]]; then
  echo "Login failed, still on login page"
  agent-browser --session whatsapp_test close
  exit 1
fi

# Navigate to WhatsApp settings
agent-browser --session whatsapp_test open http://localhost:5173/admin/whatsapp

# Wait for page load
agent-browser --session whatsapp_test wait 3000

# Check current URL again
CURRENT_URL=$(agent-browser --session whatsapp_test get url)
echo "Current URL at WhatsApp settings: $CURRENT_URL"

if [[ $CURRENT_URL == *"login"* ]]; then
  echo "Access denied to WhatsApp settings, redirected to login"
  agent-browser --session whatsapp_test close
  exit 1
fi

# Take a screenshot to see the page
agent-browser --session whatsapp_test screenshot whatsapp_page.png

# Check if Generate QR Code button is visible using eval
echo "Checking for Generate QR Code button..."
BUTTON_EXISTS=$(agent-browser --session whatsapp_test eval "!!Array.from(document.querySelectorAll('button, [role=\"button\"]')).find(btn => btn.textContent && btn.textContent.includes('Generate QR Code'))")
echo "Button exists: $BUTTON_EXISTS"

if [ "$BUTTON_EXISTS" = "true" ]; then
  echo "Generate QR Code button found"
  # Click the button using eval
  agent-browser --session whatsapp_test eval "Array.from(document.querySelectorAll('button, [role=\"button\"]')).find(btn => btn.textContent && btn.textContent.includes('Generate QR Code')).click()"
  # Wait for QR code or response
  agent-browser --session whatsapp_test wait 2000
  # Take screenshot
  agent-browser --session whatsapp_test screenshot whatsapp_qr_test.png
  echo "Screenshot saved as whatsapp_qr_test.png"
else
  echo "ERROR: Generate QR Code button not found!"
  agent-browser --session whatsapp_test snapshot -i
fi

# Check for error messages or QR code using eval
ERROR_TEXT=$(agent-browser --session whatsapp_test eval "Array.from(document.querySelectorAll('*')).filter(el => el.textContent && (el.textContent.toLowerCase().includes('evolution') || el.textContent.toLowerCase().includes('qr') || el.textContent.toLowerCase().includes('error'))).map(el => el.textContent.trim()).filter(text => text.length > 0).join('\n')")
echo "Found text with keywords:"
echo "$ERROR_TEXT"

agent-browser --session whatsapp_test close
  exit 1
fi

# Navigate to WhatsApp settings
agent-browser --session whatsapp_test open http://localhost:5173/admin/whatsapp

# Wait for page load
agent-browser --session whatsapp_test wait 3000

# Check current URL again
CURRENT_URL=$(agent-browser --session whatsapp_test get url)
echo "Current URL at WhatsApp settings: $CURRENT_URL"

if [[ $CURRENT_URL == *"login"* ]]; then
  echo "Access denied to WhatsApp settings, redirected to login"
  agent-browser --session whatsapp_test close
  exit 1
fi

# Take a screenshot to see the page
agent-browser --session whatsapp_test screenshot whatsapp_page.png

# Check if Generate QR Code button is visible using eval
echo "Checking for Generate QR Code button..."
BUTTON_EXISTS=$(agent-browser --session whatsapp_test eval "!!document.querySelector('button, [role=\"button\"]').textContent.includes('Generate QR Code')")
echo "Button exists: $BUTTON_EXISTS"

if [ "$BUTTON_EXISTS" = "true" ]; then
  echo "Generate QR Code button found"
  # Click the button using eval
  agent-browser --session whatsapp_test eval "Array.from(document.querySelectorAll('button, [role=\"button\"]')).find(btn => btn.textContent.includes('Generate QR Code')).click()"
  # Wait for QR code or response
  agent-browser --session whatsapp_test wait 2000
  # Take screenshot
  agent-browser --session whatsapp_test screenshot whatsapp_qr_test.png
  echo "Screenshot saved as whatsapp_qr_test.png"
else
  echo "ERROR: Generate QR Code button not found!"
  agent-browser --session whatsapp_test snapshot -i
fi

# Check for error messages or QR code using eval
ERROR_TEXT=$(agent-browser --session whatsapp_test eval "Array.from(document.querySelectorAll('*')).filter(el => el.textContent && (el.textContent.includes('evolution') || el.textContent.includes('QR') || el.textContent.includes('error'))).map(el => el.textContent).join('\n')")
echo "Found text with keywords:"
echo "$ERROR_TEXT"

agent-browser --session whatsapp_test close