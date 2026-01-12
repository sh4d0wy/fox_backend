/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/raffle.json`.
 */
export type Raffle = {
    "address": "4s5vnj8ge7qCLbe3q5KNXK6CbXszhqSc3phpt6UdGCqt",
    "metadata": {
        "name": "raffle",
        "version": "0.1.0",
        "spec": "0.1.0",
        "description": "Created with Anchor"
    },
    "instructions": [
        {
            "name": "activateRaffle",
            "discriminator": [
                95,
                197,
                43,
                48,
                169,
                59,
                250,
                106
            ],
            "accounts": [
                {
                    "name": "raffleConfig",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "raffle",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            },
                            {
                                "kind": "arg",
                                "path": "raffleId"
                            }
                        ]
                    }
                },
                {
                    "name": "raffleAdmin",
                    "writable": true,
                    "signer": true
                }
            ],
            "args": [
                {
                    "name": "raffleId",
                    "type": "u32"
                }
            ]
        },
        {
            "name": "announceWinners",
            "discriminator": [
                195,
                233,
                64,
                176,
                73,
                222,
                220,
                94
            ],
            "accounts": [
                {
                    "name": "raffleConfig",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "raffle",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            },
                            {
                                "kind": "arg",
                                "path": "raffleId"
                            }
                        ]
                    }
                },
                {
                    "name": "raffleAdmin",
                    "writable": true,
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
                    "name": "ticketFeeTreasury",
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
                    "name": "raffleId",
                    "type": "u32"
                },
                {
                    "name": "winners",
                    "type": {
                        "vec": "pubkey"
                    }
                }
            ]
        },
        {
            "name": "buyTicket",
            "discriminator": [
                11,
                24,
                17,
                193,
                168,
                116,
                164,
                169
            ],
            "accounts": [
                {
                    "name": "raffleConfig",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "raffle",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            },
                            {
                                "kind": "arg",
                                "path": "raffleId"
                            }
                        ]
                    }
                },
                {
                    "name": "buyerAccount",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            },
                            {
                                "kind": "arg",
                                "path": "raffleId"
                            },
                            {
                                "kind": "account",
                                "path": "buyer"
                            }
                        ]
                    }
                },
                {
                    "name": "buyer",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "raffleAdmin",
                    "signer": true
                },
                {
                    "name": "ticketMint"
                },
                {
                    "name": "buyerTicketAta",
                    "writable": true
                },
                {
                    "name": "ticketEscrow",
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
                    "name": "raffleId",
                    "type": "u32"
                },
                {
                    "name": "ticketsToBuy",
                    "type": "u16"
                }
            ]
        },
        {
            "name": "buyerClaimPrize",
            "discriminator": [
                47,
                76,
                109,
                56,
                93,
                71,
                98,
                179
            ],
            "accounts": [
                {
                    "name": "raffleConfig",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "raffle",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            },
                            {
                                "kind": "arg",
                                "path": "raffleId"
                            }
                        ]
                    }
                },
                {
                    "name": "buyerAccount",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            },
                            {
                                "kind": "arg",
                                "path": "raffleId"
                            },
                            {
                                "kind": "account",
                                "path": "winner"
                            }
                        ]
                    }
                },
                {
                    "name": "raffleAdmin",
                    "signer": true
                },
                {
                    "name": "winner",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "prizeMint"
                },
                {
                    "name": "prizeEscrow",
                    "writable": true
                },
                {
                    "name": "winnerPrizeAta",
                    "writable": true
                },
                {
                    "name": "prizeTokenProgram"
                },
                {
                    "name": "systemProgram",
                    "address": "11111111111111111111111111111111"
                }
            ],
            "args": [
                {
                    "name": "raffleId",
                    "type": "u32"
                }
            ]
        },
        {
            "name": "cancelRaffle",
            "discriminator": [
                135,
                191,
                223,
                141,
                192,
                186,
                234,
                254
            ],
            "accounts": [
                {
                    "name": "raffleConfig",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "raffle",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            },
                            {
                                "kind": "arg",
                                "path": "raffleId"
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
                    "name": "raffleAdmin",
                    "signer": true
                },
                {
                    "name": "prizeMint"
                },
                {
                    "name": "prizeEscrow",
                    "writable": true
                },
                {
                    "name": "creatorPrizeAta",
                    "writable": true
                },
                {
                    "name": "prizeTokenProgram"
                },
                {
                    "name": "systemProgram",
                    "address": "11111111111111111111111111111111"
                }
            ],
            "args": [
                {
                    "name": "raffleId",
                    "type": "u32"
                }
            ]
        },
        {
            "name": "claimAmountBack",
            "discriminator": [
                203,
                244,
                195,
                101,
                12,
                169,
                255,
                163
            ],
            "accounts": [
                {
                    "name": "raffleConfig",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "raffle",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            },
                            {
                                "kind": "arg",
                                "path": "raffleId"
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
                    "name": "raffleAdmin",
                    "signer": true
                },
                {
                    "name": "prizeMint"
                },
                {
                    "name": "ticketMint"
                },
                {
                    "name": "prizeEscrow",
                    "writable": true
                },
                {
                    "name": "ticketEscrow",
                    "writable": true
                },
                {
                    "name": "creatorPrizeAta",
                    "writable": true
                },
                {
                    "name": "creatorTicketAta",
                    "writable": true
                },
                {
                    "name": "prizeTokenProgram"
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
                    "name": "raffleId",
                    "type": "u32"
                }
            ]
        },
        {
            "name": "createRaffle",
            "discriminator": [
                226,
                206,
                159,
                34,
                213,
                207,
                98,
                126
            ],
            "accounts": [
                {
                    "name": "raffleConfig",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "raffle",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "raffle_config.raffle_count",
                                "account": "raffleConfig"
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
                    "name": "raffleAdmin",
                    "signer": true
                },
                {
                    "name": "ticketMint"
                },
                {
                    "name": "prizeMint"
                },
                {
                    "name": "ticketEscrow",
                    "writable": true
                },
                {
                    "name": "prizeEscrow",
                    "writable": true
                },
                {
                    "name": "creatorPrizeAta",
                    "writable": true
                },
                {
                    "name": "ticketTokenProgram"
                },
                {
                    "name": "prizeTokenProgram"
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
                    "name": "maxPerWalletPct",
                    "type": "u8"
                },
                {
                    "name": "prizeType",
                    "type": {
                        "defined": {
                            "name": "prizeType"
                        }
                    }
                },
                {
                    "name": "prizeAmount",
                    "type": "u64"
                },
                {
                    "name": "numWinners",
                    "type": "u8"
                },
                {
                    "name": "winShares",
                    "type": "bytes"
                },
                {
                    "name": "isUniqueWinners",
                    "type": "bool"
                },
                {
                    "name": "startRaffle",
                    "type": "bool"
                },
                {
                    "name": "maximumTickets",
                    "type": "u16"
                }
            ]
        },
        {
            "name": "initializeRaffleConfig",
            "discriminator": [
                81,
                95,
                191,
                34,
                162,
                176,
                141,
                43
            ],
            "accounts": [
                {
                    "name": "raffleConfig",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
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
                    "name": "raffleOwner",
                    "type": "pubkey"
                },
                {
                    "name": "raffleAdmin",
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
                    "name": "minimumRafflePeriod",
                    "type": "u32"
                },
                {
                    "name": "maximumRafflePeriod",
                    "type": "u32"
                },
                {
                    "name": "maximumWalletPct",
                    "type": "u8"
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
                    "name": "raffleConfig",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "raffleOwner",
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
            "name": "updateRaffleConfigAdmin",
            "discriminator": [
                74,
                242,
                44,
                45,
                75,
                79,
                185,
                224
            ],
            "accounts": [
                {
                    "name": "raffleConfig",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "raffleOwner",
                    "writable": true,
                    "signer": true
                }
            ],
            "args": [
                {
                    "name": "newRaffleAdmin",
                    "type": "pubkey"
                }
            ]
        },
        {
            "name": "updateRaffleConfigData",
            "discriminator": [
                82,
                95,
                33,
                15,
                181,
                163,
                101,
                85
            ],
            "accounts": [
                {
                    "name": "raffleConfig",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "raffleOwner",
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
                    "name": "minimumRafflePeriod",
                    "type": "u32"
                },
                {
                    "name": "maximumRafflePeriod",
                    "type": "u32"
                },
                {
                    "name": "maximumWalletPct",
                    "type": "u8"
                }
            ]
        },
        {
            "name": "updateRaffleConfigOwner",
            "discriminator": [
                118,
                122,
                145,
                97,
                163,
                152,
                14,
                113
            ],
            "accounts": [
                {
                    "name": "raffleConfig",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "raffleOwner",
                    "writable": true,
                    "signer": true
                }
            ],
            "args": [
                {
                    "name": "newRaffleOwner",
                    "type": "pubkey"
                }
            ]
        },
        {
            "name": "updateRaffleTicketing",
            "discriminator": [
                118,
                12,
                123,
                14,
                172,
                34,
                211,
                212
            ],
            "accounts": [
                {
                    "name": "raffleConfig",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "raffle",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            },
                            {
                                "kind": "arg",
                                "path": "raffleId"
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
                    "name": "raffleAdmin",
                    "signer": true
                }
            ],
            "args": [
                {
                    "name": "raffleId",
                    "type": "u32"
                },
                {
                    "name": "newTotalTickets",
                    "type": "u16"
                },
                {
                    "name": "newTicketPrice",
                    "type": "u64"
                },
                {
                    "name": "newMaxPerWalletPct",
                    "type": "u8"
                },
                {
                    "name": "newMaximumTickets",
                    "type": "u16"
                }
            ]
        },
        {
            "name": "updateRaffleTime",
            "discriminator": [
                238,
                164,
                119,
                208,
                86,
                120,
                178,
                163
            ],
            "accounts": [
                {
                    "name": "raffleConfig",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "raffle",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            },
                            {
                                "kind": "arg",
                                "path": "raffleId"
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
                    "name": "raffleAdmin",
                    "signer": true
                }
            ],
            "args": [
                {
                    "name": "raffleId",
                    "type": "u32"
                },
                {
                    "name": "newStartTime",
                    "type": "i64"
                },
                {
                    "name": "newEndTime",
                    "type": "i64"
                }
            ]
        },
        {
            "name": "updateRaffleWinners",
            "discriminator": [
                24,
                6,
                130,
                11,
                83,
                211,
                207,
                170
            ],
            "accounts": [
                {
                    "name": "raffleConfig",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            }
                        ]
                    }
                },
                {
                    "name": "raffle",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
                                ]
                            },
                            {
                                "kind": "arg",
                                "path": "raffleId"
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
                    "name": "raffleAdmin",
                    "signer": true
                }
            ],
            "args": [
                {
                    "name": "raffleId",
                    "type": "u32"
                },
                {
                    "name": "newWinShares",
                    "type": "bytes"
                },
                {
                    "name": "newIsUniqueWinners",
                    "type": "bool"
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
                    "name": "raffleConfig",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
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
                    "name": "raffleConfig",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    114,
                                    97,
                                    102,
                                    102,
                                    108,
                                    101
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
                                "path": "raffleConfig"
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
            "name": "buyer",
            "discriminator": [
                212,
                193,
                28,
                181,
                26,
                219,
                85,
                174
            ]
        },
        {
            "name": "raffle",
            "discriminator": [
                143,
                133,
                63,
                173,
                138,
                10,
                142,
                200
            ]
        },
        {
            "name": "raffleConfig",
            "discriminator": [
                70,
                211,
                113,
                93,
                22,
                204,
                183,
                119
            ]
        }
    ],
    "events": [
        {
            "name": "amountClaimBack",
            "discriminator": [
                61,
                225,
                105,
                20,
                230,
                253,
                58,
                208
            ]
        },
        {
            "name": "colledtedTicketRevenue",
            "discriminator": [
                97,
                247,
                20,
                226,
                72,
                49,
                100,
                123
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
            "name": "raffleActivated",
            "discriminator": [
                248,
                120,
                222,
                111,
                248,
                249,
                101,
                163
            ]
        },
        {
            "name": "raffleCancelled",
            "discriminator": [
                123,
                83,
                254,
                127,
                53,
                244,
                159,
                102
            ]
        },
        {
            "name": "raffleCreated",
            "discriminator": [
                178,
                172,
                201,
                96,
                233,
                171,
                6,
                99
            ]
        },
        {
            "name": "raffleFailed",
            "discriminator": [
                135,
                207,
                186,
                78,
                167,
                55,
                96,
                143
            ]
        },
        {
            "name": "raffleTicketingUpdated",
            "discriminator": [
                61,
                15,
                147,
                134,
                25,
                81,
                65,
                188
            ]
        },
        {
            "name": "raffleTimeUpdated",
            "discriminator": [
                145,
                114,
                155,
                203,
                166,
                149,
                133,
                153
            ]
        },
        {
            "name": "raffleWinnersUpdated",
            "discriminator": [
                137,
                227,
                147,
                84,
                43,
                36,
                196,
                142
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
        },
        {
            "name": "ticketPurchased",
            "discriminator": [
                108,
                59,
                246,
                95,
                84,
                145,
                13,
                71
            ]
        },
        {
            "name": "winnersAnnounced",
            "discriminator": [
                153,
                186,
                3,
                103,
                193,
                218,
                144,
                78
            ]
        }
    ],
    "errors": [
        {
            "code": 6000,
            "name": "tokenTransferFailed",
            "msg": "Token transfer failed"
        },
        {
            "code": 6001,
            "name": "solTransferFailed",
            "msg": "SOL transfer failed"
        },
        {
            "code": 6002,
            "name": "insufficientTokenBalance",
            "msg": "Insufficient SPL Token Balance"
        },
        {
            "code": 6003,
            "name": "insufficientSolBalance",
            "msg": "Insufficient SOL Token Balance"
        }
    ],
    "types": [
        {
            "name": "amountClaimBack",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "raffleId",
                        "type": "u32"
                    },
                    {
                        "name": "claimer",
                        "type": "pubkey"
                    },
                    {
                        "name": "prizeAmountClaimable",
                        "type": "u64"
                    },
                    {
                        "name": "ticketAmountClaimable",
                        "type": "u64"
                    },
                    {
                        "name": "claimedTime",
                        "type": "i64"
                    }
                ]
            }
        },
        {
            "name": "buyer",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "raffleId",
                        "type": "u32"
                    },
                    {
                        "name": "user",
                        "type": "pubkey"
                    },
                    {
                        "name": "tickets",
                        "type": "u16"
                    }
                ]
            }
        },
        {
            "name": "colledtedTicketRevenue",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "raffleId",
                        "type": "u32"
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
                        "name": "totalTicketsSold",
                        "type": "u16"
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
            "name": "prizeClaimed",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "raffleId",
                        "type": "u32"
                    },
                    {
                        "name": "winner",
                        "type": "pubkey"
                    },
                    {
                        "name": "winnerIndex",
                        "type": "u8"
                    },
                    {
                        "name": "prizeType",
                        "type": {
                            "defined": {
                                "name": "prizeType"
                            }
                        }
                    },
                    {
                        "name": "prizeAmount",
                        "type": "u64"
                    },
                    {
                        "name": "claimedTime",
                        "type": "i64"
                    }
                ]
            }
        },
        {
            "name": "prizeType",
            "repr": {
                "kind": "rust"
            },
            "type": {
                "kind": "enum",
                "variants": [
                    {
                        "name": "nft"
                    },
                    {
                        "name": "spl"
                    },
                    {
                        "name": "sol"
                    }
                ]
            }
        },
        {
            "name": "raffle",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "raffleId",
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
                        "name": "ticketsSold",
                        "type": "u16"
                    },
                    {
                        "name": "buyersCount",
                        "type": "u16"
                    },
                    {
                        "name": "ticketPrice",
                        "type": "u64"
                    },
                    {
                        "name": "ticketMint",
                        "type": {
                            "option": "pubkey"
                        }
                    },
                    {
                        "name": "maxPerWalletPct",
                        "type": "u8"
                    },
                    {
                        "name": "prizeType",
                        "type": {
                            "defined": {
                                "name": "prizeType"
                            }
                        }
                    },
                    {
                        "name": "prizeAmount",
                        "type": "u64"
                    },
                    {
                        "name": "prizeMint",
                        "type": {
                            "option": "pubkey"
                        }
                    },
                    {
                        "name": "numWinners",
                        "type": "u8"
                    },
                    {
                        "name": "isUniqueWinners",
                        "type": "bool"
                    },
                    {
                        "name": "status",
                        "type": {
                            "defined": {
                                "name": "raffleState"
                            }
                        }
                    },
                    {
                        "name": "winShares",
                        "type": "bytes"
                    },
                    {
                        "name": "winners",
                        "type": {
                            "vec": "pubkey"
                        }
                    },
                    {
                        "name": "isWinClaimed",
                        "type": {
                            "vec": "bool"
                        }
                    },
                    {
                        "name": "claimableTicketAmount",
                        "type": "u64"
                    },
                    {
                        "name": "claimablePrizeBack",
                        "type": "u64"
                    },
                    {
                        "name": "raffleBump",
                        "type": "u8"
                    },
                    {
                        "name": "maximumTickets",
                        "type": "u16"
                    }
                ]
            }
        },
        {
            "name": "raffleActivated",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "raffleId",
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
            "name": "raffleCancelled",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "raffleId",
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
            "name": "raffleConfig",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "raffleOwner",
                        "type": "pubkey"
                    },
                    {
                        "name": "raffleAdmin",
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
                        "name": "minimumRafflePeriod",
                        "type": "u32"
                    },
                    {
                        "name": "maximumRafflePeriod",
                        "type": "u32"
                    },
                    {
                        "name": "raffleCount",
                        "type": "u32"
                    },
                    {
                        "name": "pauseFlags",
                        "type": "u8"
                    },
                    {
                        "name": "configBump",
                        "type": "u8"
                    },
                    {
                        "name": "maximumWalletPct",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "raffleCreated",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "raffleId",
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
            "name": "raffleFailed",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "raffleId",
                        "type": "u32"
                    },
                    {
                        "name": "claimablePrizeBack",
                        "type": "u64"
                    },
                    {
                        "name": "announceTime",
                        "type": "i64"
                    }
                ]
            }
        },
        {
            "name": "raffleState",
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
                        "name": "successEnded"
                    },
                    {
                        "name": "failedEnded"
                    }
                ]
            }
        },
        {
            "name": "raffleTicketingUpdated",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "raffleId",
                        "type": "u32"
                    },
                    {
                        "name": "newTotalTickets",
                        "type": "u16"
                    },
                    {
                        "name": "newTicketPrice",
                        "type": "u64"
                    },
                    {
                        "name": "newMaxPerWalletPct",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "raffleTimeUpdated",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "raffleId",
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
                        "name": "updatedTime",
                        "type": "i64"
                    }
                ]
            }
        },
        {
            "name": "raffleWinnersUpdated",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "raffleId",
                        "type": "u32"
                    },
                    {
                        "name": "winShares",
                        "type": "bytes"
                    },
                    {
                        "name": "isUniqueWinners",
                        "type": "bool"
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
        },
        {
            "name": "ticketPurchased",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "raffleId",
                        "type": "u32"
                    },
                    {
                        "name": "buyer",
                        "type": "pubkey"
                    },
                    {
                        "name": "ticketsBought",
                        "type": "u16"
                    },
                    {
                        "name": "pricePaid",
                        "type": "u64"
                    },
                    {
                        "name": "boughtTime",
                        "type": "i64"
                    }
                ]
            }
        },
        {
            "name": "winnersAnnounced",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "raffleId",
                        "type": "u32"
                    },
                    {
                        "name": "effectiveWinners",
                        "type": "u8"
                    },
                    {
                        "name": "claimablePrizeBack",
                        "type": "u64"
                    },
                    {
                        "name": "announceTime",
                        "type": "i64"
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