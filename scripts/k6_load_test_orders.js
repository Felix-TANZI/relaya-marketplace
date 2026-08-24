// scripts/k6_load_test_orders.js
// Simule N creations de commande en parallele pour observer le comportement
// du backend sous charge (temps de reponse, taux d'erreur).
//
// Usage:
//   K6_TOKEN=... k6 run --vus 50 --iterations 1000 scripts/k6_load_test_orders.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const TOKEN = __ENV.K6_TOKEN;
const PRODUCT_ID = Number(__ENV.PRODUCT_ID || 18);

const orderErrors = new Counter('order_errors');
const orderDuration = new Trend('order_create_duration', true);

export const options = {
  scenarios: {
    orders_1000: {
      executor: 'shared-iterations',
      vus: Number(__ENV.VUS || 50),
      iterations: Number(__ENV.ITERATIONS || 1000),
      maxDuration: '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    order_create_duration: ['p(95)<3000'],
  },
};

export default function () {
  const payload = JSON.stringify({
    delivery_mode: 'DELIVERY',
    cart_items: [{ product_id: PRODUCT_ID, qty: 1 }],
    city: 'YAOUNDE',
    address: `Rue de test k6 #${__VU}-${__ITER}`,
    customer_phone: '699000000',
    customer_email: `k6-test-${__VU}@example.com`,
    note: 'Commande simulee par test de charge k6',
  });

  const res = http.post(`${BASE_URL}/api/orders/`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    timeout: '15s',
  });

  orderDuration.add(res.timings.duration);

  const ok = check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });
  if (!ok) {
    orderErrors.add(1);
    if (__ITER < 3) {
      console.log(`Echec commande VU=${__VU} ITER=${__ITER} status=${res.status} body=${res.body?.slice(0, 300)}`);
    }
  }

  sleep(0.05);
}
