# Tip-Creators

A decentralized tipping platform built on Stacks blockchain with advanced features for social engagement and rewards.

## Overview

Tip-stacks is a smart contract-powered platform that enables users to send tips to each other using various tokens (currently STX and BTC). The platform includes identity management, reward mechanics, and comprehensive transaction tracking.

## Features

- **Multi-token Support**: Send tips in STX, BTC, and potentially more tokens in the future
- **User Identity System**: Register unique usernames with verification
- **Reward Mechanism**: Earn reward points for active participation
- **Transaction History**: Complete record of all tips sent and received
- **Platform Fee**: Small platform fee (5%) to support ongoing development
- **Safety Limits**: Maximum tip amounts and validation checks

## Smart Contract Structure

The Tip-stacks smart contract is organized into several logical sections:

### Constants
Configuration parameters that define platform behavior:
- Contract owner address
- Fee percentage (5%)
- Transaction limits (1000 STX max)
- Reward thresholds and rates

### Error Codes
Comprehensive error handling for all possible edge cases:
- Transaction validation errors
- User identity validation
- Authorization issues
- Token validation

### Data Maps
Persistent storage for platform data:
- `user-tip-stats`: Tracking of tips sent, received, and reward points
- `tip-history`: Detailed transaction records
- `user-identity`: Username and verification status
- `username-registry`: Ensures username uniqueness

### Functions

#### Helper Functions
- `calculate-platform-fee`: Determine platform fees for transactions
- `calculate-tip-amount`: Calculate net tip after fees
- `get-current-block-height`: Access blockchain timestamp
- `get-default-stats`: Initialize user statistics

#### Private Functions
- Transaction processing logic
- User statistics updates
- Validation checks

#### Public Functions
- `tip`: Send tips to other users
- `update-user-reward-points`: Manage the reward system
- `set-user-identity`: Register and verify usernames

#### Read-only Functions
- Query user statistics and identities
- Access transaction history
- Calculate potential rewards and fees

## Usage Examples

### Sending a Tip

```clarity
;; Send 10 STX to another user
(contract-call? .tip-stacks tip 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM u10000000 "STX")
```

### Setting a Username

```clarity
;; Register a username
(contract-call? .tip-stacks set-user-identity tx-sender "satoshi")
```

### Checking Stats

```clarity
;; Get your tip statistics
(contract-call? .tip-stacks get-user-tip-stats tx-sender)
```

## Security Considerations

The contract implements multiple security measures:
- Principal validation for all transactions
- Amount validations to prevent errors
- Authorization checks for privileged operations
- Token type validation

## Development

### Prerequisites
- [Clarity language knowledge](https://book.clarity-lang.org/)
- [Stacks blockchain environment](https://docs.stacks.co/)

### Deployment
1. Deploy the smart contract to the Stacks blockchain
2. Initialize any required configuration
3. Test basic functionality with small transactions

## Future Enhancements

- Support for additional tokens (SIP-010 tokens)
- Advanced reward tiers and benefits
- Integration with social platforms
- DAO governance for platform parameters

---

## License

[MIT License](LICENSE)

## Contact

For inquiries about Tip-stacks, please open an issue in this repository.