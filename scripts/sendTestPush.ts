import webpush from 'web-push';
import { readSubscriptions } from './devApiServer';

const DEFAULT_CITY = 'kragujevac';

function loadEnvironment(): void {
  try {
    process.loadEnvFile('.env');
  } catch {
    return;
  }
}

async function run(): Promise<void> {
  loadEnvironment();

  const publicKey = process.env.PUBLIC_VAPID_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:kontakt@nemaleba.rs';

  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys missing — run npm run push:keys');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const cityId = process.argv[2] ?? DEFAULT_CITY;
  const subscriptions = (await readSubscriptions()).filter((entry) =>
    entry.cities.includes(cityId)
  );

  if (subscriptions.length === 0) {
    console.log(`no subscribers for ${cityId}`);
    return;
  }

  const payload = JSON.stringify({
    title: 'Планирано искључење струје',
    body: 'Сутра 09:00 – 14:00, Браће Рибникар и околне улице.',
    tag: `nemaleba-${cityId}`,
    url: `/${cityId}`
  });

  for (const entry of subscriptions) {
    await webpush.sendNotification(entry.subscription as webpush.PushSubscription, payload);
    console.log('delivered');
  }
}

run().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
