import React from 'react';
import { ImageLayerData } from '../types';

/**
 * Converts a File object to a Base64 encoded string.
 * @param file The File object to convert.
 * @returns A promise that resolves with the Base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Loads an image from a given source (Base64) and returns an HTMLImageElement.
 * @param src Base64 encoded image source.
 * @returns A promise that resolves with the loaded HTMLImageElement.
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.src = src;
  });
};

/**
 * Draws all image layers onto a canvas and returns the canvas element.
 * @param layers An array of ImageLayerData to draw.
 * @param canvasRef React ref to the canvas element.
 * @param editorWidth The width of the editor canvas area.
 * @param editorHeight The height of the editor canvas area.
 * @returns A promise that resolves with the HTMLCanvasElement.
 */
export const drawLayersOnCanvas = async (
  layers: ImageLayerData[],
  canvasRef: React.RefObject<HTMLCanvasElement>,
  editorWidth: number,
  editorHeight: number,
): Promise<HTMLCanvasElement> => {
  const canvas = canvasRef.current;
  if (!canvas) {
    throw new Error('Canvas element not found.');
  }

  // Set canvas dimensions to match the editor size
  canvas.width = editorWidth;
  canvas.height = editorHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D context from canvas.');
  }

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sort layers by zIndex to ensure correct drawing order
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  for (const layer of sortedLayers) {
    try {
      const img = await loadImage(layer.src);

      ctx.save(); // Save the current canvas state

      // Apply transformations for each layer
      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2); // Move origin to center of image
      ctx.rotate((layer.rotation * Math.PI) / 180); // Rotate in radians
      ctx.globalAlpha = layer.opacity; // Apply opacity

      ctx.drawImage(img, -layer.width / 2, -layer.height / 2, layer.width, layer.height); // Draw image centered
      ctx.restore(); // Restore the canvas state to prevent transformations from affecting subsequent drawings
    } catch (error) {
      console.error(`Error drawing image layer ${layer.name}:`, error);
      // Optionally draw a placeholder or log the error to the user
    }
  }

  return canvas;
};