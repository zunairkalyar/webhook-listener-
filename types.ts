
export interface Webhook {
  id: string;
  name: string;
  // In a real app, this might include event type, Shopify topic, etc.
}

export interface CapturedResponseItem {
  id: string;
  timestamp: string;
  data: any; // The actual webhook payload
}

export enum InstantResponseType {
  DEFAULT = "Default Response",
  CUSTOM = "Custom Response",
  DISABLE = "Disable",
}
