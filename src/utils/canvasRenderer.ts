import { getStroke } from 'perfect-freehand';
import type { Stroke } from '../types/notebook';

/**
 * Returns SVG path data string from perfect-freehand stroke points
 */
export function getSvgPathFromStroke(strokePoints: number[][], closed: boolean = true): string {
  const len = strokePoints.length;
  if (len < 4) return '';

  let a = strokePoints[0];
  let b = strokePoints[1];
  const c = strokePoints[2];

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${((b[0] + c[0]) / 2).toFixed(2)},${((b[1] + c[1]) / 2).toFixed(2)}`;

  for (let i = 2, max = len - 1; i < max; i++) {
    a = strokePoints[i];
    b = strokePoints[i + 1];
    result += ` Q${a[0].toFixed(2)},${a[1].toFixed(2)} ${((a[0] + b[0]) / 2).toFixed(2)},${((a[1] + b[1]) / 2).toFixed(2)}`;
  }

  if (closed) {
    result += 'Z';
  }

  return result;
}

/**
 * Renders an array of strokes onto an HTML5 2D Canvas context
 */
export function renderStrokesToCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  scale: number = 1
) {
  ctx.save();
  ctx.scale(scale, scale);

  for (const stroke of strokes) {
    if (!stroke.points || stroke.points.length === 0) continue;

    ctx.save();

    if (stroke.tool === 'shape') {
      drawShape(ctx, stroke);
      ctx.restore();
      continue;
    }

    if (stroke.tool === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = stroke.opacity || 0.45;
    } else if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1.0;
    } else if (stroke.tool === 'pencil') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = stroke.opacity || 0.85;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = stroke.opacity || 1.0;
    }

    const freehandOptions = getStrokeOptions(stroke.tool, stroke.size);
    const outlinePoints = getStroke(
      stroke.points.map((p) => [p.x, p.y, p.pressure ?? 0.5]),
      freehandOptions
    );

    if (outlinePoints.length > 0) {
      const pathData = getSvgPathFromStroke(outlinePoints);
      if (pathData) {
        const path = new Path2D(pathData);
        ctx.fillStyle = stroke.color;
        ctx.fill(path);
      }
    }

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws a geometric shape defined by first point (start) and last point (end)
 */
function drawShape(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const start = stroke.points[0];
  const end = stroke.points[stroke.points.length - 1];
  if (!start || !end) return;

  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = stroke.opacity || 1;
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = Math.max(1, stroke.size);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  switch (stroke.shape) {
    case 'ellipse':
      ctx.ellipse(x + w / 2, y + h / 2, Math.max(w / 2, 0.5), Math.max(h / 2, 0.5), 0, 0, Math.PI * 2);
      break;
    case 'triangle':
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      break;
    case 'line':
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      break;
    case 'arrow': {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const head = Math.max(10, stroke.size * 4);
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.moveTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(end.x, end.y);
      ctx.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6));
      break;
    }
    case 'rect':
    default:
      ctx.rect(x, y, w, h);
      break;
  }

  const isOpenShape = stroke.shape === 'line' || stroke.shape === 'arrow';
  if (stroke.fill && !isOpenShape) ctx.fill();
  ctx.stroke();
}

/**
 * Tool specific styling and physics parameters for realistic feel
 */
export function getStrokeOptions(tool: Stroke['tool'], size: number) {
  switch (tool) {
    case 'pencil':
      return {
        size: size,
        thinning: 0.5,
        smoothing: 0.65,
        streamline: 0.45,
        easing: (t: number) => Math.sin((t * Math.PI) / 2),
        simulatePressure: true,
      };
    case 'highlighter':
      return {
        size: size * 2.8,
        thinning: -0.1, // Chisel uniform width
        smoothing: 0.7,
        streamline: 0.5,
        simulatePressure: false,
      };
    case 'eraser':
      return {
        size: size * 2.5,
        thinning: 0.1,
        smoothing: 0.5,
        streamline: 0.4,
        simulatePressure: false,
      };
    case 'pen':
    default:
      return {
        size: size,
        thinning: 0.65, // Elegant ink pressure variation
        smoothing: 0.6,
        streamline: 0.55,
        simulatePressure: true,
      };
  }
}
