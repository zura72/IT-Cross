import axios from 'axios';
import { getTokenFor } from './token.js';

const host = process.env.SP_HOSTNAME; // contoso.sharepoint.com
const site = process.env.SP_SITE_PATH; // /sites/Helpdesk
const listName = process.env.SP_LIST_NAME; // Tickets

function siteListBase() {
  const list = encodeURIComponent(listName);
  return `https://graph.microsoft.com/v1.0/sites/${host}:${site}:/lists/${list}`;
}

export async function graphCreateItem(fields) {
  const token = await getTokenFor('graph');
  const url = `${siteListBase()}/items`;
  const { data } = await axios.post(
    url,
    { fields },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data; // contains .id (string of int)
}

export async function graphUpdateFields(itemId, fields) {
  const token = await getTokenFor('graph');
  const url = `${siteListBase()}/items/${itemId}/fields`;
  await axios.patch(url, fields, { headers: { Authorization: `Bearer ${token}` } });
}

export async function graphListItems() {
  const token = await getTokenFor('graph');
  const url = `${siteListBase()}/items?$expand=fields($select=Title,RequesterName,Division,Description,Status,CreatedAt,ResolvedAt,ResolutionNotes)&$orderby=createdDateTime desc`;
  const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
  return data?.value ?? [];
}

export async function graphSendMail(subject, html, toEmails) {
  const token = await getTokenFor('graph');
  const fromUpn = process.env.SENDER_UPN; // mailbox pengirim di tenantmu
  const url = `https://graph.microsoft.com/v1.0/users/${fromUpn}/sendMail`;
  await axios.post(
    url,
    {
      message: {
        subject,
        body: { contentType: 'HTML', content: html },
        toRecipients: toEmails.map((e) => ({ emailAddress: { address: e } })),
      },
      saveToSentItems: true,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}