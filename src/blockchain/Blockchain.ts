import { ContractRuntime } from '../opnet/modules/ContractRuntime.js';
import { Logger } from '@btc-vision/logger';
import { Address } from '@btc-vision/bsi-binary';
import { AddressGenerator, EcKeyPair } from '@btc-vision/transaction';
import { Network, networks } from 'bitcoinjs-lib';

class BlockchainBase extends Logger {
    public readonly logColor: string = '#8332ff';
    public readonly deadAddress: Address = 'bc1dead';

    public traceGas: boolean = false;
    public tracePointers: boolean = false;
    public traceCalls: boolean = false;

    private _blockNumber: bigint = 1n;

    private readonly contracts: Map<string, ContractRuntime> = new Map<string, ContractRuntime>();

    constructor(public readonly network: Network) {
        super();
    }

    public get blockNumber(): bigint {
        return this._blockNumber;
    }

    public get caller(): Address {
        return this._caller;
    }

    public set caller(caller: Address) {
        this._caller = caller;
    }

    private _caller: Address = '';
    private _callee: Address = '';

    public get callee(): Address {
        return this._callee;
    }

    public set callee(callee: Address) {
        this._callee = callee;
    }

    public set blockNumber(blockNumber: bigint) {
        this._blockNumber = blockNumber;
    }

    private getRandomBytes(length: number): Buffer {
        return Buffer.from(crypto.getRandomValues(new Uint8Array(length)));
    }

    public generateRandomSegwitAddress(): Address {
        return AddressGenerator.generatePKSH(this.getRandomBytes(32), this.network);
    }

    public generateRandomTaprootAddress(): Address {
        const keypair = EcKeyPair.generateRandomKeyPair(this.network);
        return EcKeyPair.getTaprootAddress(keypair, this.network);
    }

    public register(contract: ContractRuntime): void {
        if (this.contracts.has(contract.address)) {
            throw new Error(`Contract already registered at address ${contract.address}`);
        }

        this.contracts.set(contract.address, contract);
    }

    public getContract(address: string): ContractRuntime {
        const contract = this.contracts.get(address);

        if (!contract) {
            throw new Error(`Contract not found at address ${address}`);
        }

        return contract;
    }

    public backup(): void {
        for (const contract of this.contracts.values()) {
            contract.backupStates();
        }
    }

    public restore(): void {
        for (const contract of this.contracts.values()) {
            contract.restoreStates();
        }
    }

    public dispose(): void {
        for (const contract of this.contracts.values()) {
            contract.dispose();
        }
    }

    public async init(): Promise<void> {
        this.dispose();

        for (const contract of this.contracts.values()) {
            await contract.init();
        }
    }

    public expandTo18Decimals(n: number): bigint {
        return BigInt(n) * 10n ** 18n;
    }

    public expandToDecimal(n: number, decimals: number): bigint {
        return BigInt(n) * 10n ** BigInt(decimals);
    }

    public decodeFrom18Decimals(n: bigint): number {
        return Number(n / 10n ** 18n);
    }

    public decodeFromDecimal(n: bigint, decimals: number): number {
        return Number(n / 10n ** BigInt(decimals));
    }

    public mineBlock(): void {
        this._blockNumber += 1n;
    }

    public enableGasTracking(): void {
        this.traceGas = true;
    }

    public disableGasTracking(): void {
        this.traceGas = false;
    }

    public enablePointerTracking(): void {
        this.tracePointers = true;
    }

    public disablePointerTracking(): void {
        this.tracePointers = false;
    }

    public enableCallTracking(): void {
        this.traceCalls = true;
    }

    public disableCallTracking(): void {
        this.traceCalls = false;
    }

    public encodePrice(reserve0: bigint, reserve1: bigint): [bigint, bigint] {
        const shift = 2n ** 112n;
        const price0 = (reserve1 * shift) / reserve0;
        const price1 = (reserve0 * shift) / reserve1;
        return [price0, price1];
    }
}

export const Blockchain = new BlockchainBase(networks.regtest);
