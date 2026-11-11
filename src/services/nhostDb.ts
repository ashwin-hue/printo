import { nhost } from './nhostClient';
import type { Shop, Order, Profile } from '../types/database';

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
        email
        address
        city
        pincode
        latitude
        longitude
        logo_url
        bucket_id
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
        customer_notes
        created_at
        shop {
          id
          shop_name
          phone
          address
          city
          latitude
          longitude
          bucket_id
        }
        order_documents {
          id
          copies
          color_mode
          paper_size
          sides
          binding_type
          price
          document {
            id
            storage_file_id
            file_name
            storage_path
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
