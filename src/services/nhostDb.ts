import { nhost } from './nhostClient';
import type { Shop, Order, Profile, Notification as CustomerNotification } from '../types/database';

/**
 * GraphQL & Storage helpers for Printo Customer Portal interacting with Nhost
 */

export async function fetchShops(): Promise<Shop[]> {
  const query = `
    query GetShops {
      shops(where: { is_active: { _eq: true } }, order_by: { shop_name: asc }) {
        id
        shop_name
        description
        phone
        address
        city
        pincode
        latitude
        longitude
        bucket_id
        is_active
        operating_hours(where: { is_closed: { _eq: false } }, limit: 1) {
          opening_time
          closing_time
        }
        services(where: { is_available: { _eq: true } }) {
          id
          service_name
        }
        pricing {
          id
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

export async function upsertCustomerProfile(params: {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
}): Promise<boolean> {
  const query = `
    mutation UpsertCustomerProfile($id: uuid!, $email: String!, $fullName: String, $phone: String) {
      insert_profiles_one(
        object: {
          id: $id
          email: $email
          full_name: $fullName
          phone: $phone
          role: customer
        }
        on_conflict: {
          constraint: profiles_pkey
          update_columns: [full_name, phone]
        }
      ) {
        id
      }
    }
  `;

  try {
    const res = await nhost.graphql.request({ query, variables: params });
    return !res.body?.errors?.length;
  } catch {
    return false;
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

const CUSTOMER_ORDER_FIELDS = `
  id
  order_number
  status
  total_amount
  completed_at
  updated_at
  created_at
  shop {
    id
    shop_name
    latitude
    longitude
  }
  order_documents {
    id
    document {
      id
      storage_file_id
      file_name
    }
  }
`;

export const READY_FOR_COLLECTION_TTL_MS = 8 * 60 * 60 * 1000;

export function getOrderReadyTimestampMs(order: Pick<Order, 'completed_at' | 'updated_at' | 'created_at'>): number | null {
  const stamp = order.completed_at || order.updated_at || order.created_at;
  if (!stamp) return null;
  const ms = Date.parse(stamp);
  return Number.isNaN(ms) ? null : ms;
}

export function isReadyOrderExpired(
  order: Pick<Order, 'status' | 'completed_at' | 'updated_at' | 'created_at'>,
  nowMs: number = Date.now()
): boolean {
  if (order.status !== 'ready_for_collection' && order.status !== 'completed') {
    return false;
  }
  const readyAtMs = getOrderReadyTimestampMs(order);
  if (readyAtMs === null) return false;
  return nowMs - readyAtMs >= READY_FOR_COLLECTION_TTL_MS;
}

export function getReadyOrderRemainingMs(
  order: Pick<Order, 'status' | 'completed_at' | 'updated_at' | 'created_at'>,
  nowMs: number = Date.now()
): number | null {
  if (order.status !== 'ready_for_collection' && order.status !== 'completed') {
    return null;
  }
  const readyAtMs = getOrderReadyTimestampMs(order);
  if (readyAtMs === null) return null;
  return Math.max(0, READY_FOR_COLLECTION_TTL_MS - (nowMs - readyAtMs));
}

export function formatRemainingPickupTime(remainingMs: number): string {
  if (remainingMs <= 0) return 'Expiring...';
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

const CUSTOMER_NOTIFICATION_FIELDS = `
  id
  title
  message
  notification_type
  created_at
`;

export async function fetchCustomerOrders(customerId: string): Promise<Order[]> {
  const query = `
    query GetCustomerOrders($customerId: uuid!) {
      orders(
        where: { customer_id: { _eq: $customerId } }
        order_by: { created_at: desc }
        limit: 25
      ) {
        ${CUSTOMER_ORDER_FIELDS}
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

/**
 * Uploads customer file directly into the target shop's Nhost Storage bucket,
 * inserts public.documents, creates public.orders, and links public.order_documents.
 */
export async function submitCustomerPrintJob(params: {
  customerId: string;
  customerEmail: string;
  customerName?: string;
  shop: Shop;
  file: File;
  files?: File[];
  pageCount: number;
  copies: number;
  colorMode: 'B&W' | 'Color';
  paperSize: string;
  sides: 'Single' | 'Double';
  bindingType: string;
  printCategory?: string;
  price: number;
  notes?: string;
}): Promise<Order | null> {
  const uploadQueue = params.files && params.files.length > 0 ? params.files : [params.file];

  // 1. Ensure customer profile row exists
  await upsertCustomerProfile({
    id: params.customerId,
    email: params.customerEmail,
    fullName: params.customerName,
  });

  // 2. Upload file(s) into target shop's bucket
  const targetBucket = params.shop.bucket_id || 'default';
  const uploadRes = await nhost.storage.uploadFiles({
    'bucket-id': targetBucket,
    'file[]': uploadQueue,
    'metadata[]': uploadQueue.map((f) => ({
      name: f.name,
      metadata: {
        shopId: params.shop.id,
        shopName: params.shop.shop_name,
        customerId: params.customerId,
        customerEmail: params.customerEmail,
        printCategory: params.printCategory || 'documents',
        colorMode: params.colorMode,
        copies: params.copies,
        bindingType: params.bindingType,
      },
    })),
  });

  const processedFiles = uploadRes.body?.processedFiles || [];
  if (processedFiles.length === 0 || !processedFiles[0]?.id) {
    throw new Error('Failed to upload document into shop bucket.');
  }

  // 3. Insert record(s) in public.documents
  const docMutation = `
    mutation InsertDocument(
      $customerId: uuid!
      $storageFileId: uuid!
      $fileName: String!
      $storagePath: String!
      $fileSize: bigint!
      $mimeType: String!
      $pageCount: Int!
    ) {
      insert_documents_one(object: {
        customer_id: $customerId
        storage_file_id: $storageFileId
        file_name: $fileName
        storage_path: $storagePath
        file_size: $fileSize
        mime_type: $mimeType
        page_count: $pageCount
      }) {
        id
      }
    }
  `;

  const docIds: string[] = [];
  const perFilePages = Math.max(1, Math.round(params.pageCount / Math.max(1, processedFiles.length)));
  for (let i = 0; i < processedFiles.length; i++) {
    const uploaded = processedFiles[i];
    const sourceFile = uploadQueue[i] || params.file;
    const docRes = await nhost.graphql.request<{ insert_documents_one: { id: string } }>({
      query: docMutation,
      variables: {
        customerId: params.customerId,
        storageFileId: uploaded.id,
        fileName: sourceFile.name,
        storagePath: `${targetBucket}/${uploaded.id}`,
        fileSize: sourceFile.size,
        mimeType: sourceFile.type || 'application/octet-stream',
        pageCount: i === 0 && processedFiles.length === 1 ? params.pageCount : perFilePages,
      },
    });
    const insertedId = docRes.body?.data?.insert_documents_one?.id;
    if (!insertedId) {
      throw new Error(docRes.body?.errors?.[0]?.message || 'Could not register document metadata.');
    }
    docIds.push(insertedId);
  }

  // 4. Create Order + OrderDocument(s)
  const orderNumber = `PRT-${Math.floor(100000 + Math.random() * 900000)}`;
  const orderRes =
    docIds.length === 1
      ? await nhost.graphql.request<{ insert_orders_one: Order }>({
          query: `
            mutation CreateFullOrder(
              $orderNumber: String!
              $customerId: uuid!
              $shopId: uuid!
              $totalPages: Int!
              $totalCopies: Int!
              $subtotal: numeric!
              $totalAmount: numeric!
              $customerNotes: String
              $documentId: uuid!
              $copies: Int!
              $colorMode: String!
              $paperSize: String!
              $sides: String!
              $bindingType: String!
              $price: numeric!
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
                order_documents: {
                  data: [{
                    document_id: $documentId
                    copies: $copies
                    color_mode: $colorMode
                    paper_size: $paperSize
                    sides: $sides
                    binding_type: $bindingType
                    price: $price
                  }]
                }
              }) {
                id
                order_number
                status
                total_amount
                created_at
              }
            }
          `,
          variables: {
            orderNumber,
            customerId: params.customerId,
            shopId: params.shop.id,
            totalPages: params.pageCount,
            totalCopies: params.copies,
            subtotal: params.price,
            totalAmount: params.price,
            customerNotes: params.notes || '',
            documentId: docIds[0],
            copies: params.copies,
            colorMode: params.colorMode,
            paperSize: params.paperSize.slice(0, 20),
            sides: params.sides,
            bindingType: params.bindingType.slice(0, 50),
            price: params.price,
          },
        })
      : await nhost.graphql.request<{ insert_orders_one: Order }>({
          query: `
            mutation CreateMultiDocOrder(
              $orderNumber: String!
              $customerId: uuid!
              $shopId: uuid!
              $totalPages: Int!
              $totalCopies: Int!
              $subtotal: numeric!
              $totalAmount: numeric!
              $customerNotes: String
              $orderDocs: [order_documents_insert_input!]!
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
                order_documents: { data: $orderDocs }
              }) {
                id
                order_number
                status
                total_amount
                created_at
              }
            }
          `,
          variables: {
            orderNumber,
            customerId: params.customerId,
            shopId: params.shop.id,
            totalPages: params.pageCount,
            totalCopies: params.copies,
            subtotal: params.price,
            totalAmount: params.price,
            customerNotes: params.notes || '',
            orderDocs: docIds.map((id, idx) => ({
              document_id: id,
              copies: params.copies,
              color_mode: params.colorMode,
              paper_size: params.paperSize.slice(0, 20),
              sides: params.sides,
              binding_type: params.bindingType.slice(0, 50),
              price: idx === 0 ? params.price : 0,
            })),
          },
        });

  if (orderRes.body?.errors?.length) {
    throw new Error(orderRes.body.errors[0]?.message || 'Order creation failed.');
  }

  return orderRes.body?.data?.insert_orders_one || null;
}

/**
 * Single round-trip sync fetching both active customer orders and unread pickup
 * notifications using lean projections and composite/partial indexed filters.
 */
export async function fetchCustomerLiveSync(userId: string): Promise<{
  orders: Order[];
  notifications: CustomerNotification[];
}> {
  const query = `
    query GetCustomerLiveSync($userId: uuid!) {
      orders(
        where: { customer_id: { _eq: $userId } }
        order_by: { created_at: desc }
        limit: 25
      ) {
        ${CUSTOMER_ORDER_FIELDS}
      }
      notifications(
        where: { user_id: { _eq: $userId }, is_read: { _eq: false } }
        order_by: { created_at: desc }
        limit: 20
      ) {
        ${CUSTOMER_NOTIFICATION_FIELDS}
      }
    }
  `;

  try {
    const res = await nhost.graphql.request<{
      orders: Order[];
      notifications: CustomerNotification[];
    }>({
      query,
      variables: { userId },
    });
    if (res.body?.errors?.length) {
      console.error('Failed live sync:', res.body.errors);
      return { orders: [], notifications: [] };
    }
    return {
      orders: res.body?.data?.orders || [],
      notifications: res.body?.data?.notifications || [],
    };
  } catch (err) {
    console.error('Network error during live sync:', err);
    return { orders: [], notifications: [] };
  }
}

export async function fetchCustomerNotifications(
  userId: string
): Promise<CustomerNotification[]> {
  const query = `
    query GetUnreadNotifications($userId: uuid!) {
      notifications(
        where: { user_id: { _eq: $userId }, is_read: { _eq: false } }
        order_by: { created_at: desc }
        limit: 20
      ) {
        ${CUSTOMER_NOTIFICATION_FIELDS}
      }
    }
  `;

  try {
    const res = await nhost.graphql.request<{ notifications: CustomerNotification[] }>({
      query,
      variables: { userId },
    });
    if (res.body?.errors?.length) {
      console.error('Failed to fetch notifications:', res.body.errors);
      return [];
    }
    return res.body?.data?.notifications || [];
  } catch (err) {
    console.error('Network error fetching notifications:', err);
    return [];
  }
}

/**
 * Deletes delivered notifications from public.notifications immediately after
 * the customer client displays/plays them so the table stays clean.
 * Falls back to is_read = true only if Hasura delete_notifications is not yet enabled.
 */
export async function deleteCustomerNotifications(
  ids: string[]
): Promise<{ deleted: boolean }> {
  if (ids.length === 0) return { deleted: true };
  try {
    await nhost.graphql.request({
      query: `
        mutation DeleteDeliveredNotifications($ids: [uuid!]!) {
          delete_notifications(where: { id: { _in: $ids } }) {
            affected_rows
          }
        }
      `,
      variables: { ids },
    });
    return { deleted: true };
  } catch (err) {
    console.warn('delete_notifications unavailable, marking read fallback:', err);
    try {
      await nhost.graphql.request({
        query: `
          mutation MarkNotificationsRead($ids: [uuid!]!) {
            update_notifications(
              where: { id: { _in: $ids } }
              _set: { is_read: true }
            ) {
              affected_rows
            }
          }
        `,
        variables: { ids },
      });
    } catch (fallbackErr) {
      console.warn('Could not acknowledge notifications:', fallbackErr);
    }
    return { deleted: false };
  }
}

async function deleteCustomerBucketFiles(fileIds: string[]): Promise<number> {
  if (fileIds.length === 0) return 0;

  const results = await Promise.all(
    fileIds.map(async (fileId) => {
      try {
        await nhost.storage.deleteFile(fileId);
        return true;
      } catch {
        try {
          await nhost.graphql.request({
            query: `mutation DeleteCustomerFile($fileId: uuid!) { deleteFile(id: $fileId) { id } }`,
            variables: { fileId },
          });
          return true;
        } catch {
          return false;
        }
      }
    })
  );

  return results.filter(Boolean).length;
}

/**
 * Deletes notified/completed customer orders, their documents metadata, and their storage blobs.
 * Purges storage blobs first so files are reclaimed immediately even if DB delete permissions are pending.
 */
export async function cleanupCustomerNotifiedOrders(ordersToDelete: Order[]): Promise<{
  deletedOrderIds: string[];
  deletedFiles: number;
  permissionMissing?: boolean;
}> {
  if (!ordersToDelete || ordersToDelete.length === 0) {
    return { deletedOrderIds: [], deletedFiles: 0 };
  }

  const orderIds = Array.from(new Set(ordersToDelete.map((o) => o.id)));
  const docIds = Array.from(
    new Set(
      ordersToDelete.flatMap((o) =>
        (o.order_documents || [])
          .map((od) => od.document?.id)
          .filter((id): id is string => Boolean(id))
      )
    )
  );
  const fileIds = Array.from(
    new Set(
      ordersToDelete.flatMap((o) =>
        (o.order_documents || [])
          .map((od) => od.document?.storage_file_id)
          .filter((id): id is string => Boolean(id))
      )
    )
  );

  const deletedFiles = await deleteCustomerBucketFiles(fileIds);
  let deletedOrderIds: string[] = [];
  let permissionMissing = false;

  try {
    const deleteOrdersRes = await nhost.graphql.request<{
      delete_orders: { affected_rows: number } | null;
    }>({
      query: `
        mutation DeleteExpiredCustomerOrders($orderIds: [uuid!]!) {
          delete_orders(where: { id: { _in: $orderIds } }) {
            affected_rows
          }
        }
      `,
      variables: { orderIds },
    });

    const ordersErr = deleteOrdersRes.body?.errors?.[0]?.message || '';
    if (ordersErr) {
      permissionMissing = /delete_orders|not found|permission/i.test(ordersErr);
      console.warn('Customer order delete returned error:', ordersErr);
    } else {
      deletedOrderIds = orderIds;
    }

    if (docIds.length > 0 && !ordersErr) {
      const deleteDocsRes = await nhost.graphql.request<{
        delete_documents: { affected_rows: number } | null;
      }>({
        query: `
          mutation DeleteExpiredCustomerDocs($docIds: [uuid!]!) {
            delete_documents(where: { id: { _in: $docIds } }) {
              affected_rows
            }
          }
        `,
        variables: { docIds },
      });
      if (deleteDocsRes.body?.errors?.length) {
        console.warn('Customer document cleanup warning:', deleteDocsRes.body.errors[0]?.message);
      }
    }
  } catch (err: any) {
    const msg = err?.body?.errors?.[0]?.message || err?.message || '';
    permissionMissing = /delete_orders|not found|permission/i.test(msg);
    console.warn('Customer order cleanup skipped:', err);
  }

  if (deletedOrderIds.length === 0 && deletedFiles > 0 && docIds.length > 0) {
    try {
      await nhost.graphql.request({
        query: `
          mutation ClearCustomerDocFileRefs($docIds: [uuid!]!) {
            update_documents(where: { id: { _in: $docIds } }, _set: { storage_file_id: null }) {
              affected_rows
            }
          }
        `,
        variables: { docIds },
      });
    } catch {
      // Ignore if update_documents permission is unavailable
    }
  }

  return { deletedOrderIds, deletedFiles, permissionMissing };
}
