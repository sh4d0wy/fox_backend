# API Routes Testing Documentation

Base URL: `http://localhost:3000`

---

## Health Check

### GET /health
**Headers:** None  
**Payload:** None  
**Expected Response:**
```
ok
```

---

## User Routes (`/api/user`)

### Authentication

#### GET /api/user/auth/request-message/:publicKey
**Description:** Request a message to sign for authentication  
**Headers:** None  
**Payload:** None  
**Example:**
```
GET /api/user/auth/request-message/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Sign this message to authenticate with Raffle Platform.\n\nWallet: 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM\n\nNonce: abc123def456..."
  }
}
```

---

#### POST /api/user/auth/verify
**Description:** Verify signed message and authenticate  
**Headers:** None  
**Payload:**
```json
{
  "publicKey": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "signature": "3xDmB...signatureHere...",
  "message": "Sign this message to authenticate..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Signature verified",
    "error": null,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "twitterId": null,
      "twitterConnected": false,
      "createdAt": "2025-12-24T12:00:00.000Z"
    }
  }
}
```

---

#### POST /api/user/auth/refresh
**Description:** Refresh authentication token  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:** None  
**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### GET /api/user/auth/twitter/:walletAddress
**Description:** Initiate Twitter OAuth authentication  
**Headers:** None  
**Payload:** None  
**Example:**
```
GET /api/user/auth/twitter/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
```
**Expected Response:** Redirects to Twitter OAuth page

---

### Profile Routes

#### GET /api/user/profile/me
**Description:** Get authenticated user's own profile  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:** None  
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Profile fetched successfully",
    "user": {
      "id": 1,
      "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "twitterId": "@username",
      "twitterConnected": true,
      "createdAt": "2025-12-24T12:00:00.000Z"
    }
  }
}
```

---

#### GET /api/user/profile/:walletAddress done
**Description:** Get user profile by wallet address (public)  
**Headers:** None  
**Payload:** None  
**Example:**
```
GET /api/user/profile/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "User profile fetched successfully",
    "user": {
      "id": 1,
      "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "twitterId": "@username",
      "twitterConnected": true,
      "createdAt": "2025-12-24T12:00:00.000Z"
    }
  }
}
```

---

### Raffle Profile Data
DONE
#### GET /api/user/profile/:walletAddress/raffles/created 
**Description:** Get raffles created by user  
**Headers:** None  
**Query Params:** `page`, `limit`, `sortBy`, `order`  
**Example:**
```
GET /api/user/profile/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/raffles/created?page=1&limit=10
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Raffles created fetched successfully",
    "raffles": [
      {
        "id": 1,
        "raffle": "RafflePDA...",
        "createdBy": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "ticketPrice": 0.5,
        "ticketSupply": 100,
        "ticketSold": 25,
        "state": "Active",
        "endsAt": "2025-12-31T23:59:59.000Z",
        "prizeData": {
          "name": "Cool NFT",
          "image": "https://...",
          "collection": "Cool Collection"
        },
        "_count": {
          "raffleEntries": 10
        }
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 10
  }
}
```

---
DONE
#### GET /api/user/profile/:walletAddress/raffles/purchased
**Description:** Get raffles purchased by user  
**Headers:** None  
**Query Params:** `page`, `limit`, `sortBy`, `order`  
**Example:**
```
GET /api/user/profile/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/raffles/purchased?page=1&limit=10
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Raffles purchased fetched successfully",
    "raffles": [
      {
        "id": 2,
        "raffle": "RafflePDA...",
        "ticketPrice": 0.5,
        "ticketSupply": 100,
        "state": "Active",
        "ticketsBought": 5,
        "isWinner": false,
        "prizeData": {
          "name": "Cool NFT",
          "image": "https://..."
        },
        "creator": {
          "walletAddress": "CreatorWallet...",
          "twitterId": "@creator"
        }
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 10
  }
}
```

---
DONE
#### GET /api/user/profile/:walletAddress/raffles/favourites
**Description:** Get favourite raffles  
**Headers:** None  
**Query Params:** `page`, `limit`  
**Example:**
```
GET /api/user/profile/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/raffles/favourites
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Favourite raffles fetched successfully",
    "raffles": [
      {
        "id": 1,
        "raffle": "RafflePDA...",
        "ticketPrice": 0.5,
        "prizeData": {
          "name": "Cool NFT"
        },
        "creator": {
          "walletAddress": "...",
          "twitterId": "@creator"
        }
      }
    ]
  }
}
```

---
DONE
#### GET /api/user/profile/:walletAddress/raffles/stats
**Description:** Get raffle stats for user  
**Headers:** None  
**Example:**
```
GET /api/user/profile/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/raffles/stats
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Raffle stats fetched successfully",
    "stats": {
      "rafflesBought": 15,
      "ticketsBought": 75,
      "rafflesWon": 2,
      "purchaseVolume": 37.5
    }
  }
}
```

---

### Auction Profile Data

#### GET /api/user/profile/:walletAddress/auctions/created
**Description:** Get auctions created by user  
**Headers:** None  
**Query Params:** `page`, `limit`, `sortBy`, `order`  
**Example:**
```
GET /api/user/profile/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/auctions/created
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Auctions created fetched successfully",
    "auctions": [
      {
        "id": 1,
        "createdBy": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "prizeMint": "NFTMint...",
        "prizeName": "Rare NFT",
        "prizeImage": "https://...",
        "status": "ACTIVE",
        "highestBidAmount": "5000000000",
        "_count": {
          "bids": 10
        }
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 10
  }
}
```

---

#### GET /api/user/profile/:walletAddress/auctions/participated
**Description:** Get auctions participated by user  
**Headers:** None  
**Query Params:** `page`, `limit`  
**Example:**
```
GET /api/user/profile/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/auctions/participated
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Auctions participated fetched successfully",
    "auctions": [
      {
        "id": 2,
        "prizeName": "Rare NFT",
        "status": "ACTIVE",
        "userHighestBid": "6000000000",
        "isHighestBidder": true,
        "creator": {
          "walletAddress": "...",
          "twitterId": "@creator"
        }
      }
    ],
    "page": 1,
    "limit": 10
  }
}
```

---

#### GET /api/user/profile/:walletAddress/auctions/favourites
**Description:** Get favourite auctions  
**Headers:** None  
**Query Params:** `page`, `limit`  
**Example:**
```
GET /api/user/profile/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/auctions/favourites
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Favourite auctions fetched successfully",
    "auctions": [
      {
        "id": 1,
        "prizeName": "Rare NFT",
        "creator": {
          "walletAddress": "...",
          "twitterId": "@creator"
        }
      }
    ]
  }
}
```

---

#### GET /api/user/profile/:walletAddress/auctions/stats
**Description:** Get auction stats for user  
**Headers:** None  
**Example:**
```
GET /api/user/profile/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/auctions/stats
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Auction stats fetched successfully",
    "stats": {
      "auctionsParticipated": 8,
      "totalBids": 25,
      "auctionsWon": 3,
      "totalVolumeBid": 150.5
    }
  }
}
```

---

### Gumball Profile Data

#### GET /api/user/profile/:walletAddress/gumballs/created
**Description:** Get gumballs created by user  
**Headers:** None  
**Query Params:** `page`, `limit`, `sortBy`, `order`  
**Example:**
```
GET /api/user/profile/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/gumballs/created
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Gumballs created fetched successfully",
    "gumballs": [
      {
        "id": 1,
        "name": "Lucky Gumball",
        "status": "ACTIVE",
        "ticketsSold": 50,
        "totalTickets": 100,
        "prizes": [],
        "_count": {
          "spins": 50
        }
      }
    ],
    "total": 2,
    "page": 1,
    "limit": 10
  }
}
```

---

#### GET /api/user/profile/:walletAddress/gumballs/purchased
**Description:** Get gumballs purchased by user  
**Headers:** None  
**Query Params:** `page`, `limit`  
**Example:**
```
GET /api/user/profile/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/gumballs/purchased
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Gumballs purchased fetched successfully",
    "gumballs": [
      {
        "id": 2,
        "name": "Lucky Gumball",
        "userSpins": 1,
        "lastPrizeWon": {
          "name": "BONK Token",
          "prizeAmount": "100000000"
        },
        "creator": {
          "walletAddress": "...",
          "twitterId": "@creator"
        }
      }
    ],
    "page": 1,
    "limit": 10
  }
}
```

---

#### GET /api/user/profile/:walletAddress/gumballs/stats
**Description:** Get gumball stats for user  
**Headers:** None  
**Example:**
```
GET /api/user/profile/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM/gumballs/stats
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Gumball stats fetched successfully",
    "stats": {
      "gumballsParticipated": 5,
      "totalSpins": 20,
      "prizesWon": 20,
      "totalVolumeSpent": 2.5
    }
  }
}
```

---

### Favourites Management
DONE
#### POST /api/user/favourites/raffle/:raffleId
**Description:** Toggle favourite raffle  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:** None  
**Example:**
```
POST /api/user/favourites/raffle/123
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Added to favourites",
    "isFavourite": true
  }
}
```

---

#### POST /api/user/favourites/auction/:auctionId
**Description:** Toggle favourite auction  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:** None  
**Example:**
```
POST /api/user/favourites/auction/456
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Removed from favourites",
    "isFavourite": false
  }
}
```

---

## Raffle Routes (`/api/raffle`)

#### GET /api/raffle/
**Description:** Get all raffles  
**Headers:** None  
**Query Params:** `page` (required), `limit` (required)  
**Example:**
```
GET /api/raffle/?page=1&limit=10
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Raffles fetched successfully",
    "error": null,
    "raffles": [
      {
        "id": 1,
        "raffle": "RafflePDA...",
        "createdBy": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "createdAt": "2025-12-24T12:00:00.000Z",
        "endsAt": "2025-12-31T23:59:59.000Z",
        "ticketPrice": 0.5,
        "ticketSupply": 100,
        "ticketSold": 25,
        "state": "Active",
        "prizeData": {
          "id": 1,
          "type": "NFT",
          "name": "Cool NFT",
          "image": "https://...",
          "collection": "Cool Collection"
        }
      }
    ]
  }
}
```

---

#### GET /api/raffle/rafflebyuser
**Description:** Get raffles by authenticated user  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:** None  
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Raffles fetched successfully",
    "error": null,
    "raffles": [
      {
        "id": 1,
        "raffle": "RafflePDA...",
        "createdBy": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "ticketPrice": 0.5,
        "ticketSupply": 100,
        "state": "Active"
      }
    ]
  }
}
```

---

#### GET /api/raffle/:raffleId
**Description:** Get raffle details  
**Headers:** None  
**Payload:** None  
**Example:**
```
GET /api/raffle/123
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Raffle fetched successfully",
    "error": null,
    "raffle": {
      "id": 123,
      "raffle": "RafflePDA...",
      "createdBy": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "createdAt": "2025-12-24T12:00:00.000Z",
      "endsAt": "2025-12-31T23:59:59.000Z",
      "ticketPrice": 0.5,
      "ticketSupply": 100,
      "ticketSold": 25,
      "state": "Active",
      "numberOfWinners": 1,
      "winnerPicked": false,
      "claimed": 0,
      "prizeData": {
        "id": 1,
        "type": "NFT",
        "name": "Cool NFT",
        "image": "https://...",
        "collection": "Cool Collection",
        "floor": 10.0
      },
      "raffleEntries": [
        {
          "id": 1,
          "userAddress": "BuyerWallet...",
          "quantity": 5,
          "transactions": []
        }
      ],
      "winners": [
        {
          "walletAddress": "WinnerWallet...",
          "twitterId": "@winner"
        }
      ],
      "favouritedBy": []
    }
  }
}
```

---

#### GET /api/raffle/winners/claim/:raffleId
**Description:** Get winners who claimed prizes  
**Headers:** None  
**Payload:** None  
**Example:**
```
GET /api/raffle/winners/claim/123
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Winners data fetched successfully",
    "error": null,
    "prizesClaimed": [
      {
        "sender": "WinnerWallet1..."
      },
      {
        "sender": "WinnerWallet2..."
      }
    ]
  }
}
```

---

#### POST /api/raffle/create
**Description:** Create a new raffle  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "createdBy": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "endsAt": "2025-12-31T23:59:59.000Z",
  "ticketPrice": 0.5,
  "ticketSupply": 100,
  "ticketTokenAddress": "So11111111111111111111111111111111111111112",
  "floor": 10.0,
  "val": 15.0,
  "ttv": 50.0,
  "roi": 2.5,
  "maxEntries": 10,
  "numberOfWinners": 1,
  "prizeData": {
    "type": "NFT",
    "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    "mintAddress": "NFTMintAddress123...",
    "mint": "NFTMintAddress123...",
    "name": "Cool NFT #123",
    "verified": true,
    "symbol": "CNFT",
    "decimals": 0,
    "image": "https://example.com/nft-image.png",
    "attributes": [],
    "collection": "Cool NFT Collection",
    "creator": "CreatorAddress123...",
    "description": "A cool NFT for raffle",
    "externalUrl": "https://example.com",
    "properties": {},
    "amount": 1,
    "floor": 10.0
  }
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Raffle creation initiated successfully",
    "error": null,
    "raffle": {
      "id": 1,
      "raffle": null,
      "createdBy": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "createdAt": "2025-12-24T12:00:00.000Z",
      "endsAt": "2025-12-31T23:59:59.000Z",
      "ticketPrice": 0.5,
      "ticketSupply": 100,
      "ticketSold": 0,
      "state": "Temporary",
      "prizeData": {
        "id": 1,
        "type": "NFT",
        "name": "Cool NFT #123"
      }
    }
  }
}
```

---

#### POST /api/raffle/confirm/:raffleId
**Description:** Confirm raffle creation after on-chain transaction  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Raffle creation confirmed successfully",
    "error": null,
    "raffleId": 123
  }
}
```

---

#### POST /api/raffle/cancel/:raffleId
**Description:** Cancel a raffle  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Raffle cancelled successfully",
    "error": null,
    "raffleId": 123
  }
}
```

---

#### POST /api/raffle/buy/:raffleId
**Description:** Buy raffle tickets  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "quantity": 5,
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Ticket bought successfully",
    "error": null,
    "raffleId": 123
  }
}
```

---

#### POST /api/raffle/claim/:raffleId
**Description:** Claim raffle prize  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Prize claimed successfully",
    "error": null,
    "raffleId": 123
  }
}
```

---

#### DELETE /api/raffle/delete/:raffleId
**Description:** Delete a raffle  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:** None  
**Example:**
```
DELETE /api/raffle/delete/123
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Raffle deleted successfully",
    "error": null,
    "raffleId": 123
  }
}
```

---

## Auction Routes (`/api/auction`)
DONE
#### GET /api/auction/
**Description:** Get all auctions  
**Headers:** None  
**Query Params:** `page` (required), `limit` (required)  
**Example:**
```
GET /api/auction/?page=1&limit=10
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Auctions fetched successfully",
    "error": null,
    "auctions": [
      {
        "id": 1,
        "createdBy": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "prizeMint": "NFTMint...",
        "prizeName": "Rare NFT",
        "prizeImage": "https://...",
        "status": "ACTIVE",
        "startsAt": "2025-12-24T00:00:00.000Z",
        "endsAt": "2025-12-31T23:59:59.000Z",
        "highestBidAmount": "5000000000",
        "hasAnyBid": true,
        "bids": [
          {
            "id": 1,
            "bidAmount": "5000000000",
            "bidTime": "2025-12-24T10:00:00.000Z"
          }
        ]
      }
    ]
  }
}
```

---
DONE
#### GET /api/auction/auctionbyuser
**Description:** Get auctions by authenticated user  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:** None  
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Auctions fetched successfully",
    "error": null,
    "auctions": [
      {
        "id": 1,
        "prizeName": "Rare NFT",
        "status": "ACTIVE",
        "highestBidAmount": "5000000000",
        "bids": []
      }
    ]
  }
}
```

---

#### GET /api/auction/bidsbyuser
**Description:** Get bids by authenticated user  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:** None  
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Bids fetched successfully",
    "error": null,
    "bids": [
      {
        "id": 1,
        "auctionId": 1,
        "bidAmount": "6000000000",
        "bidTime": "2025-12-24T12:00:00.000Z",
        "auction": {
          "id": 1,
          "prizeName": "Rare NFT",
          "status": "ACTIVE"
        }
      }
    ]
  }
}
```

---
DONE
#### GET /api/auction/:auctionId
**Description:** Get auction details  
**Headers:** None  
**Payload:** None  
**Example:**
```
GET /api/auction/456
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Auction fetched successfully",
    "error": null,
    "auction": {
      "id": 456,
      "createdBy": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "prizeMint": "NFTMint...",
      "prizeName": "Rare NFT",
      "prizeImage": "https://...",
      "collectionName": "Rare Collection",
      "collectionVerified": true,
      "floorPrice": 25.5,
      "status": "ACTIVE",
      "startsAt": "2025-12-24T00:00:00.000Z",
      "endsAt": "2025-12-31T23:59:59.000Z",
      "reservePrice": "5000000000",
      "highestBidAmount": "6000000000",
      "hasAnyBid": true,
      "bids": [
        {
          "id": 1,
          "bidAmount": "6000000000",
          "bidTime": "2025-12-24T12:00:00.000Z",
          "bidder": {
            "walletAddress": "BidderWallet...",
            "twitterId": "@bidder"
          }
        }
      ],
      "highestBidder": {
        "walletAddress": "BidderWallet...",
        "twitterId": "@bidder"
      },
      "creator": {
        "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "twitterId": "@creator"
      },
      "favouritedBy": []
    }
  }
}
```

---
DONE
#### POST /api/auction/create
**Description:** Create a new auction  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "createdBy": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "prizeMint": "NFTMintAddress123...",
  "prizeName": "Rare NFT #456",
  "prizeImage": "https://example.com/nft-image.png",
  "collectionName": "Rare Collection",
  "collectionVerified": true,
  "floorPrice": 25.5,
  "traits": {},
  "details": {},
  "startsAt": "2025-12-24T00:00:00.000Z",
  "endsAt": "2025-12-31T23:59:59.000Z",
  "timeExtension": 300,
  "reservePrice": "5000000000",
  "currency": "SOL",
  "bidIncrementPercent": 5,
  "payRoyalties": true,
  "royaltyPercentage": 5,
  "auctionPda": "AuctionPdaAddress...",
  "auctionBump": 255,
  "bidEscrow": "BidEscrowAddress..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Auction creation initiated successfully",
    "error": null,
    "auction": {
      "id": 1,
      "createdBy": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "prizeMint": "NFTMintAddress123...",
      "prizeName": "Rare NFT #456",
      "status": "NONE",
      "hasAnyBid": false,
      "highestBidAmount": "0"
    }
  }
}
```

---
DONE
#### POST /api/auction/confirm/:auctionId
**Description:** Confirm auction creation after on-chain transaction  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Auction creation confirmed successfully",
    "error": null,
    "auctionId": 456
  }
}
```

---
DONE
#### POST /api/auction/cancel/:auctionId
**Description:** Cancel an auction  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Auction cancelled successfully",
    "error": null,
    "auctionId": 456
  }
}
```

---
DONE
#### POST /api/auction/bid/:auctionId
**Description:** Place a bid on an auction  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "bidAmount": "10000000000",
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Bid placed successfully",
    "error": null,
    "auctionId": 456
  }
}
```

---

#### POST /api/auction/claim/:auctionId
**Description:** Claim auction prize  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Auction claim successful",
    "error": null,
    "auctionId": 456
  }
}
```

---
DONE
#### DELETE /api/auction/delete/:auctionId
**Description:** Delete an auction  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:** None  
**Example:**
```
DELETE /api/auction/delete/456
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Auction deleted successfully",
    "error": null,
    "auctionId": 456
  }
}
```

---

## Gumball Routes (`/api/gumball`)

### Public Routes

#### GET /api/gumball/
**Description:** Get all gumballs  
**Headers:** None  
**Query Params:** `page` (required), `limit` (required)  
**Example:**
```
GET /api/gumball/?page=1&limit=10
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Gumballs fetched successfully",
    "error": null,
    "gumballs": [
      {
        "id": 1,
        "name": "Lucky Gumball Machine",
        "creatorAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "status": "ACTIVE",
        "totalTickets": 1000,
        "ticketsSold": 250,
        "ticketPrice": "100000000",
        "totalPrizeValue": "50000000000",
        "totalProceeds": "25000000000",
        "maxProceeds": "100000000000",
        "prizes": [],
        "_count": {
          "spins": 250
        }
      }
    ]
  }
}
```

---

#### GET /api/gumball/:gumballId
**Description:** Get gumball details  
**Headers:** None  
**Payload:** None  
**Example:**
```
GET /api/gumball/789
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Gumball fetched successfully",
    "error": null,
    "gumball": {
      "id": 789,
      "name": "Lucky Gumball Machine",
      "creatorAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "status": "ACTIVE",
      "startTime": "2025-12-24T00:00:00.000Z",
      "endTime": "2025-12-31T23:59:59.000Z",
      "totalTickets": 1000,
      "ticketsSold": 250,
      "ticketPrice": "100000000",
      "totalPrizeValue": "50000000000",
      "uniqueBuyers": 50,
      "prizes": [
        {
          "id": 1,
          "prizeIndex": 0,
          "isNft": false,
          "mint": "TokenMint...",
          "name": "BONK Token",
          "symbol": "BONK",
          "totalAmount": "1000000000000",
          "prizeAmount": "100000000",
          "quantity": 10,
          "quantityClaimed": 3
        }
      ],
      "spins": [
        {
          "id": 1,
          "spinnerAddress": "SpinnerWallet...",
          "winnerAddress": "SpinnerWallet...",
          "claimed": false,
          "prizeAmount": "100000000",
          "spinner": {
            "walletAddress": "SpinnerWallet...",
            "twitterId": "@spinner"
          }
        }
      ],
      "creator": {
        "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "twitterId": "@creator"
      }
    }
  }
}
```

---

#### GET /api/gumball/:gumballId/stats
**Description:** Get gumball statistics  
**Headers:** None  
**Payload:** None  
**Example:**
```
GET /api/gumball/789/stats
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Gumball stats fetched successfully",
    "error": null,
    "stats": {
      "prizesLoaded": "75 / 100",
      "totalPrizeValue": "50000000000",
      "maxProceeds": "100000000000",
      "maxRoi": 0.5,
      "ticketsSold": 250,
      "totalTickets": 1000,
      "uniqueBuyers": 50,
      "totalProceeds": "25000000000",
      "buyBackCount": 10,
      "buyBackProfit": "1000000000",
      "status": "ACTIVE",
      "startTime": "2025-12-24T00:00:00.000Z",
      "endTime": "2025-12-31T23:59:59.000Z"
    }
  }
}
```

---

### User-Specific Routes

#### GET /api/gumball/user/gumballs
**Description:** Get gumballs by authenticated user  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:** None  
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Gumballs fetched successfully",
    "error": null,
    "gumballs": [
      {
        "id": 1,
        "name": "My Gumball Machine",
        "status": "ACTIVE",
        "ticketPrice": "100000000",
        "totalPrizeValue": "50000000000",
        "prizes": [],
        "_count": {
          "spins": 100
        }
      }
    ]
  }
}
```

---

#### GET /api/gumball/user/spins
**Description:** Get spins by authenticated user  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:** None  
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Spins fetched successfully",
    "error": null,
    "spins": [
      {
        "id": 1,
        "gumballId": 789,
        "spinnerAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "winnerAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "claimed": false,
        "prizeAmount": "100000000",
        "spunAt": "2025-12-24T12:00:00.000Z",
        "gumball": {
          "id": 789,
          "name": "Lucky Gumball",
          "ticketPrice": "100000000"
        },
        "prize": {
          "name": "BONK Token",
          "symbol": "BONK",
          "prizeAmount": "100000000"
        }
      }
    ]
  }
}
```

---

### Gumball Management
DONE
#### POST /api/gumball/create
**Description:** Create a new gumball machine  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "creatorAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "name": "Lucky Gumball Machine",
  "manualStart": false,
  "startTime": "2025-12-24T00:00:00.000Z",
  "endTime": "2025-12-31T23:59:59.000Z",
  "totalTickets": 1000,
  "ticketMint": "So11111111111111111111111111111111111111112",
  "ticketPrice": "100000000",
  "isTicketSol": true,
  "minPrizes": 2,
  "maxPrizes": 100,
  "buyBackEnabled": true,
  "buyBackPercentage": 50,
  "rentAmount": "1000000000"
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Gumball creation initiated successfully",
    "error": null,
    "gumball": {
      "id": 1,
      "name": "Lucky Gumball Machine",
      "creatorAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      "status": "NONE",
      "ticketPrice": "100000000",
      "maxProceeds": "100000000000",
      "totalPrizeValue": "0",
      "totalProceeds": "0",
      "buyBackProfit": "0",
      "rentAmount": "1000000000"
    }
  }
}
```

---
DONE
#### POST /api/gumball/confirm/:gumballId
**Description:** Confirm gumball creation after on-chain transaction  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Gumball creation confirmed successfully",
    "error": null,
    "gumballId": 789
  }
}
```

---

#### POST /api/gumball/activate/:gumballId
**Description:** Activate a gumball machine  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Gumball activated successfully",
    "error": null,
    "gumballId": 789
  }
}
```

---
DONE
#### POST /api/gumball/addprize/:gumballId
**Description:** Add a single prize to gumball  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "prizeIndex": 0,
  "isNft": false,
  "mint": "TokenMintAddress123...",
  "name": "BONK Token",
  "symbol": "BONK",
  "image": "https://example.com/bonk.png",
  "decimals": 5,
  "totalAmount": "1000000000000",
  "prizeAmount": "100000000",
  "quantity": 10,
  "floorPrice": "0",
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Prize added successfully",
    "error": null,
    "gumballId": 789
  }
}
```

---
DONE
#### POST /api/gumball/addprizes/:gumballId
**Description:** Add multiple prizes to gumball  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "prizes": [
    {
      "prizeIndex": 0,
      "isNft": false,
      "mint": "TokenMintAddress123...",
      "name": "BONK Token",
      "symbol": "BONK",
      "image": "https://example.com/bonk.png",
      "decimals": 5,
      "totalAmount": "1000000000000",
      "prizeAmount": "100000000",
      "quantity": 10,
      "floorPrice": "0"
    },
    {
      "prizeIndex": 1,
      "isNft": true,
      "mint": "NFTMintAddress456...",
      "name": "Cool NFT #123",
      "symbol": "CNFT",
      "image": "https://example.com/nft.png",
      "decimals": 0,
      "totalAmount": "1",
      "prizeAmount": "1",
      "quantity": 1,
      "floorPrice": "5000000000"
    }
  ],
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Prizes added successfully",
    "error": null,
    "gumballId": 789,
    "prizesAdded": 2
  }
}
```

---


#### POST /api/gumball/buyback/:gumballId
**Description:** Update buy back settings  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "buyBackEnabled": true,
  "buyBackPercentage": 75,
  "buyBackEscrow": "BuyBackEscrowAddress...",
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Buy back settings updated successfully",
    "error": null,
    "gumballId": 789
  }
}
```

---

#### POST /api/gumball/cancel/:gumballId
**Description:** Cancel a gumball machine  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Gumball cancelled successfully",
    "error": null,
    "gumballId": 789
  }
}
```

---

### User Actions

#### POST /api/gumball/spin/:gumballId
**Description:** Spin the gumball machine  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Spin successful",
    "error": null,
    "spin": {
      "spinId": 12345,
      "prizeId": 1,
      "prizeAmount": "100000000",
      "prizeName": "BONK Token",
      "prizeSymbol": "BONK",
      "prizeImage": "https://example.com/bonk.png",
      "prizeMint": "TokenMint...",
      "isNft": false
    }
  }
}
```

---

#### POST /api/gumball/claim/:gumballId
**Description:** Claim gumball prize  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:**
```json
{
  "spinId": 12345,
  "txSignature": "5KtP...transactionSignatureHere..."
}
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Prize claimed successfully",
    "error": null,
    "gumballId": 789
  }
}
```

---

#### DELETE /api/gumball/delete/:gumballId
**Description:** Delete a gumball machine  
**Headers:**  
- `Authorization`: Bearer <token>  
**Payload:** None  
**Example:**
```
DELETE /api/gumball/delete/789
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Gumball deleted successfully",
    "error": null,
    "gumballId": 789
  }
}
```

---

## Stats Routes (`/api/stats`)

### Leaderboard Routes

#### GET /api/stats/leaderboard/rafflers
**Description:** Get top rafflers (creators) leaderboard  
**Headers:** None  
**Query Params:**  
- `timeFilter`: `all` | `7d` | `30d` | `90d` | `1y`
- `sortBy`: `volume` | `raffles` | `tickets`
- `limit`: number
- `page`: number  
**Example:**
```
GET /api/stats/leaderboard/rafflers?timeFilter=30d&sortBy=volume&limit=10&page=1
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Top rafflers fetched successfully",
    "leaderboard": [
      {
        "rank": 1,
        "walletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "twitterId": "@topRaffler",
        "raffles": 25,
        "ticketsSold": 2500,
        "volume": 1250.5
      },
      {
        "rank": 2,
        "walletAddress": "AnotherWallet...",
        "twitterId": "@secondRaffler",
        "raffles": 18,
        "ticketsSold": 1800,
        "volume": 900.0
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 10
  }
}
```

---

#### GET /api/stats/leaderboard/buyers
**Description:** Get top buyers leaderboard  
**Headers:** None  
**Query Params:**  
- `timeFilter`: `all` | `7d` | `30d` | `90d` | `1y`
- `sortBy`: `volume` | `raffles` | `tickets` | `won`
- `limit`: number
- `page`: number  
**Example:**
```
GET /api/stats/leaderboard/buyers?timeFilter=7d&sortBy=won&limit=10&page=1
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Top buyers fetched successfully",
    "leaderboard": [
      {
        "rank": 1,
        "walletAddress": "TopBuyerWallet...",
        "twitterId": "@topBuyer",
        "raffles": 50,
        "tickets": 500,
        "won": 10,
        "volume": 250.0
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

---

#### GET /api/stats/leaderboard/collections
**Description:** Get hot collections (7 day trending)  
**Headers:** None  
**Query Params:**  
- `limit`: number  
**Example:**
```
GET /api/stats/leaderboard/collections?limit=10
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Hot collections fetched successfully",
    "collections": [
      {
        "rank": 1,
        "collection": "DeGods",
        "volume": 5000.5,
        "raffleCount": 25
      },
      {
        "rank": 2,
        "collection": "SMB",
        "volume": 3500.0,
        "raffleCount": 18
      }
    ]
  }
}
```

---

### Analytics Routes

#### GET /api/stats/analytics/volume
**Description:** Get volume analytics over time  
**Headers:** None  
**Query Params:**  
- `timeframe`: `day` | `week` | `month` | `year`  
**Example:**
```
GET /api/stats/analytics/volume?timeframe=month
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Volume analytics fetched successfully",
    "timeframe": "month",
    "data": [
      { "date": "2025-12-01", "value": 150.5 },
      { "date": "2025-12-02", "value": 200.0 },
      { "date": "2025-12-03", "value": 175.25 }
    ]
  }
}
```

---

#### GET /api/stats/analytics/raffles
**Description:** Get daily raffles count  
**Headers:** None  
**Query Params:**  
- `days`: number (default: 7)  
**Example:**
```
GET /api/stats/analytics/raffles?days=30
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Daily raffles fetched successfully",
    "data": [
      { "date": "2025-12-01", "value": 15 },
      { "date": "2025-12-02", "value": 22 },
      { "date": "2025-12-03", "value": 18 }
    ]
  }
}
```

---

#### GET /api/stats/analytics/purchases
**Description:** Get purchases statistics  
**Headers:** None  
**Query Params:**  
- `days`: number (default: 7)  
**Example:**
```
GET /api/stats/analytics/purchases?days=14
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Purchases stats fetched successfully",
    "data": [
      { "date": "2025-12-01", "ticketsSold": 150, "transactions": 75 },
      { "date": "2025-12-02", "ticketsSold": 200, "transactions": 90 }
    ]
  }
}
```

---

#### GET /api/stats/analytics/tickets
**Description:** Get average tickets sold per raffle  
**Headers:** None  
**Query Params:**  
- `timeframe`: `week` | `month` | `year`  
**Example:**
```
GET /api/stats/analytics/tickets?timeframe=month
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Average tickets sold fetched successfully",
    "timeframe": "month",
    "data": [
      { "date": "2025-12-01", "percentageSold": 75, "averageTicketsSold": 45 },
      { "date": "2025-12-02", "percentageSold": 82, "averageTicketsSold": 52 }
    ]
  }
}
```

---

#### GET /api/stats/analytics/platform
**Description:** Get overall platform statistics  
**Headers:** None  
**Payload:** None  
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Platform stats fetched successfully",
    "stats": {
      "totalRaffles": 500,
      "activeRaffles": 45,
      "totalUsers": 2500,
      "totalTransactions": 15000,
      "totalVolume": 75000.5
    }
  }
}
```

---

### P&L (Profit & Loss) Routes

#### GET /api/stats/pnl/bought
**Description:** Get P&L for authenticated user (bought side)  
**Headers:**  
- `Authorization`: Bearer <token>  
**Query Params:**  
- `timeframe`: `daily` | `monthly` | `yearly`
- `month`: number
- `year`: number
- `currency`: `USD` | `SOL`
- `service`: `raffle` | `gumball` | `all`  
**Example:**
```
GET /api/stats/pnl/bought?timeframe=monthly&year=2025&currency=USD&service=all
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "P&L bought data fetched successfully",
    "summary": {
      "month": "Dec '25",
      "totalSpent": 25.5,
      "totalWon": 50.0,
      "pnl": 24.5,
      "roi": "96%"
    },
    "daily": [
      {
        "date": "2025-12-24",
        "spent": 5.0,
        "won": 15.0,
        "pnl": 10.0,
        "roi": "200%"
      },
      {
        "date": "2025-12-23",
        "spent": 10.0,
        "won": 5.0,
        "pnl": -5.0,
        "roi": "-50%"
      }
    ],
    "currency": "USD",
    "timeframe": "monthly"
  }
}
```

---

#### GET /api/stats/pnl/sold
**Description:** Get P&L for authenticated user (sold side - for creators)  
**Headers:**  
- `Authorization`: Bearer <token>  
**Query Params:**  
- `timeframe`: `daily` | `monthly` | `yearly`
- `month`: number
- `year`: number
- `currency`: `USD` | `SOL`
- `service`: `raffle` | `gumball` | `all`  
**Example:**
```
GET /api/stats/pnl/sold?timeframe=monthly&month=12&year=2025&currency=SOL&service=raffle
```
**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "P&L sold data fetched successfully",
    "summary": {
      "month": "Dec '25",
      "totalCost": 100.0,
      "totalSold": 150.0,
      "pnl": 50.0,
      "roi": "50%"
    },
    "daily": [
      {
        "date": "2025-12-24",
        "cost": 25.0,
        "sold": 40.0,
        "pnl": 15.0,
        "roi": "60%"
      }
    ],
    "currency": "SOL",
    "timeframe": "monthly"
  }
}
```

---

#### GET /api/stats/pnl/export
**Description:** Export P&L data as CSV  
**Headers:**  
- `Authorization`: Bearer <token>  
**Query Params:**  
- `type`: `bought` | `sold`
- `month`: number
- `year`: number
- `service`: `raffle` | `gumball` | `all`  
**Example:**
```
GET /api/stats/pnl/export?type=bought&month=12&year=2025&service=all
```
**Expected Response:** CSV file download with headers:
```
Date,Transaction ID,Type,Amount (SOL)
2025-12-24,5KtP...txId...,RAFFLE_ENTRY,0.5000
2025-12-24,6AbC...txId...,GUMBALL_SPIN,0.1000
```

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common error codes:
- **401 Unauthorized**: Missing or invalid Authorization token
- **400 Bad Request**: Invalid payload or missing required fields
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error

---

## Notes

- All authenticated routes require the `Authorization` header with a valid Bearer token
- Wallet addresses should be valid Solana public keys (base58 encoded, 32-44 characters)
- Transaction signatures (`txSignature`) should be valid Solana transaction signatures
- All dates should be in ISO 8601 format
- BigInt values (like `ticketPrice`, `bidAmount`, `totalAmount`) should be passed as strings
- Rate limit: 100 requests per 5 minutes per IP
