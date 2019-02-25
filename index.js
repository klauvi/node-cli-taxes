#!/usr/bin/env node
const request = require('request');
const API = 'https://deft-cove-227620.appspot.com/api';
const auth = {
  user: 'user',
  pass: 'token'
};
const validZip = [
  '20500',
  '20748',
  '34248',
  '37312',
  '46523',
  '46523',
  '75093',
  '75876',
  '84111',
  '95361'
];

const validateZip = code => {
  if (validZip.indexOf(code) === -1) {
    console.error(`${code} is not a valid zipcode. Please use one of ${validZip}`);
    process.exit(1);
  }
  return code;
};
const validateSubtotal = amount => {
  if (/[^0-9,.]/.test(amount)) {
    console.error(`${amount} is not a valid number`);
    process.exit(1);
  }
  return parseFloat(amount);
};
const help = () => {
  console.log(`
Usage: node-cli-taxes [options]

Options:
  -h, --help            show help
  --zipcode <code>      Zipcode for tax calculation
  --subtotal <amount>   Amount to be calcluated
`);
  process.exit(0);
};

const getTaxrate = zipcode =>
  new Promise((resolve, reject) => {
    const qs = { zipcode };
    request.get(`${API}/tax`, { auth, qs }, (error, response) => {
      if (error) {
        reject({ message: 'Error getting tax rate', error });
      } else {
        if (response.statusCode === 200) {
          resolve(JSON.parse(response.body).tax_rate);
        } else {
          reject({
            status_code: response.statusCode,
            status_message: response.statusMessage,
            message: 'Unable to get tax rate'
          });
        }
      }
    });
  });

const submitOrder = form =>
  new Promise((resolve, reject) => {
    request.post(`${API}/order`, { auth, form }, (error, response) => {
      if (error) {
        reject({ message: 'Error submitting order', error });
      } else {
        const res = JSON.parse(response.body);
        if (res.status_code === 0) {
          resolve(res);
        } else {
          reject({ ...res, message: 'Unable to submit order' });
        }
      }
    });
  });

/**
 *
 * @param {string} zipcode Zipcode
 * @param {string} tax_rate tax rate for given zipcode
 * @param {number} sub_total Amount to be calculated
 */
const getForm = (zipcode, tax_rate, sub_total) => {
  const tax_total = (parseFloat(tax_rate) / 100) * sub_total;
  const total = sub_total + tax_total;
  return {
    zipcode,
    tax_rate,
    sub_total: sub_total.toFixed(2),
    tax_total: tax_total.toFixed(2),
    total: total.toFixed(2)
  };
};

const main = async () => {
  const [, , ...options] = process.argv;
  if (options.length > 4) {
    console.error('Too many options provided');
    help();
  }
  if (options.indexOf('-h') !== -1 || options.indexOf('--help') !== -1 || options.length === 0) {
    help();
  }
  let error = false;
  if (options.indexOf('--zipcode') === -1) {
    console.error('option --zipcode missing');
    error = true;
  }
  if (options.indexOf('--subtotal') === -1) {
    console.error('option --subtotal missing');
    error = true;
  }
  if (error) {
    help();
  }
  const zipcode = validateZip(options[options.indexOf('--zipcode') + 1]);
  const subtotal = validateSubtotal(options[options.indexOf('--subtotal') + 1]);
  try {
    const tax_rate = await getTaxrate(zipcode);
    const form = getForm(zipcode, tax_rate, subtotal);
    console.log(`Total: ${form.total}`);
    const result = await submitOrder(form);
    console.log(result.status_message);
  } catch (error) {
    console.error(error.message);
  }
};
main();
