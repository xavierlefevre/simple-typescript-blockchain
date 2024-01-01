import { MINT_PUBLIC_ADDRESS } from './wallets'
import { SHA256 } from './cryptography'
import { Transaction } from './transaction'
import type { Blockchain } from './blockchain'

const log16 = (n: number): number => Math.log(n) / Math.log(16)

export class Block {
    public timestamp: string
    public transactionList: Transaction[]
    public hash: string
    public previousHash: string
    public nonce: number

    constructor({
        timestamp,
        previousHash,
        transactionList,
    }: {
        timestamp: string
        previousHash: string
        transactionList: Transaction[]
    }) {
        this.timestamp = timestamp
        this.transactionList = transactionList
        this.previousHash = previousHash
        this.hash = Block.computeHash(this)
        this.nonce = 0
    }

    static computeHash(block: Block): string {
        return SHA256(
            block.previousHash +
                block.timestamp +
                JSON.stringify(block.transactionList) +
                block.nonce
        )
    }

    // --- Explanation ---
    // It takes a certain amount of time for miners to find a valid hash for the block.
    // They need to compute enough hashed to find a fixed number of leading zeros.
    // The diffulty is set and adjusted regularly to ensure a consistant time to mine.
    // The purpose is to ensure that it is slower for a hacker to rebuild a fake chain chunk
    // than for the rest of the network to continue to grow the valid chain
    public mine(difficulty: number): void {
        while (
            !this.hash.startsWith(
                '000' + Array(Math.round(log16(difficulty)) + 1).join('0')
            )
        ) {
            this.nonce++
            this.hash = Block.computeHash(this)
        }
    }

    // --- Explanation ---
    // Not used at the moment, as called by the not used Blockchain validation function
    static hasValidTransactions(block: Block, chain: Blockchain): boolean {
        let gas = 0,
            reward = 0

        block.transactionList.forEach((transaction) => {
            if (transaction.from !== MINT_PUBLIC_ADDRESS) {
                gas += transaction.gas
            } else {
                reward = transaction.amount
            }
        })

        return (
            reward - gas === chain.miningReward &&
            block.transactionList.every((transaction) =>
                Transaction.isValid({ transaction, chain })
            ) &&
            block.transactionList.filter(
                (transaction) => transaction.from === MINT_PUBLIC_ADDRESS
            ).length === 1
        )
    }
}
