import * as signalR from '@microsoft/signalr';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Dev-only logger — silenced in production
const isDev = process.env.NODE_ENV === 'development';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const devLog: (...args: any[]) => void = isDev ? (...args) => console.log(...args) : () => {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const devWarn: (...args: any[]) => void = isDev ? (...args) => console.warn(...args) : () => {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const devError: (...args: any[]) => void = isDev ? (...args) => console.error(...args) : () => {};

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionTier: number | string;
  queryLimitPerMonth: number;
  queriesUsedThisMonth: number;
  globalCustomInstructions: string | null;
  createdAt: string;
}

const TIER_NAMES: Record<number | string, string> = {
  0: "Free",
  1: "Pro",
  2: "Enterprise",
  "Starter": "Free",
  "Professional": "Pro",
  "Enterprise": "Enterprise",
  "Free": "Free",
  "Pro": "Pro",
};

export function getTierName(tier: number | string | undefined): string {
  if (tier === undefined || tier === null) return "Free";
  return TIER_NAMES[tier] ?? "Free";
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export interface RegisterResponse {
  email: string;
  message: string;
  requiresEmailVerification: boolean;
}

interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

// Database connection types
export type DatabaseType = 'PostgreSQL' | 'MySQL' | 'SQLServer' | 'MongoDB' | 'Oracle' | 'SQLite' | 'MariaDB' | 'CockroachDB' | 'Redshift' | 'ClickHouse' | 'Firebird' | 'DuckDB' | 'TimescaleDB' | 'YugabyteDB' | 'Snowflake' | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

// DatabaseType helpers
const DB_TYPE_MAP: Record<number, string> = {
  0: 'PostgreSQL', 1: 'MySQL', 2: 'SQLServer', 3: 'MongoDB',
  4: 'Oracle', 5: 'SQLite', 6: 'MariaDB', 7: 'CockroachDB',
  8: 'Redshift', 9: 'ClickHouse', 10: 'Firebird', 11: 'DuckDB',
  12: 'TimescaleDB', 13: 'YugabyteDB', 14: 'Snowflake'
};
export function getDatabaseTypeName(type: DatabaseType): string {
  if (typeof type === 'number') return DB_TYPE_MAP[type] || 'Unknown';
  return type;
}
export function isPostgreSQL(type: DatabaseType): boolean { return type === 'PostgreSQL' || type === 0; }
export function isMySQL(type: DatabaseType): boolean { return type === 'MySQL' || type === 1; }
export function isSQLServer(type: DatabaseType): boolean { return type === 'SQLServer' || type === 2; }
export function isMongoDB(type: DatabaseType): boolean { return type === 'MongoDB' || type === 3; }
export function isOracle(type: DatabaseType): boolean { return type === 'Oracle' || type === 4; }
export function isSQLite(type: DatabaseType): boolean { return type === 'SQLite' || type === 5; }
export function isMariaDB(type: DatabaseType): boolean { return type === 'MariaDB' || type === 6; }
export function isCockroachDB(type: DatabaseType): boolean { return type === 'CockroachDB' || type === 7; }
export function isRedshift(type: DatabaseType): boolean { return type === 'Redshift' || type === 8; }
export function isClickHouse(type: DatabaseType): boolean { return type === 'ClickHouse' || type === 9; }
export function isFirebird(type: DatabaseType): boolean { return type === 'Firebird' || type === 10; }
export function isDuckDB(type: DatabaseType): boolean { return type === 'DuckDB' || type === 11; }
export function isTimescaleDB(type: DatabaseType): boolean { return type === 'TimescaleDB' || type === 12; }
export function isYugabyteDB(type: DatabaseType): boolean { return type === 'YugabyteDB' || type === 13; }
export function isSnowflake(type: DatabaseType): boolean { return type === 'Snowflake' || type === 14; }

export interface DatabaseConnection {
  id: string;
  name: string;
  databaseType: DatabaseType;
  isActive: boolean;
  lastTestedAt: string | null;
  globalCustomInstructions: string | null;
  createdAt: string;
}

export interface CreateDatabaseConnectionPayload {
  name: string;
  databaseType: number; // 0=PostgreSQL, 1=MySQL, 2=SQLServer, 3=MongoDB
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
}

export interface UpdateDatabaseConnectionPayload {
  name?: string;
  host?: string;
  port?: number;
  databaseName?: string;
  username?: string;
  password?: string;
}

export interface SchemaResponse {
  databaseName: string;
  databaseType: string;
  tables: TableSchema[];
  rawSchema: string;
  cachedAt: string | null;
}

export interface TableSchema {
  name: string;
  schema: string | null;
  columns: ColumnSchema[];
  primaryKeys: PrimaryKeyInfo[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
  rowCount: number | null;
}

export interface ColumnSchema {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  maxLength: number | null;
  precision: number | null;
  scale: number | null;
  isIdentity: boolean;
}

export interface PrimaryKeyInfo {
  name: string;
  columns: string[];
}

export interface ForeignKeyInfo {
  name: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: string | null;
  onUpdate: string | null;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
  isClustered: boolean;
}

// Conversation types
export interface Conversation {
  id: string;
  title: string;
  databaseConnectionId: string | null;
  databaseConnectionName: string | null;
  fileDocumentId: string | null;
  fileDocumentName: string | null;
  appConnectorId: string | null;
  appConnectorName: string | null;
  customInstructions: string | null;
  hasContextSummary: boolean;
  contextSummary: string | null;
  summarizedMessageCount: number;
  lastContextMetadata: ContextMetadata | null;
  globalCustomInstructions: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface CreateConversationPayload {
  title?: string;
  databaseConnectionId?: string;
  fileDocumentId?: string;
  appConnectorId?: string;
}

export interface UpdateConversationPayload {
  title?: string;
  customInstructions?: string;
  contextSummary?: string;
}

// Message types
// Role can be string ("User", "Assistant", "System") or number (0, 1, 2)
export type MessageRole = 'User' | 'Assistant' | 'System' | 0 | 1 | 2;

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  sqlQuery: string | null;
  queryResult: QueryResult | string | null; // Can be JSON string or parsed object
  tokensUsed: number;
  insight?: string | null;
  followUpQuestions?: string[] | null;
  createdAt: string;
}

// Helper to check if message is from assistant (handles both string and number)
export function isAssistantMessage(role: MessageRole): boolean {
  return role === 'Assistant' || role === 1;
}

// Helper to check if message is from user (handles both string and number)
export function isUserMessage(role: MessageRole): boolean {
  return role === 'User' || role === 0;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  truncated?: boolean;
  maxRows?: number;
}

export interface ChatRequest {
  conversationId: string;
  message: string;
  executeQuery?: boolean; // Default: true
}

// Visualization hint returned with chat response (single AI call)
export interface VisualizationHint {
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'table';
  groupByColumn: string | null;
  valueColumns: ValueColumnHint[];
}

export interface ValueColumnHint {
  column: string;
  aggregation: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'NONE';
}

export interface ClarificationOption {
  label: string;
  value: string;
}

export interface ClarificationRequest {
  question: string;
  options: ClarificationOption[];
}

export interface ContextMetadata {
  totalMessages: number;
  messagesInContext: number;
  usingSummary: boolean;
  summarizedMessages: number;
  estimatedInputTokens: number;
  tokenBudget: number;
  hasCustomInstructions: boolean;
  contextSummary: string | null;
  summarizedMessageCount: number;
}

export interface ChatResponse {
  userMessage: Message;
  assistantMessage: Message;
  queryResult: string | null;
  tokensUsed: number;
  visualizationHint?: VisualizationHint;
  clarification?: ClarificationRequest;
  insight?: string;
  followUpQuestions?: string[];
  context?: ContextMetadata;
}

// App Connector types
export interface AppConnector {
  id: string;
  name: string;
  connectorType: number;
  isActive: boolean;
  lastSyncedAt: string | null;
  globalCustomInstructions: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: number; // 0=Idle, 1=Syncing, 2=Completed, 3=Failed
  syncErrorMessage: string | null;
  hasSyncedData: boolean;
  tableRowCounts: Record<string, number> | null;
}

export interface ConnectorMetadata {
  connectorType: number;
  name: string;
  category: string;
  description: string;
  iconSlug: string;
  isAvailable: boolean;
  credentialFields: CredentialFieldDefinition[];
  dataTables: string[];
}

export interface CredentialFieldDefinition {
  key: string;
  label: string;
  type: string; // text | password | url
  placeholder: string;
  required: boolean;
  helpText: string | null;
}

export interface CreateAppConnectorPayload {
  name: string;
  connectorType: number;
  credentials: Record<string, string>;
}

// ConnectorType helpers
const CONNECTOR_TYPE_MAP: Record<number, string> = {
  0: 'Shopify', 1: 'Stripe', 2: 'WooCommerce', 3: 'QuickBooks Online',
  4: 'HubSpot', 5: 'Salesforce', 6: 'Google Analytics', 7: 'Notion',
  8: 'Airtable', 9: 'Google Sheets'
};
export function getConnectorTypeName(type: number): string {
  return CONNECTOR_TYPE_MAP[type] || 'Unknown';
}

// Usage types
export interface UsageStats {
  queriesUsedThisMonth: number;
  queryLimitPerMonth: number;
  percentageUsed: number;
  daysUntilReset: number;
  billingCycleStart: string;
  billingCycleEnd: string;
}

// Subscription types
export interface SubscriptionPlan {
  tier: number;
  name: string;
  price: number;
  description: string;
  queriesPerMonth: number;
  databaseConnections: number;
  supportLevel: string;
  features: string[];
  isCurrent: boolean;
  isPopular: boolean;
}

export interface SubscriptionResponse {
  currentTier: number;
  tierName: string;
  queriesPerMonth: number;
  queriesUsed: number;
  billingCycleReset: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
}

export interface UsageLogEntry {
  id: string;
  databaseConnectionName: string;
  queryType: string;
  executionTimeMs: number;
  globalCustomInstructions: string | null;
  createdAt: string;
}

// File types - can be string or number from API
export type FileType = 'Excel' | 'Word' | 'Csv' | 'Xml' | 'Json' | 'Text' | 0 | 1 | 2 | 3 | 4 | 5;
export type FileProcessingStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed' | 0 | 1 | 2 | 3;

// FileType helpers
const FILE_TYPE_MAP: Record<number, string> = { 0: 'Excel', 1: 'Word', 2: 'Csv', 3: 'Xml', 4: 'Json', 5: 'Text' };
export function getFileTypeName(type: FileType): string {
  if (typeof type === 'number') return FILE_TYPE_MAP[type] || 'Unknown';
  return type;
}
export function isExcelFile(type: FileType): boolean { return type === 'Excel' || type === 0; }
export function isWordFile(type: FileType): boolean { return type === 'Word' || type === 1; }
export function isCsvFile(type: FileType): boolean { return type === 'Csv' || type === 2; }

// FileProcessingStatus helpers
const STATUS_MAP: Record<number, string> = { 0: 'Pending', 1: 'Processing', 2: 'Completed', 3: 'Failed' };
export function getStatusName(status: FileProcessingStatus): string {
  if (typeof status === 'number') return STATUS_MAP[status] || 'Unknown';
  return status;
}
export function isCompleted(status: FileProcessingStatus): boolean { return status === 'Completed' || status === 2; }
export function isFailed(status: FileProcessingStatus): boolean { return status === 'Failed' || status === 3; }
export function isPending(status: FileProcessingStatus): boolean { return status === 'Pending' || status === 0; }
export function isProcessing(status: FileProcessingStatus): boolean { return status === 'Processing' || status === 1; }

export interface FileDocument {
  id: string;
  fileName: string;
  originalFileName: string;
  fileType: FileType;
  fileSizeBytes: number;
  rowCount: number | null;
  status: FileProcessingStatus;
  errorMessage: string | null;
  columns: string[] | null;
  globalCustomInstructions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  file: FileDocument | null;
}

export interface FileListResponse {
  files: FileDocument[];
  totalCount: number;
}

export interface FileSchemaResponse {
  fileId: string;
  fileName: string;
  fileType: FileType;
  columns: ColumnInfo[];
  totalRows: number;
  sampleData: string | null;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  maxLength: number | null;
}

export interface FileContentResponse {
  fileId: string;
  fileName: string;
  fileType: FileType;
  columns: string[];
  data: Record<string, unknown>[];
  totalRows: number;
  pageSize: number;
  currentPage: number;
}

// Data Exploration types
export interface PreviewResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  tableName?: string;
  executionTimeMs: number;
}

export interface ColumnStats {
  columnName: string;
  dataType: string;
  totalCount: number;
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  minValue: unknown;
  maxValue: unknown;
  avgValue: number | null;
  sampleValues: unknown[];
}

export interface SuggestedQuery {
  title: string;
  description: string;
  query: string;
  category: string;
}

export interface DataInsight {
  type: string;
  title: string;
  description: string;
  query?: string;
  severity: 'info' | 'warning' | 'important';
  metadata: Record<string, unknown>;
}

// AI-Powered Visualization types
export interface AnalyzeVisualizationRequest {
  columns: string[];
  sampleRows: Record<string, unknown>[];
  totalRowCount: number;
  sqlQuery?: string;
  userQuestion?: string;
}

export interface ValueColumnRecommendation {
  column: string;
  aggregation: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'NONE';
  reason: string;
  displayName: string;
  formatHint: 'number' | 'currency' | 'percentage' | 'decimal';
}

export interface AlternativeVisualization {
  chartType: string;
  groupByColumn: string | null;
  description: string;
  valueColumns: string[];
}

export interface VisualizationDataInsight {
  type: 'distribution' | 'trend' | 'outlier' | 'correlation' | 'cardinality' | 'quality';
  description: string;
  importance: 'low' | 'medium' | 'high';
  relatedColumns: string[];
}

export interface ColumnMetadata {
  name: string;
  semanticType: 'id' | 'name' | 'category' | 'date' | 'datetime' | 'currency' | 'percentage' | 'count' | 'measure' | 'dimension' | 'text';
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'datetime';
  uniqueCount: number;
  nullCount: number;
  isCategorical: boolean;
  isNumeric: boolean;
  sampleValues: string[];
}

export interface VisualizationRecommendation {
  recommendedChartType: 'bar' | 'line' | 'pie' | 'area' | 'table';
  chartTypeReason: string;
  groupByColumn: string | null;
  valueColumns: ValueColumnRecommendation[];
  alternatives: AlternativeVisualization[];
  insights: VisualizationDataInsight[];
  columnMetadata: ColumnMetadata[];
  shouldAggregate: boolean;
  suggestedTitle: string | null;
}

// Legacy alias — use AppConnector instead
export type AppConnectorDto = AppConnector;
export type CreateConnectorPayload = CreateAppConnectorPayload;

class ApiClient {
  private baseUrl: string;
  private refreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    skipAuthRefresh = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add auth token if available (skip for auth endpoints)
    if (typeof window !== 'undefined' && !skipAuthRefresh) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 - try to refresh token (skip for auth endpoints)
    if (response.status === 401 && !skipAuthRefresh) {
      // Deduplicate concurrent refresh calls
      if (!this.refreshing) {
        this.refreshing = true;
        this.refreshPromise = this.tryRefreshToken().finally(() => { this.refreshing = false; });
      }

      const refreshed = await this.refreshPromise;
      if (refreshed) {
        // Retry the request with new token
        const newToken = localStorage.getItem('accessToken');
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(url, { ...options, headers });
        const retryData = await retryResponse.json();
        if (!retryResponse.ok) {
          throw new ApiError(retryData.message || 'Something went wrong', retryResponse.status, retryData);
        }
        return retryData;
      } else {
        // Refresh failed, clear tokens
        auth.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new ApiError('Session expired', 401, null);
      }
    }

    // Handle empty responses (204 No Content) for DELETE requests
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return { success: true, message: 'Success', data: null as T };
    }

    // Check if response has content before parsing
    const text = await response.text();
    if (!text) {
      return { success: true, message: 'Success', data: null as T };
    }

    const data = JSON.parse(text);

    if (!response.ok) {
      throw new ApiError(data.message || 'Something went wrong', response.status, data);
    }

    return data;
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          auth.saveTokens(data.data.accessToken, data.data.refreshToken);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  // ========== Auth endpoints ==========
  async register(payload: RegisterPayload): Promise<ApiResponse<RegisterResponse>> {
    return this.request<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, true); // Skip auth refresh for public endpoint
  }

  async verifyEmail(payload: { email: string; otp: string }): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, true); // Skip auth refresh for public endpoint
  }

  async resendEmailVerification(email: string): Promise<ApiResponse<null>> {
    return this.request<null>('/api/auth/resend-email-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, true); // Skip auth refresh for public endpoint
  }

  async login(payload: LoginPayload): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, true); // Skip auth refresh for public endpoint
  }

  async logout(): Promise<ApiResponse<null>> {
    return this.request<null>('/api/auth/logout', {
      method: 'POST',
    });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    return this.request<AuthTokens>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }, true); // Skip auth refresh for public endpoint
  }

  async forgotPassword(email: string): Promise<ApiResponse<null>> {
    return this.request<null>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, true); // Skip auth refresh for public endpoint
  }

  async verifyOtp(email: string, otp: string): Promise<ApiResponse<boolean>> {
    return this.request<boolean>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }, true); // Skip auth refresh for public endpoint
  }

  async resetPassword(email: string, otp: string, newPassword: string): Promise<ApiResponse<null>> {
    return this.request<null>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    }, true); // Skip auth refresh for public endpoint
  }

  async googleLogin(idToken: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }, true); // Skip auth refresh for public endpoint
  }

  async resendOtp(email: string): Promise<ApiResponse<null>> {
    return this.request<null>('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, true); // Skip auth refresh for public endpoint
  }

  // ========== Database endpoints ==========
  async getDatabases(): Promise<ApiResponse<DatabaseConnection[]>> {
    return this.request<DatabaseConnection[]>('/api/databases');
  }

  async getDatabase(id: string): Promise<ApiResponse<DatabaseConnection>> {
    return this.request<DatabaseConnection>(`/api/databases/${id}`);
  }

  async createDatabase(payload: CreateDatabaseConnectionPayload): Promise<ApiResponse<DatabaseConnection>> {
    return this.request<DatabaseConnection>('/api/databases', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateDatabase(id: string, payload: UpdateDatabaseConnectionPayload): Promise<ApiResponse<DatabaseConnection>> {
    return this.request<DatabaseConnection>(`/api/databases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteDatabase(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/databases/${id}`, {
      method: 'DELETE',
    });
  }

  async testDatabase(id: string): Promise<ApiResponse<boolean>> {
    return this.request<boolean>(`/api/databases/${id}/test`, {
      method: 'POST',
    });
  }

  async getDatabaseSchema(id: string): Promise<ApiResponse<SchemaResponse>> {
    return this.request<SchemaResponse>(`/api/databases/${id}/schema`);
  }

  // ========== Conversation endpoints ==========
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    return this.request<Conversation[]>('/api/conversations');
  }

  async getConversation(id: string): Promise<ApiResponse<ConversationDetail>> {
    return this.request<ConversationDetail>(`/api/conversations/${id}`);
  }

  async getOrCreateConversationBySource(
    type: 'database' | 'file' | 'connector',
    sourceId: string
  ): Promise<ApiResponse<ConversationDetail>> {
    return this.request<ConversationDetail>(
      `/api/conversations/by-source?type=${encodeURIComponent(type)}&sourceId=${encodeURIComponent(sourceId)}`
    );
  }

  async createConversation(payload: CreateConversationPayload): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateConversation(id: string, payload: UpdateConversationPayload): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>(`/api/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteConversation(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  // ========== Chat endpoints ==========
  async sendMessage(payload: ChatRequest): Promise<ApiResponse<ChatResponse>> {
    return this.request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ========== Usage endpoints ==========
  async getUsage(): Promise<ApiResponse<UsageStats>> {
    return this.request<UsageStats>('/api/usage');
  }

  async getUsageHistory(skip = 0, take = 50): Promise<ApiResponse<UsageLogEntry[]>> {
    return this.request<UsageLogEntry[]>(`/api/usage/history?skip=${skip}&take=${take}`);
  }

  // ========== Account endpoints ==========
  async getAccount(): Promise<ApiResponse<User>> {
    return this.request<User>('/api/account');
  }

  async updateAccount(payload: { firstName?: string; lastName?: string; globalCustomInstructions?: string }): Promise<ApiResponse<User>> {
    return this.request<User>('/api/account', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteAccount(): Promise<ApiResponse<null>> {
    return this.request<null>('/api/account', {
      method: 'DELETE',
    });
  }

  // ========== Subscription endpoints ==========
  async getSubscriptionPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
    return this.request<SubscriptionPlan[]>('/api/subscriptions/plans');
  }

  async getCurrentSubscription(): Promise<ApiResponse<SubscriptionResponse>> {
    return this.request<SubscriptionResponse>('/api/subscriptions/current');
  }

  async upgradeSubscription(newTier: number, returnUrl: string): Promise<ApiResponse<CheckoutResponse>> {
    return this.request<CheckoutResponse>('/api/subscriptions/upgrade', {
      method: 'POST',
      body: JSON.stringify({ newTier, returnUrl }),
    });
  }

  async downgradeSubscription(): Promise<ApiResponse<SubscriptionResponse>> {
    return this.request<SubscriptionResponse>('/api/subscriptions/downgrade', {
      method: 'POST',
    });
  }

  // ========== File endpoints ==========
  async uploadFile(file: File, onProgress?: (percent: number) => void): Promise<FileUploadResponse> {
    // Client-side validation
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.json', '.tsv', '.docx', '.xml', '.txt'];
    const fileName = file.name.toLowerCase();
    const ext = fileName.substring(fileName.lastIndexOf('.'));

    if (file.size > MAX_FILE_SIZE) {
      throw new ApiError('File too large (max 100MB)', 400, null);
    }
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new ApiError(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`, 400, null);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new ApiError(data.message || 'Failed to upload file', xhr.status, data));
          }
        } catch {
          reject(new ApiError('Invalid server response', xhr.status, null));
        }
      };

      xhr.onerror = () => reject(new ApiError('Network error during upload', 0, null));

      xhr.open('POST', `${this.baseUrl}/api/files/upload`);
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }

  async getFiles(): Promise<ApiResponse<FileListResponse>> {
    return this.request<FileListResponse>('/api/files');
  }

  async getFile(fileId: string): Promise<ApiResponse<FileDocument>> {
    return this.request<FileDocument>(`/api/files/${fileId}`);
  }

  async getFileSchema(fileId: string): Promise<ApiResponse<FileSchemaResponse>> {
    return this.request<FileSchemaResponse>(`/api/files/${fileId}/schema`);
  }

  async getFileContent(fileId: string, page = 1, pageSize = 100): Promise<ApiResponse<FileContentResponse>> {
    return this.request<FileContentResponse>(`/api/files/${fileId}/content?page=${page}&pageSize=${pageSize}`);
  }

  async deleteFile(fileId: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  // ========== Connector endpoints ==========

  async getConnectorMetadata(): Promise<ApiResponse<ConnectorMetadata[]>> {
    return this.request<ConnectorMetadata[]>('/api/connectors/metadata', {}, true);
  }

  async getConnectors(): Promise<ApiResponse<AppConnector[]>> {
    return this.request<AppConnector[]>('/api/connectors');
  }

  async getConnector(id: string): Promise<ApiResponse<AppConnector>> {
    return this.request<AppConnector>(`/api/connectors/${id}`);
  }

  async testConnector(payload: CreateAppConnectorPayload): Promise<ApiResponse<{ success: boolean; message: string; accountName?: string }>> {
    return this.request<{ success: boolean; message: string; accountName?: string }>('/api/connectors/test', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createConnector(payload: CreateAppConnectorPayload): Promise<ApiResponse<AppConnector>> {
    return this.request<AppConnector>('/api/connectors', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async syncConnector(id: string): Promise<ApiResponse<AppConnector>> {
    return this.request<AppConnector>(`/api/connectors/${id}/sync`, {
      method: 'POST',
    });
  }

  async deleteConnector(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/api/connectors/${id}`, {
      method: 'DELETE',
    });
  }

  // ========== Data Exploration endpoints ==========

  async getDatabaseTablePreview(databaseId: string, tableName: string, limit = 50): Promise<ApiResponse<PreviewResult>> {
    return this.request<PreviewResult>(`/api/data-exploration/databases/${databaseId}/preview?table=${encodeURIComponent(tableName)}&limit=${limit}`);
  }

  async getDatabaseColumnStats(databaseId: string, tableName: string, columnName: string): Promise<ApiResponse<ColumnStats>> {
    return this.request<ColumnStats>(`/api/data-exploration/databases/${databaseId}/column-stats?table=${encodeURIComponent(tableName)}&column=${encodeURIComponent(columnName)}`);
  }

  async getFilePreview(fileId: string, limit = 50): Promise<ApiResponse<PreviewResult>> {
    return this.request<PreviewResult>(`/api/data-exploration/files/${fileId}/preview?limit=${limit}`);
  }

  async getFileColumnStats(fileId: string, columnName: string): Promise<ApiResponse<ColumnStats>> {
    return this.request<ColumnStats>(`/api/data-exploration/files/${fileId}/column-stats?column=${encodeURIComponent(columnName)}`);
  }

  async getDatabaseSuggestions(databaseId: string, tableName?: string): Promise<ApiResponse<SuggestedQuery[]>> {
    const params = tableName ? `?table=${encodeURIComponent(tableName)}` : '';
    return this.request<SuggestedQuery[]>(`/api/data-exploration/databases/${databaseId}/suggestions${params}`);
  }

  async getFileSuggestions(fileId: string): Promise<ApiResponse<SuggestedQuery[]>> {
    return this.request<SuggestedQuery[]>(`/api/data-exploration/files/${fileId}/suggestions`);
  }

  async getDatabaseInsights(databaseId: string, tableName: string): Promise<ApiResponse<DataInsight[]>> {
    return this.request<DataInsight[]>(`/api/data-exploration/databases/${databaseId}/insights`, {
      method: 'POST',
      body: JSON.stringify({ tableName }),
    });
  }

  async getFileInsights(fileId: string): Promise<ApiResponse<DataInsight[]>> {
    return this.request<DataInsight[]>(`/api/data-exploration/files/${fileId}/insights`, {
      method: 'POST',
    });
  }

  // ========== AI-Powered Visualization ==========

  async analyzeVisualization(request: AnalyzeVisualizationRequest): Promise<ApiResponse<VisualizationRecommendation>> {
    return this.request<VisualizationRecommendation>('/api/data-exploration/analyze-visualization', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const api = new ApiClient(API_BASE_URL);

// Auth helpers
export const auth = {
  saveTokens(accessToken: string, refreshToken: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      // Set a lightweight cookie for Next.js middleware route protection
      document.cookie = "logged_in=true; path=/; max-age=2592000; SameSite=Lax";
    }
  },

  clearTokens() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      // Clear the route protection cookie
      document.cookie = "logged_in=; path=/; max-age=0; SameSite=Lax";
    }
  },

  saveUser(user: User) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  getUser(): User | null {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  isAuthenticated(): boolean {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('accessToken');
    }
    return false;
  },
};

export type { AuthResponse, RegisterPayload, LoginPayload };

// ========== SignalR Chat Connection ==========

export interface StreamChunk {
  conversationId: string;
  chunk: string;
  index: number;
}

export interface StreamCompleted {
  conversationId: string;
  assistantMessage: Message;
  queryResult: string | null;
  tokensUsed: number;
}

export interface StreamError {
  conversationId: string;
  error: string;
}

export interface UserMessageSaved {
  messageId: string;
  content: string;
  globalCustomInstructions: string | null;
  createdAt: string;
}

class ChatHubConnection {
  private connection: signalR.HubConnection | null = null;
  private isConnecting = false;

  async getConnection(): Promise<signalR.HubConnection> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return this.connection;
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isConnecting) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      // Re-check connection state after waiting - use fresh variable to avoid TS narrowing issues
      const conn = this.connection;
      if (conn && conn.state === signalR.HubConnectionState.Connected) {
        return conn;
      }
    }

    this.isConnecting = true;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}/hubs/chat`, {
          accessTokenFactory: () => token || '',
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Debug)
        .build();

      this.connection.onclose((error) => {
        devLog('[SignalR] Connection closed', error);
      });

      this.connection.onreconnecting((error) => {
        devLog('[SignalR] Reconnecting', error);
      });

      this.connection.onreconnected((connectionId) => {
        devLog('[SignalR] Reconnected', connectionId);
      });

      await this.connection.start();
      devLog('[SignalR] Connected, state:', this.connection.state);

      return this.connection;
    } finally {
      this.isConnecting = false;
    }
  }

  async joinConversation(conversationId: string): Promise<void> {
    const connection = await this.getConnection();
    await connection.invoke('JoinConversation', conversationId);
  }

  async leaveConversation(conversationId: string): Promise<void> {
    const connection = await this.getConnection();
    await connection.invoke('LeaveConversation', conversationId);
  }

  async sendMessageStreaming(
    conversationId: string,
    message: string,
    executeQuery = true,
    handlers: {
      onStreamStarted?: () => void;
      onUserMessageSaved?: (data: UserMessageSaved) => void;
      onChunk?: (chunk: string, index: number) => void;
      onQueryExecuting?: () => void;
      onCompleted?: (data: StreamCompleted) => void;
      onError?: (error: string) => void;
    }
  ): Promise<void> {
    const connection = await this.getConnection();

    // Set up handlers with logging
    const streamStartedHandler = (data: { conversationId: string }) => {
      devLog('[SignalR] StreamStarted received:', data);
      devLog('[SignalR] Expected conversationId:', conversationId);
      devLog('[SignalR] Match:', data.conversationId === conversationId);
      if (data.conversationId === conversationId) {
        handlers.onStreamStarted?.();
      }
    };
    const userMessageSavedHandler = (data: UserMessageSaved) => {
      devLog('[SignalR] UserMessageSaved', data);
      handlers.onUserMessageSaved?.(data);
    };
    const chunkHandler = (data: StreamChunk) => {
      if (data.conversationId === conversationId) {
        handlers.onChunk?.(data.chunk, data.index);
      }
    };
    const queryExecutingHandler = (data: { conversationId: string }) => {
      devLog('[SignalR] QueryExecuting', data);
      if (data.conversationId === conversationId) {
        handlers.onQueryExecuting?.();
      }
    };
    const completedHandler = (data: StreamCompleted) => {
      devLog('[SignalR] StreamCompleted received:', data);
      devLog('[SignalR] Expected conversationId:', conversationId);
      devLog('[SignalR] Match:', data.conversationId === conversationId);
      if (data.conversationId === conversationId) {
        devLog('[SignalR] Calling onCompleted handler');
        handlers.onCompleted?.(data);
        cleanup();
      }
    };
    const errorHandler = (data: StreamError) => {
      devLog('[SignalR] StreamError', data);
      if (data.conversationId === conversationId) {
        handlers.onError?.(data.error);
        cleanup();
      }
    };
    const generalErrorHandler = (error: string) => {
      devLog('[SignalR] Error', error);
      handlers.onError?.(error);
      cleanup();
    };

    // Track if we've received any events
    let receivedAnyEvent = false;
    let timeoutId: NodeJS.Timeout | null = null;
    let isCompleted = false;

    // Wrap handlers to track event receipt
    const wrappedStreamStartedHandler = (data: { conversationId: string }) => {
      receivedAnyEvent = true;
      streamStartedHandler(data);
    };
    const wrappedUserMessageSavedHandler = (data: UserMessageSaved) => {
      receivedAnyEvent = true;
      userMessageSavedHandler(data);
    };
    const wrappedChunkHandler = (data: StreamChunk) => {
      receivedAnyEvent = true;
      chunkHandler(data);
    };
    const wrappedQueryExecutingHandler = (data: { conversationId: string }) => {
      receivedAnyEvent = true;
      queryExecutingHandler(data);
    };
    const wrappedCompletedHandler = (data: StreamCompleted) => {
      isCompleted = true;
      completedHandler(data);
    };

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      connection.off('StreamStarted', wrappedStreamStartedHandler);
      connection.off('UserMessageSaved', wrappedUserMessageSavedHandler);
      connection.off('StreamChunk', wrappedChunkHandler);
      connection.off('QueryExecuting', wrappedQueryExecutingHandler);
      connection.off('StreamCompleted', wrappedCompletedHandler);
      connection.off('StreamError', errorHandler);
      connection.off('Error', generalErrorHandler);
    };

    // Register handlers
    connection.on('StreamStarted', wrappedStreamStartedHandler);
    connection.on('UserMessageSaved', wrappedUserMessageSavedHandler);
    connection.on('StreamChunk', wrappedChunkHandler);
    connection.on('QueryExecuting', wrappedQueryExecutingHandler);
    connection.on('StreamCompleted', wrappedCompletedHandler);
    connection.on('StreamError', errorHandler);
    connection.on('Error', generalErrorHandler);

    // Set a timeout to detect if no events are received (connection issue)
    timeoutId = setTimeout(() => {
      if (!receivedAnyEvent && !isCompleted) {
        devError('[SignalR] Timeout - no events received after 30s');
        handlers.onError?.('Connection timeout. Please try again.');
        cleanup();
      }
    }, 30000);

    // Send the message
    devLog('[SignalR] Invoking SendMessageStreaming for conversation:', conversationId);
    devLog('[SignalR] Connection state:', connection.state);
    try {
      await connection.invoke('SendMessageStreaming', {
        conversationId,
        message,
        executeQuery,
      });
      devLog('[SignalR] SendMessageStreaming invoke completed');
    } catch (error) {
      devError('[SignalR] SendMessageStreaming invoke failed:', error);
      cleanup();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }
}

export const chatHub = new ChatHubConnection();
