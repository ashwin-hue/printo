import { nhost } from './nhostClient';
import type { Shop, Order, OrderStatus } from '../types/database';

/**
 * GraphQL helpers for Printo Shop Portal interacting with Nhost / Hasura
 */

export async function fetchShopByOwner(ownerId: string): Promise<Shop | null> {
  const query = `
    query GetShopByOwner($ownerId: uuid!) {
      shops(where: { owner_id: { _eq: $ownerId } }, limit: 1) {
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
        created_at
        operating_hours {
          id
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
    const res = await nhost.graphql.request<{ shops: Shop[] }>({
      query,
      variables: { ownerId },
    });
    if (res.body?.errors?.length) {
      console.error('Failed to fetch shop:', res.body.errors);
      return null;
    }
    return res.body?.data?.shops?.[0] || null;
  } catch (err) {
    console.error('Network error fetching shop:', err);
    return null;
  }
}

export async function upsertShopOwnerProfile(params: {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
}): Promise<boolean> {
  const query = `
    mutation UpsertProfile($id: uuid!, $email: String!, $fullName: String, $phone: String) {
      insert_profiles_one(
        object: {
          id: $id
          email: $email
          full_name: $fullName
          phone: $phone
          role: shop_owner
        }
        on_conflict: {
          constraint: profiles_pkey
          update_columns: [full_name, phone, role]
        }
      ) {
        id
      }
    }
  `;

  try {
    const res = await nhost.graphql.request({
      query,
      variables: params,
    });
    if (res.body?.errors?.length) {
      console.error('Failed to upsert profile:', res.body.errors);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Network error upserting profile:', err);
    return false;
  }
}

export async function registerNewShop(params: {
  ownerId: string;
  shopName: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  openingTime?: string;
  closingTime?: string;
  services?: string[];
  pricing?: {
    bwSingle: number;
    bwDouble: number;
    colorSingle: number;
  };
}): Promise<Shop | null> {
  const insertShopQuery = `
    mutation CreateShop(
      $ownerId: uuid!
      $shopName: String!
      $description: String
      $phone: String
      $email: String
      $address: String
      $city: String
      $pincode: String
    ) {
      insert_shops_one(object: {
        owner_id: $ownerId
        shop_name: $shopName
        description: $description
        phone: $phone
        email: $email
        address: $address
        city: $city
        pincode: $pincode
        is_active: true
      }) {
        id
        shop_name
        description
        phone
        email
        address
        city
        pincode
        is_active
        created_at
      }
    }
  `;

  try {
    const res = await nhost.graphql.request<{ insert_shops_one: Shop }>({
      query: insertShopQuery,
      variables: {
        ownerId: params.ownerId,
        shopName: params.shopName,
        description: params.description || '',
        phone: params.phone || '',
        email: params.email || '',
        address: params.address || '',
        city: params.city || 'Bangalore',
        pincode: params.pincode || '',
      },
    });

    if (res.body?.errors?.length) {
      console.error('Failed to create shop:', res.body.errors);
      return null;
    }

    const shop = res.body?.data?.insert_shops_one;
    if (!shop?.id) return null;

    // Insert Default Operating Hours (Monday through Saturday)
    const openTime = params.openingTime ? `${params.openingTime}:00` : '08:00:00';
    const closeTime = params.closingTime ? `${params.closingTime}:00` : '21:00:00';
    const hoursObjects = [1, 2, 3, 4, 5, 6].map((day) => ({
      shop_id: shop.id,
      day_of_week: day,
      opening_time: openTime,
      closing_time: closeTime,
      is_closed: false,
    }));
    hoursObjects.push({
      shop_id: shop.id,
      day_of_week: 0,
      opening_time: '10:00:00',
      closing_time: '18:00:00',
      is_closed: true,
    });

    const hoursQuery = `
      mutation InsertHours($objects: [shop_operating_hours_insert_input!]!) {
        insert_shop_operating_hours(objects: $objects) {
          affected_rows
        }
      }
    `;
    await nhost.graphql.request({ query: hoursQuery, variables: { objects: hoursObjects } });

    // Insert Services
    const selectedServices = params.services?.length
      ? params.services
      : ['Laser Printing', 'Spiral Binding', 'Soft Binding', 'Color Posters'];
    const serviceObjects = selectedServices.map((name) => ({
      shop_id: shop.id,
      service_name: name,
      description: `Official campus ${name.toLowerCase()} service`,
      is_available: true,
    }));

    const servicesQuery = `
      mutation InsertServices($objects: [shop_services_insert_input!]!) {
        insert_shop_services(objects: $objects) {
          affected_rows
        }
      }
    `;
    await nhost.graphql.request({ query: servicesQuery, variables: { objects: serviceObjects } });

    // Insert Pricing
    const bwSingle = params.pricing?.bwSingle || 2.0;
    const bwDouble = params.pricing?.bwDouble || 3.0;
    const colorSingle = params.pricing?.colorSingle || 10.0;

    const pricingObjects = [
      {
        shop_id: shop.id,
        service_type: 'Printing',
        paper_size: 'A4',
        color_mode: 'B&W',
        sides: 'Single',
        price_per_page: bwSingle,
      },
      {
        shop_id: shop.id,
        service_type: 'Printing',
        paper_size: 'A4',
        color_mode: 'B&W',
        sides: 'Double',
        price_per_page: bwDouble,
      },
      {
        shop_id: shop.id,
        service_type: 'Printing',
        paper_size: 'A4',
        color_mode: 'Color',
        sides: 'Single',
        price_per_page: colorSingle,
      },
    ];

    const pricingQuery = `
      mutation InsertPricing($objects: [shop_pricing_insert_input!]!) {
        insert_shop_pricing(objects: $objects) {
          affected_rows
        }
      }
    `;
    await nhost.graphql.request({ query: pricingQuery, variables: { objects: pricingObjects } });

    return shop;
  } catch (err) {
    console.error('Error in registerNewShop:', err);
    return null;
  }
}

export async function toggleShopStatus(shopId: string, isActive: boolean): Promise<boolean> {
  const query = `
    mutation ToggleShop($shopId: uuid!, $isActive: Boolean!) {
      update_shops_by_pk(pk_columns: { id: $shopId }, _set: { is_active: $isActive }) {
        id
        is_active
      }
    }
  `;

  try {
    const res = await nhost.graphql.request({
      query,
      variables: { shopId, isActive },
    });
    return !res.body?.errors?.length;
  } catch (err) {
    console.error('Failed to toggle shop status:', err);
    return false;
  }
}

export async function fetchShopOrders(shopId: string): Promise<Order[]> {
  const query = `
    query GetShopOrders($shopId: uuid!) {
      orders(where: { shop_id: { _eq: $shopId } }, order_by: { created_at: desc }) {
        id
        order_number
        status
        total_pages
        total_copies
        total_amount
        customer_notes
        created_at
        customer {
          id
          full_name
          email
          phone
        }
        order_documents {
          id
          copies
          page_range
          color_mode
          paper_size
          sides
          orientation
          binding_type
          price
          document {
            id
            file_name
            storage_path
            page_count
          }
        }
      }
    }
  `;

  try {
    const res = await nhost.graphql.request<{ orders: Order[] }>({
      query,
      variables: { shopId },
    });
    if (res.body?.errors?.length) {
      console.error('Failed to fetch shop orders:', res.body.errors);
      return [];
    }
    return res.body?.data?.orders || [];
  } catch (err) {
    console.error('Network error fetching shop orders:', err);
    return [];
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
  const query = `
    mutation UpdateOrderStatus($orderId: uuid!, $status: order_status!) {
      update_orders_by_pk(
        pk_columns: { id: $orderId }
        _set: { status: $status }
      ) {
        id
        status
        updated_at
      }
    }
  `;

  try {
    const res = await nhost.graphql.request({
      query,
      variables: { orderId, status },
    });
    if (res.body?.errors?.length) {
      console.error('Failed to update order status:', res.body.errors);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Network error updating order status:', err);
    return false;
  }
}
