import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { v4 as uuidv4 } from 'uuid';

export interface PhotoEvidence {
  id: string;
  name: string;
  webPath: string; // Used for local preview in <img> tags
  localUri: string; // Device filesystem or local reference path
  sizeBytes: number;
  mimeType: string;
  timestamp: number;
}

class CameraService {
  async capturePhoto(sourceType: 'camera' | 'photos' = 'camera'): Promise<PhotoEvidence> {
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await Camera.getPhoto({
          resultType: CameraResultType.Uri,
          source: sourceType === 'camera' ? CameraSource.Camera : CameraSource.Photos,
          quality: 80,
          allowEditing: false,
          width: 1920,
          height: 1080,
        });

        const photoId = uuidv4();
        const fileName = `incident_${photoId}.${photo.format || 'jpg'}`;
        let localUri = photo.path || photo.webPath || '';

        // If native filesystem is accessible, copy/persist into App Documents
        if (photo.path) {
          try {
            const savedFile = await Filesystem.copy({
              from: photo.path,
              to: fileName,
              toDirectory: Directory.Data,
            });
            localUri = savedFile.uri;
          } catch {
            // Keep original path if copy fails
            localUri = photo.path;
          }
        }

        return {
          id: photoId,
          name: fileName,
          webPath: photo.webPath || localUri,
          localUri,
          sizeBytes: 0, // Estimated or native file size
          mimeType: `image/${photo.format || 'jpeg'}`,
          timestamp: Date.now(),
        };
      } catch (err: any) {
        if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) {
          throw new Error('Photo capture was cancelled by the user.');
        }
        throw new Error(err?.message || 'Failed to capture photo on device.');
      }
    }

    // Web / Browser Fallback using HTML5 File Input
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (sourceType === 'camera') {
        input.capture = 'environment';
      }

      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error('No photo was selected.'));
          return;
        }

        const photoId = uuidv4();
        const objectUrl = URL.createObjectURL(file);

        resolve({
          id: photoId,
          name: file.name,
          webPath: objectUrl,
          localUri: `local_blob://${file.name}`,
          sizeBytes: file.size,
          mimeType: file.type || 'image/jpeg',
          timestamp: Date.now(),
        });
      };

      input.oncancel = () => {
        reject(new Error('Photo selection was cancelled.'));
      };

      input.click();
    });
  }
}

export const cameraService = new CameraService();
