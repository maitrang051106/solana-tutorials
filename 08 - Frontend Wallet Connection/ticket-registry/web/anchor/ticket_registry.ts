/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/ticket_registry.json`.
 */
export type TicketRegistry = {
  "address": "9UDzQZ1pE1SVWKwNvc8tsMSQKVNp2jh1kxAY81b8Fo79",
  "metadata": {
    "name": "ticketRegistry",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
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
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "ticketAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  105,
                  99,
                  107,
                  101,
                  116,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "buyer"
              },
              {
                "kind": "account",
                "path": "eventAccount"
              }
            ]
          }
        },
        {
          "name": "eventAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "eventAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "name"
              },
              {
                "kind": "account",
                "path": "eventOrganizer"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventOrganizer",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "ticketPrice",
          "type": "u64"
        },
        {
          "name": "availableTickets",
          "type": "u64"
        },
        {
          "name": "startDate",
          "type": "i64"
        }
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "eventOrganizer",
          "writable": true,
          "signer": true,
          "relations": [
            "eventAccount"
          ]
        },
        {
          "name": "eventAccount",
          "writable": true
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
      "name": "eventAccount",
      "discriminator": [
        98,
        136,
        32,
        165,
        133,
        231,
        243,
        154
      ]
    },
    {
      "name": "ticketAccount",
      "discriminator": [
        231,
        93,
        13,
        18,
        239,
        66,
        21,
        45
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "nameTooLong",
      "msg": "Name is too long"
    },
    {
      "code": 6001,
      "name": "descriptionTooLong",
      "msg": "Description is too long"
    },
    {
      "code": 6002,
      "name": "invalidStartDate",
      "msg": "Start date is in the past"
    },
    {
      "code": 6003,
      "name": "zeroTickets",
      "msg": "Available tickets must be greater than zero"
    },
    {
      "code": 6004,
      "name": "soldOut",
      "msg": "All tickets are sold out"
    },
    {
      "code": 6005,
      "name": "eventAlreadyStarted",
      "msg": "Event has already started"
    },
    {
      "code": 6006,
      "name": "insufficientFunds",
      "msg": "Insufficient funds to withdraw"
    }
  ],
  "types": [
    {
      "name": "eventAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "ticketPrice",
            "type": "u64"
          },
          {
            "name": "availableTickets",
            "type": "u64"
          },
          {
            "name": "eventOrganizer",
            "type": "pubkey"
          },
          {
            "name": "startDate",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "ticketAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "event",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
