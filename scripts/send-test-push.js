#!/usr/bin/env node
/* eslint-env node */
/**
 * Send a test push through Firebase Cloud Messaging (HTTP v1 API) to ONE device
 * token, without going through the CMSTrax backend. Use it to tell apart
 * "the app / device cannot receive" from "the backend does not send correctly".
 * It is also the reference for what the backend has to do (see the doc).
 *
 * Needs: Node 18+ and a Firebase service-account key of project `cms-trax`
 * (Firebase console → Project settings → Service accounts → Generate new private key).
 * That JSON is a secret: keep it out of git (.gitignore has *service-account*.json).
 *
 * Usage:
 *   node scripts/send-test-push.js --key ./cms-trax-service-account.json --token <FCM_TOKEN>
 *   node scripts/send-test-push.js --key sa.json --token <FCM_TOKEN> --title "Hi" --body "Test" \
 *        --data screen=Home --data package_id=123
 *   node scripts/send-test-push.js --key sa.json --token <FCM_TOKEN> --data-only --data title=Hi --data body=Test
 *   node scripts/send-test-push.js --key sa.json --token <FCM_TOKEN> --dry-run   (validate only, nothing delivered)
 *
 * The FCM token is printed by the app in Metro as "[Push] FCM token …".
 */
'use strict';

const fs = require('fs');
const crypto = require('crypto');

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
// Must match firebase.json (messaging_android_notification_channel_id) and MainApplication.kt.
const ANDROID_CHANNEL_ID = 'cmstrax_default';

function usage(code) {
  console.log(
    'Usage: node scripts/send-test-push.js --key <service-account.json> --token <FCM token>\n' +
      '       [--title "..."] [--body "..."] [--data key=value ...] [--data-only] [--dry-run]',
  );
  process.exit(code);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    data: {},
    title: 'CMSTrax test',
    body: 'Push notifications are working.',
    dataOnly: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) {
        fail(`Missing value for ${flag}`);
      }
      return value;
    };
    switch (flag) {
      case '--key':
        args.key = next();
        break;
      case '--token':
        args.token = next();
        break;
      case '--title':
        args.title = next();
        break;
      case '--body':
        args.body = next();
        break;
      case '--data': {
        const pair = next();
        const eq = pair.indexOf('=');
        if (eq < 1) {
          fail(`--data expects key=value, got "${pair}"`);
        }
        args.data[pair.slice(0, eq)] = pair.slice(eq + 1);
        break;
      }
      case '--data-only':
        args.dataOnly = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '-h':
      case '--help':
        usage(0);
        break;
      default:
        fail(`Unknown argument: ${flag}`);
    }
  }
  if (!args.key || !args.token) {
    usage(1);
  }
  return args;
}

const base64url = input => Buffer.from(input).toString('base64url');

/** OAuth2 access token for a service account via a self-signed JWT (no SDK needed). */
async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({alg: 'RS256', typ: 'JWT'}));
  const claims = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: FCM_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(serviceAccount.private_key).toString('base64url');
  const assertion = `${header}.${claims}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.access_token) {
    fail(`Token exchange failed (${response.status}): ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

/** The FCM v1 message. This shape is what the backend should send too. */
function buildMessage(args) {
  const message = {
    token: args.token,
    data: args.data,
    android: {priority: 'high'},
    apns: {
      headers: {'apns-priority': '10', 'apns-push-type': 'alert'},
      payload: {aps: {sound: 'default'}},
    },
  };
  if (args.dataOnly) {
    // No `notification` block: the OS shows nothing by itself. The Android app
    // posts it as a local system notification; iOS only receives it.
    message.apns.headers = {'apns-priority': '5', 'apns-push-type': 'background'};
    message.apns.payload = {aps: {'content-available': 1}};
  } else {
    message.notification = {title: args.title, body: args.body};
    message.android.notification = {channel_id: ANDROID_CHANNEL_ID, sound: 'default'};
  }
  return message;
}

const ERROR_HINTS = {
  UNREGISTERED:
    'Token is stale (app reinstalled, logged out, or token deleted). Take a fresh one from Metro.',
  INVALID_ARGUMENT:
    'Token malformed or payload invalid. Copy the whole token (about 160 characters).',
  SENDER_ID_MISMATCH:
    'Token belongs to another Firebase project. The app config files must come from this project.',
  THIRD_PARTY_AUTH_ERROR:
    'iOS: APNs auth key missing or invalid in Firebase console (Cloud Messaging → Apple app configuration).',
  PERMISSION_DENIED:
    'Service account lacks the "Firebase Cloud Messaging API Admin" role, or the FCM API is disabled.',
  UNAVAILABLE: 'FCM temporarily unavailable, retry in a minute.',
};

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(fs.readFileSync(args.key, 'utf8'));
  } catch (error) {
    fail(`Cannot read service account file: ${error.message}`);
  }
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    fail('Not a service-account key file (needs project_id, client_email, private_key).');
  }

  const accessToken = await getAccessToken(serviceAccount);
  const message = buildMessage(args);
  const url = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

  console.log(`Sending to project ${serviceAccount.project_id}${args.dryRun ? ' (dry run)' : ''}:`);
  console.log(JSON.stringify(message, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({validate_only: args.dryRun, message}),
  });
  const json = await response.json().catch(() => ({}));
  console.log(`\nFCM response ${response.status}:`);
  console.log(JSON.stringify(json, null, 2));

  if (response.ok) {
    console.log(
      args.dryRun
        ? '\nMessage is valid (nothing was delivered).'
        : '\nAccepted by FCM. If nothing shows on the device, see PUSH_NOTIFICATIONS_SETUP.md section 7.',
    );
    return;
  }
  const details = (json.error && json.error.details) || [];
  const code = (details.find(d => d.errorCode) || {}).errorCode || (json.error && json.error.status);
  if (code && ERROR_HINTS[code]) {
    console.error(`\nHint (${code}): ${ERROR_HINTS[code]}`);
  }
  process.exit(1);
}

main().catch(error => fail(error.message));
