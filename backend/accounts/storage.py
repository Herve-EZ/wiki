"""S3 storage for profile photos (Contabo Object Storage).

Only avatars use this backend; every other file stays on the local filesystem
(see accounts.models.avatar_storage). Objects are uploaded public-read so the
stored URL is directly usable by the frontend <img>. Credentials come from
env-backed settings, never hard-coded.
"""
from django.conf import settings
from storages.backends.s3 import S3Storage


class AvatarStorage(S3Storage):
    def __init__(self, **kwargs):
        super().__init__(
            bucket_name=settings.AVATAR_S3_BUCKET,
            endpoint_url=settings.AVATAR_S3_ENDPOINT_URL or None,
            access_key=settings.AVATAR_S3_ACCESS_KEY or None,
            secret_key=settings.AVATAR_S3_SECRET_KEY or None,
            region_name=settings.AVATAR_S3_REGION or None,
            custom_domain=settings.AVATAR_S3_CUSTOM_DOMAIN or None,
            default_acl=settings.AVATAR_S3_ACL or None,
            # Public objects: clean, non-expiring URLs (no signed querystring).
            querystring_auth=False,
            # Never clobber another user's file on an identical name.
            file_overwrite=False,
            **kwargs,
        )
