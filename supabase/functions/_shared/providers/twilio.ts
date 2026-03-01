export interface SendWhatsAppOptions {
  /** Optional media URL (image, audio, video, document) - Twilio will fetch and attach */
  mediaUrl?: string;
  /** Twilio Content Template SID (e.g. HX...) - when set, uses template instead of Body */
  contentSid?: string;
  /** Template variable values - keys are placeholder numbers as strings, e.g. {"1":"12/1","2":"3pm"} */
  contentVariables?: Record<string, string>;
}

export async function sendWhatsAppViaTwilio(
  accountSid: string,
  authToken: string,
  fromNumber: string,
  toNumber: string,
  body: string,
  options?: SendWhatsAppOptions
) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams();
  params.append('From', `whatsapp:${fromNumber}`);
  params.append('To', `whatsapp:${toNumber}`);

  if (options?.contentSid) {
    params.append('ContentSid', options.contentSid);
    if (options.contentVariables && Object.keys(options.contentVariables).length > 0) {
      params.append('ContentVariables', JSON.stringify(options.contentVariables));
    }
  } else {
    params.append('Body', body);
  }

  if (options?.mediaUrl) {
    params.append('MediaUrl', options.mediaUrl);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}
