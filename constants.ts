
import { CapturedResponseItem } from './types';

export const APP_TITLE = "Webhook";
export const APP_SUBTITLE = "Incoming Webhook";
export const CALLBACK_URL_PATH = "/api/webhook"; // Actual path on your backend
export const DEFAULT_BACKEND_URL = "http://localhost:3001"; // Default backend URL

export const DEFAULT_WEBHOOK_NAME = "Untitled Webhook";

export enum TestEventType {
  ORDER_CREATED = "Order Created",
  PRODUCT_UPDATED = "Product Updated",
  ORDER_CANCELLED = "Order Cancelled",
}

export const SAMPLE_SHOPIFY_ORDER_PAYLOAD = {
  event_type: TestEventType.ORDER_CREATED,
  id: 6011185955070,
  admin_graphql_api_id: "gid://shopify/Order/6011185955070",
  app_id: 580111,
  browser_ip: "154.80.33.250",
  buyer_accepts_marketing: false,
  cancel_reason: null,
  cancelled_at: null,
  cart_token: "zZNwLLW1cm9wZS13ZXN8MTowMjUpUTc0NUVCSFNLWVFROSEpXRjVTNFZONG",
  checkout_id: 36255044632830,
  checkout_token: "eh24crr974886d1a7f5549b0f199f86f8",
  client_details: {
    accept_language: "en-US,en;q=0.9",
    browser_height: 789,
    browser_ip: "154.80.33.250",
    browser_width: 1440,
    session_hash: "sdjHq783KLDHsdf87AYS8f7haskj",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36"
  },
  closed_at: null,
  confirmation_number: "JFVBNM87U",
  contact_email: "customer@example.com",
  created_at: "2024-07-28T10:30:00-04:00",
  currency: "USD",
  current_total_duties_set: null,
  current_total_price: "199.99",
  line_items: [
    {
      id: 1234567890123,
      title: "Awesome T-Shirt",
      quantity: 1,
      sku: "TSHIRT-BLK-L",
      price: "25.00",
      vendor: "MyBrand",
    }
  ],
  name: "#1001",
  order_number: 1001,
  processed_at: "2024-07-28T10:30:00-04:00",
  shipping_address: {
    first_name: "John",
    last_name: "Doe",
    address1: "123 Shopify Street",
    city: "Ottawa",
    province_code: "ON",
    zip: "K1N 5T5",
    country_code: "CA",
  },
  status_url: "https://your-shop.myshopify.com/123456789/orders/abcdef1234567890/authenticate?key=0987654321fedcba",
  tags: "new-customer, vip",
  total_price: "199.99",
  updated_at: "2024-07-28T10:30:00-04:00",
  user_id: null,
};

export const SAMPLE_SHOPIFY_PRODUCT_UPDATED_PAYLOAD = {
  event_type: TestEventType.PRODUCT_UPDATED,
  id: 801230450789,
  admin_graphql_api_id: "gid://shopify/Product/801230450789",
  title: "Updated Luxury Snowboard",
  vendor: "SnowBeast Inc.",
  product_type: "Snowboard",
  created_at: "2024-07-01T10:00:00-04:00",
  updated_at: "2024-07-29T11:00:00-04:00",
  published_at: "2024-07-01T10:00:00-04:00",
  status: "active",
  tags: "snowboard, winter, pro-series",
  variants: [
    {
      id: 987654321098,
      product_id: 801230450789,
      title: "155cm",
      price: "599.99",
      sku: "SB-LUX-155",
      inventory_quantity: 15,
      old_inventory_quantity: 20,
    },
    {
      id: 987654321099,
      product_id: 801230450789,
      title: "160cm",
      price: "609.99",
      sku: "SB-LUX-160",
      inventory_quantity: 10,
      old_inventory_quantity: 10,
    }
  ],
  images: [
    {
      id: 1001,
      src: "https://example.com/images/snowboard_updated.jpg"
    }
  ]
};

export const SAMPLE_SHOPIFY_ORDER_CANCELLED_PAYLOAD = {
  event_type: TestEventType.ORDER_CANCELLED,
  id: 6011185955070, // Assuming it's the same order as created
  admin_graphql_api_id: "gid://shopify/Order/6011185955070",
  app_id: 580111,
  cancel_reason: "customer", // "customer", "inventory", "fraud", "other"
  cancelled_at: "2024-07-29T12:00:00-04:00",
  currency: "USD",
  email: "customer@example.com",
  financial_status: "refunded", // or "voided" if not captured
  name: "#1001",
  order_number: 1001,
  phone: null,
  total_price: "199.99",
  user_id: null, // if cancelled by staff, this might be populated
  note: "Customer requested cancellation.",
};


export const TEST_EVENT_PAYLOADS: Record<TestEventType, any> = {
  [TestEventType.ORDER_CREATED]: SAMPLE_SHOPIFY_ORDER_PAYLOAD,
  [TestEventType.PRODUCT_UPDATED]: SAMPLE_SHOPIFY_PRODUCT_UPDATED_PAYLOAD,
  [TestEventType.ORDER_CANCELLED]: SAMPLE_SHOPIFY_ORDER_CANCELLED_PAYLOAD,
};


export const DEFAULT_INSTANT_RESPONSE = {
  root: {
    code: "SUCCESS",
    data: "Accepted",
    status: "success"
  }
};

// These are not used for real-time WebSocket listening anymore but kept for local test run logic.
// export const LISTENER_DURATION_MS = 3 * 60 * 1000; 
// export const SIMULATION_INTERVAL_MS = 5000; 
