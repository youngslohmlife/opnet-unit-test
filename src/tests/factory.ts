import { opnet, OPNetUnit } from '../opnet/unit/OPNetUnit.js';
import { MotoswapFactory } from '../contracts/MotoswapFactory.js';
import { Assert } from '../opnet/unit/Assert.js';
import { Blockchain } from '../blockchain/Blockchain.js';
import { MotoswapPool } from '../contracts/MotoswapPool.js';
import { MOTO_ADDRESS, WBTC_ADDRESS } from '../contracts/configs.js';

await opnet('Motoswap Factory', async (vm: OPNetUnit) => {
    await vm.it('should instantiate the factory', async () => {
        await Assert.expect(async () => {
            const factory = new MotoswapFactory(Blockchain.txOrigin);
            await factory.init();
            factory.dispose();
        }).toNotThrow();
    });

    // Declare all the request contracts
    const factory: MotoswapFactory = new MotoswapFactory(Blockchain.txOrigin);
    const pool: MotoswapPool = new MotoswapPool(WBTC_ADDRESS, MOTO_ADDRESS);
    Blockchain.register(pool);
    Blockchain.register(factory);

    vm.beforeEach(async () => {
        await Blockchain.init();
    });

    vm.afterAll(() => {
        Blockchain.dispose();
    });

    await vm.it('should create a pool', async () => {
        await factory.createPool(WBTC_ADDRESS, MOTO_ADDRESS);

        console.log('States:', factory.getStates());
    });
});
