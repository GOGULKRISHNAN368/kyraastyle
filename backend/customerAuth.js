const { createHmac, randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const scryptAsync = promisify(scrypt);
const cookieName = 'kyraa_customer_session';
const sessionLifetimeSeconds = 60 * 60 * 24 * 30;

const customerSchemaDefinition = {
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254 },
  phone: { type: String, trim: true, default: '', maxlength: 24 },
  passwordHash: { type: String, required: true, select: false },
  lastLoginAt: { type: Date, default: null },
};

function customerModel(mongoose) {
  return mongoose.models.Customer || mongoose.model('Customer', new mongoose.Schema(customerSchemaDefinition, {
    timestamps: true,
    collection: 'customers',
    autoIndex: false,
  }));
}

function publicCustomer(customer) {
  return { id: String(customer._id), name: customer.name, email: customer.email, phone: customer.phone || '' };
}

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, entry) => {
    const separator = entry.indexOf('=');
    if (separator < 0) return cookies;
    cookies[entry.slice(0, separator).trim()] = decodeURIComponent(entry.slice(separator + 1).trim());
    return cookies;
  }, {});
}

function secret() {
  // Atlas credentials never leave the server; this is only a local fallback so an
  // existing development .env keeps working. Set CUSTOMER_AUTH_SECRET in production.
  return process.env.CUSTOMER_AUTH_SECRET || process.env.MONGODB_URI;
}

function encode(value) { return Buffer.from(value).toString('base64url'); }

function signSession(customerId) {
  const key = secret();
  if (!key) throw new Error('CUSTOMER_AUTH_SECRET is required.');
  const payload = encode(JSON.stringify({ sub: String(customerId), exp: Math.floor(Date.now() / 1000) + sessionLifetimeSeconds }));
  const signature = createHmac('sha256', key).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifySession(token) {
  const key = secret();
  if (!token || !key) return null;
  const [payload, signature] = String(token).split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', key).update(payload).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return value?.sub && Number(value.exp) > Math.floor(Date.now() / 1000) ? value : null;
  } catch { return null; }
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${Buffer.from(derived).toString('hex')}`;
}

async function passwordMatches(password, storedHash) {
  const [salt, hash] = String(storedHash || '').split(':');
  if (!salt || !hash) return false;
  const derived = Buffer.from(await scryptAsync(password, salt, 64));
  const expected = Buffer.from(hash, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function validateRegistration(input) {
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const phone = typeof input?.phone === 'string' ? input.phone.trim() : '';
  const password = typeof input?.password === 'string' ? input.password : '';
  if (name.length < 2 || name.length > 120) throw new Error('Enter your full name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (phone && !/^\+?[0-9\s().-]{7,24}$/.test(phone)) throw new Error('Enter a valid phone number.');
  if (password.length < 8 || password.length > 200) throw new Error('Password must be between 8 and 200 characters.');
  return { name, email, phone, password };
}

function setSessionCookie(response, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionLifetimeSeconds}${secure}`);
}

function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

function sendCustomerError(response, error, fallback = 'Unable to complete your request.') {
  const duplicate = error?.code === 11000;
  const message = duplicate ? 'An account with this email already exists.' : (error?.message || fallback);
  response.status(duplicate ? 409 : 400).json({ message });
}

function installCustomerAuthRoutes(app, mongoose) {
  const Customer = customerModel(mongoose);

  app.post('/api/customer/register', async (request, response) => {
    try {
      const fields = validateRegistration(request.body);
      if (await Customer.exists({ email: fields.email })) {
        return response.status(409).json({ message: 'An account with this email already exists.' });
      }
      const { password, ...customerFields } = fields;
      const customer = await Customer.create({ ...customerFields, passwordHash: await hashPassword(password), lastLoginAt: new Date() });
      setSessionCookie(response, signSession(customer._id));
      response.status(201).json({ data: publicCustomer(customer) });
    } catch (error) { sendCustomerError(response, error); }
  });

  app.post('/api/customer/login', async (request, response) => {
    try {
      const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
      const password = typeof request.body?.password === 'string' ? request.body.password : '';
      if (!email || !password) throw new Error('Enter your email and password.');
      const customer = await Customer.findOne({ email }).select('+passwordHash');
      if (!customer || !(await passwordMatches(password, customer.passwordHash))) {
        return response.status(401).json({ message: 'Email or password is incorrect.' });
      }
      customer.lastLoginAt = new Date();
      await customer.save();
      setSessionCookie(response, signSession(customer._id));
      response.json({ data: publicCustomer(customer) });
    } catch (error) { sendCustomerError(response, error, 'Unable to sign in.'); }
  });

  app.get('/api/customer/session', async (request, response) => {
    try {
      const session = verifySession(parseCookies(request.headers.cookie)[cookieName]);
      if (!session) return response.status(401).json({ message: 'No active customer session.' });
      const customer = await Customer.findById(session.sub).select('name email phone');
      if (!customer) return response.status(401).json({ message: 'No active customer session.' });
      response.json({ data: publicCustomer(customer) });
    } catch { response.status(401).json({ message: 'No active customer session.' }); }
  });

  app.post('/api/customer/logout', (_request, response) => {
    clearSessionCookie(response);
    response.status(204).end();
  });
}

module.exports = { installCustomerAuthRoutes, customerSchemaDefinition };
