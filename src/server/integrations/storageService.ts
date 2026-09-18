import crypto from 'crypto';
import { IStorageService, StorageUploadOptions } from './interfaces.js';

interface StoredFileMetadata {
  key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  tenantId: string;
  isPrivate: boolean;
  uploadedAt: string;
  dataBuffer?: Buffer;
}

export class StorageService implements IStorageService {
  private endpoint: string;
  private accessKey: string;
  private secretKey: string;
  private bucket: string;
  private region: string;
  private localFiles = new Map<string, StoredFileMetadata>();

  constructor() {
    this.endpoint = (process.env.STORAGE_ENDPOINT || '').trim();
    this.accessKey = (process.env.STORAGE_ACCESS_KEY || '').trim();
    this.secretKey = (process.env.STORAGE_SECRET_KEY || '').trim();
    this.bucket = (process.env.STORAGE_BUCKET || 'agentdesk-storage').trim();
    this.region = (process.env.STORAGE_REGION || 'auto').trim();
  }

  public isConfigured(): boolean {
    return !!(this.endpoint && this.accessKey && this.secretKey);
  }

  public validateFile(filename: string, mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
    const ext = filename.split('.').pop()?.toLowerCase();
    const disallowedExtensions = ['exe', 'bat', 'cmd', 'sh', 'php', 'py', 'js', 'vbs', 'dll'];

    if (ext && disallowedExtensions.includes(ext)) {
      return { valid: false, error: 'Executable and script file uploads are strictly prohibited.' };
    }

    const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
    if (sizeBytes > MAX_SIZE_BYTES) {
      return { valid: false, error: 'File size exceeds maximum permitted threshold (50MB).' };
    }

    return { valid: true };
  }

  public async uploadFile(
    buffer: Buffer,
    options: StorageUploadOptions
  ): Promise<{ success: boolean; fileKey?: string; url?: string; error?: string }> {
    const validation = this.validateFile(options.filename, options.contentType, buffer.length);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const uniqueId = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const sanitizedName = options.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `${options.tenantId}/${uniqueId}_${sanitizedName}`;

    const metadata: StoredFileMetadata = {
      key: fileKey,
      filename: options.filename,
      contentType: options.contentType,
      sizeBytes: buffer.length,
      tenantId: options.tenantId,
      isPrivate: !!options.isPrivate,
      uploadedAt: new Date().toISOString(),
      dataBuffer: buffer
    };

    this.localFiles.set(fileKey, metadata);

    if (!this.isConfigured()) {
      // Local development URL
      const mockUrl = `/api/storage/files/${encodeURIComponent(fileKey)}`;
      return {
        success: true,
        fileKey,
        url: mockUrl
      };
    }

    // When S3 endpoint is configured, generate direct URL
    const s3Url = `${this.endpoint}/${this.bucket}/${fileKey}`;
    return {
      success: true,
      fileKey,
      url: s3Url
    };
  }

  public async getSignedDownloadUrl(fileKey: string, expiresInSeconds: number = 3600): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
    const file = this.localFiles.get(fileKey);
    if (!file) {
      return { success: false, error: 'File key not found.' };
    }

    // In local sandbox, return local stream route
    const url = `/api/storage/files/${encodeURIComponent(fileKey)}?token=${crypto.randomBytes(8).toString('hex')}`;
    return { success: true, signedUrl: url };
  }

  public async deleteFile(fileKey: string): Promise<boolean> {
    return this.localFiles.delete(fileKey);
  }

  public getLocalFile(fileKey: string): StoredFileMetadata | undefined {
    if (!this.isValidLocalFileKey(fileKey)) return undefined;
    return this.localFiles.get(fileKey);
  }

  private isValidLocalFileKey(fileKey: string): boolean {
    if (typeof fileKey !== 'string' || fileKey.length < 3 || fileKey.length > 512) return false;
    if (fileKey.includes('..') || fileKey.includes('\\') || fileKey.includes('\0')) return false;
    return /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(fileKey);
  }
}
