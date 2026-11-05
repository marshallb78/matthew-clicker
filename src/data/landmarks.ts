/**
 * Calibrated Facial Landmarks for Matthew Character Artwork (1024x1024 base).
 * Derived mathematically from 'Images/Main Matthew.png' to ensure 100% accurate alignment
 * of glasses, monocles, tears, hats, crowns, horns, and lighting effects.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface FacialLandmarks {
  leftEyePupil: Point2D;
  rightEyePupil: Point2D;
  leftEyelidLower: Point2D;
  rightEyelidLower: Point2D;
  noseBridge: Point2D;
  noseTip: Point2D;
  nostrilLeft: Point2D;
  nostrilRight: Point2D;
  mouthCenter: Point2D;
  mouthLeftCorner: Point2D;
  mouthRightCorner: Point2D;
  eyebrowLeftArch: Point2D;
  eyebrowRightArch: Point2D;
  foreheadCenter: Point2D;
  chinTip: Point2D;
  leftTemple: Point2D;
  rightTemple: Point2D;
  hairlineCenter: Point2D;
  headTiltAngleRad: number;
  headTiltAngleDeg: number;
  interOcularDistance: number;
}

export const MATTHEW_LANDMARKS: FacialLandmarks = {
  // True pupil centers on 1024x1024
  leftEyePupil: { x: 393, y: 532 },
  rightEyePupil: { x: 616, y: 494 },

  // Lower eyelids for tear attachment
  leftEyelidLower: { x: 393, y: 552 },
  rightEyelidLower: { x: 616, y: 512 },

  // Nose anchors
  noseBridge: { x: 504.5, y: 513 },
  noseTip: { x: 512, y: 645 },
  nostrilLeft: { x: 480, y: 665 },
  nostrilRight: { x: 545, y: 660 },

  // Mouth anchors
  mouthCenter: { x: 559, y: 750 },
  mouthLeftCorner: { x: 465, y: 755 },
  mouthRightCorner: { x: 640, y: 740 },

  // Eyebrows
  eyebrowLeftArch: { x: 380, y: 460 },
  eyebrowRightArch: { x: 620, y: 425 },

  // Head structural anchors
  foreheadCenter: { x: 510, y: 340 },
  chinTip: { x: 535, y: 890 },
  leftTemple: { x: 270, y: 530 },
  rightTemple: { x: 750, y: 495 },
  hairlineCenter: { x: 515, y: 220 },

  // Angular and distance metrics
  // Right eye is higher than left eye: dy = 494 - 532 = -38, dx = 616 - 393 = 223
  headTiltAngleRad: Math.atan2(494 - 532, 616 - 393), // approx -0.1687 radians
  headTiltAngleDeg: (Math.atan2(494 - 532, 616 - 393) * 180) / Math.PI, // approx -9.68 degrees
  interOcularDistance: Math.hypot(616 - 393, 494 - 532), // 226.2 pixels
};

/**
 * Rotates a 2D coordinate around a reference origin by a given angle in radians.
 */
export function rotateLandmark(pt: Point2D, origin: Point2D, angleRad: number): Point2D {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = pt.x - origin.x;
  const dy = pt.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}
