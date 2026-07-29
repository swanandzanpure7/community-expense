# Architecture

## Smart Contract

Single Soroban contract `expense_group` handles all logic:

```
expense_group (Rust / WASM)
├── initialize()        - Set up group
├── join_group()        - Member joins
├── leave_group()       - Member leaves
├── deposit()           - Add XLM to treasury
├── create_expense()    - Submit expense request
├── approve_expense()   - Vote to approve (auto-settles)
├── reject_expense()    - Vote to reject
├── get_group_info()    - Read group state
├── get_all_expenses()  - List all expenses
├── get_members()       - List members
└── get_treasury_balance() - Check treasury
```

## Storage

All state stored on-chain in contract instance storage:
- `ADMIN` — Admin address
- `GRPNAME` — Group name
- `GRPDESC` — Group description
- `THRESH` — Approval threshold (%)
- `EXPCOUNT` — Expense counter
- `MEMBERS` — Vec of member addresses
- `TREASURY` — Treasury balance (stroops)
- `(EXP, id)` — Each expense struct
- `(VOTED, id, address)` — Vote tracking

## Frontend Architecture

```
FreighterContext (React Context)
  ├── connectFreighter()
  ├── getAddress()
  └── getNetwork()

lib/soroban.ts
  ├── invokeContract() - sign + submit tx
  └── readContract()   - simulate read-only

lib/freighter.ts
  └── signStellarTransaction()
```
