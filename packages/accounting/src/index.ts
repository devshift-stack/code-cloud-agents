import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';

config();

interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  matched: boolean;
  invoiceId?: string;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  vendor: string;
  source: string;
  transactionId?: string;
}

const server = new Server(
  { name: 'accounting-agent', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'fetch_transactions',
      description: 'Holt Transaktionen von Qonto',
      inputSchema: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Startdatum (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'Enddatum (YYYY-MM-DD)' },
          status: {
            type: 'string',
            enum: ['all', 'unmatched', 'matched'],
            description: 'Filter nach Status'
          },
        },
      },
    },
    {
      name: 'scan_invoices',
      description: 'Scannt E-Mails (FrontApp) nach Rechnungen',
      inputSchema: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            enum: ['frontapp', 'gmail', 'all'],
            description: 'E-Mail Quelle'
          },
          startDate: { type: 'string', description: 'Startdatum' },
          endDate: { type: 'string', description: 'Enddatum' },
        },
      },
    },
    {
      name: 'match_invoices',
      description: 'Matched Rechnungen mit Transaktionen automatisch',
      inputSchema: {
        type: 'object',
        properties: {
          tolerance: { type: 'number', description: 'Betrag-Toleranz in % (default: 1)' },
          dateTolerance: { type: 'number', description: 'Datum-Toleranz in Tagen (default: 7)' },
        },
      },
    },
    {
      name: 'upload_invoice',
      description: 'Lädt eine Rechnung zu Qonto hoch',
      inputSchema: {
        type: 'object',
        properties: {
          transactionId: { type: 'string', description: 'Qonto Transaction ID' },
          invoicePath: { type: 'string', description: 'Pfad zur Rechnung (PDF)' },
        },
        required: ['transactionId', 'invoicePath'],
      },
    },
    {
      name: 'get_unmatched',
      description: 'Zeigt alle nicht zugeordneten Transaktionen/Rechnungen',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['transactions', 'invoices', 'both'],
            description: 'Was anzeigen'
          },
        },
      },
    },
    {
      name: 'manual_match',
      description: 'Ordnet eine Rechnung manuell einer Transaktion zu',
      inputSchema: {
        type: 'object',
        properties: {
          transactionId: { type: 'string', description: 'Transaction ID' },
          invoiceId: { type: 'string', description: 'Invoice ID' },
        },
        required: ['transactionId', 'invoiceId'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'fetch_transactions': {
      // TODO: Implement Qonto API integration
      const mockTransactions: Transaction[] = [
        { id: 'tx_001', date: '2024-12-20', amount: -299.00, description: 'Google Workspace', matched: false },
        { id: 'tx_002', date: '2024-12-19', amount: -89.00, description: 'Slack', matched: true, invoiceId: 'inv_001' },
        { id: 'tx_003', date: '2024-12-18', amount: -1500.00, description: 'AWS', matched: false },
      ];

      const filtered = args.status === 'unmatched'
        ? mockTransactions.filter(t => !t.matched)
        : args.status === 'matched'
          ? mockTransactions.filter(t => t.matched)
          : mockTransactions;

      return {
        content: [{
          type: 'text',
          text: `Transaktionen von Qonto:\n\n${filtered.map(t =>
            `${t.matched ? '✅' : '❌'} ${t.date} | ${t.amount.toFixed(2)}€ | ${t.description}`
          ).join('\n')}`,
        }],
      };
    }

    case 'scan_invoices': {
      // TODO: Implement FrontApp/Gmail API integration
      const mockInvoices: Invoice[] = [
        { id: 'inv_001', date: '2024-12-19', amount: 89.00, vendor: 'Slack', source: 'frontapp' },
        { id: 'inv_002', date: '2024-12-15', amount: 299.00, vendor: 'Google', source: 'frontapp' },
        { id: 'inv_003', date: '2024-12-10', amount: 1487.32, vendor: 'AWS', source: 'gmail' },
      ];

      return {
        content: [{
          type: 'text',
          text: `Gefundene Rechnungen:\n\n${mockInvoices.map(i =>
            `📄 ${i.date} | ${i.amount.toFixed(2)}€ | ${i.vendor} (${i.source})`
          ).join('\n')}`,
        }],
      };
    }

    case 'match_invoices': {
      const tolerance = args.tolerance || 1;
      const dateTolerance = args.dateTolerance || 7;

      // TODO: Implement actual matching logic
      return {
        content: [{
          type: 'text',
          text: `Matching durchgeführt:\n\nToleranzen: ${tolerance}% Betrag, ${dateTolerance} Tage\n\nErgebnis:\n✅ 2 automatisch gematched\n❌ 1 nicht zugeordnet (manuelle Prüfung nötig)`,
        }],
      };
    }

    case 'upload_invoice': {
      // TODO: Implement Qonto upload API
      return {
        content: [{
          type: 'text',
          text: `[STUB] Rechnung hochgeladen:\nTransaction: ${args.transactionId}\nDatei: ${args.invoicePath}`,
        }],
      };
    }

    case 'get_unmatched': {
      const type = args.type || 'both';
      // TODO: Get actual unmatched items
      return {
        content: [{
          type: 'text',
          text: `Nicht zugeordnet (${type}):\n\nTransaktionen:\n❌ 2024-12-20 | -299.00€ | Google Workspace\n❌ 2024-12-18 | -1500.00€ | AWS\n\nRechnungen:\n📄 2024-12-10 | 1487.32€ | AWS`,
        }],
      };
    }

    case 'manual_match': {
      // TODO: Implement manual matching
      return {
        content: [{
          type: 'text',
          text: `Manuell zugeordnet:\nTransaction: ${args.transactionId} ↔ Invoice: ${args.invoiceId}`,
        }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Accounting Agent MCP Server running...');
}

main().catch(console.error);
