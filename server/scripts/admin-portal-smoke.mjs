/**
 * Smoke tests for admin onboarding APIs (in-memory server on PORT).
 * Run: DATA_DRIVER=in-memory node scripts/admin-portal-smoke.mjs
 */
const BASE = process.env.API_BASE || 'http://127.0.0.1:4000';

let passed = 0;
let failed = 0;
const failures = [];

async function req(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    failures.push(`${name}: ${detail}`);
    console.log(`  ✗ ${name} — ${detail}`);
  }
}

async function loginAs(mobile) {
  const otpReq = await req('POST', '/api/auth/otp/request', { body: { mobile } });
  assert(
    `OTP request ${mobile}`,
    otpReq.status >= 200 && otpReq.status < 300 && otpReq.data?.requestId,
    `status=${otpReq.status} ${JSON.stringify(otpReq.data)}`,
  );
  const requestId = otpReq.data?.requestId;
  const otp = otpReq.data?.devOtp || '123456';
  const verify = await req('POST', '/api/auth/otp/verify', { body: { requestId, otp } });
  assert(`OTP verify ${mobile}`, verify.status === 200 && verify.data?.token, JSON.stringify(verify.data));
  return verify.data;
}

async function main() {
  console.log('Admin portal smoke tests →', BASE);

  const health = await req('GET', '/api/health');
  assert('health', health.status === 200, JSON.stringify(health.data));

  const admin = await loginAs('9000000003'); // Super Admin
  const adminToken = admin?.token;
  const promoter = await loginAs('9820852131'); // Promoter
  const promoterToken = promoter?.token;

  // 403: promoter cannot manage catalog
  const forbidden = await req('POST', '/api/admin/catalog/categories/search', {
    token: promoterToken,
    body: {},
  });
  assert('promoter blocked from catalog', forbidden.status === 403, `status=${forbidden.status}`);

  // Body id required
  const missingId = await req('POST', '/api/admin/catalog/categories/get', {
    token: adminToken,
    body: {},
  });
  assert('get without id → 400', missingId.status === 400, `status=${missingId.status} ${JSON.stringify(missingId.data)}`);

  // Category CRUD
  const catName = `SmokeCat-${Date.now()}`;
  const created = await req('POST', '/api/admin/catalog/categories/create', {
    token: adminToken,
    body: { name: catName, type: 'smartphone' },
  });
  assert('create category', created.status === 201 && created.data?.id, JSON.stringify(created.data));
  const catId = created.data?.id;

  const got = await req('POST', '/api/admin/catalog/categories/get', {
    token: adminToken,
    body: { id: catId },
  });
  assert('get category by body id', got.status === 200 && got.data?.name === catName, JSON.stringify(got.data));

  const deactivated = await req('POST', '/api/admin/catalog/categories/update', {
    token: adminToken,
    body: { id: catId, isActive: false },
  });
  assert('soft-deactivate category', deactivated.status === 200 && deactivated.data?.isActive === false, JSON.stringify(deactivated.data));

  // Brand + product + sku
  const brand = await req('POST', '/api/admin/catalog/brands/create', {
    token: adminToken,
    body: { name: `SmokeBrand-${Date.now()}` },
  });
  assert('create brand', brand.status === 201, JSON.stringify(brand.data));

  const product = await req('POST', '/api/admin/catalog/products/create', {
    token: adminToken,
    body: { name: `SmokeProduct-${Date.now()}`, categoryId: 1, brandId: brand.data?.id },
  });
  assert('create product', product.status === 201, JSON.stringify(product.data));

  const sku = await req('POST', '/api/admin/catalog/skus/create', {
    token: adminToken,
    body: { productId: product.data?.id, code: `SMK-${Date.now()}`, label: 'Smoke SKU' },
  });
  assert('create sku', sku.status === 201, JSON.stringify(sku.data));

  // Partner location requires partnerId
  const locBad = await req('POST', '/api/partner-locations/', {
    token: adminToken,
    body: {
      name: 'No Partner Loc',
      address: '1 St',
      city: 'X',
      state: 'Y',
      zipCode: '00000',
      country: 'US',
      uniqueIdentifier: `loc-bad-${Date.now()}`,
    },
  });
  assert('location without partnerId → 400', locBad.status === 400, `status=${locBad.status}`);

  const locOk = await req('POST', '/api/partner-locations/', {
    token: adminToken,
    body: {
      partnerId: 1,
      name: 'Smoke Location',
      address: '1 St',
      city: 'NYC',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
      uniqueIdentifier: `loc-ok-${Date.now()}`,
    },
  });
  assert('location with partnerId', locOk.status === 201 && locOk.data?.partnerId === 1, JSON.stringify(locOk.data));

  // User requires partnerLocationId
  const userBad = await req('POST', '/api/users/', {
    token: adminToken,
    body: { mobile: '9111111111', name: 'No Loc User' },
  });
  assert('user without location → 400', userBad.status === 400, `status=${userBad.status} ${JSON.stringify(userBad.data)}`);

  const mobile = `91${String(Date.now()).slice(-8)}`;
  const userOk = await req('POST', '/api/users/', {
    token: adminToken,
    body: {
      mobile,
      name: 'Smoke User',
      partnerLocationId: locOk.data?.id,
      roleIds: [4],
    },
  });
  assert('user with location', userOk.status === 201 && userOk.data?.partnerLocationId === locOk.data?.id, JSON.stringify(userOk.data));

  const userMove = await req('POST', '/api/users/update', {
    token: adminToken,
    body: { id: userOk.data?.id, partnerLocationId: 1, name: 'Smoke User Moved' },
  });
  assert('user update location via body id', userMove.status === 200 && userMove.data?.partnerLocationId === 1, JSON.stringify(userMove.data));

  // Partner get body-only
  const partnerGet = await req('POST', '/api/partners/get', {
    token: adminToken,
    body: { id: 1 },
  });
  assert('partner get body id', partnerGet.status === 200 && partnerGet.data?.id === 1, JSON.stringify(partnerGet.data));

  // SKU pricing create + get
  const pricing = await req('POST', '/api/sku-pricing/', {
    token: adminToken,
    body: {
      vendorId: 2,
      skuId: sku.data?.id,
      price: 1000,
      validFrom: new Date().toISOString(),
    },
  });
  assert('sku pricing create', pricing.status === 201, JSON.stringify(pricing.data));

  const pricingGet = await req('POST', '/api/sku-pricing/get', {
    token: adminToken,
    body: { id: pricing.data?.id },
  });
  assert('sku pricing get body id', pricingGet.status === 200, JSON.stringify(pricingGet.data));

  // Duplicate category name → 409
  const dup = await req('POST', '/api/admin/catalog/categories/create', {
    token: adminToken,
    body: { name: catName, type: 'smartphone' },
  });
  assert('duplicate category → 409', dup.status === 409, `status=${dup.status}`);

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('Failures:');
    for (const f of failures) console.log(' -', f);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
