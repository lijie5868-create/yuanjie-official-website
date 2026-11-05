-- Keep the existing admin-only object policies while allowing project videos.
-- The Free plan's project-wide upload limit is 50 MB.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/gif','image/svg+xml',
      'video/mp4','video/webm','video/quicktime'
    ]
where id = 'site-media';
