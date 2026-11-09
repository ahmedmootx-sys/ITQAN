package com.itqan.app

import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar
import kotlin.concurrent.thread

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private val CHANNEL_ID = "itqan_study_reminders"
    private val REMOTE_UPDATE_URL = "https://raw.githubusercontent.com/ahmedmootx-sys/ITQAN/main/index.html"
    private val REMOTE_VERSION_URL = "https://raw.githubusercontent.com/ahmedmootx-sys/ITQAN/main/sw.js"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Request notification permission on Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                    101
                )
            }
        }

        createNotificationChannel()

        // Prepare local persistent www directory in app internal files
        val wwwDir = File(filesDir, "www")
        if (!wwwDir.exists()) wwwDir.mkdirs()
        val localIndexFile = File(wwwDir, "index.html")

        if (!localIndexFile.exists()) {
            copyAssetToFile("index.html", localIndexFile)
            copyAssetToFile("sw.js", File(wwwDir, "sw.js"))
            copyAssetToFile("manifest.json", File(wwwDir, "manifest.json"))
        }

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                allowFileAccessFromFileURLs = true
                allowUniversalAccessFromFileURLs = true
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
                setSupportZoom(false)
                displayZoomControls = false
            }

            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER

            addJavascriptInterface(WebAppInterface(this@MainActivity), "AndroidBridge")

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url?.toString() ?: return false
                    if (url.startsWith("file://") || url.startsWith("data:")) {
                        return false
                    }
                    return try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(intent)
                        true
                    } catch (e: Exception) {
                        false
                    }
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest?) {
                    request?.grant(request.resources)
                }
            }
        }

        setContentView(webView)

        // Always load from consistent local file origin to guarantee data persistence
        webView.loadUrl("file://${localIndexFile.absolutePath}")

        // Check for OTA updates quietly in the background
        thread {
            try {
                Thread.sleep(3000)
                if (isOnline()) {
                    checkOtaUpdate(false)
                }
            } catch (_: Exception) {}
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "تذكيرات إتقان اليومية",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "إشعارات تشجيعية وتذكير بمراجعة الكلمات اليومية"
            }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    fun displayNotification(title: String, message: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        nm.notify((System.currentTimeMillis() % 10000).toInt(), notification)
    }

    fun scheduleReminderAlarm(hour: Int, minute: Int, mode: String) {
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(this, NotificationReceiver::class.java).apply {
            putExtra("title", "حان وقت جرعتك الإنجليزية! 🚀")
            putExtra("message", "5 دقائق فقط من مراجعة الكلمات تصنع فرقاً مذهلاً في ثباتها.")
        }
        val pendingIntent = PendingIntent.getBroadcast(
            this,
            2001,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val calendar = Calendar.getInstance().apply {
            timeInMillis = System.currentTimeMillis()
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            if (timeInMillis <= System.currentTimeMillis()) {
                add(Calendar.DAY_OF_YEAR, 1)
            }
        }

        alarmManager.setRepeating(
            AlarmManager.RTC_WAKEUP,
            calendar.timeInMillis,
            AlarmManager.INTERVAL_DAY,
            pendingIntent
        )
    }

    fun cancelReminderAlarm() {
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(this, NotificationReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            this,
            2001,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pendingIntent)
    }

    fun checkOtaUpdate(manual: Boolean) {
        if (!isOnline()) {
            if (manual) {
                runOnUiThread {
                    Toast.makeText(this, "تعذر التحقق من التحديثات: لا يوجد اتصال بالإنترنت", Toast.LENGTH_SHORT).show()
                }
            }
            return
        }

        thread {
            try {
                val swUrl = URL(REMOTE_VERSION_URL)
                val conn = swUrl.openConnection() as HttpURLConnection
                conn.connectTimeout = 6000
                conn.readTimeout = 6000
                val remoteSw = conn.inputStream.bufferedReader().use { it.readText() }

                val wwwDir = File(filesDir, "www")
                val localSwFile = File(wwwDir, "sw.js")
                val localSw = if (localSwFile.exists()) localSwFile.readText() else ""

                // Extract version tag e.g. itqan-v12
                val remoteVersionMatch = Regex("itqan-v\\d+").find(remoteSw)?.value ?: ""
                val localVersionMatch = Regex("itqan-v\\d+").find(localSw)?.value ?: ""

                if (remoteVersionMatch.isNotEmpty() && remoteVersionMatch != localVersionMatch) {
                    if (manual) {
                        runOnUiThread {
                            Toast.makeText(this, "جاري تنزيل التحديث ($remoteVersionMatch)...", Toast.LENGTH_SHORT).show()
                        }
                    }

                    // Download new index.html
                    val indexUrl = URL(REMOTE_UPDATE_URL)
                    val indexConn = indexUrl.openConnection() as HttpURLConnection
                    indexConn.connectTimeout = 10000
                    indexConn.readTimeout = 15000
                    val newHtml = indexConn.inputStream.bufferedReader().use { it.readText() }

                    if (newHtml.length > 100000 && newHtml.contains("<!DOCTYPE html>")) {
                        val tmpFile = File(wwwDir, "index.html.tmp")
                        tmpFile.writeText(newHtml)
                        val targetFile = File(wwwDir, "index.html")
                        val renamed = tmpFile.renameTo(targetFile)
                        if (!renamed) {
                            tmpFile.copyTo(targetFile, overwrite = true)
                            tmpFile.delete()
                        }
                        localSwFile.writeText(remoteSw)
                        runOnUiThread {
                            Toast.makeText(this, "تم تنزيل تحديث جديد ($remoteVersionMatch) بنجاح!", Toast.LENGTH_LONG).show()
                            if (manual) {
                                webView.reload()
                            }
                        }
                    }
                } else {
                    if (manual) {
                        runOnUiThread {
                            Toast.makeText(this, "أنت تستخدم أحدث إصدار من إتقان ✅", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            } catch (e: Exception) {
                if (manual) {
                    runOnUiThread {
                        Toast.makeText(this, "فشل التحقق من التحديث: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }

    private fun copyAssetToFile(assetName: String, outFile: File) {
        try {
            assets.open(assetName).use { input: InputStream ->
                FileOutputStream(outFile).use { output: FileOutputStream ->
                    input.copyTo(output)
                }
            }
        } catch (_: Exception) {}
    }

    private fun isOnline(): Boolean {
        return try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val net = cm.activeNetwork ?: return false
            val caps = cm.getNetworkCapabilities(net) ?: return false
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        } catch (e: Exception) {
            false
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}

class WebAppInterface(private val activity: MainActivity) {
    @JavascriptInterface
    fun isNativeApp(): Boolean = true

    @JavascriptInterface
    fun showNotification(title: String, message: String) {
        activity.runOnUiThread {
            activity.displayNotification(title, message)
        }
    }

    @JavascriptInterface
    fun scheduleReminder(hour: Int, minute: Int, mode: String) {
        activity.runOnUiThread {
            activity.scheduleReminderAlarm(hour, minute, mode)
        }
    }

    @JavascriptInterface
    fun cancelReminder() {
        activity.runOnUiThread {
            activity.cancelReminderAlarm()
        }
    }

    @JavascriptInterface
    fun checkForUpdates() {
        activity.runOnUiThread {
            activity.checkOtaUpdate(true)
        }
    }
}
