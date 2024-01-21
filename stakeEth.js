// const { Spot } = require('@binance/connector');
const dotenv = require('dotenv');
const crypto = require('crypto');
const fs = require('fs');
const secrets = require('./secrets.json');

dotenv.config();

const apiKey = process.env.BINANCE_API_KEY;
const apiSecret = fs.readFileSync('./Private_key', 'utf8');
console.log(apiSecret);

async function redeemFlexibleEarn(asset, isEthStaking = false, amount = null) {
  const flexibleAsset = await getFlexibleEarnAsset(asset);
  if (flexibleAsset === null) {
    return {
      success: false,
      asset: null
    };
  }

  const params = new URLSearchParams({
    timestamp: Date.now().toString(),
    recvWindow: '60000',
    size: '100',
    productId: flexibleAsset.productId,
  });

  let finalAmount;
  if (amount === null) {
    if (isEthStaking) {
      const amountSplitted = flexibleAsset.totalAmount.split('.');
      const fourDigitPrecision = `${amountSplitted[0]}.${amountSplitted[1].slice(0, 4)}`;
      params.append('amount', fourDigitPrecision);
      finalAmount = fourDigitPrecision;
    } else {
      params.append('amount', flexibleAsset.totalAmount);
      finalAmount = flexibleAsset.totalAmount;
    }
  } else {
    params.append('amount', amount);
    finalAmount = amount;
  }
  if (parseFloat(finalAmount) === 0) {
    return {
      success: false,
      asset: null
    };
  }

  const endpoint = '/sapi/v1/simple-earn/flexible/redeem';

  const signature = crypto.sign(null, Buffer.from(params.toString()), {
    key: apiSecret,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
  }).toString('base64');

  params.append('signature', signature);

  const response = await fetch(
    `https://api.binance.com${endpoint}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json'
      }
    });

  const binanceData = await response.json();
  console.log(binanceData);
  return {
    success: binanceData.success,
    asset: {
      ...flexibleAsset,
      totalAmount: finalAmount
    }
  }
}

async function getFlexibleEarnAsset(asset) {
  const params = new URLSearchParams({
    timestamp: Date.now().toString(),
    recvWindow: '60000',
    size: '100',
    asset
  });

  const endpoint = '/sapi/v1/simple-earn/flexible/position';

  const signature = crypto.sign(null, Buffer.from(params.toString()), {
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
  if (binanceData.total > 1) {
    console.warn('More than one flexible earn position found.');
  }
  else if (binanceData.total === 0) {
    console.warn('No flexible earn position found.');
    return null;
  }
  return binanceData.rows[0];
}

async function stakeETHFromFlexibleEarn(amount) {
  console.log(amount);

  const params = new URLSearchParams({
    timestamp: Date.now().toString(),
    recvWindow: '60000',
    amount
  });

  const endpoint = '/sapi/v2/eth-staking/eth/stake';

  const signature = crypto.sign(null, Buffer.from(params.toString()), {
    key: apiSecret,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
  }).toString('base64');

  params.append('signature', signature);

  const response = await fetch(
    `https://api.binance.com${endpoint}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json'
      }
    });

  const binanceData = await response.json();
  console.log(binanceData);
  return binanceData;
}


async function main() {
  const {success: redeemSuccess, asset: flexibleAsset} = await redeemFlexibleEarn('ETH', true);
  if (redeemSuccess) {
    await stakeETHFromFlexibleEarn(flexibleAsset.totalAmount);
  }
}

main().then(() => {}).catch((err) => {
  console.error(err);
  process.exit(1);
});
