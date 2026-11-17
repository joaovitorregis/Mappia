import { randomBytes } from 'node:crypto';

const categories = new Set([
  'Buracos na rua',
  'Iluminação pública',
  'Lixo e descarte irregular',
  'Vazamentos e esgoto a céu aberto',
  'Alagamentos',
  'Outro problema',
]);

export class ReportError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export function createReportStore({ now = Date.now, newId = () => randomBytes(8).toString('hex') } = {}) {
  const challenges = new Map();
  const proofs = new Map();
  const reports = new Map();
  const requests = new Map();

  function startVerification({ channel, contact } = {}) {
    const value = String(contact ?? '').trim().toLowerCase();
    const emailIsFictional = channel === 'email' && /^[^\s@]+@(?:example\.com|[a-z0-9.-]+\.test)$/.test(value);
    const phoneIsFictional = channel === 'phone' && value === '00000000000';
    if (!emailIsFictional && !phoneIsFictional) throw new ReportError('DEMO_CONTACT_ONLY');
    const challengeId = newId();
    challenges.set(challengeId, { channel, contact: value, expiresAt: now() + 5 * 60_000, attempts: 0 });
    return { challengeId, demoCode: '123456' };
  }

  function verifyContact({ challengeId, code } = {}) {
    const challenge = challenges.get(challengeId);
    if (!challenge) throw new ReportError('INVALID_CODE');
    if (now() > challenge.expiresAt) {
      challenges.delete(challengeId);
      throw new ReportError('EXPIRED_CODE');
    }
    if (challenge.attempts >= 5) throw new ReportError('TOO_MANY_ATTEMPTS', 429);
    if (code !== '123456') {
      challenge.attempts += 1;
      throw new ReportError(challenge.attempts >= 5 ? 'TOO_MANY_ATTEMPTS' : 'INVALID_CODE', challenge.attempts >= 5 ? 429 : 400);
    }
    challenges.delete(challengeId);
    const proof = newId();
    proofs.set(proof, { ...challenge, expiresAt: now() + 10 * 60_000 });
    return { proof };
  }

  function createReport({ category, description, location, proof, idempotencyKey } = {}) {
    const safeCategory = String(category ?? '').trim();
    const safeDescription = String(description ?? '').trim();
    const safeLocation = String(location ?? '').trim();
    if (!categories.has(safeCategory) || safeDescription.length < 5 || safeDescription.length > 2000 || safeLocation.length < 5 || safeLocation.length > 500 || !/^[a-zA-Z0-9_-]{4,100}$/.test(String(idempotencyKey ?? ''))) {
      throw new ReportError('INVALID_REPORT');
    }
    const fingerprint = JSON.stringify([safeCategory, safeDescription, safeLocation, proof]);
    const previous = requests.get(idempotencyKey);
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new ReportError('IDEMPOTENCY_CONFLICT', 409);
      return previous.response;
    }
    const verified = proofs.get(proof);
    if (!verified || now() > verified.expiresAt) throw new ReportError('CONTACT_NOT_VERIFIED', 403);
    proofs.delete(proof);
    let protocol;
    do {
      protocol = `MAP-${new Date(now()).getUTCFullYear()}-${newId().slice(0, 8).toUpperCase()}`;
    } while (reports.has(protocol));
    const response = { protocol, status: 'Em análise' };
    reports.set(protocol, { ...response, category: safeCategory, description: safeDescription, location: safeLocation, channel: verified.channel, contact: verified.contact });
    requests.set(idempotencyKey, { fingerprint, response });
    return response;
  }

  function getPublicReport(protocol) {
    const report = reports.get(String(protocol ?? '').trim().toUpperCase());
    return report ? { protocol: report.protocol, category: report.category, status: report.status } : null;
  }

  return {
    startVerification,
    verifyContact,
    createReport,
    getPublicReport,
    get reportCount() { return reports.size; },
    get accountCount() { return 0; },
  };
}
