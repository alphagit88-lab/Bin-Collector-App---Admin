/**
 * Client-side image compression utility
 * Matches mobile app compression behavior (max ~1600px, quality: 0.7)
 */

export const compressImage = async (
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.7
): Promise<File> => {
  if (typeof window === 'undefined') return file;
  if (!file || !file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        try {
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(file);
          }

          // White background for transparent PNGs converted to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const outputType = 'image/jpeg';
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return resolve(file);
              }
              // If compressed size is larger than original file, return original
              if (blob.size >= file.size && width === img.width && height === img.height) {
                return resolve(file);
              }
              const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
              const compressedFile = new File([blob], cleanName, {
                type: outputType,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            outputType,
            quality
          );
        } catch (err) {
          console.error('Image compression error:', err);
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export const compressImages = async (
  files: FileList | File[],
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.7
): Promise<File[]> => {
  const fileArray = Array.from(files);
  return Promise.all(fileArray.map((f) => compressImage(f, maxWidth, maxHeight, quality)));
};
