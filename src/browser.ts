import _ from "lodash";
import path from "path";
import koa from "koa";
import koaStatic from "koa-static";
import koaRouter from "@koa/router";

import { currentNetworkEIP3085, normalizeRpcResult, sleep } from "./helpers";
import "./type-extensions";

// Returns the txhash sent by the browser wallet and terminates the webserver
export async function launchBrowserSigner(unsignedTx: any): Promise<string> {
  let sentTxhash = null;

  const app = new koa();

  const router = new koaRouter();
  router.get('/target', async (ctx) => {
    ctx.body = JSON.stringify({
      tx: normalizeRpcResult(unsignedTx),
      net: await currentNetworkEIP3085(),
    });
  });
  router.get('/sent', async (ctx) => {
    const txhash = ctx.request.query['txhash'];
    ctx.body = JSON.stringify({ error: null });
    sentTxhash = txhash;
  });
  app.use(router.routes());

  const wwwDir = path.resolve(__dirname, "../fixtures/browsersigner");
  app.use(koaStatic(wwwDir));

  app.listen(3000);
  console.log("Started temporary webserver at http://localhost:3000");

  while (true) {
    if (sentTxhash) {
      console.log('Sent tx:', sentTxhash);
      return sentTxhash;
    }
    await sleep(500);
  }
}
