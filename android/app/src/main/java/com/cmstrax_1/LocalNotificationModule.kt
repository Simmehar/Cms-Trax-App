package com.cmstrax

import android.Manifest
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

/**
 * Posts a system notification from JavaScript.
 *
 * Firebase Cloud Messaging displays a message by itself only when it carries a
 * `notification` block AND the app is in the background. This module covers the
 * remaining cases on Android: messages received while the app is in the
 * foreground, and data-only messages in any state
 * (see src/services/notification.service.ts and index.js).
 */
class LocalNotificationModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  /**
   * @param title notification title (falls back to the app name)
   * @param body notification text
   * @param data message data; copied into the launch intent extras as strings
   * Resolves true when posted, false when notifications are disabled for the app.
   */
  @ReactMethod
  fun show(title: String?, body: String?, data: ReadableMap?, promise: Promise) {
    val context = reactApplicationContext
    try {
      val manager = NotificationManagerCompat.from(context)
      val permissionGranted =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
          ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
      if (!permissionGranted || !manager.areNotificationsEnabled()) {
        promise.resolve(false)
        return
      }

      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      launchIntent?.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      data?.toHashMap()?.forEach { (key, value) -> launchIntent?.putExtra(key, value?.toString()) }

      val id = (System.currentTimeMillis() and 0x7fffffff).toInt()
      val contentIntent = launchIntent?.let {
        PendingIntent.getActivity(
          context,
          id,
          it,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
      }

      val appLabel = context.applicationInfo.loadLabel(context.packageManager).toString()
      val text = body ?: ""
      val notification =
        NotificationCompat.Builder(context, MainApplication.NOTIFICATION_CHANNEL_ID)
          .setSmallIcon(R.drawable.ic_notification)
          .setContentTitle(title?.takeIf { it.isNotBlank() } ?: appLabel)
          .setContentText(text)
          .setStyle(NotificationCompat.BigTextStyle().bigText(text))
          // Pre-Oreo priority; Oreo+ uses the channel importance (HIGH -> heads-up).
          .setPriority(NotificationCompat.PRIORITY_HIGH)
          .setDefaults(NotificationCompat.DEFAULT_ALL)
          .setAutoCancel(true)
          .setContentIntent(contentIntent)
          .build()

      manager.notify(id, notification)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("local_notification_error", e.message, e)
    }
  }

  companion object {
    const val NAME = "LocalNotification"
  }
}
