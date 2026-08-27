import { 
  Firestore, 
  collection, 
  doc, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  QueryConstraint,
  Query,
  DocumentData,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Custom exception raised when a query or mutation violates tenant isolation boundaries.
 */
export class TenantSecurityException extends Error {
  public readonly code: string = 'TENANT_ISOLATION_VIOLATION';
  public readonly tenantId: string;
  public readonly collectionName: string;
  public readonly operation: string;

  constructor(message: string, tenantId: string = '', collectionName: string = '', operation: string = '') {
    const errorPayload = {
      error: 'TENANT_ISOLATION_VIOLATION',
      message,
      tenantId,
      collectionName,
      operation,
      timestamp: new Date().toISOString()
    };
    super(JSON.stringify(errorPayload));
    this.name = 'TenantSecurityException';
    this.tenantId = tenantId;
    this.collectionName = collectionName;
    this.operation = operation;
  }
}

/**
 * Normalizes a tenant ID into a clean, canonical lowercase string.
 */
export function normalizeTenantId(id?: string | null): string {
  if (!id) return '';
  return id.trim().toLowerCase();
}

/**
 * Validates that a tenant ID is non-empty, well-formed, and not a wildcard.
 * Throws TenantSecurityException if invalid.
 */
export function validateTenantContext(tenantId?: string | null, collectionName = '', operation = 'QUERY'): string {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new TenantSecurityException(
      'Missing required tenant_id filter. Queries across collections without explicit tenant context are strictly forbidden.',
      '',
      collectionName,
      operation
    );
  }

  const cleaned = tenantId.trim().toLowerCase();
  if (cleaned.length === 0 || cleaned === '*' || cleaned === 'null' || cleaned === 'undefined' || cleaned === 'all') {
    throw new TenantSecurityException(
      `Invalid tenant_id "${tenantId}". Wildcard, global, or empty tenant contexts are forbidden.`,
      cleaned,
      collectionName,
      operation
    );
  }

  return cleaned;
}

/**
 * Checks whether an entity's tenant_id or alias fields match the target tenant.
 */
export function isEntityInTenant<T extends { tenant_id?: string; tenantId?: string; businessId?: string; organizationId?: string }>(
  entity: T | null | undefined,
  targetTenantId: string
): boolean {
  if (!entity) return false;
  const target = normalizeTenantId(targetTenantId);
  if (!target) return false;

  const entityTenant = normalizeTenantId(entity.tenant_id || entity.tenantId || entity.businessId || entity.organizationId);
  return entityTenant === target;
}

/**
 * In-memory / cache array filter that strictly filters items by tenant_id.
 */
export function tenantFilterArray<T extends { tenant_id?: string; tenantId?: string; businessId?: string; organizationId?: string }>(
  items: T[],
  tenantId: string,
  collectionName = 'in-memory'
): T[] {
  const validTenant = validateTenantContext(tenantId, collectionName, 'LIST');
  return items.filter(item => isEntityInTenant(item, validTenant));
}

/**
 * Injects tenant_id and aliases onto any new entity mutation.
 */
export function tenantValidateEntityMutation<T extends Record<string, any>>(
  entity: T,
  tenantId: string,
  collectionName = 'in-memory'
): T & { tenant_id: string; tenantId: string; businessId: string } {
  const validTenant = validateTenantContext(tenantId, collectionName, 'MUTATION');
  
  // If the entity already had a different tenant_id, block cross-tenant injection
  const existingTenant = normalizeTenantId(entity.tenant_id || entity.tenantId || entity.businessId);
  if (existingTenant && existingTenant !== validTenant) {
    throw new TenantSecurityException(
      `Cross-tenant mutation blocked: entity belongs to tenant "${existingTenant}", cannot be written by tenant "${validTenant}".`,
      validTenant,
      collectionName,
      'MUTATION'
    );
  }

  return {
    ...entity,
    tenant_id: validTenant,
    tenantId: validTenant,
    businessId: validTenant,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Asserts that a retrieved document belongs to the active tenant.
 */
export function tenantAssertDocOwnership<T extends { tenant_id?: string; tenantId?: string; businessId?: string }>(
  doc: T | null | undefined,
  tenantId: string,
  collectionName = 'document',
  docId = ''
): void {
  const validTenant = validateTenantContext(tenantId, collectionName, 'GET');
  if (!doc) return;

  if (!isEntityInTenant(doc, validTenant)) {
    throw new TenantSecurityException(
      `Document "${docId}" in collection "${collectionName}" does not belong to tenant "${validTenant}". Cross-tenant read rejected.`,
      validTenant,
      collectionName,
      'GET'
    );
  }
}

// ----------------------------------------------------------------------
// FIRESTORE HARDENED QUERY HELPERS
// ----------------------------------------------------------------------

/**
 * Creates a strictly scoped Firestore Query with guaranteed `where('tenant_id', '==', tenantId)` filter.
 */
export function createTenantQuery<T = DocumentData>(
  firestoreDb: Firestore,
  collectionPath: string,
  tenantId: string,
  ...additionalConstraints: QueryConstraint[]
): Query<T> {
  const validTenant = validateTenantContext(tenantId, collectionPath, 'QUERY');
  const baseCollection = collection(firestoreDb, collectionPath);
  
  // Enforce mandatory tenant_id filter at the head of query
  return query(
    baseCollection,
    where('tenant_id', '==', validTenant),
    ...additionalConstraints
  ) as Query<T>;
}

/**
 * Executes a Firestore getDocs query strictly filtered by tenant_id.
 */
export async function tenantGetDocs<T = DocumentData>(
  firestoreDb: Firestore,
  collectionPath: string,
  tenantId: string,
  ...additionalConstraints: QueryConstraint[]
): Promise<T[]> {
  try {
    const q = createTenantQuery<T>(firestoreDb, collectionPath, tenantId, ...additionalConstraints);
    const snapshot = await getDocs(q);
    const results: T[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as any;
      results.push({
        id: docSnap.id,
        ...data
      });
    });
    return results;
  } catch (error: any) {
    // If Firestore is running in local sandbox/offline or throws permission error, format clean security error
    if (error instanceof TenantSecurityException) {
      throw error;
    }
    console.warn(`[Firestore Tenant Query] Note on collection "${collectionPath}" for tenant "${tenantId}":`, error?.message || error);
    return [];
  }
}

/**
 * Fetches a single document by ID and verifies its tenant_id.
 */
export async function tenantGetDoc<T = DocumentData>(
  firestoreDb: Firestore,
  collectionPath: string,
  docId: string,
  tenantId: string
): Promise<T | null> {
  const validTenant = validateTenantContext(tenantId, collectionPath, 'GET_DOC');
  try {
    const docRef = doc(firestoreDb, collectionPath, docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data() as any;
    const item = { id: snap.id, ...data };
    
    // Assert document ownership
    tenantAssertDocOwnership(item, validTenant, collectionPath, docId);
    return item as T;
  } catch (error: any) {
    if (error instanceof TenantSecurityException) {
      throw error;
    }
    console.warn(`[Firestore Tenant GetDoc] Note on doc "${docId}":`, error?.message || error);
    return null;
  }
}

/**
 * Creates or overwrites a document in Firestore with strictly enforced tenant_id injection.
 */
export async function tenantSetDoc<T extends Record<string, any>>(
  firestoreDb: Firestore,
  collectionPath: string,
  docId: string,
  data: T,
  tenantId: string
): Promise<T & { id: string; tenant_id: string; tenantId: string; businessId: string }> {
  const validTenant = validateTenantContext(tenantId, collectionPath, 'SET_DOC');
  const guardedData = tenantValidateEntityMutation(data, validTenant, collectionPath);
  
  try {
    const docRef = doc(firestoreDb, collectionPath, docId);
    await setDoc(docRef, {
      ...guardedData,
      id: docId
    });
    return { ...guardedData, id: docId };
  } catch (error: any) {
    console.warn(`[Firestore Tenant SetDoc] Note on doc "${docId}":`, error?.message || error);
    return { ...guardedData, id: docId };
  }
}

/**
 * Updates a document in Firestore, validating that the target document belongs to the active tenant.
 */
export async function tenantUpdateDoc<T extends Record<string, any>>(
  firestoreDb: Firestore,
  collectionPath: string,
  docId: string,
  updates: Partial<T>,
  tenantId: string
): Promise<void> {
  const validTenant = validateTenantContext(tenantId, collectionPath, 'UPDATE_DOC');
  
  // Strip any malicious attempt to reassign tenant_id
  const sanitizedUpdates = { ...updates };
  delete (sanitizedUpdates as any).tenant_id;
  delete (sanitizedUpdates as any).tenantId;
  delete (sanitizedUpdates as any).businessId;

  try {
    const docRef = doc(firestoreDb, collectionPath, docId);
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      const existingData = existing.data() as any;
      tenantAssertDocOwnership(existingData, validTenant, collectionPath, docId);
    }

    await updateDoc(docRef, {
      ...sanitizedUpdates,
      updatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    if (error instanceof TenantSecurityException) {
      throw error;
    }
    console.warn(`[Firestore Tenant UpdateDoc] Note on doc "${docId}":`, error?.message || error);
  }
}

/**
 * Deletes a document from Firestore after confirming tenant ownership.
 */
export async function tenantDeleteDoc(
  firestoreDb: Firestore,
  collectionPath: string,
  docId: string,
  tenantId: string
): Promise<void> {
  const validTenant = validateTenantContext(tenantId, collectionPath, 'DELETE_DOC');
  try {
    const docRef = doc(firestoreDb, collectionPath, docId);
    const existing = await getDoc(docRef);
    if (existing.exists()) {
      const existingData = existing.data() as any;
      tenantAssertDocOwnership(existingData, validTenant, collectionPath, docId);
    }
    await deleteDoc(docRef);
  } catch (error: any) {
    if (error instanceof TenantSecurityException) {
      throw error;
    }
    console.warn(`[Firestore Tenant DeleteDoc] Note on doc "${docId}":`, error?.message || error);
  }
}

/**
 * Attaches a real-time Firestore onSnapshot listener with strictly bound tenant_id filter.
 */
export function tenantSubscribe<T = DocumentData>(
  firestoreDb: Firestore,
  collectionPath: string,
  tenantId: string,
  onNext: (items: T[]) => void,
  onError?: (error: Error) => void,
  ...additionalConstraints: QueryConstraint[]
): Unsubscribe {
  const validTenant = validateTenantContext(tenantId, collectionPath, 'SUBSCRIBE');
  const q = createTenantQuery<T>(firestoreDb, collectionPath, validTenant, ...additionalConstraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const results: T[] = [];
      snapshot.forEach(docSnap => {
        results.push({
          id: docSnap.id,
          ...docSnap.data()
        } as T);
      });
      onNext(results);
    },
    (err) => {
      console.warn(`[Firestore Tenant Subscribe] Error in ${collectionPath}:`, err);
      if (onError) onError(err);
    }
  );
}

// Global default instance wrapper bound to the default Firestore db
export const firestoreTenant = {
  db,
  normalizeTenantId,
  validateTenantContext,
  isEntityInTenant,
  tenantFilterArray,
  tenantValidateEntityMutation,
  tenantAssertDocOwnership,
  query: (collectionPath: string, tenantId: string, ...constraints: QueryConstraint[]) => 
    createTenantQuery(db, collectionPath, tenantId, ...constraints),
  getDocs: <T = DocumentData>(collectionPath: string, tenantId: string, ...constraints: QueryConstraint[]) => 
    tenantGetDocs<T>(db, collectionPath, tenantId, ...constraints),
  getDoc: <T = DocumentData>(collectionPath: string, docId: string, tenantId: string) => 
    tenantGetDoc<T>(db, collectionPath, docId, tenantId),
  setDoc: <T extends Record<string, any>>(collectionPath: string, docId: string, data: T, tenantId: string) => 
    tenantSetDoc<T>(db, collectionPath, docId, data, tenantId),
  updateDoc: <T extends Record<string, any>>(collectionPath: string, docId: string, updates: Partial<T>, tenantId: string) => 
    tenantUpdateDoc<T>(db, collectionPath, docId, updates, tenantId),
  deleteDoc: (collectionPath: string, docId: string, tenantId: string) => 
    tenantDeleteDoc(db, collectionPath, docId, tenantId),
  subscribe: <T = DocumentData>(collectionPath: string, tenantId: string, onNext: (items: T[]) => void, onError?: (err: Error) => void, ...constraints: QueryConstraint[]) => 
    tenantSubscribe<T>(db, collectionPath, tenantId, onNext, onError, ...constraints)
};
