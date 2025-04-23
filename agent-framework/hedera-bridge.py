#!/usr/bin/env python3
import os
import json
import logging
import sys
from datetime import datetime
from hedera import (
    Client,
    AccountId,
    PrivateKey,
    AccountBalanceQuery,
    Hbar,
    HbarUnit
)
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("hedera_bridge.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def get_balance(account_id=None):
    """Get HBAR balance for specified or default account"""
    try:
        load_dotenv()
        
        # Required configuration
        account_id = account_id or os.getenv('HEDERA_ACCOUNT_ID')
        private_key = os.getenv('HEDERA_PRIVATE_KEY')
        network = os.getenv('HEDERA_NETWORK_TYPE', 'testnet')
        
        # Validate inputs
        if not account_id or not private_key:
            raise ValueError("Missing required environment variables")
        
        # Initialize client
        client = Client.forName(network)
        client.setOperator(
            AccountId.fromString(account_id),
            PrivateKey.fromString(private_key)
        )
        
        # Execute query
        balance = AccountBalanceQuery(
        ).setAccountId(AccountId.fromString(account_id)
        ).execute(client)
        
        return {
            "status": "success",
            "balance": balance.hbars.to(HbarUnit.Hbar).value,
            "unit": "HBAR",
            "accountId": account_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Balance check failed: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "code": type(e).__name__,
            "timestamp": datetime.utcnow().isoformat()
        }

if __name__ == "__main__":
    # Get account ID from command line or use default
    account_id = None
    if len(sys.argv) > 1:
        account_id = sys.argv[1]
    
    result = get_balance(account_id)
    print(json.dumps(result, indent=2))