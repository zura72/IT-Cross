import axios from 'axios';

const tokenCache = new Map();

export async function getTokenFor(resource) {
  // resource: 'graph' | 'sharepoint'
  const cacheKey = `${resource}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const tenant = process.env.GRAPH_TENANT_ID;
  const body = new URLSearchParams();
  body.set('client_id', process.env.GRAPH_CLIENT_ID);
  body.set('client_secret', process.env.GRAPH_CLIENT_SECRET);
  body.set('grant_type', 'client_credentials');
  body.set(
    'scope',
    resource === 'graph'
      ? 'https://graph.microsoft.com/.default'
      : `https://${process.env.SP_HOSTNAME}/.default`
  );

  const { data } = await axios.post(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    body
  );

  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  });
  return data.access_token;
}