import 'jasmine';
import { module } from './index';
import { EnergyTokenContract, EnergyContractImport } from './EnergyContract';
import { Read, Write, GetEvents, CementoModule, CementoContract, IMethodConfig } from '@decent-bet/cemento';
import { IMethodOrEventCall, EventFilterOptions } from '@decent-bet/cemento';
import { ConnexCementoTopic, ConnexPlugin } from '../src';


describe('Connex Provider', () => {
    describe('#ConnexPlugin', () => {
        it('should generate topics for Connex', async () => {
            const topics = new ConnexCementoTopic();

            const seq = topics
                .topic(0, '0xc')
                .and(1, '0xb')
                .or(2, '0xa')
                .get();

            expect(seq).toEqual([
                { topic0: '0xc', topic1: '0xb' },
                { topic2: '0xa' }
            ]);
        });

        it('should create a module with contracts', async () => {
            // eslint-disable-next-line @typescript-eslint/no-object-literal-type-assertion
            const connex = {} as Connex;
            const chainTag = '0xa4';
            const defaultAccount = '0x';

            // Create Cemento Module
            // Uses short module syntax
            const module = new CementoModule(
                [
                    {
                        name: 'Token',
                        import: EnergyContractImport,
                        entity: EnergyTokenContract,
                        provider: ConnexPlugin,
                        enableDynamicStubs: true
                    }
                ],
            );
            const contracts = module.bindContracts({
                'connex': {
                    provider: connex,
                    options: {
                        defaultAccount,
                        chainTag,
                        // ...connex options
                    }
                },
            }).connect();
            const token = contracts.Token;
            const spy = spyOn(token, 'onReady');
            token.onReady({ connex, chainTag, defaultAccount });

            expect(contracts).not.toBe(null);
            expect(token).not.toBe(null);
            expect(spy).toHaveBeenCalled();
        });

        it('should create a Read(), execute it and return a response', async () => {
            // Mock
            const obj = {
                callMethod: jasmine.createSpy('callMethod')
            };
            const options: IMethodOrEventCall = {};
            const thunk = Read(options);
            thunk(obj, 'balanceOf');
            expect((obj as any).balanceOf).toBeDefined();
            (obj as any).balanceOf();
            expect(obj.callMethod.calls.count()).toBe(1);
        });

        it('should create a Write() and return a Promise', async () => {
            const signerMock: any = {
                requestSigning: jasmine.createSpy('requestSigning')
            };
            // Mock
            const target = {
                prepareSigning: jasmine
                    .createSpy('prepareSigning')
                    .and.returnValue(Promise.resolve(signerMock)),
                getMethod: jasmine.createSpy('getMethod')
            };
            const thunk = Write();
            thunk(target, 'transfer');
            expect((target as any).transfer).toBeDefined();
            (target as any).transfer([]).call();
            // expect(target.getMethod.calls.count()).toBe(1);
            expect(target.prepareSigning.calls.count()).toBe(1);
        });

        it('should create a GetEvents(), execute it and return a response', async () => {
            // Mock
            const obj = {
                getEvents: jasmine.createSpy('getEvents')
            };
            const options: EventFilterOptions<any> = {};
            const thunk = GetEvents(options);
            thunk(obj, 'logNewTransfer');
            expect((obj as any).logNewTransfer).toBeDefined();
            (obj as any).logNewTransfer();
            expect(obj.getEvents.calls.count()).toBe(1);
        });
    });
});
