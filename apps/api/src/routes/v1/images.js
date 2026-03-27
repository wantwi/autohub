import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../lib/httpError.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

const deleteSchema = z.object({
  url: z.string().url(),
});

/**
 * Extract the Cloudinary public_id from a secure_url.
 * e.g. "https://res.cloudinary.com/demo/image/upload/v123/folder/abc.jpg" → "folder/abc"
 */
function extractPublicId(url) {
  try {
    const u = new URL(url);
    const segments = u.pathname.split('/');
    const uploadIdx = segments.indexOf('upload');
    if (uploadIdx === -1) return null;
    // Skip "upload" and the version segment (v123...)
    let startIdx = uploadIdx + 1;
    if (segments[startIdx]?.startsWith('v') && /^\d+$/.test(segments[startIdx].slice(1))) {
      startIdx++;
    }
    const pathWithExt = segments.slice(startIdx).join('/');
    // Remove file extension
    return pathWithExt.replace(/\.[^.]+$/, '') || null;
  } catch {
    return null;
  }
}

router.delete('/', requireAuth, async (req, res, next) => {
  try {
    const { url } = deleteSchema.parse(req.body);

    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloud || !apiKey || !apiSecret) {
      throw new HttpError(
        501,
        'NOT_CONFIGURED',
        'Cloudinary credentials not configured on the server. Image removed from listing but still exists on Cloudinary.',
      );
    }

    const publicId = extractPublicId(url);
    if (!publicId) {
      throw new HttpError(400, 'INVALID_URL', 'Could not extract public_id from the provided URL');
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // Cloudinary destroy API uses Basic Auth with api_key:api_secret
    const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const formBody = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
    });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud}/image/destroy`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
      },
    );

    const data = await response.json();

    if (data.result === 'ok' || data.result === 'not found') {
      return res.json({ data: { deleted: true, publicId } });
    }

    return res.json({ data: { deleted: false, publicId, cloudinaryResult: data.result } });
  } catch (e) {
    next(e);
  }
});

export default router;
