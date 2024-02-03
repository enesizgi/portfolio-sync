// const { Spot } = require('@binance/connector');
const dotenv = require('dotenv');
const crypto = require('crypto');
const fs = require('fs');
const secrets = require('./secrets.json');

dotenv.config();

const apiKey = process.env.BINANCE_API_KEY;
const apiSecret = fs.readFileSync('./Private_key', 'utf8');
console.log(apiSecret);

async function getSubscriptionTransactionHistory() {
  const params = new URLSearchParams();
  params.append('timestamp', Date.now().toString());
  params.append('recvWindow', '60000');

  const endpoint = '/sapi/v1/lending/auto-invest/history/list';

  const queryString = params.toString();

  const signature = crypto.sign(null, Buffer.from(queryString), {
    key: apiSecret,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
  }).toString('base64');

  params.append('signature', signature);

  const response = await fetch(
    `https://api.binance.com${endpoint}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json'
      }
    });

  const binanceData = await response.json();
  console.log(binanceData);
}

async function sync() {

  const params = new URLSearchParams();
  params.append('timestamp', Date.now().toString());
  params.append('recvWindow', '60000');
  params.append('planType', 'SINGLE');

  console.log(params.toString());

  const queryString = params.toString();

  const signature = crypto.sign(null, Buffer.from(queryString), {
    key: apiSecret,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
  }).toString('base64');

  params.append('signature', signature);

  console.log(params.toString());

  const response = await fetch(
    `https://api.binance.com/sapi/v1/lending/auto-invest/plan/list?${params.toString()}`, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json'
      }
    });

  const binanceData = await response.json();

  const coins = {
    bitcoin: {
      portfolio: '10010982',
      transaction: '61804626',
      binanceAutoInvest: {
        planId: 4323396,
        targetAsset: 'BTC'
      }
    },
    ethereum: {
      portfolio: '10010982',
      transaction: '61771143',
      binanceAutoInvest: {
        planId: 4312390,
        targetAsset: 'ETH'
      }
    },
    uniswap: {
      portfolio: '10010982',
      transaction: '73183541',
      binanceAutoInvest: {
        planId: 7404783,
        targetAsset: 'UNI'
      }
    },
    sushi: {
      portfolio: '10010982',
      transaction: '73183632',
      binanceAutoInvest: {
        planId: 7404779,
        targetAsset: 'SUSHI'
      }
    },
    '1inch': {
      portfolio: '10010982',
      transaction: '73183768',
      binanceAutoInvest: {
        planId: 7417155,
        targetAsset: '1INCH'
      }
    },
    aave: {
      portfolio: '10010982',
      transaction: '73811429',
      binanceAutoInvest: {
        planId: 7504684,
        targetAsset: 'AAVE'
      }
    },
    monero: {
      portfolio: '10010982',
      transaction: '75043188',
      binanceAutoInvest: {
        planId: 7684784,
        targetAsset: 'XMR'
      }
    }
  };

  for await (const [coin, value] of Object.entries(coins)) {
    try {
      // TODO: Use targetAsset for finding the plan.
      const plan = binanceData.plans.find((plan) => plan.planId === value.binanceAutoInvest.planId);
      const notes = `executionTime: ${new Date().toISOString()}`;
      if (!plan) {
        console.error(`Plan not found for ${coin}`);
        continue;
      }
      let averagePrice = plan.totalInvestedInUSD / plan.totalTargetAmount;
      let quantity = plan.totalTargetAmount;
      if (parseFloat(plan.totalTargetAmount) === 0) {
        averagePrice = 0;
        quantity = 0;
        console.error(`Total target amount is 0 for ${coin}`);
      }
      const totalFees = parseFloat(plan.totalInvestedInUSD) * 0.002;
      const geckoParams = new URLSearchParams();
      geckoParams.append('portfolio_coin_transaction[price]', averagePrice.toString());
      // geckoParams.append('preview_spent_input', '999');
      geckoParams.append('portfolio_coin_transaction[quantity]', quantity);
      // geckoParams.append('portfolio_coin_transaction[transaction_timestamp]', '2024-01-14T00:26:00.000Z');
      geckoParams.append('portfolio_coin_transaction[fees]', totalFees.toString());
      geckoParams.append('portfolio_coin_transaction[notes]', notes);
      // geckoParams.append('portfolio_coin_transaction[transaction_type]', 'buy');
      // geckoParams.append('portfolio_coin_transaction[coin_id]', '');
      // geckoParams.append('portfolio_coin_transaction[currency]', 'usd');
      geckoParams.append('commit', 'Submit');
      geckoParams.append('_method', 'patch');

      await fetch(`https://www.coingecko.com/en/portfolios/${value.portfolio}/${coin}/transactions/${value.transaction}`, {
        "headers": {
          "accept": "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01",
          "accept-language": "en-US,en;q=0.9,tr;q=0.8",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "pragma": "no-cache",
          "sec-ch-device-memory": "8",
          "sec-ch-ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\"",
          "sec-ch-ua-arch": "\"x86\"",
          "sec-ch-ua-full-version-list": "\"Not_A Brand\";v=\"8.0.0.0\", \"Chromium\";v=\"120.0.6099.216\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-model": "\"\"",
          "sec-ch-ua-platform": "\"Linux\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
          "Referer": `https://www.coingecko.com/en/portfolios/${value.portfolio}/${coin}`,
          "Referrer-Policy": "strict-origin-when-cross-origin",
          ...secrets
        },
        body: geckoParams.toString(),
        "method": "POST"
      });

    } catch (e) {
      console.error(e);
    }
  }
}

async function main() {
  await sync();
}

main().then(() => {}).catch((err) => {
    console.error(err);
    process.exit(1);
});
