#!/bin/bash

# Ensure required packages are installed
pkg update
pkg install -y nodejs qrencode termux-api jq

# Ensure the script exists
WALLET_SCRIPT="createWalletWithSalt.js"

# Generate salt based on device characteristics
DEVICE_MODEL=$(getprop ro.product.model)
RAM=$(free -h | awk '/Mem:/ {print $2}')
STORAGE=$(df -h / | awk '/\// {print $2}')

# Improved CPU detection
CPU=$(cat /proc/cpuinfo | grep -m 1 "Hardware" | cut -d: -f2 | sed 's/^[[:space:]]*//')
if [ -z "$CPU" ]; then
    CPU=$(cat /proc/cpuinfo | grep -m 1 "model name" | cut -d: -f2 | sed 's/^[[:space:]]*//')
fi
if [ -z "$CPU" ]; then
    CPU="Unknown"
fi

# Create a deterministic salt from device details
SALT=$(echo "$DEVICE_MODEL$RAM$STORAGE$CPU" | md5sum | cut -d' ' -f1)

# Prepare device details string for bytes32 conversion
DEVICE_BYTES32=$(printf "%s%s%s%s" "$DEVICE_MODEL" "$RAM" "$STORAGE" "$CPU" | xxd -p -c 32 | head -n 1)

# Generate wallet
WALLET_OUTPUT=$(node "$WALLET_SCRIPT" "$SALT")

# Extract wallet details
WALLET_ADDRESS=$(echo "$WALLET_OUTPUT" | grep "Address:" | cut -d: -f2 | tr -d ' ')
PRIVATE_KEY=$(echo "$WALLET_OUTPUT" | grep "Private Key:" | cut -d: -f2 | tr -d ' ')
MNEMONIC=$(echo "$WALLET_OUTPUT" | grep "Mnemonic" | sed -E 's/.*\((12|24) words\): //')

# Sign the device details bytes32
SIGNATURE_OUTPUT=$(node "$WALLET_SCRIPT" "$SALT" --sign "$DEVICE_BYTES32")
SIGNATURE=$(echo "$SIGNATURE_OUTPUT" | grep "Signature:" | cut -d: -f2 | tr -d ' ')

# Ngrok mock link
NGROK_LINK="https://12ab-123-456-789-123.ngrok.app"

# URL encode the parameters
ENCODED_DEVICE_MODEL=$(printf "%s" "$DEVICE_MODEL" | jq -sRr @uri)
ENCODED_RAM=$(printf "%s" "$RAM" | jq -sRr @uri)
ENCODED_STORAGE=$(printf "%s" "$STORAGE" | jq -sRr @uri)
ENCODED_CPU=$(printf "%s" "$CPU" | jq -sRr @uri)
ENCODED_SIGNATURE=$(printf "%s" "$SIGNATURE" | jq -sRr @uri)

# Construct the full URL with URL-encoded parameters
FULL_URL="https://franky-six.vercel.app/deploy-device?deviceModel=${ENCODED_DEVICE_MODEL}&ram=${ENCODED_RAM}&storage=${ENCODED_STORAGE}&cpu=${ENCODED_CPU}&ngrokLink=${NGROK_LINK}&walletAddress=${WALLET_ADDRESS}&bytes32Data=${DEVICE_BYTES32}&signature=${ENCODED_SIGNATURE}"

# Print out all details for verification
echo "=== Wallet Details ==="
echo "Salt: $SALT"
echo "Address: $WALLET_ADDRESS"
echo "Private Key: $PRIVATE_KEY"
echo "Mnemonic: $MNEMONIC"
echo

echo "=== Device Details ==="
echo "Device Model: $DEVICE_MODEL"
echo "RAM: $RAM"
echo "Storage: $STORAGE"
echo "CPU: $CPU"
echo "Bytes32 Data: $DEVICE_BYTES32"
echo

echo "=== Signature Details ==="
echo "Signature: $SIGNATURE"
echo

echo "=== Generated URL ==="
echo "$FULL_URL"
echo

# Generate QR Code
qrencode -o qr_code.png -s 10 "$FULL_URL"

# Share the QR code using Termux:API
termux-share qr_code.png