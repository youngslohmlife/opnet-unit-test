import { ContractRuntime } from '../opnet/modules/ContractRuntime.js';
import { Address, BinaryReader, BinaryWriter } from '@btc-vision/bsi-binary';
import { BytecodeManager } from '../opnet/modules/GetBytecode.js';
import { Blockchain } from '../blockchain/Blockchain.js';

export interface TransferEvent {
    readonly from: Address;
    readonly to: Address;
    readonly value: bigint;
}

export interface MintEvent {
    readonly to: Address;
    readonly value: bigint;
}

export interface BurnEvent {
    readonly value: bigint;
}

export class OP_20 extends ContractRuntime {
    protected readonly transferSelector: number = Number(
        `0x${this.abiCoder.encodeSelector('transfer')}`,
    );

    protected readonly mintSelector: number = Number(`0x${this.abiCoder.encodeSelector('mint')}`);

    protected readonly balanceOfSelector: number = Number(
        `0x${this.abiCoder.encodeSelector('balanceOf')}`,
    );

    protected readonly totalSupplySelector: number = Number(
        `0x${this.abiCoder.encodeSelector('totalSupply')}`,
    );

    constructor(
        public readonly fileName: string,
        address: Address,
        public readonly decimals: number,
        gasLimit: bigint = 300_000_000_000n,
    ) {
        super(
            address,
            'bcrt1pe0slk2klsxckhf90hvu8g0688rxt9qts6thuxk3u4ymxeejw53gs0xjlhn',
            gasLimit,
        );

        this.preserveState();
    }

    public async totalSupply(): Promise<bigint> {
        const result = await this.readView(this.totalSupplySelector);

        let response = result.response;
        if (!response) {
            this.dispose();
            throw result.error;
        }

        const reader: BinaryReader = new BinaryReader(result.response);
        return reader.readU256();
    }

    protected defineRequiredBytecodes(): void {
        BytecodeManager.loadBytecode(`./bytecode/${this.fileName}.wasm`, this.address);
    }

    public async mint(to: Address, amount: number): Promise<void> {
        const calldata = new BinaryWriter();
        calldata.writeAddress(to);
        calldata.writeU256(Blockchain.expandToDecimal(amount, this.decimals));
        calldata.writeAddressValueTupleMap(new Map());
        calldata.writeU256(0n);

        const buf = calldata.getBuffer();
        const result = await this.readMethod(
            this.mintSelector,
            Buffer.from(buf),
            this.deployer,
            this.deployer,
        );

        let response = result.response;
        if (!response) {
            this.dispose();
            throw result.error;
        }

        const reader = new BinaryReader(result.response);
        if (!reader.readBoolean()) {
            throw new Error('Mint failed');
        }
    }

    public static decodeBurnEvent(data: Buffer | Uint8Array): BurnEvent {
        const reader = new BinaryReader(data);
        const value = reader.readU256();

        return { value };
    }

    public static decodeTransferEvent(data: Buffer | Uint8Array): TransferEvent {
        const reader = new BinaryReader(data);
        const from = reader.readAddress();
        const to = reader.readAddress();
        const value = reader.readU256();

        return { from, to, value };
    }

    public static decodeMintEvent(data: Buffer | Uint8Array): MintEvent {
        const reader = new BinaryReader(data);
        const to = reader.readAddress();
        const value = reader.readU256();

        return { to, value };
    }

    public async transfer(from: Address, to: Address, amount: bigint): Promise<void> {
        const calldata = new BinaryWriter();
        calldata.writeAddress(to);
        calldata.writeU256(amount);

        const buf = calldata.getBuffer();
        const result = await this.readMethod(this.transferSelector, Buffer.from(buf), from, from);

        let response = result.response;
        if (!response) {
            this.dispose();
            throw result.error;
        }

        const reader = new BinaryReader(result.response);
        if (!reader.readBoolean()) {
            throw new Error('Transfer failed');
        }
    }

    public async balanceOf(owner: Address): Promise<bigint> {
        const calldata = new BinaryWriter();
        calldata.writeAddress(owner);

        const buf = calldata.getBuffer();
        const result = await this.readMethod(this.balanceOfSelector, Buffer.from(buf));

        let response = result.response;
        if (!response) {
            this.dispose();
            throw result.error;
        }

        const reader = new BinaryReader(result.response);
        return reader.readU256();
    }

    public async balanceOfNoDecimals(owner: Address): Promise<number> {
        const balance = await this.balanceOf(owner);

        return Blockchain.decodeFromDecimal(balance, this.decimals);
    }
}
