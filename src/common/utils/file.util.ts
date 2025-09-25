import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export function generateStoredFilename(originalName: string): string {
	const ext = path.extname(originalName).toLowerCase();
	const timestamp = dayjs().format('YYYYMMDDHHmmssSSS');
	const uuid = uuidv4().replace(/-/g, '');
	return `${timestamp}_${uuid}${ext}`;
}

export function appendSizeSuffix(storedFilename: string, size: number): string {
	const { baseName, ext } = getBaseNameAndExt(storedFilename);

	return `${baseName}_${size}${ext}`;
}

export function getBaseNameAndExt(storedFilename: string): { baseName: string, ext: string } {
	const ext = path.extname(storedFilename);
	const baseName = path.basename(storedFilename, ext);
	return { baseName, ext };
}

// image mimes -> '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'
export const imageMimes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']);