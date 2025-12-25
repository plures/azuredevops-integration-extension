/**
 * Helpers for normalizing and enriching device code responses.
 */
function pickFirstString(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === 'string' && value.length > 0);
}

function extractUserCodeFromMessage(message?: string): string | undefined {
  if (!message) return undefined;
  const direct = message.match(/code[:\s]+([A-Z0-9-]{4,})/i)?.[1];
  if (direct) return direct.toUpperCase();

  const looseCandidate = message.match(/([A-Z0-9]{6,})/g)?.find((c) => c.length >= 6);
  return looseCandidate ? looseCandidate.toUpperCase() : undefined;
}

function extractUserCodeFromUri(uri?: string): string | undefined {
  if (!uri) return undefined;
  try {
    const url = new URL(uri);
    const paramKeys = ['user_code', 'usercode', 'code', 'otc'];
    for (const key of paramKeys) {
      const value = url.searchParams.get(key);
      if (value) return value.toUpperCase();
    }

    const looseCandidate = uri.match(/([A-Z0-9]{6,})/g)?.find((c) => c.length >= 6);
    return looseCandidate ? looseCandidate.toUpperCase() : undefined;
  } catch {
    return undefined;
  }
}

function resolveMessage(response: any): string | undefined {
  return typeof response?.message === 'string' ? response.message : undefined;
}

function resolveUserCode(response: any, rawMessage?: string): string | undefined {
  return (
    pickFirstString(response?.userCode, response?.user_code) ||
    extractUserCodeFromMessage(rawMessage) ||
    extractUserCodeFromUri(response?.verificationUriComplete || response?.verification_uri_complete)
  )?.toUpperCase();
}

function resolveVerificationUri(response: any): string {
  return (
    pickFirstString(
      response?.verificationUri,
      response?.verification_uri,
      response?.verificationUriComplete,
      response?.verification_uri_complete
    ) || 'https://microsoft.com/devicelogin'
  );
}

function resolveVerificationUriComplete(
  response: any,
  verificationUri: string,
  userCode?: string
): string | undefined {
  const explicit = pickFirstString(
    response?.verificationUriComplete,
    response?.verification_uri_complete
  );
  if (explicit) return explicit;
  return userCode ? `${verificationUri}?user_code=${userCode}` : undefined;
}

function resolveExpiresInSeconds(response: any): number {
  return response?.expiresIn || response?.expiresInSeconds || response?.expires_in || 900;
}

export function normalizeDeviceCodeResponse(response: any) {
  if (!response) return undefined;

  const rawMessage = resolveMessage(response);
  const userCode = resolveUserCode(response, rawMessage);
  const verificationUri = resolveVerificationUri(response);
  const verificationUriComplete = resolveVerificationUriComplete(
    response,
    verificationUri,
    userCode
  );
  const expiresInSeconds = resolveExpiresInSeconds(response);

  return {
    userCode,
    verificationUri,
    verificationUriComplete,
    expiresInSeconds,
    message: rawMessage,
  } as
    | {
        userCode?: string;
        verificationUri: string;
        verificationUriComplete?: string;
        expiresInSeconds: number;
        message?: string;
      }
    | undefined;
}

function ensureMessage(response: any, normalized?: ReturnType<typeof normalizeDeviceCodeResponse>) {
  if (response?.message) return response.message;
  const code = normalized?.userCode;
  if (!code) return normalized?.message;
  const uri = normalized?.verificationUri ?? 'https://microsoft.com/devicelogin';
  return `To sign in, use a web browser to open ${uri} and enter the code ${code}`;
}

export function enrichDeviceCodeResponse(response: any) {
  const normalized = normalizeDeviceCodeResponse(response);
  const userCode = normalized?.userCode ?? resolveUserCode(response, response?.message);
  const verificationUri = normalized?.verificationUri ?? resolveVerificationUri(response);
  const verificationUriComplete =
    normalized?.verificationUriComplete ??
    resolveVerificationUriComplete(response, verificationUri, userCode);

  return {
    ...(response ?? {}),
    userCode,
    user_code: userCode,
    verificationUri,
    verification_uri: verificationUri,
    verificationUriComplete,
    verification_uri_complete: verificationUriComplete,
    message: ensureMessage(response, normalized),
    __normalized: normalized,
  };
}

export type NormalizedDeviceCodeResponse = ReturnType<typeof normalizeDeviceCodeResponse>;
