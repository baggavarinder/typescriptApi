import { config } from "bluebird";

const BitGoJs = require("bitgo");

export class BitGoHelper {
  accessToken: string | string[];

  /* bitgo authenticate*/
  readUserAuthentication = (username: string, password: string, otp: string, done: Function, error: Function) => {
    const bitgo = new BitGoJs.BitGo();

    bitgo.authenticate({ username, password, otp })
      .then(function(response: any) {
        // var token = response.token;
        // var user = response.user;
        // etc
        done(response);
      }).catch(function(err: any) {
        error(err);
      });
  };

  /* Create Wallet */
  createwallet = (createwalletModel: CreatewalletModel, done: Function, error: Function) => {
    const bitgo = new BitGoJs.BitGo({ accessToken: this.accessToken });
    bitgo.coin(createwalletModel.walletType).wallets().generateWallet(createwalletModel)
      .then(function(wallet: any) {
        done(wallet);
      }).catch(function(err: any) {
        error(err);
      });
  };
  // 5a15790fb1d959c307149a60a7bc5a98
  /* List Wallet Transfers*/
  getWalletTransactions = (coin: string, id: string, done: Function, error: Function) => {
    const bitgo = new BitGoJs.BitGo({ accessToken: this.accessToken });
    bitgo.coin(coin).wallets().get({ id: id })
      .then(function(wallet: any) {
        wallet.transfers()
          .then(function(transfers: any) {
            // console.log(transfers);
            done(transfers);
          }).catch(function(err: any) {
            error(err);
          });
      }).catch(function(err: any) {
        error(err);
      });
  };
  /* Create Wallet Address*/
  generateAddress = (createwalletAddressModel: CreatewalletAddressModel, done: Function, error: Function) => {
    const bitgo = new BitGoJs.BitGo({ accessToken: this.accessToken });
    console.log(this.accessToken);
    bitgo.coin(createwalletAddressModel.coin).wallets().get(createwalletAddressModel)
      .then(function(wallet: any) {
        wallet.createAddress()
          .then(function(address: any) {
            // console.log(transfers);
            done(address);
          }).catch(function(err: any) {
            error(err);
          });
      }).catch(function(err: any) {
        error(err);
      });
  };


}
export class CreatewalletModel {
  label: string;
  walletType: string;
  passphrase: string;
  userKey: string;
  backupXpub: string;
  backupXpubProvider: string;
  enterprise: string;
  disableTransactionNotifications: boolean;
  gasPrice: number;
}
export class CreatewalletAddressModel {
  id: string;
  coin: string;
  gasPrice: number;
}
