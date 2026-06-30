import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

export interface JwtClaims {
  sub: string;
  org_id: string;
  role: string;
  typ: "access" | "refresh";
  exp: number;
  iat: number;
  jti: string;
  iss: string;
}

export class JwtService {
  constructor(private readonly secret: string, private readonly issuer = "greenlit") {
    if (secret.length < 32) throw new Error("JWT secret must be at least 32 characters");
  }

  issue(input: { subject: string; organisationId: string; role: string; tokenType?: "access" | "refresh"; ttlSeconds?: number }): string {
    const now = Math.floor(Date.now() / 1000);
    const claims: JwtClaims = {
      sub: input.subject,
      org_id: input.organisationId,
      role: input.role,
      typ: input.tokenType ?? "access",
      iat: now,
      exp: now + (input.ttlSeconds ?? 900),
      jti: base64url(randomBytes(18)),
      iss: this.issuer,
    };
    const header = { alg: "HS256", typ: "JWT" };
    const signingInput = `${base64urlJson(header)}.${base64urlJson(claims)}`;
    return `${signingInput}.${this.sign(signingInput)}`;
  }

  verify(token: string, options: { expectedType?: "access" | "refresh"; now?: number } = {}): JwtClaims {
    const [header64, payload64, signature] = token.split(".");
    if (!header64 || !payload64 || !signature) throw new Error("Malformed JWT");
    const signingInput = `${header64}.${payload64}`;
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(this.sign(signingInput)))) throw new Error("Invalid JWT signature");
    const header = JSON.parse(Buffer.from(header64, "base64url").toString("utf8")) as { alg?: string };
    const claims = JSON.parse(Buffer.from(payload64, "base64url").toString("utf8")) as JwtClaims;
    if (header.alg !== "HS256") throw new Error("Unsupported JWT algorithm");
    if (claims.iss !== this.issuer) throw new Error("Invalid JWT issuer");
    if (claims.typ !== (options.expectedType ?? "access")) throw new Error("Invalid JWT token type");
    if (claims.exp <= (options.now ?? Math.floor(Date.now() / 1000))) throw new Error("Expired JWT");
    return claims;
  }

  private sign(input: string): string {
    return createHmac("sha256", this.secret).update(input).digest("base64url");
  }
}

export class PasswordHasher {
  hash(password: string): string {
    if (password.length < 12) throw new Error("Password must be at least 12 characters");
    const salt = randomBytes(16);
    const digest = pbkdf2Sync(password, salt, 310_000, 32, "sha256");
    return `pbkdf2_sha256$310000$${salt.toString("base64url")}$${digest.toString("base64url")}`;
  }

  verify(password: string, encoded: string): boolean {
    const [algorithm, rounds, salt64, digest64] = encoded.split("$");
    if (algorithm !== "pbkdf2_sha256" || !rounds || !salt64 || !digest64) return false;
    const expected = Buffer.from(digest64, "base64url");
    const actual = pbkdf2Sync(password, Buffer.from(salt64, "base64url"), Number(rounds), expected.length, "sha256");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}

function base64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function base64url(value: Buffer): string {
  return value.toString("base64url");
}
