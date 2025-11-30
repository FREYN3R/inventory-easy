import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métricas personalizadas
const errorRate = new Rate('errors');

// Configuración de las pruebas
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up a 10 usuarios
    { duration: '1m', target: 50 },   // Incremento a 50 usuarios
    { duration: '2m', target: 100 },  // Carga sostenida de 100 usuarios
    { duration: '30s', target: 0 },   // Ramp down a 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% de las peticiones bajo 500ms
    http_req_failed: ['rate<0.1'],    // Menos del 10% de errores
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  // Test 1: Obtener todos los productos
  let res = http.get(`${BASE_URL}/api/products`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has data': (r) => JSON.parse(r.body).success === true,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Buscar productos
  res = http.get(`${BASE_URL}/api/products?search=Laptop`);
  check(res, {
    'search status is 200': (r) => r.status === 200,
    'search returns results': (r) => {
      const data = JSON.parse(r.body);
      return data.success && data.count >= 0;
    },
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: Obtener categorías
  res = http.get(`${BASE_URL}/api/products/categories/list`);
  check(res, {
    'categories status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);

  // Test 4: Crear un producto (simulado)
  const newProduct = {
    name: `Test Product ${Date.now()}`,
    description: 'Product created during load test',
    sku: `TEST-${Date.now()}`,
    price: Math.random() * 1000,
    category: 'Testing',
  };

  res = http.post(`${BASE_URL}/api/products`, JSON.stringify(newProduct), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'product created': (r) => r.status === 201,
  }) || errorRate.add(1);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'evidencias/k6-summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  let summary = '\n' + indent + '======= Load Test Summary =======\n';
  
  summary += indent + `Duration: ${data.state.testRunDurationMs}ms\n`;
  summary += indent + `Iterations: ${data.metrics.iterations.values.count}\n`;
  summary += indent + `VUs: ${data.metrics.vus.values.max}\n\n`;
  
  summary += indent + 'HTTP Request Duration:\n';
  summary += indent + `  avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += indent + `  min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms\n`;
  summary += indent + `  max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
  summary += indent + `  p(95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n\n`;
  
  summary += indent + 'HTTP Requests:\n';
  summary += indent + `  Total: ${data.metrics.http_reqs.values.count}\n`;
  summary += indent + `  Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s\n`;
  summary += indent + `  Failed: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  
  return summary;
}