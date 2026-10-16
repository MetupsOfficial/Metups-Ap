import { sendResults } from '../services/whatsappService.js';

const to = process.argv[2];
if (!to) {
  console.error('Usage: node backend/scripts/send-sample.js <phone-number>');
  process.exit(1);
}

const env = {
  WA_API_VERSION: process.env.WA_API_VERSION,
  WA_PHONE_NUMBER_ID: process.env.WA_PHONE_NUMBER_ID,
  WA_TOKEN: process.env.WA_TOKEN,
  PLACEHOLDER_IMAGE_URL: process.env.PLACEHOLDER_IMAGE_URL,
};
if (!env.WA_PHONE_NUMBER_ID || !env.WA_TOKEN || !env.PLACEHOLDER_IMAGE_URL) {
  throw new Error('Set WA_PHONE_NUMBER_ID, WA_TOKEN, and PLACEHOLDER_IMAGE_URL before sending');
}

const photo = env.PLACEHOLDER_IMAGE_URL;
const demoListings = [
  { title: 'Sample laptop', price: 299, condition: 'Good', city: 'Harare', seller_phone: to, image_url: photo },
  { title: 'Sample smartphone', price: 180, condition: 'Used', city: 'Bulawayo', seller_phone: to, image_url: photo },
];

console.log('Sending single listing sample…');
console.log(await sendResults(env, to, [demoListings[0]]));
console.log('Sending two-card carousel sample…');
console.log(await sendResults(env, to, demoListings));
