
import express from 'express';
import cors from 'cors';
import path from 'path';
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// CONFIGURATION: Set this via 'export DOMAIN=yourdomain.com' on EC2
const DOMAIN = process.env.DOMAIN || 'localhost.local';

// In-memory store
let inboxes: any[] = [];
let emails: any[] = [];

// --- REST API ---
app.get('/api/v1/config', (req, res) => {
  res.json({ domain: DOMAIN });
});

// Helper for the frontend DNS guide
app.get('/api/v1/server-info', async (req, res) => {
  try {
    // In production on EC2, we'd usually use a metadata service call or just trust the request host
    // For this helper, we'll try to find the public IP or just return the domain
    res.json({ 
      domain: DOMAIN,
      publicIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Your-EC2-Elastic-IP'
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch server info" });
  }
});

app.get('/api/v1/inboxes', (req, res) => {
  res.json(inboxes);
});

app.post('/api/v1/inboxes', (req, res) => {
  const id = Math.random().toString(36).substring(2, 11);
  const newInbox = {
    id,
    address: `test-${id}@${DOMAIN}`,
    createdAt: new Date(),
    emailCount: 0
  };
  inboxes.push(newInbox);
  res.json(newInbox);
});

app.delete('/api/v1/inboxes/:id', (req, res) => {
  const { id } = req.params;
  const inbox = inboxes.find(i => i.id === id);
  if (inbox) {
    emails = emails.filter(e => e.to !== inbox.address);
    inboxes = inboxes.filter(i => i.id !== id);
  }
  res.status(204).send();
});

app.get('/api/v1/emails/:address', (req, res) => {
  const { address } = req.params;
  const inboxEmails = emails.filter(e => e.to.toLowerCase() === address.toLowerCase());
  res.json(inboxEmails);
});

app.use(express.static(__dirname)); 
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- SMTP SERVER ---
const smtpServer = new SMTPServer({
  authOptional: true,
  disabledCommands: ['AUTH'],
  onData(stream, session, callback) {
    simpleParser(stream, (err, parsed) => {
      if (err) {
        console.error("[SMTP ERROR] Mail Parsing Error:", err);
        return callback(err);
      }

      const toAddress = (parsed.to as any)?.text || (parsed.to as any)?.value?.[0]?.address;
      
      if (toAddress) {
        const email = {
          id: uuidv4(),
          from: (parsed.from as any)?.text || 'Unknown',
          to: toAddress,
          subject: parsed.subject || '(No Subject)',
          body: parsed.text || '',
          html: parsed.html || parsed.textAsHtml || '',
          receivedAt: new Date()
        };

        emails.unshift(email);
        
        const inbox = inboxes.find(i => i.address.toLowerCase() === toAddress.toLowerCase());
        if (inbox) {
          inbox.emailCount++;
        }
        console.log(`[SMTP] SUCCESS: Received mail from ${email.from} to ${toAddress}`);
      }
      callback();
    });
  }
});

const API_PORT = process.env.PORT || 80;
const SMTP_PORT = 25;

app.listen(API_PORT, () => {
  console.log(`[API] Web server running on port ${API_PORT}`);
  console.log(`[CONFIG] Active Domain: ${DOMAIN}`);
  console.log(`[READY] Visit http://${DOMAIN} to access the dashboard.`);
});

smtpServer.listen(SMTP_PORT, () => {
  console.log(`[SMTP] SMTP listener active on port ${SMTP_PORT}`);
});
