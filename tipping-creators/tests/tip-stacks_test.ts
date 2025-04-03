import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const CONTRACT_NAME = 'tip-stacks';
const CONTRACT_OWNER = 'STFPYA06K2F5BY0ESPY7HMK70WEAEXBFF20HGPYX';

Clarinet.test({
    name: "Ensure that users can send tips successfully",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        const tipAmount = 10000000; // 10 STX

        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'tip',
                [
                    types.principal(user2.address),
                    types.uint(tipAmount),
                    types.ascii("STX")
                ],
                user1.address
            )
        ]);

        // Assert that the transaction was successful
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify stats were updated correctly
        const user1Stats = chain.callReadOnlyFn(
            CONTRACT_NAME,
            'get-user-tip-stats',
            [types.principal(user1.address)],
            user1.address
        );

        const user2Stats = chain.callReadOnlyFn(
            CONTRACT_NAME,
            'get-user-tip-stats',
            [types.principal(user2.address)],
            user2.address
        );

        // Calculate expected values
        const platformFee = Math.floor(tipAmount * 5 / 100); // 5% platform fee
        const actualTipAmount = tipAmount - platformFee;

        // Check user1's stats (sender)
        const user1StatsData = user1Stats.result.expectTuple();
        assertEquals(user1StatsData['total-tips-sent'].expectUint(), tipAmount);

        // Check user2's stats (recipient)
        const user2StatsData = user2Stats.result.expectTuple();
        assertEquals(user2StatsData['total-tips-received'].expectUint(), actualTipAmount);
    },
});

Clarinet.test({
    name: "Ensure that tips fail with insufficient funds",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        // Attempt to send more STX than the user has
        const excessiveAmount = 10000000000000; // Much more than default wallet balance

        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'tip',
                [
                    types.principal(user2.address),
                    types.uint(excessiveAmount),
                    types.ascii("STX")
                ],
                user1.address
            )
        ]);

        // Assert that the transaction failed with ERR_INVALID_AMOUNT
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(err u${2})`); // ERR_INVALID_AMOUNT
    },
});

Clarinet.test({
    name: "Ensure that tips fail with invalid recipient",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const user1 = accounts.get('wallet_1')!;
        const tipAmount = 10000000; // 10 STX

        // Test tipping to contract owner (not allowed)
        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'tip',
                [
                    types.principal(CONTRACT_OWNER),
                    types.uint(tipAmount),
                    types.ascii("STX")
                ],
                user1.address
            )
        ]);

        // Assert that the transaction failed with ERR_INVALID_RECIPIENT
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(err u${5})`); // ERR_INVALID_RECIPIENT

        // Test tipping to self (not allowed)
        block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'tip',
                [
                    types.principal(user1.address),
                    types.uint(tipAmount),
                    types.ascii("STX")
                ],
                user1.address
            )
        ]);

        // Assert that the transaction failed with ERR_INVALID_RECIPIENT
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(err u${5})`); // ERR_INVALID_RECIPIENT
    },
});

Clarinet.test({
    name: "Ensure that tips fail with invalid token type",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        const tipAmount = 10000000; // 10 STX

        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'tip',
                [
                    types.principal(user2.address),
                    types.uint(tipAmount),
                    types.ascii("XYZ") // Invalid token
                ],
                user1.address
            )
        ]);

        // Assert that the transaction failed with ERR_INVALID_TOKEN_TYPE
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(err u${11})`); // ERR_INVALID_TOKEN_TYPE
    },
});

Clarinet.test({
    name: "Ensure that rewards are correctly calculated for tips over the threshold",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        const tipAmount = 2000000; // 2 STX (above the 1 STX threshold)

        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'tip',
                [
                    types.principal(user2.address),
                    types.uint(tipAmount),
                    types.ascii("STX")
                ],
                user1.address
            )
        ]);

        // Assert that the transaction was successful
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Check user1's reward points
        const user1Stats = chain.callReadOnlyFn(
            CONTRACT_NAME,
            'get-user-tip-stats',
            [types.principal(user1.address)],
            user1.address
        );

        const user1StatsData = user1Stats.result.expectTuple();
        assertEquals(user1StatsData['reward-points'].expectUint(), 10); // REWARD_RATE = 10
    },
});

Clarinet.test({
    name: "Ensure that rewards are not given for tips under the threshold",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        const tipAmount = 500000; // 0.5 STX (below the 1 STX threshold)

        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'tip',
                [
                    types.principal(user2.address),
                    types.uint(tipAmount),
                    types.ascii("STX")
                ],
                user1.address
            )
        ]);

        // Assert that the transaction was successful
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Check user1's reward points
        const user1Stats = chain.callReadOnlyFn(
            CONTRACT_NAME,
            'get-user-tip-stats',
            [types.principal(user1.address)],
            user1.address
        );

        const user1StatsData = user1Stats.result.expectTuple();
        assertEquals(user1StatsData['reward-points'].expectUint(), 0); // No rewards for below threshold
    },
});

Clarinet.test({
    name: "Ensure that only contract owner can update user reward points",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        const rewardRate = 20;

        // First try with non-owner (should fail)
        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'update-user-reward-points',
                [
                    types.principal(user2.address),
                    types.uint(rewardRate)
                ],
                user1.address // Not the contract owner
            )
        ]);

        // Assert that the transaction failed with ERR_UNAUTHORIZED
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(err u${6})`); // ERR_UNAUTHORIZED

        // Now try with contract owner (should succeed)
        // Note: Deployer is not necessarily the contract owner as defined in the contract
        // For this test, we'd need to deploy with a custom Clarinet configuration where the deployer
        // matches CONTRACT_OWNER or modify the contract to use deployer.address
    },
});

Clarinet.test({
    name: "Ensure that users can set their identity with valid usernames",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const user1 = accounts.get('wallet_1')!;
        const validUsername = "alice";

        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'set-user-identity',
                [
                    types.principal(user1.address),
                    types.ascii(validUsername)
                ],
                user1.address
            )
        ]);

        // Assert that the transaction was successful
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify identity was set correctly
        const userIdentity = chain.callReadOnlyFn(
            CONTRACT_NAME,
            'get-user-identity',
            [types.principal(user1.address)],
            user1.address
        );

        const identityData = userIdentity.result.expectTuple();
        assertEquals(identityData['username'].expectAscii(), validUsername);
        assertEquals(identityData['verified'].expectBool(), true);
    },
});

Clarinet.test({
    name: "Ensure that setting identity fails with invalid username length",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const user1 = accounts.get('wallet_1')!;
        const tooShortUsername = "ab"; // Less than 3 characters
        const tooLongUsername = "abcdefghijklmnopqrstuvwxyz"; // More than 20 characters

        // Test with too short username
        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'set-user-identity',
                [
                    types.principal(user1.address),
                    types.ascii(tooShortUsername)
                ],
                user1.address
            )
        ]);

        // Assert that the transaction failed with ERR_INVALID_USERNAME_LENGTH
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(err u${9})`); // ERR_INVALID_USERNAME_LENGTH

        // Test with too long username
        block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'set-user-identity',
                [
                    types.principal(user1.address),
                    types.ascii(tooLongUsername)
                ],
                user1.address
            )
        ]);

        // Assert that the transaction failed with ERR_INVALID_USERNAME_LENGTH
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(err u${9})`); // ERR_INVALID_USERNAME_LENGTH
    },
});

Clarinet.test({
    name: "Ensure that username registration prevents duplicates",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        const username = "testuser";

        // First user registers the username
        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'set-user-identity',
                [
                    types.principal(user1.address),
                    types.ascii(username)
                ],
                user1.address
            )
        ]);

        // Assert that the transaction was successful
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Second user tries to register the same username
        block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'set-user-identity',
                [
                    types.principal(user2.address),
                    types.ascii(username)
                ],
                user2.address
            )
        ]);

        // Assert that the transaction failed with ERR_USERNAME_TAKEN
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(err u${10})`); // ERR_USERNAME_TAKEN
    },
});

Clarinet.test({
    name: "Ensure that users can only set their own identity",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        const username = "alice";

        // User1 tries to set User2's identity
        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'set-user-identity',
                [
                    types.principal(user2.address),
                    types.ascii(username)
                ],
                user1.address // User1 trying to set User2's identity
            )
        ]);

        // Assert that the transaction failed with ERR_UNAUTHORIZED
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(err u${6})`); // ERR_UNAUTHORIZED
    },
});

Clarinet.test({
    name: "Ensure that read-only functions return correct values",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        const tipAmount = 5000000; // 5 STX

        // Send a tip to create some data
        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'tip',
                [
                    types.principal(user2.address),
                    types.uint(tipAmount),
                    types.ascii("STX")
                ],
                user1.address
            )
        ]);

        // Test get-total-tips-sent
        const tipsSent = chain.callReadOnlyFn(
            CONTRACT_NAME,
            'get-total-tips-sent',
            [types.principal(user1.address)],
            user1.address
        );

        assertEquals(tipsSent.result.expectUint(), tipAmount);

        // Test get-total-tips-received
        const tipsReceived = chain.callReadOnlyFn(
            CONTRACT_NAME,
            'get-total-tips-received',
            [types.principal(user2.address)],
            user2.address
        );

        // Calculate expected received amount (after platform fee)
        const platformFee = Math.floor(tipAmount * 5 / 100);
        const expectedReceivedAmount = tipAmount - platformFee;

        assertEquals(tipsReceived.result.expectUint(), expectedReceivedAmount);

        // Test get-reward-points
        const rewardPoints = chain.callReadOnlyFn(
            CONTRACT_NAME,
            'get-reward-points',
            [types.principal(user1.address), types.uint(tipAmount)],
            user1.address
        );

        // Check if reward points calculation is correct
        // Since 5 STX > 1 STX threshold, should get 10 reward points
        assertEquals(rewardPoints.result.expectUint(), 10);
    },
});

Clarinet.test({
    name: "Ensure that multiple tips accumulate stats correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        const user3 = accounts.get('wallet_3')!;
        const tipAmount1 = 2000000; // 2 STX
        const tipAmount2 = 3000000; // 3 STX

        // Send multiple tips
        let block = chain.mineBlock([
            // User1 tips User2
            Tx.contractCall(
                CONTRACT_NAME,
                'tip',
                [
                    types.principal(user2.address),
                    types.uint(tipAmount1),
                    types.ascii("STX")
                ],
                user1.address
            ),
            // User1 tips User3
            Tx.contractCall(
                CONTRACT_NAME,
                'tip',
                [
                    types.principal(user3.address),
                    types.uint(tipAmount2),
                    types.ascii("STX")
                ],
                user1.address
            )
        ]);

        // Both transactions should succeed
        assertEquals(block.receipts.length, 2);
        assertEquals(block.receipts[0].result, '(ok true)');
        assertEquals(block.receipts[1].result, '(ok true)');

        // Check user1's total sent (should be sum of both tips)
        const user1Stats = chain.callReadOnlyFn(
            CONTRACT_NAME,
            'get-user-tip-stats',
            [types.principal(user1.address)],
            user1.address
        );

        const user1StatsData = user1Stats.result.expectTuple();
        assertEquals(user1StatsData['total-tips-sent'].expectUint(), tipAmount1 + tipAmount2);

        // Each tip is above threshold, so should get 10 points per tip
        assertEquals(user1StatsData['reward-points'].expectUint(), 20);
    },
});

Clarinet.test({
    name: "Ensure that tips exceeding MAX_TIP_AMOUNT are rejected",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;
        const maxAmount = 1000000000; // 1000 STX (MAX_TIP_AMOUNT)
        const exceedingAmount = maxAmount + 1;

        let block = chain.mineBlock([
            Tx.contractCall(
                CONTRACT_NAME,
                'tip',
                [
                    types.principal(user2.address),
                    types.uint(exceedingAmount),
                    types.ascii("STX")
                ],
                user1.address
            )
        ]);

        // Assert that the transaction failed with ERR_INVALID_AMOUNT
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, `(err u${2})`); // ERR_INVALID_AMOUNT
    },
});