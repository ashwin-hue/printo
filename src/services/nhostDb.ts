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
    if (shop && !shop.bucket_id) {
      // Create and bind shop storage bucket once when missing
      const ensuredBucket = await ensureShopBucket(shop);
      if (ensuredBucket) {
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
      orders(
        where: {
          shop_id: { _eq: $shopId }
          status: { _in: ["pending", "accepted", "printing"] }
        }
        order_by: { created_at: desc }
        limit: 50
      ) {
        id
        order_number
        customer_id
        status
        total_pages
        total_copies
        total_amount
        customer_notes
        created_at
        customer {
          full_name
          email
          phone
        }
        order_documents {
          id
          copies
          color_mode
          paper_size
          sides
          binding_type
          document {
            id
            storage_file_id
            file_name
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
  const readyAt =
    status === 'ready_for_collection' || status === 'completed'
      ? new Date().toISOString()
      : null;

  const query = readyAt
    ? `
      mutation UpdateOrderReadyStatus($orderId: uuid!, $status: order_status!, $completedAt: timestamptz!) {
        update_orders_by_pk(
          pk_columns: { id: $orderId }
          _set: { status: $status, completed_at: $completedAt }
        ) {
          id
          status
          completed_at
          updated_at
        }
      }
    `
    : `
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
      variables: readyAt ? { orderId, status, completedAt: readyAt } : { orderId, status },
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

export async function markOrderReadyForCollection(orderId: string): Promise<boolean> {
  return updateOrderStatus(orderId, 'ready_for_collection');
}

export async function downloadBucketFileBlob(fileId: string): Promise<Blob | null> {
  try {
    const res = await nhost.storage.getFile(fileId);
    return res.body instanceof Blob ? res.body : null;
  } catch (err) {
    console.error('Failed to download bucket file blob:', err);
    return null;
  }
}

export async function sendOrderCollectNotification(params: {
  customerId: string;
  shopName: string;
  fileName: string;
  customerIdNo: string;
}): Promise<{ ok: boolean; notificationId?: string; error?: string }> {
  // Omit order_id (keep NULL) because notifications.order_id uses ON DELETE CASCADE,
  // which would delete the notification immediately when cleanupPrintedOrder removes the order row.
  const mutation = `
    mutation PushCollectNotification(
      $userId: uuid!
      $title: String!
      $message: String!
    ) {
      insert_notifications_one(object: {
        user_id: $userId
        title: $title
        message: $message
        notification_type: "ready_for_collection"
        is_read: false
      }) {
        id
        created_at
      }
    }
  `;

  const title = 'Ready to Collect';
  const message = `${params.shopName} finished printing ${params.fileName}. Show ID No ${params.customerIdNo} at the counter to collect.`;

  try {
    const res = await nhost.graphql.request<{ insert_notifications_one: { id: string } | null }>({
      query: mutation,
      variables: {
        userId: params.customerId,
        title: title.slice(0, 255),
        message,
      },
    });
    const insertedId = res.body?.data?.insert_notifications_one?.id;
    if (!insertedId) {
      const msg = res.body?.errors?.[0]?.message || 'Notification insert returned no id.';
      return { ok: false, error: msg };
    }
    return { ok: true, notificationId: insertedId };
  } catch (err: any) {
    const msg = err?.body?.errors?.[0]?.message || err?.message || 'Failed to push collect notification.';
    console.error('Push collect notification error:', err);
    return { ok: false, error: msg };
  }
}

export interface CleanupPrintedOrderResult {
  deletedOrder: boolean;
  deletedDocuments: number;
  deletedFiles: number;
  permissionMissing?: boolean;
  error?: string;
}

async function deleteBucketFiles(storageFileIds: string[]): Promise<number> {
  if (storageFileIds.length === 0) return 0;

  const storageResults = await Promise.all(
    storageFileIds.map(async (fileId) => {
      try {
        await nhost.storage.deleteFile(fileId);
        return true;
      } catch (storageErr) {
        console.warn(`Storage deleteFile failed for ${fileId}, trying GraphQL deleteFile:`, storageErr);
        try {
          await nhost.graphql.request({
            query: `mutation DeleteBucketFile($fileId: uuid!) { deleteFile(id: $fileId) { id } }`,
            variables: { fileId },
          });
          return true;
        } catch (gqlFileErr) {
          console.warn(`Could not delete bucket file ${fileId}:`, gqlFileErr);
          return false;
        }
      }
    })
  );

  return storageResults.filter(Boolean).length;
}

/**
 * Removes a printed order and its linked document/storage records once the
 * customer's collection notification has been pushed.
 * Purges storage blobs first so heavy files are always reclaimed even if DB row delete permissions are pending.
 */
export async function cleanupPrintedOrder(order: Order): Promise<CleanupPrintedOrderResult> {
  const documentIds = Array.from(
    new Set(
      (order.order_documents || [])
        .map((od) => od.document?.id)
        .filter((id): id is string => Boolean(id))
    )
  );
  const storageFileIds = Array.from(
    new Set(
      (order.order_documents || [])
        .map((od) => od.document?.storage_file_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  // 1. Delete uploaded storage objects immediately so downloaded files do not linger in Nhost Storage
  const deletedFiles = await deleteBucketFiles(storageFileIds);

  // 2 & 3. Atomic batched order + unreferenced documents delete in one GraphQL round-trip
  let deletedDocuments = 0;
  try {
    if (documentIds.length > 0) {
      const batchRes = await nhost.graphql.request<{
        delete_orders_by_pk: { id: string } | null;
        delete_documents: { affected_rows: number } | null;
      }>({
        query: `
          mutation DeletePrintedOrderAndDocs($orderId: uuid!, $docIds: [uuid!]!) {
            delete_orders_by_pk(id: $orderId) {
              id
            }
            delete_documents(where: { id: { _in: $docIds } }) {
              affected_rows
            }
          }
        `,
        variables: { orderId: order.id, docIds: documentIds },
      });
      if (batchRes.body?.errors?.length) {
        throw new Error(batchRes.body.errors[0]?.message || 'Unable to delete order.');
      }
      deletedDocuments = batchRes.body?.data?.delete_documents?.affected_rows ?? documentIds.length;
    } else {
      const res = await nhost.graphql.request<{ delete_orders_by_pk: { id: string } | null }>({
        query: `
          mutation DeletePrintedOrder($orderId: uuid!) {
            delete_orders_by_pk(id: $orderId) {
              id
            }
          }
        `,
        variables: { orderId: order.id },
      });
      if (res.body?.errors?.length) {
        throw new Error(res.body.errors[0]?.message || 'Unable to delete order.');
      }
    }
  } catch (err: any) {
    const msg = err?.body?.errors?.[0]?.message || err?.message || 'Unable to delete order.';
    // Fallback if delete_documents failed due to partial FK sharing or missing documents permission
    if (documentIds.length > 0 && /delete_documents|restrict|foreign key/i.test(msg)) {
      try {
        await nhost.graphql.request({
          query: `mutation DeletePrintedOrder($orderId: uuid!) { delete_orders_by_pk(id: $orderId) { id } }`,
          variables: { orderId: order.id },
        });
      } catch (orderErr: any) {
        const orderMsg = orderErr?.body?.errors?.[0]?.message || orderErr?.message || msg;
        return {
          deletedOrder: false,
          deletedDocuments: 0,
          deletedFiles,
          permissionMissing: /delete_orders_by_pk|not found|permission/i.test(orderMsg),
          error: orderMsg,
        };
      }
    } else {
      console.error('Order cleanup error:', err);
      // Clear storage_file_id pointers on documents when storage files are already deleted
      if (deletedFiles > 0 && documentIds.length > 0) {
        try {
          await nhost.graphql.request({
            query: `
              mutation ClearDeletedDocFileRefs($docIds: [uuid!]!) {
                update_documents(where: { id: { _in: $docIds } }, _set: { storage_file_id: null }) {
                  affected_rows
                }
              }
            `,
            variables: { docIds: documentIds },
          });
        } catch {
          // Ignore if shop role cannot update customer document rows
        }
      }
      return {
        deletedOrder: false,
        deletedDocuments: 0,
        deletedFiles,
        permissionMissing: /delete_orders_by_pk|not found|permission/i.test(msg),
        error: msg,
      };
    }
  }

  return {
    deletedOrder: true,
    deletedDocuments,
    deletedFiles,
  };
}

/**
 * Deletes heavy uploaded document blobs from Nhost Storage right after printing finishes,
 * while retaining the lightweight ready_for_collection order row for 8 hours so customers can collect.
 */
export async function purgePrintedOrderStorage(order: Order): Promise<number> {
  const documentIds = Array.from(
    new Set(
      (order.order_documents || [])
        .map((od) => od.document?.id)
        .filter((id): id is string => Boolean(id))
    )
  );
  const storageFileIds = Array.from(
    new Set(
      (order.order_documents || [])
        .map((od) => od.document?.storage_file_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const deletedFiles = await deleteBucketFiles(storageFileIds);
  if (deletedFiles > 0 && documentIds.length > 0) {
    try {
      await nhost.graphql.request({
        query: `
          mutation ClearPrintedDocFileRefs($docIds: [uuid!]!) {
            update_documents(where: { id: { _in: $docIds } }, _set: { storage_file_id: null }) {
              affected_rows
            }
          }
        `,
        variables: { docIds: documentIds },
      });
    } catch {
      // Non-fatal if shop role cannot clear customer document storage pointer
    }
  }
  return deletedFiles;
}

export const READY_FOR_COLLECTION_TTL_MS = 8 * 60 * 60 * 1000;

/**
 * Queries and removes this shop's ready_for_collection/completed orders once 8 hours
 * have elapsed since completion, keeping the database and storage lean.
 */
export async function cleanupExpiredShopOrders(
  shopId: string,
  ttlMs: number = READY_FOR_COLLECTION_TTL_MS
): Promise<number> {
  try {
    const res = await nhost.graphql.request<{ orders: Order[] }>({
      query: `
        query GetShopFinishedOrders($shopId: uuid!) {
          orders(
            where: {
              shop_id: { _eq: $shopId }
              status: { _in: ["ready_for_collection", "completed"] }
            }
            limit: 50
          ) {
            id
            status
            completed_at
            updated_at
            created_at
            order_documents {
              document {
                id
                storage_file_id
              }
            }
          }
        }
      `,
      variables: { shopId },
    });

    if (res.body?.errors?.length) return 0;

    const nowMs = Date.now();
    const expiredOrders = (res.body?.data?.orders || []).filter((o) => {
      const stamp = o.completed_at || o.updated_at || o.created_at;
      const readyMs = stamp ? Date.parse(stamp) : NaN;
      return !Number.isNaN(readyMs) && nowMs - readyMs >= ttlMs;
    });

    if (expiredOrders.length === 0) return 0;

    let removedCount = 0;
    for (const exp of expiredOrders) {
      const result = await cleanupPrintedOrder(exp);
      if (result.deletedOrder) removedCount += 1;
    }
    return removedCount;
  } catch (err) {
    console.warn('Expired shop order cleanup error:', err);
    return 0;
  }
}

/**
 * Allows a shop to permanently delete itself along with all linked orders,
 * documents metadata, uploaded storage files, hours, services, and pricing.
 */
export async function deleteShopAndData(
  shopId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // 1. Collect all orders + documents + storage file IDs associated with this shop
    const ordersRes = await nhost.graphql.request<{ orders: Order[] }>({
      query: `
        query GetAllShopOrdersForDelete($shopId: uuid!) {
          orders(where: { shop_id: { _eq: $shopId } }) {
            id
            order_documents {
              document {
                id
                storage_file_id
              }
            }
          }
        }
      `,
      variables: { shopId },
    });

    const shopOrders = ordersRes.body?.data?.orders || [];
    const storageFileIds = Array.from(
      new Set(
        shopOrders.flatMap((o) =>
          (o.order_documents || [])
            .map((od) => od.document?.storage_file_id)
            .filter((id): id is string => Boolean(id))
        )
      )
    );
    const docIds = Array.from(
      new Set(
        shopOrders.flatMap((o) =>
          (o.order_documents || [])
            .map((od) => od.document?.id)
            .filter((id): id is string => Boolean(id))
        )
      )
    );

    // 2. Purge uploaded storage blobs first so no orphaned files linger
    if (storageFileIds.length > 0) {
      await deleteBucketFiles(storageFileIds);
    }

    // 3. Delete linked orders (in case orders_shop_id_fkey is still ON DELETE RESTRICT)
    if (shopOrders.length > 0) {
      const delOrdersRes = await nhost.graphql.request({
        query: `
          mutation DeleteAllShopOrders($shopId: uuid!) {
            delete_orders(where: { shop_id: { _eq: $shopId } }) {
              affected_rows
            }
          }
        `,
        variables: { shopId },
      });
      if (delOrdersRes.body?.errors?.length) {
        console.warn('delete_orders before delete_shops warning:', delOrdersRes.body.errors[0]?.message);
      }
    }

    // 4. Clean up unreferenced documents metadata (non-fatal)
    if (docIds.length > 0) {
      try {
        await nhost.graphql.request({
          query: `
            mutation DeleteShopDocs($docIds: [uuid!]!) {
              delete_documents(where: { id: { _in: $docIds } }) {
                affected_rows
              }
            }
          `,
          variables: { docIds },
        });
      } catch {
        // Non-fatal if document delete permission belongs only to document owner
      }
    }

    // 5. Delete the shop record itself (hours/services/pricing/reviews/staff cascade automatically)
    const delShopRes = await nhost.graphql.request<{
      delete_shops_by_pk: { id: string } | null;
    }>({
      query: `
        mutation DeleteShop($shopId: uuid!) {
          delete_shops_by_pk(id: $shopId) {
            id
          }
        }
      `,
      variables: { shopId },
    });

    if (delShopRes.body?.errors?.length) {
      const errMsg = delShopRes.body.errors[0]?.message || 'Could not delete shop.';
      if (/orders_shop_id_fkey|restrict/i.test(errMsg)) {
        return {
          ok: false,
          error:
            'Database FK constraint orders_shop_id_fkey blocked deletion. Run the updated nhost/schema.sql cascade migration or enable delete permission on orders.',
        };
      }
      if (/delete_shops|permission|not found/i.test(errMsg)) {
        return {
          ok: false,
          error: 'Enable Hasura delete permission on table "shops" for this role, or run nhost/schema.sql.',
        };
      }
      return { ok: false, error: errMsg };
    }

    if (!delShopRes.body?.data?.delete_shops_by_pk?.id) {
      return {
        ok: false,
        error: 'Shop was not deleted. Verify delete permission on "shops" in Hasura.',
      };
    }

    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Unexpected error while deleting shop.',
    };
  }
}
