/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/gumball.json`.
 */
export type Gumball = {
  "address": "E3JKUYAdd2VeUo1YdwTKUmG43WG7zwUuzxcZbzphRejc",
  "metadata": {
    "name": "gumball",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "activateGumball",
      "discriminator": [
        127,
        251,
        179,
        138,
        30,
        30,
        192,
        238
      ],
      "accounts": [
        {
          "name": "gumballConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "gumball",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gumballId"
              }
            ]
          }
        },
        {
          "name": "gumballAdmin",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "gumballId",
          "type": "u32"
        }
      ]
    },
    {
      "name": "addPrize",
      "discriminator": [
        72,
        182,
        203,
        140,
        3,
        163,
        192,
        98
      ],
      "accounts": [
        {
          "name": "gumballConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "gumball",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gumballId"
              }
            ]
          }
        },
        {
          "name": "prize",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gumballId"
              },
              {
                "kind": "arg",
                "path": "prizeIndex"
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
          "name": "gumballAdmin",
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
                "path": "gumball"
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
          "name": "gumballId",
          "type": "u32"
        },
        {
          "name": "prizeIndex",
          "type": "u16"
        },
        {
          "name": "prizeAmount",
          "type": "u64"
        },
        {
          "name": "quantity",
          "type": "u16"
        }
      ]
    },
    {
      "name": "cancelGumball",
      "discriminator": [
        198,
        125,
        189,
        213,
        97,
        199,
        110,
        144
      ],
      "accounts": [
        {
          "name": "gumballConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "gumball",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gumballId"
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
          "name": "gumballAdmin",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "gumballId",
          "type": "u32"
        }
      ]
    },
    {
      "name": "claimPrize",
      "discriminator": [
        157,
        233,
        139,
        121,
        246,
        62,
        234,
        235
      ],
      "accounts": [
        {
          "name": "gumballConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "gumball",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gumballId"
              }
            ]
          }
        },
        {
          "name": "prize",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gumballId"
              },
              {
                "kind": "arg",
                "path": "prizeIndex"
              }
            ]
          }
        },
        {
          "name": "spinState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gumballId"
              },
              {
                "kind": "account",
                "path": "spinner"
              }
            ]
          }
        },
        {
          "name": "randomnessAccountData"
        },
        {
          "name": "spinner",
          "docs": [
            "Player who will receive the prize"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "gumballAdmin",
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
                "path": "gumball"
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
          "name": "spinnerPrizeAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "spinner"
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
          "name": "prizeTokenProgram",
          "docs": [
            "Token program"
          ]
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "system Programs"
          ],
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
          "name": "gumballId",
          "type": "u32"
        },
        {
          "name": "prizeIndex",
          "type": "u16"
        }
      ]
    },
    {
      "name": "claimPrizeBack",
      "discriminator": [
        103,
        54,
        25,
        125,
        252,
        226,
        44,
        85
      ],
      "accounts": [
        {
          "name": "gumballConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "gumball",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gumballId"
              }
            ]
          }
        },
        {
          "name": "prize",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gumballId"
              },
              {
                "kind": "arg",
                "path": "prizeIndex"
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
          "name": "gumballAdmin",
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
                "path": "gumball"
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
          "name": "gumballId",
          "type": "u32"
        },
        {
          "name": "prizeIndex",
          "type": "u16"
        }
      ]
    },
    {
      "name": "createGumball",
      "discriminator": [
        240,
        178,
        45,
        48,
        213,
        119,
        42,
        218
      ],
      "accounts": [
        {
          "name": "gumballConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "gumball",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "gumball_config.gumball_count",
                "account": "gumballConfig"
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
          "name": "gumballAdmin",
          "signer": true
        },
        {
          "name": "ticketMint"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
          "name": "totalTickets",
          "type": "u16"
        },
        {
          "name": "ticketPrice",
          "type": "u64"
        },
        {
          "name": "isTicketSol",
          "type": "bool"
        },
        {
          "name": "startGumball",
          "type": "bool"
        }
      ]
    },
    {
      "name": "endGumball",
      "discriminator": [
        249,
        139,
        11,
        145,
        146,
        24,
        165,
        251
      ],
      "accounts": [
        {
          "name": "gumballConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "gumball",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gumballId"
              }
            ]
          }
        },
        {
          "name": "gumballAdmin",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator",
          "writable": true
        },
        {
          "name": "ticketMint"
        },
        {
          "name": "ticketEscrow",
          "writable": true
        },
        {
          "name": "ticketFeeEscrowAta",
          "writable": true
        },
        {
          "name": "creatorTicketAta",
          "writable": true
        },
        {
          "name": "ticketTokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gumballId",
          "type": "u32"
        }
      ]
    },
    {
      "name": "initializeGumballConfig",
      "discriminator": [
        27,
        198,
        52,
        249,
        52,
        18,
        112,
        51
      ],
      "accounts": [
        {
          "name": "gumballConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
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
          "name": "gumballOwner",
          "type": "pubkey"
        },
        {
          "name": "gumballAdmin",
          "type": "pubkey"
        },
        {
          "name": "creationFeeLamports",
          "type": "u64"
        },
        {
          "name": "ticketFeeBps",
          "type": "u16"
        },
        {
          "name": "minimumGumballPeriod",
          "type": "u32"
        },
        {
          "name": "maximumGumballPeriod",
          "type": "u32"
        }
      ]
    },
    {
      "name": "spinGumball",
      "discriminator": [
        64,
        235,
        96,
        221,
        71,
        13,
        160,
        11
      ],
      "accounts": [
        {
          "name": "gumballConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "gumball",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gumballId"
              }
            ]
          }
        },
        {
          "name": "spinState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gumballId"
              },
              {
                "kind": "account",
                "path": "spinner"
              }
            ]
          }
        },
        {
          "name": "randomnessAccountData"
        },
        {
          "name": "spinner",
          "docs": [
            "Player who will receive the prize"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "gumballAdmin",
          "signer": true
        },
        {
          "name": "ticketMint"
        },
        {
          "name": "ticketEscrow",
          "writable": true
        },
        {
          "name": "spinnerTicketAta",
          "writable": true
        },
        {
          "name": "ticketTokenProgram",
          "docs": [
            "Token program"
          ]
        },
        {
          "name": "systemProgram",
          "docs": [
            "system Programs"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gumballId",
          "type": "u32"
        }
      ]
    },
    {
      "name": "updateGumballAdmin",
      "discriminator": [
        216,
        133,
        198,
        218,
        186,
        164,
        32,
        100
      ],
      "accounts": [
        {
          "name": "gumballConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "gumballOwner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newAdmin",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updateGumballConfigData",
      "discriminator": [
        169,
        29,
        117,
        121,
        228,
        52,
        10,
        183
      ],
      "accounts": [
        {
          "name": "gumballConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "gumballOwner",
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
          "name": "ticketFeeBps",
          "type": "u16"
        },
        {
          "name": "minimumGumballPeriod",
          "type": "u32"
        },
        {
          "name": "maximumGumballPeriod",
          "type": "u32"
        }
      ]
    },
    {
      "name": "updateGumballData",
      "discriminator": [
        148,
        126,
        136,
        233,
        139,
        201,
        162,
        174
      ],
      "accounts": [
        {
          "name": "gumballConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "gumball",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gumballId"
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
          "name": "gumballAdmin",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "gumballId",
          "type": "u32"
        },
        {
          "name": "newTicketPrice",
          "type": "u64"
        },
        {
          "name": "newTotalTickets",
          "type": "u16"
        }
      ]
    },
    {
      "name": "updateGumballOwner",
      "discriminator": [
        87,
        110,
        29,
        139,
        231,
        149,
        159,
        36
      ],
      "accounts": [
        {
          "name": "gumballConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "gumballOwner",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newOwner",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updateGumballTime",
      "discriminator": [
        176,
        22,
        24,
        140,
        248,
        77,
        185,
        172
      ],
      "accounts": [
        {
          "name": "gumballConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "gumball",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gumballId"
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
          "name": "gumballAdmin",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "gumballId",
          "type": "u32"
        },
        {
          "name": "newStartTime",
          "type": "i64"
        },
        {
          "name": "newEndTime",
          "type": "i64"
        },
        {
          "name": "startGumball",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updatePauseFlags",
      "discriminator": [
        166,
        168,
        128,
        146,
        186,
        131,
        65,
        66
      ],
      "accounts": [
        {
          "name": "gumballConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "gumballOwner",
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
          "name": "gumballConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
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
          "name": "gumballConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  117,
                  109,
                  98,
                  97,
                  108,
                  108
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
                "path": "gumballConfig"
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
      "name": "gumballConfig",
      "discriminator": [
        229,
        179,
        216,
        228,
        212,
        37,
        61,
        212
      ]
    },
    {
      "name": "gumballMachine",
      "discriminator": [
        87,
        13,
        57,
        25,
        98,
        234,
        26,
        27
      ]
    },
    {
      "name": "prize",
      "discriminator": [
        207,
        94,
        143,
        55,
        253,
        127,
        70,
        211
      ]
    },
    {
      "name": "spinState",
      "discriminator": [
        169,
        179,
        241,
        170,
        228,
        255,
        118,
        128
      ]
    }
  ],
  "events": [
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
      "name": "gumballActivated",
      "discriminator": [
        97,
        160,
        164,
        48,
        117,
        198,
        149,
        114
      ]
    },
    {
      "name": "gumballCancelled",
      "discriminator": [
        78,
        145,
        147,
        126,
        59,
        198,
        243,
        192
      ]
    },
    {
      "name": "gumballCreated",
      "discriminator": [
        101,
        20,
        97,
        249,
        49,
        225,
        184,
        10
      ]
    },
    {
      "name": "gumballDataUpdated",
      "discriminator": [
        70,
        134,
        52,
        235,
        56,
        252,
        54,
        74
      ]
    },
    {
      "name": "gumballEnded",
      "discriminator": [
        178,
        87,
        35,
        180,
        121,
        171,
        217,
        58
      ]
    },
    {
      "name": "gumballTimeUpdated",
      "discriminator": [
        175,
        205,
        161,
        245,
        208,
        228,
        209,
        112
      ]
    },
    {
      "name": "prizeAdded",
      "discriminator": [
        198,
        189,
        108,
        191,
        245,
        23,
        92,
        12
      ]
    },
    {
      "name": "prizeClaimed",
      "discriminator": [
        213,
        150,
        192,
        76,
        199,
        33,
        212,
        38
      ]
    },
    {
      "name": "prizeClaimedBack",
      "discriminator": [
        90,
        156,
        212,
        68,
        17,
        234,
        180,
        113
      ]
    },
    {
      "name": "prizeSpinned",
      "discriminator": [
        83,
        247,
        78,
        31,
        69,
        189,
        175,
        169
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
      "name": "invalidGumballId",
      "msg": "Invalid Gumball ID"
    },
    {
      "code": 6001,
      "name": "invalidCreator",
      "msg": "Invalid Gumball Creator"
    },
    {
      "code": 6002,
      "name": "overflow",
      "msg": "Calculation Overflow Error"
    },
    {
      "code": 6003,
      "name": "functionPaused",
      "msg": "Function is paused"
    },
    {
      "code": 6004,
      "name": "invalidTicketPrice",
      "msg": "Invalid ticket price given"
    },
    {
      "code": 6005,
      "name": "invalidTotalTickets",
      "msg": "Invalid total tickets"
    },
    {
      "code": 6006,
      "name": "endTimeNotReached",
      "msg": "End time is not reached"
    },
    {
      "code": 6007,
      "name": "startTimeAlreadyReached",
      "msg": "Start time already reached"
    },
    {
      "code": 6008,
      "name": "startTimeExceedEndTime",
      "msg": "Start time exceed end time"
    },
    {
      "code": 6009,
      "name": "startTimeInPast",
      "msg": "Given start time is in past"
    },
    {
      "code": 6010,
      "name": "ticketsAlreadySold",
      "msg": "Tickets are already solded"
    },
    {
      "code": 6011,
      "name": "notInitialized",
      "msg": "Gumball is not in initialized stage"
    },
    {
      "code": 6012,
      "name": "startTimeNotReached",
      "msg": "Start time is not reached"
    },
    {
      "code": 6013,
      "name": "endTimeIsReached",
      "msg": "End time is already reached"
    },
    {
      "code": 6014,
      "name": "invalidGumballState",
      "msg": "Invalid gumball state for this action"
    },
    {
      "code": 6015,
      "name": "prizesExceedTickets",
      "msg": "Prizes exceed the total tickets allowed"
    },
    {
      "code": 6016,
      "name": "invalidPrizeIndex",
      "msg": "Invalid prize index"
    },
    {
      "code": 6017,
      "name": "invalidRemainingAccounts",
      "msg": "Invalid Remaining accounts passed"
    },
    {
      "code": 6018,
      "name": "missingBump",
      "msg": "Missing PDA bump for prize"
    },
    {
      "code": 6019,
      "name": "prizeMintMismatch",
      "msg": "Prize mint mismatch"
    },
    {
      "code": 6020,
      "name": "prizeAmountMismatch",
      "msg": "Prize amount mismatch"
    },
    {
      "code": 6021,
      "name": "cannotAddExistingNftPrize",
      "msg": "Cannot add NFT to an existing NFT prize PDA"
    },
    {
      "code": 6022,
      "name": "invalidNftPrizeAmount",
      "msg": "Invalid NFT prize amount (NFT must have amount = 1)"
    },
    {
      "code": 6023,
      "name": "invalidNftPrizeQuantity",
      "msg": "Invalid NFT prize quantity (NFT quantity must be 1)"
    },
    {
      "code": 6024,
      "name": "invalidPrizeAmount",
      "msg": "Invalid prize amount"
    },
    {
      "code": 6025,
      "name": "invalidPrizeQuantity",
      "msg": "Invalid prize quantity"
    },
    {
      "code": 6026,
      "name": "alreadySpinned",
      "msg": "User has already spun this gumball"
    },
    {
      "code": 6027,
      "name": "notSpun",
      "msg": "User has not spun this gumball yet"
    },
    {
      "code": 6028,
      "name": "invalidRandomnessAccount",
      "msg": "Invalid randomness account"
    },
    {
      "code": 6029,
      "name": "lengthMismatch",
      "msg": "Lengths not in sync"
    },
    {
      "code": 6030,
      "name": "gumballEmpty",
      "msg": "Gumball has no prizes available"
    }
  ],
  "types": [
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
      "name": "gumballActivated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gumballId",
            "type": "u32"
          },
          {
            "name": "activatedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "gumballCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gumballId",
            "type": "u32"
          },
          {
            "name": "cancelledBy",
            "type": "pubkey"
          },
          {
            "name": "cancelledAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "gumballConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gumballOwner",
            "type": "pubkey"
          },
          {
            "name": "gumballAdmin",
            "type": "pubkey"
          },
          {
            "name": "creationFeeLamports",
            "type": "u64"
          },
          {
            "name": "ticketFeeBps",
            "type": "u16"
          },
          {
            "name": "minimumGumballPeriod",
            "type": "u32"
          },
          {
            "name": "maximumGumballPeriod",
            "type": "u32"
          },
          {
            "name": "gumballCount",
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
      "name": "gumballCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gumballId",
            "type": "u32"
          },
          {
            "name": "creator",
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
      "name": "gumballDataUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gumballId",
            "type": "u32"
          },
          {
            "name": "newTicketPrice",
            "type": "u64"
          },
          {
            "name": "newTotalTickets",
            "type": "u16"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "gumballEnded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gumballId",
            "type": "u32"
          },
          {
            "name": "totalSold",
            "type": "u16"
          },
          {
            "name": "feeAmount",
            "type": "u64"
          },
          {
            "name": "creatorAmount",
            "type": "u64"
          },
          {
            "name": "endedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "gumballMachine",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gumballId",
            "type": "u32"
          },
          {
            "name": "creator",
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
            "name": "totalTickets",
            "type": "u16"
          },
          {
            "name": "totalItemsAvailable",
            "type": "u16"
          },
          {
            "name": "ticketsSold",
            "type": "u16"
          },
          {
            "name": "prizesAdded",
            "type": "u16"
          },
          {
            "name": "ticketMint",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "ticketPrice",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "gumballState"
              }
            }
          },
          {
            "name": "gumballBump",
            "type": "u8"
          },
          {
            "name": "prizeMap",
            "type": {
              "vec": "u16"
            }
          }
        ]
      }
    },
    {
      "name": "gumballState",
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
      "name": "gumballTimeUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gumballId",
            "type": "u32"
          },
          {
            "name": "newStartTime",
            "type": "i64"
          },
          {
            "name": "newEndTime",
            "type": "i64"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "prize",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gumballId",
            "type": "u32"
          },
          {
            "name": "prizeIndex",
            "type": "u16"
          },
          {
            "name": "ifPrizeNft",
            "type": "bool"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "totalAmount",
            "type": "u64"
          },
          {
            "name": "prizeAmount",
            "type": "u64"
          },
          {
            "name": "quantity",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "prizeAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gumballId",
            "type": "u32"
          },
          {
            "name": "prizeIndex",
            "type": "u16"
          },
          {
            "name": "prizeMint",
            "type": "pubkey"
          },
          {
            "name": "prizeAmount",
            "type": "u64"
          },
          {
            "name": "quantitiy",
            "type": "u16"
          },
          {
            "name": "addedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "prizeClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gumballId",
            "type": "u32"
          },
          {
            "name": "prizeIndex",
            "type": "u16"
          },
          {
            "name": "prizeMint",
            "type": "pubkey"
          },
          {
            "name": "prizeAmount",
            "type": "u64"
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "claimedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "prizeClaimedBack",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gumballId",
            "type": "u32"
          },
          {
            "name": "prizeIndex",
            "type": "u16"
          },
          {
            "name": "prizeMint",
            "type": "pubkey"
          },
          {
            "name": "claimedAmount",
            "type": "u64"
          },
          {
            "name": "claimer",
            "type": "pubkey"
          },
          {
            "name": "claimedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "prizeSpinned",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gumballId",
            "type": "u32"
          },
          {
            "name": "randomnessAccount",
            "type": "pubkey"
          },
          {
            "name": "spunAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "spinState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "randomnessAccount",
            "type": "pubkey"
          },
          {
            "name": "gumballId",
            "type": "u32"
          },
          {
            "name": "commitSlot",
            "type": "u64"
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
