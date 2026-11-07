import { nhost } from './nhostClient';
import type { Shop, Order, Profile } from '../types/database';

/**
 * GraphQL helpers for Printo Customer Portal interacting with Nhost / Hasura
 */

export async function fetchShops(): Promise<Shop[]> {
  const query = `
    query GetShops {
      shops(where: { is_active: { _eq: true } }, order_by: { shop_name: asc }) {
        id
        shop_name
        description
        phone
        email
        address
        city
        pincode
        latitude
        longitude
        logo_url
        is_active
        operating_hours {
          day_of_week
          opening_time
          closing_time
          is_closed
        }
        services {
          id
          service_name
          description
          is_available
        }
        pricing {
          id
          service_type
          paper_size
          color_mode
          sides
          price_per_page
        }
      }
    }
  `;

  try {
    const res = await nhost.graphql.request<{ shops: Shop[] }>({ query });
    if (res.body?.errors?.length) {
      console.error('Failed to fetch shops:', res.body.errors);
      return [];
    }
    return res.body?.data?.shops || [];
  } catch (err) {
    console.error('Network error fetching shops:', err);
    return [];
  }
}

export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  const query = `
    query GetProfile($id: uuid!) {
      profiles_by_pk(id: $id) {
        id
        full_name
        email
        phone
        role
        avatar_url
        created_at
      }
    }
  `;

  try {
    const res = await nhost.graphql.request<{ profiles_by_pk: Profile }>({
      query,
      variables: { id: userId },
    });
    if (res.body?.errors?.length) {
      console.error('Failed to fetch user profile:', res.body.errors);
      return null;
    }
    return res.body?.data?.profiles_by_pk || null;
  } catch (err) {
    console.error('Network error fetching user profile:', err);
    return null;
  }
}

export async function fetchCustomerOrders(customerId: string): Promise<Order[]> {
  const query = `
    query GetCustomerOrders($customerId: uuid!) {
      orders(where: { customer_id: { _eq: $customerId } }, order_by: { created_at: desc }) {
        id
        order_number
        status
        total_pages
        total_copies
        total_amount
        created_at
        shop {
          shop_name
          phone
          address
        }
        order_documents {
          id
          copies
          color_mode
          paper_size
          sides
          price
          document {
            file_name
          }
        }
      }
    }
  `;

  try {
    const res = await nhost.graphql.request<{ orders: Order[] }>({
      query,
      variables: { customerId },
    });
    if (res.body?.errors?.length) {
      console.error('Failed to fetch customer orders:', res.body.errors);
      return [];
    }
    return res.body?.data?.orders || [];
  } catch (err) {
    console.error('Network error fetching customer orders:', err);
    return [];
  }
}

export async function createPrintOrder(variables: {
  orderNumber: string;
  customerId: string;
  shopId: string;
  totalPages: number;
  totalCopies: number;
  subtotal: number;
  totalAmount: number;
  customerNotes?: string;
}): Promise<Order | null> {
  const query = `
    mutation CreateOrder(
      $orderNumber: String!
      $customerId: uuid!
      $shopId: uuid!
      $totalPages: Int!
      $totalCopies: Int!
      $subtotal: numeric!
      $totalAmount: numeric!
      $customerNotes: String
    ) {
      insert_orders_one(object: {
        order_number: $orderNumber
        customer_id: $customerId
        shop_id: $shopId
        total_pages: $totalPages
        total_copies: $totalCopies
        subtotal: $subtotal
        total_amount: $totalAmount
        customer_notes: $customerNotes
      }) {
        id
        order_number
        status
        total_amount
        created_at
      }
    }
  `;

  try {
    const res = await nhost.graphql.request<{ insert_orders_one: Order }>({
      query,
      variables,
    });
    if (res.body?.errors?.length) {
      console.error('Failed to create order:', res.body.errors);
      return null;
    }
    return res.body?.data?.insert_orders_one || null;
  } catch (err) {
    console.error('Network error creating order:', err);
    return null;
  }
}
