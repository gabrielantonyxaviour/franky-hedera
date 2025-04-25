# HCS Implementation Setup & Testing Checklist

## Initial Setup

- [ ] Set up Hedera credentials
  - Create a Hedera Portal account at [portal.hedera.com](https://portal.hedera.com)
  - Create a testnet account and note your Account ID and Private Key
  - Copy `.env.local.example` to `.env.local`
  - Enter your Hedera credentials in `.env.local`

- [ ] Install dependencies
  ```bash
  cd frontend
  npm install
  ```

- [ ] Run the development server
  ```bash
  npm run dev
  ```

## Testing Checker Registration & Dashboard

- [ ] Register a checker node through the API
  ```bash
  curl -X POST http://localhost:3000/api/register-checker \
    -H "Content-Type: application/json" \
    -d '{"walletAddress":"0xYourWalletAddress","serverUrl":"https://your-checker-service.com"}'
  ```

- [ ] Verify registration by listing checkers
  ```bash
  curl http://localhost:3000/api/register-checker
  ```

- [ ] Navigate to `/checker-dashboard` in your browser
- [ ] Confirm registered checkers appear in the dashboard

## Testing Device Checking

- [ ] Run the HCS check script
  ```bash
  npm run check-hcs
  ```

- [ ] Manually check a device via API
  ```bash
  curl "http://localhost:3000/api/device-checker?deviceAddress=0xYourDeviceAddress&numRetrievals=5"
  ```

- [ ] Navigate to `/device-checker` in your browser
- [ ] Search for and verify device reputation results

## Using the Self-Check Feature

- [ ] Navigate to the `/device-checker` page
- [ ] Search for devices to load them in the interface
- [ ] Click the "Run Self-Check" button to perform self-checks
- [ ] Verify that the self-check results are submitted to HCS 
- [ ] Wait a few seconds for the reputation scores to update
- [ ] Refresh the page to see the updated reputation scores

- [ ] Test the self-check API directly
  ```bash
  curl -X POST http://localhost:3000/api/self-check \
    -H "Content-Type: application/json" \
    -d '{"deviceAddresses":["0xDeviceAddress1", "0xDeviceAddress2"]}'
  ```

## Testing Consensus Process

- [ ] Set up multiple checker nodes (at least 3 for meaningful consensus)
- [ ] Submit test check results from each checker
  ```bash
  curl -X POST http://localhost:3000/api/checker-tasks \
    -H "Content-Type: application/json" \
    -d '{
      "checkerAddress":"0xYourCheckerAddress",
      "deviceId":"0xDeviceAddress",
      "metrics":{
        "availability":{"uptime":95,"responseTime":150},
        "performance":{"throughput":80,"errorRate":0.02},
        "security":{"certificateValid":true}
      }
    }'
  ```

- [ ] Verify consensus calculation by retrieving device reputation
  ```bash
  curl "http://localhost:3000/api/device-checker?deviceAddress=0xDeviceAddress"
  ```

## Troubleshooting

If you encounter issues:

1. Check Hedera connection issues:
   - Verify your account has enough HBAR for transactions
   - Ensure your private key has the correct format

2. Check console logs for errors in:
   - Topic creation
   - Message submission
   - Client initialization

3. Confirm HCS topics are being created:
   - Look for "Creating device registry topic..." messages in console
   - The first time you interact with the system, topics will be created automatically

4. Self-check troubleshooting:
   - If self-check is failing, check the network connectivity to device endpoints
   - Verify that the HCS service has been properly initialized with topics
   - Check browser console for detailed error messages 