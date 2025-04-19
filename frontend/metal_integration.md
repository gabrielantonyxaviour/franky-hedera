Get Tokens
Retrieve a list of all tokens for a merchant, including supply allocations and price.

GET
api.metal.build/merchant/all-tokens
List all tokens
This endpoint returns an array of all tokens associated with your merchant account.

Response attributes

Name
id
Type
string
Description
The id of the token.
Name
address
Type
string
Description
The contract address of the token.
Name
name
Type
string
Description
The name of the token.
Name
symbol
Type
string
Description
The ticker symbol of the token.
Name
totalSupply
Type
number
Description
Total token supply.
Name
startingAppSupply
Type
number
Description
Available supply for distribution.
Name
remainingAppSupply
Type
number
Description
Remaining supply for distribution.
Name
merchantSupply
Type
number
Description
The amount allocated to the merchant.
Name
merchantAddress
Type
string
Description
The address of the merchant.
Name
price
Type
number
Description
Current price of the token in USD.
Request
JavaScript
cURL
GET
api.metal.build/merchant/all-tokens
const response = await fetch(
  'https://api.metal.build/merchant/all-tokens',
  {
    headers: {
      'x-api-key': 'YOUR-API-KEY',
    },
})

const tokens = await response.json()

Copy
Copied!
Response
{
  [
    {
      id: "0x1234567890abcdef1234567890abcdef12345678",
      address: "0x1234567890abcdef1234567890abcdef12345678",
      name: "Test Token",
      symbol: "TEST",
      totalSupply: 1000000000,
      startingAppSupply: 100000000,
      remainingAppSupply: 99999000,
      merchantSupply: 100000000,
      merchantAddress: "0x1234567890abcdef1234567890abcdef12345678",
      price: 0.015,
    },
    {
      id: "0x9876543210fedcba9876543210fedcba98765432",
      address: "0x9876543210fedcba9876543210fedcba98765432",
      name: "Test Token 2",
      symbol: "TEST2",
      totalSupply: 1000000000,
      startingAppSupply: 200000000,
      remainingAppSupply: 199999000,
      merchantSupply: 200000000,
      merchantAddress: "0x9876543210fedcba9876543210fedcba98765432",
      price: 0.025,
    }
  ],
}




Get Or Create Holder
Get Or Create a holder for your organization. Holder wallets can be created for your customers with an external id of your choice.

PUT
api.metal.build/holder/:userId
Get Or Create a Holder
This endpoint allows you to Get Or Create a holder with an external id of your choice.

Required attributes

Name
userId
Type
string
Description
The external id for your holder (e.g., "1234567890").
Request
JavaScript
cURL
PUT
api.metal.build/holder/:userId
const response = await fetch(`https://api.metal.build/holder/${userId}`, {
method: 'PUT',
headers: {
  'Content-Type': 'application/json',
  'x-api-key': 'YOUR-API-KEY',
  },
})

const holder = await response.json()

Copy
Copied!
Response
{
  "success": true,
  "id": "1234567890",
  "address": "0x38A7ff01f9A2318feA8AafBa379a6c2c18b5d1dc",
  "totalValue": 0,
  "tokens": []
}

Copy
Copied!
Was this page helpful?
Yes
No