import { CementoSigner } from '@decent-bet/cemento';

export class ConnexSigner implements CementoSigner {
    constructor(private signingService: Connex.Vendor.TxSigningService, public payload: any) {}

    requestSigning(): Promise<any> {

        return this.signingService.request([
            {
                ...(this.payload as any)
            }
        ]) as Promise<any>;
    }
}
