export interface ImageLayerData {
  id: string;
  src: string; // Base64 encoded image
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
}