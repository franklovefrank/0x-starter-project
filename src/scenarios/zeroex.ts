import { ContractWrappers, ERC20TokenContract } from '@0x/contract-wrappers';
import { encodeFillQuoteTransformerData, encodeWethTransformerData, FillQuoteTransformerOrderType, FillQuoteTransformerSide, findTransformerNonce, RfqOrder, SignatureType} from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { DECIMALS, ETH_ADDRESS, NULL_ADDRESS} from '../constants';
import { PrintUtils } from '../print_utils';
import { providerEngine } from '../provider_engine';
import { runMigrationsOnceIfRequiredAsync } from '../utils';
import { NETWORK_CONFIGS, TX_DEFAULTS } from '../configs';

/**
 * In this scenario, the maker creates and signs a limit order for selling
 * ZRX for WETH.
 *
 * The taker takes this order and fills it via the 0x Exchange Proxy contract.
 */
export async function scenarioAsync(): Promise<void> {
    await runMigrationsOnceIfRequiredAsync();
    PrintUtils.printScenario('Transform ERC20');
    // Initialize the ContractWrappers, this provides helper functions around calling
    // 0x contracts as well as ERC20/ERC721 token contracts on the blockchain
    const contractWrappers = new ContractWrappers(providerEngine, { chainId: NETWORK_CONFIGS.chainId });
    // Initialize the Web3Wrapper, this provides helper functions around fetching
    // account information, balances, general contract logs
    const web3Wrapper = new Web3Wrapper(providerEngine);
    const [maker, taker] = await web3Wrapper.getAvailableAddressesAsync();
    const zrxTokenAddress = contractWrappers.contractAddresses.zrxToken;
    const makerAssetAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(0), DECIMALS);
    const etherTokenAddress = contractWrappers.contractAddresses.etherToken;
    const etherAmount = Web3Wrapper.toBaseUnitAmount(new BigNumber(0.1), DECIMALS);
    const printUtils = new PrintUtils(
        web3Wrapper,
        contractWrappers,
        { maker, taker },
        { WETH: etherTokenAddress, ZRX: zrxTokenAddress },
    );
    printUtils.printAccounts();
        // Print the Balances
    await printUtils.fetchAndPrintContractBalancesAsync();
    console.log(etherAmount, makerAssetAmount);

    // Call TransformERC20 on the 0x Exchange Proxy contract
    const txHash = await contractWrappers.exchangeProxy
        .transformERC20(
            ETH_ADDRESS,
            zrxTokenAddress,
            etherAmount,
            makerAssetAmount,
            [],
        )
        .sendTransactionAsync({
            from: taker,
            value: etherAmount,
            ...TX_DEFAULTS,
        });
    const txReceipt = await printUtils.awaitTransactionMinedSpinnerAsync('TransformERC20', txHash);
    printUtils.printTransaction('TransformERC20', txReceipt, []);


    // Print the Balances
    await printUtils.fetchAndPrintContractBalancesAsync();

    // Stop the Provider Engine
    providerEngine.stop();
}

void (async () => {
    try {
        if (!module.parent) {
            await scenarioAsync();
        }
    } catch (e) {
        console.log(e);
        providerEngine.stop();
        process.exit(1);
    }
})();