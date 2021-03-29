import { CementoModule } from '@decent-bet/cemento';
import { ConnexPlugin } from '../src';
import { EnergyTokenContract, EnergyContractImport } from './EnergyContract';
// Create Cemento Module
export const module = new CementoModule([
    {
        name: 'ConnexToken',
        import: EnergyContractImport,
        entity: EnergyTokenContract,
        provider: ConnexPlugin
    },
]);
