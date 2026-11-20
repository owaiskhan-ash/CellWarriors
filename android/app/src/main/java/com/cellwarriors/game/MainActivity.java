package com.cellwarriors.game;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.IOException;
import java.io.InputStream;

/**
 * Cell Warriors — landscape WebView shell.
 *
 * The whole game is a static ES-module web app bundled under assets/game/.
 * This activity is deliberately thin: immersive fullscreen, landscape lock,
 * media playback without a gesture (SFX need it), DOM storage for the save,
 * a hardware-back bridge so the web router can consume the button before the
 * activity finishes, and a tiny asset loader so the module entry point is
 * served with the right MIME type on every API level.
 */
public class MainActivity extends Activity {

    private static final String GAME_URL = "file:///android_asset/game/index.html";
    private static final String TAG = "CellWarriors";

    private WebView web;
    private FrameLayout root;
    /** Set while a JS back handler was invoked; the JS calls finishActivity() to quit. */
    private boolean backPending = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setRequestedOrientation(Build.VERSION.SDK_INT >= 18
                ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                : ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.BLACK));

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        // No long-press text selection / context menus over the UI.
        web.setLongClickable(false);
        web.setHapticFeedbackEnabled(false);
        web.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                return true;
            }
        });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setTextZoom(100);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        if (Build.VERSION.SDK_INT >= 21) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }
        s.setUserAgentString(s.getUserAgentString() + " CellWarriorsApp/1.0");

        WebView.setWebContentsDebuggingEnabled(isDebuggable());

        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUrl(request.getUrl().toString());
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!"file".equals(uri.getScheme())) return null;
                String path = uri.getPath();
                if (path == null || !path.startsWith("/android_asset/game/")) return null;
                // Serve .mjs-less ES modules as JavaScript on old WebViews and
                // make sure JSON/woff2/audio get sane content types.
                String rel = path.substring("/android_asset/game/".length());
                String mime = guessMime(rel);
                if (mime == null) return null;
                try {
                    InputStream in = getAssets().open("game/" + rel);
                    String enc = mime.equals("font/woff2") || mime.startsWith("image/") ? null : "UTF-8";
                    return new WebResourceResponse(mime, enc, in);
                } catch (IOException e) {
                    return null;
                }
            }

            @Override
            public void onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // The renderer died (low memory). Recreate the activity so the
                // player lands back on the title screen instead of a white box.
                recreate();
            }
        });

        web.addJavascriptInterface(new AppBridge(), "CWApp");

        root.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        if (savedInstanceState == null) {
            web.loadUrl(GAME_URL);
        } else {
            web.restoreState(savedInstanceState);
        }
        applyImmersive();
    }

    private static String guessMime(String rel) {
        if (rel.endsWith(".js") || rel.endsWith(".mjs")) return "application/javascript";
        if (rel.endsWith(".css")) return "text/css";
        if (rel.endsWith(".html") || rel.endsWith(".htm")) return "text/html";
        if (rel.endsWith(".json") || rel.endsWith(".webmanifest")) return "application/json";
        if (rel.endsWith(".woff2")) return "font/woff2";
        if (rel.endsWith(".png")) return "image/png";
        if (rel.endsWith(".jpg") || rel.endsWith(".jpeg")) return "image/jpeg";
        if (rel.endsWith(".webp")) return "image/webp";
        if (rel.endsWith(".svg")) return "image/svg+xml";
        if (rel.endsWith(".mp3")) return "audio/mpeg";
        if (rel.endsWith(".ogg")) return "audio/ogg";
        if (rel.endsWith(".wav")) return "audio/wav";
        return null;
    }

    private boolean handleUrl(String url) {
        if (url == null) return true;
        if (url.startsWith("file:///android_asset/game/")) return false; // keep inside the game
        // Anything the game links out to (docs, GitHub) opens in the browser.
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) {
        }
        return true;
    }

    private boolean isDebuggable() {
        return (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private void applyImmersive() {
        View decor = getWindow().getDecorView();
        decor.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
    }

    /** JS-facing bridge: lets the web layer quit the app on a confirmed back. */
    public class AppBridge {
        @android.webkit.JavascriptInterface
        public void finishActivity() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    finish();
                }
            });
        }

        @android.webkit.JavascriptInterface
        public String platform() {
            return "android";
        }

        @android.webkit.JavascriptInterface
        public void vibrate(int ms) {
            // Intentionally a no-op: the game's juice is audio/visual only.
        }
    }

    @Override
    public void onBackPressed() {
        // Give the web router a chance to close an overlay or back out a screen.
        // The game calls CWApp.finishActivity() when it really wants to exit.
        if (web != null && !backPending) {
            backPending = true;
            web.evaluateJavascript(
                    "(function(){try{return window.__cwAndroidBack?window.__cwAndroidBack():false;}catch(e){return false;}})()",
                    value -> {
                        backPending = false;
                    });
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onResume() {
        super.onResume();
        applyImmersive();
        if (web != null) web.onResume();
        // Re-hide bars if the user swiped them in.
        if (web != null) {
            web.postDelayed(new Runnable() {
                @Override
                public void run() {
                    applyImmersive();
                }
            }, 350);
        }
    }

    @Override
    protected void onPause() {
        if (web != null) {
            web.evaluateJavascript("window.__cwPauseForApp && window.__cwPauseForApp();", null);
            web.onPause();
        }
        super.onPause();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applyImmersive();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyImmersive();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Volume keys keep the system behaviour; everything else goes to the web.
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (web != null) web.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            root.removeView(web);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
