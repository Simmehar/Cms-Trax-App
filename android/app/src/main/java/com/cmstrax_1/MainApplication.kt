package com.cmstrax

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
          // Local system notifications for FCM messages Android does not display itself.
          add(LocalNotificationPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    createNotificationChannel()
  }

  /**
   * Firebase Cloud Messaging posts background notifications on the channel named in
   * AndroidManifest.xml (com.google.firebase.messaging.default_notification_channel_id).
   * Android 8+ requires the channel to exist, otherwise FCM falls back to "Miscellaneous".
   */
  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        NOTIFICATION_CHANNEL_ID,
        "General notifications",
        NotificationManager.IMPORTANCE_HIGH,
      ).apply {
        description = "Package and account updates from CMSTrax"
        enableVibration(true)
      }
      val manager = getSystemService(NotificationManager::class.java)
      manager.createNotificationChannel(channel)
    }
  }

  companion object {
    const val NOTIFICATION_CHANNEL_ID = "cmstrax_default"
  }
}
