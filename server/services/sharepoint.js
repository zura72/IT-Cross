// server/services/sharepoint.js
// Node 18+ sudah punya fetch bawaan
const GRAPH = 'https://graph.microsoft.com/v1.0';

/* ---------------------------------------------
 * AUTH
 * -------------------------------------------*/
export async function graphAppToken({ tenantId, clientId, clientSecret }) {
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error(`Token failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  if (!j.access_token) throw new Error('Token failed: no access_token');
  return j.access_token;
}

/* ---------------------------------------------
 * SITE & LIST
 * -------------------------------------------*/
export async function getSiteId(token, host, sitePath) {
  const r = await fetch(`${GRAPH}/sites/${host}:${sitePath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`getSiteId: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.id;
}

export async function getListId(token, siteId, listName) {
  const r = await fetch(
    `${GRAPH}/sites/${siteId}/lists?$select=id,name,displayName`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) throw new Error(`getListId: ${r.status} ${await r.text()}`);
  const j = await r.json();

  const found =
    j.value.find((x) => (x.displayName || '').toLowerCase() === listName.toLowerCase()) ||
    j.value.find((x) => (x.name || '').toLowerCase() === listName.toLowerCase());

  if (!found) throw new Error(`List "${listName}" not found on site`);
  return found.id;
}

/** Map label → internal name (opsional; masih dipakai beberapa tempat) */
export async function getFieldMap(token, siteId, listId) {
  const { cols } = await getListColumnsMeta(token, siteId, listId);
  return new Map(cols.map((c) => [c.displayName, c.internalName]));
}

export async function getListColumnsMeta(token, siteId, listId) {
  const url =
    `${GRAPH}/sites/${siteId}/lists/${listId}/columns` +
    `?$select=id,name,displayName,required,readOnly,hidden,choice,personOrGroup,dateTime,number,lookup,calculated`;

  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`get columns meta: ${r.status} ${await r.text()}`);
  const j = await r.json();

  const cols = j.value
    .map((c) => {
      const isSystem =
        /^LinkTitle/i.test(c.name) ||
        ['Attachments', 'ContentType', 'Edit', 'DocIcon', 'ID', 'UniqueId', 'FileRef'].includes(
          c.name,
        );
      if (c.hidden || c.readOnly || c.calculated || isSystem) return null;

      let type = 'text';
      let choices = [];
      if (c.choice) {
        type = 'choice';
        choices = c.choice.choices || [];
      } else if (c.personOrGroup) {
        type = 'person';
      } else if (c.lookup) {
        type = 'lookup';
      } else if (c.dateTime) {
        type = 'dateTime';
      } else if (c.number) {
        type = 'number';
      }

      return {
        displayName: (c.displayName || '').trim(),
        internalName: c.name,
        required: !!c.required,
        type,
        choices,
        readOnly: !!c.readOnly,
        hidden: !!c.hidden,
      };
    })
    .filter(Boolean);

  const byLabel = new Map(cols.map((c) => [c.displayName, c]));
  return { cols, byLabel };
}

/* ---------------------------------------------
 * GENERATE NUMBER (e.g., TicketNumber)
 * -------------------------------------------*/
export async function getNextNumber(token, siteId, listId, numberField) {
  try {
    const url =
      `${GRAPH}/sites/${siteId}/lists/${listId}/items` +
      `?$select=id&$expand=fields($select=${encodeURIComponent(numberField)})` +
      `&$orderby=fields/${encodeURIComponent(numberField)} desc&$top=1`;

    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    const last = j.value?.[0]?.fields?.[numberField];
    const n = Number.isFinite(Number(last)) ? Number(last) + 1 : 1;
    return n;
  } catch {
    return 1;
  }
}

/* ---------------------------------------------
 * CREATE/PATCH LIST ITEM
 * -------------------------------------------*/
export async function createListItem(token, siteId, listId, fields) {
  const r = await fetch(`${GRAPH}/sites/${siteId}/lists/${listId}/items`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error(`create item: ${r.status} ${await r.text()}`);
  return await r.json();
}

export async function patchListItemFields(token, siteId, listId, itemId, patch) {
  const r = await fetch(`${GRAPH}/sites/${siteId}/lists/${listId}/items/${itemId}/fields`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`patch item: ${r.status} ${await r.text()}`);
  return true;
}

export async function getUserLookupId(token, siteId, upn) {
  if (!upn) return null;
  const url =
    `${GRAPH}/sites/${siteId}/users` +
    `?$filter=userPrincipalName eq '${encodeURIComponent(upn)}'` +
    `&$select=id,userPrincipalName,displayName`;

  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`getUserLookupId: ${r.status} ${await r.text()}`);
  const j = await r.json();
  const u = j.value?.[0];
  return u?.id ?? null;
}

export async function graphSendMail(token, senderUpn, to, subject, html) {
  if (!senderUpn || !to?.length) return false;

  const url = `${GRAPH}/users/${encodeURIComponent(senderUpn)}/sendMail`;
  const payload = {
    message: {
      subject,
      body: { contentType: 'HTML', content: html },
      toRecipients: to.map((m) => ({ emailAddress: { address: m } })),
    },
    saveToSentItems: 'false',
  };

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`sendMail: ${r.status} ${await r.text()}`);
  return true;
}

export async function uploadItemPhoto(_token, _siteId, _listId, _itemId, _fileName, _buffer) {
  throw new Error('uploadItemPhoto is not supported for custom list. Use uploadImageToLibrary().');
}

export async function getDriveByName(token, siteId, displayName = 'Site Assets') {
  const r = await fetch(`${GRAPH}/sites/${siteId}/drives`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`getDriveByName: ${r.status} ${await r.text()}`);
  const j = await r.json();
  const drive = j.value.find((d) => (d.name || '').toLowerCase() === displayName.toLowerCase());
  if (!drive) throw new Error(`Document library "${displayName}" not found on site`);

  const r2 = await fetch(`${GRAPH}/sites/${siteId}/drives/${drive.id}/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r2.ok) throw new Error(`getDrive list: ${r2.status} ${await r2.text()}`);
  const list = await r2.json();
  const listWebUrl = list?.webUrl;
  const baseRelative = new URL(listWebUrl).pathname;
  return { drive, baseRelative };
}

export async function ensureFolderPath(token, driveId, path) {
  const parts = path.split('/').filter(Boolean);
  let currentPath = '';
  for (const p of parts) {
    const check = await fetch(
      `${GRAPH}/drives/${driveId}/root:/${currentPath ? currentPath + '/' : ''}${encodeURIComponent(
        p,
      )}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (check.status === 404) {
      const url = `${GRAPH}/drives/${driveId}/root:/${currentPath ? currentPath + '/' : ''}:/children`;
      const body = { name: p, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' };
      const make = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!make.ok && make.status !== 409) {
        throw new Error(`ensureFolderPath: ${make.status} ${await make.text()}`);
      }
    }
    currentPath = currentPath ? `${currentPath}/${p}` : p;
  }
  return currentPath;
}

export async function uploadImageToLibrary(
  token,
  siteId,
  {
    libraryName = 'Site Assets',
    itemId,
    fileName,
    buffer,
    host, // e.g. waskitainfra.sharepoint.com
    sitePath, // e.g. /sites/ITHELPDESK
  },
) {
  if (!buffer?.length) throw new Error('uploadImageToLibrary: empty buffer');

  const { drive, baseRelative } = await getDriveByName(token, siteId, libraryName);

  // siapkan folder: Tickets/{itemId}
  await ensureFolderPath(token, drive.id, 'Tickets');
  await ensureFolderPath(token, drive.id, `Tickets/${itemId}`);

  const destPath = `Tickets/${itemId}/${fileName}`;
  const putUrl = `${GRAPH}/drives/${drive.id}/root:/${encodeURI(destPath)}:/content`;

  const r = await fetch(putUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: buffer,
  });
  if (!r.ok) throw new Error(`uploadImageToLibrary PUT: ${r.status} ${await r.text()}`);

  const serverRelativeUrl = `${baseRelative}/Tickets/${itemId}/${fileName}`;
  return {
    fileName,
    serverUrl: `https://${host}`,
    serverRelativeUrl,
  };
}
