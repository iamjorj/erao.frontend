export type ConnectorStatus = 'available' | 'coming_soon';

export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  placeholder: string;
}

export interface ConnectorDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  color: string;
  credentialFields: CredentialField[];
  suggestedQueries: string[];
  status: ConnectorStatus;
  connectorTypeIndex: number; // Maps to backend ConnectorType enum
}

export const connectorDefinitions: ConnectorDefinition[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    category: 'E-commerce',
    description: 'Analyze orders, products, customers, and inventory from your Shopify store.',
    color: '#96BF48',
    connectorTypeIndex: 0,
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'shpat_xxxxxxxxxxxxx' },
      { key: 'storeUrl', label: 'Store URL', type: 'url', placeholder: 'your-store.myshopify.com' },
    ],
    suggestedQueries: [
      'What are my total sales this month?',
      'Which products have the highest revenue?',
      'Show me order trends over the last 6 months',
      'Who are my top 10 customers by total spent?',
      'What is my average order value?',
    ],
    status: 'available',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Payments',
    description: 'Analyze payments, subscriptions, customers, and invoices from Stripe.',
    color: '#635BFF',
    connectorTypeIndex: 1,
    credentialFields: [
      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_live_xxxxxxxxxxxxx' },
    ],
    suggestedQueries: [
      'What is my monthly recurring revenue?',
      'Show me payment volume by month',
      'How many active subscriptions do I have?',
      'What is my churn rate this quarter?',
      'Which customers have overdue invoices?',
    ],
    status: 'available',
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    category: 'E-commerce',
    description: 'Analyze orders, products, customers, and coupons from your WooCommerce store.',
    color: '#9B5C8F',
    connectorTypeIndex: 2,
    credentialFields: [
      { key: 'consumerKey', label: 'Consumer Key', type: 'password', placeholder: 'ck_xxxxxxxxxxxxx' },
      { key: 'consumerSecret', label: 'Consumer Secret', type: 'password', placeholder: 'cs_xxxxxxxxxxxxx' },
      { key: 'storeUrl', label: 'Store URL', type: 'url', placeholder: 'https://your-store.com' },
    ],
    suggestedQueries: [
      'What are my top-selling products?',
      'Show me revenue by month',
      'Which coupons are used the most?',
      'What is the average order value?',
      'How many orders are pending fulfillment?',
    ],
    status: 'coming_soon',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    category: 'Accounting',
    description: 'Analyze invoices, expenses, accounts, and P&L reports from QuickBooks.',
    color: '#2CA01C',
    connectorTypeIndex: 3,
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Your OAuth Client ID' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Your OAuth Client Secret' },
    ],
    suggestedQueries: [
      'What is my net income this quarter?',
      'Show me outstanding invoices',
      'What are my largest expense categories?',
      'Compare revenue vs expenses by month',
      'Which customers owe the most?',
    ],
    status: 'coming_soon',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'CRM',
    description: 'Analyze contacts, deals, companies, and support tickets from HubSpot.',
    color: '#FF7A59',
    connectorTypeIndex: 4,
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'pat-xxxxxxxxxxxxx' },
    ],
    suggestedQueries: [
      'How many deals are in each pipeline stage?',
      'What is my total deal value this quarter?',
      'Show me new contacts by source',
      'Which companies have the most open tickets?',
      'What is my average deal close time?',
    ],
    status: 'coming_soon',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'CRM',
    description: 'Analyze leads, opportunities, accounts, and cases from Salesforce.',
    color: '#00A1E0',
    connectorTypeIndex: 5,
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Your Connected App Client ID' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Your Connected App Secret' },
    ],
    suggestedQueries: [
      'What is my pipeline value by stage?',
      'Show me win rate by quarter',
      'How many leads converted this month?',
      'Which accounts have the most open cases?',
      'What are my top opportunities by amount?',
    ],
    status: 'coming_soon',
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    category: 'Analytics',
    description: 'Analyze sessions, pageviews, and conversions from Google Analytics.',
    color: '#F9AB00',
    connectorTypeIndex: 6,
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Your OAuth Client ID' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Your OAuth Client Secret' },
    ],
    suggestedQueries: [
      'What are my top traffic sources?',
      'Show me pageviews trend over time',
      'What is my bounce rate by channel?',
      'Which pages have the highest conversion rate?',
      'Compare organic vs paid traffic',
    ],
    status: 'coming_soon',
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'Productivity',
    description: 'Analyze databases and pages from your Notion workspace.',
    color: '#000000',
    connectorTypeIndex: 7,
    credentialFields: [
      { key: 'apiKey', label: 'Integration Token', type: 'password', placeholder: 'secret_xxxxxxxxxxxxx' },
    ],
    suggestedQueries: [
      'How many pages are in each database?',
      'Show me recently edited pages',
      'Which databases have the most properties?',
      'List all archived pages',
    ],
    status: 'coming_soon',
  },
  {
    id: 'airtable',
    name: 'Airtable',
    category: 'Database',
    description: 'Analyze bases, tables, and records from your Airtable workspace.',
    color: '#18BFFF',
    connectorTypeIndex: 8,
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'patxxxxxxxxxxxxx' },
    ],
    suggestedQueries: [
      'How many records are in each table?',
      'Which bases have the most tables?',
      'Show me record counts by base',
      'List all tables with their field counts',
    ],
    status: 'coming_soon',
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    category: 'Spreadsheets',
    description: 'Analyze data from your Google Sheets spreadsheets.',
    color: '#34A853',
    connectorTypeIndex: 9,
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Your OAuth Client ID' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Your OAuth Client Secret' },
    ],
    suggestedQueries: [
      'Show me all sheets and their row counts',
      'Summarize data from the main sheet',
      'Which sheets have the most data?',
      'List all spreadsheet tabs',
    ],
    status: 'coming_soon',
  },
];

export function getConnectorDefinition(id: string): ConnectorDefinition | undefined {
  return connectorDefinitions.find(c => c.id === id);
}

export function getConnectorByTypeIndex(index: number): ConnectorDefinition | undefined {
  return connectorDefinitions.find(c => c.connectorTypeIndex === index);
}

// --- Credential format validation ---

type ValidationRule = {
  pattern?: RegExp;
  message: string;
  minLength?: number;
};

const credentialValidationRules: Record<string, Record<string, ValidationRule>> = {
  shopify: {
    apiKey: {
      pattern: /^shp(at|ss|pa)_[a-fA-F0-9]{20,}/,
      message: 'Shopify API key should start with shpat_, shpss_, or shppa_ followed by hex characters',
    },
    storeUrl: {
      pattern: /^(https?:\/\/)?[\w-]+\.myshopify\.com\/?$/i,
      message: 'Store URL should be like your-store.myshopify.com',
    },
  },
  stripe: {
    secretKey: {
      pattern: /^(sk|rk)_(test|live)_[a-zA-Z0-9]{10,}/,
      message: 'Stripe secret key should start with sk_test_ or sk_live_',
    },
  },
  woocommerce: {
    consumerKey: {
      pattern: /^ck_[a-fA-F0-9]{30,}/,
      message: 'Consumer key should start with ck_ followed by hex characters',
    },
    consumerSecret: {
      pattern: /^cs_[a-fA-F0-9]{30,}/,
      message: 'Consumer secret should start with cs_ followed by hex characters',
    },
    storeUrl: {
      pattern: /^https?:\/\/.+\..+/,
      message: 'Store URL should be a valid URL (e.g. https://your-store.com)',
    },
  },
  quickbooks: {
    clientId: { minLength: 10, message: 'Client ID seems too short' },
    clientSecret: { minLength: 10, message: 'Client Secret seems too short' },
  },
  hubspot: {
    apiKey: {
      pattern: /^pat-(na1|eu1)-[a-fA-F0-9-]{10,}/,
      message: 'HubSpot token should start with pat-na1- or pat-eu1-',
    },
  },
  salesforce: {
    clientId: { minLength: 10, message: 'Client ID seems too short' },
    clientSecret: { minLength: 10, message: 'Client Secret seems too short' },
  },
  'google-analytics': {
    clientId: { minLength: 10, message: 'Client ID seems too short' },
    clientSecret: { minLength: 10, message: 'Client Secret seems too short' },
  },
  notion: {
    apiKey: {
      pattern: /^(secret_|ntn_)[a-zA-Z0-9]{10,}/,
      message: 'Notion token should start with secret_ or ntn_',
    },
  },
  airtable: {
    apiKey: {
      pattern: /^pat[a-zA-Z0-9.]{10,}/,
      message: 'Airtable token should start with pat',
    },
  },
  'google-sheets': {
    clientId: { minLength: 10, message: 'Client ID seems too short' },
    clientSecret: { minLength: 10, message: 'Client Secret seems too short' },
  },
};

/**
 * Validate a single credential field. Returns error message or null if valid.
 */
export function validateCredentialField(
  connectorId: string,
  fieldKey: string,
  value: string,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null; // Empty check is handled separately

  const rules = credentialValidationRules[connectorId]?.[fieldKey];
  if (!rules) return null;

  if (rules.minLength && trimmed.length < rules.minLength) {
    return rules.message;
  }
  if (rules.pattern && !rules.pattern.test(trimmed)) {
    return rules.message;
  }
  return null;
}

/**
 * Validate all credentials for a connector. Returns first error or null.
 */
export function validateAllCredentials(
  connectorId: string,
  fields: CredentialField[],
  formData: Record<string, string>,
): string | null {
  for (const field of fields) {
    const val = formData[field.key]?.trim();
    if (!val) return `${field.label} is required`;
    const err = validateCredentialField(connectorId, field.key, val);
    if (err) return err;
  }
  return null;
}
