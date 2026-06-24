declare module "normalize-wheel" {
  interface NormalizedWheelEvent {
    spinX: number;
    spinY: number;
    pixelX: number;
    pixelY: number;
  }
  function normalizeWheel(event: WheelEvent): NormalizedWheelEvent;
  export default normalizeWheel;
}
