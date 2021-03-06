// eslint-disable-next-line spaced-comment
/// <reference types="@vechain/connex" />

import { abi } from 'thor-devkit';
import {
  IMethodOrEventCall,
  EventFilter,
  CementoProviderType,
  ProviderInstance,
  IMethodConfig
} from '@decent-bet/cemeto';
import { ConnexSigner } from './ConnexSigner';
import { ConnexSettings } from './ConnexSettings';
import { CementoContract, CementoSigner } from '@decent-bet/cemento';
import { CementoProvider } from '@decent-bet/cemento';
import { CementoTopic } from '@decent-bet/cemento';

/**
 * ConnexPlugin provider for Cemento
 */

export class ConnexPlugin extends CementoProvider implements CementoContract {
  public connex: Connex;
  public chainTag: string;
  public defaultAccount: string;
  public address: string;

  public describe(): string {
    return `
    contract address: ${this.address}\r\n
    chain tag: ${this.chainTag}\r\n
    owner: ${this.defaultAccount}\r\n    
    `;
  }
  public getProviderType(): CementoProviderType {
    return CementoProviderType.Connex;
  }

  public prepareSigning(
    methodCall: any,
    options: IMethodOrEventCall,
    args: any[]
  ): Promise<CementoSigner> {
    const connex = this.connex;
    const signingService = connex.vendor.sign('tx');
    signingService.signer(options.from || this.defaultAccount);
    signingService.gas(options.gas || 300_000); // Set maximum gas

    const payload = methodCall.asClause(...args);

    const signer = new ConnexSigner(signingService, payload);
    return Promise.resolve(signer);
  }

  public createGasExplainer(methodCall: any) {
    return (...args: any[]) => {
      return (config: IMethodConfig = {}) => {
        const explainer = this.connex.thor.explain();
        explainer.gas(config.gas || 300_000).caller(config.from || this.defaultAccount);

        const payload = methodCall.asClause(...args);

        return explainer.execute([payload]);
      };
    };
  }

  public onReady<T>(settings: T & ConnexSettings): void {
    const { connex, chainTag, defaultAccount } = settings;
    this.connex = connex;
    this.chainTag = chainTag;
    this.defaultAccount = defaultAccount;
    this.connect();
  }

  public connect() {
    if (this.connex && this.chainTag && this.defaultAccount) {
      this.address = this.contractImport.address[this.chainTag];
    } else {
      throw new Error('Missing onReady settings');
    }
  }

  public setInstanceOptions(settings: ProviderInstance) {
    this.connex = settings.provider;
    if (settings.options.chainTag) {
      this.chainTag = settings.options.chainTag;
    }
    if (settings.options.defaultAccount) {
      this.defaultAccount = settings.options.defaultAccount;
    }
  }

  public getAbiMethod(name: string, address?: string): object {
    let addr;
    if (!address) {
      addr = this.contractImport.address[this.chainTag];
    }
    return this.abi.filter(i => i.name === name)[0];
  }

  /**
   * Gets a Connex Method object
   * @param address contract address
   * @param methodAbi method ABI
   */
  public getMethod(name: string, address?: string): any {
    let addr;
    addr = this.contractImport.address[this.chainTag];
    const acc = this.connex.thor.account(addr);
    let methodAbi: any = name;
    if (typeof name === 'string') {
      methodAbi = this.abi.filter(
        i => i.name === name
      )[0] as abi.Function.Definition;
    }

    const connexMethod = acc.method(methodAbi as object);
    const gasExplainer = this.createGasExplainer(connexMethod);
    return Object.assign({}, connexMethod, { gasExplainer });
  }

  public callMethod(name: string, args: any[]): any {
    let addr = this.contractImport.address[this.chainTag];
    const acc = this.connex.thor.account(addr);
    let methodAbi: any = name;
    if (typeof name === 'string') {
      methodAbi = this.abi.filter(
        i => i.name === name
      )[0] as abi.Function.Definition;
    }
    return acc.method(methodAbi as object).call(...args);
  }
  /**
   * Gets a Connex Event object
   * @param address contract address
   * @param eventAbi event ABI
   */
  public getEvent(name: string): any {
    let addr = this.contractImport.address[this.chainTag];
    const acc = this.connex.thor.account(addr);

    let eventAbi: any;
    if (typeof name === 'string') {
      eventAbi = this.abi.filter(
        i => i.name === name
      )[0] as abi.Event.Definition;
    }
    return acc.event(eventAbi as any);
  }

  public async getEvents<P, T>(
    name: string,
    eventFilter?: EventFilter<T & object[]>
  ): Promise<(P & Connex.Thor.Event)[]> {
    const event: Connex.Thor.EventVisitor = this.getEvent(name);

    // default page options
    let offset = 0;
    let limit = 25;

    if (eventFilter) {
      const { range, filter, order, pageOptions, topics } = eventFilter;
      let connexFilter: Connex.Thor.Filter<'event'> = event.filter(
        filter || []
      );

      if (topics) {
        let criteria = (topics as CementoTopic).get();
        connexFilter = connexFilter.criteria(criteria);
      }

      if (range) {
        const { unit, to, from } = range;
        connexFilter = connexFilter.range({
          unit,
          from,
          to
        });
      }

      connexFilter = connexFilter.order(order || 'desc');

      if (pageOptions) {
        offset = pageOptions.offset;
        limit = pageOptions.limit;
      }
      return (await connexFilter.apply(offset, limit)) as (P &
        Connex.Thor.Event)[];
    }

    return (await event.filter([]).apply(offset, limit)) as (P &
      Connex.Thor.Event)[];
  }
}
