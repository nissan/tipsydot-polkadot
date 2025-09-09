import { ApiPromise, WsProvider } from '@polkadot/api';

let apiInstance: ApiPromise | null = null;

export async function getApi(): Promise<ApiPromise> {
  if (apiInstance && apiInstance.isConnected) {
    return apiInstance;
  }

  const wsEndpoint = import.meta.env.VITE_WS_ENDPOINT || 'wss://testnet-passet-hub-eth-rpc.polkadot.io';
  
  const provider = new WsProvider(wsEndpoint);
  apiInstance = await ApiPromise.create({ provider });
  
  await apiInstance.isReady;
  
  console.log('Connected to chain:', apiInstance.runtimeChain.toString());
  console.log('Chain version:', apiInstance.runtimeVersion.toString());
  
  return apiInstance;
}

export async function disconnectApi() {
  if (apiInstance) {
    await apiInstance.disconnect();
    apiInstance = null;
  }
}