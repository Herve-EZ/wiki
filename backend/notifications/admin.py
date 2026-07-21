from django.contrib import admin

from .models import Notification, PageSubscription

admin.site.register(Notification)
admin.site.register(PageSubscription)
