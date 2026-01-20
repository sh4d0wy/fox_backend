/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/auction.json`.
 */
export type Auction = {
  "address": "2J3du9mvh9t4bSP8DzNckVQrBQYupCW92SMnKRtTSaaJ",
  "metadata": {
    "name": "auction",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "docs": [
    "Sysvar for token mint and ATA creation"
  ],
  "instructions": [
    {
      "name": "cancelAuction",
      "discriminator": [
        156,
        43,
        197,
        110,
        218,
        105,
        143,
        182
      ],
      "accounts": [
        {
          "name": "auctionConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "auctionAdmin",
          "signer": true
        },
        {
          "name": "prizeMint"
        },
        {
          "name": "prizeEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "prizeTokenProgram"
              },
              {
                "kind": "account",
                "path": "prizeMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "creatorPrizeAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "prizeTokenProgram"
              },
              {
                "kind": "account",
                "path": "prizeMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "prizeTokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "metadataAccount",
          "writable": true
        },
        {
          "name": "editionAccount"
        },
        {
          "name": "ownerTokenRecord",
          "docs": [
            "Required only for pNFTs. Derived as PDA(metadata, mint, \"token_record\", source_ata)"
          ],
          "writable": true
        },
        {
          "name": "destTokenRecord",
          "docs": [
            "Required only for pNFTs. Derived as PDA(metadata, mint, \"token_record\", destination_ata)"
          ],
          "writable": true
        },
        {
          "name": "authorizationRules",
          "optional": true
        },
        {
          "name": "authRulesProgram"
        },
        {
          "name": "tokenMetadataProgram"
        },
        {
          "name": "sysvarInstructions"
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u32"
        }
      ]
    },
    {
      "name": "completeAuction",
      "discriminator": [
        89,
        120,
        196,
        134,
        103,
        28,
        192,
        83
      ],
      "accounts": [
        {
          "name": "auctionConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "auctionAdmin",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator",
          "writable": true
        },
        {
          "name": "winner",
          "docs": [
            "audit: there is no check for winner and hisghest bidder"
          ],
          "writable": true
        },
        {
          "name": "prizeMint"
        },
        {
          "name": "bidMint"
        },
        {
          "name": "prizeEscrow",
          "writable": true
        },
        {
          "name": "bidEscrow",
          "writable": true
        },
        {
          "name": "creatorPrizeAta",
          "writable": true
        },
        {
          "name": "winnerPrizeAta",
          "writable": true
        },
        {
          "name": "bidFeeTreasuryAta",
          "writable": true
        },
        {
          "name": "creatorBidAta",
          "writable": true
        },
        {
          "name": "prizeTokenProgram"
        },
        {
          "name": "bidTokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "metadataAccount",
          "writable": true
        },
        {
          "name": "editionAccount"
        },
        {
          "name": "ownerTokenRecord",
          "docs": [
            "Required only for pNFTs. Derived as PDA(metadata, mint, \"token_record\", source_ata)"
          ],
          "writable": true
        },
        {
          "name": "destTokenRecord",
          "docs": [
            "Required only for pNFTs. Derived as PDA(metadata, mint, \"token_record\", destination_ata)"
          ],
          "writable": true
        },
        {
          "name": "authorizationRules",
          "optional": true
        },
        {
          "name": "authRulesProgram"
        },
        {
          "name": "tokenMetadataProgram"
        },
        {
          "name": "sysvarInstructions"
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u32"
        }
      ]
    },
    {
      "name": "createAuction",
      "discriminator": [
        234,
        6,
        201,
        246,
        47,
        219,
        176,
        107
      ],
      "accounts": [
        {
          "name": "auctionConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction_config.auction_count",
                "account": "auctionConfig"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "auctionAdmin",
          "signer": true
        },
        {
          "name": "prizeMint"
        },
        {
          "name": "bidMint"
        },
        {
          "name": "creatorPrizeAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "account",
                "path": "prizeTokenProgram"
              },
              {
                "kind": "account",
                "path": "prizeMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "prizeEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "prizeTokenProgram"
              },
              {
                "kind": "account",
                "path": "prizeMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "prizeTokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "metadataAccount",
          "writable": true
        },
        {
          "name": "editionAccount"
        },
        {
          "name": "ownerTokenRecord",
          "docs": [
            "Required only for pNFTs. Derived as PDA(metadata, mint, \"token_record\", source_ata)"
          ],
          "writable": true
        },
        {
          "name": "destTokenRecord",
          "docs": [
            "Required only for pNFTs. Derived as PDA(metadata, mint, \"token_record\", destination_ata)"
          ],
          "writable": true
        },
        {
          "name": "authorizationRules",
          "optional": true
        },
        {
          "name": "authRulesProgram"
        },
        {
          "name": "tokenMetadataProgram"
        },
        {
          "name": "sysvarInstructions"
        }
      ],
      "args": [
        {
          "name": "startTime",
          "type": "i64"
        },
        {
          "name": "endTime",
          "type": "i64"
        },
        {
          "name": "startImmediately",
          "type": "bool"
        },
        {
          "name": "isBidMintSol",
          "type": "bool"
        },
        {
          "name": "baseBid",
          "type": "u64"
        },
        {
          "name": "minIncrement",
          "type": "u64"
        },
        {
          "name": "timeExtension",
          "type": "u32"
        }
      ]
    },
    {
      "name": "initializeAuctionConfig",
      "discriminator": [
        94,
        1,
        96,
        31,
        46,
        102,
        88,
        102
      ],
      "accounts": [
        {
          "name": "auctionConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "auctionOwner",
          "type": "pubkey"
        },
        {
          "name": "auctionAdmin",
          "type": "pubkey"
        },
        {
          "name": "creationFeeLamports",
          "type": "u64"
        },
        {
          "name": "commissionBps",
          "type": "u16"
        },
        {
          "name": "minimumAuctionPeriod",
          "type": "u32"
        },
        {
          "name": "maximumAuctionPeriod",
          "type": "u32"
        },
        {
          "name": "minimumTimeExtension",
          "type": "u32"
        },
        {
          "name": "maximumTimeExtension",
          "type": "u32"
        }
      ]
    },
    {
      "name": "placeBid",
      "discriminator": [
        238,
        77,
        148,
        91,
        200,
        151,
        92,
        146
      ],
      "accounts": [
        {
          "name": "auctionConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "auctionAdmin",
          "signer": true
        },
        {
          "name": "prevBidderAccount",
          "writable": true
        },
        {
          "name": "bidMint"
        },
        {
          "name": "currentBidderAta",
          "writable": true
        },
        {
          "name": "prevBidderAta",
          "writable": true
        },
        {
          "name": "bidEscrow",
          "writable": true
        },
        {
          "name": "bidTokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u32"
        },
        {
          "name": "bidAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "startAuction",
      "discriminator": [
        255,
        2,
        149,
        136,
        148,
        125,
        65,
        195
      ],
      "accounts": [
        {
          "name": "auctionConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "auctionAdmin",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u32"
        }
      ]
    },
    {
      "name": "updateAuction",
      "discriminator": [
        8,
        87,
        207,
        233,
        254,
        160,
        120,
        224
      ],
      "accounts": [
        {
          "name": "auctionConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "auctionAdmin",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u32"
        },
        {
          "name": "startTime",
          "type": "i64"
        },
        {
          "name": "endTime",
          "type": "i64"
        },
        {
          "name": "startImmediately",
          "type": "bool"
        },
        {
          "name": "baseBid",
          "type": "u64"
        },
        {
          "name": "minIncrement",
          "type": "u64"
        },
        {
          "name": "timeExtension",
          "type": "u32"
        }
      ]
    },
    {
      "name": "updateAuctionAdmin",
      "discriminator": [
        87,
        207,
        78,
        103,
        211,
        63,
        186,
        41
      ],
      "accounts": [
        {
          "name": "auctionConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "auctionOwner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newAuctionAdmin",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updateAuctionOwner",
      "discriminator": [
        47,
        212,
        42,
        241,
        5,
        24,
        209,
        206
      ],
      "accounts": [
        {
          "name": "auctionConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "auctionOwner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newAuctionOwner",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updateConfigData",
      "discriminator": [
        106,
        17,
        111,
        79,
        128,
        247,
        197,
        100
      ],
      "accounts": [
        {
          "name": "auctionConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "auctionOwner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "creationFeeLamports",
          "type": "u64"
        },
        {
          "name": "commissionBps",
          "type": "u16"
        },
        {
          "name": "minimumAuctionPeriod",
          "type": "u32"
        },
        {
          "name": "maximumAuctionPeriod",
          "type": "u32"
        },
        {
          "name": "minimumTimeExtension",
          "type": "u32"
        },
        {
          "name": "maximumTimeExtension",
          "type": "u32"
        }
      ]
    },
    {
      "name": "updatePauseAndUnpause",
      "discriminator": [
        124,
        65,
        236,
        137,
        103,
        20,
        115,
        240
      ],
      "accounts": [
        {
          "name": "auctionConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "auctionOwner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newPauseFlags",
          "type": "u8"
        }
      ]
    },
    {
      "name": "withdrawSolFees",
      "discriminator": [
        191,
        53,
        166,
        97,
        124,
        212,
        228,
        219
      ],
      "accounts": [
        {
          "name": "auctionConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "receiver",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawSplFees",
      "discriminator": [
        67,
        45,
        141,
        82,
        211,
        167,
        149,
        115
      ],
      "accounts": [
        {
          "name": "auctionConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "feeMint"
        },
        {
          "name": "feeTreasuryAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "auctionConfig"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "feeMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "receiverFeeAta",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "auction",
      "discriminator": [
        218,
        94,
        247,
        242,
        126,
        233,
        131,
        81
      ]
    },
    {
      "name": "auctionConfig",
      "discriminator": [
        195,
        54,
        8,
        51,
        28,
        231,
        33,
        142
      ]
    }
  ],
  "events": [
    {
      "name": "auctionCancelled",
      "discriminator": [
        22,
        32,
        51,
        83,
        215,
        194,
        171,
        209
      ]
    },
    {
      "name": "auctionCompleted",
      "discriminator": [
        44,
        102,
        119,
        201,
        251,
        46,
        178,
        67
      ]
    },
    {
      "name": "auctionCreated",
      "discriminator": [
        133,
        190,
        194,
        65,
        172,
        0,
        70,
        178
      ]
    },
    {
      "name": "auctionStarted",
      "discriminator": [
        126,
        97,
        193,
        56,
        72,
        162,
        162,
        64
      ]
    },
    {
      "name": "auctionUpdated",
      "discriminator": [
        67,
        35,
        50,
        236,
        108,
        230,
        253,
        111
      ]
    },
    {
      "name": "bidPlaced",
      "discriminator": [
        135,
        53,
        176,
        83,
        193,
        69,
        108,
        61
      ]
    },
    {
      "name": "feesWithdrawn",
      "discriminator": [
        234,
        15,
        0,
        119,
        148,
        241,
        40,
        21
      ]
    },
    {
      "name": "splFeesWithdrawn",
      "discriminator": [
        201,
        164,
        201,
        96,
        70,
        233,
        240,
        251
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidPrizeMint",
      "msg": "Invalid Prize Mint"
    },
    {
      "code": 6001,
      "name": "invalidPrizeEscrow",
      "msg": "Invalid Prize Escrow"
    },
    {
      "code": 6002,
      "name": "invalidPrizeEscrowOwner",
      "msg": "Invalid Prize Escrow Owner"
    },
    {
      "code": 6003,
      "name": "invalidPrizeAtaOwner",
      "msg": "Invalid Prize ATA owner"
    },
    {
      "code": 6004,
      "name": "invalidBidMint",
      "msg": "Invalid Bid Token Mint"
    },
    {
      "code": 6005,
      "name": "missingBidMint",
      "msg": "Missing Bid Mint"
    },
    {
      "code": 6006,
      "name": "invalidBidEscrow",
      "msg": "Invalid Bid Escrow"
    },
    {
      "code": 6007,
      "name": "invalidBidEscrowOwner",
      "msg": "Invalid Bid Escrow Owner"
    },
    {
      "code": 6008,
      "name": "invalidBidAtaOwner",
      "msg": "Invalid Bid ATA owner"
    },
    {
      "code": 6009,
      "name": "invalidPreviousBidOwner",
      "msg": "Invalid previous bid owner"
    },
    {
      "code": 6010,
      "name": "invalidHighestBidder",
      "msg": "Invalid highest bidder"
    }
  ],
  "types": [
    {
      "name": "auction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u32"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "prizeMint",
            "type": "pubkey"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "bidMint",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "baseBid",
            "type": "u64"
          },
          {
            "name": "minIncrement",
            "type": "u64"
          },
          {
            "name": "timeExtension",
            "type": "u32"
          },
          {
            "name": "highestBidAmount",
            "type": "u64"
          },
          {
            "name": "highestBidder",
            "type": "pubkey"
          },
          {
            "name": "hasAnyBid",
            "type": "bool"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "auctionState"
              }
            }
          },
          {
            "name": "auctionBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "auctionCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u32"
          },
          {
            "name": "cancelledBy",
            "type": "pubkey"
          },
          {
            "name": "cancelledTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "auctionCompleted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u32"
          },
          {
            "name": "winner",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "finalPrice",
            "type": "u64"
          },
          {
            "name": "creatorAmount",
            "type": "u64"
          },
          {
            "name": "feeAmount",
            "type": "u64"
          },
          {
            "name": "completedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "auctionConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionOwner",
            "type": "pubkey"
          },
          {
            "name": "auctionAdmin",
            "type": "pubkey"
          },
          {
            "name": "creationFeeLamports",
            "type": "u64"
          },
          {
            "name": "commissionBps",
            "type": "u16"
          },
          {
            "name": "minimumAuctionPeriod",
            "type": "u32"
          },
          {
            "name": "maximumAuctionPeriod",
            "type": "u32"
          },
          {
            "name": "minimumTimeExtension",
            "type": "u32"
          },
          {
            "name": "maximumTimeExtension",
            "type": "u32"
          },
          {
            "name": "auctionCount",
            "type": "u32"
          },
          {
            "name": "pauseFlags",
            "type": "u8"
          },
          {
            "name": "configBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "auctionCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u32"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "prizeMint",
            "type": "pubkey"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "auctionStarted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u32"
          },
          {
            "name": "startedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "auctionState",
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "none"
          },
          {
            "name": "initialized"
          },
          {
            "name": "active"
          },
          {
            "name": "cancelled"
          },
          {
            "name": "completedSuccessfully"
          },
          {
            "name": "completedFailed"
          }
        ]
      }
    },
    {
      "name": "auctionUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u32"
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "baseBid",
            "type": "u64"
          },
          {
            "name": "minIncrement",
            "type": "u64"
          },
          {
            "name": "timeExtension",
            "type": "u32"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "bidPlaced",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u32"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "newBid",
            "type": "u64"
          },
          {
            "name": "bidTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "feesWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "receiver",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "splFeesWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "receiver",
            "type": "pubkey"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "feeMantissa",
      "type": "u16",
      "value": "10000"
    }
  ]
};
