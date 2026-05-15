/**
 * OPFS (Origin Private File System) utilities
 */

const VAULT_DIR = 'local-wallet-vault';
const VAULT_VERSION = 'v1';

/**
 * Get the OPFS root directory handle
 */
export async function getOPFSRoot(): Promise<FileSystemDirectoryHandle> {
  return navigator.storage.getDirectory();
}

/**
 * Get the vault directory handle
 */
export async function getVaultDirectory(): Promise<FileSystemDirectoryHandle> {
  const root = await getOPFSRoot();
  const vaultDir = await root.getDirectoryHandle(VAULT_DIR, { create: true });
  return vaultDir.getDirectoryHandle(VAULT_VERSION, { create: true });
}

/**
 * Get the records directory handle
 */
export async function getRecordsDirectory(): Promise<FileSystemDirectoryHandle> {
  const vaultDir = await getVaultDirectory();
  return vaultDir.getDirectoryHandle('records', { create: true });
}

/**
 * Write a file to OPFS
 */
export async function writeOPFSFile(
  directory: FileSystemDirectoryHandle,
  filename: string,
  content: string
): Promise<void> {
  const fileHandle = await directory.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Read a file from OPFS
 */
export async function readOPFSFile(
  directory: FileSystemDirectoryHandle,
  filename: string
): Promise<string | null> {
  try {
    const fileHandle = await directory.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

/**
 * Delete a file from OPFS
 */
export async function deleteOPFSFile(
  directory: FileSystemDirectoryHandle,
  filename: string
): Promise<void> {
  await directory.removeEntry(filename);
}

/**
 * Check if a file exists in OPFS
 */
export async function fileExists(
  directory: FileSystemDirectoryHandle,
  filename: string
): Promise<boolean> {
  try {
    await directory.getFileHandle(filename);
    return true;
  } catch {
    return false;
  }
}

/**
 * List all files in a directory
 */
export async function listFiles(
  directory: FileSystemDirectoryHandle
): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of (directory as any).keys()) {
    files.push(entry);
  }
  return files;
}

/**
 * Clear the entire vault directory
 */
export async function clearVaultDirectory(): Promise<void> {
  const root = await getOPFSRoot();
  try {
    await root.removeEntry(VAULT_DIR, { recursive: true });
  } catch {
    // Directory might not exist
  }
}