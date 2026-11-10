import { nhost } from './nhostClient';
import type { Shop, Order, OrderStatus, BucketFile } from '../types/database';

/**
 * Converts a shop name into a valid Nhost Storage bucket slug
 * e.g. "Metro Graphics & Xerox" -> "metro-graphics-xerox"
 */
export function slugifyBucketName(shopName: string, fallbackId?: string): string {
  const base = shopName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  if (base.length >= 3) return base;
  return `shop-${(fallbackId || Date.now().toString()).slice(0, 8)}`;
}

/**
 * Ensures an Nhost Storage bucket exists for the shop name.
 * Also persists bucket_id on public.shops if not yet set.
 */
export async function ensureShopBucket(shop: Shop): Promise<string | null> {
  const bucketId = shop.bucket_id || slugifyBucketName(shop.shop_name, shop.id);

  try {
    // 1. Create or ensure bucket in storage.buckets
    const createBucketMutation = `
      mutation EnsureBucket($id: String!) {
        insertBucket(
          object: {
            id: $id
            downloadExpiration: 3600
            minUploadFileSize: 1
            maxUploadFileSize: 52428800
            presignedUrlsEnabled: true
            cacheControl: "max-age=3600"
          }
          on_conflict: {
            constraint: buckets_pkey
            update_columns: [downloadExpiration, presignedUrlsEnabled]
          }
        ) {
          id
          presignedUrlsEnabled
        }
      }
    `;

    const res = await nhost.graphql.request<{ insertBucket: { id: string } }>({
      query: createBucketMutation,
      variables: { id: bucketId },
    });

    if (res.body?.errors?.length) {
      console.warn('Bucket creation note:', res.body.errors[0]?.message);
    }

    // 2. Persist bucket_id onto public.shops if missing
    if (!shop.bucket_id) {
      const updateShopMutation = `
        mutation SetShopBucket($shopId: uuid!, $bucketId: String!) {
          update_shops_by_pk(pk_columns: { id: $shopId }, _set: { bucket_id: $bucketId }) {
            id
            bucket_id
          }
        }
      `;
      await nhost.graphql.request({
        query: updateShopMutation,
        variables: { shopId: shop.id, bucketId },
      });
    }

    return bucketId;
  } catch (err) {
    console.error('Failed to ensure shop bucket:', err);
    return bucketId;
  }
}

/**
 * Fetch all files stored inside a shop's dedicated Nhost Storage bucket.
 */
export async function fetchShopBucketFiles(bucketId: string): Promise<BucketFile[]> {
  if (!bucketId) return [];

  const query = `
    query GetShopBucketFiles($bucketId: String!) {
      files(where: { bucketId: { _eq: $bucketId } }, order_by: { createdAt: desc }) {
        id
        bucketId
        name
        size
        mimeType
        createdAt
        uploadedByUserId
        metadata
      }
    }
  `;

  try {
    const res = await nhost.graphql.request<{ files: BucketFile[] }>({
      query,
      variables: { bucketId },
    });
    if (res.body?.errors?.length) {
      console.error('Failed to fetch bucket files:', res.body.errors);
      return [];
    }
    return res.body?.data?.files || [];
  } catch (err) {
    console.error('Network error fetching bucket files:', err);
    return [];
  }
}

/**
 * Generate a presigned URL to preview/download/print a customer file from the shop bucket.
 */
export async function getBucketFileUrl(fileId: string): Promise<string | null> {
  try {
    const res = await nhost.storage.getFilePresignedURL(fileId);
    return res.body?.url || null;
  } catch (err) {
    console.error('Failed to get presigned URL:', err);
    return null;
  }
}

export async function fetchShopByOwner(ownerId: string): Promise<Shop | null> {
  const query = `
    query GetShopByOwner($ownerId: uuid!) {
      shops(where: { owner_id: { _eq: $ownerId } }, limit: 1) {
        id
        owner_id
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
        bucket_id
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
    const shop = res.body?.data?.shops?.[0] || null;
    if (shop) {
      // Automatically ensure data bucket exists when logged in
      const ensuredBucket = await ensureShopBucket(shop);
      if (ensuredBucket && !shop.bucket_id) {
        shop.bucket_id = ensuredBucket;
      }
    }
    return shop;
  } catch (err) {
    console.error('Network error fetching shop:', err);
    return null;
  }
}

export async function upsertShopOwnerProfile(params: {
  id: string;
  email?: string;
  fullName?: string;
  phone?: string;
}): Promise<boolean> {
  const query = `
    mutation UpsertProfile($id: uuid!, $email: String, $fullName: String, $phone: String) {
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
      variables: {
        id: params.id,
        email: params.email || null,
        fullName: params.fullName || 'Shop Operator',
        phone: params.phone || null,
      },
    });
    if (res.body?.errors?.length) {
      console.error('Failed to upsert profile:', res.body.errors);
      throw new Error(res.body.errors[0]?.message || 'Failed to sync operator profile.');
    }
    return true;
  } catch (err: any) {
    console.error('Network error upserting profile:', err);
    throw err;
  }
}

export async function registerNewShop(params: {
  ownerId: string;
  ownerName?: string;
  shopName: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  openingTime?: string;
  closingTime?: string;
  services?: string[];
  pricing?: {
    bwSingle: number;
    bwDouble: number;
    colorSingle: number;
  };
}): Promise<Shop | null> {
  const session = nhost.getUserSession();
  if (!session?.accessToken) {
    throw new Error('Authentication session missing. Please sign out and sign in with your account.');
  }

  // 1. Ensure owner profile row exists before inserting shop
  await upsertShopOwnerProfile({
    id: params.ownerId,
    email: params.email || session.user?.email,
    fullName: params.ownerName || session.user?.displayName || params.shopName,
    phone: params.phone,
  });

  // 2. Generate bucket slug from shop name and create bucket in Nhost Storage
  const bucketSlug = slugifyBucketName(params.shopName, params.ownerId);
  try {
    await nhost.graphql.request({
      query: `
        mutation EnsureBucket($id: String!) {
          insertBucket(
            object: {
              id: $id
              downloadExpiration: 3600
              minUploadFileSize: 1
              maxUploadFileSize: 52428800
              presignedUrlsEnabled: true
              cacheControl: "max-age=3600"
            }
            on_conflict: {
              constraint: buckets_pkey
              update_columns: [downloadExpiration, presignedUrlsEnabled]
            }
          ) {
            id
          }
        }
      `,
      variables: { id: bucketSlug },
    });
  } catch (bucketErr) {
    console.warn('Bucket pre-creation warning:', bucketErr);
  }

  // 3. Insert Shop record with bucket_id & coordinates
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
      $latitude: numeric
      $longitude: numeric
      $bucketId: String
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
        latitude: $latitude
        longitude: $longitude
        bucket_id: $bucketId
        is_active: true
      }) {
        id
        owner_id
        shop_name
        description
        phone
        email
        address
        city
        pincode
        latitude
        longitude
        bucket_id
        is_active
        created_at
      }
    }
  `;

  const res = await nhost.graphql.request<{ insert_shops_one: Shop }>({
    query: insertShopQuery,
    variables: {
      ownerId: params.ownerId,
      shopName: params.shopName,
      description: params.description || '',
      phone: params.phone || '',
      email: params.email || session.user?.email || '',
      address: params.address || '',
      city: params.city || 'Bangalore',
      pincode: params.pincode || '',
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      bucketId: bucketSlug,
    },
  });

  if (res.body?.errors?.length) {
    console.error('Failed to create shop:', res.body.errors);
    throw new Error(res.body.errors[0]?.message || 'Database rejected shop creation.');
  }

  const shop = res.body?.data?.insert_shops_one;
  if (!shop?.id) {
    throw new Error('Shop was not returned by database.');
  }

  // 4. Populate Hours, Services, Pricing & Printers
  try {
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

    await nhost.graphql.request({
      query: `
        mutation InsertHours($objects: [shop_operating_hours_insert_input!]!) {
          insert_shop_operating_hours(objects: $objects) { affected_rows }
        }
      `,
      variables: { objects: hoursObjects },
    });

    const selectedServices = params.services?.length
      ? params.services
      : ['Laser Printing', 'Spiral Binding', 'Soft Binding', 'Color Posters'];
    const serviceObjects = selectedServices.map((name) => ({
      shop_id: shop.id,
      service_name: name,
      description: `Official campus ${name.toLowerCase()} service`,
      is_available: true,
    }));

    await nhost.graphql.request({
      query: `
        mutation InsertServices($objects: [shop_services_insert_input!]!) {
          insert_shop_services(objects: $objects) { affected_rows }
        }
      `,
      variables: { objects: serviceObjects },
    });

    const bwSingle = params.pricing?.bwSingle || 2.0;
    const bwDouble = params.pricing?.bwDouble || 3.0;
    const colorSingle = params.pricing?.colorSingle || 10.0;

    const pricingObjects = [
      { shop_id: shop.id, service_type: 'Printing', paper_size: 'A4', color_mode: 'B&W', sides: 'Single', price_per_page: bwSingle },
      { shop_id: shop.id, service_type: 'Printing', paper_size: 'A4', color_mode: 'B&W', sides: 'Double', price_per_page: bwDouble },
      { shop_id: shop.id, service_type: 'Printing', paper_size: 'A4', color_mode: 'Color', sides: 'Single', price_per_page: colorSingle },
    ];

    await nhost.graphql.request({
      query: `
        mutation InsertPricing($objects: [shop_pricing_insert_input!]!) {
          insert_shop_pricing(objects: $objects) { affected_rows }
        }
      `,
      variables: { objects: pricingObjects },
    });
  } catch (subErr) {
    console.warn('Sub-table initialization warning:', subErr);
  }

  // Re-fetch full hydrated shop record with relations
  return (await fetchShopByOwner(params.ownerId)) || shop;
}

export async function updateShopLocation(params: {
  shopId: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  pincode?: string;
}): Promise<boolean> {
  const query = `
    mutation UpdateShopLocation(
      $shopId: uuid!
      $latitude: numeric!
      $longitude: numeric!
      $address: String
      $city: String
      $pincode: String
    ) {
      update_shops_by_pk(
        pk_columns: { id: $shopId }
        _set: {
          latitude: $latitude
          longitude: $longitude
          address: $address
          city: $city
          pincode: $pincode
        }
      ) {
        id
        latitude
        longitude
        address
        city
        pincode
      }
    }
  `;

  try {
    const res = await nhost.graphql.request({ query, variables: params });
    return !res.body?.errors?.length;
  } catch (err) {
    console.error('Failed to update shop location:', err);
    return false;
  }
}

export async function verifyOwnerPassword(email: string, password: string): Promise<boolean> {
  if (!email || !password) return false;
  try {
    const res = await nhost.auth.signInEmailPassword({ email, password });
    return Boolean(res.body?.session?.accessToken);
  } catch {
    return false;
  }
}

export async function updateShopDetails(params: {
  shopId: string;
  ownerId: string;
  shopName: string;
  description?: string;
  phone?: string;
  address?: string;
  city?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  openingTime?: string;
  closingTime?: string;
  services?: string[];
  pricing?: {
    bwSingle: number;
    bwDouble: number;
    colorSingle: number;
  };
}): Promise<Shop | null> {
  const updateShopMutation = `
    mutation UpdateShopDetails(
      $shopId: uuid!
      $shopName: String!
      $description: String
      $phone: String
      $address: String
      $city: String
      $pincode: String
      $latitude: numeric
      $longitude: numeric
    ) {
      update_shops_by_pk(
        pk_columns: { id: $shopId }
        _set: {
          shop_name: $shopName
          description: $description
          phone: $phone
          address: $address
          city: $city
          pincode: $pincode
          latitude: $latitude
          longitude: $longitude
        }
      ) {
        id
      }
    }
  `;

  const res = await nhost.graphql.request({
    query: updateShopMutation,
    variables: {
      shopId: params.shopId,
      shopName: params.shopName,
      description: params.description || '',
      phone: params.phone || '',
      address: params.address || '',
      city: params.city || '',
      pincode: params.pincode || '',
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
    },
  });

  if (res.body?.errors?.length) {
    throw new Error(res.body.errors[0]?.message || 'Could not update shop details.');
  }

  // Update services if provided
  if (params.services) {
    await nhost.graphql.request({
      query: `mutation ClearServices($shopId: uuid!) { delete_shop_services(where: { shop_id: { _eq: $shopId } }) { affected_rows } }`,
      variables: { shopId: params.shopId },
    });

    if (params.services.length > 0) {
      const objects = params.services.map((name) => ({
        shop_id: params.shopId,
        service_name: name,
        description: `Official campus ${name.toLowerCase()} service`,
        is_available: true,
      }));
      await nhost.graphql.request({
        query: `mutation ReinsertServices($objects: [shop_services_insert_input!]!) { insert_shop_services(objects: $objects) { affected_rows } }`,
        variables: { objects },
      });
    }
  }

  // Update operating hours if provided
  if (params.openingTime && params.closingTime) {
    const openTime = params.openingTime.length === 5 ? `${params.openingTime}:00` : params.openingTime;
    const closeTime = params.closingTime.length === 5 ? `${params.closingTime}:00` : params.closingTime;

    await nhost.graphql.request({
      query: `mutation UpdateHours($shopId: uuid!, $openTime: time!, $closeTime: time!) {
        update_shop_operating_hours(
          where: { shop_id: { _eq: $shopId }, is_closed: { _eq: false } }
          _set: { opening_time: $openTime, closing_time: $closeTime }
        ) { affected_rows }
      }`,
      variables: { shopId: params.shopId, openTime, closeTime },
    });
  }

  // Update pricing if provided
  if (params.pricing) {
    await nhost.graphql.request({
      query: `mutation ClearPricing($shopId: uuid!) { delete_shop_pricing(where: { shop_id: { _eq: $shopId } }) { affected_rows } }`,
      variables: { shopId: params.shopId },
    });
    const pricingObjects = [
      { shop_id: params.shopId, service_type: 'Printing', paper_size: 'A4', color_mode: 'B&W', sides: 'Single', price_per_page: params.pricing.bwSingle },
      { shop_id: params.shopId, service_type: 'Printing', paper_size: 'A4', color_mode: 'B&W', sides: 'Double', price_per_page: params.pricing.bwDouble },
      { shop_id: params.shopId, service_type: 'Printing', paper_size: 'A4', color_mode: 'Color', sides: 'Single', price_per_page: params.pricing.colorSingle },
    ];
    await nhost.graphql.request({
      query: `mutation ReinsertPricing($objects: [shop_pricing_insert_input!]!) { insert_shop_pricing(objects: $objects) { affected_rows } }`,
      variables: { objects: pricingObjects },
    });
  }

  return await fetchShopByOwner(params.ownerId);
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
            storage_file_id
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
